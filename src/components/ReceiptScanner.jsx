import { useEffect, useRef, useState } from 'react'
import { parseReceiptText, parseWalletText } from '../lib/importParser'
import {
  findPresetByLabel,
  getDefaultTransactionDraft,
  getTransactionCategories,
  sanitizeTransactionCategory,
  sanitizeTransactionSubcategory,
} from '../lib/transactionOptions'
import { formatDisplayDate, today } from '../lib/utils'
import rStyles from './ReceiptScanner.module.css'

const OCR_API = 'https://api.ocr.space/parse/image'
const OCR_KEY = import.meta.env.VITE_OCR_SPACE_API_KEY || ''
const EXPENSE_CATS = getTransactionCategories('expense')
const INCOME_CATS = getTransactionCategories('income')

const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  date: '',
  desc: '',
  cat: 'Other',
  reference: '',
}

function getCategoryOptions(type) {
  return type === 'income' ? INCOME_CATS : EXPENSE_CATS
}

function getManualDraft(mode, fileName = '', context = 'transaction') {
  const cleanedName = String(fileName || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()

  if (context === 'grocery') {
    return {
      ...EMPTY_FORM,
      type: 'expense',
      amount: '',
      date: '',
      desc: cleanedName || 'Grocery item',
      cat: 'Other',
      reference: '',
    }
  }

  const baseDesc = mode === 'wallet' ? 'Imported wallet transaction' : 'Imported receipt'
  return {
    ...EMPTY_FORM,
    type: 'expense',
    amount: '',
    date: today(),
    desc: cleanedName || baseDesc,
    cat: 'Other',
    reference: '',
  }
}

function getBlankDraft(context = 'transaction') {
  if (context === 'grocery') {
    return {
      ...EMPTY_FORM,
      type: 'expense',
      date: '',
    }
  }

  return {
    ...EMPTY_FORM,
    type: 'expense',
    date: today(),
  }
}

export default function ReceiptScanner({ onResult, onClose, defaultMode = 'wallet', context = 'transaction', embedded = false }) {
  const isGrocery = context === 'grocery'
  const [mode, setMode] = useState(isGrocery ? 'receipt' : defaultMode)
  const [status, setStatus] = useState('idle')
  const [preview, setPreview] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showDetails, setShowDetails] = useState(false)
  const [notice, setNotice] = useState({ text: '', tone: 'info' })
  const [rawText, setRawText] = useState('')
  const [sourceLabel, setSourceLabel] = useState('')
  const fileRef = useRef(null)
  const cameraRef = useRef(null)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function setField(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function resetState(nextMode = mode) {
    setStatus('idle')
    setNotice({ text: '', tone: 'info' })
    setRawText('')
    setSourceLabel('')
    setForm(getBlankDraft(context))
    setShowDetails(false)
    setMode(isGrocery ? 'receipt' : nextMode)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
  }

  function applyParsed(parsed) {
    if (isGrocery) {
      setForm({
        type: 'expense',
        amount: parsed.amount ? String(parsed.amount) : '',
        date: '',
        desc: parsed.desc || '',
        cat: 'Other',
        reference: parsed.reference || '',
      })
      setShowDetails(false)
      return
    }

    const nextType = parsed.type === 'income' ? 'income' : parsed.type === 'transfer' ? 'transfer' : 'expense'
    const categoryOptions = getCategoryOptions(nextType === 'income' ? 'income' : 'expense')
    const nextCategory = categoryOptions.includes(parsed.cat) ? parsed.cat : categoryOptions[categoryOptions.length - 1]

    setForm({
      type: nextType,
      amount: parsed.amount ? String(parsed.amount) : '',
      date: parsed.date || '',
      desc: parsed.desc || '',
      cat: nextCategory,
      reference: parsed.reference || '',
    })
    setShowDetails(Boolean(parsed.reference))
  }

  async function processImage(file) {
    if (!file) return

    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
    setStatus('loading')
    setNotice({ text: '', tone: 'info' })
    setSourceLabel(isGrocery ? 'Imported price tag' : mode === 'wallet' ? 'Imported wallet screenshot' : 'Imported receipt image')

    if (!OCR_KEY) {
      setRawText('')
      setForm(getManualDraft(mode, file.name, context))
      setShowDetails(false)
      setStatus('done')
      setNotice({
        text: isGrocery
          ? 'Auto-fill is unavailable right now, so enter the item and price manually.'
          : mode === 'wallet'
            ? 'Screenshot auto-fill is unavailable right now. Review and fill in the transaction details manually.'
            : 'Receipt auto-fill is unavailable right now. Enter the details manually.',
        tone: 'warning',
      })
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('apikey', OCR_KEY)
      formData.append('language', 'eng')
      formData.append('isOverlayRequired', 'false')
      formData.append('OCREngine', '2')
      formData.append('scale', 'true')

      const response = await fetch(OCR_API, { method: 'POST', body: formData })
      if (!response.ok) {
        throw new Error(`OCR request failed with status ${response.status}`)
      }
      const json = await response.json()

      if (json.IsErroredOnProcessing || !json.ParsedResults?.length) {
        throw new Error(json.ErrorMessage?.[0] || 'OCR failed')
      }

      const text = json.ParsedResults[0].ParsedText || ''
      const parsed = mode === 'wallet' ? parseWalletText(text) : parseReceiptText(text)

      setRawText(text)
      setSourceLabel(
        isGrocery
          ? (parsed.desc || 'Imported grocery item')
          : parsed.wallet || (mode === 'wallet' ? 'Imported wallet screenshot' : 'Imported receipt image'),
      )
      applyParsed(parsed)

      if (isGrocery) {
        setNotice({
          text: parsed.amount
            ? 'We found a price. Confirm the item name and amount before adding it.'
            : 'We could not find the price clearly. Enter it manually before adding the item.',
          tone: parsed.amount ? 'info' : 'warning',
        })
      } else if (mode === 'receipt') {
        if (parsed.amount) {
          setNotice({
            text: parsed.amountConfidence === 'low'
              ? 'We found a possible total. Please verify the amount before saving.'
              : 'We found the total. Please confirm the rest before saving.',
            tone: parsed.amountConfidence === 'low' ? 'warning' : 'info',
          })
        } else {
          setNotice({
            text: 'We read some text, but could not find the total clearly. Enter it manually.',
            tone: 'warning',
          })
        }
      } else if (!parsed.amount) {
        setNotice({
          text: 'We could not detect the amount clearly. Please confirm it manually.',
          tone: 'warning',
        })
      }
      setStatus('done')
    } catch {
      setRawText('')
      setForm(getManualDraft(mode, file.name, context))
      setShowDetails(false)
      setStatus('done')
      setNotice({
        text: isGrocery
          ? 'Could not read the price tag clearly. Enter the item and price manually.'
          : mode === 'wallet'
            ? 'Could not read the screenshot clearly. Review and fill in the transaction details manually.'
            : 'Could not read the receipt clearly. Enter the total manually and confirm the rest.',
        tone: 'warning',
      })
    }
  }

  function handleFile(event) {
    const file = event.target.files?.[0]
    if (file) processImage(file)
    event.target.value = ''
  }

  function handleConfirm() {
    if (isGrocery) {
      if (!form.amount) return
      onResult?.({
        amount: parseFloat(form.amount),
        desc: form.desc || 'Grocery item',
        reference: form.reference,
        source: 'grocery',
        rawText,
      })
      return
    }

    if (!form.amount || !form.date || !form.desc) return
    if (form.type === 'transfer') return

    const nextType = form.type === 'income' ? 'income' : 'expense'
    const nextDraft = getDefaultTransactionDraft(nextType)
    const nextCat = sanitizeTransactionCategory(nextType, form.cat || nextDraft.cat)
    const matchedPreset = findPresetByLabel(nextType, form.desc || '')
    const nextPreset = matchedPreset && !matchedPreset.isCustom && matchedPreset.cat === nextCat ? matchedPreset : null
    const nextSubcat = sanitizeTransactionSubcategory(nextType, nextCat, nextPreset?.subcat || nextDraft.subcat)

    onResult?.({
      type: nextType,
      amount: parseFloat(form.amount),
      date: form.date,
      desc: form.desc,
      cat: nextCat,
      subcat: nextSubcat,
      presetKey: nextPreset?.key || '',
      reference: form.reference,
      source: mode,
      rawText,
    })
  }

  const categoryOptions = getCategoryOptions(form.type === 'income' ? 'income' : 'expense')
  const headerTitle = isGrocery ? 'Import grocery item' : 'Import transaction'
  const headerSub = isGrocery
    ? 'Import a photo of a price tag or shelf label, then confirm the item before adding it to this trip.'
    : 'Import from a screenshot or receipt photo, then review before saving.'
  const uploadTitle = isGrocery
    ? 'Import a grocery price tag photo'
    : mode === 'wallet'
      ? 'Import a GCash or Maya screenshot'
      : 'Import a receipt photo or image'
  const uploadSub = isGrocery
    ? 'We will try to prefill the item name and price from the photo. Review before adding it to the list.'
    : mode === 'wallet'
      ? 'We will prefill amount, date, recipient, and type when possible.'
      : 'We will prefill total, date, merchant, and category when possible from the imported image.'
  const resultTitle = isGrocery ? 'Grocery item review' : sourceLabel || 'Imported transaction'
  const resultNote = isGrocery
    ? 'Price-tag OCR is assistive only, so confirm the name and price before adding the item.'
    : mode === 'wallet'
      ? 'We classified this from the screenshot. Confirm the type before saving.'
      : 'Receipt OCR is assistive only, so review the details before saving.'

  return (
    <div className={`${rStyles.wrap} ${embedded ? rStyles.embedded : ''}`}>
      {!embedded && (
        <div className={rStyles.header}>
          <div>
            <div className={rStyles.title}>{headerTitle}</div>
            <div className={rStyles.uploadSub}>
              {headerSub}
            </div>
          </div>
          <button className={rStyles.closeBtn} onClick={() => onClose?.()}>✕</button>
        </div>
      )}

      {!isGrocery && (
        <div className={rStyles.modeRow}>
          <button
            type="button"
            className={`${rStyles.modeBtn} ${mode === 'wallet' ? rStyles.modeBtnActive : ''}`}
            onClick={() => resetState('wallet')}
          >
            GCash / Maya screenshot
          </button>
          <button
            type="button"
            className={`${rStyles.modeBtn} ${mode === 'receipt' ? rStyles.modeBtnActive : ''}`}
            onClick={() => resetState('receipt')}
          >
            Receipt photo / image
          </button>
        </div>
      )}

      {status === 'idle' && (
        <div className={rStyles.uploadArea}>
          <div className={rStyles.uploadIcon}>{isGrocery ? '🛒' : mode === 'wallet' ? '📲' : '🧾'}</div>
          <div className={rStyles.uploadTitle}>{uploadTitle}</div>
          <div className={rStyles.uploadSub}>{uploadSub}</div>
          {notice.text && (
            <div className={`${rStyles.noticeMsg} ${notice.tone === 'warning' ? rStyles.noticeWarn : rStyles.noticeInfo}`}>
              {notice.tone === 'warning' ? '⚠ ' : 'ℹ '}
              {notice.text}
            </div>
          )}
          <div className={rStyles.btnRow}>
            {mode !== 'wallet' && (
              <button className={rStyles.btnCamera} onClick={() => cameraRef.current?.click()}>
                📷 Take photo
              </button>
            )}
            <button className={rStyles.btnUpload} onClick={() => fileRef.current?.click()}>
              📂 {isGrocery ? 'Upload photo' : mode === 'wallet' ? 'Upload screenshot' : 'Upload image'}
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>
      )}

      {status === 'loading' && (
        <div className={rStyles.loadingArea}>
          {preview && <img src={preview} className={rStyles.preview} alt="Imported transaction" />}
          <div className={rStyles.loadingText}>
            <div className={rStyles.spinner} />
            Reading {isGrocery ? 'price tag' : mode === 'wallet' ? 'wallet screenshot' : 'receipt'}...
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className={rStyles.resultArea}>
          {preview && <img src={preview} className={rStyles.preview} alt="Imported transaction" />}
          <div className={rStyles.resultTitle}>{resultTitle}</div>
          {notice.text && (
            <div className={`${rStyles.noticeMsg} ${notice.tone === 'warning' ? rStyles.noticeWarn : rStyles.noticeInfo}`}>
              {notice.tone === 'warning' ? '⚠ ' : 'ℹ '}
              {notice.text}
            </div>
          )}
          <div className={rStyles.resultNote}>{resultNote}</div>

          {isGrocery ? (
            <div className={rStyles.formGrid}>
              <label className={rStyles.formField}>
                <span>Price</span>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={event => setField('amount', event.target.value)} />
              </label>
              <label className={`${rStyles.formField} ${rStyles.fullWidth}`}>
                <span>Item name</span>
                <input value={form.desc} onChange={event => setField('desc', event.target.value)} placeholder="e.g. Eggs, rice, coffee" />
              </label>
            </div>
          ) : (
            <div className={rStyles.formGrid}>
              <label className={rStyles.formField}>
                <span>Type</span>
                <select value={form.type} onChange={event => setField('type', event.target.value)}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="transfer">Transfer / other</option>
                </select>
              </label>
              <label className={rStyles.formField}>
                <span>Amount</span>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={event => setField('amount', event.target.value)} />
              </label>
              <label className={rStyles.formField}>
                <span>Date</span>
                <div className={rStyles.dateFieldWrap}>
                  <div className={`${rStyles.dateFieldDisplay} ${rStyles.formFieldControl}`}>
                    {formatDisplayDate(form.date)}
                  </div>
                  <input
                    type="date"
                    className={`${rStyles.formFieldControl} ${rStyles.dateFieldNative}`}
                    value={form.date}
                    aria-label="Date"
                    onChange={event => setField('date', event.target.value)}
                  />
                </div>
              </label>
              <label className={rStyles.formField}>
                <span>Category</span>
                <select value={form.cat} onChange={event => setField('cat', event.target.value)}>
                  {categoryOptions.map(option => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className={`${rStyles.formField} ${rStyles.fullWidth}`}>
                <span>Merchant / description</span>
                <input value={form.desc} onChange={event => setField('desc', event.target.value)} placeholder="Describe this transaction" />
              </label>
              {mode === 'wallet' && (
                <div className={`${rStyles.detailSection} ${rStyles.fullWidth}`}>
                  <button type="button" className={rStyles.detailToggle} onClick={() => setShowDetails(current => !current)}>
                    <span>{showDetails ? 'Hide more details' : 'More details'}</span>
                    {!showDetails && form.reference && <span className={rStyles.detailMeta}>Reference captured</span>}
                  </button>
                  {showDetails && (
                    <label className={`${rStyles.formField} ${rStyles.fullWidth}`}>
                      <span>Reference</span>
                      <input value={form.reference} onChange={event => setField('reference', event.target.value)} placeholder="Optional reference number" />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {!isGrocery && form.type === 'transfer' && (
            <div className={rStyles.transferNote}>
              Transfers are not stored separately yet. Pick Income or Expense before adding this entry.
            </div>
          )}

          <div className={rStyles.btnRow}>
            <button className={rStyles.btnRetry} onClick={() => resetState(mode)}>
              Import another
            </button>
            <button
              className={rStyles.btnUse}
              onClick={handleConfirm}
              disabled={isGrocery ? !form.amount : !form.amount || !form.date || !form.desc || form.type === 'transfer'}
            >
              {isGrocery ? 'Add item →' : 'Continue with these details →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
