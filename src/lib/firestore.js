import { db } from './firebase'
import {
  collection, addDoc, deleteDoc, updateDoc, setDoc, deleteField,
  doc, query, orderBy, onSnapshot, getDoc, getDocs, writeBatch
} from 'firebase/firestore'

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

export function listenCol(uid, col, callback) {
  const q = query(userCol(uid, col), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ ...d.data(), _id: d.id })))
  })
}

export async function fsSetProfile(uid, profile) {
  return await setDoc(doc(db, 'users', uid, 'profile', 'main'), profile, { merge: true })
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
  const collections = ['income', 'expenses', 'bills', 'goals', 'accounts', 'budgets']

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
  const collections = ['income', 'expenses', 'bills', 'goals', 'accounts', 'budgets', 'feedback']

  for (const col of collections) {
    await fsDeleteCollection(uid, col)
  }

  await deleteDoc(doc(db, 'users', uid, 'profile', 'main'))
}
