import { useMemo, useState } from 'react'
import { getCurrentBalance } from '../lib/finance'
import { fsCompleteOnboarding } from '../lib/firestore'
import { CURRENCIES, formatDisplayDate, PAY_SCHEDULES, RECUR_OPTIONS, fmt, normalizeDate, today } from '../lib/utils'
import styles from './Onboarding.module.css'

const STEPS = ['welcome', 'income', 'accounts', 'bills', 'review']
const STEP_DETAILS = [
  { label: 'Intro', desc: 'What Takda will set up' },
  { label: 'Income', desc: 'Salary, currency, and pay rhythm' },
  { label: 'Accounts', desc: 'Opening balances across your accounts' },
  { label: 'Bills', desc: 'Recurring monthly commitments' },
  { label: 'Review', desc: 'Save your baseline and begin' },
]
const ACCOUNT_TYPES = ['Cash', 'Bank', 'E-wallet', 'Credit Card', 'Investment', 'Other']
const ACCOUNT_COLORS = ['#22d87a', '#6eb5ff', '#ffb347', '#ff5370', '#b48eff', '#2dd4bf', '#f472b6', '#9090b0']
const BILL_CATEGORIES = ['Rent', 'Electric', 'Water', 'Internet', 'Phone', 'Insurance', 'Subscription', 'Other']
const BILL_FREQS = RECUR_OPTIONS.filter(option => option.value !== '' && option.value !== 'daily')

function createId(prefix = 'row') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100
}

