import { useEffect, useRef, useState } from 'react'
import { parseReceiptText, parseWalletText } from '../lib/importParser'
import { today } from '../lib/utils'
import rStyles from './ReceiptScanner.module.css'

const OCR_API = 'https://api.ocr.space/parse/image'
const OCR_KEY = import.meta.env.VITE_OCR_SPACE_API_KEY || 'helloworld'
const EXPENSE_CATS = ['Food & Dining', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Personal Care', 'Bills', 'Education', 'Other']
const INCOME_CATS = ['Salary', 'Freelance', 'Business', 'Investment', '13th Month', 'Bonus', 'Other']

const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  date: '',
  desc: '',
  cat: 'Other',
  reference: '',
}

const EMPTY_LIVE_SCAN = {
  phase: 'idle',
  amount: '',
  desc: '',
  rawText: '',
  message: '',
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

function normalizeDetectedText(text = '') {
  return String(text || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

function formatDetectedAmount(value) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount) || amount <= 0) return ''
  return amount.toFixed(2)
}

function getLiveParsed(text, context = 'transaction') {
  const normalized = normalizeDetectedText(text)
  if (!normalized) return null

  const parsed = parseReceiptText(normalized)
  if (context === 'grocery') {
    return {
      ...parsed,
      type: 'expense',
      date: '',
      desc: parsed.desc && parsed.desc !== 'Receipt' ? parsed.desc : 'Grocery item',
      cat: 'Other',
      reference: parsed.reference || '',
    }
  }

  return {
    ...parsed,
    date: parsed.date || today(),
  }
}

