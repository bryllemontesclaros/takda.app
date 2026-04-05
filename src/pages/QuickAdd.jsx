import { useState } from 'react'
import { fsAdd } from '../lib/firestore'
import {
  DEFAULT_CATEGORY_BY_TYPE,
  getDefaultTransactionDraft,
  getQuickItems,
  getQuickPick,
  getSuggestedDescription,
  getTransactionCategories,
} from '../lib/transactionOptions'
import { RECUR_OPTIONS, today } from '../lib/utils'
import ReceiptScanner from '../components/ReceiptScanner'
import styles from './QuickAdd.module.css'

function normalizeAmountInput(value) {
  const cleaned = value.replace(/[^\d.]/g, '')
  if (!cleaned) return ''

  const parts = cleaned.split('.')
  const integerPart = (parts[0] || '0').replace(/^0+(?=\d)/, '') || '0'
  const decimalPart = parts.slice(1).join('').slice(0, 2)

  if (parts.length > 1 || cleaned.endsWith('.')) return `${integerPart}.${decimalPart}`
  return integerPart
}

export default function QuickAdd({ user, symbol, onClose, defaultType = 'expense', defaultDate, initialEntry = null }) {
  const s = symbol || '₱'
  const initialType = initialEntry?.type || defaultType
  const initialDraft = getDefaultTransactionDraft(initialType)
  const initialCat = initialEntry?.cat || initialDraft.cat
  const initialDesc = initialEntry ? (initialEntry.desc || getSuggestedDescription(initialType, initialCat)) : initialDraft.desc
  const [type, setType] = useState(initialType)
  const [amount, setAmount] = useState(initialEntry?.amount ? String(initialEntry.amount) : '')
  const [desc, setDesc] = useState(initialDesc)
  const [cat, setCat] = useState(initialCat)
  const [quickPick, setQuickPick] = useState(
    initialEntry ? getQuickPick(initialType, initialCat, initialDesc) : getQuickPick(initialType, initialCat, initialDraft.desc) || initialDraft.desc
  )
  const [descTouched, setDescTouched] = useState(Boolean(initialEntry?.desc))
  const [entryDate, setEntryDate] = useState(initialEntry?.date || defaultDate || today())
  const [recur, setRecur] = useState(initialEntry?.recur || '')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const isIncome = type === 'income'

  const quickCats = getQuickItems(type)
  const categories = getTransactionCategories(type)

  function applyCategory(nextCat, nextQuickPick = '') {
    const resolvedQuickPick = nextQuickPick || getQuickPick(type, nextCat, '')
    setCat(nextCat)
    setQuickPick(resolvedQuickPick)
    if (!descTouched) setDesc(resolvedQuickPick || getSuggestedDescription(type, nextCat))
    setError('')
  }

  function selectCat(item) {
    applyCategory(item.cat, item.label)
  }

  function switchType(nextType) {
    if (nextType === type) return
    const nextDraft = getDefaultTransactionDraft(nextType)
    setType(nextType)
    setCat(nextDraft.cat)
    setQuickPick(getQuickPick(nextType, nextDraft.cat, nextDraft.desc) || nextDraft.desc)
    if (!descTouched) setDesc(nextDraft.desc)
    setError('')
  }

  function handleAmountChange(event) {
    setAmount(normalizeAmountInput(event.target.value))
    setError('')
  }

  function handleCategoryChange(event) {
    applyCategory(event.target.value)
  }

  const [showScanner, setShowScanner] = useState(false)

  // Numpad input
  function numPress(val) {
    setError('')
    if (val === 'C') { setAmount(''); return }
    if (val === '⌫') { setAmount(a => a.slice(0, -1)); return }
    if (val === '.' && amount.includes('.')) return
    if (amount === '0' && val !== '.') {
      setAmount(normalizeAmountInput(String(val)))
      return
    }
    setAmount(current => normalizeAmountInput(`${current}${val}`))
  }

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) return
    if (!entryDate) {
      setError('Pick a date before saving this entry.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const col = type === 'income' ? 'income' : 'expenses'
      const trimmedDesc = desc.trim()
      await fsAdd(user.uid, col, {
        desc: trimmedDesc,
        amount: parseFloat(amount),
        date: entryDate,
        cat,
        recur,
        type,
      })
      setDone(true)
      setTimeout(() => {
        const resetDraft = getDefaultTransactionDraft(type)
        setAmount('')
        setDesc(resetDraft.desc)
        setCat(resetDraft.cat)
        setQuickPick(getQuickPick(type, resetDraft.cat, resetDraft.desc) || resetDraft.desc)
        setDescTouched(false)
        setRecur('')
        if (!defaultDate) setEntryDate(today())
        setDone(false)
        setSaving(false)
        if (onClose) onClose()
      }, 600)
    } catch {
      setSaving(false)
      setDone(false)
      setError('Failed to save this entry. Check your Firebase setup and try again.')
    }
  }

  function handleReceiptResult(parsed) {
    const nextType = parsed.type === 'income' ? 'income' : 'expense'
    const nextCat = parsed.cat || DEFAULT_CATEGORY_BY_TYPE[nextType]
    const nextDesc = parsed.desc || ''
    const nextDraft = getDefaultTransactionDraft(nextType)
    const nextQuickPick = getQuickPick(nextType, nextCat, nextDesc) || (nextDesc ? '' : nextDraft.desc)
    if (parsed.amount) setAmount(String(parsed.amount))
    setDesc(nextDesc || nextQuickPick)
    setDescTouched(Boolean(nextDesc))
    setCat(nextCat)
    setQuickPick(nextQuickPick)
    if (parsed.date && !defaultDate) setEntryDate(parsed.date)
    setType(nextType)
    setShowScanner(false)
  }
  const color = isIncome ? 'var(--accent)' : 'var(--red)'
  const bgColor = isIncome ? 'var(--accent-glow)' : 'var(--red-dim)'

  if (showScanner) return <ReceiptScanner defaultMode="wallet" onResult={handleReceiptResult} onClose={() => setShowScanner(false)} />

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionLabel}>Entry type</div>
      <div className={styles.typeRow}>
        <button
          className={`${styles.typeTab} ${!isIncome ? styles.typeTabExpense : ''}`}
          onClick={() => switchType('expense')}
          aria-pressed={!isIncome}
        >
          − Expense
        </button>
        <button
          className={`${styles.typeTab} ${isIncome ? styles.typeTabIncome : ''}`}
          onClick={() => switchType('income')}
          aria-pressed={isIncome}
        >
          + Income
        </button>
      </div>

      <div className={styles.sectionLabel}>Amount</div>
      <div className={styles.amountDisplay} style={{ color, borderColor: color, background: bgColor }}>
        <span className={styles.currencySign}>{s}</span>
        <input
          className={styles.amountInput}
          inputMode="decimal"
          aria-label="Amount"
          placeholder="0"
          value={amount}
          onChange={handleAmountChange}
        />
      </div>

      <div className={styles.utilityRow}>
        <button className={styles.importBtn} onClick={() => setShowScanner(true)}>
          <span className={styles.importBtnIcon}>🧾</span>
          <span>Scan or import</span>
        </button>
      </div>

      <div className={styles.sectionLabel}>Category</div>
      <div className={styles.quickCats}>
        {quickCats.map(item => (
          <button
            key={item.label}
            className={`${styles.quickCat} ${quickPick === item.label ? styles.quickCatActive : ''}`}
            style={quickPick === item.label ? { borderColor: color, background: bgColor, color } : {}}
            onClick={() => selectCat(item)}
            aria-pressed={quickPick === item.label}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <label className={styles.metaField}>
        <span className={styles.fieldLabel}>All categories</span>
        <select
          className={styles.fieldControl}
          value={cat}
          onChange={handleCategoryChange}
        >
          {categories.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>

      <div className={styles.sectionLabel}>Details</div>
      <div className={styles.descRow}>
        <input
          className={styles.descInput}
          placeholder="Merchant or note (optional)"
          value={desc}
          onChange={e => {
            setDesc(e.target.value)
            setDescTouched(true)
            setError('')
          }}
        />
      </div>

      <div className={styles.metaGrid}>
        <label className={styles.metaField}>
          <span className={styles.fieldLabel}>Date</span>
          <input
            type="date"
            className={styles.fieldControl}
            value={entryDate}
            onChange={event => {
              setEntryDate(event.target.value)
              setError('')
            }}
          />
        </label>
        <label className={styles.metaField}>
          <span className={styles.fieldLabel}>Recurrence</span>
          <select
            className={styles.fieldControl}
            value={recur}
            onChange={event => {
              setRecur(event.target.value)
              setError('')
            }}
          >
            {RECUR_OPTIONS.map(option => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {error && <div className={styles.formError}>{error}</div>}

      {/* NUMPAD */}
      <div className={styles.numpad}>
        {[7,8,9,'C',4,5,6,'⌫',1,2,3,'.',0,'00',''].map((k, i) => (
          k === '' ? <div key={i} /> :
          <button
            key={i}
            className={`${styles.numKey} ${k === 'C' ? styles.numKeyClear : ''} ${k === '⌫' ? styles.numKeyBack : ''}`}
            onClick={() => numPress(k)}
          >
            {k}
          </button>
        ))}
      </div>

      {/* SAVE */}
      <button
        className={styles.saveBtn}
        style={{ background: done ? 'var(--accent)' : color, color: isIncome || done ? '#0a0a0f' : '#fff' }}
        onClick={handleSave}
        disabled={saving || !entryDate || !amount || Number.parseFloat(amount) <= 0}
      >
        {done ? '✓ Saved!' : saving ? 'Saving...' : `${isIncome ? '+ Add Income' : '− Add Expense'} · ${s}${amount || '0'}`}
      </button>
    </div>
  )
}
