import { Link, useNavigate } from 'react-router-dom'
import RouteMeta from '../components/RouteMeta'
import { auth } from '../lib/firebase'
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_HREF, LEGAL_OPERATOR_NAME } from '../lib/legal'
import styles from './LandingPage.module.css'

const FEATURES = [
  { icon: '💸', title: 'Takda finance space', tone: 'takda', desc: 'Daily balances, income, expenses, transfers, bills, budgets, savings goals, receipts, grocery trips, reports, and cashflow forecasting.' },
  { icon: '🏋️', title: 'Lakas fitness space', tone: 'lakas', desc: 'Workout logs, routines, exercises, sets, reps, weight, duration, rest, meals, activity, body progress, habits, reminders, and goals.' },
  { icon: '🌙', title: 'Tala mind space', tone: 'tala', desc: 'Daily check-ins, journal entries, mood, energy, stress, sleep quality, tasks, life goals, calendar dots, tags, triggers, and insights.' },
  { icon: '📅', title: 'Calendars that explain the day', tone: 'buhay', desc: 'Finance uses projected closing balances, Lakas shows training patterns, and Tala maps check-ins, moods, tasks, and goals.' },
  { icon: '📷', title: 'Photo-assisted capture', tone: 'lakas', desc: 'Scan receipts for expenses and use meal photo logs for food tracking, with review steps before anything becomes saved data.' },
  { icon: '🎯', title: 'Goals across life areas', tone: 'tala', desc: 'Track money targets, workout consistency, body progress, habits, personal milestones, and life goals without juggling separate apps.' },
  { icon: '🔒', title: 'Privacy and control', tone: 'takda', desc: 'Mask sensitive values, export backups, restore data, delete records, manage notifications, and keep each user under scoped Firebase data.' },
  { icon: '☁️', title: 'Installable real-time PWA', tone: 'buhay', desc: 'Use Buhay on phone or desktop with Firebase sync, responsive mobile-first screens, service worker caching, and app-like navigation.' },
]

