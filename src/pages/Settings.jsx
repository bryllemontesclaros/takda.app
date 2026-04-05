import { useEffect, useRef, useState } from 'react'
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'
import GamificationCard from '../components/GamificationCard'
import PrivacyToggle from '../components/PrivacyToggle'
import { auth } from '../lib/firebase'
import { fsAdd, fsDel, fsDeleteAccountData, fsRestoreBackup, fsSetProfile, fsUpdate } from '../lib/firestore'
import { DEFAULT_NOTIFICATION_PREFS, getNotificationPrefs, requestPushPermission } from '../lib/notifications'
import { generateMonthlyReport } from '../lib/report'
import { CURRENCIES, confirmDelete, displayValue, fmt, maskMoney, PAY_SCHEDULES, today } from '../lib/utils'
import styles from './Page.module.css'
import settStyles from './Settings.module.css'

const VERSION = '1.0.0'

const FEEDBACK_PRESETS = {
  feedback: {
    title: 'Send Feedback',
    prompt: 'Share suggestions or ideas that would make Takda more helpful for you.',
  },
  bug: {
    title: 'Report a Bug',
    prompt: 'Tell us what broke, what you expected, and which screen you were using.',
  },
  rating: {
    title: 'Rate Your Experience',
    prompt: 'How is Takda working for you so far?',
  },
  testimonial: {
    title: 'Share a Testimonial',
    prompt: 'Write a short quote we can feature on the Takda landing page if you consent.',
  },
}

const NOTIFICATION_OPTIONS = [
  {
    key: 'budget',
    title: 'Budget alerts',
    desc: 'Warnings when a category budget is close to or over its limit.',
  },
  {
    key: 'bills',
    title: 'Bill reminders',
    desc: 'Due-soon and overdue bill reminders based on your saved bills.',
  },
  {
    key: 'goals',
    title: 'Goal milestones',
    desc: 'Alerts when savings goals are almost complete or fully reached.',
  },
  {
    key: 'salary',
    title: 'Salary reminders',
    desc: 'Prompts when your expected salary has not been logged for the month.',
  },
  {
    key: 'spending',
    title: 'High-spend warnings',
    desc: 'Warnings when one day of spending takes a large share of your total budget.',
  },
]

const BACKUP_COLLECTIONS = [
  { key: 'income', label: 'Income' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'bills', label: 'Bills' },
  { key: 'goals', label: 'Savings goals' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'budgets', label: 'Budgets' },
]

const DONATION_WALLETS = [
  {
    key: 'bitcoin',
    title: 'Bitcoin',
    shortTitle: 'BTC',
    address: 'bc1qe02rw0xqdx7sesypat9ghp923j6hm5hxv6penp',
  },
  {
    key: 'solana',
    title: 'Solana',
    shortTitle: 'SOL',
    address: 'DbVfaDpfTfij2KKfMESbxEk8wwQucuxP36HT4PjvJrXY',
  },
]

function getNotificationPermission() {
  try {
    return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  } catch {
    return 'unsupported'
  }
}

function normalizeBackupArray(value) {
  if (value == null) return []
  if (!Array.isArray(value)) throw new Error('Invalid backup file format.')
  return value
}

function parseBackupPayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid backup file.')
  }

  const hasValidProfile = raw.profile == null || (typeof raw.profile === 'object' && !Array.isArray(raw.profile))
  if (!hasValidProfile) {
    throw new Error('Invalid profile data in backup.')
  }

  return {
    version: raw.version || 1,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    income: normalizeBackupArray(raw.income),
    expenses: normalizeBackupArray(raw.expenses),
    bills: normalizeBackupArray(raw.bills),
    goals: normalizeBackupArray(raw.goals),
    accounts: normalizeBackupArray(raw.accounts),
    budgets: normalizeBackupArray(raw.budgets),
    profile: raw.profile || {},
  }
}

function getEmailActionSettings() {
  if (typeof window === 'undefined') return undefined
  return {
    url: `${window.location.origin}/login`,
    handleCodeInApp: false,
  }
}

function buildBackupSummary(backup) {
  return BACKUP_COLLECTIONS.map(item => ({
    ...item,
    count: Array.isArray(backup[item.key]) ? backup[item.key].length : 0,
  }))
}

async function copyToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard unavailable')
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function StatusBanner({ message }) {
  if (!message?.text) return null

  const ok = Boolean(message.ok)
  return (
    <div
      style={{
        background: ok ? 'var(--accent-glow)' : 'var(--red-dim)',
        color: ok ? 'var(--accent)' : 'var(--red)',
        border: `1px solid ${ok ? 'var(--accent)' : 'var(--red)'}`,
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        fontSize: 13,
        marginBottom: '1rem',
      }}
    >
      {ok ? '✓ ' : ''}{message.text}
    </div>
  )
}

