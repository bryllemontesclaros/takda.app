import { useMemo, useState } from 'react'
import { fsAdd, fsDel, fsUpdate } from '../lib/firestore'
import { confirmDeleteApp, notifyApp } from '../lib/appFeedback'
import { findBillPresetByLabel, getBillPresetByKey, getBillPresetGroups, getBillQuickItems, getTransactionSubcategories } from '../lib/transactionOptions'
import { fmt, RECUR_OPTIONS } from '../lib/utils'
import styles from './Page.module.css'

const BILL_FREQS = RECUR_OPTIONS.filter(option => option.value !== '' && option.value !== 'daily')

function createBillForm() {
  return {
    name: '',
    amount: '',
    due: '',
    cat: 'Bills',
    subcat: getTransactionSubcategories('expense', 'Bills')[0],
    presetKey: '',
    freq: 'monthly',
    accountId: '',
  }
}

export default function Bills({ user, data, symbol }) {
  const s = symbol || '₱'
  const [form, setForm] = useState(createBillForm())
  const accounts = Array.isArray(data?.accounts) ? data.accounts : []
  const accountNameById = useMemo(() => {
    const map = new Map()
    accounts.forEach(acc => {
      if (acc?._id) map.set(acc._id, acc.name || 'Account')
    })
    return map
  }, [accounts])

  const quickPresets = useMemo(() => getBillQuickItems(), [])
  const presetGroups = useMemo(() => getBillPresetGroups(), [])
  const subcategories = useMemo(() => getTransactionSubcategories('expense', 'Bills'), [])
  const selectedPreset = useMemo(() => getBillPresetByKey(form.presetKey), [form.presetKey])

  function set(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function applyPreset(preset) {
    if (!preset || preset.isCustom) {
      setForm(current => ({ ...current, presetKey: '', cat: 'Bills' }))
      return
    }
    setForm(current => ({
      ...current,
      name: preset.desc || preset.label,
      cat: 'Bills',
      subcat: preset.subcat,
      presetKey: preset.key,
    }))
  }

  function handleSubcategoryChange(value) {
    setForm(current => ({
      ...current,
      cat: 'Bills',
      subcat: value,
      presetKey: '',
    }))
  }

  function handleNameChange(value) {
    const matchedPreset = findBillPresetByLabel(value)
    setForm(current => {
      if (!matchedPreset || matchedPreset.isCustom) {
        return { ...current, name: value, presetKey: '' }
      }
      return {
        ...current,
        name: value,
        cat: 'Bills',
        subcat: matchedPreset.subcat,
        presetKey: matchedPreset.key,
      }
    })
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.amount || !form.due) {
      notifyApp({ title: 'Bill needs details', message: 'Add a bill name, amount, and due day before saving.', tone: 'warning' })
      return
    }

    await fsAdd(user.uid, 'bills', {
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      due: parseInt(form.due, 10),
      cat: 'Bills',
      subcat: form.subcat,
      presetKey: form.presetKey || '',
      freq: form.freq,
      paid: false,
      type: 'bill',
      accountId: form.accountId || '',
    })

    setForm(createBillForm())
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

        <div className={styles.formGroup}>
          <label>What bill is this for?</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
            {quickPresets.map(item => (
              <button
                key={item.key}
                type="button"
                className={styles.chip}
                onClick={() => item.isCustom ? applyPreset(null) : applyPreset(item)}
                style={form.presetKey === item.key ? { borderColor: 'var(--amber)', background: 'var(--amber-glow)', color: 'var(--amber)' } : {}}
              >
                {item.label}
              </button>
            ))}
          </div>
          <select
            value={form.presetKey || 'other-custom'}
            onChange={event => {
              const preset = getBillPresetByKey(event.target.value)
              if (!preset || preset.isCustom) {
                applyPreset(null)
                return
              }
              applyPreset(preset)
            }}
          >
            <option value="other-custom">Custom bill</option>
            {presetGroups.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
              </optgroup>
            ))}
          </select>
          <div className={styles.helper}>
            {selectedPreset && !selectedPreset.isCustom
              ? `${selectedPreset.label} auto-fills Bills → ${selectedPreset.subcat}.`
              : 'Choose a familiar biller like Meralco or Netflix, or keep it custom.'}
          </div>
        </div>

        <div className={`${styles.formRow} ${styles.col2}`}>
          <div className={styles.formGroup}>
            <label>Bill name</label>
            <input placeholder="e.g. Meralco" value={form.name} onChange={e => handleNameChange(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>Bill type</label>
            <select value={form.subcat} onChange={e => handleSubcategoryChange(e.target.value)}>
              {subcategories.map(option => <option key={option}>{option}</option>)}
            </select>
          </div>
        </div>

        <div className={`${styles.formRow} ${styles.col3}`}>
          <div className={styles.formGroup}>
            <label>Amount ({s})</label>
            <input type="number" min="0" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>Due day (1–31)</label>
            <input type="number" min={1} max={31} placeholder="e.g. 15" value={form.due} onChange={e => set('due', e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>Frequency</label>
            <select value={form.freq} onChange={e => set('freq', e.target.value)}>
              {BILL_FREQS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>

        <div className={`${styles.formRow} ${styles.col2}`}>
          <div className={styles.formGroup}>
            <label>Pay from account (optional)</label>
            <select value={form.accountId} onChange={e => set('accountId', e.target.value)}>
              <option value="">No account selected</option>
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>
                  {acc.name} · {acc.type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <button className={styles.btnAdd} onClick={handleAdd}>Add bill</button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Bills</div>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Account</th>
                <th>Due Day</th>
                <th>Frequency</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!data.bills.length
                ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text3)', padding: '2rem' }}>No bills yet. Add one above.</td></tr>
                : data.bills.map(row => (
                  <tr key={row._id}>
                    <td style={{ color: 'var(--text)' }}>{row.name}</td>
                    <td><span className={`${styles.badge} ${styles.badgeBill}`}>{row.subcat || row.cat}</span></td>
                    <td style={{ color: 'var(--text2)' }}>
                      {row.accountId ? (accountNameById.get(row.accountId) || 'Account') : '—'}
                    </td>
                    <td>Day {row.due}</td>
                    <td>{BILL_FREQS.find(option => option.value === row.freq)?.label || row.freq}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{fmt(row.amount, s)}</td>
                    <td>
                      <button
                        onClick={() => togglePaid(row)}
                        style={{ background: row.paid ? 'var(--accent-glow)' : 'var(--red-dim)', color: row.paid ? 'var(--accent)' : 'var(--red)', border: 'none', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {row.paid ? 'Paid' : 'Unpaid'}
                      </button>
                    </td>
                    <td><button className={styles.delBtn} onClick={async () => { if (await confirmDeleteApp(row.name)) await fsDel(user.uid, 'bills', row._id) }}>✕</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
