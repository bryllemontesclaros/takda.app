import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import RouteMeta from '../components/RouteMeta'
import { auth } from '../lib/firebase'
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_HREF, LEGAL_OPERATOR_NAME } from '../lib/legal'
import styles from './LandingPage.module.css'

const USE_CASES = [
  {
    title: 'Choose one space',
    desc: 'Start with Takda, Lakas, or Tala. Buhay does not need your whole life on day one.',
  },
  {
    title: 'Log what is real',
    desc: 'No fake workouts, moods, receipts, or transactions. The app becomes useful because the records stay honest.',
  },
  {
    title: 'Review without the mess',
    desc: 'Money, body, and mind share one account, but each keeps its own language and boundaries.',
  },
]

const HERO_CELLS = [
  { day: 'Takda', balance: 'Money', tone: 'takda' },
  { day: 'Lakas', balance: 'Fitness', tone: 'lakas' },
  { day: 'Tala', balance: 'Mind', tone: 'tala' },
  { day: 'Bills', balance: 'Due', tone: 'takda' },
  { day: 'Meals', balance: 'Logged', tone: 'lakas' },
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

const PRIVACY_POINTS = [
  { title: 'Review before save', desc: 'Screenshot imports, commands, workouts, tasks, goals, and manual receipt records are user-reviewed instead of silently changing data.' },
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
        description="Track money, fitness, and reflection in three focused spaces inside one account."
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
            Buhay brings together three focused spaces: Takda for money, Lakas for fitness, and Tala for reflection and everyday life. Start with one space, then add real records only when they become useful.
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
              <div className={styles.heroPanelMeta}>Money stays in Takda. Fitness stays in Lakas. Reflection and everyday life stay in Tala.</div>
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
              Buhay keeps things clear: separate spaces, shared privacy, real records, and honest progress.
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

      <section className={styles.privacy}>
        <div className={styles.sectionTop}>
          <div className={styles.sectionIntro}>
            <div className={styles.sectionLabel}>Trust and control</div>
            <h2 className={styles.sectionTitle}>Clear enough to trust with real behavior.</h2>
          </div>
          <p className={styles.sectionLead}>
            Life apps need clear UX, review steps, scoped data, exports, deletion controls, privacy masking, and honest boundaries.
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
            <div className={styles.footerTagline}>Money, fitness, reflection, and everyday clarity in one app.</div>
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
