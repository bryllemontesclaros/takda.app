import { useMemo, useState } from 'react'
import { getCurrentBalance } from '../lib/finance'
import { fsCompleteOnboarding } from '../lib/firestore'
import { notifyApp } from '../lib/appFeedback'
import { findBillPresetByLabel, getBillPresetByKey, getBillPresetGroups, getTransactionSubcategories } from '../lib/transactionOptions'
import { CURRENCIES, RECUR_OPTIONS, fmt, normalizeDate } from '../lib/utils'
import styles from './Onboarding.module.css'

const STEPS = ['welcome', 'currency', 'accounts', 'bills', 'review']
const STEP_DETAILS = [
  { label: 'Intro', desc: 'What Buhay will set up' },
  { label: 'Currency', desc: 'Money format across the app' },
  { label: 'Accounts', desc: 'Opening balances across your accounts' },
  { label: 'Bills', desc: 'Recurring monthly commitments' },
  { label: 'Review', desc: 'Save your baseline and begin' },
]
const ACCOUNT_TYPES = ['Cash', 'Bank', 'E-wallet', 'Credit Card', 'Investment', 'Other']
const ACCOUNT_COLORS = ['#22d87a', '#6eb5ff', '#ffb347', '#ff5370', '#b48eff', '#2dd4bf', '#f472b6', '#9090b0']
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

function createAccountRow() {
  return { id: createId('account'), name: '', type: 'Cash', balance: '' }
}

