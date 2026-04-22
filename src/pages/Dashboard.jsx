import { useMemo } from 'react'
import { getBalanceOverrides, getCurrentBalance, getMonthEndBalanceForView, getMonthTotal } from '../lib/finance'
import { getProjectedTransactions } from '../lib/recurrence'
import { displayValue, fmt, isSameMonth, maskMoney } from '../lib/utils'
import styles from './Page.module.css'
import dStyles from './Dashboard.module.css'

const TYPE_COLOR = { income: 'var(--accent)', expense: 'var(--red)' }
const TYPE_SIGN = { income: '+', expense: '−' }
const TYPE_BG = { income: 'var(--accent-glow)', expense: 'var(--red-dim)' }

function DashboardIcon({ type }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  if (type === 'income') {
    return (
      <svg {...common}>
        <path d="M12 19V5"/>
        <path d="m6 11 6-6 6 6"/>
      </svg>
    )
  }

  if (type === 'salary') {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="13" rx="3"/>
        <path d="M7 10h5"/>
        <path d="M16 14h2"/>
      </svg>
    )
  }

  if (type === 'food') {
    return (
      <svg {...common}>
        <path d="M7 3v8"/>
        <path d="M5 3v4"/>
        <path d="M9 3v4"/>
        <path d="M7 11v10"/>
        <path d="M15 3v18"/>
        <path d="M15 3c2 1.2 3 3.2 3 6 0 2.4-1 4-3 4"/>
      </svg>
    )
  }

  if (type === 'transport') {
    return (
      <svg {...common}>
        <path d="M5 16h14l-1.4-5.2A2.4 2.4 0 0 0 15.3 9H8.7a2.4 2.4 0 0 0-2.3 1.8L5 16Z"/>
        <path d="M7 16v2"/>
        <path d="M17 16v2"/>
        <path d="M8 13h.01"/>
        <path d="M16 13h.01"/>
      </svg>
    )
  }

  if (type === 'bills') {
    return (
      <svg {...common}>
        <path d="M7 3.5h10a2 2 0 0 1 2 2V21l-3-1.8-3 1.8-3-1.8L7 21V5.5a2 2 0 0 1 2-2Z"/>
        <path d="M10 8h6"/>
        <path d="M10 12h6"/>
      </svg>
    )
  }

  if (type === 'shopping') {
    return (
      <svg {...common}>
        <path d="M6 8h12l-1 12H7L6 8Z"/>
        <path d="M9 8a3 3 0 0 1 6 0"/>
      </svg>
    )
  }

  if (type === 'health') {
    return (
      <svg {...common}>
        <path d="M12 5v14"/>
        <path d="M5 12h14"/>
        <rect x="4" y="4" width="16" height="16" rx="4"/>
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M12 5v14"/>
      <path d="m18 13-6 6-6-6"/>
    </svg>
  )
}

