import { useMemo } from 'react'
import { getBalanceOverrides, getCurrentBalance, getMonthEndBalanceForView, getMonthTotal } from '../lib/finance'
import { getProjectedTransactions } from '../lib/recurrence'
import { displayValue, fmt, isSameMonth, maskMoney } from '../lib/utils'
import styles from './Page.module.css'
import dStyles from './Dashboard.module.css'

const TYPE_COLOR = { income: 'var(--accent)', expense: 'var(--red)' }
const TYPE_SIGN = { income: '+', expense: '−' }
const TYPE_BG = { income: 'var(--accent-glow)', expense: 'var(--red-dim)' }

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
  const privacyHint = privacyMode ? 'Tap to show balances' : 'Tap to hide balances'
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
    body: 'A quick daily check-in keeps the forecast useful and your progress earned.',
  }

  if (!checkedInToday) {
    focusState = gamification?.currentStreakDays > 0
      ? {
          tone: 'var(--accent)',
          eyebrow: 'Keep the streak',
          title: 'Log one transaction today',
          body: `One real entry today keeps your ${gamification.currentStreakDays}-day streak moving.`,
        }
      : {
          tone: 'var(--blue)',
          eyebrow: 'Start strong',
          title: 'Make today your first check-in',
          body: 'Log one real expense or income so the app starts working like a habit, not just a ledger.',
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
      body: `You are on track for a ${money(Math.abs(eomBalance))} shortfall. Lighter spending over the next few days can still pull it back.`,
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
      body: 'Net, forecast, and routine are all in good shape. Keep logging so it stays that way.',
    }
  }

  return (
    <div className={styles.page}>
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
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            Savings goals
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>
              {displayValue(privacyMode, `${savingsPct}% funded`, 'Progress hidden')}
            </span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5, color: 'var(--text3)' }}>
              <span>{displayValue(privacyMode, `${fmt(savingsTotal, s)} saved`, `${maskMoney(s)} saved`)}</span>
              <span>{displayValue(privacyMode, `${fmt(savingsTarget, s)} target`, `${maskMoney(s)} target`)}</span>
            </div>
            <div style={{ height: 8, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${savingsPct}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
          </div>
          {data.goals.slice(0, 3).map(goal => {
            const pct = Math.min(100, Math.round(((goal.current || 0) / (goal.target || 1)) * 100))
            return (
              <div key={goal._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{goal.name}</div>
                  <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--accent)' : 'var(--blue)', borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', flexShrink: 0 }}>
                  {displayValue(privacyMode, `${pct}%`, '•••')}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardTitle}>Recent transactions</div>
        {!recent.length ? (
          <div className={styles.empty}>No transactions yet. Add your first one to start the month view.</div>
        ) : recent.map((tx, index) => (
          <div
            key={tx._id + index}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: index < recent.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: TYPE_BG[tx.txType], color: TYPE_COLOR[tx.txType], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
              {TYPE_SIGN[tx.txType]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.desc}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{tx.cat} · {tx.date}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: TYPE_COLOR[tx.txType], flexShrink: 0 }}>
              {displayValue(privacyMode, `${TYPE_SIGN[tx.txType]}${fmt(tx.amount, s)}`, `${TYPE_SIGN[tx.txType]}${maskMoney(s)}`)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