export default function ReceiptScanner({ onResult, onClose, defaultMode = 'wallet', context = 'transaction' }) {
  const isGrocery = context === 'grocery'
  const [mode, setMode] = useState(isGrocery ? 'receipt' : defaultMode)
  const [status, setStatus] = useState('idle')
  const [preview, setPreview] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showDetails, setShowDetails] = useState(false)
  const [notice, setNotice] = useState({ text: '', tone: 'info' })
  const [rawText, setRawText] = useState('')
  const [sourceLabel, setSourceLabel] = useState('')
  const [liveScan, setLiveScan] = useState(EMPTY_LIVE_SCAN)
  const fileRef = useRef(null)
  const cameraRef = useRef(null)
  const liveVideoRef = useRef(null)
  const liveCanvasRef = useRef(null)
  const liveStreamRef = useRef(null)
  const liveDetectorRef = useRef(null)
  const liveTimerRef = useRef(null)
  const liveBusyRef = useRef(false)
  const liveMatchRef = useRef({ key: '', count: 0 })
  const statusRef = useRef('idle')

  const liveScanSupported = mode !== 'wallet'
    && typeof window !== 'undefined'
    && typeof window.TextDetector !== 'undefined'
    && Boolean(window.navigator?.mediaDevices?.getUserMedia)

  function clearLiveTimer() {
    if (typeof window === 'undefined' || liveTimerRef.current == null) return
    window.clearTimeout(liveTimerRef.current)
    liveTimerRef.current = null
  }

  function releaseLiveResources() {
    clearLiveTimer()
    liveBusyRef.current = false
    liveMatchRef.current = { key: '', count: 0 }

    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach(track => track.stop())
      liveStreamRef.current = null
    }

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null
    }
  }

  function stopLiveScan({ resetDraft = true } = {}) {
    releaseLiveResources()
    if (resetDraft) setLiveScan(EMPTY_LIVE_SCAN)
  }

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    return () => {
      stopLiveScan({ resetDraft: false })
    }
  }, [])

  function setField(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function resetState(nextMode = mode) {
    stopLiveScan()
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

  function scheduleLiveScan(delay = 420) {
    if (typeof window === 'undefined') return
    clearLiveTimer()
    liveTimerRef.current = window.setTimeout(() => {
      void scanLiveFrame()
    }, delay)
  }

  async function getLiveDetector() {
    if (liveDetectorRef.current) return liveDetectorRef.current

    const Detector = window.TextDetector
    liveDetectorRef.current = typeof Detector.create === 'function'
      ? await Detector.create()
      : new Detector()

    return liveDetectorRef.current
  }

  async function scanLiveFrame() {
    if (statusRef.current !== 'live' || liveBusyRef.current) return

    const video = liveVideoRef.current
    const canvas = liveCanvasRef.current
    if (!video || !canvas) return

    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      scheduleLiveScan(220)
      return
    }

    liveBusyRef.current = true

    try {
      const detector = await getLiveDetector()
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas unavailable')

      const targetWidth = Math.min(video.videoWidth, 960)
      const scale = targetWidth / video.videoWidth
      const targetHeight = Math.max(1, Math.round(video.videoHeight * scale))

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth
        canvas.height = targetHeight
      }

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight)

      const blocks = await detector.detect(canvas)
      const text = normalizeDetectedText(blocks.map(block => block.rawValue?.trim()).filter(Boolean).join('\n'))
      const parsed = text ? getLiveParsed(text, context) : null
      const amountKey = formatDetectedAmount(parsed?.amount)

      if (!amountKey || !parsed) {
        liveMatchRef.current = { key: '', count: 0 }
        setLiveScan(current => ({
          ...current,
          phase: 'scanning',
          amount: '',
          desc: '',
          rawText: text,
          message: isGrocery
            ? 'Point the price tag inside the frame and hold still.'
            : 'Point the receipt total inside the frame and hold still.',
        }))
        return
      }

      const nextCount = liveMatchRef.current.key === amountKey ? liveMatchRef.current.count + 1 : 1
      liveMatchRef.current = { key: amountKey, count: nextCount }

      const isLocked = nextCount >= 2
      setRawText(text)
      setSourceLabel(isGrocery ? 'Live price scan' : 'Live receipt scan')
      applyParsed(parsed)
      setLiveScan({
        phase: isLocked ? 'locked' : 'scanning',
        amount: amountKey,
        desc: parsed.desc || '',
        rawText: text,
        message: isLocked
          ? isGrocery
            ? `Locked onto ${amountKey}. Review it, then use this price.`
            : `Locked onto ${amountKey}. Review it, then continue with these details.`
          : isGrocery
            ? `Detected ${amountKey}. Hold steady to lock the price.`
            : `Detected ${amountKey}. Hold steady to lock the total.`,
      })

      if (isLocked) {
        clearLiveTimer()
      }
    } catch {
      releaseLiveResources()
      setLiveScan({
        phase: 'error',
        amount: '',
        desc: '',
        rawText: '',
        message: 'Live scan is not available in this browser yet. Use Camera or Upload instead.',
      })
    } finally {
      liveBusyRef.current = false
      if (statusRef.current === 'live' && liveMatchRef.current.count < 2 && liveStreamRef.current) {
        scheduleLiveScan()
      }
    }
  }

  async function startLiveScan() {
    if (!liveScanSupported) {
      setNotice({
        text: 'Live scan needs a browser with on-device text detection. Use Camera or Upload instead.',
        tone: 'warning',
      })
      return
    }

    stopLiveScan()
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setStatus('live')
    setNotice({ text: '', tone: 'info' })
    setRawText('')
    setSourceLabel(isGrocery ? 'Live price scan' : 'Live receipt scan')
    setForm(getBlankDraft(context))
    setShowDetails(false)
    setLiveScan({
      ...EMPTY_LIVE_SCAN,
      phase: 'starting',
      message: 'Starting camera...',
    })

    try {
      const stream = await window.navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      liveStreamRef.current = stream

      const video = liveVideoRef.current
      if (!video) throw new Error('Video element unavailable')

      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play()

      setLiveScan({
        ...EMPTY_LIVE_SCAN,
        phase: 'scanning',
        message: isGrocery
          ? 'Point the price tag inside the frame and hold still.'
          : 'Point the receipt total inside the frame and hold still.',
      })
      scheduleLiveScan(220)
    } catch {
      stopLiveScan()
      setStatus('idle')
      setNotice({
        text: 'Could not open the camera. Check camera permission and try again.',
        tone: 'warning',
      })
    }
  }

  function handleUseLiveScan() {
    stopLiveScan({ resetDraft: false })
    setNotice({
      text: isGrocery
        ? 'Live scan found a likely price. Confirm it before adding the item.'
        : 'Live scan found a likely total. Confirm the details before saving.',
      tone: liveScan.phase === 'locked' ? 'info' : 'warning',
    })
    setStatus('done')
  }

  function resumeLiveScan() {
    if (!liveScanSupported) return
    liveMatchRef.current = { key: '', count: 0 }
    setNotice({ text: '', tone: 'info' })
    setLiveScan(current => ({
      ...current,
      phase: 'scanning',
      message: isGrocery
        ? 'Move closer or hold still until the price locks again.'
        : 'Move closer or hold still until the total locks again.',
    }))
    scheduleLiveScan(120)
  }

  async function processImage(file) {
    if (!file) return

    stopLiveScan()
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
    setStatus('loading')
    setNotice({ text: '', tone: 'info' })
    setSourceLabel(isGrocery ? 'Price tag scan' : mode === 'wallet' ? 'Wallet screenshot' : 'Receipt image')

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
      setSourceLabel(isGrocery ? (parsed.desc || 'Scanned grocery item') : parsed.wallet || (mode === 'wallet' ? 'Wallet screenshot' : 'Receipt'))
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

    onResult?.({
      type: form.type,
      amount: parseFloat(form.amount),
      date: form.date,
      desc: form.desc,
      cat: form.cat,
      reference: form.reference,
      source: mode,
      rawText,
    })
  }

  const categoryOptions = getCategoryOptions(form.type === 'income' ? 'income' : 'expense')
  const headerTitle = isGrocery ? 'Scan grocery item' : 'Import transaction'
  const headerSub = isGrocery
    ? 'Take a photo of a price tag or shelf label, then confirm the item before adding it to this trip.'
    : 'Review before saving. Imported details stay editable.'
  const uploadTitle = isGrocery
    ? 'Take a photo of a grocery price tag'
    : mode === 'wallet'
      ? 'Upload a GCash or Maya screenshot'
      : 'Take a photo or upload a receipt'
  const uploadSub = isGrocery
    ? 'We will try to prefill the item name and price. Review before adding it to the list.'
    : mode === 'wallet'
      ? 'We will prefill amount, date, recipient, and type when possible.'
      : 'We will prefill total, date, merchant, and category when possible.'
  const resultTitle = isGrocery ? 'Grocery item review' : sourceLabel || 'Imported transaction'
  const resultNote = isGrocery
    ? 'Price-tag OCR is assistive only, so confirm the name and price before adding the item.'
    : mode === 'wallet'
      ? 'We classified this from the screenshot. Confirm the type before saving.'
      : 'Receipt OCR is assistive only, so review the details before saving.'

  return (
    <div className={rStyles.wrap}>
      <div className={rStyles.header}>
        <div>
          <div className={rStyles.title}>{headerTitle}</div>
          <div className={rStyles.uploadSub}>
            {headerSub}
          </div>
        </div>
        <button className={rStyles.closeBtn} onClick={() => { stopLiveScan({ resetDraft: false }); onClose?.() }}>✕</button>
      </div>

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
            Receipt image
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
              <button className={rStyles.btnLive} onClick={startLiveScan} disabled={!liveScanSupported}>
                ⚡ Live scan
              </button>
            )}
            <button className={rStyles.btnCamera} onClick={() => cameraRef.current?.click()}>
              📷 Camera
            </button>
            <button className={rStyles.btnUpload} onClick={() => fileRef.current?.click()}>
              📂 {isGrocery ? 'Upload price tag' : mode === 'wallet' ? 'Upload screenshot' : 'Upload image'}
            </button>
          </div>
          {mode !== 'wallet' && !liveScanSupported && (
            <div className={rStyles.uploadHint}>
              Live scan only appears on browsers that support on-device text detection.
            </div>
          )}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>
      )}

      {status === 'live' && (
        <div className={rStyles.liveArea}>
          <div className={rStyles.liveFrame}>
            <video ref={liveVideoRef} className={rStyles.liveVideo} autoPlay muted playsInline />
            <div className={rStyles.liveOverlay}>
              <div className={rStyles.liveGuide}>
                <span>{isGrocery ? 'Point at the price' : 'Point at the total'}</span>
              </div>
              <div className={`${rStyles.liveBadge} ${liveScan.phase === 'locked' ? rStyles.liveBadgeLocked : ''}`}>
                {liveScan.phase === 'starting'
                  ? 'Starting camera...'
                  : liveScan.amount
                    ? `Detected ${liveScan.amount}`
                    : 'Scanning...'}
              </div>
            </div>
            <canvas ref={liveCanvasRef} className={rStyles.liveCanvas} />
          </div>

          <div className={rStyles.livePanel}>
            <div className={rStyles.resultTitle}>{isGrocery ? 'Live price scanner' : 'Live receipt scanner'}</div>
            <div className={rStyles.resultNote}>
              {liveScan.message || (isGrocery ? 'Point at the price tag to start scanning.' : 'Point at the receipt to start scanning.')}
            </div>

            {liveScan.phase === 'error' && (
              <div className={`${rStyles.noticeMsg} ${rStyles.noticeWarn}`}>
                ⚠ {liveScan.message}
              </div>
            )}

            <div className={rStyles.liveStats}>
              <div className={rStyles.liveStat}>
                <span>Amount</span>
                <strong>{form.amount || '—'}</strong>
              </div>
              <div className={rStyles.liveStat}>
                <span>{isGrocery ? 'Item' : 'Merchant'}</span>
                <strong>{form.desc || '—'}</strong>
              </div>
              {!isGrocery && (
                <div className={`${rStyles.liveStat} ${rStyles.liveStatWide}`}>
                  <span>Date</span>
                  <strong>{form.date || today()}</strong>
                </div>
              )}
            </div>

            <div className={rStyles.btnRow}>
              <button className={rStyles.btnRetry} onClick={() => resetState(mode)}>
                Cancel
              </button>
              {liveScan.phase === 'locked' && (
                <>
                  <button className={rStyles.btnUpload} onClick={resumeLiveScan}>
                    Keep scanning
                  </button>
                  <button className={rStyles.btnUse} onClick={handleUseLiveScan} disabled={!form.amount}>
                    {isGrocery ? 'Use this price →' : 'Use these details →'}
                  </button>
                </>
              )}
            </div>
          </div>
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
                <input type="date" value={form.date} onChange={event => setField('date', event.target.value)} />
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
              {isGrocery ? 'Scan another' : 'Import another'}
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
