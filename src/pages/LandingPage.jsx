import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import styles from './LandingPage.module.css'

const FEATURES = [
  { icon: '📅', title: 'Calendar-led money tracking', desc: 'See spending and income in the shape of your month, not buried in a flat list.' },
  { icon: '⚡', title: 'Quick add from anywhere', desc: 'One add flow across the app. Log an expense, income, or import in seconds.' },
  { icon: '📊', title: 'See each day’s balance clearly', desc: 'Track how your total moves day by day so tight weeks stand out before they become problems.' },
  { icon: '🎯', title: 'Budgets and goals that feel alive', desc: 'Track category limits and savings progress with clear momentum, not spreadsheet fatigue.' },
  { icon: '🧾', title: 'OCR-assisted import', desc: 'Pull in wallet screenshots and receipt totals, then review before anything gets saved.' },
  { icon: '☁️', title: 'Secure, synced, and personal', desc: 'Your data stays attached to your account so your ledger is available across devices.' },
]

const USE_CASES = [
  {
    title: 'Day-to-day clarity',
    desc: 'See which exact days stay healthy, tighten up, or drift negative before the last week arrives.',
  },
  {
    title: 'Faster daily logging',
    desc: 'One persistent add flow keeps entry consistent whether you are on Calendar, Charts, Accounts, or Home.',
  },
  {
    title: 'A calmer money habit',
    desc: 'The app stays helpful without turning every screen into a warning or a guilt trip.',
  },
]

const HERO_CELLS = [
  { day: '23', balance: '321,204', tone: 'healthy' },
  { day: '24', balance: '319,812', tone: 'expense' },
  { day: '25', balance: '319,812', tone: 'healthy' },
  { day: '26', balance: '321,204', tone: 'healthy' },
  { day: '27', balance: '320,869', tone: 'healthy' },
  { day: '28', balance: '320,869', tone: 'healthy' },
  { day: '29', balance: '320,869', tone: 'healthy' },
  { day: '30', balance: '320,869', tone: 'selected' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const isSignedIn = Boolean(auth.currentUser)
  const primaryLabel = isSignedIn ? 'Open the app' : 'Create your account'
  const navPrimaryLabel = isSignedIn ? 'Open the app' : 'Get started'
  const ctaPrimaryLabel = isSignedIn ? 'Open the app' : 'Get started'
  const openPrimary = () => navigate(isSignedIn ? '/app' : '/login')
  const goLogin = () => navigate('/login')
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <div className={styles.navLogo}>Takda</div>
            <div className={styles.navTag}>Personal finance tracker for Filipinos</div>
          </div>
          <div className={styles.navActions}>
            <button className={styles.navLink} onClick={goLogin}>Log in</button>
            <button className={styles.navCta} onClick={openPrimary}>{navPrimaryLabel}</button>
          </div>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.heroBadge}>See your balance every day, not just after the damage is done.</div>
          <h1 className={styles.heroTitle}>
            Keep the whole month
            <span className={styles.heroAccent}> visible while you’re still in it.</span>
          </h1>
          <p className={styles.heroSub}>
            Takda puts balances, income, expenses, and recurring bills into one clear month view so the next tight day is obvious before it becomes a problem.
          </p>
          <div className={styles.heroBtns}>
            <button className={styles.btnPrimary} onClick={openPrimary}>{primaryLabel}</button>
            <button className={styles.btnSecondary} onClick={goLogin}>Log in</button>
          </div>
          <div className={styles.heroNote}>Free to start. No credit card. Works on phone and desktop.</div>
        </div>
        <div className={styles.heroPanel}>
          <div className={styles.heroPanelBar}>
            <div className={styles.heroPanelDots}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.heroPanelApp}>Takda workspace</div>
            <div className={styles.heroPanelSync}>Synced</div>
          </div>
          <div className={styles.heroPanelTop}>
            <div>
              <div className={styles.heroPanelEyebrow}>Daily balance calendar</div>
              <div className={styles.heroPanelTitle}>April 2026</div>
            </div>
            <div className={styles.heroPill}>Desktop view</div>
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
              <div className={styles.heroBalanceBarLabel}>Balance for Apr 30, 2026</div>
              <div className={styles.heroBalanceBarMeta}>One calm place to read the selected day.</div>
            </div>
            <div className={styles.heroBalanceBarValue}>₱320,869</div>
          </div>
        </div>
      </section>

      <section className={styles.useCases}>
        <div className={styles.sectionTop}>
          <div className={styles.sectionIntro}>
            <div className={styles.sectionLabel}>Why it feels better</div>
            <h2 className={styles.sectionTitle}>A finance app should make the month clearer, not heavier.</h2>
          </div>
          <p className={styles.sectionLead}>
            Takda is designed around one job: help you understand this month while you are still living inside it.
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

      <section className={styles.features}>
        <div className={styles.sectionTop}>
          <div className={styles.sectionIntro}>
            <div className={styles.sectionLabel}>What you get</div>
            <h2 className={styles.sectionTitle}>Built to make tracking feel clear, not punishing</h2>
          </div>
          <p className={styles.sectionLead}>
            The product stays calm because the calendar, add flow, imports, budgets, and goals all reinforce the same mental model.
          </p>
        </div>
        <div className={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className={`${styles.featureCard} ${
                i === 2 ? styles.featureCardFeature : i === 1 ? styles.featureCardHighlight : ''
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
            <h2 className={styles.sectionTitle}>Set it up once, then stay ahead each day</h2>
          </div>
          <p className={styles.sectionLead}>
            No spreadsheet marathon. Just enough setup to make your next few weeks legible, then quick daily updates to keep them honest.
          </p>
        </div>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>{isSignedIn ? 'Open the app and set your baseline' : 'Create your account and set your baseline'}</div>
              <div className={styles.stepDesc}>Add balances and recurring bills so the forecast starts from real numbers instead of an empty profile.</div>
            </div>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>Track from one consistent add flow</div>
              <div className={styles.stepDesc}>Log expense, income, or import from anywhere without hunting for page-specific buttons.</div>
            </div>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNum}>3</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>Use the calendar to stay ahead</div>
              <div className={styles.stepDesc}>See daily balances, budget pressure, and where to adjust before the month gets away from you.</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Start with a clearer month, not a heavier setup.</h2>
          <p className={styles.ctaSub}>Create your account first, then Takda drops you into setup with the right next step.</p>
          <button className={styles.btnPrimary} onClick={openPrimary}>{ctaPrimaryLabel}</button>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <div className={styles.footerLogo}>Takda</div>
            <div className={styles.footerTagline}>Bawat piso, sinusubaybayan.</div>
          </div>
          <div className={styles.footerLinks}>
            <span onClick={openPrimary} style={{ cursor: 'pointer' }}>{isSignedIn ? 'Open app' : 'Get started'}</span>
            <span>·</span>
            <span onClick={goLogin} style={{ cursor: 'pointer' }}>Log in</span>
          </div>
          <div className={styles.footerCopy}>© {new Date().getFullYear()} Takda. Simple personal finance tracking for Filipinos.</div>
        </div>
      </footer>
    </div>
  )
}
