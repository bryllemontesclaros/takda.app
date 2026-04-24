import { useMemo, useState } from 'react'
import { getBillPeriodKey } from '../lib/bills'
import { getCurrentBalance } from '../lib/finance'
import { fsCompleteOnboarding } from '../lib/firestore'
import { notifyApp } from '../lib/appFeedback'
import { findBillPresetByLabel, getBillPresetByKey, getBillPresetGroups, getTransactionSubcategories } from '../lib/transactionOptions'
import { CURRENCIES, RECUR_OPTIONS, fmt, normalizeDate } from '../lib/utils'
import styles from './Onboarding.module.css'

const STEPS = ['welcome', 'spaces', 'currency', 'accounts', 'bills', 'quickstart', 'review']
const STEP_DETAILS = [
  { label: 'Intro', desc: 'Meet the three spaces' },
  { label: 'Spaces', desc: 'Choose where to start' },
  { label: 'Currency', desc: 'Money format across the app' },
  { label: 'Accounts', desc: 'Opening balances across your accounts' },
  { label: 'Bills', desc: 'Recurring monthly commitments' },
  { label: 'Quick starts', desc: 'Optional Lakas and Tala defaults' },
  { label: 'Review', desc: 'Save your baseline and begin' },
]
const SPACE_OPTIONS = [
  {
    id: 'takda',
    label: 'Takda',
    meta: 'Finance',
    icon: '💸',
    tone: 'takda',
    title: 'Start with money clarity',
    desc: 'Set currency, accounts, balances, bills, and your first useful calendar forecast.',
    recommended: true,
  },
  {
    id: 'lakas',
    label: 'Lakas',
    meta: 'Fitness',
    icon: '🏋️',
    tone: 'lakas',
    title: 'Start with training rhythm',
    desc: 'Prepare workout targets, routines, meals, body progress, habits, and reminders.',
  },
  {
    id: 'tala',
    label: 'Tala',
    meta: 'Mind',
    icon: '🌙',
    tone: 'tala',
    title: 'Start with daily reflection',
    desc: 'Prepare mood check-ins, journal privacy, tasks, life goals, and gentle reminders.',
  },
  {
    id: 'explore',
    label: 'Explore first',
    meta: 'No pressure',
    icon: '✨',
    tone: 'buhay',
    title: 'Enter with only basics',
    desc: 'Choose currency now, skip detailed setup, and add real data later inside each space.',
  },
]
const ACCOUNT_TYPES = ['Cash', 'Bank', 'E-wallet', 'Credit Card', 'Investment', 'Other']
const ACCOUNT_COLORS = ['#22d87a', '#6eb5ff', '#ffb347', '#ff5370', '#b48eff', '#2dd4bf', '#f472b6', '#9090b0']
const BILL_FREQS = RECUR_OPTIONS.filter(option => option.value !== '' && option.value !== 'daily')
const LAKAS_GOAL_OPTIONS = ['Build consistency', 'Lose weight', 'Gain muscle', 'Get stronger', 'Move more']
const LAKAS_EXPERIENCE_OPTIONS = ['Beginner', 'Returning', 'Intermediate']
const LAKAS_PLACE_OPTIONS = ['Gym', 'Home', 'Both']
const LAKAS_EQUIPMENT_OPTIONS = ['None', 'Dumbbells', 'Machines', 'Full gym']
const STARTING_SPACE_COPY = {
  takda: {
    sideTitle: 'Start with money clarity, then add the rest.',
    sideSub: 'Takda works best with currency, accounts, and recurring bills. Lakas and Tala can stay light until you need them.',
    liveSub: 'Takda uses real accounts and bills for the first forecast. Lakas and Tala quick starts save preferences only.',
    tip: 'Buhay will not create fake workouts, meals, journals, moods, or transactions. Real logs begin when you add them yourself.',
    welcomeTitle: name => `Welcome to Buhay, ${name}.`,
    welcomeSub: 'Takda is the strongest starting point if you want a reliable money baseline. You can still skip accounts and bills if you are not ready.',
    recommendedTitle: 'Currency now. Accounts and bills if ready. Lakas and Tala later.',
    recommendedSteps: ['1. Pick currency', '2. Add real finance baseline only if you know it', '3. Start logging real life inside the app'],
    stepOneSub: 'Takda is recommended because finance needs baseline data. Lakas and Tala stay available either way.',
    selectedInsight: 'You will continue into currency, accounts, bills, and a finance baseline review.',
    accountsTitle: 'Accounts and balances',
    accountsSub: 'Add the accounts you already use. These balances become your starting point for forecasts and net worth.',
    accountsHint: 'Not ready? Skip this step and Takda Finance will start from zero until you add accounts later.',
    billsTitle: 'Recurring bills',
    billsSub: 'Add the recurring bills that shape each month. One-off charges can wait until later.',
    billsHint: 'Bills are optional here. Add accounts first if you want to choose a default pay-from account for each bill.',
    quickStartTitle: 'Optional Lakas and Tala quick starts',
    quickStartSub: 'Keep this light. These save preferences only, not fake workouts, meals, journals, or mood logs.',
  },
  lakas: {
    sideTitle: 'Start with Lakas. Keep money setup optional.',
    sideSub: 'Set the basics, turn on a simple fitness rhythm, and skip Takda details unless you want finance ready too.',
    liveSub: 'Lakas quick start saves preferences only. Finance fields are optional support for later Takda use.',
    tip: 'Lakas does not create fake workouts. If you add weight or height, it saves one private body baseline so progress has a real starting point.',
    welcomeTitle: name => `Welcome to Buhay, ${name}. Start with Lakas.`,
    welcomeSub: 'You can begin with fitness without filling out every finance field. Currency is required, then Lakas can start with a light weekly target.',
    recommendedTitle: 'Currency now. Turn on Lakas quick start. Skip finance if it slows you down.',
    recommendedSteps: ['1. Pick currency', '2. Keep accounts and bills optional', '3. Start with beginner-safe Lakas sessions'],
    stepOneSub: 'Choose Lakas if your first goal is workouts, meals, body progress, and habits. Takda and Tala stay available.',
    selectedInsight: 'We will turn on the Lakas quick start later, without forcing a long finance setup.',
    accountsTitle: 'Optional Takda accounts',
    accountsSub: 'You chose Lakas. Add accounts only if you also want finance balances ready today.',
    accountsHint: 'Skip this if you want to get to fitness faster. Takda can add accounts later.',
    billsTitle: 'Optional Takda bills',
    billsSub: 'Recurring bills help finance forecasts, but they are not needed to start Lakas.',
    billsHint: 'Skip this if your priority is workouts. You can add bills later from Takda.',
    quickStartTitle: 'Turn on your Lakas quick start',
    quickStartSub: 'Set a simple weekly target and optional private body baseline. No fake workouts are created.',
  },
  tala: {
    sideTitle: 'Start with Tala. Keep setup gentle.',
    sideSub: 'Set the basics, prepare private reflection, and skip detailed finance unless you want Takda ready too.',
    liveSub: 'Tala quick start saves privacy and reminder preferences only. Finance fields are optional support for later Takda use.',
    tip: 'Tala does not create fake moods, journals, or advice. It only gives your first check-in a calm place to land.',
    welcomeTitle: name => `Welcome to Buhay, ${name}. Start with Tala.`,
    welcomeSub: 'You can begin with reflection and life admin without filling out every finance field. Currency is required, then Tala can stay private by default.',
    recommendedTitle: 'Currency now. Turn on Tala quick start. Add finance only when ready.',
    recommendedSteps: ['1. Pick currency', '2. Keep accounts and bills optional', '3. Start with one private check-in'],
    stepOneSub: 'Choose Tala if your first goal is mood, journal, tasks, and life goals. Takda and Lakas stay available.',
    selectedInsight: 'We will turn on the Tala quick start later, without forcing a long finance setup.',
    accountsTitle: 'Optional Takda accounts',
    accountsSub: 'You chose Tala. Add accounts only if you also want finance balances ready today.',
    accountsHint: 'Skip this if you want to get to reflection faster. Takda can add accounts later.',
    billsTitle: 'Optional Takda bills',
    billsSub: 'Recurring bills help finance forecasts, but they are not needed to start Tala.',
    billsHint: 'Skip this if your priority is reflection. You can add bills later from Takda.',
    quickStartTitle: 'Turn on your Tala quick start',
    quickStartSub: 'Set a gentle reminder and privacy default. This saves preferences only, not fake moods or journal entries.',
  },
  explore: {
    sideTitle: 'Explore Buhay with only the basics.',
    sideSub: 'Choose currency, skip detailed setup, and add real records later inside Takda, Lakas, or Tala.',
    liveSub: 'Explore mode keeps setup minimal. Only currency is required before you enter the app.',
    tip: 'Explore mode is safe: no fake finance, fitness, or reflection records are created.',
    welcomeTitle: name => `Welcome to Buhay, ${name}. Explore first.`,
    welcomeSub: 'You can enter with only currency, look around, then add real data later when a space feels useful.',
    recommendedTitle: 'Currency now. Everything else can wait.',
    recommendedSteps: ['1. Pick currency', '2. Skip optional setup', '3. Explore the three spaces'],
    stepOneSub: 'Choose Explore first if you want to see the app before setting up finance, fitness, or reflection.',
    selectedInsight: 'You will choose currency, skip detailed setup if you want, and enter Buhay quickly.',
    accountsTitle: 'Optional accounts',
    accountsSub: 'Add accounts only if you want a finance baseline before exploring.',
    accountsHint: 'Skip this to enter Buhay faster. Accounts can be added later.',
    billsTitle: 'Optional bills',
    billsSub: 'Add recurring bills only if you want Takda planning ready before exploring.',
    billsHint: 'Skip this to enter Buhay faster. Bills can be added later.',
    quickStartTitle: 'Optional quick starts',
    quickStartSub: 'You can keep Lakas and Tala off for now and turn them on later from each space.',
  },
}

