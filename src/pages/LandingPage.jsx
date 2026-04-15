import { Link, useNavigate } from 'react-router-dom'
import RouteMeta from '../components/RouteMeta'
import { auth } from '../lib/firebase'
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_HREF, LEGAL_OPERATOR_NAME } from '../lib/legal'
import styles from './LandingPage.module.css'

const FEATURES = [
  { icon: '📅', title: 'Calendar-first money tracking', desc: 'See income, expenses, and projected closing balance directly on each day of the month.' },
  { icon: '🏦', title: 'Account-linked balances', desc: 'Connect entries to cash, bank, e-wallet, credit card, investment, or other accounts so balances stay honest.' },
  { icon: '🧾', title: 'Receipt box with OCR assist', desc: 'Scan receipts, clean the image, review merchant/date/total/line items, then save the receipt and images.' },
  { icon: '🛒', title: 'Grocery mode', desc: 'Build a grocery trip from price tags or manual items, then save one clean expense with item details.' },
  { icon: '🎯', title: 'Budgets, bills, and savings goals', desc: 'Plan category limits, recurring commitments, target dates, and contributions in the same monthly system.' },
  { icon: '📊', title: 'Breakdown, history, and reports', desc: 'Search transactions, compare months, inspect categories, export data, and print monthly summaries.' },
  { icon: '🔒', title: 'Privacy mode everywhere', desc: 'Mask sensitive money values across dashboard, calendar, accounts, reports, receipts, and charts.' },
  { icon: '☁️', title: 'Realtime sync as a PWA', desc: 'Use it on phone or desktop with Firebase sync and installable web-app behavior.' },
]

const USE_CASES = [
  {
    title: 'Know the day your month gets tight',
    desc: 'The calendar shows projected daily closing balances, so you can adjust before a bill or spending day catches you off guard.',
  },
  {
    title: 'Log fast without messy data',
    desc: 'Quick add, receipt import, wallet screenshots, and grocery mode all end in the same reviewed transaction flow.',
  },
  {
    title: 'Keep the whole money picture together',
    desc: 'Accounts, budgets, bills, receipts, savings goals, and reports all point back to one monthly picture.',
  },
]

const HERO_CELLS = [
  { day: '15', balance: '42,860', tone: 'healthy' },
  { day: '16', balance: '41,520', tone: 'expense' },
  { day: '17', balance: '41,520', tone: 'healthy' },
  { day: '18', balance: '38,940', tone: 'tight' },
  { day: '19', balance: '52,940', tone: 'healthy' },
  { day: '20', balance: '50,710', tone: 'expense' },
  { day: '21', balance: '47,300', tone: 'expense' },
  { day: '22', balance: '47,300', tone: 'selected' },
]

const HERO_PROOF = [
  { label: 'Main view', value: 'Home, Calendar, Accounts, Savings' },
  { label: 'Smart capture', value: 'Receipts, wallet screenshots, grocery trips' },
  { label: 'Control layer', value: 'Budgets, reports, privacy, backups' },
]

const PRODUCT_TOUR = [
  {
    eyebrow: 'Home',
    title: 'Your month at a glance',
    desc: 'Balance, net flow, budget health, savings progress, recent activity, and EXP all sit on the dashboard.',
    stat: '₱47.3K',
    meta: 'Projected balance',
    tone: 'green',
  },
  {
    eyebrow: 'Calendar',
    title: 'Tap a day, see the closing balance',
    desc: 'Daily income, expenses, account movement, and manual balance overrides stay tied to the date they affect.',
    stat: 'Apr 22',
    meta: 'Selected day',
    tone: 'blue',
  },
  {
    eyebrow: 'Receipts',
    title: 'Scan, review, save proof',
    desc: 'Receipt photos are cleaned, optionally OCR-read, reviewed by the user, then saved with image and line-item data.',
    stat: '24',
    meta: 'Receipts saved',
    tone: 'amber',
  },
  {
    eyebrow: 'Accounts',
    title: 'Balances stay connected',
    desc: 'Cash, bank, e-wallet, credit card, investments, and other accounts update from linked transactions.',
    stat: '6',
    meta: 'Account types',
    tone: 'purple',
  },
]

