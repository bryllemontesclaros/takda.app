import { useEffect, useRef, useState } from 'react'
import { fsAdd, fsDel, fsUpdate } from '../lib/firestore'
import { getAccountSignedBalance, getCurrentBalance } from '../lib/finance'
import { displayValue, fmt, maskMoney, validateAmount, confirmDelete } from '../lib/utils'
import styles from './Page.module.css'
import accStyles from './Accounts.module.css'

const ACCOUNT_TYPES = ['Cash', 'Bank', 'E-wallet', 'Credit Card', 'Investment', 'Other']
const ACCOUNT_ICONS = { Cash: '💵', Bank: '🏦', 'E-wallet': '📱', 'Credit Card': '💳', Investment: '📈', Other: '🏷' }
const COLORS = [
  { name: 'Green', value: '#22d87a' },
  { name: 'Blue', value: '#6eb5ff' },
  { name: 'Amber', value: '#ffb347' },
  { name: 'Red', value: '#ff5370' },
  { name: 'Purple', value: '#b48eff' },
  { name: 'Teal', value: '#2dd4bf' },
  { name: 'Pink', value: '#f472b6' },
  { name: 'Gray', value: '#9090b0' },
]

const EMPTY_FORM = { name: '', type: 'Cash', balance: '', color: '#22d87a', notes: '' }

export default function Accounts({ user, data, symbol, privacyMode = false, onTogglePrivacy = () => {} }) {
  const s = symbol || '₱'
  const accounts = data.accounts || []
  const [form, setForm] = useState(EMPTY_FORM)
  const [editAccount, setEditAccount] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const editorRef = useRef(null)

  function set(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function openAdd() {
    setEditAccount(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(account) {
    setEditAccount(account)
    setForm({ name: account.name, type: account.type, balance: account.balance, color: account.color || '#22d87a', notes: account.notes || '' })
    setShowModal(true)
  }

  function closeEditor() {
    setShowModal(false)
    setEditAccount(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    if (!form.name || form.balance === '') return alert('Add an account name and balance.')
    const amountError = validateAmount(Number(form.balance) || 0, 'Balance')
    if (amountError && Number(form.balance) !== 0) return alert(amountError)
    const payload = { name: form.name, type: form.type, balance: parseFloat(form.balance) || 0, color: form.color, notes: form.notes }
    if (editAccount) {
      await fsUpdate(user.uid, 'accounts', editAccount._id, payload)
    } else {
      await fsAdd(user.uid, 'accounts', payload)
    }
    closeEditor()
  }

  async function handleDel(id, name) {
    if (!confirmDelete(name)) return
    await fsDel(user.uid, 'accounts', id)
  }

  const totalBalance = getCurrentBalance(accounts)
  const money = value => displayValue(privacyMode, fmt(value, s), maskMoney(s))
  const balanceFieldLabel = form.type === 'Credit Card' ? `Current amount owed (${s})` : `Balance now (${s})`
  const privacyHint = privacyMode ? 'Tap to show balances' : 'Tap to hide balances'

  useEffect(() => {
    if (showModal && editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showModal, editAccount?._id])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Accounts</div>
        <div className={styles.sub}>Keep your cash, bank, and e-wallet balances in one clear view.</div>
      </div>

      <button
        type="button"
        className={`${accStyles.totalCard} ${accStyles.privacyCardButton}`}
        onClick={onTogglePrivacy}
        aria-pressed={privacyMode}
        title={privacyHint}
      >
        <div className={accStyles.totalLabel}>Total balance</div>
        <div className={accStyles.totalVal}>{money(totalBalance)}</div>
        <div className={accStyles.totalSub}>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</div>
        <div className={accStyles.privacyHint}>{privacyHint}</div>
      </button>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className={styles.btnAdd} style={{ width: 'auto', padding: '9px 20px' }} onClick={openAdd}>+ Add account</button>
      </div>

      {showModal && (
        <div ref={editorRef} className={`${styles.card} ${accStyles.inlineEditorCard}`}>
          <div className={accStyles.modalHeader}>
            <div>
              <div className={accStyles.modalTitle}>{editAccount ? 'Edit account' : 'Add account'}</div>
              <div className={accStyles.editorSub}>
                {editAccount ? `Updating ${editAccount.name}` : 'Add an account without leaving this page.'}
              </div>
            </div>
            <button onClick={closeEditor} className={accStyles.modalClose}>✕</button>
          </div>

          <div className={`${styles.formRow} ${styles.col2}`} style={{ marginBottom: 12 }}>
            <div className={styles.formGroup}>
              <label>Account name</label>
              <input placeholder="e.g. BDO Savings" value={form.name} onChange={event => set('name', event.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Type</label>
              <select value={form.type} onChange={event => set('type', event.target.value)}>
                {ACCOUNT_TYPES.map(type => <option key={type}>{type}</option>)}
              </select>
            </div>
          </div>

          <div className={`${styles.formRow} ${styles.col2}`} style={{ marginBottom: 12 }}>
            <div className={styles.formGroup}>
              <label>{balanceFieldLabel}</label>
              <input type="number" min="0" placeholder="0.00" value={form.balance} onChange={event => set('balance', event.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Notes (optional)</label>
              <input placeholder="e.g. Emergency only" value={form.notes} onChange={event => set('notes', event.target.value)} />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '1.25rem' }}>
            <label>Color</label>
            <div className={accStyles.colorGrid}>
              {COLORS.map(color => (
                <button key={color.value} onClick={() => set('color', color.value)} className={`${accStyles.colorBtn} ${form.color === color.value ? accStyles.colorBtnActive : ''}`} style={{ background: color.value }} title={color.name} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={closeEditor} className={accStyles.btnCancel}>Cancel</button>
            <button onClick={handleSave} className={styles.btnAdd} style={{ flex: 2 }}>{editAccount ? 'Save changes' : 'Add account'}</button>
          </div>
        </div>
      )}

      {!accounts.length ? (
        <div className={styles.empty} style={{ padding: '3rem 0' }}>No accounts yet. Add one above to give Takda a real starting balance.</div>
      ) : (
        <div className={accStyles.accountsGrid}>
          {accounts.map(account => (
            <div key={account._id} className={`${accStyles.accountCard} ${editAccount?._id === account._id ? accStyles.accountCardEditing : ''}`}>
              <div className={accStyles.accountTop}>
                <div className={accStyles.accountIcon} style={{ background: `${account.color || '#22d87a'}22`, color: account.color || '#22d87a' }}>
                  {ACCOUNT_ICONS[account.type] || '🏷'}
                </div>
                <div className={accStyles.accountInfo}>
                  <div className={accStyles.accountName}>{account.name}</div>
                  <div className={accStyles.accountType}>
                    <span className={accStyles.typeDot} style={{ background: account.color || '#22d87a' }} />
                    {account.type}
                  </div>
                </div>
                <div className={accStyles.accountActions}>
                  <button className={accStyles.editBtn} onClick={() => openEdit(account)}>Edit</button>
                  <button className={accStyles.delBtn} onClick={() => handleDel(account._id, account.name)}>✕</button>
                </div>
              </div>

              <div className={accStyles.accountBalance} style={{ color: account.color || 'var(--accent)' }}>
                {money(getAccountSignedBalance(account))}
              </div>

              {account.notes && <div className={accStyles.accountNotes}>{account.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
