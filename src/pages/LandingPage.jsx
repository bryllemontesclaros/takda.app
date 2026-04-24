import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import RouteMeta from '../components/RouteMeta'
import { auth } from '../lib/firebase'
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_HREF, LEGAL_OPERATOR_NAME } from '../lib/legal'
import styles from './LandingPage.module.css'

const FEATURES = [
  { icon: '💸', title: 'Takda keeps money honest', tone: 'takda', desc: 'Accounts, bills, receipts, budgets, savings, and calendar balances stay review-first so money does not get double-counted.' },
  { icon: '🏋️', title: 'Lakas starts safe', tone: 'lakas', desc: 'Beginner routines, form cues, rest timers, sets, reps, meals, body logs, and habits help fitness build from real sessions.' },
  { icon: '🌙', title: 'Tala keeps reflection private', tone: 'tala', desc: 'Check-ins, journals, moods, tasks, and life goals stay gentle, private, and separate from performance pressure.' },
  { icon: '📅', title: 'One daily review', tone: 'buhay', desc: 'Open today, choose the space that needs attention, and keep finance, fitness, and reflection from becoming one messy feed.' },
  { icon: '📷', title: 'Photos stay review-first', tone: 'lakas', desc: 'Receipt scans and meal photos help capture details, but the user reviews before anything changes saved data.' },
  { icon: '🎯', title: 'Goals have context', tone: 'tala', desc: 'Track money targets, workout rhythm, habits, body progress, and personal milestones without hiding where each goal belongs.' },
  { icon: '🔒', title: 'Control stays visible', tone: 'takda', desc: 'Privacy mode, exports, restore, delete controls, notifications, and settings stay close to the data they protect.' },
  { icon: '☁️', title: 'Installable and synced', tone: 'buhay', desc: 'Use Buhay on phone or desktop with Firebase sync, responsive screens, service worker caching, and app-like navigation.' },
]

const USE_CASES = [
  {
    title: 'Start with one space',
    desc: 'Pick Takda, Lakas, or Tala. Buhay does not need your whole life on day one.',
  },
  {
    title: 'Add real data only',
    desc: 'No fake workouts, moods, receipts, or transactions. The app becomes useful because the logs are real.',
  },
  {
    title: 'Review without mixing everything',
    desc: 'Money, body, and mind share one account, but each keeps its own language, tabs, and boundaries.',
  },
]

const HERO_CELLS = [
  { day: 'Takda', balance: 'Money', tone: 'takda' },
  { day: 'Lakas', balance: 'Fitness', tone: 'lakas' },
  { day: 'Tala', balance: 'Mind', tone: 'tala' },
  { day: 'Bills', balance: 'Due', tone: 'takda' },
  { day: 'Meals', balance: 'Photo', tone: 'lakas' },
  { day: 'Mood', balance: 'Check-in', tone: 'tala' },
  { day: 'Goals', balance: 'Progress', tone: 'buhay' },
  { day: 'Today', balance: 'Review', tone: 'selected' },
]

const HERO_PROOF = [
  { label: 'Takda', tone: 'takda', value: 'Money, bills, receipts' },
  { label: 'Lakas', tone: 'lakas', value: 'Workouts, meals, progress' },
  { label: 'Tala', tone: 'tala', value: 'Journal, mood, tasks' },
]

const PRODUCT_TOUR = [
  {
    eyebrow: 'Takda',
    title: 'Money that stays accountable',
    desc: 'Use accounts, transactions, bills, receipts, savings, budgets, and calendar balances with clear review steps before data affects history.',
    stat: '₱47.3K',
    meta: 'Projected balance',
    tone: 'takda',
  },
  {
    eyebrow: 'Lakas',
    title: 'Fitness that starts light',
    desc: 'Follow beginner-safe sessions, watch proper-form videos, track sets and rest, then save the real workout, meal, activity, or body log.',
    stat: '12',
    meta: 'Guided tools',
    tone: 'lakas',
  },
  {
    eyebrow: 'Tala',
    title: 'Reflection without pressure',
    desc: 'Do one check-in, write privately, log mood patterns, clear tasks, and review life goals without turning reflection into a score.',
    stat: '7d',
    meta: 'Journal streak',
    tone: 'tala',
  },
  {
    eyebrow: 'Buhay',
    title: 'One account, shared controls',
    desc: 'Buhay keeps login, privacy mode, notifications, backups, restore, data deletion, legal pages, and PWA navigation consistent across every space.',
    stat: '1',
    meta: 'Secure account',
    tone: 'buhay',
  },
]

