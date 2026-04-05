export const QUICK_EXPENSE = [
  { label: 'Food', cat: 'Food & Dining', icon: '🍜' },
  { label: 'Transport', cat: 'Transport', icon: '🚗' },
  { label: 'Shopping', cat: 'Shopping', icon: '🛍' },
  { label: 'Health', cat: 'Health', icon: '💊' },
  { label: 'Coffee', cat: 'Food & Dining', icon: '☕' },
  { label: 'Bills', cat: 'Bills', icon: '📄' },
  { label: 'Entertainment', cat: 'Entertainment', icon: '🎮' },
  { label: 'Personal', cat: 'Personal Care', icon: '✂️' },
]

export const QUICK_INCOME = [
  { label: 'Salary', cat: 'Salary', icon: '💼' },
  { label: 'Freelance', cat: 'Freelance', icon: '💻' },
  { label: 'Business', cat: 'Business', icon: '🏪' },
  { label: 'Bonus', cat: 'Bonus', icon: '🎁' },
]

export const TRANSACTION_CATEGORIES = {
  income: ['Salary', 'Freelance', 'Business', 'Investment', '13th Month', 'Bonus', 'Other'],
  expense: ['Food & Dining', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Personal Care', 'Bills', 'Education', 'Other'],
}

export const DEFAULT_CATEGORY_BY_TYPE = {
  income: 'Salary',
  expense: 'Food & Dining',
}

export const DEFAULT_LABEL_BY_TYPE = {
  income: 'Salary',
  expense: 'Food',
}

function resolveType(type) {
  return type === 'income' ? 'income' : 'expense'
}

export function getQuickItems(type) {
  return resolveType(type) === 'income' ? QUICK_INCOME : QUICK_EXPENSE
}

export function getTransactionCategories(type) {
  return TRANSACTION_CATEGORIES[resolveType(type)]
}

export function getQuickPick(type, cat, desc = '') {
  const items = getQuickItems(type)
  const exact = items.find(item => item.cat === cat && item.label === desc)
  if (exact) return exact.label
  const sameCat = items.filter(item => item.cat === cat)
  if (sameCat.length === 1) return sameCat[0].label
  return ''
}

export function getSuggestedDescription(type, cat) {
  const resolvedType = resolveType(type)
  return getQuickPick(resolvedType, cat, '') || cat || DEFAULT_LABEL_BY_TYPE[resolvedType]
}

export function getDefaultTransactionDraft(type = 'expense') {
  const resolvedType = resolveType(type)
  const cat = DEFAULT_CATEGORY_BY_TYPE[resolvedType]
  return {
    desc: DEFAULT_LABEL_BY_TYPE[resolvedType],
    amount: '',
    type: resolvedType,
    cat,
    recur: '',
  }
}
