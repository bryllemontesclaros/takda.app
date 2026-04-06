import { useEffect, useMemo, useRef, useState } from 'react'
import { sendEmailVerification, signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { fsSetProfile, listenCol, listenProfile } from '../lib/firestore'
import { getGamificationSnapshot } from '../lib/gamification'
import { getInitials, getCurrencySymbol } from '../lib/utils'
import Calendar from './Calendar'
import Dashboard from './Dashboard'
import Savings from './Savings'
import Accounts from './Accounts'
import Breakdown from './Breakdown'
import Budget from './Budget'
import Settings from './Settings'
import History from './History'
import QuickAdd from './QuickAdd'
import GroceryMode from './GroceryMode'
import ReceiptScanner from '../components/ReceiptScanner'
import { useTheme } from '../lib/theme.jsx'
import NotificationBell from '../components/NotificationBell'
import styles from './AppShell.module.css'

const NAV_ICONS = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  breakdown: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  budget: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  savings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  accounts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  more: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
    </svg>
  ),
  history: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
      <path d="M12 7v5l3 2"/>
    </svg>
  ),
}

const STREAK_MILESTONES = [3, 7, 14]
const HEADER_EXP_LABELS = {
  dashboard: 'Money momentum',
  calendar: 'Tracking habit',
  breakdown: 'Trend view',
  accounts: 'Balance view',
}

function getEmailActionSettings() {
  if (typeof window === 'undefined') return undefined
  return {
    url: `${window.location.origin}/login`,
    handleCodeInApp: false,
  }
}

