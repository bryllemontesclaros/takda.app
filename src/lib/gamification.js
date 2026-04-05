import { isSameMonth, normalizeDate, today } from './utils'

const EXP_PER_LEVEL = 60
const WEEKLY_CHECKIN_TARGET = 4
const INCOME_CATS = new Set(['Salary', 'Bonus', 'Freelance', 'Business', 'Investment', '13th Month', 'Other'])
const EXPENSE_EXCLUDED_CATS = new Set(['Bills'])
const ONBOARDING_MATCH_WINDOW_MS = 120000

function toDateValue(date) {
  return new Date(`${normalizeDate(date)}T00:00:00`)
}

function shiftDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function getWeekStart(baseDate = new Date()) {
  const copy = new Date(baseDate)
  copy.setHours(0, 0, 0, 0)
  const day = copy.getDay()
  const offset = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + offset)
  return copy
}

function getTrackedDays(entries) {
  return [...new Set(entries.map(entry => entry.activityDate).filter(Boolean))].sort()
}

function getCurrentStreakDays(days = []) {
  if (!days.length) return 0

  const daySet = new Set(days)
  const todayDate = toDateValue(today())
  let cursor = todayDate

  if (!daySet.has(normalizeDate(cursor))) {
    cursor = shiftDays(todayDate, -1)
    if (!daySet.has(normalizeDate(cursor))) return 0
  }

  let streak = 0
  while (daySet.has(normalizeDate(cursor))) {
    streak++
    cursor = shiftDays(cursor, -1)
  }

  return streak
}

function getWeeklyCheckins(days = []) {
  if (!days.length) return 0
  const start = getWeekStart(new Date())
  const end = shiftDays(start, 7)

  return days.filter(day => {
    const value = toDateValue(day)
    return value >= start && value < end
  }).length
}

function getExpDelta(amount, sourceType) {
  const value = Math.abs(Number(amount) || 0)
  if (sourceType === 'income') {
    return Math.max(3, Math.floor(value / 80))
  }
  return Math.max(1, Math.floor(value / 160))
}

function isOnboardingSeededIncome(tx = {}) {
  return Boolean(tx?.gamificationExcluded || tx?.seedSource === 'onboarding')
}

function isExcludedExpense(tx = {}) {
  return EXPENSE_EXCLUDED_CATS.has(tx?.cat || '') || tx?.gamificationExcluded || tx?.seedSource === 'onboarding'
}

function getActivityDate(tx = {}) {
  const createdAt = Number(tx?.createdAt || 0)
  if (createdAt) return normalizeDate(new Date(createdAt))
  return normalizeDate(tx?.date)
}

function isExcludedCheckin(tx = {}, profile = {}) {
  return Boolean(
    tx?.gamificationExcluded ||
    tx?.seedSource === 'onboarding' ||
    isOnboardingSeededIncome(tx, profile),
  )
}

function buildCheckinEntries(income = [], expenses = [], profile = {}) {
  return [...income, ...expenses]
    .filter(tx => !isExcludedCheckin(tx, profile))
    .map(tx => ({
      ...tx,
      activityDate: getActivityDate(tx),
    }))
    .filter(entry => entry.activityDate)
    .sort((a, b) => {
      if (a.activityDate !== b.activityDate) return a.activityDate.localeCompare(b.activityDate)
      return (a.createdAt || 0) - (b.createdAt || 0)
    })
}

function buildExpLedger(income = [], expenses = [], profile = {}) {
  const gains = income
    .filter(tx => INCOME_CATS.has(tx?.cat || 'Other') && !isOnboardingSeededIncome(tx, profile))
    .map(tx => ({
      ...tx,
      date: normalizeDate(tx?.date),
      delta: getExpDelta(tx?.amount, 'income'),
      sourceType: 'income',
    }))

  const losses = expenses
    .filter(tx => !isExcludedExpense(tx))
    .map(tx => ({
      ...tx,
      date: normalizeDate(tx?.date),
      delta: -getExpDelta(tx?.amount, 'expense'),
      sourceType: 'expense',
    }))

  return [...gains, ...losses]
    .filter(entry => entry.date)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.createdAt || 0) - (b.createdAt || 0)
    })
}

export function getGamificationSnapshot(income = [], expenses = [], profile = {}) {
  const ledger = buildExpLedger(income, expenses, profile)
  const checkinEntries = buildCheckinEntries(income, expenses, profile)
  const now = new Date()
  const todayStr = today()
  const trackedDays = getTrackedDays(checkinEntries)

  let totalExp = 0
  let totalGained = 0
  let totalLost = 0
  let monthNetExp = 0

  ledger.forEach(entry => {
    const before = totalExp
    totalExp = Math.max(0, totalExp + entry.delta)
    const appliedDelta = totalExp - before

    if (appliedDelta > 0) totalGained += appliedDelta
    if (appliedDelta < 0) totalLost += Math.abs(appliedDelta)

    if (isSameMonth(entry.date, now.getFullYear(), now.getMonth())) {
      monthNetExp += appliedDelta
    }
  })

  const level = Math.floor(totalExp / EXP_PER_LEVEL) + 1
  const currentLevelExp = totalExp % EXP_PER_LEVEL
  const nextLevelTarget = EXP_PER_LEVEL
  const expToNextLevel = nextLevelTarget - currentLevelExp
  const progressPct = Math.round((currentLevelExp / nextLevelTarget) * 100)
  const currentStreakDays = getCurrentStreakDays(trackedDays)
  const weeklyCheckins = getWeeklyCheckins(trackedDays)
  const weeklyTarget = WEEKLY_CHECKIN_TARGET
  const weeklyProgressPct = Math.min(100, Math.round((weeklyCheckins / weeklyTarget) * 100))
  const todayCheckins = checkinEntries.filter(entry => entry.activityDate === todayStr).length
  const checkedInToday = todayCheckins > 0

  let message = 'Every peso you track builds momentum.'
  if (currentStreakDays >= 7) message = 'Your logging rhythm is locked in. Protect the streak and keep compounding.'
  else if (currentStreakDays >= 3) message = 'You are building a real money habit now. Keep the streak warm.'
  else if (weeklyCheckins >= weeklyTarget) message = 'Weekly check-in target complete. You are keeping the habit alive.'
  else if (monthNetExp >= 20) message = 'You are stacking strong progress this month.'
  else if (monthNetExp > 0) message = 'Steady progress. Keep your good money habits going.'
  else if (monthNetExp < 0) message = 'Small resets are normal. One good entry gets the bar moving again.'

  let nextMilestone = `Need ${expToNextLevel} EXP for Level ${level + 1}.`
  if (expToNextLevel <= 6) nextMilestone = `One more solid entry could unlock Level ${level + 1}.`
  else if (weeklyCheckins < weeklyTarget) nextMilestone = `${weeklyTarget - weeklyCheckins} more check-in${weeklyTarget - weeklyCheckins === 1 ? '' : 's'} completes this week.`
  else if (currentStreakDays > 0) nextMilestone = `Keep tomorrow logged to extend your ${currentStreakDays}-day streak.`

  return {
    totalExp,
    level,
    currentLevelExp,
    nextLevelTarget,
    expToNextLevel,
    progressPct,
    totalGained,
    totalLost,
    monthNetExp,
    trackedDays,
    currentStreakDays,
    weeklyCheckins,
    weeklyTarget,
    weeklyProgressPct,
    todayCheckins,
    checkedInToday,
    nextMilestone,
    message,
  }
}
