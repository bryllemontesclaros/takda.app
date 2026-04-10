import { db, storage } from './firebase'
import {
  collection, addDoc, deleteDoc, updateDoc, setDoc, deleteField,
  doc, query, orderBy, onSnapshot, getDoc, getDocs, writeBatch, increment
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { getAccountBalanceDelta, shouldAffectCurrentAccountBalance } from './finance'
import { normalizeDate, today } from './utils'

export function userCol(uid, col) {
  return collection(db, 'users', uid, col)
}

export async function fsAdd(uid, col, data) {
  return await addDoc(userCol(uid, col), { ...data, createdAt: Date.now() })
}

export async function fsDel(uid, col, id) {
  return await deleteDoc(doc(db, 'users', uid, col, id))
}

export async function fsUpdate(uid, col, id, data) {
  return await updateDoc(doc(db, 'users', uid, col, id), data)
}

function getAccountRef(uid, accountId) {
  return doc(db, 'users', uid, 'accounts', accountId)
}

function buildAccountLookup(accounts = []) {
  return new Map(accounts.map(account => [account._id, account]))
}

function queueAccountAdjustment(adjustments, accountId, delta) {
  if (!accountId || !Number.isFinite(delta) || delta === 0) return
  adjustments.set(accountId, (adjustments.get(accountId) || 0) + delta)
}

function getTransactionState(base = {}, overrides = {}) {
  const hasOverride = key => Object.prototype.hasOwnProperty.call(overrides, key)
  const date = normalizeDate(hasOverride('date') ? overrides.date : base.date)
  const amount = Number(hasOverride('amount') ? overrides.amount : base.amount) || 0
  const type = hasOverride('type') ? overrides.type : base.type
  const accountId = hasOverride('accountId') ? (overrides.accountId || '') : (base.accountId || '')
  const requestedLink = hasOverride('accountBalanceLinked')
    ? Boolean(overrides.accountBalanceLinked)
    : Boolean(base.accountBalanceLinked)
  const accountBalanceLinked = Boolean(requestedLink && accountId)
  const accountBalanceApplied = shouldAffectCurrentAccountBalance({
    date,
    accountId,
    accountBalanceLinked,
  })

  return {
    date,
    amount,
    type,
    accountId,
    accountBalanceLinked,
    accountBalanceApplied,
  }
}

function applyAccountAdjustments(batch, uid, adjustments, accountLookup) {
  adjustments.forEach((delta, accountId) => {
    if (!delta || !accountLookup.has(accountId)) return
    batch.update(getAccountRef(uid, accountId), { balance: increment(delta) })
  })
}

export async function fsAddTransaction(uid, col, data, accounts = []) {
  const accountLookup = buildAccountLookup(accounts)
  const tx = getTransactionState(data, {
    accountBalanceLinked: Boolean(data?.accountBalanceLinked ?? data?.accountId),
  })
  const transactionRef = doc(userCol(uid, col))
  const payload = {
    ...data,
    date: tx.date,
    amount: tx.amount,
    accountId: tx.accountId,
    accountBalanceLinked: tx.accountBalanceLinked,
    accountBalanceApplied: tx.accountBalanceApplied,
    createdAt: Date.now(),
  }
  const adjustments = new Map()
  const batch = writeBatch(db)

  if (tx.accountBalanceApplied && tx.accountId) {
    const account = accountLookup.get(tx.accountId)
    if (account) queueAccountAdjustment(adjustments, tx.accountId, getAccountBalanceDelta(account, tx.type, tx.amount))
  }

  batch.set(transactionRef, payload)
  applyAccountAdjustments(batch, uid, adjustments, accountLookup)
  await batch.commit()
  return transactionRef
}

export async function fsUpdateTransaction(uid, col, currentTx, data, accounts = []) {
  const accountLookup = buildAccountLookup(accounts)
  const previous = getTransactionState(currentTx)
  const next = getTransactionState(currentTx, data)
  const adjustments = new Map()
  const batch = writeBatch(db)

  if (previous.accountBalanceApplied && previous.accountId) {
    const previousAccount = accountLookup.get(previous.accountId)
    if (previousAccount) {
      queueAccountAdjustment(adjustments, previous.accountId, -getAccountBalanceDelta(previousAccount, previous.type, previous.amount))
    }
  }

  if (next.accountBalanceApplied && next.accountId) {
    const nextAccount = accountLookup.get(next.accountId)
    if (nextAccount) {
      queueAccountAdjustment(adjustments, next.accountId, getAccountBalanceDelta(nextAccount, next.type, next.amount))
    }
  }

  batch.update(doc(db, 'users', uid, col, currentTx._id), {
    ...data,
    date: next.date,
    amount: next.amount,
    accountId: next.accountId,
    accountBalanceLinked: next.accountBalanceLinked,
    accountBalanceApplied: next.accountBalanceApplied,
  })
  applyAccountAdjustments(batch, uid, adjustments, accountLookup)
  await batch.commit()
}

export async function fsDeleteTransaction(uid, col, tx, accounts = []) {
  const accountLookup = buildAccountLookup(accounts)
  const current = getTransactionState(tx)
  const adjustments = new Map()
  const batch = writeBatch(db)

  if (current.accountBalanceApplied && current.accountId) {
    const account = accountLookup.get(current.accountId)
    if (account) {
      queueAccountAdjustment(adjustments, current.accountId, -getAccountBalanceDelta(account, current.type, current.amount))
    }
  }

  batch.delete(doc(db, 'users', uid, col, tx._id))
  applyAccountAdjustments(batch, uid, adjustments, accountLookup)
  await batch.commit()
}

export async function fsSyncDueLinkedTransactions(uid, transactions = [], accounts = []) {
  const accountLookup = buildAccountLookup(accounts)
  const dueTransactions = transactions.filter(tx => (
    tx?._id
    && tx?.accountBalanceLinked
    && tx?.accountId
    && !tx?.accountBalanceApplied
    && shouldAffectCurrentAccountBalance(tx, today())
  ))

  if (!dueTransactions.length) return 0

  const adjustments = new Map()
  const batch = writeBatch(db)

  dueTransactions.forEach(tx => {
    const col = tx.type === 'income' ? 'income' : 'expenses'
    batch.update(doc(db, 'users', uid, col, tx._id), { accountBalanceApplied: true })
    const account = accountLookup.get(tx.accountId)
    if (account) {
      queueAccountAdjustment(adjustments, tx.accountId, getAccountBalanceDelta(account, tx.type, tx.amount))
    }
  })

  applyAccountAdjustments(batch, uid, adjustments, accountLookup)
  await batch.commit()
  return dueTransactions.length
}

function getReceiptExtension(fileName = '', fallback = 'jpg') {
  const match = String(fileName || '').match(/\.([a-z0-9]+)$/i)
  return (match?.[1] || fallback).toLowerCase()
}

async function uploadReceiptAsset(uid, receiptId, label, blob, fileName = '') {
  if (!blob) return null
  const extension = label === 'original' ? getReceiptExtension(fileName, 'jpg') : 'jpg'
  const path = `users/${uid}/receipts/${receiptId}/${label}.${extension}`
  const target = storageRef(storage, path)
  await uploadBytes(target, blob, {
    contentType: blob.type || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    cacheControl: 'public,max-age=3600',
  })
  const url = await getDownloadURL(target)
  return { path, url }
}

async function deleteReceiptAsset(path) {
  if (!path) return
  try {
    await deleteObject(storageRef(storage, path))
  } catch {
    // Ignore missing or already-deleted assets so the Firestore delete can still finish.
  }
}

export async function fsSaveReceipt(uid, payload = {}) {
  const receiptRef = doc(userCol(uid, 'receipts'))
  const receiptId = receiptRef.id
  let originalUpload = null
  let cleanedUpload = null

  try {
    originalUpload = await uploadReceiptAsset(uid, receiptId, 'original', payload.originalBlob, payload.fileName)
    cleanedUpload = await uploadReceiptAsset(uid, receiptId, 'cleaned', payload.cleanedBlob || payload.originalBlob, payload.fileName)
    const normalizedDate = normalizeDate(payload.date) || today()
    const total = Number(payload.total) || 0
    const lineItems = Array.isArray(payload.lineItems) ? payload.lineItems : []
    const merchant = String(payload.merchant || '').trim() || 'Receipt'
    const rawText = String(payload.rawText || '')
    const confidence = payload.confidence && typeof payload.confidence === 'object'
      ? payload.confidence
      : { overall: payload.confidence || '' }
    const extractedData = {
      merchant,
      total,
      currency: payload.currency || 'PHP',
      date: normalizedDate,
      category: payload.category || 'Other',
      reference: payload.reference || '',
      lineItems,
      confidence,
    }

    const receiptDoc = {
      userId: uid,
      merchant,
      total,
      currency: payload.currency || 'PHP',
      date: normalizedDate,
      category: payload.category || 'Other',
      reference: payload.reference || '',
      notes: payload.notes || '',
      source: payload.source || 'receipt',
      imageUrl: originalUpload?.url || cleanedUpload?.url || '',
      imagePath: originalUpload?.path || '',
      cleanedImageUrl: cleanedUpload?.url || originalUpload?.url || '',
      cleanedImagePath: cleanedUpload?.path || '',
      thumbnailUrl: cleanedUpload?.url || originalUpload?.url || '',
      cleanupSummary: payload.cleanupSummary || '',
      confidence,
      extractedData,
      lineItems,
      rawText,
      rawTextPreview: rawText.slice(0, 2400),
      stats: {
        itemCount: lineItems.length,
        imageWidth: Number(payload.imageWidth) || 0,
        imageHeight: Number(payload.imageHeight) || 0,
        cleanedWidth: Number(payload.cleanedWidth) || 0,
        cleanedHeight: Number(payload.cleanedHeight) || 0,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await setDoc(receiptRef, receiptDoc)
    return { _id: receiptId, ...receiptDoc }
  } catch (error) {
    await Promise.all([
      deleteReceiptAsset(originalUpload?.path),
      deleteReceiptAsset(cleanedUpload?.path),
    ])
    throw error
  }
}

export async function fsDeleteReceipt(uid, receipt = {}) {
  await Promise.all([
    deleteReceiptAsset(receipt.imagePath),
    deleteReceiptAsset(receipt.cleanedImagePath),
  ])
  await deleteDoc(doc(db, 'users', uid, 'receipts', receipt._id))
}

export function listenCol(uid, col, callback) {
  const q = query(userCol(uid, col), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ ...d.data(), _id: d.id })))
  })
}

