import { useState } from 'react'
import GamificationCard from '../components/GamificationCard'
import { fsAdd, fsDel, fsUpdate } from '../lib/firestore'
import { confirmDelete, displayValue, fmt, formatDisplayDate, maskMoney } from '../lib/utils'
import styles from './Page.module.css'

export default function Savings({ user, data, profile = {}, symbol, privacyMode = false, gamification }) {
  const s = symbol || '₱'
  const [form, setForm] = useState({ name: '', target: '', current: '', date: '' })
  const [contribs, setContribs] = useState({})

  function set(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function handleAdd() {
    if (!form.name || !form.target) return alert('Add a goal name and target amount.')
    await fsAdd(user.uid, 'goals', {
      name: form.name,
      target: parseFloat(form.target),
      current: parseFloat(form.current) || 0,
      date: form.date,
    })
    setForm({ name: '', target: '', current: '', date: '' })
  }

  async function handleContrib(goal) {
    const value = parseFloat(contribs[goal._id] || 0)
    if (!value) return
    const newValue = Math.min(goal.target, (goal.current || 0) + value)
    await fsUpdate(user.uid, 'goals', goal._id, { current: newValue })
    setContribs(current => ({ ...current, [goal._id]: '' }))
  }

  const money = value => displayValue(privacyMode, fmt(value, s), maskMoney(s))
  const hasTargetDate = Boolean(form.date)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Savings Goals</div>
        <div className={styles.sub}>Give your savings a clear finish line.</div>
      </div>

      <GamificationCard
        gamification={gamification}
        privacyMode={privacyMode}
        compact
        title="Savings progress"
        message="Goals work better when the finish line and the remaining gap stay visible."
      />

      <div className={styles.formCard}>
        <div className={styles.cardTitle}>New savings goal</div>
        <div className={`${styles.formRow} ${styles.col3}`}>
          <div className={styles.formGroup}><label>Goal name</label><input placeholder="e.g. Emergency fund" value={form.name} onChange={event => set('name', event.target.value)} /></div>
          <div className={styles.formGroup}><label>Target amount ({s})</label><input type="number" min="0" placeholder="0.00" value={form.target} onChange={event => set('target', event.target.value)} /></div>
          <div className={styles.formGroup}>
            <div className={styles.fieldLabelRow}>
              <label htmlFor="savings-target-date">Target date</label>
              <span className={styles.fieldLabelNote}>Optional</span>
            </div>
            <div className={styles.dateFieldWrap}>
              <div className={`${styles.dateFieldDisplay} ${!hasTargetDate ? styles.dateFieldPlaceholder : ''}`}>
                {formatDisplayDate(form.date)}
              </div>
              <input
                id="savings-target-date"
                type="date"
                className={styles.dateFieldNative}
                value={form.date}
                aria-label="Target date"
                onChange={event => set('date', event.target.value)}
              />
            </div>
            <div className={styles.formHint}>Set a finish line so this goal stays easier to pace.</div>
          </div>
        </div>
        <div className={`${styles.formRow} ${styles.col2}`}>
          <div className={styles.formGroup}><label>Current saved ({s})</label><input type="number" min="0" placeholder="0.00" value={form.current} onChange={event => set('current', event.target.value)} /></div>
          <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
            <button className={styles.btnAdd} onClick={handleAdd}>Add goal</button>
          </div>
        </div>
      </div>

      {!data.goals.length ? (
        <div className={styles.empty}>No savings goals yet. Add one above to create a clear target.</div>
      ) : data.goals.map(goal => {
        const pct = Math.min(100, Math.round(((goal.current || 0) / (goal.target || 1)) * 100))
        return (
          <div key={goal._id} className={styles.goalCard}>
            <div className={styles.goalHeader}>
              <div className={styles.goalName}>{goal.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{displayValue(privacyMode, `${pct}%`, '•••')}</span>
                <button className={styles.delBtn} onClick={() => confirmDelete(goal.name) && fsDel(user.uid, 'goals', goal._id)}>✕</button>
              </div>
            </div>
            <div className={styles.progressTrack}>
              <div className={`${styles.progressFill} ${pct >= 80 ? styles.almost : ''}`} style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.goalMeta}>
              <div className={styles.goalMetaPrimary}>
                <span className={styles.goalSaved}>{displayValue(privacyMode, `${fmt(goal.current || 0, s)} saved`, `${maskMoney(s)} saved`)}</span>
                <span>of {money(goal.target)}</span>
              </div>
              {goal.date && <span className={styles.goalDateChip}>Target {formatDisplayDate(goal.date)}</span>}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <input
                type="number"
                min="0"
                placeholder={`Add contribution (${s})`}
                value={contribs[goal._id] || ''}
                onChange={event => setContribs(current => ({ ...current, [goal._id]: event.target.value }))}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text)',
                  fontSize: 16,
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                }}
              />
              <button
                onClick={() => handleContrib(goal)}
                style={{
                  padding: '7px 14px',
                  background: 'var(--accent)',
                  color: '#0a0a0f',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