export default function AppShell({ user }) {
  const [page, setPage] = useState('dashboard')
  const [data, setData] = useState({ income: [], expenses: [], bills: [], goals: [], accounts: [], budgets: [] })
  const [profile, setProfile] = useState({})
  const [celebrationToast, setCelebrationToast] = useState(null)
  const [quickAddMenuOpen, setQuickAddMenuOpen] = useState(false)
  const [quickAddSheet, setQuickAddSheet] = useState({ open: false, mode: 'manual', type: 'expense', initialEntry: null })
  const [mobileNavMenuOpen, setMobileNavMenuOpen] = useState(false)
  const [calendarQuickAddDate, setCalendarQuickAddDate] = useState('')
  const [emailVerified, setEmailVerified] = useState(() => Boolean(auth.currentUser?.emailVerified || user?.emailVerified))
  const [verifyBannerMsg, setVerifyBannerMsg] = useState({ text: '', ok: false })
  const [verifySending, setVerifySending] = useState(false)
  const previousGamificationRef = useRef(null)
  const toastTimerRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const uid = user.uid
    const unsubs = [
      listenCol(uid, 'income', rows => setData(d => ({ ...d, income: rows }))),
      listenCol(uid, 'expenses', rows => setData(d => ({ ...d, expenses: rows }))),
      listenCol(uid, 'bills', rows => setData(d => ({ ...d, bills: rows }))),
      listenCol(uid, 'goals', rows => setData(d => ({ ...d, goals: rows }))),
      listenCol(uid, 'accounts', rows => setData(d => ({ ...d, accounts: rows }))),
      listenCol(uid, 'budgets', rows => setData(d => ({ ...d, budgets: rows }))),
      listenProfile(uid, p => setProfile(p)),
    ]
    return () => unsubs.forEach(u => u())
  }, [user])

  const symbol = getCurrencySymbol(profile.currency || 'PHP')
  const privacyMode = Boolean(profile.privacyMode)
  const gamification = useMemo(
    () => getGamificationSnapshot(data.income, data.expenses, data.bills, profile),
    [data.income, data.expenses, data.bills, profile],
  )

  useEffect(() => {
    if (!gamification) return

    if (previousGamificationRef.current == null) {
      previousGamificationRef.current = gamification
      return
    }

    const previous = previousGamificationRef.current
    let nextToast = null

    if (gamification.level > previous.level) {
      nextToast = {
        eyebrow: 'Level up',
        title: `Level ${gamification.level} reached`,
        meta: 'Your money momentum just moved up another step.',
      }
    } else {
      const streakMilestone = STREAK_MILESTONES.find(target => (
        gamification.currentStreakDays >= target && previous.currentStreakDays < target
      ))

      if (streakMilestone) {
        nextToast = {
          eyebrow: 'Streak milestone',
          title: `${streakMilestone}-day rhythm`,
          meta: 'Your logging habit is starting to feel automatic. Protect the streak tomorrow.',
        }
      } else if (
        gamification.weeklyCheckins >= gamification.weeklyTarget &&
        previous.weeklyCheckins < previous.weeklyTarget
      ) {
        nextToast = {
          eyebrow: 'Weekly target hit',
          title: `${gamification.weeklyTarget} check-ins done`,
          meta: 'That weekly rhythm is what keeps the product useful day to day.',
        }
      }
    }

    if (nextToast) {
      setCelebrationToast(nextToast)
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = window.setTimeout(() => {
        setCelebrationToast(null)
      }, 3200)
    }

    previousGamificationRef.current = gamification
  }, [gamification])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    function handleKeydown(event) {
      if (event.key !== 'Escape') return
      setMobileNavMenuOpen(false)
      setQuickAddMenuOpen(false)
      setQuickAddSheet(current => current.open ? { ...current, open: false } : current)
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  useEffect(() => {
    setMobileNavMenuOpen(false)
    setQuickAddMenuOpen(false)
    if (page !== 'calendar') setCalendarQuickAddDate('')
  }, [page])

  useEffect(() => {
    const nextVerified = Boolean(auth.currentUser?.emailVerified || user?.emailVerified)
    setEmailVerified(nextVerified)
    if (nextVerified) setVerifyBannerMsg({ text: '', ok: false })
  }, [user])

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: '◈', section: 'Overview' },
    { id: 'calendar', label: 'Calendar', icon: '◻', section: 'Track' },
    { id: 'history', label: 'History', icon: '☰', section: null },
    { id: 'breakdown', label: 'Breakdown', icon: '◑', section: 'Analyse' },
    { id: 'budget', label: 'Budget', icon: '◎', section: null },
    { id: 'accounts', label: 'Accounts', icon: '◉', section: null },
    { id: 'savings', label: 'Savings Goals', icon: '◆', section: null },
    { id: 'settings', label: 'Settings', icon: '⚙', section: 'Account' },
  ]

  const pages = { dashboard: Dashboard, calendar: Calendar, history: History, savings: Savings, accounts: Accounts, breakdown: Breakdown, budget: Budget, settings: Settings }
  const PageComponent = pages[page] || Dashboard
  const headerExpLabel = HEADER_EXP_LABELS[page] || ''

  const bottomNav = [
    { id: 'dashboard', label: 'Home', iconKey: 'home' },
    { id: 'calendar', label: 'Calendar', iconKey: 'calendar' },
    { id: 'savings', label: 'Savings', iconKey: 'savings' },
    { id: 'accounts', label: 'Accounts', iconKey: 'accounts' },
  ]
  const mobileMoreNav = nav
    .filter(item => ['history', 'breakdown', 'budget', 'settings'].includes(item.id))
    .map(item => ({
      ...item,
      iconKey: item.id === 'history' ? 'history' : item.id,
    }))
  const isMorePage = mobileMoreNav.some(item => item.id === page)

  const { theme, toggle: toggleTheme } = useTheme()

  async function handleTogglePrivacy() {
    await fsSetProfile(user.uid, { privacyMode: !privacyMode })
  }

  function toggleQuickAddMenu() {
    if (quickAddSheet.open) return
    setMobileNavMenuOpen(false)
    setQuickAddMenuOpen(current => !current)
  }

  function toggleMobileNavMenu() {
    setQuickAddMenuOpen(false)
    setMobileNavMenuOpen(current => !current)
  }

  function openQuickAdd(type) {
    setMobileNavMenuOpen(false)
    setQuickAddMenuOpen(false)
    setQuickAddSheet({ open: true, mode: 'manual', type, initialEntry: null })
  }

  function openQuickImport() {
    setMobileNavMenuOpen(false)
    setQuickAddMenuOpen(false)
    setQuickAddSheet({ open: true, mode: 'import', type: 'expense', initialEntry: null })
  }

  function openGroceryMode() {
    setMobileNavMenuOpen(false)
    setQuickAddMenuOpen(false)
    setQuickAddSheet({ open: true, mode: 'grocery', type: 'expense', initialEntry: null })
  }

  function closeQuickAdd() {
    setQuickAddSheet(current => ({ ...current, open: false, initialEntry: null }))
  }

  function handleQuickImportResult(parsed) {
    if (!parsed) return
    const nextType = parsed.type === 'income' ? 'income' : 'expense'
    setQuickAddSheet({
      open: true,
      mode: 'manual',
      type: nextType,
      initialEntry: {
        type: nextType,
        amount: parsed.amount ? String(parsed.amount) : '',
        date: parsed.date || quickAddDefaultDate || '',
        desc: parsed.desc || '',
        cat: parsed.cat || 'Other',
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

  const quickAddDefaultDate = page === 'calendar' && calendarQuickAddDate ? calendarQuickAddDate : undefined

  const pageProps = {
    user,
    data,
    profile,
    symbol,
    privacyMode,
    gamification,
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
    <div className={`${styles.shell} ${page === 'calendar' ? styles.shellCalendar : ''}`}>
      <a href="#app-main" className="skipLink">Skip to main content</a>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>Takda</div>
        </div>
        <nav className={styles.sidebarNav} aria-label="Primary navigation">
          {nav.map(n => (
            <div key={n.id}>
              {n.section && <div className={styles.navSection}>{n.section}</div>}
              <button
                type="button"
                className={`${styles.navItem} ${page === n.id ? styles.active : ''}`}
                onClick={() => setPage(n.id)}
                aria-current={page === n.id ? 'page' : undefined}
              >
                <span className={styles.icon} aria-hidden="true">{n.icon}</span> {n.label}
              </button>
            </div>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{getInitials(user.displayName || user.email)}</div>
            <div>
              <div className={styles.userName}>{user.displayName || 'User'}</div>
              <div className={styles.userEmail}>{user.email}</div>
            </div>
          </div>
          <button className={styles.btnLogout} onClick={() => signOut(auth)}>← Log out</button>
        </div>
      </aside>
      <div className={`${styles.mainWrap} ${page === 'calendar' ? styles.mainWrapCalendar : ''}`}>
        <header className={styles.topBar}>
          <div className={styles.topBarLogo}>Takda</div>
          <div className={styles.topBarRight}>
            {headerExpLabel && gamification && (
              <div
                className={styles.topBarStatus}
                aria-label={`${headerExpLabel}. Level ${gamification.level}. ${gamification.totalExp} EXP.`}
              >
                <div className={styles.topBarStatusBadge}>Lv {gamification.level}</div>
                <div className={styles.topBarStatusMain}>
                  <div className={styles.topBarStatusLabel}>{headerExpLabel}</div>
                  <div className={styles.topBarStatusMeta}>{gamification.totalExp} EXP</div>
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
            <NotificationBell data={data} profile={profile} privacyMode={privacyMode} />
          </div>
        </header>
        {celebrationToast && (
          <div className={styles.levelToastWrap}>
            <div className={styles.levelToast} role="status" aria-live="polite">
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
                  You can keep using Takda, but verified accounts are easier to recover and change securely.
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
        <main id="app-main" className={`${styles.main} ${page === 'calendar' ? styles.mainCalendar : ''}`}>
          <PageComponent {...pageProps} />
        </main>
      </div>
      {(quickAddMenuOpen || quickAddSheet.open) && (
        <div
          className={styles.fabBackdrop}
          aria-hidden="true"
          onClick={() => {
            setQuickAddMenuOpen(false)
            closeQuickAdd()
          }}
        />
      )}
      <div className={`${styles.fabWrap} ${mobileNavMenuOpen ? styles.fabWrapHidden : ''}`}>
        {quickAddMenuOpen && (
          <div className={styles.fabMenu} role="menu" aria-label="Quick add actions">
            <button type="button" className={`${styles.fabAction} ${styles.fabActionExpense}`} onClick={() => openQuickAdd('expense')} role="menuitem">
              <span className={styles.fabActionIcon}>−</span>
              <span>Expense</span>
            </button>
            <button type="button" className={`${styles.fabAction} ${styles.fabActionIncome}`} onClick={() => openQuickAdd('income')} role="menuitem">
              <span className={styles.fabActionIcon}>+</span>
              <span>Income</span>
            </button>
            <button type="button" className={`${styles.fabAction} ${styles.fabActionImport}`} onClick={openQuickImport} role="menuitem">
              <span className={styles.fabActionIcon}>🧾</span>
              <span>Import</span>
            </button>
            <button type="button" className={`${styles.fabAction} ${styles.fabActionGrocery}`} onClick={openGroceryMode} role="menuitem">
              <span className={styles.fabActionIcon}>🛒</span>
              <span>Grocery</span>
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
      {quickAddSheet.open && (
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
                  symbol={symbol}
                  defaultType={quickAddSheet.type}
                  defaultDate={quickAddDefaultDate}
                  initialEntry={quickAddSheet.initialEntry}
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
                <div className={styles.mobileNavSheetTitle} id="mobile-more-title">More</div>
                <div className={styles.mobileNavSheetMeta}>Open the rest of your tools here.</div>
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
                  className={`${styles.mobileNavLink} ${page === n.id ? styles.mobileNavLinkActive : ''}`}
                  onClick={() => {
                    setPage(n.id)
                    setMobileNavMenuOpen(false)
                  }}
                  aria-current={page === n.id ? 'page' : undefined}
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
          <button key={n.id} type="button" className={`${styles.bottomNavItem} ${page === n.id ? styles.active : ''}`} onClick={() => setPage(n.id)} aria-current={page === n.id ? 'page' : undefined}>
            <span className={styles.bottomNavIcon}>{NAV_ICONS[n.iconKey]}</span>
            <span className={styles.bottomNavLabel}>{n.label}</span>
          </button>
        ))}
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
      </nav>
    </div>
  )
}
