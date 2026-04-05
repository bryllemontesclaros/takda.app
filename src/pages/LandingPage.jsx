import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

const FEATURES = [
  { icon: '📅', title: 'Calendar-led money tracking', desc: 'See spending and income in the shape of your month, not buried in a flat list.' },
  { icon: '⚡', title: 'Quick add from anywhere', desc: 'One add flow across the app. Log an expense, income, or import in seconds.' },
  { icon: '📊', title: 'Forecast what happens next', desc: 'Projected month-end balances help you catch problems before they get expensive.' },
  { icon: '🎯', title: 'Budgets and goals that feel alive', desc: 'Track category limits and savings progress with clear momentum, not spreadsheet fatigue.' },
  { icon: '🧾', title: 'OCR-assisted import', desc: 'Pull in wallet screenshots and receipt totals, then review before anything gets saved.' },
  { icon: '☁️', title: 'Secure, synced, and personal', desc: 'Your data stays attached to your account so your ledger is available across devices.' },
]

const PROOF_POINTS = [
  { label: 'Month-end forecast', value: 'Catch issues early' },
  { label: 'Quick add flow', value: 'One add flow' },
  { label: 'Receipt import', value: 'Review before save' },
]

const USE_CASES = [
  {
    title: 'Payday-to-payday clarity',
    desc: 'See whether the current month is still healthy, tight, or drifting negative before the last week arrives.',
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

export default function LandingPage() {
  const navigate = useNavigate()
  const openApp = () => navigate('/app')
  const goLogin = () => navigate('/login')
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <div className={styles.navLogo}>Takda</div>
          <div className={styles.navTag}>Personal finance tracker for Filipinos</div>
        </div>
        <div className={styles.navActions}>
          <button className={styles.navLink} onClick={goLogin}>Log in</button>
          <button className={styles.navCta} onClick={openApp}>Open the app</button>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.heroBadge}>Track the month with less guesswork.</div>
          <h1 className={styles.heroTitle}>
            Stay ahead of your money
            <span className={styles.heroAccent}> before month-end sneaks up on you.</span>
          </h1>
          <p className={styles.heroSub}>
            Takda puts income, expenses, bills, and forecasts into one clear month view so daily tracking feels lighter and more useful.
          </p>
          <div className={styles.heroBtns}>
            <button className={styles.btnPrimary} onClick={openApp}>Open the app</button>
            <button className={styles.btnSecondary} onClick={goLogin}>Log in or create an account</button>
          </div>
          <div className={styles.heroNote}>Free to start. No credit card. Works on phone and desktop.</div>
          <div className={styles.heroProof}>
            {PROOF_POINTS.map(item => (
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
            <div className={styles.heroPanelApp}>Takda workspace</div>
            <div className={styles.heroPanelSync}>Synced</div>
          </div>
          <div className={styles.heroPanelTop}>
            <div>
              <div className={styles.heroPanelEyebrow}>Live monthly view</div>
              <div className={styles.heroPanelTitle}>April at a glance</div>
            </div>
            <div className={styles.heroPill}>Projected month-end</div>
          </div>
          <div className={styles.heroForecast}>
            <div className={styles.heroForecastValue}>₱58,420</div>
            <div className={styles.heroForecastMeta}>healthy runway if you keep the next six days light</div>
          </div>
          <div className={styles.heroGrid}>
            {[
              { day: '9', tone: 'expense' },
              { day: '10', tone: 'healthy' },
              { day: '11', tone: 'healthy' },
              { day: '12', tone: 'tight' },
              { day: '13', tone: 'healthy' },
              { day: '14', tone: 'expense' },
              { day: '15', tone: 'healthy' },
              { day: '16', tone: 'healthy' },
            ].map(cell => (
              <div key={cell.day} className={`${styles.heroCell} ${styles[`heroCell${cell.tone[0].toUpperCase()}${cell.tone.slice(1)}`]}`}>
                <span>{cell.day}</span>
              </div>
            ))}
          </div>
          <div className={styles.heroMetrics}>
            <div className={styles.heroMetric}>
              <div className={styles.heroMetricLabel}>Income</div>
              <div className={styles.heroMetricValue} style={{ color: 'var(--accent)' }}>+₱50,000</div>
            </div>
            <div className={styles.heroMetric}>
              <div className={styles.heroMetricLabel}>Expenses</div>
              <div className={styles.heroMetricValue} style={{ color: 'var(--red)' }}>−₱18,750</div>
            </div>
            <div className={styles.heroMetric}>
              <div className={styles.heroMetricLabel}>Net</div>
              <div className={styles.heroMetricValue} style={{ color: 'var(--blue)' }}>+₱31,250</div>
            </div>
          </div>
          <div className={styles.heroInsight}>
            <div className={styles.heroInsightKicker}>Next best move</div>
            <div className={styles.heroInsightText}>Keep the next three days light and your projected month-end stays above your buffer.</div>
          </div>
        </div>
      </section>

      <section className={styles.useCases}>
        <div className={styles.sectionLabel}>Why it feels better</div>
        <h2 className={styles.sectionTitle}>A finance app should make the month clearer, not heavier.</h2>
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
        <div className={styles.sectionLabel}>What you get</div>
        <h2 className={styles.sectionTitle}>Built to make tracking feel clear, not punishing</h2>
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
        <div className={styles.sectionLabel}>How it works</div>
        <h2 className={styles.sectionTitle}>Set it up once, then stay ahead each day</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>Open the app and set your baseline</div>
              <div className={styles.stepDesc}>Add income, balances, and recurring bills so the forecast starts from real numbers.</div>
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
              <div className={styles.stepTitle}>Use the forecast to stay ahead</div>
              <div className={styles.stepDesc}>See projected month-end, budget pressure, and where to adjust before you overspend.</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Open Takda and start with the month in view.</h2>
        <p className={styles.ctaSub}>If you already have an account, this takes you straight in. If not, you’ll land on sign-in first.</p>
        <button className={styles.btnPrimary} onClick={openApp}>Open the app</button>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>Takda</div>
        <div className={styles.footerTagline}>Bawat piso, sinusubaybayan.</div>
        <div className={styles.footerLinks}>
          <span onClick={openApp} style={{ cursor: 'pointer' }}>Open app</span>
          <span>·</span>
          <span onClick={goLogin} style={{ cursor: 'pointer' }}>Log in</span>
        </div>
        <div className={styles.footerCopy}>© {new Date().getFullYear()} Takda. Simple personal finance tracking for Filipinos.</div>
      </footer>
    </div>
  )
}
