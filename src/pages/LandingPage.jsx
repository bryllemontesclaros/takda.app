import { Link, useNavigate } from 'react-router-dom'
import RouteMeta from '../components/RouteMeta'
import { auth } from '../lib/firebase'
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_HREF, LEGAL_OPERATOR_NAME } from '../lib/legal'
import styles from './LandingPage.module.css'

const FEATURES = [
  { icon: '💸', title: 'Takda finance space', tone: 'takda', desc: 'Daily balances, transactions, transfers, bills, budgets, savings goals, receipts, grocery trips, reports, and cashflow forecasts.' },
  { icon: '🏋️', title: 'Lakas fitness space', tone: 'lakas', desc: 'Workout logs, routines, sets, reps, weight, duration, rest, meals, body progress, habits, reminders, and fitness goals.' },
  { icon: '🌙', title: 'Tala mind space', tone: 'tala', desc: 'Daily check-ins, journal entries, mood, energy, stress, sleep quality, tasks, life goals, calendar dots, tags, and insights.' },
  { icon: '📅', title: 'Calendar-first review', tone: 'buhay', desc: 'See what happened today, what is coming next, and which life space needs attention without mixing everything into one feed.' },
  { icon: '📷', title: 'Photo-assisted capture', tone: 'lakas', desc: 'Scan receipts and log meal photos with user review before anything becomes saved data.' },
  { icon: '🎯', title: 'Goals across life areas', tone: 'tala', desc: 'Track money targets, workout consistency, habits, body progress, personal milestones, and life goals under one account.' },
  { icon: '🔒', title: 'Privacy and control', tone: 'takda', desc: 'Mask sensitive values, export backups, restore data, delete records, manage notifications, and keep user data scoped.' },
  { icon: '☁️', title: 'Installable real-time PWA', tone: 'buhay', desc: 'Use Buhay on phone or desktop with Firebase sync, responsive screens, service worker caching, and app-like navigation.' },
]

const USE_CASES = [
  {
    title: 'Start with one space',
    desc: 'Begin with Takda finance if you want the strongest baseline, or enter with only the basics and add more later.',
  },
  {
    title: 'Keep each space focused',
    desc: 'Takda, Lakas, and Tala have their own tabs and data, so Buhay feels organized instead of becoming one overloaded dashboard.',
  },
  {
    title: 'Grow when the routine is ready',
    desc: 'Add workouts, meals, moods, journals, tasks, goals, and deeper settings only when they actually fit your day.',
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
  { label: 'Takda', tone: 'takda', value: 'Money calendar, bills, receipts, budgets' },
  { label: 'Lakas', tone: 'lakas', value: 'Training, meals, habits, progress' },
  { label: 'Tala', tone: 'tala', value: 'Journal, mood, tasks, goals' },
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
  'Takda finance: dashboard, calendar forecasts, income, expenses, transfers, bills, budgets, savings, receipts, grocery trips, history, and reports',
  'Lakas fitness: workouts, routines, exercises, gym sessions, sets, reps, rest, meals, activity, body progress, habits, reminders, and goals',
  'Tala mind: check-ins, journal, mood, energy, stress, sleep, gratitude, tasks, life goals, calendar patterns, tags, triggers, and insights',
  'Photo capture: receipt scanning and meal photo logs with editable review before saving',
  'Control layer: privacy mode, settings, feedback, notifications, legal pages, backups, restore, export, and account deletion',
  'App platform: email/password auth, onboarding, per-user Firebase data, responsive navigation, PWA install support, and service worker caching',
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
            One calm home for money, fitness,
            <span className={styles.heroAccent}> and your mind.</span>
          </h1>
          <p className={styles.heroSub}>
            Buhay is an all-in-one Filipino life app. Start with Takda for money, add Lakas for workouts and meals, and use Tala for journal, mood, tasks, goals, and daily reflection.
          </p>
          <div className={styles.heroBtns}>
            <button className={styles.btnPrimary} onClick={openPrimary}>{primaryLabel}</button>
            <button className={styles.btnSecondary} onClick={goLogin}>Log in</button>
          </div>
          <div className={styles.heroNote}>Start simple. Add only what you need. Installable PWA with real-time sync.</div>
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
            <div className={styles.heroPanelApp}>Buhay setup preview</div>
            <div className={styles.heroPanelSync}>Live sync</div>
          </div>
          <div className={styles.heroPanelTop}>
            <div>
              <div className={styles.heroPanelEyebrow}>Your day, separated cleanly</div>
              <div className={styles.heroPanelTitle}>3 focused spaces, 1 account</div>
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
              Buhay does not flatten your life into one messy feed. Each space stays focused while sharing login, privacy, backup, and navigation.
            </div>
          </div>
        </div>
      </section>

      <section className={styles.useCases}>
          <div className={styles.sectionTop}>
            <div className={styles.sectionIntro}>
              <div className={styles.sectionLabel}>Start path</div>
              <h2 className={styles.sectionTitle}>Use one space first, then grow into the whole system.</h2>
            </div>
            <p className={styles.sectionLead}>
            The product is big, but setup should not feel big. Buhay lets you begin lightly and add the rest when your routine is ready.
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
            <h2 className={styles.sectionTitle}>Pick a starting point, log real life, review patterns</h2>
          </div>
          <p className={styles.sectionLead}>
            Buhay works best when it starts small: one useful baseline, real logs, then simple reviews that help you decide what to do next.
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
              <div className={styles.stepDesc}>Capture expenses, receipts, grocery trips, workouts, meals, activity, habits, mood, journal entries, tasks, and goals when they happen.</div>
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
