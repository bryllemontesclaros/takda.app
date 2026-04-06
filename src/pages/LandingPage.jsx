import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_HREF, LEGAL_OPERATOR_NAME } from '../lib/legal'
import styles from './LandingPage.module.css'

const FEATURES = [
  { icon: '📅', title: 'Daily balance calendar', desc: 'Read your month as daily closing balances, not just a list of old transactions.' },
  { icon: '⚡', title: 'Quick logging that stays consistent', desc: 'Use the same quick flow to log income or expenses without hunting through different screens.' },
  { icon: '🧾', title: 'Receipt and wallet import', desc: 'Import receipt photos or wallet screenshots, review the result, and save only what looks right.' },
  { icon: '🛒', title: 'Grocery total mode', desc: 'Build a grocery trip from price tag photos or manual items, then save one clean expense total.' },
  { icon: '🎯', title: 'Bills, budgets, and goals in one place', desc: 'Keep recurring bills, category budgets, and savings goals tied to the same month you are tracking.' },
  { icon: '☁️', title: 'Synced to your account', desc: 'Your balances, entries, and settings stay attached to your account across phone and desktop.' },
]

const USE_CASES = [
  {
    title: 'See the next tight day sooner',
    desc: 'Daily closing balances make it obvious where the month starts tightening before you feel it late.',
  },
  {
    title: 'Keep logging light',
    desc: 'Quick add, imports, and grocery mode reduce friction so the app stays usable every day.',
  },
  {
    title: 'Track the whole picture',
    desc: 'Accounts, bills, budgets, and savings all support the same month view instead of living in separate silos.',
  },
]

const HERO_CELLS = [
  { day: '23', balance: '18,640', tone: 'healthy' },
  { day: '24', balance: '17,920', tone: 'expense' },
  { day: '25', balance: '17,920', tone: 'healthy' },
  { day: '26', balance: '19,420', tone: 'healthy' },
  { day: '27', balance: '18,980', tone: 'expense' },
  { day: '28', balance: '18,980', tone: 'healthy' },
  { day: '29', balance: '18,450', tone: 'expense' },
  { day: '30', balance: '18,450', tone: 'selected' },
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
      <a href="#landing-main" className="skipLink">Skip to main content</a>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <div className={styles.navLogo}>Takda</div>
            <div className={styles.navTag}>Calendar-first money tracking for Filipinos</div>
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
          <div className={styles.heroBadge}>See your month before it surprises you.</div>
          <h1 className={styles.heroTitle}>
            A clearer way to track money
            <span className={styles.heroAccent}> day by day.</span>
          </h1>
          <p className={styles.heroSub}>
            Takda is a calendar-first finance app for Filipinos. See daily closing balances, log income and expenses quickly, and keep bills, budgets, and goals in one calm view.
          </p>
          <div className={styles.heroBtns}>
            <button className={styles.btnPrimary} onClick={openPrimary}>{primaryLabel}</button>
            <button className={styles.btnSecondary} onClick={goLogin}>Log in</button>
          </div>
          <div className={styles.heroNote}>Full access. Works on phone and desktop.</div>
        </div>
        <div className={styles.heroPanel}>
          <div className={styles.heroPanelBar}>
            <div className={styles.heroPanelDots}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.heroPanelApp}>Takda preview</div>
            <div className={styles.heroPanelSync}>Sample data</div>
          </div>
          <div className={styles.heroPanelTop}>
            <div>
              <div className={styles.heroPanelEyebrow}>Daily balance calendar</div>
              <div className={styles.heroPanelTitle}>April 2026</div>
              <div className={styles.heroPanelMeta}>Example month view with sample balances</div>
            </div>
            <div className={styles.heroPill}>Calendar preview</div>
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
              <div className={styles.heroBalanceBarLabel}>Sample balance for Apr 30, 2026</div>
              <div className={styles.heroBalanceBarMeta}>A clear read of the selected day, not your personal account data.</div>
            </div>
            <div className={styles.heroBalanceBarValue}>₱18,450</div>
          </div>
        </div>
      </section>

      <section className={styles.useCases}>
          <div className={styles.sectionTop}>
            <div className={styles.sectionIntro}>
              <div className={styles.sectionLabel}>Why it feels better</div>
              <h2 className={styles.sectionTitle}>One month view, fewer surprises.</h2>
            </div>
            <p className={styles.sectionLead}>
            Takda is built around one question: what will my money look like on each day of this month?
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
            <h2 className={styles.sectionTitle}>Everything supports one clear money view</h2>
          </div>
          <p className={styles.sectionLead}>
            Calendar, imports, accounts, bills, budgets, and goals all feed the same picture instead of competing for attention.
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
            <h2 className={styles.sectionTitle}>Set your baseline, keep it honest, stay ahead</h2>
          </div>
          <p className={styles.sectionLead}>
            The setup gives the calendar real numbers. After that, quick entries and imports keep the month accurate.
          </p>
        </div>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>{isSignedIn ? 'Open the app and set your baseline' : 'Create your account and set your baseline'}</div>
              <div className={styles.stepDesc}>Choose your currency, add your accounts, and add recurring bills so the month starts from real balances and known obligations.</div>
            </div>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>Log what actually happens</div>
              <div className={styles.stepDesc}>Use quick add for income and expenses, or import from receipts, wallet screenshots, and grocery items.</div>
            </div>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNum}>3</div>
            <div className={styles.stepText}>
              <div className={styles.stepTitle}>Use the calendar to stay ahead</div>
              <div className={styles.stepDesc}>Check each day’s closing balance, tap any date for detail, and adjust before a tight stretch turns into a surprise.</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.access}>
        <div className={styles.sectionTop}>
          <div className={styles.sectionIntro}>
            <div className={styles.sectionLabel}>What’s included</div>
            <h2 className={styles.sectionTitle}>One complete Takda experience.</h2>
          </div>
          <p className={styles.sectionLead}>
            There’s no separate paid layer in the product right now. The full month view, imports, planning tools, and reports all work together in the same app.
          </p>
        </div>
        <div className={styles.accessCard}>
          <div className={styles.accessIntro}>
            <div className={styles.accessTitle}>Included from day one</div>
            <div className={styles.accessDesc}>
              Takda is being shaped as one strong everyday money tool, so the core tracking, planning, import, and reporting workflows all stay available in the same account.
            </div>
          </div>
          <div className={styles.accessFeatureGrid}>
            <div className={styles.accessFeatureItem}>Future planning across your calendar</div>
            <div className={styles.accessFeatureItem}>Accounts, budgets, and savings goals</div>
            <div className={styles.accessFeatureItem}>Receipt, wallet, and grocery imports</div>
            <div className={styles.accessFeatureItem}>Advanced reports and printable monthly summaries</div>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaCard}>
          <div className={styles.ctaCopy}>
            <h2 className={styles.ctaTitle}>Start with a month you can actually read.</h2>
            <p className={styles.ctaSub}>Create your account, add your balances and bills, and Takda gives you a usable first view right away.</p>
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
            <div className={styles.footerTagline}>Mas klaro ang buwan, araw-araw.</div>
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
          <div className={styles.footerCopy}>© {new Date().getFullYear()} Takda. Calendar-first personal finance tracking for Filipinos.</div>
        </div>
      </footer>
    </div>
  )
}
