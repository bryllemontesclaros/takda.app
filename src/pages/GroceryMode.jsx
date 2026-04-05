import { useMemo, useState } from 'react'
import { fsAdd } from '../lib/firestore'
import { fmt, today } from '../lib/utils'
import ReceiptScanner from '../components/ReceiptScanner'
import styles from './GroceryMode.module.css'

const GROCERY_CATEGORIES = ['Food & Dining', 'Shopping', 'Other']

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100
}

function createDraft(seed = {}) {
  return {
    id: seed.id || '',
    name: seed.name || seed.desc || '',
    amount: seed.amount ? String(seed.amount) : '',
  }
}

export default function GroceryMode({ user, symbol, defaultDate, onClose }) {
  const s = symbol || '₱'
  const [tripName, setTripName] = useState('Grocery trip')
  const [tripDate, setTripDate] = useState(defaultDate || today())
  const [tripCategory, setTripCategory] = useState('Food & Dining')
  const [items, setItems] = useState([])
  const [draft, setDraft] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const total = useMemo(
    () => roundMoney(items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)),
    [items],
  )

  function openManualDraft() {
    setDraft(createDraft())
  }

  function openEditDraft(item) {
    setDraft(createDraft(item))
  }

  function saveDraft() {
    if (!draft?.amount || Number(draft.amount) <= 0) return

    const nextItem = {
      id: draft.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: draft.name?.trim() || `Item ${items.length + 1}`,
      amount: roundMoney(draft.amount),
    }

    setItems(current => {
      if (draft.id) {
        return current.map(item => item.id === draft.id ? nextItem : item)
      }
      return [...current, nextItem]
    })
    setDraft(null)
  }

  function removeItem(id) {
    setItems(current => current.filter(item => item.id !== id))
    if (draft?.id === id) setDraft(null)
  }

  function handleScanResult(parsed) {
    setScannerOpen(false)
    setDraft(createDraft(parsed))
  }

  async function handleImport() {
    if (!items.length || total <= 0) return

    setSaving(true)
    try {
      await fsAdd(user.uid, 'expenses', {
        desc: tripName.trim() || `Grocery trip (${items.length} items)`,
        amount: total,
        date: tripDate,
        cat: tripCategory,
        recur: '',
        type: 'expense',
        source: 'grocery-mode',
        items: items.map(item => ({
          name: item.name,
          amount: roundMoney(item.amount),
        })),
      })
      setDone(true)
      window.setTimeout(() => {
        onClose?.()
      }, 650)
    } catch {
      alert('Could not import this grocery trip right now. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (scannerOpen) {
    return (
      <ReceiptScanner
        context="grocery"
        defaultMode="receipt"
        onResult={handleScanResult}
        onClose={() => setScannerOpen(false)}
      />
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Grocery mode</div>
          <div className={styles.title}>Build your grocery total before checkout.</div>
          <div className={styles.sub}>
            Scan price tags one by one, confirm each item, and import the final total as one expense to your calendar.
          </div>
        </div>
        <button className={styles.close} onClick={onClose}>✕</button>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryTop}>
          <div>
            <div className={styles.summaryLabel}>Running total</div>
            <div className={styles.summaryValue}>{fmt(total, s)}</div>
          </div>
          <div className={styles.summaryMeta}>
            <div className={styles.summaryMetaVal}>{items.length}</div>
            <div className={styles.summaryMetaLabel}>items</div>
          </div>
        </div>
        <div className={styles.summaryHint}>
          Keep scanning or add items manually. When you’re done, Takda will save one grocery expense with the item breakdown attached.
        </div>
      </div>

      <div className={styles.tripGrid}>
        <label className={styles.field}>
          <span>Trip name</span>
          <input value={tripName} onChange={event => setTripName(event.target.value)} placeholder="Grocery trip" />
        </label>
        <label className={styles.field}>
          <span>Date</span>
          <input type="date" value={tripDate} onChange={event => setTripDate(event.target.value)} />
        </label>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>Import category</span>
          <select value={tripCategory} onChange={event => setTripCategory(event.target.value)}>
            {GROCERY_CATEGORIES.map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.actionRow}>
        <button className={styles.secondaryBtn} onClick={() => setScannerOpen(true)}>🧾 Scan price tag</button>
        <button className={styles.secondaryBtn} onClick={openManualDraft}>+ Add item manually</button>
      </div>

      {draft && (
        <div className={styles.draftCard}>
          <div className={styles.draftTitle}>{draft.id ? 'Edit grocery item' : 'Review grocery item'}</div>
          <div className={styles.tripGrid}>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Item name</span>
              <input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="e.g. Rice, milk, eggs" />
            </label>
            <label className={styles.field}>
              <span>Price</span>
              <input type="number" min="0" step="0.01" value={draft.amount} onChange={event => setDraft(current => ({ ...current, amount: event.target.value }))} placeholder="0.00" />
            </label>
          </div>
          <div className={styles.draftActions}>
            <button className={styles.ghostBtn} onClick={() => setDraft(null)}>Cancel</button>
            <button className={styles.primaryBtn} onClick={saveDraft} disabled={!draft.amount || Number(draft.amount) <= 0}>
              {draft.id ? 'Save item' : 'Add item'}
            </button>
          </div>
        </div>
      )}

      <div className={styles.itemsCard}>
        <div className={styles.itemsHeader}>
          <div className={styles.itemsTitle}>Trip items</div>
          <div className={styles.itemsSub}>{items.length ? `${items.length} item${items.length === 1 ? '' : 's'} in this trip` : 'No items yet'}</div>
        </div>
        {items.length ? (
          <div className={styles.itemList}>
            {items.map(item => (
              <div key={item.id} className={styles.itemRow}>
                <div>
                  <div className={styles.itemName}>{item.name}</div>
                  <div className={styles.itemHint}>Ready to include in the grocery total</div>
                </div>
                <div className={styles.itemActions}>
                  <div className={styles.itemAmount}>{fmt(item.amount, s)}</div>
                  <button className={styles.inlineBtn} onClick={() => openEditDraft(item)}>Edit</button>
                  <button className={styles.inlineBtn} onClick={() => removeItem(item.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Scan a price tag or add an item manually to start this trip.
          </div>
        )}
      </div>

      <button className={styles.importBtn} onClick={handleImport} disabled={saving || done || !items.length || total <= 0}>
        {done ? '✓ Imported to calendar' : saving ? 'Importing...' : `Import grocery total to calendar · ${fmt(total, s)}`}
      </button>
    </div>
  )
}
