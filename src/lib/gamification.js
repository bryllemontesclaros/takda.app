import { isSameMonth, normalizeDate, today } from './utils'
import { getBillPaidPeriodEntries } from './bills'

const EXP_PER_LEVEL = 60
const WEEKLY_CHECKIN_TARGET = 3
const INCOME_CATS = new Set(['Salary', 'Bonus', 'Freelance', 'Business', 'Investment', '13th Month', 'Other'])
const EXPENSE_EXCLUDED_CATS = new Set(['Bills'])
const DAILY_EXP_CAP = 20
const ENTRY_EXP_CAP = 8
const MANUAL_ENTRIES_PER_DAY_CAP = 3
const GOAL_EXP_CAP = 5

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

function getExpDelta(sourceType, options = {}) {
  let delta = sourceType === 'income' ? 2 : 1

  if (sourceType === 'bill') delta = 7
  if (sourceType === 'goal') delta = Math.min(GOAL_EXP_CAP, Math.max(1, options.progressPoints || 1))
  if (options.accountLinked) delta += 2
  if (options.receiptBacked) delta += 3
  if (options.isRecurring && sourceType !== 'bill') delta += 1
  if (options.manual) delta = Math.min(delta, 1)

  return Math.min(ENTRY_EXP_CAP, Math.max(0, Math.round(delta)))
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

function getBillActivityDate(bill = {}) {
  const paidAt = Number(bill?.paidAt || 0)
  if (paidAt) return normalizeDate(new Date(paidAt))
  return getActivityDate(bill)
}

function isExcludedCheckin(tx = {}, profile = {}) {
  return Boolean(
    tx?.gamificationExcluded ||
    tx?.seedSource === 'onboarding' ||
    isOnboardingSeededIncome(tx, profile),
  )
}

function buildCheckinEntries(income = [], expenses = [], bills = [], profile = {}) {
  const transactionEntries = [...income, ...expenses]
    .filter(tx => !isExcludedCheckin(tx, profile))
    .map(tx => ({
      ...tx,
      activityDate: getActivityDate(tx),
    }))
    .filter(entry => entry.activityDate)
  const billEntries = bills
    .filter(bill => !bill?.gamificationExcluded && bill?.seedSource !== 'onboarding')
    .flatMap(bill => getBillPaidPeriodEntries(bill))
    .map(payment => ({
      ...payment,
      activityDate: getBillActivityDate(payment),
    }))
    .filter(entry => entry.activityDate)

  return [...transactionEntries, ...billEntries]
    .sort((a, b) => {
      if (a.activityDate !== b.activityDate) return a.activityDate.localeCompare(b.activityDate)
      return ((a.paidAt || a.createdAt) || 0) - ((b.paidAt || b.createdAt) || 0)
    })
}

function normalizeDescription(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function getTransactionIdentity(tx = {}, sourceType = 'expense') {
  return [
    sourceType,
    normalizeDate(tx.date),
    Math.round((Number(tx.amount) || 0) * 100) / 100,
    normalizeDescription(tx.desc || tx.name),
    tx.cat || '',
    tx.subcat || '',
  ].join('|')
}

function getTrustFlags(tx = {}) {
  const receiptBacked = Boolean(tx.receiptId || tx.source === 'receipt' || tx.importSource === 'receipt')
  const accountLinked = Boolean(tx.accountBalanceLinked && tx.accountId)
  return {
    receiptBacked,
    accountLinked,
    manual: !receiptBacked && !accountLinked && !tx.recur,
  }
}

function buildTransactionEntries(transactions = [], sourceType = 'expense', profile = {}, context = {}) {
  const entries = []
  const seen = context.seen || new Set()
  const manualByDay = context.manualByDay || new Map()

  transactions.forEach(tx => {
    if (sourceType === 'income' && (!INCOME_CATS.has(tx?.cat || 'Other') || isOnboardingSeededIncome(tx, profile))) return
    if (sourceType === 'expense' && isExcludedExpense(tx)) return

    const date = getActivityDate(tx)
    if (!date) return

    const identity = getTransactionIdentity(tx, sourceType)
    if (seen.has(identity)) return
    seen.add(identity)

    const trust = getTrustFlags(tx)
    if (trust.manual) {
      const manualCount = manualByDay.get(date) || 0
      if (manualCount >= MANUAL_ENTRIES_PER_DAY_CAP) return
      manualByDay.set(date, manualCount + 1)
    }

    entries.push({
      ...tx,
      date,
      delta: getExpDelta(sourceType, {
        ...trust,
        isRecurring: Boolean(tx?.recur),
      }),
      sourceType,
    })
  })

  return entries
}

function buildGoalEntries(goals = []) {
  return goals
    .filter(goal => !goal?.gamificationExcluded && !goal?.seedSource)
    .map(goal => {
      const target = Number(goal?.target) || 0
      const current = Number(goal?.current) || 0
      if (target <= 0 || current <= 0) return null
      const progressPoints = Math.min(GOAL_EXP_CAP, Math.max(1, Math.round((Math.min(current, target) / target) * GOAL_EXP_CAP)))
      return {
        ...goal,
        date: getActivityDate(goal),
        amount: current,
        delta: getExpDelta('goal', { progressPoints }),
        sourceType: 'goal',
      }
    })
    .filter(Boolean)
}

function buildExpLedger(income = [], expenses = [], bills = [], goals = [], profile = {}) {
  const context = { seen: new Set(), manualByDay: new Map() }
  const gains = buildTransactionEntries(income, 'income', profile, context)
  const expenseEntries = buildTransactionEntries(expenses, 'expense', profile, context)
  const billPayments = bills
    .filter(bill => !bill?.gamificationExcluded && bill?.seedSource !== 'onboarding')
    .flatMap(bill => getBillPaidPeriodEntries(bill))
    .map(payment => ({
      ...payment,
      date: getBillActivityDate(payment),
      delta: getExpDelta('bill', { isRecurring: true, accountLinked: Boolean(payment.accountId) }),
      sourceType: 'bill',
    }))
  const goalEntries = buildGoalEntries(goals)

  return [...gains, ...expenseEntries, ...billPayments, ...goalEntries]
    .filter(entry => entry.date)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return ((a.paidAt || a.createdAt) || 0) - ((b.paidAt || b.createdAt) || 0)
    })
}