function getTransactionIconKey(tx = {}) {
  const text = `${tx.cat || ''} ${tx.subcat || ''} ${tx.desc || ''}`.toLowerCase()

  if (tx.txType === 'income') {
    return /salary|payroll|freelance|bonus|business/.test(text) ? 'salary' : 'income'
  }

  if (/food|dining|coffee|restaurant|grocery|groceries|market|supermarket/.test(text)) return 'food'
  if (/transport|commute|grab|taxi|bus|jeep|fuel|gas|parking/.test(text)) return 'transport'
  if (/bill|rent|electric|water|internet|mobile|subscription|utilities|loan|installment/.test(text)) return 'bills'
  if (/shopping|clothes|mall|store|online/.test(text)) return 'shopping'
  if (/health|medicine|doctor|pharmacy|hospital/.test(text)) return 'health'
  return 'expense'
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

export default function Dashboard({ user, data, profile = {}, symbol, privacyMode = false, gamification, onTogglePrivacy }) {
  const s = symbol || '₱'
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const name = user?.displayName?.split(' ')[0] || 'there'

  const mIncome = useMemo(() => getMonthTotal(data.income, year, month), [data.income, year, month])
  const mExpense = useMemo(() => getMonthTotal(data.expenses, year, month), [data.expenses, year, month])
  const mNet = mIncome - mExpense

  let lm = month - 1
  let ly = year
  if (lm < 0) {
    lm = 11
    ly--
  }
  const lmExpense = useMemo(() => getMonthTotal(data.expenses, ly, lm), [data.expenses, ly, lm])
  const expenseChange = lmExpense > 0 ? Math.round(((mExpense - lmExpense) / lmExpense) * 100) : null

  const netWorth = getCurrentBalance(data.accounts)

  const monthSpending = useMemo(() => {
    const spending = {}
    data.expenses.filter(t => isSameMonth(t.date, year, month)).forEach(t => {
      spending[t.cat] = (spending[t.cat] || 0) + (t.amount || 0)
    })
    return spending
  }, [data.expenses, year, month])

  const budgetHealth = useMemo(() => {
    let ok = 0
    let warning = 0
    let over = 0

    data.budgets.forEach(budget => {
      const pct = budget.limit > 0 ? (monthSpending[budget.cat] || 0) / budget.limit : 0
      if (pct >= 1) over++
      else if (pct >= 0.8) warning++
      else ok++
    })

    return { ok, warning, over, total: data.budgets.length }
  }, [data.budgets, monthSpending])

  const biggestBudgetGap = useMemo(() => {
    return data.budgets
      .map(budget => {
        const spent = monthSpending[budget.cat] || 0
        const limit = Number(budget.limit) || 0
        const over = Math.max(0, spent - limit)
        const pct = limit > 0 ? spent / limit : 0
        return { ...budget, spent, limit, over, pct }
      })
      .filter(budget => budget.over > 0)
      .sort((a, b) => b.over - a.over)[0] || null
  }, [data.budgets, monthSpending])

  const savingsTotal = data.goals.reduce((sum, goal) => sum + (goal.current || 0), 0)
  const savingsTarget = data.goals.reduce((sum, goal) => sum + (goal.target || 0), 0)
  const savingsPct = savingsTarget > 0 ? Math.min(100, Math.round((savingsTotal / savingsTarget) * 100)) : 0

  const goalHighlight = useMemo(() => {
    return data.goals
      .map(goal => {
        const current = Number(goal.current) || 0
        const target = Number(goal.target) || 0
        const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
        const remaining = Math.max(0, target - current)
        return { ...goal, pct, remaining }
      })
      .sort((a, b) => {
        if (b.pct !== a.pct) return b.pct - a.pct
        return a.remaining - b.remaining
      })[0] || null
  }, [data.goals])

  const projected = useMemo(() => getProjectedTransactions(data.income, data.expenses, year, month), [data.income, data.expenses, year, month])
  const projectedIncome = useMemo(() => projected.filter(t => t.type === 'income'), [projected])
  const projectedExpenses = useMemo(() => projected.filter(t => t.type === 'expense'), [projected])
  const balanceOverrides = useMemo(
    () => getBalanceOverrides(profile?.dailyBalanceOverrides || {}, profile?.monthStartBalances || {}),
    [profile?.dailyBalanceOverrides, profile?.monthStartBalances],
  )
  const eomBalance = useMemo(
    () => getMonthEndBalanceForView(data.accounts, data.income, data.expenses, projectedIncome, projectedExpenses, year, month, balanceOverrides),
    [data.accounts, data.income, data.expenses, projectedIncome, projectedExpenses, year, month, balanceOverrides],
  )

  const recent = useMemo(() => {
    const all = [
      ...data.income.map(t => ({ ...t, txType: 'income' })),
      ...data.expenses.map(t => ({ ...t, txType: 'expense' })),
    ]
      .filter(t => t.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))

    return all.slice(0, 5)
  }, [data.income, data.expenses])

  const money = value => displayValue(privacyMode, fmt(value, s), maskMoney(s))
  const privacyHint = privacyMode ? 'Screen privacy on. Tap to show values.' : 'Tap to hide values on this screen.'
  const accountCountLabel = `${data.accounts.length} account${data.accounts.length !== 1 ? 's' : ''} right now`
  const weeklyRemaining = Math.max(0, (gamification?.weeklyTarget || 0) - (gamification?.weeklyCheckins || 0))
  const checkedInToday = Boolean(gamification?.checkedInToday)

  const focusPills = [
    gamification?.currentStreakDays >= 3 ? `${gamification.currentStreakDays}-day streak` : null,
    eomBalance >= 0 ? 'Month-end forecast positive' : null,
    mNet > 0 ? 'Net positive this month' : null,
    budgetHealth.total > 0 && budgetHealth.over === 0 ? 'Budgets holding' : null,
    goalHighlight?.pct >= 80 ? `${goalHighlight.name} ${goalHighlight.pct}% funded` : null,
  ].filter(Boolean)

  let focusState = {
    tone: 'var(--accent)',
    eyebrow: 'Next best move',
    title: 'Keep the month visible',
    body: 'One real check-in keeps the forecast useful. Takda shows tracking signals, not financial advice.',
  }

  if (!checkedInToday) {
    focusState = gamification?.currentStreakDays > 0
      ? {
          tone: 'var(--accent)',
          eyebrow: 'Keep the streak',
          title: 'Log one real action today',
          body: `One real check-in today keeps your ${gamification.currentStreakDays}-day streak moving across Buhay.`,
        }
      : {
          tone: 'var(--blue)',
          eyebrow: 'Start strong',
          title: 'Make today your first check-in',
          body: 'Log one real finance, fitness, or journal check-in so Buhay starts working like a habit, not just a dashboard.',
        }
  } else if (biggestBudgetGap) {
    focusState = {
      tone: 'var(--red)',
      eyebrow: 'Budget rescue',
      title: `Tighten ${biggestBudgetGap.cat}`,
      body: `You are over by ${money(biggestBudgetGap.over)}. Fixing that category protects month-end fastest.`,
    }
  } else if (eomBalance < 0) {
    focusState = {
      tone: 'var(--amber)',
      eyebrow: 'Forecast risk',
      title: 'Protect month-end before it slips',
      body: `Takda estimates a ${money(Math.abs(eomBalance))} shortfall. Treat it as an early planning signal, not a guaranteed bank result.`,
    }
  } else if (goalHighlight && goalHighlight.remaining > 0 && goalHighlight.pct >= 70) {
    focusState = {
      tone: 'var(--blue)',
      eyebrow: 'Finish a win',
      title: `Close out ${goalHighlight.name}`,
      body: `You are only ${money(goalHighlight.remaining)} away from finishing this goal. One contribution would close it out.`,
    }
  } else if (weeklyRemaining > 0) {
    focusState = {
      tone: 'var(--blue)',
      eyebrow: 'Weekly rhythm',
      title: 'Stay on your check-in pace',
      body: `${pluralize(weeklyRemaining, 'more check-in')} gets you to your ${gamification.weeklyTarget}-day weekly target.`,
    }
  } else {
    focusState = {
      tone: 'var(--accent)',
      eyebrow: 'Momentum is healthy',
      title: 'This month is holding steady',
      body: 'Net, forecast, and routine are all in good shape. Keep logging real activity so the view stays trustworthy.',
    }
  }

  return (
    <div className={`${styles.page} ${dStyles.dashboardPage}`}>
      <div className={dStyles.greeting}>
        <div className={dStyles.greetingText}>
          <span className={dStyles.greetingHi}>{greeting}, {name}</span>
          <span className={dStyles.greetingDate}>{now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      <button
        type="button"
        className={`${dStyles.heroCard} ${dStyles.privacyCardButton}`}
        onClick={onTogglePrivacy}
        aria-pressed={privacyMode}
        title={privacyHint}
      >
        <div className={dStyles.heroLabel}>Current balance</div>
        <div className={dStyles.heroVal}>{money(netWorth)}</div>
        <div className={dStyles.heroSub}>{accountCountLabel}</div>
        <div className={dStyles.privacyHint}>{privacyHint}</div>
      </button>

      <div className={dStyles.focusCard} style={{ '--focus-tone': focusState.tone }}>
        <div className={dStyles.focusHeader}>
          <div>
            <div className={dStyles.focusEyebrow}>{focusState.eyebrow}</div>
            <div className={dStyles.focusTitle}>{focusState.title}</div>
          </div>
          <div className={dStyles.focusBadge}>Active</div>
        </div>
        <div className={dStyles.focusBody}>{focusState.body}</div>
        <div className={dStyles.focusPillRow}>
          {(focusPills.length ? focusPills : ['Momentum follows consistency']).slice(0, 3).map(pill => (
            <span key={pill} className={dStyles.focusPill}>{pill}</span>
          ))}
        </div>
      </div>

      <div className={dStyles.statsRow}>
        <div className={dStyles.statBox}>
          <div className={dStyles.statBoxLabel}>Income</div>
          <div className={dStyles.statBoxVal} style={{ color: 'var(--accent)' }}>
            {displayValue(privacyMode, `+${fmt(mIncome, s)}`, `+${maskMoney(s)}`)}
          </div>
        </div>
        <div className={dStyles.statBox}>
          <div className={dStyles.statBoxLabel}>Expenses</div>
          <div className={dStyles.statBoxVal} style={{ color: 'var(--red)' }}>
            {displayValue(privacyMode, `−${fmt(mExpense, s)}`, `−${maskMoney(s)}`)}
          </div>
          {expenseChange !== null && (
            <div className={dStyles.statBoxChange} style={{ color: expenseChange > 0 ? 'var(--red)' : 'var(--accent)' }}>
              {expenseChange > 0 ? '↑' : '↓'} {Math.abs(expenseChange)}% vs last month
            </div>
          )}
        </div>
        <div className={dStyles.statBox}>
          <div className={dStyles.statBoxLabel}>Net</div>
          <div className={dStyles.statBoxVal} style={{ color: mNet >= 0 ? 'var(--blue)' : 'var(--red)' }}>
            {displayValue(privacyMode, `${mNet >= 0 ? '+' : ''}${fmt(mNet, s)}`, `${mNet >= 0 ? '+' : ''}${maskMoney(s)}`)}
          </div>
        </div>
      </div>

      <div className={dStyles.twoCol}>
        <div className={dStyles.miniCard}>
          <div className={dStyles.miniLabel}>Projected month-end</div>
          <div className={dStyles.miniVal} style={{ color: eomBalance >= 0 ? 'var(--accent)' : 'var(--red)' }}>
            {money(eomBalance)}
          </div>
          <div className={dStyles.miniSub} style={{ color: eomBalance >= 0 ? 'var(--accent)' : 'var(--red)' }}>
            {eomBalance >= 0 ? 'Projected surplus' : 'Projected deficit'}
          </div>
        </div>

        <div className={dStyles.miniCard}>
          <div className={dStyles.miniLabel}>Budget health</div>
          {budgetHealth.total === 0 ? (
            <div className={dStyles.miniSub} style={{ marginTop: 8 }}>Set your first budget</div>
          ) : (
            <>
              <div className={dStyles.budgetDots}>
                {budgetHealth.ok > 0 && <span className={dStyles.budgetDot} style={{ background: 'var(--accent)' }}>{budgetHealth.ok} ok</span>}
                {budgetHealth.warning > 0 && <span className={dStyles.budgetDot} style={{ background: 'var(--amber)' }}>{budgetHealth.warning} near</span>}
                {budgetHealth.over > 0 && <span className={dStyles.budgetDot} style={{ background: 'var(--red)' }}>{budgetHealth.over} over</span>}
              </div>
              <div className={dStyles.miniSub}>
                {budgetHealth.over > 0
                  ? `${budgetHealth.over} budget${budgetHealth.over > 1 ? 's' : ''} exceeded`
                  : budgetHealth.warning > 0
                    ? 'Some budgets nearing limit'
                    : 'All budgets on track'}
              </div>
            </>
          )}
        </div>
      </div>

      {data.goals.length > 0 && (
        <div className={dStyles.sectionCard}>
          <div className={dStyles.sectionHeader}>
            <span className={dStyles.sectionTitle}>Savings goals</span>
            <span className={dStyles.sectionMeta}>
              {displayValue(privacyMode, `${savingsPct}% funded`, 'Progress hidden')}
            </span>
          </div>
          <div className={dStyles.goalSummary}>
            <div className={dStyles.goalSummaryMeta}>
              <span>{displayValue(privacyMode, `${fmt(savingsTotal, s)} saved`, `${maskMoney(s)} saved`)}</span>
              <span>{displayValue(privacyMode, `${fmt(savingsTarget, s)} target`, `${maskMoney(s)} target`)}</span>
            </div>
            <div className={dStyles.goalSummaryTrack}>
              <div className={dStyles.goalSummaryFill} style={{ width: `${savingsPct}%` }} />
            </div>
          </div>
          {data.goals.slice(0, 3).map(goal => {
            const pct = Math.min(100, Math.round(((goal.current || 0) / (goal.target || 1)) * 100))
            return (
              <div key={goal._id} className={dStyles.goalRow}>
                <div className={dStyles.goalRowMain}>
                  <div className={dStyles.goalRowName}>{goal.name}</div>
                  <div className={dStyles.goalRowTrack}>
                    <div className={dStyles.goalRowFill} style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--accent)' : 'var(--blue)' }} />
                  </div>
                </div>
                <div className={dStyles.goalRowPct}>
                  {displayValue(privacyMode, `${pct}%`, '•••')}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className={dStyles.sectionCard}>
        <div className={dStyles.sectionHeader}>
          <span className={dStyles.sectionTitle}>Recent transactions</span>
        </div>
        {!recent.length ? (
          <div className={dStyles.sectionEmpty}>No transactions yet. Add your first one to start the month view.</div>
        ) : recent.map((tx, index) => (
          <div
            key={tx._id + index}
            className={dStyles.txRow}
            style={{ borderBottom: index < recent.length - 1 ? '1px solid color-mix(in srgb, var(--border) 66%, transparent)' : 'none' }}
          >
            <div className={dStyles.txIcon} style={{ background: TYPE_BG[tx.txType], color: TYPE_COLOR[tx.txType] }}>
              <DashboardIcon type={getTransactionIconKey(tx)} />
            </div>
            <div className={dStyles.txContent}>
              <div className={dStyles.txDesc}>{tx.desc}</div>
              <div className={dStyles.txMeta}>{[tx.cat, tx.subcat].filter(Boolean).join(' · ')} · {tx.date}</div>
            </div>
            <div className={dStyles.txAmount} style={{ color: TYPE_COLOR[tx.txType] }}>
              {displayValue(privacyMode, `${TYPE_SIGN[tx.txType]}${fmt(tx.amount, s)}`, `${TYPE_SIGN[tx.txType]}${maskMoney(s)}`)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