function getStartingSpaceCopy(spaceId) {
  return STARTING_SPACE_COPY[spaceId] || STARTING_SPACE_COPY.takda
}

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

function createQuickStarts() {
  return {
    lakas: {
      enabled: false,
      goal: 'Build consistency',
      experienceLevel: 'Beginner',
      workoutPlace: 'Gym',
      equipment: 'Full gym',
      workoutsPerWeek: '3',
      currentWeight: '',
      height: '',
      limitations: '',
      reminderTime: '08:00',
    },
    tala: {
      enabled: false,
      focus: 'Feel calmer',
      reminderTime: '20:30',
      privateByDefault: true,
    },
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

function calculateLakasBmi(weight, height) {
  const numericWeight = Number(weight) || 0
  const numericHeight = Number(height) || 0
  if (!numericWeight || !numericHeight) return 0
  const meters = numericHeight / 100
  if (!meters) return 0
  return Math.round((numericWeight / (meters * meters)) * 10) / 10
}

function getLakasBaseline(lakas = {}) {
  const weight = hasValue(lakas.currentWeight) ? roundMoney(lakas.currentWeight) : 0
  const height = hasValue(lakas.height) ? roundMoney(lakas.height) : 0
  return {
    weight,
    height,
    bmi: calculateLakasBmi(weight, height),
    hasBodyBaseline: Boolean(weight || height),
  }
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

function getSeededBillPaidPeriods({ dueDay, frequency = 'monthly', amount = 0, accountId = '' }) {
  const anchorDate = getLatestDueAnchorDate(dueDay)
  if (!anchorDate) return {}

  const periodKey = getBillPeriodKey({ due: Number(dueDay), freq: frequency || 'monthly' }, anchorDate)
  const paidAt = new Date(`${anchorDate}T12:00:00`).getTime()

  return {
    [periodKey]: {
      paidAt,
      amount: roundMoney(amount),
      date: anchorDate,
      dueDate: anchorDate,
      accountId: accountId || '',
      source: 'onboarding-seed',
    },
  }
}

export default function Onboarding({ user, onDone, notice = '' }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    startingSpace: 'takda',
    currency: 'PHP',
    accounts: [createAccountRow()],
    bills: [createBillRow()],
    quickStarts: createQuickStarts(),
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

  function chooseStartingSpace(spaceId) {
    setForm(current => ({
      ...current,
      startingSpace: spaceId,
      quickStarts: {
        ...current.quickStarts,
        lakas: { ...current.quickStarts.lakas, enabled: spaceId === 'explore' ? false : current.quickStarts.lakas.enabled || spaceId === 'lakas' },
        tala: { ...current.quickStarts.tala, enabled: spaceId === 'explore' ? false : current.quickStarts.tala.enabled || spaceId === 'tala' },
      },
    }))
  }

  function toggleQuickStart(spaceKey) {
    setForm(current => ({
      ...current,
      quickStarts: {
        ...current.quickStarts,
        [spaceKey]: {
          ...current.quickStarts[spaceKey],
          enabled: !current.quickStarts[spaceKey].enabled,
        },
      },
    }))
  }

  function updateQuickStart(spaceKey, key, value) {
    setForm(current => ({
      ...current,
      quickStarts: {
        ...current.quickStarts,
        [spaceKey]: {
          ...current.quickStarts[spaceKey],
          [key]: value,
        },
      },
    }))
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
    .map(row => {
      const amount = roundMoney(row.amount)
      const due = Number(row.due)
      const freq = row.freq || 'monthly'
      const accountId = row.accountId || ''

      return {
        name: row.name.trim(),
        amount,
        due,
        cat: 'Bills',
        subcat: row.subcat || getTransactionSubcategories('expense', 'Bills')[0],
        presetKey: row.presetKey || '',
        freq,
        paid: false,
        paidPeriods: getSeededBillPaidPeriods({ dueDay: due, frequency: freq, amount, accountId }),
        type: 'bill',
        accountId,
      }
    }), [form.bills])

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
  const totalSetupSteps = STEPS.length - 1
  const progressValue = step === 0 ? 'Introduction' : `Step ${step} of ${totalSetupSteps}`
  const startingSpace = SPACE_OPTIONS.find(option => option.id === form.startingSpace) || SPACE_OPTIONS[0]
  const startingSpaceCopy = getStartingSpaceCopy(form.startingSpace)
  const quickStartCount = (form.quickStarts.lakas.enabled ? 1 : 0) + (form.quickStarts.tala.enabled ? 1 : 0)
  const lakasBaseline = getLakasBaseline(form.quickStarts.lakas)

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

  function validateQuickStartStep() {
    if (!form.quickStarts.lakas.enabled) return true

    const workoutsPerWeek = Number(form.quickStarts.lakas.workoutsPerWeek)
    if (Number.isNaN(workoutsPerWeek) || workoutsPerWeek < 0 || workoutsPerWeek > 14) {
      notifyApp({ title: 'Check Lakas target', message: 'Workouts per week should be between 0 and 14.', tone: 'warning' })
      return false
    }
    if (hasValue(form.quickStarts.lakas.currentWeight) && (Number.isNaN(Number(form.quickStarts.lakas.currentWeight)) || Number(form.quickStarts.lakas.currentWeight) < 0)) {
      notifyApp({ title: 'Check body baseline', message: 'Weight should be blank or a valid number.', tone: 'warning' })
      return false
    }
    if (hasValue(form.quickStarts.lakas.height) && (Number.isNaN(Number(form.quickStarts.lakas.height)) || Number(form.quickStarts.lakas.height) < 0)) {
      notifyApp({ title: 'Check body baseline', message: 'Height should be blank or a valid number.', tone: 'warning' })
      return false
    }
    return true
  }

  function goNext() {
    if (step === 3 && !validateAccountsStep()) return
    if (step === 4 && !validateBillsStep()) return
    if (step === 5 && !validateQuickStartStep()) return
    setStep(current => Math.min(current + 1, STEPS.length - 1))
  }

  function goBack() {
    setStep(current => Math.max(current - 1, 0))
  }

  function skipAccountsStep() {
    setForm(current => ({ ...current, accounts: [createAccountRow()] }))
    setStep(4)
  }

  function skipBillsStep() {
    setForm(current => ({ ...current, bills: [createBillRow()] }))
    setStep(5)
  }

  async function handleFinish() {
    if (!validateAccountsStep() || !validateBillsStep() || !validateQuickStartStep()) return
    setSaving(true)
    try {
      const lakasBodyLogs = form.quickStarts.lakas.enabled && lakasBaseline.hasBodyBaseline
        ? [{
            date: formatDate(new Date()),
            weight: lakasBaseline.weight,
            height: lakasBaseline.height,
            bmi: lakasBaseline.bmi,
            waist: 0,
            chest: 0,
            hips: 0,
            arm: 0,
            thigh: 0,
            notes: 'Optional Lakas baseline from onboarding.',
            source: 'onboarding-lakas-baseline',
          }]
        : []
      const profilePayload = {
        currency: form.currency,
        preferredSpace: form.startingSpace === 'explore' ? 'takda' : form.startingSpace,
        onboarding: {
          startingSpace: form.startingSpace,
          quickStarts: {
            lakas: {
              enabled: form.quickStarts.lakas.enabled,
              goal: form.quickStarts.lakas.enabled ? form.quickStarts.lakas.goal.trim() || null : null,
              experienceLevel: form.quickStarts.lakas.enabled ? form.quickStarts.lakas.experienceLevel || 'Beginner' : null,
              workoutPlace: form.quickStarts.lakas.enabled ? form.quickStarts.lakas.workoutPlace || 'Gym' : null,
              equipment: form.quickStarts.lakas.enabled ? form.quickStarts.lakas.equipment || 'Full gym' : null,
              workoutsPerWeek: form.quickStarts.lakas.enabled ? Number(form.quickStarts.lakas.workoutsPerWeek) || null : null,
              currentWeight: form.quickStarts.lakas.enabled ? lakasBaseline.weight || null : null,
              height: form.quickStarts.lakas.enabled ? lakasBaseline.height || null : null,
              limitations: form.quickStarts.lakas.enabled ? form.quickStarts.lakas.limitations.trim() || null : null,
              reminderTime: form.quickStarts.lakas.enabled ? form.quickStarts.lakas.reminderTime || null : null,
              bodyBaselineCreated: Boolean(lakasBodyLogs.length),
            },
            tala: {
              enabled: form.quickStarts.tala.enabled,
              focus: form.quickStarts.tala.focus.trim() || null,
              reminderTime: form.quickStarts.tala.reminderTime || null,
              privateByDefault: form.quickStarts.tala.privateByDefault !== false,
            },
          },
        },
      }
      if (form.quickStarts.lakas.enabled) {
        profilePayload.lakasSettings = {
          targets: {
            workoutsPerWeek: Number(form.quickStarts.lakas.workoutsPerWeek) || 3,
          },
          training: {
            experienceLevel: form.quickStarts.lakas.experienceLevel || 'Beginner',
            progressionMode: 'Guided',
          },
          reminders: {
            workoutTime: form.quickStarts.lakas.reminderTime || '08:00',
            weighInDay: 'Monday',
            frequency: 'weekly',
          },
          baseline: {
            goal: form.quickStarts.lakas.goal.trim() || 'Build consistency',
            workoutPlace: form.quickStarts.lakas.workoutPlace || 'Gym',
            equipment: form.quickStarts.lakas.equipment || 'Full gym',
            limitations: form.quickStarts.lakas.limitations.trim(),
            currentWeight: lakasBaseline.weight,
            height: lakasBaseline.height,
            bodyBaselineCreated: Boolean(lakasBodyLogs.length),
          },
        }
      }
      if (form.quickStarts.tala.enabled) {
        profilePayload.talaSettings = {
          reminderTime: form.quickStarts.tala.reminderTime || '20:30',
          privateByDefault: form.quickStarts.tala.privateByDefault !== false,
          promptStyle: 'Gentle',
          showMoodInsights: true,
        }
      }
      await fsCompleteOnboarding(user.uid, {
        profile: profilePayload,
        income: [],
        expenses: seededExpenses,
        accounts: preparedAccounts,
        bills: preparedBills,
        lakasBodyLogs,
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
            <div className={styles.sideTitle}>{startingSpaceCopy.sideTitle}</div>
            <div className={styles.sideSub}>
              {startingSpaceCopy.sideSub}
            </div>
          </div>

          <div className={styles.progressCard}>
            <div className={styles.progressHeader}>
              <div>
                <div className={styles.progressLabel}>Setup progress</div>
                <div className={styles.progressValue}>{progressValue}</div>
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
              {startingSpaceCopy.liveSub}
            </div>
            <div className={styles.liveMetrics}>
              <div className={styles.liveMetric}>
                <div className={styles.liveMetricLabel}>Starting space</div>
                <div className={styles.liveMetricValue}>{startingSpace.label}</div>
              </div>
              <div className={styles.liveMetric}>
                <div className={styles.liveMetricLabel}>Quick starts</div>
                <div className={styles.liveMetricValue}>{quickStartCount}</div>
              </div>
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
              {startingSpaceCopy.tip}
            </div>
          </div>
        </aside>

        <div className={styles.card}>
          <div className={styles.mobileSetupBar}>
            <div className={styles.mobileSetupTop}>
              <div>
                <div className={styles.mobileSetupLabel}>Setup progress</div>
                <div className={styles.mobileSetupValue}>{progressValue}</div>
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
              <div className={styles.stepTitle}>{startingSpaceCopy.welcomeTitle(name)}</div>
              <div className={styles.stepSub}>
                {startingSpaceCopy.welcomeSub}
              </div>
              <div className={styles.recommendedPathCard}>
                <div>
                  <span className={styles.recommendedPathLabel}>Recommended beginner path</span>
                  <strong className={styles.recommendedPathTitle}>{startingSpaceCopy.recommendedTitle}</strong>
                </div>
                <div className={styles.recommendedPathSteps}>
                  {startingSpaceCopy.recommendedSteps.map(stepLabel => <span key={stepLabel}>{stepLabel}</span>)}
                </div>
              </div>
              <div className={styles.setupScopeGrid} aria-label="Setup requirements">
                <div className={styles.setupScopeCard}>
                  <span>Required now</span>
                  <strong>Currency</strong>
                  <p>Buhay only needs your default money format to begin.</p>
                </div>
                <div className={styles.setupScopeCard}>
                  <span>Optional now</span>
                  <strong>Accounts, bills, Lakas, Tala</strong>
                  <p>Add baseline finance data and simple space preferences if you want.</p>
                </div>
                <div className={styles.setupScopeCard}>
                  <span>Never faked</span>
                  <strong>History and progress</strong>
                  <p>No fake workouts, meals, moods, journals, or transactions are created.</p>
                </div>
              </div>
              <div className={styles.spaceGrid}>
                {SPACE_OPTIONS.slice(0, 3).map(option => (
                  <div key={option.id} className={`${styles.spaceCard} ${styles[`spaceCard${option.tone[0].toUpperCase()}${option.tone.slice(1)}`]}`}>
                    <div className={styles.spaceIcon}>{option.icon}</div>
                    <div className={styles.spaceMeta}>{option.meta}</div>
                    <div className={styles.spaceName}>{option.label}</div>
                    <div className={styles.spaceDesc}>{option.desc}</div>
                  </div>
                ))}
              </div>
              <div className={styles.setupPromise}>
                <div className={styles.setupPromiseItem}>
                  <strong>Progressive setup</strong>
                  <span>Only currency is required. Everything else can be skipped and added later.</span>
                </div>
                <div className={styles.setupPromiseItem}>
                  <strong>No fake records</strong>
                  <span>Lakas and Tala quick starts save preferences, not fake history.</span>
                </div>
                <div className={styles.setupPromiseItem}>
                  <strong>Editable later</strong>
                  <span>Each space has settings and tabs for deeper setup when you are ready.</span>
                </div>
              </div>

              <div className={styles.welcomeStats}>
                <div className={styles.welcomeStat}>
                  <span>Currency</span>
                  <strong>{curr?.symbol} {curr?.code}</strong>
                </div>
                <div className={styles.welcomeStat}>
                  <span>Starting space</span>
                  <strong>{startingSpace.label}</strong>
                </div>
                <div className={styles.welcomeStat}>
                  <span>Quick starts</span>
                  <strong>{quickStartCount ? `${quickStartCount} selected` : 'Optional later'}</strong>
                </div>
              </div>

              <div className={styles.featureList}>
                <div className={styles.feature}><span className={styles.featureIcon}>💱</span><span>Choose the currency Buhay should use across balances, goals, and reports.</span></div>
                <div className={styles.feature}><span className={styles.featureIcon}>🏦</span><span>Takda can use accounts and bills for a stronger first forecast.</span></div>
                <div className={styles.feature}><span className={styles.featureIcon}>🧭</span><span>Lakas and Tala can start with tiny preferences instead of long forms.</span></div>
              </div>

              <div className={styles.actionBar}>
                <button className={styles.btnNext} onClick={goNext}>Start setup →</button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className={styles.stepWrap}>
              <div className={styles.kicker}>Step 1 of {totalSetupSteps}</div>
              <div className={styles.stepTitle}>Where do you want to start?</div>
              <div className={styles.stepSub}>{startingSpaceCopy.stepOneSub}</div>

              <div className={styles.choiceGrid}>
                {SPACE_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.choiceCard} ${styles[`choiceCard${option.tone[0].toUpperCase()}${option.tone.slice(1)}`]} ${form.startingSpace === option.id ? styles.choiceCardActive : ''}`}
                    onClick={() => chooseStartingSpace(option.id)}
                  >
                    <span className={styles.choiceTop}>
                      <span className={styles.choiceIcon}>{option.icon}</span>
                      <span className={styles.choiceMeta}>{option.meta}</span>
                      {option.recommended && <span className={styles.choiceBadge}>Recommended</span>}
                    </span>
                    <span className={styles.choiceTitle}>{option.title}</span>
                    <span className={styles.choiceDesc}>{option.desc}</span>
                  </button>
                ))}
              </div>

              <div className={styles.insightCard}>
                <div className={styles.insightLabel}>Selected start</div>
                <div className={styles.insightValue}>{startingSpace.label}</div>
                <div className={styles.insightSub}>
                  {startingSpaceCopy.selectedInsight}
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
              <div className={styles.kicker}>Step 2 of {totalSetupSteps}</div>
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

          {step === 3 && (
            <div className={styles.stepWrap}>
              <div className={styles.kicker}>Step 3 of {totalSetupSteps}</div>
              <div className={styles.stepTitle}>{startingSpaceCopy.accountsTitle}</div>
              <div className={styles.stepSub}>{startingSpaceCopy.accountsSub}</div>
              <div className={styles.stepHint}>
                {startingSpaceCopy.accountsHint}
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

          {step === 4 && (
            <div className={styles.stepWrap}>
              <div className={styles.kicker}>Step 4 of {totalSetupSteps}</div>
              <div className={styles.stepTitle}>{startingSpaceCopy.billsTitle}</div>
              <div className={styles.stepSub}>{startingSpaceCopy.billsSub}</div>
              <div className={styles.stepHint}>
                {startingSpaceCopy.billsHint}
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
                <button className={styles.btnNext} onClick={goNext}>Quick starts →</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className={styles.stepWrap}>
              <div className={styles.kicker}>Step 5 of {totalSetupSteps}</div>
              <div className={styles.stepTitle}>{startingSpaceCopy.quickStartTitle}</div>
              <div className={styles.stepSub}>{startingSpaceCopy.quickStartSub}</div>

              <div className={styles.quickStartGrid}>
                <div className={`${styles.quickStartCard} ${styles.quickStartLakas} ${form.quickStarts.lakas.enabled ? styles.quickStartActive : ''}`}>
                  <div className={styles.quickStartHeader}>
                    <div>
                      <div className={styles.quickStartKicker}>Lakas fitness</div>
                      <div className={styles.quickStartTitle}>Workout rhythm</div>
                    </div>
                    <button type="button" className={styles.toggleBtn} onClick={() => toggleQuickStart('lakas')}>
                      {form.quickStarts.lakas.enabled ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className={styles.quickStartText}>Set beginner-safe defaults and optional private body data so Lakas starts useful without feeling invasive.</div>
                  <div className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                      <label>Fitness goal</label>
                      <select value={form.quickStarts.lakas.goal} onChange={event => updateQuickStart('lakas', 'goal', event.target.value)} disabled={!form.quickStarts.lakas.enabled}>
                        {LAKAS_GOAL_OPTIONS.map(option => <option key={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Experience</label>
                      <select value={form.quickStarts.lakas.experienceLevel} onChange={event => updateQuickStart('lakas', 'experienceLevel', event.target.value)} disabled={!form.quickStarts.lakas.enabled}>
                        {LAKAS_EXPERIENCE_OPTIONS.map(option => <option key={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Workouts / week</label>
                      <input type="number" min="0" max="14" value={form.quickStarts.lakas.workoutsPerWeek} onChange={event => updateQuickStart('lakas', 'workoutsPerWeek', event.target.value)} disabled={!form.quickStarts.lakas.enabled} />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Reminder time</label>
                      <input type="time" value={form.quickStarts.lakas.reminderTime} onChange={event => updateQuickStart('lakas', 'reminderTime', event.target.value)} disabled={!form.quickStarts.lakas.enabled} />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Workout place</label>
                      <select value={form.quickStarts.lakas.workoutPlace} onChange={event => updateQuickStart('lakas', 'workoutPlace', event.target.value)} disabled={!form.quickStarts.lakas.enabled}>
                        {LAKAS_PLACE_OPTIONS.map(option => <option key={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Equipment</label>
                      <select value={form.quickStarts.lakas.equipment} onChange={event => updateQuickStart('lakas', 'equipment', event.target.value)} disabled={!form.quickStarts.lakas.enabled}>
                        {LAKAS_EQUIPMENT_OPTIONS.map(option => <option key={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Current weight (optional)</label>
                      <input type="number" min="0" inputMode="decimal" placeholder="kg" value={form.quickStarts.lakas.currentWeight} onChange={event => updateQuickStart('lakas', 'currentWeight', event.target.value)} disabled={!form.quickStarts.lakas.enabled} />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Height (optional)</label>
                      <input type="number" min="0" inputMode="decimal" placeholder="cm" value={form.quickStarts.lakas.height} onChange={event => updateQuickStart('lakas', 'height', event.target.value)} disabled={!form.quickStarts.lakas.enabled} />
                    </div>
                    <div className={`${styles.inputGroup} ${styles.full}`}>
                      <label>Injuries or limitations (optional)</label>
                      <input value={form.quickStarts.lakas.limitations} onChange={event => updateQuickStart('lakas', 'limitations', event.target.value)} placeholder="Bad knee, shoulder pain, none" disabled={!form.quickStarts.lakas.enabled} />
                      <div className={styles.helper}>Lakas uses this only to keep starter guidance gentler. It is not medical advice.</div>
                    </div>
                  </div>
                  <div className={styles.stepHint}>
                    Weight and height are optional. If added, Lakas saves one private body baseline for trend tracking; it never creates fake workouts.
                  </div>
                </div>

                <div className={`${styles.quickStartCard} ${styles.quickStartTala} ${form.quickStarts.tala.enabled ? styles.quickStartActive : ''}`}>
                  <div className={styles.quickStartHeader}>
                    <div>
                      <div className={styles.quickStartKicker}>Tala mind</div>
                      <div className={styles.quickStartTitle}>Daily check-in defaults</div>
                    </div>
                    <button type="button" className={styles.toggleBtn} onClick={() => toggleQuickStart('tala')}>
                      {form.quickStarts.tala.enabled ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className={styles.quickStartText}>Set the tone for journal privacy and gentle check-in reminders.</div>
                  <div className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                      <label>Main focus</label>
                      <input value={form.quickStarts.tala.focus} onChange={event => updateQuickStart('tala', 'focus', event.target.value)} placeholder="Feel calmer" disabled={!form.quickStarts.tala.enabled} />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Check-in time</label>
                      <input type="time" value={form.quickStarts.tala.reminderTime} onChange={event => updateQuickStart('tala', 'reminderTime', event.target.value)} disabled={!form.quickStarts.tala.enabled} />
                    </div>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Journal privacy default</label>
                    <select value={form.quickStarts.tala.privateByDefault ? 'private' : 'open'} onChange={event => updateQuickStart('tala', 'privateByDefault', event.target.value === 'private')} disabled={!form.quickStarts.tala.enabled}>
                      <option value="private">Private by default</option>
                      <option value="open">Open by default</option>
                    </select>
                    <div className={styles.helper}>This changes Tala settings only. It will not create a journal entry.</div>
                  </div>
                </div>
              </div>

              <div className={styles.actionBar}>
                <button className={styles.btnSkip} onClick={goBack}>← Back</button>
                <button className={styles.btnSkip} onClick={() => {
                  setForm(current => ({ ...current, quickStarts: createQuickStarts() }))
                  setStep(6)
                }}>Skip quick starts</button>
                <button className={styles.btnNext} onClick={goNext}>Review →</button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className={styles.stepWrap}>
              <div className={styles.kicker}>Step 6 of {totalSetupSteps}</div>
              <div className={styles.stepTitle}>Review your starting setup</div>
              <div className={styles.stepSub}>This is what Buhay will save. Currency is required; accounts, bills, Lakas, and Tala preferences are optional and editable later.</div>

              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryTitle}>App setup</div>
                  <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                      <span>Currency</span>
                      <span>{curr?.symbol} {curr?.code}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Starting space</span>
                      <span>{startingSpace.label}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>What gets saved</span>
                      <span>{preparedAccounts.length} account{preparedAccounts.length === 1 ? '' : 's'}, {preparedBills.length} bill{preparedBills.length === 1 ? '' : 's'}, {quickStartCount} quick start{quickStartCount === 1 ? '' : 's'}</span>
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

                <div className={styles.summaryCard}>
                  <div className={styles.summaryTitle}>Lakas quick start</div>
                  <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                      <span>Status</span>
                      <span>{form.quickStarts.lakas.enabled ? 'Prepared' : 'Skipped'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Goal</span>
                      <span>{form.quickStarts.lakas.enabled ? form.quickStarts.lakas.goal || 'Build consistency' : 'Add later'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Experience</span>
                      <span>{form.quickStarts.lakas.enabled ? form.quickStarts.lakas.experienceLevel || 'Beginner' : 'Add later'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Weekly target</span>
                      <span>{form.quickStarts.lakas.enabled ? `${form.quickStarts.lakas.workoutsPerWeek || 3} workouts` : 'Add later'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Training setup</span>
                      <span>{form.quickStarts.lakas.enabled ? `${form.quickStarts.lakas.workoutPlace || 'Gym'} · ${form.quickStarts.lakas.equipment || 'Full gym'}` : 'Add later'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Body baseline</span>
                      <span>{form.quickStarts.lakas.enabled ? (lakasBaseline.hasBodyBaseline ? 'Private baseline saved' : 'Skipped') : 'Add later'}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.summaryTitle}>Tala quick start</div>
                  <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                      <span>Status</span>
                      <span>{form.quickStarts.tala.enabled ? 'Prepared' : 'Skipped'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Focus</span>
                      <span>{form.quickStarts.tala.enabled ? form.quickStarts.tala.focus || 'Feel calmer' : 'Add later'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Privacy</span>
                      <span>{form.quickStarts.tala.enabled ? (form.quickStarts.tala.privateByDefault ? 'Private journal' : 'Open journal') : 'Add later'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.insightCard}>
                <div className={styles.insightLabel}>Takda baseline</div>
                <div className={styles.insightValue}>{fmt(startingBalance, symbol)}</div>
                <div className={styles.insightSub}>
                  {preparedAccounts.length
                    ? 'Takda Finance starts from your saved account balances. Recurring bills are saved separately and shape the calendar after setup.'
                    : 'No accounts yet. Takda can start from zero and you can add balances later when you are ready.'}
                </div>
              </div>

              <div className={styles.finalSaveCard}>
                <div>
                  <div className={styles.finalSaveLabel}>Ready to save</div>
                  <div className={styles.finalSaveTitle}>This creates your baseline, not a permanent decision.</div>
                  <div className={styles.finalSaveText}>
                    Buhay will open with your selected currency, starting space, any account or bill entries you added, and optional Lakas/Tala preferences. Real logs still start when you add them.
                  </div>
                </div>
                <div className={styles.finalSaveBadge}>{preparedAccounts.length + preparedBills.length + quickStartCount} setup item{preparedAccounts.length + preparedBills.length + quickStartCount === 1 ? '' : 's'}</div>
              </div>

              <div className={styles.seedList}>
                <div className={styles.seedItem}>Buhay will create {seededExpenses.length} recurring forecast expense{seededExpenses.length === 1 ? '' : 's'} from your bills.</div>
                <div className={styles.seedItem}>Buhay will save {preparedAccounts.length} opening account{preparedAccounts.length === 1 ? '' : 's'}.</div>
                <div className={styles.seedItem}>Buhay will save {preparedBills.length} recurring bill{preparedBills.length === 1 ? '' : 's'}.</div>
                <div className={styles.seedItem}>Buhay will save {quickStartCount} Lakas/Tala quick-start preference{quickStartCount === 1 ? '' : 's'} and no fake history.</div>
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