function ToggleButton({ enabled, onClick, onLabel = 'On', offLabel = 'Off', disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 82,
        padding: '9px 14px',
        background: enabled ? 'var(--accent-glow)' : 'var(--surface2)',
        border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`,
        color: enabled ? 'var(--accent)' : 'var(--text2)',
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: 600,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {enabled ? onLabel : offLabel}
    </button>
  )
}

function ModeButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '9px 14px',
        background: active ? 'var(--accent-glow)' : 'var(--surface2)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        color: active ? 'var(--accent)' : 'var(--text2)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  )
}

export default function Settings({ user, data, profile, symbol, privacyMode = false, gamification, onTogglePrivacy }) {
  const s = symbol || '₱'
  const restoreInputRef = useRef(null)
  const [profileForm, setProfileForm] = useState({ salary: '', paySchedule: 'semi-monthly', currency: 'PHP' })
  const [notificationPrefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFS)
  const [profileSaved, setProfileSaved] = useState(false)
  const [notifMsg, setNotifMsg] = useState({ text: '', ok: false })
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [jsonExportDone, setJsonExportDone] = useState(false)
  const [rates, setRates] = useState(null)
  const [ratesLoading, setRatesLoading] = useState(false)
  const [browserPermission, setBrowserPermission] = useState(getNotificationPermission)
  const [accountForm, setAccountForm] = useState({ displayName: '', newEmail: '', password: '' })
  const [accountMsg, setAccountMsg] = useState({ text: '', ok: false })
  const [accountSaving, setAccountSaving] = useState(false)
  const [verifySending, setVerifySending] = useState(false)
  const [refreshingEmailStatus, setRefreshingEmailStatus] = useState(false)
  const [emailVerified, setEmailVerified] = useState(() => Boolean(auth.currentUser?.emailVerified || user?.emailVerified))
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState({ text: '', ok: false })
  const [pwLoading, setPwLoading] = useState(false)
  const [goalForm, setGoalForm] = useState({ name: '', target: '', current: '', date: '' })
  const [contribs, setContribs] = useState({})
  const [restoreMode, setRestoreMode] = useState('merge')
  const [restorePreview, setRestorePreview] = useState(null)
  const [restoreMsg, setRestoreMsg] = useState({ text: '', ok: false })
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [feedbackModal, setFeedbackModal] = useState(null)
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSaved, setFeedbackSaved] = useState('')
  const [feedbackForm, setFeedbackForm] = useState({ kind: 'feedback', rating: 0, message: '', allowFeature: false })
  const [deleteAccountForm, setDeleteAccountForm] = useState({ password: '', confirmText: '' })
  const [deleteAccountMsg, setDeleteAccountMsg] = useState({ text: '', ok: false })
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)
  const [donationMsg, setDonationMsg] = useState({ text: '', ok: false })

  useEffect(() => {
    if (profile && Object.keys(profile).length > 0) {
      setProfileForm({
        salary: profile.salary || '',
        paySchedule: profile.paySchedule || 'semi-monthly',
        currency: profile.currency || 'PHP',
      })
    }
    setNotificationPrefs(getNotificationPrefs(profile))
  }, [profile])

  useEffect(() => {
    setAccountForm(current => ({
      ...current,
      displayName: user?.displayName || auth.currentUser?.displayName || '',
      newEmail: '',
      password: '',
    }))
    setEmailVerified(Boolean(auth.currentUser?.emailVerified || user?.emailVerified))
  }, [user])

  useEffect(() => {
    fetchRates()
  }, [profileForm.currency])

  async function fetchRates() {
    setRatesLoading(true)
    try {
      const baseCurrency = profileForm.currency || 'PHP'
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`)
      const json = await response.json()
      setRates({ data: json.rates, base: baseCurrency })
    } catch {
      setRates(null)
    } finally {
      setRatesLoading(false)
    }
  }

  function setPF(key, value) {
    setProfileForm(current => ({ ...current, [key]: value }))
  }

  function setAccountField(key, value) {
    setAccountForm(current => ({ ...current, [key]: value }))
  }

  async function handleSaveProfile() {
    await fsSetProfile(user.uid, profileForm)
    setProfileSaved(true)
    window.setTimeout(() => setProfileSaved(false), 3000)
  }

  async function handleNotificationToggle(key) {
    const previous = notificationPrefs
    const next = { ...notificationPrefs, [key]: !notificationPrefs[key] }
    setNotificationPrefs(next)
    try {
      await fsSetProfile(user.uid, { notificationPrefs: next })
      setNotifMsg({ text: 'Notification preferences saved.', ok: true })
    } catch {
      setNotificationPrefs(previous)
      setNotifMsg({ text: 'Could not save notification preferences.', ok: false })
    }
  }

  async function handleEnableBrowserNotifications() {
    const granted = await requestPushPermission()
    const permission = getNotificationPermission()
    setBrowserPermission(permission)
    if (granted) {
      setNotifMsg({ text: 'Browser notifications enabled.', ok: true })
      return
    }
    if (permission === 'denied') {
      setNotifMsg({ text: 'Browser notifications are blocked. Update your browser site permissions to enable them.', ok: false })
      return
    }
    setNotifMsg({ text: 'Browser notifications were not enabled.', ok: false })
  }

  async function handleSaveAccountProfile() {
    const currentUser = auth.currentUser
    if (!currentUser) return

    const displayName = accountForm.displayName.trim()
    if (!displayName) {
      setAccountMsg({ text: 'Display name is required.', ok: false })
      return
    }

    setAccountSaving(true)
    setAccountMsg({ text: '', ok: false })
    try {
      await updateProfile(currentUser, { displayName })
      await fsSetProfile(user.uid, { displayName })
      await reload(currentUser)
      setAccountMsg({ text: 'Account profile updated.', ok: true })
    } catch {
      setAccountMsg({ text: 'Could not update your account profile.', ok: false })
    } finally {
      setAccountSaving(false)
    }
  }

  async function handleSendVerification() {
    const currentUser = auth.currentUser
    if (!currentUser?.email) return
    if (emailVerified) {
      setAccountMsg({ text: 'Your email is already verified.', ok: true })
      return
    }

    setVerifySending(true)
    setAccountMsg({ text: '', ok: false })
    try {
      await sendEmailVerification(currentUser, getEmailActionSettings())
      setAccountMsg({ text: 'Verification email sent.', ok: true })
    } catch {
      setAccountMsg({ text: 'Could not send a verification email.', ok: false })
    } finally {
      setVerifySending(false)
    }
  }

  async function handleRefreshEmailStatus() {
    const currentUser = auth.currentUser
    if (!currentUser) return

    setRefreshingEmailStatus(true)
    try {
      await reload(currentUser)
      const nextVerified = Boolean(currentUser.emailVerified)
      setEmailVerified(nextVerified)
      setBrowserPermission(getNotificationPermission())
      setAccountMsg({
        text: nextVerified ? 'Email is verified.' : 'Email is still unverified.',
        ok: nextVerified,
      })
    } catch {
      setAccountMsg({ text: 'Could not refresh account status.', ok: false })
    } finally {
      setRefreshingEmailStatus(false)
    }
  }

  async function handleChangeEmail() {
    const currentUser = auth.currentUser
    if (!currentUser?.email) return

    const nextEmail = accountForm.newEmail.trim()
    if (!nextEmail) return setAccountMsg({ text: 'Enter the new email address first.', ok: false })
    if (nextEmail === currentUser.email) return setAccountMsg({ text: 'That email is already on your account.', ok: false })
    if (!accountForm.password) return setAccountMsg({ text: 'Enter your current password to update your email.', ok: false })

    setAccountSaving(true)
    setAccountMsg({ text: '', ok: false })
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, accountForm.password)
      await reauthenticateWithCredential(currentUser, credential)
      await verifyBeforeUpdateEmail(currentUser, nextEmail, getEmailActionSettings())
      setAccountForm(current => ({ ...current, newEmail: '', password: '' }))
      setAccountMsg({ text: `Verification sent to ${nextEmail}. Confirm it to finish changing your email.`, ok: true })
    } catch (error) {
      const message =
        error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
          ? 'Current password is incorrect.'
          : error.code === 'auth/email-already-in-use'
            ? 'That email is already in use.'
            : error.code === 'auth/invalid-email'
              ? 'Enter a valid email address.'
              : 'Could not start the email update. Try again.'
      setAccountMsg({ text: message, ok: false })
    } finally {
      setAccountSaving(false)
    }
  }

  async function handleChangePassword() {
    setPwMsg({ text: '', ok: false })
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) return setPwMsg({ text: 'Enter all three password fields.', ok: false })
    if (pwForm.next.length < 6) return setPwMsg({ text: 'New password must be at least 6 characters.', ok: false })
    if (pwForm.next !== pwForm.confirm) return setPwMsg({ text: 'New passwords do not match.', ok: false })
    setPwLoading(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, pwForm.current)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, pwForm.next)
      setPwMsg({ text: 'Password changed successfully.', ok: true })
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (error) {
      const message = error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
        ? 'Current password is incorrect.'
        : 'Failed to change password. Try again.'
      setPwMsg({ text: message, ok: false })
    } finally {
      setPwLoading(false)
    }
  }

  async function handleAddGoal() {
    if (!goalForm.name || !goalForm.target) return alert('Add a goal name and target amount.')
    await fsAdd(user.uid, 'goals', {
      name: goalForm.name,
      target: parseFloat(goalForm.target),
      current: parseFloat(goalForm.current) || 0,
      date: goalForm.date,
    })
    setGoalForm({ name: '', target: '', current: '', date: '' })
  }

  async function handleGoalContrib(goal) {
    const value = parseFloat(contribs[goal._id] || 0)
    if (!value) return
    const newValue = Math.min(goal.target, (goal.current || 0) + value)
    await fsUpdate(user.uid, 'goals', goal._id, { current: newValue })
    setContribs(current => ({ ...current, [goal._id]: '' }))
  }

  async function handleDelGoal(id) {
    if (!confirmDelete('this goal')) return
    await fsDel(user.uid, 'goals', id)
  }

  function exportCSV() {
    const escapeCsvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`
    const rows = [
      ['Type', 'Description', 'Category', 'Amount', 'Date', 'Recurring'],
      ...data.income.map(tx => ['Income', tx.desc, tx.cat, tx.amount, tx.date, tx.recur || '']),
      ...data.expenses.map(tx => ['Expense', tx.desc, tx.cat, tx.amount, tx.date, tx.recur || '']),
      ...data.bills.map(tx => ['Bill', tx.name, tx.cat, tx.amount, `Day ${tx.due}`, tx.freq]),
    ]
    const csv = rows.map(row => row.map(escapeCsvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `takda-export-${today()}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    setExportDone(true)
    window.setTimeout(() => setExportDone(false), 3000)
  }

  function exportJSON() {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      income: data.income,
      expenses: data.expenses,
      bills: data.bills,
      goals: data.goals,
      accounts: data.accounts,
      budgets: data.budgets,
      profile,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `takda-backup-${today()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setJsonExportDone(true)
    window.setTimeout(() => setJsonExportDone(false), 3000)
  }

  async function handleRestoreFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setRestoreMsg({ text: '', ok: false })
    try {
      const text = await file.text()
      const parsed = parseBackupPayload(JSON.parse(text))
      setRestorePreview({
        fileName: file.name,
        exportedAt: parsed.exportedAt,
        summary: buildBackupSummary(parsed),
        backup: parsed,
      })
      setRestoreMsg({ text: 'Backup file loaded. Review it before restoring.', ok: true })
    } catch (error) {
      setRestorePreview(null)
      setRestoreMsg({ text: error.message || 'Could not read that backup file.', ok: false })
    } finally {
      event.target.value = ''
    }
  }

  async function handleRestoreBackup() {
    if (!restorePreview?.backup) return

    const confirmed = window.confirm(
      restoreMode === 'replace'
        ? 'Replace current income, expenses, bills, goals, accounts, budgets, and profile data with this backup?'
        : 'Merge this backup into your current Takda data? Matching document ids will be updated.',
    )
    if (!confirmed) return

    setRestoreLoading(true)
    setRestoreMsg({ text: '', ok: false })
    try {
      await fsRestoreBackup(user.uid, restorePreview.backup, restoreMode)
      setRestoreMsg({
        text: restoreMode === 'replace'
          ? 'Backup restored. Current app data was replaced.'
          : 'Backup restored. Current app data was merged.',
        ok: true,
      })
    } catch {
      setRestoreMsg({ text: 'Restore failed. Please try again.', ok: false })
    } finally {
      setRestoreLoading(false)
    }
  }

  async function handleReset() {
    const confirmed = window.confirm('Reset ALL financial data? This permanently deletes transactions, bills, savings goals, accounts, and budgets. Cannot be undone.')
    if (!confirmed) return
    setResetting(true)
    try {
      for (const item of data.income) await fsDel(user.uid, 'income', item._id)
      for (const item of data.expenses) await fsDel(user.uid, 'expenses', item._id)
      for (const item of data.bills) await fsDel(user.uid, 'bills', item._id)
      for (const item of data.goals) await fsDel(user.uid, 'goals', item._id)
      for (const item of data.accounts) await fsDel(user.uid, 'accounts', item._id)
      for (const item of data.budgets) await fsDel(user.uid, 'budgets', item._id)
      setResetDone(true)
      window.setTimeout(() => setResetDone(false), 4000)
    } catch {
      alert('Reset failed. Please try again.')
    } finally {
      setResetting(false)
    }
  }

  async function handleDeleteAccount() {
    const currentUser = auth.currentUser
    if (!currentUser?.email) return

    if (deleteAccountForm.confirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteAccountMsg({ text: 'Type DELETE to confirm full account deletion.', ok: false })
      return
    }

    if (!deleteAccountForm.password) {
      setDeleteAccountMsg({ text: 'Enter your current password first.', ok: false })
      return
    }

    const confirmed = window.confirm('Delete your Takda account and ALL data? This removes your financial records, profile, feedback, and login. This cannot be undone.')
    if (!confirmed) return

    setDeleteAccountLoading(true)
    setDeleteAccountMsg({ text: '', ok: false })

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, deleteAccountForm.password)
      await reauthenticateWithCredential(currentUser, credential)
      await fsDeleteAccountData(user.uid)
      await deleteUser(currentUser)
    } catch (error) {
      const message =
        error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
          ? 'Current password is incorrect.'
          : error.code === 'auth/requires-recent-login'
            ? 'Please log in again, then retry deleting your account.'
            : 'Could not delete your account. Please try again.'
      setDeleteAccountMsg({ text: message, ok: false })
    } finally {
      setDeleteAccountLoading(false)
    }
  }

  function openFeedback(kind) {
    setFeedbackSaved('')
    setFeedbackModal(kind)
    setFeedbackForm({
      kind,
      rating: 0,
      message: '',
      allowFeature: kind === 'testimonial',
    })
  }

  async function submitFeedback() {
    if (!feedbackModal) return
    if (!feedbackForm.message.trim() && feedbackModal !== 'rating') return alert('Please add a message first.')
    if (feedbackModal === 'rating' && !feedbackForm.rating) return alert('Please select a rating.')

    setFeedbackSending(true)
    try {
      await fsAdd(user.uid, 'feedback', {
        kind: feedbackForm.kind,
        rating: feedbackForm.rating || null,
        message: feedbackForm.message.trim(),
        allowFeature: feedbackForm.allowFeature,
        email: user.email,
        createdBy: user.displayName || user.email,
      })
      setFeedbackModal(null)
      setFeedbackSaved('Thanks. Your feedback was saved.')
    } finally {
      setFeedbackSending(false)
    }
  }

  async function handleCopyWallet(title, address) {
    try {
      await copyToClipboard(address)
      setDonationMsg({ text: `${title} wallet copied.`, ok: true })
    } catch {
      setDonationMsg({ text: `Could not copy the ${title} wallet right now.`, ok: false })
    }
    window.setTimeout(() => setDonationMsg({ text: '', ok: false }), 2800)
  }

  const totalTx = data.income.length + data.expenses.length
  const savingsTotal = data.goals.reduce((sum, goal) => sum + (goal.current || 0), 0)
  const money = value => displayValue(privacyMode, fmt(value, s), maskMoney(s))
  const showPublishConsent = feedbackForm.kind === 'testimonial' || Number(feedbackForm.rating) >= 4
  const currentEmail = auth.currentUser?.email || user?.email || ''
  const currentDisplayName = auth.currentUser?.displayName || user?.displayName || ''
  const emailStatusColor = emailVerified ? 'var(--accent)' : 'var(--amber)'
  const emailStatusBg = emailVerified ? 'var(--accent-glow)' : 'var(--amber-dim)'
  const restoreExportedAt = restorePreview?.exportedAt && !Number.isNaN(new Date(restorePreview.exportedAt).getTime())
    ? new Date(restorePreview.exportedAt).toLocaleString()
    : restorePreview?.exportedAt

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Settings</div>
        <div className={styles.sub}>Manage your account, privacy, exports, and app preferences</div>
      </div>

      <GamificationCard
        gamification={gamification}
        privacyMode={privacyMode}
        title="Profile progress"
        message="Settings shape the experience. Consistent logging keeps the numbers useful."
      />

      <div className={styles.card}>
        <div className={styles.cardTitle}>Account & security</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Update your display name, verification status, and secure email details.
        </p>
        <StatusBanner message={accountMsg} />

        <div className={`${styles.formRow} ${styles.col2}`} style={{ marginBottom: 12 }}>
          <div className={styles.formGroup}>
            <label>Display name</label>
            <input value={accountForm.displayName} onChange={event => setAccountField('displayName', event.target.value)} placeholder="Your name" />
          </div>
          <div className={styles.formGroup}>
            <label>Current email</label>
            <input value={currentEmail} readOnly />
          </div>
        </div>

        <div className={settStyles.preferenceRow} style={{ marginBottom: '1rem' }}>
          <div>
            <div className={settStyles.preferenceTitle}>Email verification</div>
            <div className={settStyles.preferenceMeta}>A verified email helps with recovery and sensitive account changes.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '7px 12px',
                background: emailStatusBg,
                border: `1px solid ${emailStatusColor}`,
                borderRadius: '999px',
                color: emailStatusColor,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {emailVerified ? 'Verified' : 'Unverified'}
            </span>
            {!emailVerified && (
              <button className={settStyles.btnExport} onClick={handleSendVerification} disabled={verifySending}>
                {verifySending ? 'Sending...' : 'Send verification email'}
              </button>
            )}
            <button className={settStyles.btnExport} onClick={handleRefreshEmailStatus} disabled={refreshingEmailStatus}>
              {refreshingEmailStatus ? 'Refreshing...' : 'Refresh status'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className={styles.btnAdd} style={{ width: 'auto', padding: '9px 20px' }} onClick={handleSaveAccountProfile} disabled={accountSaving}>
            {accountSaving ? 'Saving...' : 'Save display name'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div className={styles.cardTitle} style={{ marginBottom: 8 }}>Change email</div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Takda will ask Firebase to verify the new address before the change is applied.
          </p>
          <div className={`${styles.formRow} ${styles.col2}`} style={{ marginBottom: 12 }}>
            <div className={styles.formGroup}>
              <label>New email</label>
              <input type="email" placeholder="new@email.com" value={accountForm.newEmail} onChange={event => setAccountField('newEmail', event.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Current password</label>
              <input type="password" placeholder="Required to confirm this change" value={accountForm.password} onChange={event => setAccountField('password', event.target.value)} />
            </div>
          </div>
          <button className={styles.btnAdd} style={{ width: 'auto', padding: '9px 20px' }} onClick={handleChangeEmail} disabled={accountSaving}>
            {accountSaving ? 'Updating...' : 'Update email'}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Change Password</div>
        {pwMsg.text && (
          <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12, background: pwMsg.ok ? 'var(--accent-glow)' : 'var(--red-dim)', color: pwMsg.ok ? 'var(--accent)' : 'var(--red)', border: `1px solid ${pwMsg.ok ? 'var(--accent)' : 'var(--red)'}` }}>
            {pwMsg.text}
          </div>
        )}
        <div className={`${styles.formRow} ${styles.col3}`} style={{ marginBottom: 12 }}>
          <div className={styles.formGroup}>
            <label>Current password</label>
            <input type="password" placeholder="••••••••" value={pwForm.current} onChange={event => setPwForm(current => ({ ...current, current: event.target.value }))} />
          </div>
          <div className={styles.formGroup}>
            <label>New password</label>
            <input type="password" placeholder="Min. 6 characters" value={pwForm.next} onChange={event => setPwForm(current => ({ ...current, next: event.target.value }))} />
          </div>
          <div className={styles.formGroup}>
            <label>Confirm new password</label>
            <input type="password" placeholder="••••••••" value={pwForm.confirm} onChange={event => setPwForm(current => ({ ...current, confirm: event.target.value }))} />
          </div>
        </div>
        <button className={styles.btnAdd} style={{ width: 'auto', padding: '9px 20px' }} onClick={handleChangePassword} disabled={pwLoading}>
          {pwLoading ? 'Updating...' : 'Update password'}
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Privacy & preferences</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Privacy mode hides balances and amounts across Takda without changing the layout.
        </p>
        <div className={settStyles.preferenceRow}>
          <div>
            <div className={settStyles.preferenceTitle}>Hide sensitive data</div>
            <div className={settStyles.preferenceMeta}>Applies to dashboard, calendar, history, budgets, goals, and accounts.</div>
          </div>
          <PrivacyToggle enabled={privacyMode} onToggle={onTogglePrivacy} label="Hide balances" />
        </div>

        <div style={{ borderTop: '1px solid var(--border)', margin: '1rem 0', paddingTop: '1rem' }}>
          <div className={styles.cardTitle} style={{ marginBottom: 8 }}>Notifications</div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Choose which alerts Takda shows and whether this browser can send notifications.
          </p>
          <StatusBanner message={notifMsg} />

          <div className={settStyles.preferenceRow}>
            <div>
              <div className={settStyles.preferenceTitle}>Browser notifications</div>
              <div className={settStyles.preferenceMeta}>Allow notification permission from this browser when supported.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '7px 12px',
                  background: browserPermission === 'granted' ? 'var(--accent-glow)' : browserPermission === 'denied' ? 'var(--red-dim)' : 'var(--surface2)',
                  border: `1px solid ${browserPermission === 'granted' ? 'var(--accent)' : browserPermission === 'denied' ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: '999px',
                  color: browserPermission === 'granted' ? 'var(--accent)' : browserPermission === 'denied' ? 'var(--red)' : 'var(--text2)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {browserPermission === 'granted'
                  ? 'Enabled'
                  : browserPermission === 'denied'
                    ? 'Blocked'
                    : browserPermission === 'unsupported'
                      ? 'Unsupported'
                      : 'Not enabled'}
              </span>
              {browserPermission !== 'granted' && browserPermission !== 'unsupported' && (
                <button className={settStyles.btnExport} onClick={handleEnableBrowserNotifications}>
                  Enable
                </button>
              )}
            </div>
          </div>

          {NOTIFICATION_OPTIONS.map(option => (
            <div
              key={option.key}
              className={settStyles.preferenceRow}
              style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12 }}
            >
              <div>
                <div className={settStyles.preferenceTitle}>{option.title}</div>
                <div className={settStyles.preferenceMeta}>{option.desc}</div>
              </div>
              <ToggleButton enabled={notificationPrefs[option.key]} onClick={() => handleNotificationToggle(option.key)} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Salary & Pay Schedule</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          Set your salary, pay rhythm, and currency so forecasts and savings rate stay accurate.
        </p>

        <div className={`${styles.formRow} ${styles.col2}`} style={{ marginBottom: 12 }}>
          <div className={styles.formGroup}>
            <label>Monthly Salary</label>
            <input type="number" min="0" placeholder="e.g. 50,000" value={profileForm.salary} onChange={event => setPF('salary', event.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>Pay Schedule</label>
            <select value={profileForm.paySchedule} onChange={event => setPF('paySchedule', event.target.value)}>
              {PAY_SCHEDULES.map(schedule => <option key={schedule.value} value={schedule.value}>{schedule.label}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formGroup} style={{ marginBottom: '1.25rem' }}>
          <label>Currency</label>
          <select value={profileForm.currency} onChange={event => setPF('currency', event.target.value)}>
            {CURRENCIES.map(currency => <option key={currency.code} value={currency.code}>{currency.symbol} — {currency.label}</option>)}
          </select>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1.25rem' }}>
          <div className={styles.cardTitle} style={{ marginBottom: 8 }}>Live Exchange Rates</div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Indicative rates for your selected base currency. Helpful for context, not a core account setting.
          </p>
          {ratesLoading ? (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading rates...</div>
          ) : !rates ? (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Could not load rates. Check your connection.</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                <div style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4, fontWeight: 600 }}>Your currency — Base</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--accent)', fontWeight: 700 }}>{s} {rates.base}</div>
                </div>
                {['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'HKD', 'KRW', 'CNY', 'PHP'].filter(code => code !== rates.base).map(code => {
                  if (!rates.data[code]) return null
                  const unitsPerForeign = (1 / rates.data[code]).toFixed(2)
                  return (
                    <div key={code} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>1 {code} =</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--text)', fontWeight: 700 }}>{s}{unitsPerForeign}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{rates.base}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Source: exchangerate-api.com · Rates are indicative</div>
            </>
          )}
        </div>

        {profileSaved && (
          <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, marginBottom: '1rem' }}>
            ✓ Profile saved.
          </div>
        )}

        <button className={styles.btnAdd} style={{ width: 'auto', padding: '9px 24px' }} onClick={handleSaveProfile}>
          Save profile
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Savings Goals</div>
        <div className={`${styles.formRow} ${styles.col2}`} style={{ marginBottom: 8 }}>
          <div className={styles.formGroup}><label>Goal name</label><input placeholder="e.g. Emergency fund" value={goalForm.name} onChange={event => setGoalForm(current => ({ ...current, name: event.target.value }))} /></div>
          <div className={styles.formGroup}><label>Target ({s})</label><input type="number" min="0" placeholder="0.00" value={goalForm.target} onChange={event => setGoalForm(current => ({ ...current, target: event.target.value }))} /></div>
        </div>
        <div className={`${styles.formRow} ${styles.col2}`} style={{ marginBottom: 12 }}>
          <div className={styles.formGroup}><label>Already saved ({s})</label><input type="number" min="0" placeholder="0.00" value={goalForm.current} onChange={event => setGoalForm(current => ({ ...current, current: event.target.value }))} /></div>
          <div className={styles.formGroup}><label>Target date</label><input type="date" value={goalForm.date} onChange={event => setGoalForm(current => ({ ...current, date: event.target.value }))} /></div>
        </div>
        <button className={styles.btnAdd} style={{ width: 'auto', padding: '9px 20px', marginBottom: data.goals.length ? '1.25rem' : 0 }} onClick={handleAddGoal}>Add goal</button>

        {data.goals.map(goal => {
          const pct = Math.min(100, Math.round(((goal.current || 0) / (goal.target || 1)) * 100))
          return (
            <div key={goal._id} style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{goal.name}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{money(goal.current || 0)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>/ {money(goal.target)}</span>
                  <button onClick={() => handleDelGoal(goal._id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, padding: '2px 4px' }}>✕</button>
                </div>
              </div>
              <div style={{ height: 7, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--accent)' : 'var(--blue)', borderRadius: 4, transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="number" min="0" placeholder={`Add amount (${s})`} value={contribs[goal._id] || ''} onChange={event => setContribs(current => ({ ...current, [goal._id]: event.target.value }))}
                  style={{ flex: 1, padding: '7px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 16, fontFamily: 'var(--font-body)', outline: 'none' }} />
                <button onClick={() => handleGoalContrib(goal)} style={{ padding: '7px 14px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>+ Add</button>
              </div>
            </div>
          )
        })}
        {!data.goals.length && <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>No savings goals yet. Add one above to start tracking progress.</div>}
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Backup & export</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Export a portable backup of your data and restore it later. JSON backups include accounts, budgets, and profile settings.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button className={settStyles.btnExport} onClick={exportCSV}>{exportDone ? '✓ Downloaded' : '↓ Transactions CSV'}</button>
          <button className={settStyles.btnExport} onClick={exportJSON}>{jsonExportDone ? '✓ Backup downloaded' : '↓ Backup as JSON'}</button>
          <button className={settStyles.btnExport} onClick={() => {
            const nowDate = new Date()
            generateMonthlyReport(data, profile, nowDate.getFullYear(), nowDate.getMonth(), s)
          }}>🖨 Monthly Report PDF</button>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div className={styles.cardTitle} style={{ marginBottom: 8 }}>Restore backup</div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Load a Takda JSON backup, review what it contains, then merge it or replace your current app data.
          </p>
          <StatusBanner message={restoreMsg} />
          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleRestoreFile}
            style={{ display: 'none' }}
          />

          <div className={settStyles.preferenceRow}>
            <div>
              <div className={settStyles.preferenceTitle}>Backup file</div>
              <div className={settStyles.preferenceMeta}>Expected format: a JSON backup exported from Takda.</div>
            </div>
            <button className={settStyles.btnExport} onClick={() => restoreInputRef.current?.click()}>
              Upload JSON backup
            </button>
          </div>

          {restorePreview && (
            <>
              <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Loaded backup</div>
                <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{restorePreview.fileName}</div>
                {restoreExportedAt && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                    Exported {restoreExportedAt}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <ModeButton active={restoreMode === 'merge'} onClick={() => setRestoreMode('merge')}>
                  Merge with current data
                </ModeButton>
                <ModeButton active={restoreMode === 'replace'} onClick={() => setRestoreMode('replace')}>
                  Replace current data
                </ModeButton>
              </div>

              <div className={settStyles.summaryGrid} style={{ marginTop: 12 }}>
                {restorePreview.summary.map(item => (
                  <div key={item.key} className={settStyles.summaryItem}>
                    <div className={settStyles.summaryVal}>{item.count}</div>
                    <div className={settStyles.summaryLabel}>{item.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className={styles.btnAdd} style={{ width: 'auto', padding: '9px 20px' }} onClick={handleRestoreBackup} disabled={restoreLoading}>
                  {restoreLoading ? 'Restoring...' : restoreMode === 'replace' ? 'Restore and replace' : 'Restore and merge'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Your data</div>
        <div className={settStyles.summaryGrid}>
          <div className={settStyles.summaryItem}><div className={settStyles.summaryVal}>{data.income.length}</div><div className={settStyles.summaryLabel}>Income entries</div></div>
          <div className={settStyles.summaryItem}><div className={settStyles.summaryVal}>{data.expenses.length}</div><div className={settStyles.summaryLabel}>Expenses</div></div>
          <div className={settStyles.summaryItem}><div className={settStyles.summaryVal}>{data.bills.length}</div><div className={settStyles.summaryLabel}>Bills</div></div>
          <div className={settStyles.summaryItem}><div className={settStyles.summaryVal}>{data.goals.length}</div><div className={settStyles.summaryLabel}>Savings goals</div></div>
          <div className={settStyles.summaryItem}><div className={settStyles.summaryVal}>{data.accounts.length}</div><div className={settStyles.summaryLabel}>Accounts</div></div>
          <div className={settStyles.summaryItem}><div className={settStyles.summaryVal}>{data.budgets.length}</div><div className={settStyles.summaryLabel}>Budgets</div></div>
          <div className={settStyles.summaryItem}><div className={settStyles.summaryVal} style={{ color: 'var(--accent)' }}>{money(savingsTotal)}</div><div className={settStyles.summaryLabel}>Total saved</div></div>
          <div className={settStyles.summaryItem}><div className={settStyles.summaryVal}>{totalTx}</div><div className={settStyles.summaryLabel}>Total transactions</div></div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Feedback & reviews</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Share ideas, report issues, rate the app, or opt in to a testimonial for the landing page.
        </p>
        {feedbackSaved && <div className={settStyles.feedbackSaved}>{feedbackSaved}</div>}
        <div className={settStyles.feedbackGrid}>
          <button className={settStyles.feedbackAction} onClick={() => openFeedback('feedback')}>
            <strong>Send Feedback</strong>
            <span>Suggestions and product ideas</span>
          </button>
          <button className={settStyles.feedbackAction} onClick={() => openFeedback('bug')}>
            <strong>Report a Bug</strong>
            <span>Keep support messages organized</span>
          </button>
          <button className={settStyles.feedbackAction} onClick={() => openFeedback('rating')}>
            <strong>Rate Your Experience</strong>
            <span>1-5 stars stored inside Takda</span>
          </button>
          <button className={settStyles.feedbackAction} onClick={() => openFeedback('testimonial')}>
            <strong>Share a Testimonial</strong>
            <span>Only featured with your consent</span>
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>About</div>
        <div className={settStyles.aboutBlock}>
          <div className={settStyles.aboutLogo}>Takda</div>
          <div className={settStyles.aboutTagline}>Bawat piso, sinusubaybayan.</div>
          <div className={settStyles.aboutMeta}>Version {VERSION}</div>
          <div className={settStyles.aboutDesc}>
            A personal finance tracker for Filipinos. Track income, expenses, bills, and goals with a month view that stays in sync across devices.
          </div>
          <div className={settStyles.aboutUser}>Logged in as <strong>{currentDisplayName || user.email}</strong></div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Support Takda</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.6 }}>
          If Takda helps you, you can support the app with a coffee using the wallets below.
        </p>
        <StatusBanner message={donationMsg} />
        <div className={settStyles.donateGrid}>
          {DONATION_WALLETS.map(wallet => (
            <div key={wallet.key} className={settStyles.donateCard}>
              <div className={settStyles.donateTop}>
                <div>
                  <div className={settStyles.donateTitle}>{wallet.title}</div>
                  <div className={settStyles.donateMeta}>{wallet.shortTitle} wallet</div>
                </div>
                <button className={settStyles.btnExport} onClick={() => handleCopyWallet(wallet.title, wallet.address)}>
                  Copy
                </button>
              </div>
              <div className={settStyles.donateAddress}>{wallet.address}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <button
          onClick={async () => {
            const { signOut } = await import('firebase/auth')
            const { auth: authRef } = await import('../lib/firebase')
            await signOut(authRef)
          }}
          style={{ width: '100%', padding: '13px', background: 'var(--red-dim)', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600 }}
        >
          Log out
        </button>
      </div>

      <div className={styles.card} style={{ borderColor: 'rgba(255,83,112,0.3)' }}>
        <div className={styles.cardTitle} style={{ color: 'var(--red)' }}>Reset data</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Permanently delete transactions, bills, savings goals, accounts, and budgets. Your account stays active, but your financial records will be erased. <strong style={{ color: 'var(--red)' }}>This cannot be undone.</strong>
        </p>
        {resetDone && (
          <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, marginBottom: '1rem' }}>
            ✓ Financial data has been reset successfully.
          </div>
        )}
        <button className={settStyles.btnReset} onClick={handleReset} disabled={resetting}>
          {resetting ? 'Resetting...' : 'Reset financial data'}
        </button>
      </div>

      <div className={styles.card} style={{ borderColor: 'rgba(255,83,112,0.36)' }}>
        <div className={styles.cardTitle} style={{ color: 'var(--red)' }}>Delete account and all data</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.6 }}>
          This fully removes your Takda account, tracked financial data, saved profile, and feedback records. Use this only if you want to leave permanently. <strong style={{ color: 'var(--red)' }}>This cannot be undone.</strong>
        </p>
        <StatusBanner message={deleteAccountMsg} />
        <div className={`${styles.formRow} ${styles.col2}`} style={{ marginBottom: 12 }}>
          <div className={styles.formGroup}>
            <label>Current password</label>
            <input
              type="password"
              placeholder="Required to delete your account"
              value={deleteAccountForm.password}
              onChange={event => setDeleteAccountForm(current => ({ ...current, password: event.target.value }))}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Type DELETE to confirm</label>
            <input
              type="text"
              placeholder="DELETE"
              value={deleteAccountForm.confirmText}
              onChange={event => setDeleteAccountForm(current => ({ ...current, confirmText: event.target.value }))}
            />
          </div>
        </div>
        <button className={settStyles.btnReset} onClick={handleDeleteAccount} disabled={deleteAccountLoading}>
          {deleteAccountLoading ? 'Deleting account...' : 'Delete account and all data'}
        </button>
      </div>

      {feedbackModal && (
        <div className={settStyles.feedbackOverlay} onClick={event => { if (event.target === event.currentTarget) setFeedbackModal(null) }}>
          <div className={settStyles.feedbackModal}>
            <div className={settStyles.feedbackHeader}>
              <div>
                <div className={settStyles.feedbackTitle}>{FEEDBACK_PRESETS[feedbackModal].title}</div>
                <div className={settStyles.feedbackPrompt}>{FEEDBACK_PRESETS[feedbackModal].prompt}</div>
              </div>
              <button className={settStyles.feedbackClose} onClick={() => setFeedbackModal(null)}>✕</button>
            </div>

            {feedbackModal === 'rating' && (
              <div className={settStyles.ratingRow}>
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    className={`${settStyles.starBtn} ${feedbackForm.rating >= value ? settStyles.starBtnActive : ''}`}
                    onClick={() => setFeedbackForm(current => ({ ...current, rating: value }))}
                  >
                    ★
                  </button>
                ))}
              </div>
            )}

            <div className={styles.formGroup} style={{ marginBottom: 12 }}>
              <label>{feedbackModal === 'bug' ? 'What happened?' : feedbackModal === 'testimonial' ? 'Your testimonial' : 'Message'}</label>
              <textarea
                className={settStyles.feedbackTextarea}
                rows="5"
                placeholder={feedbackModal === 'bug' ? 'Describe the bug, steps, and expected result.' : 'Write your message here.'}
                value={feedbackForm.message}
                onChange={event => setFeedbackForm(current => ({ ...current, message: event.target.value }))}
              />
            </div>

            {showPublishConsent && (
              <label className={settStyles.consentRow}>
                <input
                  type="checkbox"
                  checked={feedbackForm.allowFeature}
                  onChange={event => setFeedbackForm(current => ({ ...current, allowFeature: event.target.checked }))}
                />
                <span>Can we feature this on the Takda landing page?</span>
              </label>
            )}

            <div className={settStyles.feedbackActions}>
              <button className={settStyles.feedbackCancel} onClick={() => setFeedbackModal(null)}>Cancel</button>
              <button className={styles.btnAdd} style={{ flex: 1 }} onClick={submitFeedback} disabled={feedbackSending}>
                {feedbackSending ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
