import { applyBalanceOverridesToForecast, buildForecast, getEndOfMonthBalance } from './forecast'
import { getProjectedTransactions } from './recurrence'
import { getMonthKey, normalizeDate, toMonthKey, today } from './utils'

function toLedgerEntry(tx, sign) {
  const date = normalizeDate(tx?.date)
  if (!date) return null

  return {
    ...tx,
    date,
    signedAmount: sign * Math.abs(Number(tx?.amount) || 0),
  }
}

export function getCurrentBalance(accounts = []) {
  return accounts.reduce((sum, account) => sum + (Number(account?.balance) || 0), 0)
}

export function getActualLedger(income = [], expenses = []) {
  return [
    ...income.map(tx => toLedgerEntry(tx, 1)),
    ...expenses.map(tx => toLedgerEntry(tx, -1)),
  ]
    .filter(Boolean)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.createdAt || 0) - (b.createdAt || 0)
    })
}

export function getMonthTransactions(list = [], year, month) {
  return list.filter(tx => getMonthKey(tx?.date) === toMonthKey(year, month))
}

export function getMonthTotal(list = [], year, month) {
  return getMonthTransactions(list, year, month).reduce((sum, tx) => sum + (Number(tx?.amount) || 0), 0)
}

function normalizeMonthStartBalances(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  return Object.entries(raw).reduce((acc, [monthKey, value]) => {
    if (!/^\d{4}-\d{2}$/.test(monthKey)) return acc
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return acc
    acc[monthKey] = numericValue
    return acc
  }, {})
}

function normalizeDailyBalanceOverrides(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  return Object.entries(raw).reduce((acc, [dateKey, value]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return acc
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return acc
    acc[dateKey] = numericValue
    return acc
  }, {})
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getMonthCursor(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getProjectedLedgerBetweenDates(income = [], expenses = [], anchorDate, targetDate) {
  const anchor = normalizeDate(anchorDate)
  const target = normalizeDate(targetDate)

  if (!anchor || !target || target <= anchor) return []

  const cursor = getMonthCursor(new Date(`${anchor}T00:00:00`))
  const end = getMonthCursor(new Date(`${target}T00:00:00`))
  const entries = []
  const seen = new Set()

  while (cursor <= end) {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const projected = getProjectedTransactions(income, expenses, year, month)

    projected.forEach(tx => {
      const date = normalizeDate(tx?.date)
      if (!date || date <= anchor || date > target) return

      const key = tx._id || `${tx.type}:${tx._sourceId || tx.desc}:${date}`
      if (seen.has(key)) return
      seen.add(key)

      entries.push(toLedgerEntry(tx, tx.type === 'income' ? 1 : -1))
    })

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return entries
    .filter(Boolean)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.createdAt || 0) - (b.createdAt || 0)
    })
}

function getBalanceFromAnchor(accounts = [], income = [], expenses = [], anchorDate, anchorBalance = 0, targetDate) {
  const anchor = normalizeDate(anchorDate)
  const target = normalizeDate(targetDate)

  if (!anchor || !target || target <= anchor) return Number(anchorBalance) || 0

  const actualLedger = getActualLedger(income, expenses)
  const projectedLedger = getProjectedLedgerBetweenDates(income, expenses, anchor, target)
  const deltaUntilTarget = [...actualLedger, ...projectedLedger]
    .filter(entry => entry.date > anchor && entry.date <= target)
    .reduce((sum, entry) => sum + entry.signedAmount, 0)

  return (Number(anchorBalance) || 0) + deltaUntilTarget
}

function getMonthStartAnchorDate(monthKey) {
  const [yearText, monthText] = String(monthKey).split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isInteger(year) || !Number.isInteger(month)) return ''
  return toDateKey(new Date(year, month - 1, 0))
}

export function getBalanceOverrides(dailyBalanceOverrides = {}, monthStartBalances = {}) {
  const normalizedDailyOverrides = normalizeDailyBalanceOverrides(dailyBalanceOverrides)
  const legacyOverrides = Object.entries(normalizeMonthStartBalances(monthStartBalances)).reduce((acc, [monthKey, value]) => {
    const anchorDate = getMonthStartAnchorDate(monthKey)
    if (!anchorDate) return acc
    acc[anchorDate] = value
    return acc
  }, {})

  return {
    ...legacyOverrides,
    ...normalizedDailyOverrides,
  }
}

export function getBalanceAtDate(accounts = [], income = [], expenses = [], targetDate, anchorDate = today()) {
  const currentBalance = getCurrentBalance(accounts)
  const target = normalizeDate(targetDate)
  const anchor = normalizeDate(anchorDate)

  if (!target || !anchor || target === anchor) return currentBalance

  const actualLedger = getActualLedger(income, expenses)

  if (target < anchor) {
    const deltaAfterTarget = actualLedger
      .filter(entry => entry.date > target && entry.date <= anchor)
      .reduce((sum, entry) => sum + entry.signedAmount, 0)

    return currentBalance - deltaAfterTarget
  }

  const projectedLedger = getProjectedLedgerBetweenDates(income, expenses, anchor, target)
  const deltaUntilTarget = [...actualLedger, ...projectedLedger]
    .filter(entry => entry.date > anchor && entry.date <= target)
    .reduce((sum, entry) => sum + entry.signedAmount, 0)

  return currentBalance + deltaUntilTarget
}

export function getBalanceAtDateWithOverrides(accounts = [], income = [], expenses = [], targetDate, balanceOverrides = {}) {
  const target = normalizeDate(targetDate)
  if (!target) return getCurrentBalance(accounts)
  const normalizedOverrides = normalizeDailyBalanceOverrides(balanceOverrides)

  const latestOverrideDate = Object.keys(normalizedOverrides)
    .filter(date => date <= target)
    .sort()
    .pop()

  if (!latestOverrideDate) return getBalanceAtDate(accounts, income, expenses, target)

  return getBalanceFromAnchor(
    accounts,
    income,
    expenses,
    latestOverrideDate,
    normalizedOverrides[latestOverrideDate],
    target,
  )
}

export function getMonthStartBalance(accounts = [], income = [], expenses = [], year, month, balanceOverrides = {}) {
  const targetAnchorDate = toDateKey(new Date(year, month, 0))
  return getBalanceAtDateWithOverrides(accounts, income, expenses, targetAnchorDate, balanceOverrides)
}

export function getMonthForecast(
  accounts = [],
  income = [],
  expenses = [],
  projectedIncome = [],
  projectedExpenses = [],
  year,
  month,
  balanceOverrides = {},
) {
  const normalizedOverrides = normalizeDailyBalanceOverrides(balanceOverrides)
  const startingBalance = getMonthStartBalance(accounts, income, expenses, year, month, normalizedOverrides)
  const allIncome = [
    ...getMonthTransactions(income, year, month),
    ...getMonthTransactions(projectedIncome, year, month),
  ]
  const allExpenses = [
    ...getMonthTransactions(expenses, year, month),
    ...getMonthTransactions(projectedExpenses, year, month),
  ]
  const baseForecast = buildForecast(allIncome, allExpenses, year, month, startingBalance)
  return applyBalanceOverridesToForecast(baseForecast, year, month, normalizedOverrides, startingBalance)
}

export function getMonthEndBalanceForView(
  accounts = [],
  income = [],
  expenses = [],
  projectedIncome = [],
  projectedExpenses = [],
  year,
  month,
  balanceOverrides = {},
) {
  return getEndOfMonthBalance(
    getMonthForecast(
      accounts,
      income,
      expenses,
      projectedIncome,
      projectedExpenses,
      year,
      month,
      balanceOverrides,
    ),
  )
}
