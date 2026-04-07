import { useEffect, useMemo, useRef, useState } from 'react'
import { getBalanceAtDateWithOverrides, getBalanceOverrides, getMonthForecast, getMonthTransactions } from '../lib/finance'
import { fsAddTransaction, fsClearDailyBalanceOverride, fsClearMonthStartBalance, fsDeleteTransaction, fsSetDailyBalanceOverride, fsUpdate, fsUpdateTransaction } from '../lib/firestore'
import { getTransactionImpact } from '../lib/forecast'
import { getProjectedTransactions } from '../lib/recurrence'
import {
  DEFAULT_CATEGORY_BY_TYPE,
  getDefaultTransactionDraft,
  getQuickItems,
  getQuickPick,
  getSuggestedDescription,
  getTransactionCategories,
} from '../lib/transactionOptions'
import { displayValue, fmt, maskMoney, normalizeDate, RECUR_OPTIONS, today } from '../lib/utils'
import styles from './Page.module.css'
import calStyles from './Calendar.module.css'

function getEmptyForm(type = 'income', defaultAccountId = '') {
  return { ...getDefaultTransactionDraft(type), accountId: defaultAccountId }
}

function getLegacyMonthStartKeyForDate(dateKey, monthStartBalances = {}) {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return ''
  const nextDay = new Date(`${dateKey}T00:00:00`)
  nextDay.setDate(nextDay.getDate() + 1)
  if (nextDay.getDate() !== 1) return ''
  const candidate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}`
  return Object.prototype.hasOwnProperty.call(monthStartBalances, candidate) ? candidate : ''
}

function buildDayAriaLabel({ ds, day, forecast, hasIncome, hasExpense, hasManualBalance, isToday, isSelected, privacyMode, s }) {
  const parts = [
    `${day}, ${new Date(`${ds}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}`,
  ]
  if (privacyMode) parts.push('Balance hidden')
  else parts.push(`Closing balance ${fmt(forecast?.runningBalance || 0, s)}`)
  if (hasIncome) parts.push('has income')
  if (hasExpense) parts.push('has expenses')
  if (hasManualBalance) parts.push('has manual balance override')
  if (isToday) parts.push('today')
  if (isSelected) parts.push('selected')
  return parts.join(', ')
}