const USE_CASES = [
  {
    title: 'One account for the things people actually track',
    desc: 'Money, workouts, meals, body progress, moods, journal entries, tasks, goals, reminders, and backups live in one signed-in app.',
  },
  {
    title: 'Separate spaces, not a messy mega-tab',
    desc: 'Takda, Lakas, and Tala each keep focused tabs and data while Buhay gives them shared navigation, settings, privacy, and sync.',
  },
  {
    title: 'Capture fast, review before saving',
    desc: 'Quick finance entries, receipt scans, grocery trips, meal photos, workouts, habits, moods, and notes all stay editable and user-reviewed.',
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
  { label: 'Takda', tone: 'takda', value: 'Balances, bills, receipts, budgets, savings' },
  { label: 'Lakas', tone: 'lakas', value: 'Workouts, meals, habits, body, activity' },
  { label: 'Tala', tone: 'tala', value: 'Journal, mood, tasks, goals, insights' },
]

const PRODUCT_TOUR = [
  {
    eyebrow: 'Takda',
    title: 'Finance that starts with the calendar',
    desc: 'See daily closing balances, account-linked transactions, recurring bills, receipt proof, grocery trips, budgets, savings goals, reports, and exports in one finance space.',
    stat: '₱47.3K',
    meta: 'Projected balance',
    tone: 'takda',
  },
  {
    eyebrow: 'Lakas',
    title: 'Fitness logging with routines and meals',
    desc: 'Build routines, log exercises, sets, reps, weight, duration, rest, activity, habits, reminders, body measurements, progress photos, and meal photo logs.',
    stat: '12',
    meta: 'Workout tools',
    tone: 'lakas',
  },
  {
    eyebrow: 'Tala',
    title: 'Mind, journal, and life admin',
    desc: 'Track daily check-ins, mood, energy, stress, sleep, gratitude, private journal entries, tags, triggers, tasks, life goals, calendar dots, and insights.',
    stat: '7d',
    meta: 'Journal streak',
    tone: 'tala',
  },
  {
    eyebrow: 'Buhay',
    title: 'Shared safety and app controls',
    desc: 'Buhay keeps account security, privacy mode, notifications, backups, restore, data deletion, legal pages, and PWA navigation consistent across every space.',
    stat: '1',
    meta: 'Secure account',
    tone: 'buhay',
  },
]

const INCLUDED_TOOLS = [
  'Takda home dashboard with balance, net flow, budget health, savings progress, recent activity, EXP, and privacy masking',
  'Takda calendar forecast with daily closing balances, selected-day details, date/month/year jump, and account-linked entries',
  'Income, expense, transfer, bill payment, overdue bill, budget, savings, receipt, grocery, history, breakdown, and report tools',
  'OCR-assisted receipt scanner with image cleanup, editable review, receipt box, thumbnails, merchant/category summaries, and expense saving',
  'Lakas workouts with routines/plans, exercises, sets, reps, weight, duration, rest time, notes, records, and workout calendar patterns',
  'Lakas meals with photo meal logs, activity, steps/cardio, body weight, measurements, progress photos, habits, reminders, and fitness goals',
  'Tala daily check-ins with mood, energy, stress, sleep quality, gratitude, reflection, journal privacy, tags, and triggers',
  'Tala tasks, life goals, calendar dots, insights, streaks, mood trends, data export, and Tala-only reset controls',
  'Whole-app email/password auth, onboarding, settings, feedback, notifications, legal pages, backup/restore, account deletion, and PWA install support',
]

const PRIVACY_POINTS = [
  { title: 'Review before save', desc: 'Receipts, imports, commands, meal logs, workouts, tasks, and goals are user-reviewed instead of silently changing data.' },
  { title: 'Per-user Firestore data', desc: 'Finance, fitness, and mind data are stored under each signed-in user and protected by user-scoped Firestore rules.' },
  { title: 'Privacy mode built in', desc: 'Sensitive money and personal values can be masked across dashboards, calendars, reports, receipts, charts, and logs.' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const isSignedIn = Boolean(auth.currentUser)
  const primaryLabel = isSignedIn ? 'Open the app' : 'Create your account'
  const navPrimaryLabel = primaryLabel
  const ctaPrimaryLabel = primaryLabel
  const openPrimary = () => navigate(isSignedIn ? '/app' : '/login')
  const goLogin = () => navigate('/login')
  return (
    <div className={styles.page}>
      <RouteMeta
        title="Buhay — All-in-One Life Tracker for Finance, Fitness, Mind, and Goals"
        description="Track Takda finance, Lakas workouts and meals, Tala journal and mood, plus tasks, goals, receipts, budgets, backups, and daily life patterns in one app."
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
            Your finance, fitness, and mind
            <span className={styles.heroAccent}> finally share one home.</span>
          </h1>
          <p className={styles.heroSub}>
            Buhay is an all-in-one Filipino life tracker: Takda for money, Lakas for workouts and meals, and Tala for journal, mood, tasks, goals, and daily reflection.
          </p>
          <div className={styles.heroBtns}>
            <button className={styles.btnPrimary} onClick={openPrimary}>{primaryLabel}</button>
            <button className={styles.btnSecondary} onClick={goLogin}>Log in</button>
          </div>
          <div className={styles.heroNote}>Full access. Installable PWA. Real-time sync. Built for phone and desktop.</div>
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
            <div className={styles.heroPanelApp}>Buhay app preview</div>
            <div className={styles.heroPanelSync}>Realtime view</div>
          </div>
          <div className={styles.heroPanelTop}>
            <div>
              <div className={styles.heroPanelEyebrow}>Today across Buhay</div>
              <div className={styles.heroPanelTitle}>3 spaces, 1 account</div>
              <div className={styles.heroPanelMeta}>A sample command view across finance, fitness, meals, journal, mood, tasks, and goals</div>
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
              <div className={styles.heroBalanceBarMeta}>Money, workouts, meals, mood, tasks, goals, and reminders stay separate but easy to reach.</div>
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
              A life app should not flatten everything into one messy feed. Buhay keeps each space focused while sharing login, privacy, backup, and navigation.
            </div>
          </div>
        </div>
      </section>

      <section className={styles.useCases}>
          <div className={styles.sectionTop}>
            <div className={styles.sectionIntro}>
              <div className={styles.sectionLabel}>Why it feels different</div>
              <h2 className={styles.sectionTitle}>Buhay covers the whole routine without becoming chaotic.</h2>
            </div>
            <p className={styles.sectionLead}>
            Most apps solve one slice of life. Buhay gives finance, fitness, meals, journal, mood, tasks, goals, and reminders their own places under one roof.
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
            <h2 className={styles.sectionTitle}>The app is built around three focused spaces.</h2>
          </div>
          <p className={styles.sectionLead}>
            Open Takda for money, Lakas for training and meals, and Tala for reflection, mood, tasks, and life goals.
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
            <h2 className={styles.sectionTitle}>A life system, not another scattered folder of apps</h2>
          </div>
          <p className={styles.sectionLead}>
            Money, workouts, meals, body progress, habits, journal entries, moods, tasks, goals, reminders, reports, and backups stay organized by space but feel like one product.
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
            <h2 className={styles.sectionTitle}>Set your baseline, log reality, review patterns</h2>
          </div>
          <p className={styles.sectionLead}>
            Start with the finance baseline, then add workouts, meals, body progress, mood, journal, tasks, and goals as your routine grows.
          </p>
        </div>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>{isSignedIn ? 'Open the app and set your baseline' : 'Create your account and set your baseline'}</div>
              <div className={styles.stepDesc}>Choose currency, add accounts, and add recurring bills so Takda starts from real balances and known commitments.</div>
            </div>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>Log what actually happens</div>
              <div className={styles.stepDesc}>Capture expenses, receipts, grocery trips, workouts, meals, activity, habits, mood, journal entries, tasks, and goals.</div>
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
            <h2 className={styles.sectionTitle}>The signed-in app already has the full Buhay toolkit.</h2>
          </div>
          <p className={styles.sectionLead}>
            These are not future marketing promises. This landing page now reflects the current app experience.
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
            <h2 className={styles.sectionTitle}>Private enough for real life behavior.</h2>
          </div>
          <p className={styles.sectionLead}>
            Life apps need calm UX, clear review steps, scoped data, exports, deletion controls, and privacy masking before users can trust them.
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
            <h2 className={styles.ctaTitle}>Start with one space, grow into the whole system.</h2>
            <p className={styles.ctaSub}>Create your account, set up Takda finance first, then bring in Lakas workouts and Tala reflection when you are ready.</p>
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