function createBillRow() {
  return {
    id: createId('bill'),
    name: '',
    amount: '',
    due: '',
    cat: 'Bills',
    subcat: getTransactionSubcategories('expense', 'Bills')[0],
    presetKey: '',
    freq: 'monthly',
    accountId: '',
  }
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

function getMonthlyEquivalent(amount, freq = 'monthly') {
  const numericAmount = Number(amount) || 0
  if (!numericAmount) return 0
  switch (freq) {
    case 'weekly': return roundMoney((numericAmount * 52) / 12)
    case 'bi-weekly': return roundMoney((numericAmount * 26) / 12)
    case 'tri-weekly': return roundMoney((numericAmount * (365 / 21)) / 12)
    case 'quad-weekly': return roundMoney((numericAmount * (365 / 28)) / 12)
    case 'semi-monthly': return roundMoney((numericAmount * 24) / 12)
    case 'monthly':
    default:
      return numericAmount
  }
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
    currency: 'PHP',
    accounts: [createAccountRow()],
    bills: [createBillRow()],
  })
  const [saving, setSaving] = useState(false)

  function set(key, value) {
    setForm(current => ({ ...current, [key]: value }))
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

  function updateBillName(id, value) {
    const matchedPreset = findBillPresetByLabel(value)
    setForm(current => ({
      ...current,
      bills: current.bills.map(row => {
        if (row.id !== id) return row
        if (!matchedPreset || matchedPreset.isCustom) {
          return { ...row, name: value, presetKey: '' }
        }
        return {
          ...row,
          name: value,
          cat: 'Bills',
          subcat: matchedPreset.subcat,
          presetKey: matchedPreset.key,
        }
      }),
    }))
  }

  function applyBillPreset(id, preset) {
    setForm(current => ({
      ...current,
      bills: current.bills.map(row => {
        if (row.id !== id) return row
        if (!preset || preset.isCustom) return { ...row, presetKey: '', cat: 'Bills' }
        return {
          ...row,
          name: preset.desc || preset.label,
          cat: 'Bills',
          subcat: preset.subcat,
          presetKey: preset.key,
        }
      }),
    }))
  }

  function updateBillSubcategory(id, value) {
    setForm(current => ({
      ...current,
      bills: current.bills.map(row => row.id === id ? { ...row, cat: 'Bills', subcat: value, presetKey: '' } : row),
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
  const billPresetGroups = useMemo(() => getBillPresetGroups(), [])
  const billSubcategories = useMemo(() => getTransactionSubcategories('expense', 'Bills'), [])

  const preparedAccounts = useMemo(() => form.accounts
    .filter(hasAccountContent)
    .map((row, index) => ({
      _id: row.id,
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
      cat: 'Bills',
      subcat: row.subcat || getTransactionSubcategories('expense', 'Bills')[0],
      presetKey: row.presetKey || '',
      freq: row.freq || 'monthly',
      paid: false,
      type: 'bill',
      accountId: row.accountId || '',
    })), [form.bills])

  const seededExpenses = useMemo(() => preparedBills.map(bill => ({
    desc: bill.name,
    amount: bill.amount,
    date: getLatestDueAnchorDate(bill.due),
    cat: bill.cat || 'Bills',
    subcat: bill.subcat || '',
    presetKey: bill.presetKey || '',
    recur: bill.freq,
    type: 'expense',
    accountId: bill.accountId || '',
    accountBalanceLinked: false,
    seedSource: 'onboarding',
    gamificationExcluded: true,
  })), [preparedBills])

  const startingBalance = getCurrentBalance(preparedAccounts)
  const fixedBillsEstimate = preparedBills.reduce((sum, bill) => sum + getMonthlyEquivalent(bill.amount, bill.freq), 0)
  const progressPercent = Math.round((step / (STEPS.length - 1)) * 100)

  function validateAccountsStep() {
    for (const row of form.accounts.filter(hasAccountContent)) {
      if (!hasText(row.name)) {
        notifyApp({ title: 'Account needs a name', message: 'Each account row with a balance also needs a name.', tone: 'warning' })
        return false
      }
      if (!hasValue(row.balance) || Number.isNaN(Number(row.balance)) || Number(row.balance) < 0) {
        notifyApp({ title: 'Check account balance', message: 'Each account needs a valid balance of zero or more.', tone: 'warning' })
        return false
      }
    }
    return true
  }

  function validateBillsStep() {
    for (const row of form.bills.filter(hasBillContent)) {
      if (!hasText(row.name) || !hasValue(row.amount) || !hasValue(row.due)) {
        notifyApp({ title: 'Bill needs details', message: 'Each bill needs a name, amount, and due day.', tone: 'warning' })
        return false
      }
      if (Number.isNaN(Number(row.amount)) || Number(row.amount) <= 0) {
        notifyApp({ title: 'Check bill amount', message: 'Bill amounts must be greater than zero.', tone: 'warning' })
        return false
      }
      if (Number.isNaN(Number(row.due)) || Number(row.due) < 1 || Number(row.due) > 31) {
        notifyApp({ title: 'Check due day', message: 'Bill due day must be between 1 and 31.', tone: 'warning' })
        return false
      }
    }
    return true
  }

  function goNext() {
    if (step === 2 && !validateAccountsStep()) return
    if (step === 3 && !validateBillsStep()) return
    setStep(current => Math.min(current + 1, STEPS.length - 1))
  }

  function goBack() {
    setStep(current => Math.max(current - 1, 0))
  }

  function skipAccountsStep() {
    setForm(current => ({ ...current, accounts: [createAccountRow()] }))
    setStep(3)
  }

  function skipBillsStep() {
    setForm(current => ({ ...current, bills: [createBillRow()] }))
    setStep(4)
  }

  async function handleFinish() {
    if (!validateAccountsStep() || !validateBillsStep()) return
    setSaving(true)
    try {
      await fsCompleteOnboarding(user.uid, {
        profile: {
          currency: form.currency,
        },
        income: [],
        expenses: seededExpenses,
        accounts: preparedAccounts,
        bills: preparedBills,
      })
      setSaving(false)
      onDone()
      return
    } catch (error) {
      console.error(error)
      notifyApp({ title: 'Setup not saved', message: 'We could not finish setup right now. Please try again.', tone: 'error' })
    }
    setSaving(false)
  }

  return (
    <div className={styles.screen}>
      {notice && <div className={styles.notice}>{notice}</div>}
      <div className={styles.shell}>
        <aside className={styles.sideRail}>
          <div className={styles.brandBlock}>
            <div className={styles.logo}>Buhay</div>
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
            <div className={styles.liveValue}>{fmt(startingBalance, symbol)}</div>
            <div className={styles.liveSub}>
              The real balance Takda Finance will start from based on the accounts you have entered so far.
            </div>
            <div className={styles.liveMetrics}>
              <div className={styles.liveMetric}>
                <div className={styles.liveMetricLabel}>Currency</div>
                <div className={styles.liveMetricValue}>{curr?.code || 'PHP'}</div>
              </div>
              <div className={styles.liveMetric}>
                <div className={styles.liveMetricLabel}>Bills / month</div>
                <div className={styles.liveMetricValue}>{fmt(fixedBillsEstimate, symbol)}</div>
              </div>
              <div className={styles.liveMetric}>
                <div className={styles.liveMetricLabel}>Accounts added</div>
                <div className={styles.liveMetricValue}>{preparedAccounts.length}</div>
              </div>
              <div className={styles.liveMetric}>
                <div className={styles.liveMetricLabel}>Bills added</div>
                <div className={styles.liveMetricValue}>{preparedBills.length}</div>
              </div>
            </div>
          </div>

          <div className={styles.tipCard}>
            <div className={styles.tipTitle}>This is a starting point</div>
            <div className={styles.tipText}>
              You can skip accounts or bills for now. The goal is a usable first forecast, not a perfect ledger.
            </div>
          </div>
        </aside>

        <div className={styles.card}>
          <div className={styles.mobileSetupBar}>
            <div className={styles.mobileSetupTop}>
              <div>
                <div className={styles.mobileSetupLabel}>Setup progress</div>
                <div className={styles.mobileSetupValue}>{step === 0 ? 'Introduction' : `Step ${step} of 4`}</div>
              </div>
              <div className={styles.mobileSetupPct}>{progressPercent}%</div>
            </div>
            <div className={styles.mobileSetupTrack}>
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          {step === 0 && (
            <div className={`${styles.stepWrap} ${styles.stepWrapWelcome}`}>
              <div className={styles.kicker}>Before you start</div>
              <div className={styles.stepTitle}>Let’s set up your real starting point, {name}.</div>
              <div className={styles.stepSub}>
                Currency is the only required setup. Accounts and bills are optional, but they make your first forecast and reminders more useful.
              </div>
              <div className={styles.setupPromise}>
                <div className={styles.setupPromiseItem}>
                  <strong>Optional where needed</strong>
                  <span>Skip accounts or bills if you do not have the numbers yet. You can add them later.</span>
                </div>
                <div className={styles.setupPromiseItem}>
                  <strong>No hidden subtraction</strong>
                  <span>Account balances start the app. Bills are saved separately for the calendar.</span>
                </div>
                <div className={styles.setupPromiseItem}>
                  <strong>Editable later</strong>
                  <span>Settings, Accounts, Bills, and Budget can refine everything after setup.</span>
                </div>
              </div>

              <div className={styles.welcomeStats}>
                <div className={styles.welcomeStat}>
                  <span>Currency</span>
                  <strong>{curr?.symbol} {curr?.code}</strong>
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
                <div className={styles.feature}><span className={styles.featureIcon}>💱</span><span>Choose the currency Buhay should use across balances, entries, and reports.</span></div>
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
              <div className={styles.stepTitle}>Currency</div>
              <div className={styles.stepSub}>Choose the money format Buhay should use in the Takda finance space. You can still log any income or expense manually later.</div>

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

              <div className={styles.insightCard}>
                <div className={styles.insightLabel}>Money format</div>
                <div className={styles.insightValue}>{curr?.symbol} {curr?.code}</div>
                <div className={styles.insightSub}>
                  All balances, goals, budgets, and charts will use this currency by default.
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
              <div className={styles.stepHint}>
                Not ready? Skip this step and Takda Finance will start from zero until you add accounts later.
              </div>

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
                        <div className={styles.helper}>
                          {account.type === 'Credit Card'
                            ? 'Enter what you currently owe. Takda Finance treats credit card balances as debt in your total.'
                            : 'Enter the money available in this account today. This becomes part of your starting balance.'}
                        </div>
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
                <button className={styles.btnSkip} onClick={skipAccountsStep}>Skip accounts</button>
                <button className={styles.btnNext} onClick={goNext}>Continue →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.stepWrap}>
              <div className={styles.kicker}>Step 3 of 4</div>
              <div className={styles.stepTitle}>Recurring bills</div>
              <div className={styles.stepSub}>Add the recurring bills that shape each month. One-off charges can wait until later.</div>
              <div className={styles.stepHint}>
                Bills are optional here. Add accounts first if you want to choose a default pay-from account for each bill.
              </div>

              <div className={styles.dynamicStack}>
                {form.bills.map((bill, index) => (
                  <div key={bill.id} className={styles.dynamicCard}>
                    <div className={styles.dynamicHeader}>
                      <div className={styles.dynamicTitle}>Bill {index + 1}</div>
                      <button type="button" className={styles.removeBtn} onClick={() => removeBillRow(bill.id)}>Remove</button>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Preset</label>
                        <select
                          value={bill.presetKey || 'other-custom'}
                          onChange={event => {
                            const preset = getBillPresetByKey(event.target.value)
                            if (!preset || preset.isCustom) {
                              applyBillPreset(bill.id, null)
                              return
                            }
                            applyBillPreset(bill.id, preset)
                          }}
                        >
                          <option value="other-custom">Custom bill</option>
                          {billPresetGroups.map(group => (
                            <optgroup key={group.label} label={group.label}>
                              {group.items.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Bill name</label>
                        <input placeholder="e.g. Meralco" value={bill.name} onChange={event => updateBillName(bill.id, event.target.value)} />
                      </div>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Bill type</label>
                        <select value={bill.subcat} onChange={event => updateBillSubcategory(bill.id, event.target.value)}>
                          {billSubcategories.map(category => <option key={category}>{category}</option>)}
                        </select>
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Amount ({symbol})</label>
                        <input type="number" min="0" placeholder="0.00" value={bill.amount} onChange={event => updateBillRow(bill.id, 'amount', event.target.value)} />
                      </div>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Due day</label>
                        <input type="number" min={1} max={31} placeholder="1-31" value={bill.due} onChange={event => updateBillRow(bill.id, 'due', event.target.value)} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Frequency</label>
                        <select value={bill.freq} onChange={event => updateBillRow(bill.id, 'freq', event.target.value)}>
                          {BILL_FREQS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <div className={styles.helper}>
                          {form.accounts.filter(hasAccountContent).filter(row => hasText(row.name)).length
                            ? 'This is only the default. You can still change the account when marking the bill paid.'
                            : 'No accounts yet. Skip this or go back to add an account first.'}
                        </div>
                      </div>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Pay from account (optional)</label>
                        <select
                          value={bill.accountId}
                          onChange={event => updateBillRow(bill.id, 'accountId', event.target.value)}
                        >
                          <option value="">Choose when paying</option>
                          {form.accounts
                            .filter(hasAccountContent)
                            .filter(row => hasText(row.name))
                            .map(row => (
                              <option key={row.id} value={row.id}>
                                {row.name} · {row.type}
                              </option>
                            ))}
                        </select>
                      </div>
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
                <button className={styles.btnSkip} onClick={skipBillsStep}>Skip bills</button>
                <button className={styles.btnNext} onClick={goNext}>Review →</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className={styles.stepWrap}>
              <div className={styles.kicker}>Step 4 of 4</div>
              <div className={styles.stepTitle}>Review your baseline</div>
              <div className={styles.stepSub}>This is what Buhay will save to build your first usable finance forecast. You can refine any of it later.</div>

              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryTitle}>App setup</div>
                  <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                      <span>Currency</span>
                      <span>{curr?.symbol} {curr?.code}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>What gets saved</span>
                      <span>{preparedAccounts.length} account{preparedAccounts.length === 1 ? '' : 's'}, {preparedBills.length} bill{preparedBills.length === 1 ? '' : 's'}</span>
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
                <div className={styles.insightLabel}>Starting balance</div>
                <div className={styles.insightValue}>{fmt(startingBalance, symbol)}</div>
                <div className={styles.insightSub}>
                  Takda Finance starts from your saved account balances. Recurring bills are saved separately and will shape your calendar after setup.
                </div>
              </div>

              <div className={styles.finalSaveCard}>
                <div>
                  <div className={styles.finalSaveLabel}>Ready to save</div>
                  <div className={styles.finalSaveTitle}>This creates your baseline, not a permanent decision.</div>
                  <div className={styles.finalSaveText}>
                    Buhay will open with your selected currency, account balances, and recurring bill entries. Paying a bill later will create a real expense and can update the selected account.
                  </div>
                </div>
                <div className={styles.finalSaveBadge}>{preparedAccounts.length + preparedBills.length} setup item{preparedAccounts.length + preparedBills.length === 1 ? '' : 's'}</div>
              </div>

              <div className={styles.seedList}>
                <div className={styles.seedItem}>Buhay will create {seededExpenses.length} recurring forecast expense{seededExpenses.length === 1 ? '' : 's'} from your bills.</div>
                <div className={styles.seedItem}>Buhay will save {preparedAccounts.length} opening account{preparedAccounts.length === 1 ? '' : 's'}.</div>
                <div className={styles.seedItem}>Buhay will save {preparedBills.length} recurring bill{preparedBills.length === 1 ? '' : 's'}.</div>
              </div>

              <div className={styles.actionBar}>
                <button className={styles.btnSkip} onClick={goBack}>← Back</button>
                <button className={styles.btnFinish} onClick={handleFinish} disabled={saving}>
                  {saving ? 'Setting up...' : 'Start using Buhay →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