export async function fsSetProfile(uid, profile) {
  return await setDoc(doc(db, 'users', uid, 'profile', 'main'), profile, { merge: true })
}

export async function fsTrackImportUsage(uid, monthKey, amount = 1) {
  const profileRef = doc(db, 'users', uid, 'profile', 'main')
  try {
    await updateDoc(profileRef, {
      [`importUsage.${monthKey}`]: increment(amount),
    })
  } catch {
    await setDoc(profileRef, {
      importUsage: {
        [monthKey]: amount,
      },
    }, { merge: true })
  }
}

export async function fsSetMonthStartBalance(uid, monthKey, amount) {
  return await setDoc(
    doc(db, 'users', uid, 'profile', 'main'),
    { monthStartBalances: { [monthKey]: Number(amount) || 0 } },
    { merge: true },
  )
}

export async function fsClearMonthStartBalance(uid, monthKey) {
  return await updateDoc(doc(db, 'users', uid, 'profile', 'main'), {
    [`monthStartBalances.${monthKey}`]: deleteField(),
  })
}

export async function fsSetDailyBalanceOverride(uid, dateKey, amount) {
  return await setDoc(
    doc(db, 'users', uid, 'profile', 'main'),
    { dailyBalanceOverrides: { [dateKey]: Number(amount) || 0 } },
    { merge: true },
  )
}

