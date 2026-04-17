import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { sendEmailVerification, signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { fsSetProfile, fsSyncDueLinkedTransactions, listenCol, listenProfile } from '../lib/firestore'
import { getGamificationSnapshot } from '../lib/gamification'
import { getInitials, getCurrencySymbol } from '../lib/utils'
import Calendar from './Calendar'
import Dashboard from './Dashboard'
import Savings from './Savings'
import Accounts from './Accounts'
import Breakdown from './Breakdown'
import Budget from './Budget'
import Bills from './Bills'
import Receipts from './Receipts'
import Settings from './Settings'
import History from './History'
import QuickAdd from './QuickAdd'
import GroceryMode from './GroceryMode'
import AskTakdaCommand from '../components/AskTakdaCommand'
import ReceiptScanner from '../components/ReceiptScanner'
import {
  findPresetByLabel,
  getDefaultTransactionDraft,
  sanitizeTransactionCategory,
  sanitizeTransactionSubcategory,
} from '../lib/transactionOptions'
import { useTheme } from '../lib/theme.jsx'
import NotificationBell from '../components/NotificationBell'
import styles from './AppShell.module.css'

const Lakas = lazy(() => import('./Lakas'))
const Tala = lazy(() => import('./Tala'))

const LAKAS_COLLECTIONS = [
  'lakasRoutines',
  'lakasWorkouts',
  'lakasBodyLogs',
  'lakasActivities',
  'lakasHabits',
  'lakasReminders',
  'lakasMeals',
  'lakasGoals',
]

const TALA_COLLECTIONS = [
  'talaCheckins',
  'talaJournal',
  'talaMoods',
  'talaTasks',
  'talaGoals',
]

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Buhay page failed to render', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        role="alert"
        style={{
          border: '1px solid color-mix(in srgb, var(--glass-border) 70%, var(--border))',
          borderRadius: 28,
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--glass-2) 78%, var(--surface) 22%), color-mix(in srgb, var(--surface) 92%, transparent 8%))',
          boxShadow: 'var(--glass-shadow-soft)',
          color: 'var(--text)',
          padding: 24,
        }}
      >
        <div style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase' }}>Page recovered</div>
        <h2 style={{ margin: '8px 0 8px', fontFamily: 'var(--font-display)', fontSize: 34, letterSpacing: '-0.05em', lineHeight: 1 }}>This page hit a display issue.</h2>
        <p style={{ margin: 0, color: 'var(--text2)', maxWidth: 560, lineHeight: 1.55 }}>
          Buhay is still running. Go back Home, then try opening the page again.
        </p>
        <button
          type="button"
          onClick={this.props.onRecover}
          style={{
            marginTop: 18,
            minHeight: 44,
            border: '1px solid color-mix(in srgb, var(--accent) 38%, var(--glass-border))',
            borderRadius: 16,
            background: 'color-mix(in srgb, var(--accent) 18%, var(--glass-1))',
            color: 'var(--text)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontWeight: 800,
            padding: '10px 16px',
          }}
        >
          Back to Home
        </button>
      </div>
    )
  }
}

function PageLoading() {
  return (
    <div
      role="status"
      style={{
        border: '1px solid color-mix(in srgb, var(--glass-border) 70%, var(--border))',
        borderRadius: 28,
        background: 'color-mix(in srgb, var(--glass-1) 76%, var(--surface) 24%)',
        color: 'var(--text2)',
        padding: 24,
      }}
    >
      Opening page...
    </div>
  )
}

