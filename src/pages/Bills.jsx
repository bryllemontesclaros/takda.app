import { useState } from 'react'
import { fsAdd, fsDel, fsUpdate } from '../lib/firestore'
import { fmt, RECUR_OPTIONS, confirmDelete, validateAmount } from '../lib/utils'
import styles from './Page.module.css'

const BILL_FREQS = RECUR_OPTIONS.filter(o => o.value !== '' && o.value !== 'daily')

export default function Bills({ user, data, symbol }) {
  const s = symbol || '₱'
  const [form, setForm] = useState({ name: '', amount: '', due: '', cat: 'Electric', freq: 'monthly' })
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleAdd() {
    if (!form.name || !form.amount || !form.due) return alert('Add a bill name, amount, and due day.')
    await fsAdd(user.uid, 'bills', { ...form, amount: parseFloat(form.amount), due: parseInt(form.due), paid: false, type: 'bill' })
    setForm(f => ({ ...f, name: '', amount: '', due: '' }))
  }

  async function togglePaid(bill) {
    const nextPaid = !bill.paid
    await fsUpdate(user.uid, 'bills', bill._id, {
      paid: nextPaid,
      paidAt: nextPaid ? Date.now() : null,
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Bills</div>
        <div className={styles.sub}>Track recurring bills and due dates.</div>
      </div>
      <div className={styles.formCard}>
        <div className={styles.cardTitle}>Add bill</div>
        <div className={`${styles.formRow} ${styles.col3}`}>
          <div className={styles.formGroup}><label>Bill name</label><input placeholder="e.g. Meralco" value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className={styles.formGroup}><label>Amount ({s})</label><input type="number" min="0" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} /></div>
          <div className={styles.formGroup}><label>Due day (1–31)</label><input type="number" min={1} max={31} placeholder="e.g. 15" value={form.due} onChange={e => set('due', e.target.value)} /></div>
        </div>
        <div className={`${styles.formRow} ${styles.col3}`}>
          <div className={styles.formGroup}><label>Category</label>
            <select value={form.cat} onChange={e => set('cat', e.target.value)}>
              {['Electric','Water','Internet','Rent','Phone','Insurance','Subscription','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}><label>Frequency</label>
            <select value={form.freq} onChange={e => set('freq', e.target.value)}>
              {BILL_FREQS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
            <button className={styles.btnAdd} onClick={handleAdd}>Add bill</button>
          </div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Bills</div>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Name</th><th>Category</th><th>Due Day</th><th>Frequency</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {!data.bills.length
                ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text3)', padding: '2rem' }}>No bills yet. Add one above.</td></tr>
                : data.bills.map(r => (
                  <tr key={r._id}>
                    <td style={{ color: 'var(--text)' }}>{r.name}</td>
                    <td><span className={`${styles.badge} ${styles.badgeBill}`}>{r.cat}</span></td>
                    <td>Day {r.due}</td>
                    <td>{BILL_FREQS.find(o => o.value === r.freq)?.label || r.freq}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{fmt(r.amount, s)}</td>
                    <td>
                      <button onClick={() => togglePaid(r)} style={{ background: r.paid ? 'var(--accent-glow)' : 'var(--red-dim)', color: r.paid ? 'var(--accent)' : 'var(--red)', border: 'none', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {r.paid ? 'Paid' : 'Unpaid'}
                      </button>
                    </td>
                    <td><button className={styles.delBtn} onClick={() => confirmDelete(r.name) && fsDel(user.uid, 'bills', r._id)}>✕</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