function formatDate(date) {
  return normalizeDate(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`)
}

function getDefaultLastPayday(schedule = 'semi-monthly') {
  const now = new Date()
  if (schedule === 'semi-monthly') {
    if (now.getDate() >= 15) return formatDate(new Date(now.getFullYear(), now.getMonth(), 15))
    return formatDate(new Date(now.getFullYear(), now.getMonth(), 1))
  }
  return today()
}

function createAccountRow() {
  return { id: createId('account'), name: '', type: 'Cash', balance: '' }
}

function createBillRow() {
  return { id: createId('bill'), name: '', amount: '', due: '', cat: 'Rent', freq: 'monthly' }
}

function hasText(value) {
  return String(value ?? '').trim() !== ''
}

function hasValue(value) {
  return value !== '' && value !== null && value !== undefined
}

function hasAccountContent(row = {}) {
  return hasText(row.name) || hasValue(row.balance)
}

function hasBillContent(row = {}) {
  return hasText(row.name) || hasValue(row.amount) || hasValue(row.due)
}

function getOccurrencesPerYear(freq = 'monthly') {
  switch (freq) {
    case 'weekly': return 52
    case 'bi-weekly': return 26
    case 'tri-weekly': return 365 / 21
    case 'quad-weekly': return 365 / 28
    case 'semi-monthly': return 24
    case 'monthly':
    default:
      return 12
  }
}

function getPerPayAmount(monthlySalary, schedule) {
  if (!monthlySalary) return 0
  return roundMoney((monthlySalary * 12) / getOccurrencesPerYear(schedule))
}

function getMonthlyEquivalent(amount, freq = 'monthly') {
  const numericAmount = Number(amount) || 0
  if (!numericAmount) return 0
  return roundMoney((numericAmount * getOccurrencesPerYear(freq)) / 12)
}

function isSemiMonthlyPayday(value) {
  const normalized = normalizeDate(value)
  if (!normalized) return false
  const day = Number(normalized.slice(-2))
  return day === 1 || day === 15
}

function getLatestDueAnchorDate(dueDay) {
  const now = new Date()
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const currentMonthDay = Math.min(dueDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())
  const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), currentMonthDay)
  if (currentMonthDate <= todayDate) return formatDate(currentMonthDate)

  const previousMonthDay = Math.min(dueDay, new Date(now.getFullYear(), now.getMonth(), 0).getDate())
  return formatDate(new Date(now.getFullYear(), now.getMonth() - 1, previousMonthDay))
}

export default function Onboarding({ user, onDone, notice = '' }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    salary: '',
    paySchedule: 'semi-monthly',
    lastPayday: getDefaultLastPayday('semi-monthly'),
    currency: 'PHP',
    accounts: [createAccountRow()],
    bills: [createBillRow()],
  })
  const [saving, setSaving] = useState(false)

  function set(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function setSchedule(value) {
    setForm(current => ({
      ...current,
      paySchedule: value,
      lastPayday: value === 'semi-monthly' && !isSemiMonthlyPayday(current.lastPayday)
        ? getDefaultLastPayday(value)
        : current.lastPayday || getDefaultLastPayday(value),
    }))
  }

  function updateAccountRow(id, key, value) {
    setForm(current => ({
      ...current,
      accounts: current.accounts.map(row => row.id === id ? { ...row, [key]: value } : row),
    }))
  }

  function addAccountRow() {
    setForm(current => ({ ...current, accounts: [...current.accounts, createAccountRow()] }))
  }

  function removeAccountRow(id) {
    setForm(current => ({ ...current, accounts: current.accounts.filter(row => row.id !== id) }))
  }

  function updateBillRow(id, key, value) {
    setForm(current => ({
      ...current,
      bills: current.bills.map(row => row.id === id ? { ...row, [key]: value } : row),
    }))
  }

  function addBillRow() {
    setForm(current => ({ ...current, bills: [...current.bills, createBillRow()] }))
  }

  function removeBillRow(id) {
    setForm(current => ({ ...current, bills: current.bills.filter(row => row.id !== id) }))
  }

  const name = user.displayName?.split(' ')[0] || 'there'
  const curr = CURRENCIES.find(currency => currency.code === form.currency)
  const symbol = curr?.symbol || '₱'
  const salaryAmount = Number(form.salary) || 0
  const perPayAmount = getPerPayAmount(salaryAmount, form.paySchedule)

  const preparedAccounts = useMemo(() => form.accounts
    .filter(hasAccountContent)
    .map((row, index) => ({
      name: row.name.trim(),
      type: row.type,
      balance: roundMoney(row.balance),
      color: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length],
      notes: '',
    })), [form.accounts])

  const preparedBills = useMemo(() => form.bills
    .filter(hasBillContent)
    .map(row => ({
      name: row.name.trim(),
      amount: roundMoney(row.amount),
      due: Number(row.due),
      cat: row.cat || 'Other',
      freq: row.freq || 'monthly',
      paid: false,
      type: 'bill',
    })), [form.bills])

  const seededIncome = useMemo(() => {
    const lastPayday = normalizeDate(form.lastPayday)
    if (!salaryAmount || !lastPayday) return []
    return [{
      desc: 'Salary',
      amount: perPayAmount,
      date: lastPayday,
      cat: 'Salary',
      recur: form.paySchedule,
      type: 'income',
      seedSource: 'onboarding',
      gamificationExcluded: true,
    }]
  }, [salaryAmount, perPayAmount, form.lastPayday, form.paySchedule])

  const seededExpenses = useMemo(() => preparedBills.map(bill => ({
    desc: bill.name,
    amount: bill.amount,
    date: getLatestDueAnchorDate(bill.due),
    cat: 'Bills',
    recur: bill.freq,
    type: 'expense',
    seedSource: 'onboarding',
    gamificationExcluded: true,
  })), [preparedBills])

  const startingBalance = getCurrentBalance(preparedAccounts)
  const fixedBillsEstimate = preparedBills.reduce((sum, bill) => sum + getMonthlyEquivalent(bill.amount, bill.freq), 0)
  const projectedMonthEnd = startingBalance + salaryAmount - fixedBillsEstimate
  const progressPercent = Math.round((step / (STEPS.length - 1)) * 100)

  function validateIncomeStep() {
    if (!hasValue(form.salary) || salaryAmount === 0) return true
    if (salaryAmount < 0) {
      alert('Monthly salary must be zero or higher.')
      return false
    }
    if (!normalizeDate(form.lastPayday)) {
      alert('Add your latest payday so Takda can anchor recurring income correctly.')
      return false
    }
    if (form.paySchedule === 'semi-monthly' && !isSemiMonthlyPayday(form.lastPayday)) {
      alert('Semi-monthly payroll in Takda uses the 1st and 15th. Choose the latest payday on one of those dates.')
      return false
    }
    return true
  }

  function validateAccountsStep() {
    for (const row of form.accounts.filter(hasAccountContent)) {
      if (!hasText(row.name)) {
        alert('Each account needs a name.')
        return false
      }
      if (!hasValue(row.balance) || Number.isNaN(Number(row.balance)) || Number(row.balance) < 0) {
        alert('Each account needs a valid balance.')
        return false
      }
    }
    return true
  }

  function validateBillsStep() {
    for (const row of form.bills.filter(hasBillContent)) {
      if (!hasText(row.name) || !hasValue(row.amount) || !hasValue(row.due)) {
        alert('Each bill needs a name, amount, and due day.')
        return false
      }
      if (Number.isNaN(Number(row.amount)) || Number(row.amount) <= 0) {
        alert('Bill amounts must be greater than zero.')
        return false
      }
      if (Number.isNaN(Number(row.due)) || Number(row.due) < 1 || Number(row.due) > 31) {
        alert('Bill due day must be between 1 and 31.')
        return false
      }
    }
    return true
  }

  function goNext() {
    if (step === 1 && !validateIncomeStep()) return
    if (step === 2 && !validateAccountsStep()) return
    if (step === 3 && !validateBillsStep()) return
    setStep(current => Math.min(current + 1, STEPS.length - 1))
  }

  function goBack() {
    setStep(current => Math.max(current - 1, 0))
  }

  async function handleFinish() {
    if (!validateIncomeStep() || !validateAccountsStep() || !validateBillsStep()) return
    setSaving(true)
    try {
      await fsCompleteOnboarding(user.uid, {
        profile: {
          salary: salaryAmount,
          paySchedule: form.paySchedule,
          lastPayday: normalizeDate(form.lastPayday) || '',
          currency: form.currency,
        },
        income: seededIncome,
        expenses: seededExpenses,
        accounts: preparedAccounts,
        bills: preparedBills,
      })
      setSaving(false)
      onDone()
      return
    } catch (error) {
      console.error(error)
      alert('We could not finish setup right now. Please try again.')
    }
    setSaving(false)
  }

  return (
    <div className={styles.screen}>
      {notice && <div className={styles.notice}>{notice}</div>}
      <div className={styles.shell}>
        <aside className={styles.sideRail}>
          <div className={styles.brandBlock}>
            <div className={styles.logo}>Takda</div>
            <div className={styles.sideKicker}>First-time setup</div>
            <div className={styles.sideTitle}>Set up a month you can trust.</div>
            <div className={styles.sideSub}>
              A few real numbers here make your calendar, balances, and forecast useful right away.
            </div>
          </div>

          <div className={styles.progressCard}>
            <div className={styles.progressHeader}>
              <div>
                <div className={styles.progressLabel}>Setup progress</div>
                <div className={styles.progressValue}>{step === 0 ? 'Introduction' : `Step ${step} of 4`}</div>
              </div>
              <div className={styles.progressPct}>{progressPercent}%</div>
            </div>
            <div className={styles.progressBar}>
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <div className={styles.progressList}>
              {STEP_DETAILS.map((item, index) => (
                <div
                  key={item.label}
                  className={`${styles.progressItem} ${index === step ? styles.progressItemActive : ''} ${index < step ? styles.progressItemDone : ''}`}
                >
                  <div className={styles.progressIndex}>{index + 1}</div>
                  <div className={styles.progressCopy}>
                    <div className={styles.progressStep}>{item.label}</div>
                    <div className={styles.progressStepSub}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.liveCard}>
            <div className={styles.liveKicker}>Live setup preview</div>
            <div className={styles.liveValue}>{fmt(projectedMonthEnd, symbol)}</div>
            <div className={styles.liveSub}>
              A first month-end estimate based on what you have entered so far.
            </div>
            <div className={styles.liveMetrics}>
              <div className={styles.liveMetric}>
                <div className={styles.liveMetricLabel}>Per pay</div>
                <div className={styles.liveMetricValue}>{salaryAmount ? fmt(perPayAmount, symbol) : 'Not set'}</div>
              </div>
              <div className={styles.liveMetric}>
                <div className={styles.liveMetricLabel}>Starting balance</div>
                <div className={styles.liveMetricValue}>{fmt(startingBalance, symbol)}</div>
              </div>
              <div className={styles.liveMetric}>
                <div className={styles.liveMetricLabel}>Bills / month</div>
                <div className={styles.liveMetricValue}>{fmt(fixedBillsEstimate, symbol)}</div>
              </div>
              <div className={styles.liveMetric}>
                <div className={styles.liveMetricLabel}>Accounts added</div>
                <div className={styles.liveMetricValue}>{preparedAccounts.length}</div>
              </div>
            </div>
          </div>

          <div className={styles.tipCard}>
            <div className={styles.tipTitle}>This is a starting point</div>
            <div className={styles.tipText}>
              You can change all of this later. The goal is to leave setup with a usable forecast, not a perfect ledger.
            </div>
          </div>
        </aside>

        <div className={styles.card}>
          {step === 0 && (
            <div className={`${styles.stepWrap} ${styles.stepWrapWelcome}`}>
              <div className={styles.kicker}>Before you start</div>
              <div className={styles.stepTitle}>Let’s set up your real starting point, {name}.</div>
              <div className={styles.stepSub}>
                We’ll use your balances, recurring income, and bills to give Takda a useful first month instead of an empty profile.
              </div>

              <div className={styles.welcomeStats}>
                <div className={styles.welcomeStat}>
                  <span>Monthly salary</span>
                  <strong>{salaryAmount ? fmt(salaryAmount, symbol) : 'Add it in step 1'}</strong>
                </div>
                <div className={styles.welcomeStat}>
                  <span>Current balances</span>
                  <strong>{preparedAccounts.length ? fmt(startingBalance, symbol) : 'Add accounts in step 2'}</strong>
                </div>
                <div className={styles.welcomeStat}>
                  <span>Recurring bills</span>
                  <strong>{preparedBills.length ? fmt(fixedBillsEstimate, symbol) : 'Add bills in step 3'}</strong>
                </div>
              </div>

              <div className={styles.featureList}>
                <div className={styles.feature}><span className={styles.featureIcon}>💼</span><span>Add salary and pay rhythm so future months forecast correctly.</span></div>
                <div className={styles.feature}><span className={styles.featureIcon}>🏦</span><span>Add the accounts you already use and the money in them today.</span></div>
                <div className={styles.feature}><span className={styles.featureIcon}>🧾</span><span>Add recurring bills now so month-end stays useful from day one.</span></div>
              </div>

              <div className={styles.actionBar}>
                <button className={styles.btnNext} onClick={goNext}>Start setup →</button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className={styles.stepWrap}>
              <div className={styles.kicker}>Step 1 of 4</div>
              <div className={styles.stepTitle}>Income and currency</div>
              <div className={styles.stepSub}>Start with the numbers that shape every forecast: your income, when it lands, and which currency Takda should use everywhere.</div>

              <div className={styles.sectionCard}>
                <div className={styles.sectionTitle}>Currency</div>
                <div className={styles.currencyGrid}>
                  {CURRENCIES.map(currency => (
                    <button
                      key={currency.code}
                      type="button"
                      className={`${styles.currencyBtn} ${form.currency === currency.code ? styles.currencyBtnActive : ''}`}
                      onClick={() => set('currency', currency.code)}
                    >
                      <span className={styles.currencySymbol}>{currency.symbol}</span>
                      <span className={styles.currencyCode}>{currency.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Monthly salary</label>
                  <input type="number" min="0" placeholder="e.g. 50,000" value={form.salary} onChange={event => set('salary', event.target.value)} autoFocus />
                </div>
                <div className={styles.inputGroup}>
                  <label>Pay schedule</label>
                  <select value={form.paySchedule} onChange={event => setSchedule(event.target.value)}>
                    {PAY_SCHEDULES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Latest payday</label>
                <div className={styles.dateFieldWrap}>
                  <div className={`${styles.inputControl} ${styles.dateFieldDisplay}`}>
                    {formatDisplayDate(form.lastPayday)}
                  </div>
                  <input
                    type="date"
                    className={`${styles.inputControl} ${styles.dateFieldNative}`}
                    value={form.lastPayday}
                    aria-label="Latest payday"
                    onChange={event => set('lastPayday', event.target.value)}
                  />
                </div>
                <div className={styles.helper}>
                  {form.paySchedule === 'semi-monthly'
                    ? 'For semi-monthly pay, Takda uses the 1st and 15th as the recurring anchor.'
                    : 'Takda uses this date as the anchor for your recurring salary.'}
                </div>
              </div>

              <div className={styles.insightCard}>
                <div className={styles.insightLabel}>Per-pay estimate</div>
                <div className={styles.insightValue}>{salaryAmount ? fmt(perPayAmount, symbol) : `${symbol}0.00`}</div>
                <div className={styles.insightSub}>
                  {salaryAmount
                    ? `${PAY_SCHEDULES.find(option => option.value === form.paySchedule)?.label} based on the salary you entered.`
                    : 'Add your salary and pay rhythm to preview each payday amount.'}
                </div>
              </div>

              <div className={styles.actionBar}>
                <button className={styles.btnSkip} onClick={goBack}>← Back</button>
                <button className={styles.btnNext} onClick={goNext}>Continue →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.stepWrap}>
              <div className={styles.kicker}>Step 2 of 4</div>
              <div className={styles.stepTitle}>Accounts and balances</div>
              <div className={styles.stepSub}>Add the accounts you already use. These balances become your starting point for forecasts and net worth.</div>

              <div className={styles.dynamicStack}>
                {form.accounts.map((account, index) => (
                  <div key={account.id} className={styles.dynamicCard}>
                    <div className={styles.dynamicHeader}>
                      <div className={styles.dynamicTitle}>Account {index + 1}</div>
                      <button type="button" className={styles.removeBtn} onClick={() => removeAccountRow(account.id)}>Remove</button>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Account name</label>
                        <input placeholder="e.g. BPI Savings" value={account.name} onChange={event => updateAccountRow(account.id, 'name', event.target.value)} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Type</label>
                        <select value={account.type} onChange={event => updateAccountRow(account.id, 'type', event.target.value)}>
                          {ACCOUNT_TYPES.map(type => <option key={type}>{type}</option>)}
                        </select>
                      </div>
                    </div>
                      <div className={styles.inputGroup}>
                        <label>{account.type === 'Credit Card' ? `Current amount owed (${symbol})` : `Current balance (${symbol})`}</label>
                        <input type="number" min="0" placeholder="0.00" value={account.balance} onChange={event => updateAccountRow(account.id, 'balance', event.target.value)} />
                      </div>
                  </div>
                ))}
              </div>

              <button type="button" className={styles.addRowBtn} onClick={addAccountRow}>+ Add another account</button>

              <div className={styles.insightCard}>
                <div className={styles.insightLabel}>Starting balance</div>
                <div className={styles.insightValue}>{fmt(startingBalance, symbol)}</div>
                <div className={styles.insightSub}>
                  {preparedAccounts.length
                    ? `${preparedAccounts.length} account${preparedAccounts.length === 1 ? '' : 's'} will seed your opening balance.`
                    : 'You can skip this for now, but forecasts will start from zero until you add accounts.'}
                </div>
              </div>

              <div className={styles.actionBar}>
                <button className={styles.btnSkip} onClick={goBack}>← Back</button>
                <button className={styles.btnNext} onClick={goNext}>Continue →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.stepWrap}>
              <div className={styles.kicker}>Step 3 of 4</div>
              <div className={styles.stepTitle}>Recurring bills</div>
              <div className={styles.stepSub}>Add the recurring bills that shape each month. One-off charges can wait until later.</div>

              <div className={styles.dynamicStack}>
                {form.bills.map((bill, index) => (
                  <div key={bill.id} className={styles.dynamicCard}>
                    <div className={styles.dynamicHeader}>
                      <div className={styles.dynamicTitle}>Bill {index + 1}</div>
                      <button type="button" className={styles.removeBtn} onClick={() => removeBillRow(bill.id)}>Remove</button>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Bill name</label>
                        <input placeholder="e.g. Rent" value={bill.name} onChange={event => updateBillRow(bill.id, 'name', event.target.value)} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Category</label>
                        <select value={bill.cat} onChange={event => updateBillRow(bill.id, 'cat', event.target.value)}>
                          {BILL_CATEGORIES.map(category => <option key={category}>{category}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Amount ({symbol})</label>
                        <input type="number" min="0" placeholder="0.00" value={bill.amount} onChange={event => updateBillRow(bill.id, 'amount', event.target.value)} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Due day</label>
                        <input type="number" min={1} max={31} placeholder="1-31" value={bill.due} onChange={event => updateBillRow(bill.id, 'due', event.target.value)} />
                      </div>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Frequency</label>
                      <select value={bill.freq} onChange={event => updateBillRow(bill.id, 'freq', event.target.value)}>
                        {BILL_FREQS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className={styles.addRowBtn} onClick={addBillRow}>+ Add another bill</button>

              <div className={styles.insightCard}>
                <div className={styles.insightLabel}>Estimated fixed bills</div>
                <div className={styles.insightValue}>{fmt(fixedBillsEstimate, symbol)}</div>
                <div className={styles.insightSub}>
                  {preparedBills.length
                    ? 'This is the monthly equivalent of the recurring bills you entered.'
                    : 'No recurring bills yet. You can add them later from the Bills section.'}
                </div>
              </div>

              <div className={styles.actionBar}>
                <button className={styles.btnSkip} onClick={goBack}>← Back</button>
                <button className={styles.btnNext} onClick={goNext}>Review →</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className={styles.stepWrap}>
              <div className={styles.kicker}>Step 4 of 4</div>
              <div className={styles.stepTitle}>Review your baseline</div>
              <div className={styles.stepSub}>This is what Takda will save to build your first usable forecast. You can refine any of it later.</div>

              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryTitle}>Income setup</div>
                  <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                      <span>Currency</span>
                      <span>{curr?.symbol} {curr?.code}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Monthly salary</span>
                      <span>{fmt(salaryAmount, symbol)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Pay schedule</span>
                      <span>{PAY_SCHEDULES.find(option => option.value === form.paySchedule)?.label}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Latest payday</span>
                      <span>{normalizeDate(form.lastPayday) || 'Not set'}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.summaryTitle}>Financial baseline</div>
                  <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                      <span>Accounts</span>
                      <span>{preparedAccounts.length}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Starting balance</span>
                      <span>{fmt(startingBalance, symbol)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Recurring bills</span>
                      <span>{preparedBills.length}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Fixed bills / month</span>
                      <span>{fmt(fixedBillsEstimate, symbol)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.insightCard}>
                <div className={styles.insightLabel}>Baseline month-end estimate</div>
                <div className={styles.insightValue}>{fmt(projectedMonthEnd, symbol)}</div>
                <div className={styles.insightSub}>
                  Based on your starting balances, salary, and recurring bills. Real transactions will make this more accurate over time.
                </div>
              </div>

              <div className={styles.seedList}>
                <div className={styles.seedItem}>Takda will create {seededIncome.length ? 'a recurring salary entry' : 'no salary entry yet'}.</div>
                <div className={styles.seedItem}>Takda will create {seededExpenses.length} recurring forecast expense{seededExpenses.length === 1 ? '' : 's'} from your bills.</div>
                <div className={styles.seedItem}>Takda will save {preparedAccounts.length} opening account{preparedAccounts.length === 1 ? '' : 's'}.</div>
                <div className={styles.seedItem}>Takda will save {preparedBills.length} recurring bill{preparedBills.length === 1 ? '' : 's'}.</div>
              </div>

              <div className={styles.actionBar}>
                <button className={styles.btnSkip} onClick={goBack}>← Back</button>
                <button className={styles.btnFinish} onClick={handleFinish} disabled={saving}>
                  {saving ? 'Setting up...' : 'Start using Takda →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