const NAV_ICONS = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  finance: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="3"/>
      <path d="M16 10h2.5a1.5 1.5 0 0 1 0 3H16a1.5 1.5 0 0 1 0-3Z"/>
      <path d="M6 9h5"/>
    </svg>
  ),
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5 12 4l8 7.5"/>
      <path d="M6.5 10.5V20h11v-9.5"/>
      <path d="M9.5 20v-5h5v5"/>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  breakdown: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 1 1-9 9h9z"/>
      <path d="M12 3a9 9 0 0 1 9 9h-9z"/>
    </svg>
  ),
  budget: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="3" x2="12" y2="5"/>
      <line x1="21" y1="12" x2="19" y2="12"/>
      <line x1="12" y1="21" x2="12" y2="19"/>
      <line x1="3" y1="12" x2="5" y2="12"/>
    </svg>
  ),
  bills: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.5h10a2 2 0 0 1 2 2V21l-3-1.8-3 1.8-3-1.8L7 21V5.5a2 2 0 0 1 2-2Z"/>
      <path d="M10 8h6"/>
      <path d="M10 12h6"/>
      <path d="M10 16h3"/>
    </svg>
  ),
  savings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2.8 5.7 6.2.9-4.5 4.3 1 6.1L12 17l-5.5 3 1-6.1L3 9.6l6.2-.9L12 3z"/>
    </svg>
  ),
  accounts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5" width="19" height="14" rx="3"/><line x1="2.5" y1="10" x2="21.5" y2="10"/><line x1="16" y1="15" x2="18.5" y2="15"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  receipts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5h10.5A2.5 2.5 0 0 1 19 6v14l-2.5-1.5L14 20l-2.5-1.5L9 20l-2.5-1.5L4 20V6a2.5 2.5 0 0 1 2-2.45z"/>
      <path d="M8 8h7"/>
      <path d="M8 12h8"/>
      <path d="M8 16h5"/>
    </svg>
  ),
  more: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
    </svg>
  ),
  history: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4v5h5"/>
      <path d="M3.5 13a8.5 8.5 0 1 0 2.5-6l-3 2"/>
      <path d="M12 8v4l2.5 2.5"/>
    </svg>
  ),
  lakas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z"/>
    </svg>
  ),
  overview: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h4l2-6 4 12 2-6h4"/>
      <path d="M5 20h14"/>
    </svg>
  ),
  workouts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14V10"/>
      <path d="M8 16V8"/>
      <path d="M16 16V8"/>
      <path d="M20 14V10"/>
      <path d="M8 12h8"/>
      <path d="M2 12h2"/>
      <path d="M20 12h2"/>
    </svg>
  ),
  meals: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v8"/>
      <path d="M5 3v4"/>
      <path d="M9 3v4"/>
      <path d="M7 11v10"/>
      <path d="M15 3v18"/>
      <path d="M15 3c2 1.2 3 3.2 3 6 0 2.4-1 4-3 4"/>
    </svg>
  ),
  activity: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17.5c2.5-5 4.5-7.5 7-7.5 2 0 3 1.5 5 1.5 1.2 0 2-.5 2.5-1"/>
      <circle cx="7" cy="6" r="2"/>
      <path d="M11 22h.01"/>
      <path d="M16 20h.01"/>
      <path d="M20 22h.01"/>
    </svg>
  ),
  habits: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7 9 18l-5-5"/>
      <path d="M4 6h8"/>
      <path d="M4 10h5"/>
    </svg>
  ),
  body: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.5"/>
      <path d="M6 21c.7-4 2.7-6 6-6s5.3 2 6 6"/>
      <path d="M8 10h8"/>
      <path d="M9 10v5"/>
      <path d="M15 10v5"/>
    </svg>
  ),
  goals: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V4"/>
      <path d="M5 5h11l-1.8 3L16 11H5"/>
      <path d="M12 15l2 2 4-5"/>
    </svg>
  ),
  reminders: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9"/>
      <path d="M10 21h4"/>
      <path d="M12 3V2"/>
    </svg>
  ),
  tala: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 4.8L19 9.6l-4.2 3.1.1 5.3L12 15.2 9.1 18l.1-5.3L5 9.6l5.2-1.8L12 3z"/>
      <path d="M4 20h16"/>
    </svg>
  ),
  today: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2"/>
      <path d="M12 20v2"/>
      <path d="m4.93 4.93 1.41 1.41"/>
      <path d="m17.66 17.66 1.41 1.41"/>
      <path d="M2 12h2"/>
      <path d="M20 12h2"/>
      <path d="m6.34 17.66-1.41 1.41"/>
      <path d="m19.07 4.93-1.41 1.41"/>
    </svg>
  ),
  journal: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v18H7.5A2.5 2.5 0 0 1 5 17.5z"/>
      <path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H19"/>
      <path d="M9 7h6"/>
      <path d="M9 10h5"/>
    </svg>
  ),
  mood: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M8 10h.01"/>
      <path d="M16 10h.01"/>
      <path d="M8.5 15c1.8 1.4 5.2 1.4 7 0"/>
    </svg>
  ),
  tasks: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13"/>
      <path d="M8 12h13"/>
      <path d="M8 18h13"/>
      <path d="M3 6l1 1 2-2"/>
      <path d="M3 12l1 1 2-2"/>
      <path d="M3 18l1 1 2-2"/>
    </svg>
  ),
  insights: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5"/>
      <path d="M4 19h16"/>
      <path d="m7 15 3-4 3 2 5-7"/>
      <path d="M18 6h2v2"/>
    </svg>
  ),
}

const STREAK_MILESTONES = [3, 7, 14]
const HEADER_EXP_LABELS = {
  dashboard: 'Money momentum',
  calendar: 'Tracking habit',
  breakdown: 'Trend view',
  accounts: 'Balance view',
  bills: 'Payment habit',
}

const APP_SPACES = [
  { id: 'takda', label: 'Takda', meta: 'Finance', iconKey: 'finance' },
  { id: 'lakas', label: 'Lakas', meta: 'Fitness', iconKey: 'lakas' },
  { id: 'tala', label: 'Tala', meta: 'Mind', iconKey: 'tala' },
]

function getEmailActionSettings() {
  if (typeof window === 'undefined') return undefined
  return {
    url: `${window.location.origin}/login`,
    handleCodeInApp: false,
  }
}