export function getGamificationSnapshot(income = [], expenses = [], bills = [], goals = [], profile = {}) {
  const ledger = buildExpLedger(income, expenses, bills, goals, profile)
  const checkinEntries = buildCheckinEntries(income, expenses, bills, profile)
  const now = new Date()
  const todayStr = today()
  const trackedDays = getTrackedDays(checkinEntries)

  let totalExp = 0
  let totalGained = 0
  let totalLost = 0
  let monthNetExp = 0
  const dailyExp = new Map()

  ledger.forEach(entry => {
    const usedToday = dailyExp.get(entry.date) || 0
    const remainingToday = Math.max(0, DAILY_EXP_CAP - usedToday)
    if (!remainingToday) return

    const before = totalExp
    const cappedDelta = Math.min(entry.delta, remainingToday)
    dailyExp.set(entry.date, usedToday + cappedDelta)
    totalExp = Math.max(0, totalExp + cappedDelta)
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

  let message = 'Trusted money habits build momentum.'
  if (currentStreakDays >= 7) message = 'Your logging rhythm is locked in. Protect the streak and keep compounding.'
  else if (currentStreakDays >= 3) message = 'You are building a real money habit now. Keep the streak warm.'
  else if (weeklyCheckins >= weeklyTarget) message = 'Weekly check-in target complete. You are keeping the habit alive.'
  else if (monthNetExp >= 20) message = 'You are stacking strong progress this month.'
  else if (monthNetExp > 0) message = 'Steady progress. Keep your good money habits going.'
  else if (monthNetExp < 0) message = 'Small resets are normal. One good entry gets the bar moving again.'

  let nextMilestone = `Need ${expToNextLevel} trusted EXP for Level ${level + 1}.`
  if (expToNextLevel <= 6) nextMilestone = `One more trusted action could unlock Level ${level + 1}.`
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
    dailyExpCap: DAILY_EXP_CAP,
    entryExpCap: ENTRY_EXP_CAP,
    nextMilestone,
    message,
  }
}
