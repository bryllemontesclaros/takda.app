import { useMemo, useState } from 'react'
import GamificationCard from '../components/GamificationCard'
import { fsDeleteTransaction, fsUpdateTransaction } from '../lib/firestore'
import {
  findPresetByLabel,
  getPresetByKey,
  getPresetGroups,
  getTransactionCategories,
  getTransactionSubcategories,
  sanitizeTransactionCategory,
  sanitizeTransactionSubcategory,
} from '../lib/transactionOptions'
import { confirmDelete, displayValue, fmt, getMonthKey, maskMoney, RECUR_OPTIONS, validateAmount } from '../lib/utils'
import styles from './Page.module.css'
import hStyles from './History.module.css'

const ALL_CATS = ['All categories', ...new Set([...getTransactionCategories('income'), ...getTransactionCategories('expense')])]
const TYPES = ['All types', 'Income', 'Expense']

export default function History({ user, data, symbol, privacyMode = false, gamification }) {
  const s = symbol || '₱'
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All types')
  const [filterCat, setFilterCat] = useState('All categories')
  const [filterMonth, setFilterMonth] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [showFilters, setShowFilters] = useState(false)
  const [editTx, setEditTx] = useState(null)
  const [editForm, setEditForm] = useState({ desc: '', amount: '', cat: '', subcat: '', presetKey: '', accountId: '' })

  const hasActiveFilters = filterType !== 'All types' || filterCat !== 'All categories' || filterMonth
  const money = value => displayValue(privacyMode, fmt(value, s), maskMoney(s))
  const accountLookup = useMemo(
    () => Object.fromEntries((data.accounts || []).map(account => [account._id, account])),
    [data.accounts],
  )

  const allTx = useMemo(() => {
    const income = data.income.map(tx => ({ ...tx, type: 'income' }))
    const expenses = data.expenses.map(tx => ({ ...tx, type: 'expense' }))
    return [...income, ...expenses]
  }, [data.expenses, data.income])

  const filtered = useMemo(() => {
    let list = allTx
    if (search.trim()) {
      const query = search.toLowerCase()
      list = list.filter(tx => (
        (tx.desc || '').toLowerCase().includes(query)
        || (tx.cat || '').toLowerCase().includes(query)
        || (tx.subcat || '').toLowerCase().includes(query)
      ))
    }
    if (filterType !== 'All types') list = list.filter(tx => tx.type === filterType.toLowerCase())
    if (filterCat !== 'All categories') list = list.filter(tx => tx.cat === filterCat)
    if (filterMonth) list = list.filter(tx => getMonthKey(tx.date) === filterMonth)

    return [...list].sort((a, b) => {
      if (sortBy === 'date-desc') return String(b.date || '').localeCompare(String(a.date || ''))
      if (sortBy === 'date-asc') return String(a.date || '').localeCompare(String(b.date || ''))
      if (sortBy === 'amount-desc') return (b.amount || 0) - (a.amount || 0)
      if (sortBy === 'amount-asc') return (a.amount || 0) - (b.amount || 0)
      return 0
    })
  }, [allTx, filterCat, filterMonth, filterType, search, sortBy])

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(tx => {
      const key = tx.date || 'No date'
      if (!map[key]) map[key] = []
      map[key].push(tx)
    })
    return Object.entries(map).sort((a, b) => {
      if (sortBy === 'date-asc') return a[0].localeCompare(b[0])
      return b[0].localeCompare(a[0])
    })
  }, [filtered, sortBy])

  const totalIncome = filtered.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + (tx.amount || 0), 0)
  const totalExpense = filtered.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + (tx.amount || 0), 0)
  const net = totalIncome - totalExpense
  const transactionCountLabel = `${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`

  function clearFilters() {
    setFilterType('All types')
    setFilterCat('All categories')
    setFilterMonth('')
    setSortBy('date-desc')
  }

  async function handleDelete(tx) {
    if (!confirmDelete(tx.desc)) return
    const collection = tx.type === 'income' ? 'income' : 'expenses'
    await fsDeleteTransaction(user.uid, collection, tx, data.accounts)
  }

  function openEdit(tx) {
    const nextCat = sanitizeTransactionCategory(tx.type, tx.cat)
    const matchedPreset =
      getPresetByKey(tx.type, tx.presetKey || '')
      || findPresetByLabel(tx.type, tx.desc || '')
    const nextSubcat = sanitizeTransactionSubcategory(tx.type, nextCat, tx.subcat || matchedPreset?.subcat)
    setEditTx(tx)
    setEditForm({
      desc: tx.desc || '',
      amount: String(tx.amount || ''),
      cat: nextCat,
      subcat: nextSubcat,
      presetKey: matchedPreset && !matchedPreset.isCustom && matchedPreset.cat === nextCat && matchedPreset.subcat === nextSubcat ? matchedPreset.key : '',
      accountId: tx.accountId || '',
    })
  }

  async function handleSaveEdit() {
    const error = validateAmount(editForm.amount)
    if (error) return alert(error)
    if (!editForm.desc) return alert('Description is required.')
    const collection = editTx.type === 'income' ? 'income' : 'expenses'
    await fsUpdateTransaction(user.uid, collection, editTx, {
      desc: editForm.desc,
      amount: parseFloat(editForm.amount),
      cat: editForm.cat,
      subcat: editForm.subcat,
      presetKey: editForm.presetKey || '',
      accountId: editForm.accountId,
      accountBalanceLinked: Boolean(editTx.accountBalanceLinked),
    }, data.accounts)
    setEditTx(null)
  }

  const typeColor = { income: 'var(--accent)', expense: 'var(--red)' }
  const typeBg = { income: 'var(--accent-glow)', expense: 'var(--red-dim)' }
  const typeSign = { income: '+', expense: '−' }
  const editCats = editTx ? getTransactionCategories(editTx.type) : []
  const editSubcats = editTx ? getTransactionSubcategories(editTx.type, editForm.cat) : []
  const editPresetGroups = editTx ? getPresetGroups(editTx.type) : []
  const editSelectedPreset = editTx ? getPresetByKey(editTx.type, editForm.presetKey) : null

  function clearEditPreset() {
    if (!editTx) return
    const nextCat = 'Other'
    const nextSubcat = sanitizeTransactionSubcategory(editTx.type, nextCat, 'Miscellaneous')
    setEditForm(current => ({ ...current, presetKey: '', cat: nextCat, subcat: nextSubcat }))
  }

  function applyEditPreset(nextPresetKey) {
    if (!editTx) return
    const preset = getPresetByKey(editTx.type, nextPresetKey)
    if (!preset || preset.isCustom) {
      clearEditPreset()
      return
    }
    setEditForm(current => ({
      ...current,
      presetKey: preset.key,
      desc: preset.desc || preset.label,
      cat: preset.cat,
      subcat: preset.subcat,
    }))
  }

  function handleEditCategoryChange(value) {
    if (!editTx) return
    const nextCat = sanitizeTransactionCategory(editTx.type, value)
    const nextSubcat = getTransactionSubcategories(editTx.type, nextCat)[0]
    setEditForm(current => ({ ...current, presetKey: '', cat: nextCat, subcat: nextSubcat }))
  }

  function handleEditSubcategoryChange(value) {
    if (!editTx) return
    const nextSubcat = sanitizeTransactionSubcategory(editTx.type, editForm.cat, value)
    setEditForm(current => ({ ...current, presetKey: '', subcat: nextSubcat }))
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>History</div>
        <div className={styles.sub}>{transactionCountLabel}</div>
      </div>

      <GamificationCard
        gamification={gamification}
        privacyMode={privacyMode}
        compact
        title="Ledger review"
        message="A clean history makes your reports, trends, and forecasts easier to trust."
      />

      <div className={hStyles.searchRow}>
        <input className={hStyles.searchInput} placeholder="Search description, category, or subcategory" value={search} onChange={event => setSearch(event.target.value)} />
        {search && <button className={hStyles.clearSearch} onClick={() => setSearch('')}>✕</button>}
        <button className={`${hStyles.filterBtn} ${hasActiveFilters ? hStyles.filterBtnActive : ''}`} onClick={() => setShowFilters(value => !value)}>
          {hasActiveFilters ? '● Filters' : 'Filters'}
        </button>
      </div>

      {showFilters && (
        <div className={hStyles.filterPanel}>
          <div className={hStyles.filterGrid}>
            <div className={hStyles.filterGroup}>
              <label>Type</label>
              <select value={filterType} onChange={event => setFilterType(event.target.value)}>
                {TYPES.map(type => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div className={hStyles.filterGroup}>
              <label>Category</label>
              <select value={filterCat} onChange={event => setFilterCat(event.target.value)}>
                {ALL_CATS.map(cat => <option key={cat}>{cat}</option>)}
              </select>
            </div>
            <div className={hStyles.filterGroup}>
              <label>Month</label>
              <input type="month" value={filterMonth} onChange={event => setFilterMonth(event.target.value)} />
            </div>
            <div className={hStyles.filterGroup}>
              <label>Sort by</label>
              <select value={sortBy} onChange={event => setSortBy(event.target.value)}>
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="amount-desc">Highest amount</option>
                <option value="amount-asc">Lowest amount</option>
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <button className={hStyles.clearFiltersBtn} onClick={clearFilters}>✕ Clear all filters</button>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className={hStyles.totalsBar}>
          <div className={hStyles.totalItem}>
            <div className={hStyles.totalLabel}>Income</div>
            <div className={hStyles.totalVal} style={{ color: 'var(--accent)' }}>{displayValue(privacyMode, `+${fmt(totalIncome, s)}`, `+${maskMoney(s)}`)}</div>
          </div>
          <div className={hStyles.totalDivider} />
          <div className={hStyles.totalItem}>
            <div className={hStyles.totalLabel}>Expenses</div>
            <div className={hStyles.totalVal} style={{ color: 'var(--red)' }}>{displayValue(privacyMode, `−${fmt(totalExpense, s)}`, `−${maskMoney(s)}`)}</div>
          </div>
          <div className={hStyles.totalDivider} />
          <div className={hStyles.totalItem}>
            <div className={hStyles.totalLabel}>Net</div>
            <div className={hStyles.totalVal} style={{ color: net >= 0 ? 'var(--blue)' : 'var(--red)', fontWeight: 700 }}>
              {displayValue(privacyMode, `${net >= 0 ? '+' : ''}${fmt(net, s)}`, `${net >= 0 ? '+' : ''}${maskMoney(s)}`)}
            </div>
          </div>
        </div>
      )}

      {!filtered.length ? (
        <div className={styles.card}>
          <div className={styles.empty}>
            {hasActiveFilters || search
              ? <><div>No entries match those filters.</div><button className={hStyles.clearFiltersBtn} style={{ marginTop: 12 }} onClick={() => { clearFilters(); setSearch('') }}>Clear filters</button></>
              : 'No transactions yet. Add your first income or expense to start the ledger.'}
          </div>
        </div>
      ) : grouped.map(([date, txs]) => {
        const dayIncome = txs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + (tx.amount || 0), 0)
        const dayExpense = txs.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + (tx.amount || 0), 0)
        const dayNet = dayIncome - dayExpense

        return (
          <div key={date} className={hStyles.dateGroup}>
            <div className={hStyles.dateHeader}>
              <span className={hStyles.dateLabel}>{date}</span>
              <span className={hStyles.dateSummary} style={{ color: dayNet >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                {displayValue(privacyMode, `${dayNet >= 0 ? '+' : ''}${fmt(dayNet, s)}`, `${dayNet >= 0 ? '+' : ''}${maskMoney(s)}`)}
              </span>
            </div>
            <div className={styles.card} style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
              {txs.map((tx, index) => (
                <div key={tx._id + index} className={hStyles.txRow}>
                  <div className={hStyles.txIcon} style={{ background: typeBg[tx.type], color: typeColor[tx.type] }}>
                    {typeSign[tx.type]}
                  </div>
                  <div className={hStyles.txInfo}>
                    <div className={hStyles.txDesc}>{tx.desc}</div>
                    <div className={hStyles.txMeta}>
                      <span className={hStyles.txCat}>{[tx.cat, tx.subcat].filter(Boolean).join(' · ')}</span>
                      {tx.accountId && <span className={hStyles.txAccount}>{accountLookup[tx.accountId]?.name || 'Missing account'}</span>}
                      {tx.recur && (
                        <span className={hStyles.txRecur}>{RECUR_OPTIONS.find(option => option.value === tx.recur)?.label || tx.recur}</span>
                      )}
                    </div>
                  </div>
                  <div className={hStyles.txRight}>
                    <div className={hStyles.txAmount} style={{ color: typeColor[tx.type] }}>
                      {displayValue(privacyMode, `${typeSign[tx.type]}${fmt(tx.amount, s)}`, `${typeSign[tx.type]}${maskMoney(s)}`)}
                    </div>
                    <div className={hStyles.txActions}>
                      <button className={hStyles.editBtn} onClick={() => openEdit(tx)}>Edit</button>
                      <button className={hStyles.delBtn} onClick={() => handleDelete(tx)}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {editTx && (
        <div className={hStyles.modalOverlay} onClick={event => { if (event.target === event.currentTarget) setEditTx(null) }}>
          <div className={hStyles.modal}>
            <div className={hStyles.modalHeader}>
              <div className={hStyles.modalTitle}>Edit transaction</div>
              <button onClick={() => setEditTx(null)} className={hStyles.modalClose}>✕</button>
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 12 }}>
              <label>Description</label>
              <input value={editForm.desc} onChange={event => setEditForm(current => ({ ...current, desc: event.target.value }))} placeholder="Description" />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 12 }}>
              <label>Preset</label>
              <select value={editForm.presetKey || 'other-custom'} onChange={event => {
                if (event.target.value === 'other-custom') clearEditPreset()
                else applyEditPreset(event.target.value)
              }}>
                {editPresetGroups.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </optgroup>
                ))}
                <option value="other-custom">Other / custom</option>
              </select>
              <div className={styles.helper} style={{ marginTop: 8 }}>
                {editSelectedPreset
                  ? `${editSelectedPreset.label} maps to ${editSelectedPreset.cat} → ${editSelectedPreset.subcat}.`
                  : 'No preset selected. This transaction will stay as a custom entry.'}
              </div>
            </div>
            <div className={`${styles.formRow} ${styles.col2}`} style={{ marginBottom: 12 }}>
              <div className={styles.formGroup}>
                <label>Amount ({s})</label>
                <input type="number" min="0" value={editForm.amount} onChange={event => setEditForm(current => ({ ...current, amount: event.target.value }))} />
              </div>
              <div className={styles.formGroup}>
                <label>Category</label>
                <select value={editForm.cat} onChange={event => handleEditCategoryChange(event.target.value)}>
                  {editCats.map(cat => <option key={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 12 }}>
              <label>Subcategory</label>
              <select value={editForm.subcat} onChange={event => handleEditSubcategoryChange(event.target.value)}>
                {editSubcats.map(subcat => <option key={subcat}>{subcat}</option>)}
              </select>
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 12 }}>
              <label>Account</label>
              <select value={editForm.accountId} onChange={event => setEditForm(current => ({ ...current, accountId: event.target.value }))}>
                <option value="">No account selected</option>
                {data.accounts.map(account => (
                  <option key={account._id} value={account._id}>
                    {account.name} · {account.type}
                  </option>
                ))}
              </select>
            </div>
            {editTx && !editTx.accountBalanceLinked && editForm.accountId && (
              <div className={hStyles.accountNote}>
                Older unlinked entries can store an account here for reference, but they do not rewrite today&apos;s balances automatically.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditTx(null)} className={hStyles.btnCancel}>Cancel</button>
              <button onClick={handleSaveEdit} className={styles.btnAdd} style={{ flex: 2 }}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