export async function fsClearDailyBalanceOverride(uid, dateKey) {
  return await updateDoc(doc(db, 'users', uid, 'profile', 'main'), {
    [`dailyBalanceOverrides.${dateKey}`]: deleteField(),
  })
}

export async function fsCompleteOnboarding(uid, payload = {}) {
  const now = Date.now()
  const batch = writeBatch(db)
  let createdAtOffset = 0

  const profile = payload.profile && typeof payload.profile === 'object' ? payload.profile : {}
  batch.set(doc(db, 'users', uid, 'profile', 'main'), {
    ...profile,
    onboardedAt: profile.onboardedAt || now,
  }, { merge: true })

  function seedCollection(col, rows = []) {
    rows.forEach(row => {
      batch.set(doc(userCol(uid, col)), {
        ...row,
        createdAt: row?.createdAt || now + createdAtOffset,
      })
      createdAtOffset += 1
    })
  }

  seedCollection('income', Array.isArray(payload.income) ? payload.income : [])
  seedCollection('expenses', Array.isArray(payload.expenses) ? payload.expenses : [])
  seedCollection('accounts', Array.isArray(payload.accounts) ? payload.accounts : [])
  seedCollection('bills', Array.isArray(payload.bills) ? payload.bills : [])

  await batch.commit()
}