export default function Calendar({ user, data, profile = {}, symbol, privacyMode = false, onSelectedDateChange }) {
  const s = symbol || '₱'
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentDay = now.getDate()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(null)
  const defaultAccountId = data.accounts[0]?._id || ''
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('income')
  const [editTx, setEditTx] = useState(null)
  const [form, setForm] = useState(() => getEmptyForm('income', defaultAccountId))
  const [quickPick, setQuickPick] = useState(() => getDefaultTransactionDraft('income').desc)
  const [descTouched, setDescTouched] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [editGoalId, setEditGoalId] = useState(null)
  const [goalInput, setGoalInput] = useState('')
  const [entryFeedback, setEntryFeedback] = useState(null)
  const [editingDayBalance, setEditingDayBalance] = useState(false)
  const [dayBalanceDraft, setDayBalanceDraft] = useState('')
  const [dayBalanceSaving, setDayBalanceSaving] = useState(false)
  const touchStartX = useRef(null)
  const navLock = useRef(false)
  const feedbackTimerRef = useRef(null)

  const todayStr = today()
  const accountLookup = useMemo(
    () => Object.fromEntries((data.accounts || []).map(account => [account._id, account])),
    [data.accounts],
  )
  const label = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const dailyBalanceOverrides = profile?.dailyBalanceOverrides && typeof profile.dailyBalanceOverrides === 'object' && !Array.isArray(profile.dailyBalanceOverrides)
    ? profile.dailyBalanceOverrides
    : {}
  const monthStartBalances = profile?.monthStartBalances && typeof profile.monthStartBalances === 'object' && !Array.isArray(profile.monthStartBalances)
    ? profile.monthStartBalances
    : {}
  const balanceOverrides = useMemo(
    () => getBalanceOverrides(dailyBalanceOverrides, monthStartBalances),
    [dailyBalanceOverrides, monthStartBalances],
  )

  const projected = useMemo(() => getProjectedTransactions(data.income, data.expenses, year, month), [data.income, data.expenses, year, month])
  const projectedIncome = useMemo(() => projected.filter(t => t.type === 'income'), [projected])
  const projectedExpenses = useMemo(() => projected.filter(t => t.type === 'expense'), [projected])

  const actualIncome = useMemo(() => getMonthTransactions(data.income, year, month), [data.income, year, month])
  const actualExpenses = useMemo(() => getMonthTransactions(data.expenses, year, month), [data.expenses, year, month])

  const allIncome = useMemo(() => [...actualIncome, ...projectedIncome], [actualIncome, projectedIncome])
  const allExpenses = useMemo(() => [...actualExpenses, ...projectedExpenses], [actualExpenses, projectedExpenses])

  const forecastMap = useMemo(
    () => getMonthForecast(data.accounts, data.income, data.expenses, projectedIncome, projectedExpenses, year, month, balanceOverrides),
    [data.accounts, data.income, data.expenses, projectedIncome, projectedExpenses, year, month, balanceOverrides],
  )

  const isIncome = modalType === 'income'
  const cats = getTransactionCategories(modalType)
  const quickCats = getQuickItems(modalType)
  const money = value => displayValue(privacyMode, fmt(value, s), maskMoney(s))
  const formatBalanceDate = value => {
    if (!value) return ''
    const parsed = new Date(`${value}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const formatCellBalance = value => {
    if (privacyMode) return `${s}•••`
    const numericValue = Number(value) || 0
    const abs = Math.abs(numericValue)
    const hasDecimals = Math.round(abs * 100) !== Math.round(abs) * 100
    const exact = new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(abs)
    return `${numericValue < 0 ? '−' : ''}${exact}`
  }

  function bumpMonth(direction) {
    if (navLock.current) return
    navLock.current = true
    setSelected(null)
    setEditingDayBalance(false)
    setDayBalanceDraft('')
    if (direction < 0) {
      if (month === 0) {
        setMonth(11)
        setYear(current => current - 1)
      } else {
        setMonth(current => current - 1)
      }
    } else if (month === 11) {
      setMonth(0)
      setYear(current => current + 1)
    } else {
      setMonth(current => current + 1)
    }

    window.setTimeout(() => {
      navLock.current = false
    }, 240)
  }

  function prev() {
    bumpMonth(-1)
  }

  function next() {
    bumpMonth(1)
  }

  function set(key, value) {
    if (key === 'desc') setDescTouched(true)
    setFormError('')
    setForm(current => ({ ...current, [key]: value }))
  }

  function dateStr(day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function closeSelectedDay() {
    if (dayBalanceSaving) return
    if (showModal) closeTransactionEditor()
    if (editingDayBalance) closeDayBalanceEditor()
    setSelected(null)
  }

  function getDayData(day) {
    const ds = dateStr(day)
    return {
      income: allIncome.filter(tx => normalizeDate(tx.date) === ds),
      expenses: allExpenses.filter(tx => normalizeDate(tx.date) === ds),
    }
  }

  function openComposer(type = 'income') {
    const nextDraft = getEmptyForm(type, defaultAccountId)
    closeDayBalanceEditor()
    setEditTx(null)
    setModalType(type)
    setForm(nextDraft)
    setQuickPick(getQuickPick(type, nextDraft.cat, nextDraft.desc) || nextDraft.desc)
    setDescTouched(false)
    setFormError('')
    setShowModal(true)
  }

  function applyComposerCategory(nextCat, nextQuickPick = '') {
    const resolvedQuickPick = nextQuickPick || getQuickPick(modalType, nextCat, '')
    setForm(current => ({
      ...current,
      cat: nextCat,
      desc: descTouched ? current.desc : (resolvedQuickPick || getSuggestedDescription(modalType, nextCat)),
    }))
    setQuickPick(resolvedQuickPick)
    setFormError('')
  }

  function switchComposerType(nextType) {
    if (nextType === modalType) return
    const nextDraft = getEmptyForm(nextType, form.accountId || defaultAccountId)
    setModalType(nextType)
    setForm(current => ({
      ...current,
      type: nextType,
      cat: nextDraft.cat,
      desc: descTouched ? current.desc : nextDraft.desc,
      accountId: current.accountId || defaultAccountId,
    }))
    setQuickPick(getQuickPick(nextType, nextDraft.cat, nextDraft.desc) || nextDraft.desc)
    setFormError('')
  }

  function openEdit(tx) {
    const nextType = tx.type || 'income'
    const nextCat = tx.cat || DEFAULT_CATEGORY_BY_TYPE[nextType]
    const nextDesc = tx.desc || ''
    closeDayBalanceEditor()
    setEditTx(tx)
    setModalType(nextType)
    setForm({
      desc: nextDesc,
      amount: String(tx.amount || ''),
      type: nextType,
      cat: nextCat,
      recur: tx.recur || '',
      accountId: tx.accountId || '',
    })
    setQuickPick(getQuickPick(nextType, nextCat, nextDesc))
    setDescTouched(Boolean(nextDesc))
    setFormError('')
    setShowModal(true)
  }

  function closeTransactionEditor() {
    setShowModal(false)
    setEditTx(null)
    setModalType('income')
    setForm(getEmptyForm('income', defaultAccountId))
    setQuickPick(getDefaultTransactionDraft('income').desc)
    setDescTouched(false)
    setFormError('')
    setFormSaving(false)
  }

  function showEntryFeedback(nextFeedback) {
    setEntryFeedback(nextFeedback)
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = window.setTimeout(() => {
      setEntryFeedback(null)
    }, 4200)
  }

  function buildEntryFeedback() {
    const title = editTx
      ? 'Transaction updated'
      : modalType === 'income'
        ? 'Income logged'
        : 'Expense tracked'

    let tone = modalType === 'income' ? 'var(--accent)' : 'var(--blue)'
    let body = editTx
      ? 'Your ledger has been updated and the forecast is refreshed.'
      : modalType === 'income'
        ? 'Nice. Keeping income current makes the rest of the month easier to trust.'
        : 'Logged. Honest tracking is what turns this into a real control panel.'

    if (formImpact?.msg) {
      body = formImpact.msg
      if (formImpact.level === 'negative') tone = 'var(--red)'
      else if (formImpact.level === 'tight') tone = 'var(--amber)'
      else if (formImpact.level === 'healthy') tone = 'var(--accent)'
    }

    return { title, body, tone }
  }

  function openDayBalanceEditor() {
    if (!selected) return
    const nextValue = Number.isFinite(Number(selectedDayBalance)) ? Number(selectedDayBalance).toFixed(2) : '0.00'
    setEditingDayBalance(true)
    setDayBalanceDraft(nextValue)
  }

  function closeDayBalanceEditor() {
    setEditingDayBalance(false)
    setDayBalanceDraft('')
  }

  async function handleSaveDayBalance() {
    if (!selected) return
    const rawValue = dayBalanceDraft.trim()
    if (!rawValue) return alert('Enter a valid total balance.')
    const value = Number(rawValue)
    if (!Number.isFinite(value)) return alert('Enter a valid total balance.')

    setDayBalanceSaving(true)
    try {
      await fsSetDailyBalanceOverride(user.uid, selected, value)
      if (legacyMonthStartKeyForSelectedDay) {
        await fsClearMonthStartBalance(user.uid, legacyMonthStartKeyForSelectedDay)
      }
      showEntryFeedback({
        eyebrow: 'Day balance',
        title: hasManualBalanceOnSelectedDay ? 'Balance updated' : 'Balance pinned',
        body: `${selected} now closes at ${fmt(value, s)}. Later days inherit from this point until another manual day balance appears.`,
        tone: 'var(--blue)',
      })
      closeDayBalanceEditor()
    } catch {
      alert('Could not save the day balance. Try again.')
    } finally {
      setDayBalanceSaving(false)
    }
  }

  async function handleClearDayBalance() {
    if (!selected) return
    if (!hasManualBalanceOnSelectedDay) {
      closeDayBalanceEditor()
      return
    }

    setDayBalanceSaving(true)
    try {
      if (Object.prototype.hasOwnProperty.call(dailyBalanceOverrides, selected)) {
        await fsClearDailyBalanceOverride(user.uid, selected)
      }
      if (legacyMonthStartKeyForSelectedDay) {
        await fsClearMonthStartBalance(user.uid, legacyMonthStartKeyForSelectedDay)
      }
      showEntryFeedback({
        eyebrow: 'Day balance',
        title: 'Balance reset',
        body: `${selected} is back on automatic calculation from your ledger and prior anchors.`,
        tone: 'var(--accent)',
      })
      closeDayBalanceEditor()
    } catch {
      alert('Could not reset the day balance. Try again.')
    } finally {
      setDayBalanceSaving(false)
    }
  }

  async function handleSave() {
    const amount = parseFloat(form.amount)
    const targetDate = editTx?.date || selected
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Add a valid amount before saving.')
      return
    }
    if (!editTx && !selected) {
      setFormError('Pick a date on the calendar before saving.')
      return
    }
    setFormSaving(true)
    try {
      const trimmedDesc = form.desc.trim()
      if (editTx) {
        const col = editTx.type === 'income' ? 'income' : 'expenses'
        await fsUpdateTransaction(user.uid, col, editTx, {
          desc: trimmedDesc,
          amount,
          cat: form.cat,
          recur: form.recur,
          accountId: form.accountId,
          accountBalanceLinked: Boolean(editTx.accountBalanceLinked),
        }, data.accounts)
      } else {
        const col = modalType === 'income' ? 'income' : 'expenses'
        await fsAddTransaction(user.uid, col, {
          desc: trimmedDesc,
          amount,
          date: selected,
          cat: form.cat,
          recur: form.recur,
          type: modalType,
          accountId: form.accountId,
          accountBalanceLinked: Boolean(form.accountId),
        }, data.accounts)
      }
      showEntryFeedback(buildEntryFeedback())
      closeTransactionEditor()
    } catch {
      setFormError('Could not save this transaction. Try again.')
    } finally {
      setFormSaving(false)
    }
  }

  async function handleDelete(tx) {
    if (tx._projected) return alert('This entry is only a projection. Delete the original recurring transaction to remove it.')
    await fsDeleteTransaction(user.uid, tx.type === 'income' ? 'income' : 'expenses', tx, data.accounts)
  }

  async function handleGoalUpdate(goal) {
    const value = parseFloat(goalInput)
    if (Number.isNaN(value)) return
    await fsUpdate(user.uid, 'goals', goal._id, { current: Math.min(goal.target, value) })
    setEditGoalId(null)
    setGoalInput('')
  }

  function handleWheel(event) {
    const horizontalDelta = event.deltaX
    const verticalDelta = event.deltaY
    const primaryDelta =
      Math.abs(verticalDelta) > Math.abs(horizontalDelta) ? verticalDelta : horizontalDelta
    if (Math.abs(primaryDelta) < 24) return
    event.preventDefault()
    if (primaryDelta > 0) next()
    else prev()
  }

  function handleTouchStart(event) {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  function handleTouchEnd(event) {
    if (touchStartX.current == null) return
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
    const delta = touchStartX.current - endX
    if (Math.abs(delta) > 42) {
      if (delta > 0) next()
      else prev()
    }
    touchStartX.current = null
  }

  const selectedIncome = selected ? allIncome.filter(tx => normalizeDate(tx.date) === selected) : []
  const selectedExpenses = selected ? allExpenses.filter(tx => normalizeDate(tx.date) === selected) : []
  const selectedDayIncome = selectedIncome.reduce((sum, tx) => sum + (tx.amount || 0), 0)
  const selectedDayExpense = selectedExpenses.reduce((sum, tx) => sum + (tx.amount || 0), 0)
  const selectedDayNet = selectedDayIncome - selectedDayExpense
  const selectedDayBalance = selected
    ? (forecastMap[selected]?.runningBalance ?? getBalanceAtDateWithOverrides(data.accounts, data.income, data.expenses, selected, balanceOverrides))
    : 0
  const isCurrentMonthView = year === currentYear && month === currentMonth
  const defaultBalanceDate = useMemo(() => {
    const fallbackDay = isCurrentMonthView
      ? Math.min(currentDay, daysInMonth)
      : daysInMonth
    return dateStr(fallbackDay)
  }, [currentDay, daysInMonth, isCurrentMonthView])
  const balanceFocusDate = selected || defaultBalanceDate
  const balanceFocusValue = balanceFocusDate
    ? (forecastMap[balanceFocusDate]?.runningBalance ?? getBalanceAtDateWithOverrides(data.accounts, data.income, data.expenses, balanceFocusDate, balanceOverrides))
    : 0
  const balanceRailLabel = selected
    ? `Closing balance for ${formatBalanceDate(balanceFocusDate)}`
    : isCurrentMonthView
      ? `Today’s closing balance for ${formatBalanceDate(balanceFocusDate)}`
      : `Month-end closing balance for ${formatBalanceDate(balanceFocusDate)}`
  const balanceRailMeta = selected
    ? 'Selected day closing balance.'
    : isCurrentMonthView
      ? 'Showing today by default. Tap any day to compare its exact closing balance.'
      : 'Showing the last day of this viewed month by default. Tap any day to compare its exact closing balance.'
  const selectedDateLocked = false
  const legacyMonthStartKeyForSelectedDay = selected ? getLegacyMonthStartKeyForDate(selected, monthStartBalances) : ''
  const hasManualBalanceOnSelectedDay = Boolean(
    selected
      && (
        Object.prototype.hasOwnProperty.call(dailyBalanceOverrides, selected)
        || Boolean(legacyMonthStartKeyForSelectedDay)
      ),
  )
  const nextManualBalanceDate = useMemo(() => {
    if (!selected) return ''
    return Object.keys(balanceOverrides)
      .filter(date => date > selected)
      .sort()
      .shift() || ''
  }, [balanceOverrides, selected])

  const formImpact = useMemo(() => {
    if (!selected || !form.amount || !parseFloat(form.amount)) return null
    if (hasManualBalanceOnSelectedDay) {
      return {
        level: 'ok',
        msg: 'This day already has a manual closing balance, so later balances stay pinned unless you update that day balance too.',
      }
    }
    const impact = getTransactionImpact(forecastMap, selected, parseFloat(form.amount), modalType, {
      stopAtDate: nextManualBalanceDate,
    })
    if (!impact || !nextManualBalanceDate) return impact
    return {
      ...impact,
      msg: `${impact.msg} This only carries until ${nextManualBalanceDate}, where a manual day balance takes over.`,
    }
  }, [forecastMap, selected, form.amount, modalType, hasManualBalanceOnSelectedDay, nextManualBalanceDate])
  const accountHint = useMemo(() => {
    const targetDate = normalizeDate(editTx?.date || selected)
    const selectedAccount = accountLookup[form.accountId]

    if (!data.accounts.length) {
      return 'Add an account first if you want calendar transactions to move your current balances automatically.'
    }
    if (!form.accountId) {
      return 'No account selected. This entry will stay in the ledger only and will not change current account balances.'
    }
    if (editTx && !editTx.accountBalanceLinked) {
      return `${selectedAccount?.name || 'Selected account'} is saved here for reference. Older unlinked entries do not rewrite today’s balances automatically.`
    }
    if (targetDate && targetDate <= todayStr) {
      return `${selectedAccount?.name || 'Selected account'} will update right away because this date is today or earlier.`
    }
    return `${selectedAccount?.name || 'Selected account'} is linked, but current balances will wait until this date arrives.`
  }, [accountLookup, data.accounts.length, editTx, form.accountId, selected, todayStr])

  useEffect(() => {
    setEditingDayBalance(false)
    setDayBalanceDraft('')
  }, [selected, year, month])

  useEffect(() => {
    if (!showModal || editTx || form.accountId || !defaultAccountId) return
    setForm(current => ({ ...current, accountId: defaultAccountId }))
  }, [defaultAccountId, editTx, form.accountId, showModal])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (onSelectedDateChange) onSelectedDateChange(selected || '')
  }, [selected, onSelectedDateChange])

  return (
    <div className={`${styles.page} ${calStyles.page}`}>
      <div className={`${styles.header} ${calStyles.pageHeader}`}>
        <div className={styles.title}>Calendar</div>
        <div className={`${styles.sub} ${calStyles.pageSub}`}>Swipe or scroll sideways to move month by month</div>
      </div>

      {entryFeedback && (
        <div className={`${styles.card} ${calStyles.feedbackBanner} ${calStyles.feedbackDock}`} style={{ '--feedback-tone': entryFeedback.tone }}>
          <div className={calStyles.feedbackEyebrow}>{entryFeedback.eyebrow || 'Entry saved'}</div>
          <div className={calStyles.feedbackTitle}>{entryFeedback.title}</div>
          <div className={calStyles.feedbackBody}>{entryFeedback.body}</div>
        </div>
      )}

      <div
        className={`${styles.card} ${calStyles.calendarCard}`}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={calStyles.calHeader}>
          <div className={calStyles.nav}>
            <button type="button" className={calStyles.navBtn} onClick={prev} aria-label="Previous month">←</button>
            <div className={calStyles.monthLabel} id="calendar-month-label">{label}</div>
            <button type="button" className={calStyles.navBtn} onClick={next} aria-label="Next month">→</button>
          </div>
        </div>

        <div className={calStyles.monthBoard}>
          <div className={calStyles.dayNames}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <div key={index} className={calStyles.dayName}>{day}</div>)}
          </div>

          <div className={calStyles.grid} aria-label={`${label} calendar`}>
            {Array.from({ length: firstDay }, (_, index) => (
              <div key={`p${index}`} className={`${calStyles.cell} ${calStyles.otherMonth}`} aria-hidden="true">
                <div className={calStyles.dateNum}>{prevDays - firstDay + 1 + index}</div>
              </div>
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1
              const ds = dateStr(day)
              const { income, expenses } = getDayData(day)
              const hasIncome = income.length > 0
              const hasExpense = expenses.length > 0
              const hasManualBalance = Object.prototype.hasOwnProperty.call(balanceOverrides, ds)
              const isSelected = selected === ds
              const isToday = ds === todayStr
              const forecast = forecastMap[ds]
              const balanceLabel = forecast ? formatCellBalance(forecast.runningBalance) : ''
              const dayAriaLabel = buildDayAriaLabel({ ds, day, forecast, hasIncome, hasExpense, hasManualBalance, isToday, isSelected, privacyMode, s })

              return (
                <button
                  type="button"
                  key={day}
                  className={`${calStyles.cell} ${isToday ? calStyles.today : ''} ${isSelected ? calStyles.selectedCell : ''} ${(hasIncome || hasExpense) ? calStyles.hasData : ''}`}
                  onClick={() => setSelected(ds === selected ? null : ds)}
                  aria-pressed={isSelected}
                  aria-label={dayAriaLabel}
                >
                  <div className={calStyles.cellTop}>
                    <div className={calStyles.dateNum}>{day}</div>
                    {(hasIncome || hasExpense || hasManualBalance) && (
                      <div className={calStyles.dots}>
                        {hasManualBalance && <div className={`${calStyles.dot} ${calStyles.dotBalance}`} />}
                        {hasIncome && <div className={`${calStyles.dot} ${calStyles.dotIncome}`} />}
                        {hasExpense && <div className={`${calStyles.dot} ${calStyles.dotExpense}`} />}
                      </div>
                    )}
                  </div>
                  <div
                    className={calStyles.cellBalance}
                    title={privacyMode ? 'Balance hidden' : fmt(forecast?.runningBalance || 0, s)}
                  >
                    {balanceLabel}
                  </div>
                </button>
              )
            })}
            {Array.from({ length: (7 - (firstDay + daysInMonth) % 7) % 7 }, (_, index) => (
              <div key={`n${index}`} className={`${calStyles.cell} ${calStyles.otherMonth}`} aria-hidden="true">
                <div className={calStyles.dateNum}>{index + 1}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={calStyles.balanceRail}>
          <div className={calStyles.balanceRailCopy}>
            <div className={calStyles.balanceRailLabel}>{balanceRailLabel}</div>
            <div className={calStyles.balanceRailMeta}>{balanceRailMeta}</div>
          </div>
          <div className={calStyles.balanceRailValue}>{money(balanceFocusValue)}</div>
        </div>
      </div>

      {selected && (
        <>
          <div className={calStyles.dayPanelOverlay} onClick={closeSelectedDay} aria-hidden="true" />
          <div className={calStyles.dayPanel} role="dialog" aria-modal="true" aria-labelledby="calendar-day-panel-title">
            <div className={calStyles.dayPanelHandle} />
            <div className={calStyles.dayPanelHeader}>
              <div>
                <span id="calendar-day-panel-title" style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{selected}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeSelectedDay} className={calStyles.dayPanelClose} aria-label="Close selected day">✕</button>
              </div>
            </div>

            <div className={calStyles.dayBalanceCard}>
              {!editingDayBalance ? (
                <>
                  <div className={calStyles.dayBalanceHeader}>
                    <span className={calStyles.dayBalanceLabel}>{hasManualBalanceOnSelectedDay ? 'Manual closing balance on this day' : 'Closing balance on this day'}</span>
                    <button type="button" className={calStyles.dayBalanceEditBtn} onClick={openDayBalanceEditor} aria-label={`Edit closing balance for ${selected}`} disabled={selectedDateLocked}>
                      Edit
                    </button>
                  </div>
                  <div className={calStyles.dayBalanceValue}>{money(selectedDayBalance)}</div>
                  <div className={calStyles.dayBalanceMeta}>
                    {hasManualBalanceOnSelectedDay
                      ? 'Pinned as the closing balance for this date. Later days inherit from it until another manual balance appears.'
                      : 'Calculated as the end-of-day total from your account balances, transactions, and any earlier manual balance anchors.'}
                  </div>
                </>
              ) : (
                <>
                  <label className={calStyles.dayBalanceField}>
                    <span className={calStyles.dayBalanceLabel}>Closing balance for {selected}</span>
                    <div className={calStyles.dayBalanceInputWrap}>
                      <span>{s}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={dayBalanceDraft}
                        onChange={event => setDayBalanceDraft(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') handleSaveDayBalance()
                          if (event.key === 'Escape') closeDayBalanceEditor()
                        }}
                        placeholder="0.00"
                        disabled={dayBalanceSaving}
                      />
                    </div>
                  </label>
                  <div className={calStyles.dayBalanceMeta}>
                    This becomes the total balance at the end of this day and recalculates all later days from here.
                  </div>
                  <div className={calStyles.dayBalanceActions}>
                    <button type="button" className={calStyles.dayBalanceGhostBtn} onClick={closeDayBalanceEditor} disabled={dayBalanceSaving}>
                      Cancel
                    </button>
                    {hasManualBalanceOnSelectedDay && (
                      <button type="button" className={calStyles.dayBalanceGhostBtn} onClick={handleClearDayBalance} disabled={dayBalanceSaving}>
                        Reset to auto
                      </button>
                    )}
                    <button type="button" className={calStyles.dayBalanceSaveBtn} onClick={handleSaveDayBalance} disabled={dayBalanceSaving}>
                      {dayBalanceSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className={calStyles.dayPanelActions}>
              <button type="button" className={`${calStyles.dayPanelAction} ${calStyles.dayPanelActionIncome}`} onClick={() => openComposer('income')} disabled={selectedDateLocked}>
                + Add income
              </button>
              <button type="button" className={`${calStyles.dayPanelAction} ${calStyles.dayPanelActionExpense}`} onClick={() => openComposer('expense')} disabled={selectedDateLocked}>
                − Add expense
              </button>
            </div>

            {selectedIncome.length > 0 && (
              <div className={calStyles.daySection}>
                <div className={calStyles.daySectionLabel} style={{ color: 'var(--accent)' }}>Income</div>
                {selectedIncome.map(tx => (
                  <DayTxRow
                    key={tx._id}
                    t={tx}
                    s={s}
                    privacyMode={privacyMode}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    locked={selectedDateLocked}
                    accountLabel={tx.accountId ? (accountLookup[tx.accountId]?.name || 'Missing account') : ''}
                  />
                ))}
              </div>
            )}

            {selectedExpenses.length > 0 && (
              <div className={calStyles.daySection}>
                <div className={calStyles.daySectionLabel} style={{ color: 'var(--red)' }}>Expenses</div>
                {selectedExpenses.map(tx => (
                  <DayTxRow
                    key={tx._id}
                    t={tx}
                    s={s}
                    privacyMode={privacyMode}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    locked={selectedDateLocked}
                    accountLabel={tx.accountId ? (accountLookup[tx.accountId]?.name || 'Missing account') : ''}
                  />
                ))}
              </div>
            )}

            {selectedIncome.length === 0 && selectedExpenses.length === 0 && (
              <div className={styles.empty}>No transactions on this day yet. Add one here so the date context stays intact.</div>
            )}

            {(selectedIncome.length > 0 || selectedExpenses.length > 0) && (
              <div className={calStyles.daySummary}>
                <span style={{ color: 'var(--accent)' }}>
                  {displayValue(privacyMode, `+${fmt(selectedDayIncome, s)}`, `+${maskMoney(s)}`)}
                </span>
                <span style={{ color: 'var(--text3)' }}>·</span>
                <span style={{ color: 'var(--red)' }}>
                  {displayValue(privacyMode, `−${fmt(selectedDayExpense, s)}`, `−${maskMoney(s)}`)}
                </span>
                <span style={{ color: 'var(--text3)' }}>·</span>
                <span style={{ color: selectedDayNet >= 0 ? 'var(--blue)' : 'var(--red)', fontWeight: 600 }}>
                  {displayValue(
                    privacyMode,
                    `Net ${fmt(selectedDayNet, s)}`,
                    'Net hidden',
                  )}
                </span>
              </div>
            )}

            {data.goals.length > 0 && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                <div className={calStyles.daySectionLabel} style={{ color: 'var(--blue)', marginBottom: 10 }}>Savings Goals</div>
                {data.goals.map(goal => {
                  const pct = Math.min(100, Math.round(((goal.current || 0) / (goal.target || 1)) * 100))
                  const isEditing = editGoalId === goal._id

                  return (
                    <div key={goal._id} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{goal.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{money(goal.current || 0)}</span>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>/ {money(goal.target)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditGoalId(isEditing ? null : goal._id)
                              setGoalInput(String(goal.current || 0))
                            }}
                            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                          >
                            {isEditing ? 'Cancel' : 'Edit'}
                          </button>
                        </div>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? 'var(--amber)' : 'var(--accent)', borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>
                      {isEditing && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <input
                            type="number"
                            min="0"
                            value={goalInput}
                            onChange={event => setGoalInput(event.target.value)}
                            placeholder="New total saved"
                            style={{ flex: 1, padding: '6px 10px', background: 'var(--surface2)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 16, outline: 'none', fontFamily: 'var(--font-body)' }}
                          />
                          <button type="button" onClick={() => handleGoalUpdate(goal)} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#0a0a0f', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {showModal && (
        <div className={calStyles.modalOverlay} onClick={closeTransactionEditor}>
          <div className={calStyles.modal} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="calendar-transaction-modal-title">
            <div className={calStyles.modalHeader}>
              <div className={calStyles.modalTitle} id="calendar-transaction-modal-title">
                {editTx ? 'Edit transaction' : `Add ${isIncome ? 'Income' : 'Expense'}`}
                {selected && !editTx && <span style={{ fontSize: 13, color: 'var(--text3)', marginLeft: 8 }}>{selected}</span>}
              </div>
            <button type="button" onClick={closeTransactionEditor} className={calStyles.modalClose} disabled={formSaving} aria-label="Close transaction editor">✕</button>
            </div>

            {!editTx && (
              <div className={calStyles.typeToggle}>
                <button type="button" className={`${calStyles.typeBtn} ${isIncome ? calStyles.typeBtnIncome : ''}`} onClick={() => switchComposerType('income')} disabled={formSaving} aria-pressed={isIncome}>
                  <span className={calStyles.typeBtnSign}>+</span><span>Income</span>
                </button>
                <button type="button" className={`${calStyles.typeBtn} ${!isIncome ? calStyles.typeBtnExpense : ''}`} onClick={() => switchComposerType('expense')} disabled={formSaving} aria-pressed={!isIncome}>
                  <span className={calStyles.typeBtnSign}>−</span><span>Expense</span>
                </button>
              </div>
            )}

            <div className={calStyles.amountField}>
              <span className={calStyles.amountSign} style={{ color: isIncome ? 'var(--accent)' : 'var(--red)' }}>
                {isIncome ? '+' : '−'}
              </span>
              <span className={calStyles.amountSymbol}>{s}</span>
              <input
                className={calStyles.amountInput}
                type="number"
                min="0"
                placeholder="0.00"
                value={form.amount}
                disabled={formSaving}
                onChange={event => set('amount', event.target.value)}
                style={{ color: isIncome ? 'var(--accent)' : 'var(--red)' }}
                aria-label={`${isIncome ? 'Income' : 'Expense'} amount`}
              />
            </div>

            <div className={calStyles.modalSectionLabel}>Category</div>
            <div className={calStyles.quickCats}>
              {quickCats.map(item => (
                <button
                  key={item.label}
                  className={`${calStyles.quickCat} ${quickPick === item.label ? calStyles.quickCatActive : ''}`}
                  style={quickPick === item.label ? {
                    borderColor: isIncome ? 'var(--accent)' : 'var(--red)',
                    background: isIncome ? 'var(--accent-glow)' : 'var(--red-dim)',
                    color: isIncome ? 'var(--accent)' : 'var(--red)',
                  } : {}}
                  disabled={formSaving}
                  onClick={() => applyComposerCategory(item.cat, item.label)}
                  aria-pressed={quickPick === item.label}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <div className={calStyles.modalFields}>
              <div className={styles.formGroup}>
                <label>All categories</label>
                <select value={form.cat} onChange={event => applyComposerCategory(event.target.value)} disabled={formSaving}>
                  {cats.map(option => <option key={option}>{option}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Merchant or note</label>
                <input placeholder="What was this for? (optional)" value={form.desc} onChange={event => set('desc', event.target.value)} disabled={formSaving} />
              </div>
              <div className={styles.formGroup}>
                <label>Account</label>
                <select value={form.accountId} onChange={event => set('accountId', event.target.value)} disabled={formSaving}>
                  <option value="">No account selected</option>
                  {data.accounts.map(account => (
                    <option key={account._id} value={account._id}>
                      {account.name} · {account.type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={calStyles.accountHint}>{accountHint}</div>

            {formError && <div className={calStyles.formError} role="alert">{formError}</div>}

            <div className={styles.formGroup} style={{ marginBottom: '1.25rem' }}>
              <label>Recurrence</label>
              <div className={calStyles.recurGrid}>
                {RECUR_OPTIONS.map(option => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => set('recur', option.value)}
                    className={`${calStyles.recurChip} ${form.recur === option.value ? calStyles.recurChipActive : ''}`}
                    disabled={formSaving}
                    aria-pressed={form.recur === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {formImpact && (
              <div
                className={calStyles.impactPreview}
                role="status"
                style={{
                  background: formImpact.level === 'negative' ? 'var(--red-dim)' : formImpact.level === 'tight' ? 'var(--amber-dim)' : 'var(--accent-glow)',
                  borderColor: formImpact.level === 'negative' ? 'var(--red)' : formImpact.level === 'tight' ? 'var(--amber)' : 'var(--accent)',
                  color: formImpact.level === 'negative' ? 'var(--red)' : formImpact.level === 'tight' ? 'var(--amber)' : 'var(--accent)',
                }}
              >
                {formImpact.msg}
              </div>
            )}

            <div className={calStyles.modalActions}>
              <button type="button" onClick={closeTransactionEditor} className={calStyles.btnCancel} disabled={formSaving}>Cancel</button>
              <button
                type="button"
                onClick={handleSave}
                className={calStyles.btnSave}
                style={{ background: isIncome ? 'var(--accent)' : 'var(--red)', color: isIncome ? '#0a0a0f' : '#fff' }}
                disabled={formSaving || !Number.isFinite(parseFloat(form.amount)) || parseFloat(form.amount) <= 0}
              >
                {formSaving ? 'Saving...' : editTx ? 'Save changes' : isIncome ? '+ Add income' : '− Add expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DayTxRow({ t, s, privacyMode, onEdit, onDelete, locked = false, accountLabel = '' }) {
  const isIncome = t.type === 'income'
  return (
    <div className={calStyles.txRow}>
      <div className={calStyles.txLeft}>
        <div className={calStyles.txIcon} style={{ background: isIncome ? 'var(--accent-glow)' : 'var(--red-dim)', color: isIncome ? 'var(--accent)' : 'var(--red)' }}>
          {isIncome ? '+' : '−'}
        </div>
        <div>
          <div className={calStyles.txDesc}>
            {t.desc}
            {t._projected && <span className={calStyles.projBadge}>recurring</span>}
          </div>
          <div className={calStyles.txMeta}>
            {t.cat}
            {accountLabel && <span className={calStyles.accountBadge}>{accountLabel}</span>}
            {t.recur && <span className={calStyles.recurBadge}>{t.recur}</span>}
          </div>
        </div>
      </div>
      <div className={calStyles.txRight}>
        <div className={calStyles.txAmount} style={{ color: isIncome ? 'var(--accent)' : 'var(--red)' }}>
          {displayValue(privacyMode, `${isIncome ? '+' : '−'}${fmt(t.amount, s)}`, `${isIncome ? '+' : '−'}${maskMoney(s)}`)}
        </div>
        <div className={calStyles.txActions}>
          {!t._projected && <button type="button" className={calStyles.editBtn} onClick={() => onEdit(t)} aria-label={`Edit ${t.desc || t.cat}`} disabled={locked}>Edit</button>}
          <button type="button" className={calStyles.delBtnSm} onClick={() => onDelete(t)} aria-label={`Delete ${t.desc || t.cat}`} disabled={locked}>✕</button>
        </div>
      </div>
    </div>
  )
}
