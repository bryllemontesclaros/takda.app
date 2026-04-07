import { useEffect, useState } from 'react'
import { fsAddTransaction, fsDeleteTransaction } from '../lib/firestore'
import { fmt, today, RECUR_OPTIONS, confirmDelete, validateAmount } from '../lib/utils'
import styles from './Page.module.css'

export default function Income({ user, data, symbol }) {
  const s = symbol || '₱'
  const [form, setForm] = useState({ desc: '', amount: '', date: today(), cat: 'Other', recur: '', accountId: data.accounts?.[0]?._id || '' })
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  useEffect(() => {
    if (!form.accountId && data.accounts?.[0]?._id) {
      setForm(current => ({ ...current, accountId: data.accounts[0]._id }))
    }
  }, [data.accounts, form.accountId])

  async function handleAdd() {
    if (!form.desc || !form.amount || !form.date) return alert('Add a description, amount, and date.')
    const err = validateAmount(form.amount); if (err) return alert(err); await fsAddTransaction(user.uid, 'income', { ...form, amount: parseFloat(form.amount), type: 'income', accountBalanceLinked: Boolean(form.accountId) }, data.accounts)
    setForm(f => ({ ...f, desc: '', amount: '' }))
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Income</div>
        <div className={styles.sub}>Track pay, freelance work, business income, and other inflows.</div>
      </div>
      <div className={styles.formCard}>
        <div className={styles.cardTitle}>Add income</div>
        <div className={`${styles.formRow} ${styles.col3}`}>
          <div className={styles.formGroup}><label>Description</label><input placeholder="e.g. Client payment" value={form.desc} onChange={e => set('desc', e.target.value)} /></div>
          <div className={styles.formGroup}><label>Amount ({s})</label><input type="number" min="0" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} /></div>
          <div className={styles.formGroup}><label>Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
        </div>
        <div className={`${styles.formRow} ${styles.col3}`}>
          <div className={styles.formGroup}><label>Category</label>
            <select value={form.cat} onChange={e => set('cat', e.target.value)}>
              {['Salary','Freelance','Business','Investment','13th Month','Bonus','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}><label>Account</label>
            <select value={form.accountId} onChange={e => set('accountId', e.target.value)}>
              <option value="">No account selected</option>
              {(data.accounts || []).map(account => <option key={account._id} value={account._id}>{account.name} · {account.type}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}><label>Recurrence</label>
            <select value={form.recur} onChange={e => set('recur', e.target.value)}>
              {RECUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
            <button className={styles.btnAdd} onClick={handleAdd}>Add income</button>
          </div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Income entries</div>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Description</th><th>Category</th><th>Date</th><th>Recurrence</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {!data.income.length
                ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: '2rem' }}>No income yet.</td></tr>
                : data.income.map(r => (
                  <tr key={r._id}>
                    <td style={{ color: 'var(--text)' }}>{r.desc}</td>
                    <td><span className={`${styles.badge} ${styles.badgeIncome}`}>{r.cat}</span></td>
                    <td>{r.date}</td>
                    <td>{r.recur ? <span className={`${styles.badge} ${styles.badgeRecurring}`}>{RECUR_OPTIONS.find(o => o.value === r.recur)?.label || r.recur}</span> : '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{fmt(r.amount, s)}</td>
                    <td><button className={styles.delBtn} onClick={() => confirmDelete(r.desc) && fsDeleteTransaction(user.uid, 'income', r, data.accounts)}>✕</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