const INCLUDED_TOOLS = [
  'Home dashboard with balance, net flow, budget health, savings, and recent activity',
  'Calendar forecast with daily closing balances and date/month/year jump',
  'Income and expense tracking with categories, subcategories, recurrence, and account links',
  'Accounts for cash, bank, e-wallet, credit card, investment, and other balances',
  'Receipt scanner, editable receipt review, receipt box, thumbnails, filters, and analytics',
  'Grocery mode for price-tag scanning and one-trip expense saving',
  'Savings goals with target date, contribution updates, and progress summaries',
  'Budgets, spending breakdowns, searchable history, exports, restores, and printable reports',
]

const PRIVACY_POINTS = [
  { title: 'Client-side cleanup first', desc: 'Receipt images are cleaned locally before optional OCR, and users review details before saving.' },
  { title: 'Per-user Firestore data', desc: 'App data is stored under each signed-in user and protected by user-scoped Firestore rules.' },
  { title: 'Privacy mode built in', desc: 'Financial values can be masked across the app for safer use in public or while screen sharing.' },
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
        title="Takda — Calendar-First Finance App for Daily Balances, Receipts, Budgets, and Goals"
        description="Track income, expenses, accounts, receipts, budgets, savings goals, and daily closing balances in one mobile-first finance app."
        path="/"
      />
      <a href="#landing-main" className="skipLink">Skip to main content</a>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <div className={styles.navLogo}>Takda</div>
            <div className={styles.navTag}>Calendar-first finance, receipts, budgets, and goals</div>
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
          <div className={styles.heroBadge}>Bawat piso, sinusubaybayan.</div>
          <h1 className={styles.heroTitle}>
            Your money app should show
            <span className={styles.heroAccent}> what happens next.</span>
          </h1>
          <p className={styles.heroSub}>
            Takda is a calendar-first finance app for daily closing balances, account-linked transactions, OCR-assisted receipts, budgets, savings goals, reports, and privacy-first money tracking.
          </p>
          <div className={styles.heroBtns}>
            <button className={styles.btnPrimary} onClick={openPrimary}>{primaryLabel}</button>
            <button className={styles.btnSecondary} onClick={goLogin}>Log in</button>
          </div>
          <div className={styles.heroNote}>Full access. Installable PWA. Works on phone and desktop.</div>
          <div className={styles.heroProof}>
            {HERO_PROOF.map(item => (
              <div key={item.label} className={styles.heroProofCard}>
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
            <div className={styles.heroPanelApp}>Takda app preview</div>
            <div className={styles.heroPanelSync}>Realtime view</div>
          </div>
          <div className={styles.heroPanelTop}>
            <div>
              <div className={styles.heroPanelEyebrow}>Projected closing balance</div>
              <div className={styles.heroPanelTitle}>April 2026</div>
              <div className={styles.heroPanelMeta}>Sample calendar view with income, expenses, and account-linked balance movement</div>
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
              <div className={styles.heroBalanceBarLabel}>Selected day: Apr 22, 2026</div>
              <div className={styles.heroBalanceBarMeta}>Transactions, receipts, budgets, and accounts roll into one daily number.</div>
            </div>
            <div className={styles.heroBalanceBarValue}>₱47,300</div>
          </div>
          <div className={styles.heroMetrics}>
            <div className={styles.heroMetric}>
              <div className={styles.heroMetricLabel}>Receipt box</div>
              <div className={styles.heroMetricValue}>24 saved</div>
            </div>
            <div className={styles.heroMetric}>
              <div className={styles.heroMetricLabel}>Budget health</div>
              <div className={styles.heroMetricValue}>82%</div>
            </div>
            <div className={styles.heroMetric}>
              <div className={styles.heroMetricLabel}>Money habit</div>
              <div className={styles.heroMetricValue}>Lv 7</div>
            </div>
          </div>
          <div className={styles.heroInsight}>
            <div className={styles.heroInsightKicker}>Why calendar-first matters</div>
            <div className={styles.heroInsightText}>
              A ledger tells you what happened. Takda shows what your balance could look like on each day before the month is over.
            </div>
          </div>
        </div>
      </section>

      <section className={styles.useCases}>
          <div className={styles.sectionTop}>
            <div className={styles.sectionIntro}>
              <div className={styles.sectionLabel}>Why it feels different</div>
              <h2 className={styles.sectionTitle}>Takda connects planning, tracking, and proof.</h2>
            </div>
            <p className={styles.sectionLead}>
            Most finance apps stop at lists. Takda turns your entries into a daily operating view for the month.
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
            <h2 className={styles.sectionTitle}>The app is built around four daily habits.</h2>
          </div>
          <p className={styles.sectionLead}>
            Check the dashboard, inspect the calendar, capture proof, and keep account balances connected.
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
            <h2 className={styles.sectionTitle}>A full money system, not just expense logging</h2>
          </div>
          <p className={styles.sectionLead}>
            The dashboard, calendar, receipts, accounts, budgets, savings, history, breakdowns, and settings all share one source of truth.
          </p>
        </div>
        <div className={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className={`${styles.featureCard} ${
                i === 2 ? styles.featureCardFeature : i === 0 ? styles.featureCardHighlight : ''
              }`}
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
            <h2 className={styles.sectionTitle}>Set a baseline, log reality, read the month</h2>
          </div>
          <p className={styles.sectionLead}>
            Onboarding gives Takda your starting point. Daily use keeps the forecast and reports useful.
          </p>
        </div>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>{isSignedIn ? 'Open the app and set your baseline' : 'Create your account and set your baseline'}</div>
              <div className={styles.stepDesc}>Choose currency, add accounts, and add recurring bills so the app starts from real balances and known commitments.</div>
            </div>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>Log what actually happens</div>
              <div className={styles.stepDesc}>Use quick add, receipt scanning, wallet screenshot import, or grocery mode. Review before anything is saved.</div>
            </div>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNum}>3</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>Use the calendar to stay ahead</div>
              <div className={styles.stepDesc}>Watch each day’s projected closing balance, inspect breakdowns, adjust budgets, and export reports when needed.</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.access}>
        <div className={styles.sectionTop}>
          <div className={styles.sectionIntro}>
            <div className={styles.sectionLabel}>What’s inside</div>
            <h2 className={styles.sectionTitle}>The signed-in app already has the full toolkit.</h2>
          </div>
          <p className={styles.sectionLead}>
            These are not future marketing promises. This landing page now reflects the current app experience.
          </p>
        </div>
        <div className={styles.accessCard}>
          <div className={styles.accessIntro}>
            <div className={styles.accessTitle}>One account, one financial cockpit</div>
            <div className={styles.accessDesc}>
              Takda brings daily balances, transaction capture, receipts, planning, and reporting into one mobile-first workspace instead of scattering them across separate tools.
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
            <h2 className={styles.sectionTitle}>Private enough for real money behavior.</h2>
          </div>
          <p className={styles.sectionLead}>
            Money apps need calm UX, clear review steps, and sensible defaults before users can trust them.
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
            <h2 className={styles.ctaTitle}>Start with a month you can actually read.</h2>
            <p className={styles.ctaSub}>Create your account, add your balances and bills, then use Takda as your daily command center for money decisions.</p>
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
            <div className={styles.footerLogo}>Takda</div>
            <div className={styles.footerTagline}>Daily balances, receipts, goals, and budgets in one calm app.</div>
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
          <div className={styles.footerCopy}>© {new Date().getFullYear()} Takda. Bawat piso, sinusubaybayan.</div>
        </div>
      </footer>
    </div>
  )
}