export function listenProfile(uid, callback) {
  return onSnapshot(doc(db, 'users', uid, 'profile', 'main'), snap => {
    callback(snap.exists() ? snap.data() : {})
  })
}

function sanitizeRestoreDoc(entry = {}) {
  const payload = { ...entry }
  delete payload._id
  delete payload.id
  return payload
}

function chunkList(items = [], size = 400) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function fsWriteCollection(uid, col, rows = [], clearExisting = false) {
  const targetCollection = userCol(uid, col)

  if (clearExisting) {
    const existing = await getDocs(targetCollection)
    for (const snapshots of chunkList(existing.docs)) {
      const batch = writeBatch(db)
      snapshots.forEach(snapshot => batch.delete(snapshot.ref))
      await batch.commit()
    }
  }

  for (const entries of chunkList(rows)) {
    const batch = writeBatch(db)
    entries.forEach(entry => {
      const id = entry?._id || entry?.id || doc(targetCollection).id
      batch.set(doc(db, 'users', uid, col, id), sanitizeRestoreDoc(entry))
    })
    await batch.commit()
  }
}

async function fsDeleteCollection(uid, col) {
  const targetCollection = userCol(uid, col)
  const existing = await getDocs(targetCollection)
  for (const snapshots of chunkList(existing.docs)) {
    const batch = writeBatch(db)
    snapshots.forEach(snapshot => batch.delete(snapshot.ref))
    await batch.commit()
  }
}

export async function fsRestoreBackup(uid, backup = {}, mode = 'merge') {
  const clearExisting = mode === 'replace'
  const collections = ['income', 'expenses', 'bills', 'goals', 'accounts', 'budgets', 'receipts']

  for (const col of collections) {
    const rows = Array.isArray(backup[col]) ? backup[col] : []
    await fsWriteCollection(uid, col, rows, clearExisting)
  }

  if (clearExisting) {
    await setDoc(doc(db, 'users', uid, 'profile', 'main'), backup.profile || {})
  } else if (backup.profile && typeof backup.profile === 'object') {
    await setDoc(doc(db, 'users', uid, 'profile', 'main'), backup.profile, { merge: true })
  }
}

export async function fsDeleteAccountData(uid) {
  const receiptsSnapshot = await getDocs(userCol(uid, 'receipts'))
  await Promise.all(receiptsSnapshot.docs.flatMap(snapshot => {
    const data = snapshot.data() || {}
    return [
      deleteReceiptAsset(data.imagePath),
      deleteReceiptAsset(data.cleanedImagePath),
    ]
  }))

  const collections = ['income', 'expenses', 'bills', 'goals', 'accounts', 'budgets', 'feedback', 'receipts']

  for (const col of collections) {
    await fsDeleteCollection(uid, col)
  }

  await deleteDoc(doc(db, 'users', uid, 'profile', 'main'))
}
