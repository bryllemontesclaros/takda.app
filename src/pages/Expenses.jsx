import { useState } from 'react'
import { fsAdd, fsDel } from '../lib/firestore'
import { fmt, today, RECUR_OPTIONS, confirmDelete, validateAmount } from '../lib/utils'
import styles from './Page.module.css'

export default function Expenses({ user, data, symbol }) {
  const s = symbol || '₱'
  const [form, setForm] = useState({ desc: '', amount: '', date: today(), cat: 'Food & Dining', recur: '' })
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleAdd() {
    if (!form.desc || !form.amount || !form.date) return alert('Add a description, amount, and date.')
    const err = validateAmount(form.amount); if (err) return alert(err); await fsAdd(user.uid, 'expenses', { ...form, amount: parseFloat(form.amount), type: 'expense' })
    setForm(f => ({ ...f, desc: '', amount: '' }))
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Purchases & Expenses</div>
        <div className={styles.sub}>Track purchases and everyday spending.</div>
      </div>
      <div className={styles.formCard}>
        <div className={styles.cardTitle}>Add expense</div>
        <div className={`${styles.formRow} ${styles.col3}`}>
          <div className={styles.formGroup}><label>Description</label><input placeholder="e.g. Groceries" value={form.desc} onChange={e => set('desc', e.target.value)} /></div>
          <div className={styles.formGroup}><label>Amount ({s})</label><input type="number" min="0" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} /></div>
          <div className={styles.formGroup}><label>Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
        </div>
        <div className={`${styles.formRow} ${styles.col3}`}>
          <div className={styles.formGroup}><label>Category</label>
            <select value={form.cat} onChange={e => set('cat', e.target.value)}>
              {['Food & Dining','Transport','Shopping','Health','Entertainment','Personal Care','Education','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}><label>Recurrence</label>
            <select value={form.recur} onChange={e => set('recur', e.target.value)}>
              {RECUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
            <button className={styles.btnAdd} onClick={handleAdd}>Add expense</button>
          </div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Expense entries</div>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Description</th><th>Category</th><th>Date</th><th>Recurrence</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {!data.expenses.length
                ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: '2rem' }}>No expenses yet.</td></tr>
                : data.expenses.map(r => (
                  <tr key={r._id}>
                    <td style={{ color: 'var(--text)' }}>{r.desc}</td>
                    <td><span className={`${styles.badge} ${styles.badgeExpense}`}>{r.cat}</span></td>
                    <td>{r.date}</td>
                    <td>{r.recur ? <span className={`${styles.badge} ${styles.badgeRecurring}`}>{RECUR_OPTIONS.find(o => o.value === r.recur)?.label || r.recur}</span> : '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>{fmt(r.amount, s)}</td>
                    <td><button className={styles.delBtn} onClick={() => confirmDelete(r.desc) && fsDel(user.uid, 'expenses', r._id)}>✕</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