export default function AppShell({ user }) {
  const [activeSpace, setActiveSpace] = useState('takda')
  const [page, setPage] = useState('dashboard')
  const [lakasPage, setLakasPage] = useState('today')
  const [talaPage, setTalaPage] = useState('today')
  const [data, setData] = useState({
    income: [],
    expenses: [],
    bills: [],
    goals: [],
    accounts: [],
    budgets: [],
    receipts: [],
    transfers: [],
    lakasRoutines: [],
    lakasWorkouts: [],
    lakasBodyLogs: [],
    lakasActivities: [],
    lakasHabits: [],
    lakasReminders: [],
    lakasMeals: [],
    lakasGoals: [],
    talaCheckins: [],
    talaJournal: [],
    talaMoods: [],
    talaTasks: [],
    talaGoals: [],
  })
  const [profile, setProfile] = useState({})
  const [gamificationReady, setGamificationReady] = useState(false)
  const [celebrationToast, setCelebrationToast] = useState(null)
  const [quickAddMenuOpen, setQuickAddMenuOpen] = useState(false)
  const [quickAddSheet, setQuickAddSheet] = useState({ open: false, mode: 'manual', type: 'expense', initialEntry: null })
  const [askTakdaOpen, setAskTakdaOpen] = useState(false)
  const [mobileNavMenuOpen, setMobileNavMenuOpen] = useState(false)
  const [calendarQuickAddDate, setCalendarQuickAddDate] = useState('')
  const [emailVerified, setEmailVerified] = useState(() => Boolean(auth.currentUser?.emailVerified || user?.emailVerified))
  const [verifyBannerMsg, setVerifyBannerMsg] = useState({ text: '', ok: false })
  const [verifySending, setVerifySending] = useState(false)
  const [syncIssue, setSyncIssue] = useState(null)
  const [billPaymentTarget, setBillPaymentTarget] = useState(null)
  const previousGamificationRef = useRef(null)
  const celebrationToastRef = useRef(null)
  const toastQueueRef = useRef([])
  const toastTimerRef = useRef(null)
  const syncingDueTransactionsRef = useRef(false)
  const preferredSpaceAppliedRef = useRef(false)
  const loadFlagsRef = useRef({
    income: false,
    expenses: false,
    bills: false,
    goals: false,
    accounts: false,
    budgets: false,
    receipts: false,
    transfers: false,
    profile: false,
  })

  function markLoaded(key) {
    if (loadFlagsRef.current[key]) return
    loadFlagsRef.current[key] = true
    if (Object.values(loadFlagsRef.current).every(Boolean)) {
      setGamificationReady(true)
    }
  }

  function clearCelebrationToastTimer() {
    if (!toastTimerRef.current) return
    window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = null
  }

  function dismissCelebrationToast() {
    clearCelebrationToastTimer()
    const nextToast = toastQueueRef.current.shift() || null
    celebrationToastRef.current = nextToast
    setCelebrationToast(nextToast)
    if (!nextToast) return
    toastTimerRef.current = window.setTimeout(() => {
      dismissCelebrationToast()
    }, 3200)
  }

  function showCelebrationToast(toast) {
    celebrationToastRef.current = toast
    setCelebrationToast(toast)
    clearCelebrationToastTimer()
    toastTimerRef.current = window.setTimeout(() => {
      dismissCelebrationToast()
    }, 3200)
  }

  function enqueueCelebrationToasts(toasts = []) {
    const incoming = toasts.filter(Boolean)
    if (!incoming.length) return

    if (celebrationToastRef.current) {
      toastQueueRef.current.push(...incoming)
      return
    }

    const [firstToast, ...rest] = incoming
    toastQueueRef.current.push(...rest)
    showCelebrationToast(firstToast)
  }

  function handleRealtimeError(key, error) {
    console.error(`Buhay sync failed for ${key}`, error)
    if (Object.prototype.hasOwnProperty.call(loadFlagsRef.current, key)) {
      markLoaded(key)
    }
    setSyncIssue({
      title: 'Sync needs a refresh',
      message: 'Some of your data could not update in real time. Check your connection, then refresh Buhay.',
    })
  }

  useEffect(() => {
    if (!user) return
    preferredSpaceAppliedRef.current = false
    setProfile({})
    setGamificationReady(false)
    setSyncIssue(null)
    loadFlagsRef.current = {
      income: false,
      expenses: false,
      bills: false,
      goals: false,
      accounts: false,
      budgets: false,
      receipts: false,
      transfers: false,
      profile: false,
    }
    const uid = user.uid
    const unsubs = [
      listenCol(uid, 'income', rows => {
        setData(d => ({ ...d, income: rows }))
        markLoaded('income')
      }, error => handleRealtimeError('income', error)),
      listenCol(uid, 'expenses', rows => {
        setData(d => ({ ...d, expenses: rows }))
        markLoaded('expenses')
      }, error => handleRealtimeError('expenses', error)),
      listenCol(uid, 'bills', rows => {
        setData(d => ({ ...d, bills: rows }))
        markLoaded('bills')
      }, error => handleRealtimeError('bills', error)),
      listenCol(uid, 'goals', rows => {
        setData(d => ({ ...d, goals: rows }))
        markLoaded('goals')
      }, error => handleRealtimeError('goals', error)),
      listenCol(uid, 'accounts', rows => {
        setData(d => ({ ...d, accounts: rows }))
        markLoaded('accounts')
      }, error => handleRealtimeError('accounts', error)),
      listenCol(uid, 'budgets', rows => {
        setData(d => ({ ...d, budgets: rows }))
        markLoaded('budgets')
      }, error => handleRealtimeError('budgets', error)),
      listenCol(uid, 'receipts', rows => {
        setData(d => ({ ...d, receipts: rows }))
        markLoaded('receipts')
      }, error => handleRealtimeError('receipts', error)),
      listenCol(uid, 'transfers', rows => {
        setData(d => ({ ...d, transfers: rows }))
        markLoaded('transfers')
      }, error => handleRealtimeError('transfers', error)),
      listenProfile(uid, p => {
        setProfile(p)
        markLoaded('profile')
      }, error => handleRealtimeError('profile', error)),
    ]
    return () => unsubs.forEach(u => u())
  }, [user])

  useEffect(() => {
    if (preferredSpaceAppliedRef.current) return
    if (!['takda', 'lakas', 'tala'].includes(profile?.preferredSpace)) return
    preferredSpaceAppliedRef.current = true
    setActiveSpace(profile.preferredSpace)
    if (profile.preferredSpace === 'takda') setPage('dashboard')
  }, [profile?.preferredSpace])

  useEffect(() => {
    if (!user || (activeSpace !== 'lakas' && page !== 'settings')) return undefined

    const uid = user.uid
    const unsubs = LAKAS_COLLECTIONS.map(collectionName => (
      listenCol(uid, collectionName, rows => {
        setData(d => ({ ...d, [collectionName]: rows }))
      }, error => handleRealtimeError(collectionName, error))
    ))

    return () => unsubs.forEach(unsub => unsub())
  }, [activeSpace, page, user])

  useEffect(() => {
    if (!user || (activeSpace !== 'tala' && page !== 'settings')) return undefined

    const uid = user.uid
    const unsubs = TALA_COLLECTIONS.map(collectionName => (
      listenCol(uid, collectionName, rows => {
        setData(d => ({ ...d, [collectionName]: rows }))
      }, error => handleRealtimeError(collectionName, error))
    ))

    return () => unsubs.forEach(unsub => unsub())
  }, [activeSpace, page, user])

  useEffect(() => {
    if (!user?.uid || !data.accounts.length) return

    const dueTransactions = [
      ...data.income.map(tx => ({ ...tx, type: 'income' })),
      ...data.expenses.map(tx => ({ ...tx, type: 'expense' })),
    ].filter(tx => tx.accountBalanceLinked && tx.accountId && !tx.accountBalanceApplied)

    if (!dueTransactions.length || syncingDueTransactionsRef.current) return

    syncingDueTransactionsRef.current = true
    fsSyncDueLinkedTransactions(user.uid, dueTransactions, data.accounts)
      .catch(error => {
        console.error('Buhay could not sync due linked transactions', error)
        setSyncIssue({
          title: 'Balance sync paused',
          message: 'Buhay could not apply some due linked transactions. Refresh, then check your account balances.',
        })
      })
      .finally(() => {
        syncingDueTransactionsRef.current = false
      })
  }, [user, data.accounts, data.expenses, data.income])

  const symbol = getCurrencySymbol(profile.currency || 'PHP')
  const privacyMode = Boolean(profile.privacyMode)
  const gamification = useMemo(
    () => getGamificationSnapshot(data, profile),
    [data, profile],
  )

  useEffect(() => {
    if (!gamification) return

    if (!gamificationReady || previousGamificationRef.current == null) {
      previousGamificationRef.current = gamification
      return
    }

    const previous = previousGamificationRef.current
    const nextToasts = []

    if (gamification.level > previous.level) {
      nextToasts.push({
        eyebrow: 'Level up',
        title: `Buhay Level ${gamification.level} reached`,
        meta: 'Your trusted life habits just moved up another step.',
      })
    }

    const streakMilestone = STREAK_MILESTONES.find(target => (
      gamification.currentStreakDays >= target && previous.currentStreakDays < target
    ))

    if (streakMilestone) {
      nextToasts.push({
        eyebrow: 'Streak milestone',
        title: `${streakMilestone}-day rhythm`,
        meta: 'Your logging habit is starting to feel automatic. Protect the streak tomorrow.',
      })
    }

    if (
      gamification.weeklyCheckins >= gamification.weeklyTarget &&
      previous.weeklyCheckins < previous.weeklyTarget
    ) {
      nextToasts.push({
        eyebrow: 'Weekly target hit',
        title: `${gamification.weeklyTarget} check-ins done`,
        meta: 'That weekly rhythm is what keeps the product useful day to day.',
      })
    }

    enqueueCelebrationToasts(nextToasts)

    previousGamificationRef.current = gamification
  }, [gamification, gamificationReady])

  useEffect(() => {
    return () => {
      clearCelebrationToastTimer()
    }
  }, [])

  useEffect(() => {
    function handleKeydown(event) {
      if (event.key !== 'Escape') return
      setMobileNavMenuOpen(false)
      setQuickAddMenuOpen(false)
      setAskTakdaOpen(false)
      setQuickAddSheet(current => current.open ? { ...current, open: false } : current)
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  useEffect(() => {
    setMobileNavMenuOpen(false)
    setQuickAddMenuOpen(false)
    setAskTakdaOpen(false)
    if (activeSpace !== 'takda' || page !== 'calendar') setCalendarQuickAddDate('')
  }, [activeSpace, page])

  useEffect(() => {
    const nextVerified = Boolean(auth.currentUser?.emailVerified || user?.emailVerified)
    setEmailVerified(nextVerified)
    if (nextVerified) setVerifyBannerMsg({ text: '', ok: false })
  }, [user])

  const nav = [
    { id: 'dashboard', label: 'Home', iconKey: 'home', section: 'Core' },
    { id: 'calendar', label: 'Calendar', iconKey: 'calendar', section: null },
    { id: 'savings', label: 'Savings', iconKey: 'savings', section: null },
    { id: 'accounts', label: 'Accounts', iconKey: 'accounts', section: null },
    { id: 'history', label: 'History', iconKey: 'history', section: 'More' },
    { id: 'receipts', label: 'Receipts', iconKey: 'receipts', section: null },
    { id: 'breakdown', label: 'Breakdown', iconKey: 'breakdown', section: null },
    { id: 'budget', label: 'Budget', iconKey: 'budget', section: null },
    { id: 'bills', label: 'Bills', iconKey: 'bills', section: null },
    { id: 'settings', label: 'Settings', iconKey: 'settings', section: 'Account' },
  ]
  const lakasNav = [
    { id: 'today', label: 'Today', iconKey: 'today', section: 'Core' },
    { id: 'train', label: 'Train', iconKey: 'workouts', section: null },
    { id: 'log', label: 'Log', iconKey: 'history', section: null },
    { id: 'nutrition', label: 'Nutrition', iconKey: 'meals', section: 'Fuel' },
    { id: 'progress', label: 'Progress', iconKey: 'body', section: 'Review' },
    { id: 'settings', label: 'Settings', iconKey: 'settings', section: 'Manage' },
  ]
  const talaNav = [
    { id: 'today', label: 'Today', iconKey: 'today', section: 'Core' },
    { id: 'journal', label: 'Journal', iconKey: 'journal', section: null },
    { id: 'mood', label: 'Mood', iconKey: 'mood', section: null },
    { id: 'tasks', label: 'Tasks', iconKey: 'tasks', section: null },
    { id: 'goals', label: 'Goals', iconKey: 'goals', section: 'More' },
    { id: 'calendar', label: 'Calendar', iconKey: 'calendar', section: null },
    { id: 'insights', label: 'Insights', iconKey: 'insights', section: null },
    { id: 'settings', label: 'Settings', iconKey: 'settings', section: 'Manage' },
  ]

  const financePages = { dashboard: Dashboard, calendar: Calendar, history: History, receipts: Receipts, savings: Savings, accounts: Accounts, breakdown: Breakdown, budget: Budget, bills: Bills, settings: Settings }
  const PageComponent = activeSpace === 'lakas' ? Lakas : activeSpace === 'tala' ? Tala : financePages[page] || Dashboard
  const headerExpLabel = activeSpace === 'takda' ? HEADER_EXP_LABELS[page] || '' : ''
  const activeSpaceConfig = APP_SPACES.find(space => space.id === activeSpace) || APP_SPACES[0]
  const activeSpaceProgress = gamification?.spaces?.[activeSpace] || gamification
  const activeStatusLabel = activeSpace === 'takda' ? headerExpLabel : `${activeSpaceConfig.label} progress`
  const pageGamification = activeSpace === 'takda' && page !== 'settings' ? activeSpaceProgress : gamification
  const isCalendarPage = activeSpace === 'takda' && page === 'calendar'
  const pageBoundaryKey = activeSpace === 'takda' ? page : activeSpace
  const currentSidebarNav = activeSpace === 'lakas' ? lakasNav : activeSpace === 'tala' ? talaNav : nav

  const financeBottomNav = [
    { id: 'dashboard', label: 'Home', iconKey: 'home', space: 'takda' },
    { id: 'calendar', label: 'Calendar', iconKey: 'calendar', space: 'takda' },
    { id: 'savings', label: 'Savings', iconKey: 'savings', space: 'takda' },
    { id: 'accounts', label: 'Accounts', iconKey: 'accounts', space: 'takda' },
  ]
  const lakasBottomNav = [
    { id: 'today', label: 'Today', iconKey: 'today', space: 'lakas' },
    { id: 'train', label: 'Train', iconKey: 'workouts', space: 'lakas' },
    { id: 'log', label: 'Log', iconKey: 'history', space: 'lakas' },
    { id: 'nutrition', label: 'Food', iconKey: 'meals', space: 'lakas' },
  ]
  const talaBottomNav = [
    { id: 'today', label: 'Today', iconKey: 'today', space: 'tala' },
    { id: 'journal', label: 'Journal', iconKey: 'journal', space: 'tala' },
    { id: 'mood', label: 'Mood', iconKey: 'mood', space: 'tala' },
    { id: 'tasks', label: 'Tasks', iconKey: 'tasks', space: 'tala' },
  ]
  const bottomNav = activeSpace === 'lakas' ? lakasBottomNav : activeSpace === 'tala' ? talaBottomNav : financeBottomNav
  const financeMoreNav = nav
    .filter(item => ['history', 'receipts', 'breakdown', 'budget', 'bills', 'settings'].includes(item.id))
    .map(item => ({
      ...item,
      iconKey: item.id,
      space: 'takda',
    }))
  const lakasMoreNav = lakasNav
    .filter(item => ['progress', 'settings'].includes(item.id))
    .map(item => ({ ...item, space: 'lakas' }))
  const talaMoreNav = talaNav
    .filter(item => ['goals', 'calendar', 'insights', 'settings'].includes(item.id))
    .map(item => ({ ...item, space: 'tala' }))
  const mobileMoreNav = activeSpace === 'lakas' ? lakasMoreNav : activeSpace === 'tala' ? talaMoreNav : financeMoreNav
  const mobileMoreTitle = activeSpace === 'lakas' ? 'More Lakas' : activeSpace === 'tala' ? 'More Tala' : 'More'
  const mobileMoreMeta = activeSpace === 'lakas'
    ? 'Open progress, goals, body tracking, reminders, and settings.'
    : activeSpace === 'tala'
      ? 'Open goals, calendar, insights, and settings.'
      : 'Open the rest of your tools here.'
  const isMorePage = activeSpace === 'lakas'
    ? lakasMoreNav.some(item => item.id === lakasPage)
    : activeSpace === 'tala'
      ? talaMoreNav.some(item => item.id === talaPage)
      : financeMoreNav.some(item => item.id === page)
  const isBottomNavItemActive = item => (
    item.space === 'lakas'
      ? activeSpace === 'lakas' && lakasPage === item.id
      : item.space === 'tala'
        ? activeSpace === 'tala' && talaPage === item.id
        : activeSpace === 'takda' && page === item.id
  )

  const { theme, toggle: toggleTheme } = useTheme()

  function openSpace(nextSpace) {
    setMobileNavMenuOpen(false)
    setQuickAddMenuOpen(false)
    setAskTakdaOpen(false)
    setQuickAddSheet(current => current.open ? { ...current, open: false } : current)
    setActiveSpace(['lakas', 'tala'].includes(nextSpace) ? nextSpace : 'takda')
  }

  function navigateToFinancePage(nextPage = 'dashboard') {
    setActiveSpace('takda')
    setPage(nextPage || 'dashboard')
  }

  function handleBottomNavSelect(item) {
    if (item.space === 'lakas') {
      openSpace('lakas')
      setLakasPage(item.id || 'today')
      return
    }

    if (item.space === 'tala') {
      openSpace('tala')
      setTalaPage(item.id || 'today')
      return
    }

    navigateToFinancePage(item.id || 'dashboard')
  }

  async function handleTogglePrivacy() {
    await fsSetProfile(user.uid, { privacyMode: !privacyMode })
  }

  function toggleQuickAddMenu() {
    if (quickAddSheet.open) return
    setAskTakdaOpen(false)
    setMobileNavMenuOpen(false)
    setQuickAddMenuOpen(current => !current)
  }

  function toggleMobileNavMenu() {
    setQuickAddMenuOpen(false)
    setAskTakdaOpen(false)
    setMobileNavMenuOpen(current => !current)
  }

  function openAskTakda() {
    setMobileNavMenuOpen(false)
    setQuickAddMenuOpen(false)
    setQuickAddSheet(current => current.open ? { ...current, open: false } : current)
    setAskTakdaOpen(true)
  }

  function openQuickAdd(type) {
    setMobileNavMenuOpen(false)
    setAskTakdaOpen(false)
    setQuickAddMenuOpen(false)
    setQuickAddSheet({ open: true, mode: 'manual', type, initialEntry: null })
  }

  function openQuickImport() {
    setMobileNavMenuOpen(false)
    setAskTakdaOpen(false)
    setQuickAddMenuOpen(false)
    setQuickAddSheet({ open: true, mode: 'import', type: 'expense', initialEntry: null })
  }

  function openGroceryMode() {
    setMobileNavMenuOpen(false)
    setAskTakdaOpen(false)
    setQuickAddMenuOpen(false)
    setQuickAddSheet({ open: true, mode: 'grocery', type: 'expense', initialEntry: null })
  }

  function closeQuickAdd() {
    setQuickAddSheet(current => ({ ...current, open: false, initialEntry: null }))
  }

  function handleQuickAddTypeChange(nextType) {
    setQuickAddSheet(current => (
      current.mode !== 'manual' || !current.open || current.type === nextType
        ? current
        : { ...current, type: nextType }
    ))
  }

  async function handleQuickImportResult(parsed) {
    if (!parsed) return
    const nextType = parsed.type === 'income' ? 'income' : 'expense'
    const nextDraft = getDefaultTransactionDraft(nextType)
    const nextCat = sanitizeTransactionCategory(nextType, parsed.cat || nextDraft.cat)
    const matchedPreset = findPresetByLabel(nextType, parsed.desc || '')
    const nextPreset = matchedPreset && !matchedPreset.isCustom && matchedPreset.cat === nextCat ? matchedPreset : null
    const nextSubcat = sanitizeTransactionSubcategory(nextType, nextCat, parsed.subcat || nextPreset?.subcat || nextDraft.subcat)
    const receiptDraft = parsed.source === 'receipt'
      ? {
          merchant: parsed.desc || '',
          currency: parsed.currency || profile.currency || 'PHP',
          reference: parsed.reference || '',
          rawText: parsed.rawText || '',
          confidence: parsed.confidence || '',
          lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
          originalBlob: parsed.originalBlob || null,
          cleanedBlob: parsed.cleanedBlob || null,
          cleanupSummary: parsed.cleanupSummary || '',
          imageWidth: parsed.imageWidth || 0,
          imageHeight: parsed.imageHeight || 0,
          cleanedWidth: parsed.cleanedWidth || 0,
          cleanedHeight: parsed.cleanedHeight || 0,
          fileName: parsed.fileName || 'receipt.jpg',
        }
      : null
    setQuickAddSheet({
      open: true,
      mode: 'manual',
      type: nextType,
      initialEntry: {
        type: nextType,
        amount: parsed.amount ? String(parsed.amount) : '',
        date: parsed.date || quickAddDefaultDate || '',
        desc: parsed.desc || '',
        cat: nextCat,
        subcat: nextSubcat,
        presetKey: nextPreset?.key || '',
        source: parsed.source || 'receipt',
        receiptDraft,
      },
    })
  }

  async function handleResendVerification() {
    const currentUser = auth.currentUser
    if (!currentUser?.email) return
    if (emailVerified) {
      setVerifyBannerMsg({ text: 'Your email is already verified.', ok: true })
      return
    }

    setVerifySending(true)
    try {
      await sendEmailVerification(currentUser, getEmailActionSettings())
      setVerifyBannerMsg({ text: `Verification email sent to ${currentUser.email}.`, ok: true })
    } catch {
      setVerifyBannerMsg({ text: 'Could not send a verification email.', ok: false })
    } finally {
      setVerifySending(false)
    }
  }

  function handleNotificationAction(alert) {
    const action = alert?.action || {}
    if (action.page === 'lakas') {
      openSpace('lakas')
    } else if (action.page === 'tala') {
      openSpace('tala')
    } else if (action.page) {
      navigateToFinancePage(action.page)
    }
    if (action.type === 'payBill' && action.billId) {
      setBillPaymentTarget({ billId: action.billId, at: Date.now() })
    }
  }

  function handleCommandNavigate(nextPage) {
    if (nextPage === 'lakas') {
      openSpace('lakas')
      setLakasPage('today')
      return
    }

    if (nextPage === 'tala') {
      openSpace('tala')
      setTalaPage('today')
      return
    }

    navigateToFinancePage(nextPage)
  }

  const quickAddDefaultDate = isCalendarPage && calendarQuickAddDate ? calendarQuickAddDate : undefined

  const pageProps = {
    user,
    data,
    profile,
    symbol,
    privacyMode,
    gamification: pageGamification,
    billPaymentTarget,
    activeTab: activeSpace === 'lakas' ? lakasPage : activeSpace === 'tala' ? talaPage : page,
    onTogglePrivacy: handleTogglePrivacy,
    onSelectedDateChange: setCalendarQuickAddDate,
  }

  const quickAddDialogLabel = quickAddSheet.mode === 'import'
    ? 'Import transaction'
    : quickAddSheet.mode === 'grocery'
      ? 'Grocery mode'
      : quickAddSheet.type === 'income'
        ? 'Log income'
        : 'Track expense'

  return (
    <div className={`${styles.shell} ${isCalendarPage ? styles.shellCalendar : ''} ${activeSpace === 'lakas' ? styles.shellLakas : ''} ${activeSpace === 'tala' ? styles.shellTala : ''}`}>
      <a href="#app-main" className="skipLink">Skip to main content</a>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div>
            <div className={styles.logo}>Buhay</div>
            <div className={styles.logoMeta}>All-in-one tracker</div>
          </div>
        </div>
        <div className={styles.spaceSwitcher} role="group" aria-label="Switch app space">
          {APP_SPACES.map(space => (
            <button
              key={space.id}
              type="button"
              className={`${styles.spaceButton} ${activeSpace === space.id ? styles.spaceButtonActive : ''}`}
              onClick={() => openSpace(space.id)}
              aria-pressed={activeSpace === space.id}
            >
              <span className={styles.spaceIcon}>{NAV_ICONS[space.iconKey]}</span>
              <span className={styles.spaceCopy}>
                <span className={styles.spaceName}>{space.label}</span>
                <span className={styles.spaceMeta}>{space.meta}</span>
              </span>
            </button>
          ))}
        </div>
        <nav className={styles.sidebarNav} aria-label={activeSpace === 'lakas' ? 'Lakas navigation' : activeSpace === 'tala' ? 'Tala navigation' : 'Finance navigation'}>
          {currentSidebarNav.map(n => (
            <div key={n.id}>
              {n.section && <div className={styles.navSection}>{n.section}</div>}
              <button
                type="button"
                className={`${styles.navItem} ${activeSpace === 'lakas' ? lakasPage === n.id ? styles.active : '' : activeSpace === 'tala' ? talaPage === n.id ? styles.active : '' : page === n.id ? styles.active : ''}`}
                onClick={() => {
                  if (activeSpace === 'lakas') {
                    setLakasPage(n.id)
                    return
                  }
                  if (activeSpace === 'tala') {
                    setTalaPage(n.id)
                    return
                  }
                  navigateToFinancePage(n.id)
                }}
                aria-current={activeSpace === 'lakas' ? lakasPage === n.id ? 'page' : undefined : activeSpace === 'tala' ? talaPage === n.id ? 'page' : undefined : page === n.id ? 'page' : undefined}
              >
                <span className={styles.icon} aria-hidden="true">{NAV_ICONS[n.iconKey]}</span> {n.label}
              </button>
            </div>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.sidebarBottomLabel}>Signed in</div>
          <div className={styles.userCard}>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>{getInitials(user.displayName || user.email)}</div>
              <div className={styles.userCopy}>
                <div className={styles.userName}>{user.displayName || 'User'}</div>
                <div className={styles.userEmail}>{user.email}</div>
              </div>
            </div>
          </div>
          <button type="button" className={styles.btnLogout} onClick={() => signOut(auth)}>Log out</button>
        </div>
      </aside>
      <div className={`${styles.mainWrap} ${isCalendarPage ? styles.mainWrapCalendar : ''}`}>
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <div>
              <div className={styles.topBarLogo}>{activeSpaceConfig.label}</div>
              <div className={styles.topBarMeta}>{activeSpaceConfig.meta} space</div>
            </div>
            <div className={styles.mobileSpaceSwitch} role="group" aria-label="Switch app space">
              {APP_SPACES.map(space => (
                <button
                  key={space.id}
                  type="button"
                  className={`${styles.mobileSpaceButton} ${activeSpace === space.id ? styles.mobileSpaceButtonActive : ''}`}
                  onClick={() => openSpace(space.id)}
                  aria-pressed={activeSpace === space.id}
                >
                  {space.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.topBarRight}>
            {activeStatusLabel && activeSpaceProgress && (
              <div
                className={styles.topBarStatus}
                aria-label={`${activeStatusLabel}. Level ${activeSpaceProgress.level}. ${activeSpaceProgress.totalExp} EXP.`}
              >
                <div className={styles.topBarStatusBadge}>Lv {activeSpaceProgress.level}</div>
                <div className={styles.topBarStatusMain}>
                  <div className={styles.topBarStatusLabel}>{activeStatusLabel}</div>
                  <div className={styles.topBarStatusMeta}>{activeSpaceProgress.totalExp} EXP</div>
                </div>
              </div>
            )}
            <button
              type="button"
              className={styles.themeBtn}
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            {activeSpace === 'takda' && (
              <NotificationBell data={data} profile={profile} privacyMode={privacyMode} onAction={handleNotificationAction} />
            )}
          </div>
        </header>
        {syncIssue && (
          <div className={styles.syncBannerWrap}>
            <div className={styles.syncBanner} role="alert">
              <div className={styles.syncBannerIcon} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4"/>
                  <path d="M12 17h.01"/>
                  <path d="M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z"/>
                </svg>
              </div>
              <div className={styles.syncBannerCopy}>
                <div className={styles.syncBannerTitle}>{syncIssue.title}</div>
                <div className={styles.syncBannerMeta}>{syncIssue.message}</div>
              </div>
              <button type="button" className={styles.syncBannerAction} onClick={() => window.location.reload()}>
                Refresh
              </button>
              <button type="button" className={styles.syncBannerDismiss} onClick={() => setSyncIssue(null)} aria-label="Dismiss sync warning">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        )}
        {celebrationToast && (
          <div className={styles.levelToastWrap}>
            <div className={styles.levelToast} role="status" aria-live="polite">
              <button
                type="button"
                className={styles.levelToastDismiss}
                onClick={dismissCelebrationToast}
                aria-label="Dismiss celebration notification"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <div className={styles.levelToastEyebrow}>{celebrationToast.eyebrow}</div>
              <div className={styles.levelToastTitle}>{celebrationToast.title}</div>
              <div className={styles.levelToastMeta}>
                {celebrationToast.meta}
              </div>
            </div>
          </div>
        )}
        {!!user?.email && !emailVerified && (
          <div className={styles.verifyBannerWrap}>
            <div className={styles.verifyBanner}>
              <div>
                <div className={styles.verifyBannerEyebrow}>Verify your email</div>
                <div className={styles.verifyBannerTitle}>Finish setting up your account</div>
                <div className={styles.verifyBannerMeta}>
                  You can keep using Buhay, but verified accounts are easier to recover and change securely.
                </div>
                {verifyBannerMsg.text && (
                  <div className={`${styles.verifyBannerStatus} ${verifyBannerMsg.ok ? styles.verifyBannerStatusOk : styles.verifyBannerStatusWarn}`}>
                    {verifyBannerMsg.text}
                  </div>
                )}
              </div>
              <div className={styles.verifyBannerActions}>
                <button className={styles.verifyBannerPrimary} onClick={handleResendVerification} disabled={verifySending}>
                  {verifySending ? 'Sending...' : 'Resend email'}
                </button>
              </div>
            </div>
          </div>
        )}
        <main id="app-main" className={`${styles.main} ${isCalendarPage ? styles.mainCalendar : ''}`}>
          <PageErrorBoundary key={pageBoundaryKey} onRecover={() => navigateToFinancePage('dashboard')}>
            <Suspense fallback={<PageLoading />}>
              <PageComponent {...pageProps} />
            </Suspense>
          </PageErrorBoundary>
        </main>
      </div>
      {activeSpace === 'takda' && (quickAddMenuOpen || quickAddSheet.open) && (
        <div
          className={styles.fabBackdrop}
          aria-hidden="true"
          onClick={() => {
            setQuickAddMenuOpen(false)
            closeQuickAdd()
          }}
        />
      )}
      {activeSpace === 'takda' && (
        <div className={`${styles.fabWrap} ${mobileNavMenuOpen ? styles.fabWrapHidden : ''}`}>
          {quickAddMenuOpen && (
            <div className={styles.fabMenu} role="menu" aria-label="Quick add actions">
              <button type="button" className={`${styles.fabAction} ${styles.fabActionAsk}`} onClick={openAskTakda} role="menuitem">
                <span className={styles.fabActionIcon}>AI</span>
                <span className={styles.fabActionText}>Ask Takda</span>
              </button>
              <button type="button" className={`${styles.fabAction} ${styles.fabActionExpense}`} onClick={() => openQuickAdd('expense')} role="menuitem">
                <span className={styles.fabActionIcon}>−</span>
                <span className={styles.fabActionText}>Expense</span>
              </button>
              <button type="button" className={`${styles.fabAction} ${styles.fabActionIncome}`} onClick={() => openQuickAdd('income')} role="menuitem">
                <span className={styles.fabActionIcon}>+</span>
                <span className={styles.fabActionText}>Income</span>
              </button>
              <button type="button" className={`${styles.fabAction} ${styles.fabActionImport}`} onClick={openQuickImport} role="menuitem">
                <span className={styles.fabActionIcon}>🧾</span>
                <span className={styles.fabActionText}>Import</span>
              </button>
              <button type="button" className={`${styles.fabAction} ${styles.fabActionGrocery}`} onClick={openGroceryMode} role="menuitem">
                <span className={styles.fabActionIcon}>🛒</span>
                <span className={styles.fabActionText}>Grocery</span>
              </button>
            </div>
          )}
          <button
            className={`${styles.fabButton} ${quickAddMenuOpen ? styles.fabButtonOpen : ''}`}
            onClick={toggleQuickAddMenu}
            aria-expanded={quickAddMenuOpen}
            aria-label="Add transaction"
            aria-haspopup="menu"
          >
            +
          </button>
        </div>
      )}
      <AskTakdaCommand
        open={activeSpace === 'takda' && askTakdaOpen}
        onClose={() => setAskTakdaOpen(false)}
        user={user}
        data={data}
        profile={profile}
        symbol={symbol}
        privacyMode={privacyMode}
        onOpenReceiptScanner={openQuickImport}
        onNavigate={handleCommandNavigate}
      />
      {activeSpace === 'takda' && quickAddSheet.open && (
        <div className={styles.quickAddLayer}>
          <div
            className={`${styles.quickAddSheet} ${quickAddSheet.mode === 'grocery' ? styles.quickAddSheetWide : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={quickAddDialogLabel}
          >
            {quickAddSheet.mode === 'import' ? (
              <ReceiptScanner defaultMode="receipt" onResult={handleQuickImportResult} onClose={closeQuickAdd} />
            ) : quickAddSheet.mode === 'grocery' ? (
              <GroceryMode
                user={user}
                profile={profile}
                accounts={data.accounts}
                symbol={symbol}
                defaultDate={quickAddDefaultDate}
                onClose={closeQuickAdd}
              />
            ) : (
              <>
                <div className={styles.quickAddHeader}>
                  <div>
                    <div className={styles.quickAddEyebrow}>Quick add</div>
                    <div className={styles.quickAddTitle} id="quick-add-title">
                      {quickAddSheet.type === 'income' ? 'Log income' : 'Track expense'}
                    </div>
                  </div>
                  <button type="button" className={styles.quickAddClose} onClick={closeQuickAdd} aria-label="Close quick add">✕</button>
                </div>
                <QuickAdd
                  user={user}
                  profile={profile}
                  accounts={data.accounts}
                  symbol={symbol}
                  defaultType={quickAddSheet.type}
                  defaultDate={quickAddDefaultDate}
                  initialEntry={quickAddSheet.initialEntry}
                  onTypeChange={handleQuickAddTypeChange}
                  onClose={closeQuickAdd}
                />
              </>
            )}
          </div>
        </div>
      )}
      {mobileNavMenuOpen && (
        <>
          <button
            type="button"
            className={styles.mobileNavBackdrop}
            onClick={() => setMobileNavMenuOpen(false)}
            aria-label="Close more pages"
          />
          <div className={styles.mobileNavSheet} role="dialog" aria-modal="true" aria-labelledby="mobile-more-title" aria-describedby="mobile-more-description">
            <div className="srOnly" id="mobile-more-description">Extra app pages and tools.</div>
            <div className={styles.mobileNavSheetHandle} aria-hidden="true" />
            <div className={styles.mobileNavSheetHeader}>
              <div>
                <div className={styles.mobileNavSheetTitle} id="mobile-more-title">{mobileMoreTitle}</div>
                <div className={styles.mobileNavSheetMeta}>{mobileMoreMeta}</div>
              </div>
              <button
                type="button"
                className={styles.mobileNavSheetClose}
                onClick={() => setMobileNavMenuOpen(false)}
                aria-label="Close more pages"
              >
                ✕
              </button>
            </div>
            <div className={styles.mobileNavList}>
              {mobileMoreNav.map(n => (
                <button
                  key={n.id}
                  type="button"
                  className={`${styles.mobileNavLink} ${n.space === 'lakas' ? lakasPage === n.id ? styles.mobileNavLinkActive : '' : n.space === 'tala' ? talaPage === n.id ? styles.mobileNavLinkActive : '' : page === n.id ? styles.mobileNavLinkActive : ''}`}
                  onClick={() => {
                    if (n.space === 'lakas') {
                      openSpace('lakas')
                      setLakasPage(n.id)
                    } else if (n.space === 'tala') {
                      openSpace('tala')
                      setTalaPage(n.id)
                    } else {
                      navigateToFinancePage(n.id)
                    }
                    setMobileNavMenuOpen(false)
                  }}
                  aria-current={n.space === 'lakas' ? lakasPage === n.id ? 'page' : undefined : n.space === 'tala' ? talaPage === n.id ? 'page' : undefined : page === n.id ? 'page' : undefined}
                >
                  <span className={styles.mobileNavLinkIcon}>{NAV_ICONS[n.iconKey]}</span>
                  <span className={styles.mobileNavLinkCopy}>
                    <span className={styles.mobileNavLinkLabel}>{n.label}</span>
                    <span className={styles.mobileNavLinkMeta}>{n.section || 'More'}</span>
                  </span>
                  <span className={styles.mobileNavLinkChevron}>›</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <nav className={styles.bottomNav} aria-label="Primary navigation">
        {bottomNav.map(n => (
          <button
            key={`${n.space}-${n.id}`}
            type="button"
            className={`${styles.bottomNavItem} ${isBottomNavItemActive(n) ? styles.active : ''}`}
            onClick={() => handleBottomNavSelect(n)}
            aria-current={isBottomNavItemActive(n) ? 'page' : undefined}
          >
            <span className={styles.bottomNavIcon}>{NAV_ICONS[n.iconKey]}</span>
            <span className={styles.bottomNavLabel}>{n.label}</span>
          </button>
        ))}
        {!!mobileMoreNav.length && (
          <button
          type="button"
          className={`${styles.bottomNavItem} ${(isMorePage || mobileNavMenuOpen) ? styles.active : ''}`}
          onClick={toggleMobileNavMenu}
          aria-expanded={mobileNavMenuOpen}
          aria-label="More pages"
          aria-haspopup="dialog"
        >
          <span className={styles.bottomNavIcon}>{NAV_ICONS.more}</span>
          <span className={styles.bottomNavLabel}>More</span>
        </button>
        )}
      </nav>
    </div>
  )
}