const INCLUDED_TOOLS = [
  'Takda: dashboard, calendar, accounts, history, bills, budget, savings, receipts, grocery trips, reports, and Ask Takda',
  'Lakas: beginner sessions, routines, workout logs, exercise details, meals, activity, body progress, habits, reminders, and goals',
  'Tala: daily check-ins, private journal, mood, energy, stress, sleep, tasks, life goals, calendar patterns, tags, and insights',
  'Photos: receipt scanning and meal photo logs with editable review before saving',
  'Controls: privacy mode, settings, feedback, notifications, legal pages, backup, restore, export, and deletion',
  'Platform: email/password auth, onboarding, per-user Firebase data, responsive navigation, PWA install support, and service worker caching',
]

const PRIVACY_POINTS = [
  { title: 'Review before save', desc: 'Receipts, imports, commands, meal logs, workouts, tasks, and goals are user-reviewed instead of silently changing data.' },
  { title: 'Per-user Firestore data', desc: 'Finance, fitness, and mind data are stored under each signed-in user and protected by user-scoped Firestore rules.' },
  { title: 'Clear product boundaries', desc: 'Takda tracks money, Lakas tracks fitness, and Tala tracks reflection. Buhay is a tracker, not financial, medical, or mental-health advice.' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [authReady, setAuthReady] = useState(() => Boolean(auth.currentUser))
  const [isSignedIn, setIsSignedIn] = useState(() => Boolean(auth.currentUser))

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, currentUser => {
      setIsSignedIn(Boolean(currentUser))
      setAuthReady(true)
    })
    return () => unsub()
  }, [])

  const primaryLabel = authReady
    ? (isSignedIn ? 'Open the app' : 'Create your account')
    : 'Open Buhay'
  const navPrimaryLabel = primaryLabel
  const ctaPrimaryLabel = primaryLabel
  const openPrimary = () => navigate(isSignedIn ? '/app' : '/login')
  const goLogin = () => navigate('/login')
  return (
    <div className={styles.page}>
      <RouteMeta
        title="Buhay — All-in-One Life Tracker for Finance, Fitness, Mind, and Goals"
        description="Check in with money, body, and mind using Takda finance, Lakas fitness, and Tala reflection spaces in one calm app."
        path="/"
      />
      <a href="#landing-main" className="skipLink">Skip to main content</a>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <div className={styles.navLogo}>Buhay</div>
            <div className={styles.navTag}>Takda finance, Lakas fitness, Tala mind</div>
          </div>
          <div className={styles.navActions}>
            <button className={styles.navLink} onClick={goLogin}>Log in</button>
            <button className={styles.navCta} onClick={openPrimary}>{navPrimaryLabel}</button>
          </div>
        </div>
      </nav>

      <main id="landing-main">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.heroBadge}>Bawat araw, mas malinaw.</div>
          <h1 className={styles.heroTitle}>
            Check in with money, body, and mind
            <span className={styles.heroAccent}> without mixing them together.</span>
          </h1>
          <p className={styles.heroSub}>
            Buhay gives you three focused spaces: Takda for money, Lakas for fitness, and Tala for reflection and life admin. Start with one space, then add real logs only when they fit your day.
          </p>
          <div className={styles.heroBtns}>
            <button className={styles.btnPrimary} onClick={openPrimary}>{ctaPrimaryLabel}</button>
            <button className={styles.btnSecondary} onClick={goLogin}>Log in</button>
          </div>
          <div className={styles.heroNote}>Only currency is required at setup. Everything else can grow later.</div>
          <div className={styles.heroProof}>
            {HERO_PROOF.map(item => (
              <div key={item.label} className={`${styles.heroProofCard} ${styles[`heroProof${item.tone[0].toUpperCase()}${item.tone.slice(1)}`]}`}>
                <div className={styles.heroProofLabel}>{item.label}</div>
                <div className={styles.heroProofValue}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.heroPanel}>
          <div className={styles.heroPanelBar}>
            <div className={styles.heroPanelDots}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.heroPanelApp}>Buhay daily preview</div>
            <div className={styles.heroPanelSync}>Live sync</div>
          </div>
          <div className={styles.heroPanelTop}>
            <div>
              <div className={styles.heroPanelEyebrow}>One day, three clear spaces</div>
              <div className={styles.heroPanelTitle}>Your life, not one messy feed</div>
              <div className={styles.heroPanelMeta}>Finance stays in Takda. Fitness stays in Lakas. Reflection and life admin stay in Tala.</div>
            </div>
            <div className={styles.heroPill}>Privacy-ready</div>
          </div>
          <div className={styles.heroGrid}>
            {HERO_CELLS.map(cell => (
              <div key={cell.day} className={`${styles.heroCell} ${styles[`heroCell${cell.tone[0].toUpperCase()}${cell.tone.slice(1)}`]}`}>
                <div className={styles.heroCellTop}>
                  <span className={styles.heroCellDay}>{cell.day}</span>
                  {cell.tone === 'selected' && <span className={styles.heroCellPin}>Now</span>}
                </div>
                <div className={styles.heroCellBalance}>{cell.balance}</div>
              </div>
            ))}
          </div>
          <div className={styles.heroBalanceBar}>
            <div>
              <div className={styles.heroBalanceBarLabel}>Today&apos;s review</div>
              <div className={styles.heroBalanceBarMeta}>Open the space that needs attention, do one honest action, then close the loop.</div>
            </div>
            <div className={styles.heroBalanceBarValue}>3 spaces</div>
          </div>
          <div className={styles.heroMetrics}>
            <div className={styles.heroMetric}>
              <div className={styles.heroMetricLabel}>Finance</div>
              <div className={styles.heroMetricValue}>Takda</div>
            </div>
            <div className={styles.heroMetric}>
              <div className={styles.heroMetricLabel}>Fitness</div>
              <div className={styles.heroMetricValue}>Lakas</div>
            </div>
            <div className={styles.heroMetric}>
              <div className={styles.heroMetricLabel}>Mind</div>
              <div className={styles.heroMetricValue}>Tala</div>
            </div>
          </div>
          <div className={styles.heroInsight}>
            <div className={styles.heroInsightKicker}>Why one life app matters</div>
            <div className={styles.heroInsightText}>
              Buhay keeps the product calm: separate spaces, shared privacy, real logs, and no fake progress.
            </div>
          </div>
        </div>
      </section>

      <section className={styles.useCases}>
          <div className={styles.sectionTop}>
            <div className={styles.sectionIntro}>
              <div className={styles.sectionLabel}>Start path</div>
              <h2 className={styles.sectionTitle}>Start with the part of life that needs attention first.</h2>
            </div>
            <p className={styles.sectionLead}>
            Buhay can hold a lot, but it should never ask for everything at once. Start small and let the routine earn the next layer.
            </p>
          </div>
        <div className={styles.useCaseGrid}>
          {USE_CASES.map(item => (
            <div key={item.title} className={styles.useCaseCard}>
              <div className={styles.useCaseTitle}>{item.title}</div>
              <div className={styles.useCaseDesc}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.productTour}>
        <div className={styles.sectionTop}>
          <div className={styles.sectionIntro}>
            <div className={styles.sectionLabel}>10-second tour</div>
            <h2 className={styles.sectionTitle}>Three spaces, three jobs, one account.</h2>
          </div>
          <p className={styles.sectionLead}>
            Open Takda when money needs clarity, Lakas when the body needs a plan, and Tala when the day needs a place to land.
          </p>
        </div>
        <div className={styles.productTourGrid}>
          {PRODUCT_TOUR.map(item => (
            <div key={item.eyebrow} className={`${styles.productTourCard} ${styles[`productTour${item.tone[0].toUpperCase()}${item.tone.slice(1)}`]}`}>
              <div className={styles.productTourTop}>
                <div>
                  <div className={styles.productTourEyebrow}>{item.eyebrow}</div>
                  <div className={styles.productTourTitle}>{item.title}</div>
                </div>
                <div className={styles.productTourStat}>
                  <strong>{item.stat}</strong>
                  <span>{item.meta}</span>
                </div>
              </div>
              <div className={styles.productTourDesc}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.sectionTop}>
          <div className={styles.sectionIntro}>
            <div className={styles.sectionLabel}>What the app does</div>
            <h2 className={styles.sectionTitle}>A life system that stays separated on purpose.</h2>
          </div>
          <p className={styles.sectionLead}>
            Money, workouts, meals, body progress, habits, journal entries, moods, tasks, goals, reminders, reports, and backups stay organized by space.
          </p>
        </div>
        <div className={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className={`${styles.featureCard} ${styles[`featureCard${f.tone[0].toUpperCase()}${f.tone.slice(1)}`]}`}
            >
              <div className={styles.featureIcon}>{f.icon}</div>
              <div className={styles.featureTitle}>{f.title}</div>
              <div className={styles.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.howItWorks}>
        <div className={styles.sectionTop}>
          <div className={styles.sectionIntro}>
            <div className={styles.sectionLabel}>How it works</div>
            <h2 className={styles.sectionTitle}>Pick a space, log what really happened, review gently.</h2>
          </div>
          <p className={styles.sectionLead}>
            Buhay works best when each check-in is small and true. One useful baseline beats a perfect setup that never gets used.
          </p>
        </div>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>{isSignedIn ? 'Open the app and choose where to start' : 'Create your account and choose where to start'}</div>
              <div className={styles.stepDesc}>Pick Takda, Lakas, Tala, or explore first. Only currency is required; accounts, bills, and quick starts can wait.</div>
            </div>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>Log real events only</div>
              <div className={styles.stepDesc}>Capture expenses, receipts, workouts, meals, activity, habits, mood, journal entries, tasks, and goals when they actually happen.</div>
            </div>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNum}>3</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>Review patterns and stay in control</div>
              <div className={styles.stepDesc}>Use calendars, charts, insights, reminders, privacy mode, exports, restores, and settings to keep the app trustworthy.</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.access}>
        <div className={styles.sectionTop}>
          <div className={styles.sectionIntro}>
            <div className={styles.sectionLabel}>What’s inside</div>
            <h2 className={styles.sectionTitle}>The signed-in app has the full toolkit, but you do not have to use it all at once.</h2>
          </div>
          <p className={styles.sectionLead}>
            These are current app surfaces, grouped by the job they do.
          </p>
        </div>
        <div className={styles.accessCard}>
          <div className={styles.accessIntro}>
            <div className={styles.accessTitle}>One account, three life spaces</div>
            <div className={styles.accessDesc}>
              Buhay brings finance, fitness, meals, body progress, journal, mood, tasks, goals, receipts, planning, reports, and privacy controls into one mobile-first workspace.
            </div>
          </div>
          <div className={styles.accessFeatureGrid}>
            {INCLUDED_TOOLS.map(item => (
              <div key={item} className={styles.accessFeatureItem}>{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.privacy}>
        <div className={styles.sectionTop}>
          <div className={styles.sectionIntro}>
            <div className={styles.sectionLabel}>Trust and control</div>
            <h2 className={styles.sectionTitle}>Clear enough to trust with real behavior.</h2>
          </div>
          <p className={styles.sectionLead}>
            Life apps need calm UX, review steps, scoped data, exports, deletion controls, privacy masking, and honest boundaries.
          </p>
        </div>
        <div className={styles.privacyGrid}>
          {PRIVACY_POINTS.map(point => (
            <div key={point.title} className={styles.privacyCard}>
              <div className={styles.privacyTitle}>{point.title}</div>
              <div className={styles.privacyDesc}>{point.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaCard}>
          <div className={styles.ctaCopy}>
            <h2 className={styles.ctaTitle}>Start with one honest check-in.</h2>
            <p className={styles.ctaSub}>Create your account, choose a starting space, then bring in finance, workouts, meals, journal, mood, tasks, and goals at your own pace.</p>
          </div>
          <div className={styles.ctaAction}>
            <button className={styles.btnPrimary} onClick={openPrimary}>{ctaPrimaryLabel}</button>
          </div>
        </div>
      </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>Buhay</div>
            <div className={styles.footerTagline}>Finance, fitness, mind, and life admin in one calm app.</div>
            <div className={styles.footerMeta}>
              Operated by {LEGAL_OPERATOR_NAME}. Support and privacy:{' '}
              <a className={styles.footerAnchor} href={LEGAL_CONTACT_HREF}>{LEGAL_CONTACT_EMAIL}</a>
            </div>
          </div>
          <div className={styles.footerLinks}>
            <button type="button" className={styles.footerButton} onClick={openPrimary}>{primaryLabel}</button>
            <span>·</span>
            <button type="button" className={styles.footerButton} onClick={goLogin}>Log in</button>
            <span>·</span>
            <Link className={styles.footerAnchor} to="/privacy">Privacy</Link>
            <span>·</span>
            <Link className={styles.footerAnchor} to="/terms">Terms</Link>
          </div>
          <div className={styles.footerCopy}>© {new Date().getFullYear()} Buhay. Bawat araw, mas malinaw.</div>
        </div>
      </footer>
    </div>
  )
}
