import { useMemo, useState } from 'react'
import GamificationCard from '../components/GamificationCard'
import { fsAdd, fsDel, fsUpdate } from '../lib/firestore'
import { displayValue, fmt, isSameMonth, maskMoney } from '../lib/utils'
import styles from './Page.module.css'
import bStyles from './Budget.module.css'

const EXPENSE_CATS = ['Food & Dining', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Personal Care', 'Education', 'Bills', 'Other']

export default function Budget({ user, data, symbol, privacyMode = false, gamification }) {
  const s = symbol || '₱'
  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [form, setForm] = useState({ cat: 'Food & Dining', limit: '' })
  const budgets = data.budgets || []

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' })

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(year => year - 1)
    } else {
      setViewMonth(month => month - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(year => year + 1)
    } else {
      setViewMonth(month => month + 1)
    }
  }

  const spending = useMemo(() => {
    const map = {}
    data.expenses.filter(tx => isSameMonth(tx.date, viewYear, viewMonth)).forEach(tx => {
      map[tx.cat] = (map[tx.cat] || 0) + (tx.amount || 0)
    })
    return map
  }, [data.expenses, viewMonth, viewYear])

  const totalExpenses = Object.values(spending).reduce((sum, value) => sum + value, 0)
  const totalBudget = budgets.reduce((sum, budget) => sum + (budget.limit || 0), 0)
  const totalRemaining = totalBudget - totalExpenses
  const money = value => displayValue(privacyMode, fmt(value, s), maskMoney(s))

  async function handleAddBudget() {
    if (!form.cat || !form.limit) return alert('Choose a category and monthly limit.')
    const existing = budgets.find(budget => budget.cat === form.cat)
    if (existing) {
      await fsUpdate(user.uid, 'budgets', existing._id, { limit: parseFloat(form.limit) })
    } else {
      await fsAdd(user.uid, 'budgets', { cat: form.cat, limit: parseFloat(form.limit) })
    }
    setForm(current => ({ ...current, limit: '' }))
  }

  async function handleDelBudget(id) {
    await fsDel(user.uid, 'budgets', id)
  }

  const budgetItems = useMemo(() => {
    return budgets
      .map(budget => {
        const spent = spending[budget.cat] || 0
        const remaining = budget.limit - spent
        const pct = Math.min(100, Math.round((spent / budget.limit) * 100))
        const status = pct >= 100 ? 'over' : pct >= 80 ? 'warning' : 'ok'
        return { ...budget, spent, remaining, pct, status }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [budgets, spending])

  const unbudgeted = useMemo(() => {
    const budgetedCats = new Set(budgets.map(budget => budget.cat))
    const map = {}
    data.expenses.filter(tx => isSameMonth(tx.date, viewYear, viewMonth) && !budgetedCats.has(tx.cat)).forEach(tx => {
      map[tx.cat] = (map[tx.cat] || 0) + (tx.amount || 0)
    })
    return Object.entries(map).map(([cat, amount]) => ({ cat, amount })).sort((a, b) => b.amount - a.amount)
  }, [data.expenses, budgets, viewMonth, viewYear])

  const statusColor = { ok: 'var(--accent)', warning: 'var(--amber)', over: 'var(--red)' }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Budget</div>
        <div className={styles.sub}>Set category limits and spot pressure early.</div>
      </div>

      <GamificationCard
        gamification={gamification}
        privacyMode={privacyMode}
        compact
        title="Budget guard"
        message="Budgets work best when they warn early and stay easy to read."
      />

      <div className={bStyles.monthNav}>
        <button className={bStyles.navBtn} onClick={prevMonth}>←</button>
        <div className={bStyles.monthLabel}>{monthLabel}</div>
        <button className={bStyles.navBtn} onClick={nextMonth}>→</button>
      </div>

      <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Total budget</div>
          <div className={`${styles.statVal} ${styles.blue}`}>{money(totalBudget)}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Spent</div>
          <div className={`${styles.statVal} ${styles.red}`}>{money(totalExpenses)}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Remaining</div>
          <div className={styles.statVal} style={{ color: totalRemaining >= 0 ? 'var(--accent)' : 'var(--red)' }}>{money(totalRemaining)}</div>
        </div>
      </div>

      {totalBudget > 0 && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Overall budget usage</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--text2)' }}>{displayValue(privacyMode, `${fmt(totalExpenses, s)} spent`, `${maskMoney(s)} spent`)}</span>
            <span style={{ color: 'var(--text3)' }}>{displayValue(privacyMode, `${fmt(totalBudget, s)} budget`, `${maskMoney(s)} budget`)}</span>
          </div>
          <div style={{ height: 10, background: 'var(--surface3)', borderRadius: 5, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.round((totalExpenses / totalBudget) * 100))}%`,
                background: totalExpenses > totalBudget ? 'var(--red)' : totalExpenses / totalBudget > 0.8 ? 'var(--amber)' : 'var(--accent)',
                borderRadius: 5,
                transition: 'width 0.4s',
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, textAlign: 'right' }}>
            {displayValue(privacyMode, `${Math.min(100, Math.round((totalExpenses / totalBudget) * 100))}% used`, 'Usage hidden')}
          </div>
        </div>
      )}

      <div className={styles.formCard}>
        <div className={styles.cardTitle}>Set category limit</div>
        <div className={`${styles.formRow} ${styles.col3}`}>
          <div className={styles.formGroup}>
            <label>Category</label>
            <select value={form.cat} onChange={event => setForm(current => ({ ...current, cat: event.target.value }))}>
              {EXPENSE_CATS.map(cat => <option key={cat}>{cat}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Monthly limit ({s})</label>
            <input type="number" min="0" placeholder="e.g. 5000" value={form.limit} onChange={event => setForm(current => ({ ...current, limit: event.target.value }))} />
          </div>
          <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
            <button className={styles.btnAdd} style={{ width: '100%' }} onClick={handleAddBudget}>Save budget</button>
          </div>
        </div>
      </div>

      {!budgetItems.length ? (
        <div className={styles.empty}>No budgets yet. Add one above to start tracking the month.</div>
      ) : budgetItems.map(item => (
        <div key={item._id} className={bStyles.budgetCard} style={{ borderColor: item.status === 'over' ? 'rgba(255,83,112,0.4)' : item.status === 'warning' ? 'rgba(255,179,71,0.3)' : 'var(--border)' }}>
          {item.status === 'over' && (
            <div className={bStyles.alertBanner} style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
              ⚠ Over budget by {money(Math.abs(item.remaining))}
            </div>
          )}
          {item.status === 'warning' && (
            <div className={bStyles.alertBanner} style={{ background: 'var(--amber-dim)', color: 'var(--amber)' }}>
              ⚡ {money(item.remaining)} left before you hit the limit
            </div>
          )}

          <div className={bStyles.budgetHeader}>
            <div className={bStyles.budgetCat}>{item.cat}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: statusColor[item.status] }}>{money(item.spent)}</span>
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>/ {money(item.limit)}</span>
              <button className={styles.delBtn} onClick={() => handleDelBudget(item._id)}>✕</button>
            </div>
          </div>

          <div style={{ height: 8, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden', margin: '8px 0' }}>
            <div style={{ height: '100%', width: `${item.pct}%`, background: statusColor[item.status], borderRadius: 4, transition: 'width 0.4s' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
            <span>{displayValue(privacyMode, `${item.pct}% used`, 'Usage hidden')}</span>
            <span style={{ color: item.remaining >= 0 ? statusColor[item.status] : 'var(--red)', fontWeight: 600 }}>
              {item.remaining >= 0 ? `${money(item.remaining)} left` : `Over by ${money(Math.abs(item.remaining))}`}
            </span>
          </div>
        </div>
      ))}

      {unbudgeted.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Unbudgeted spending</div>
          {unbudgeted.map((item, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>{item.cat}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>{money(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
