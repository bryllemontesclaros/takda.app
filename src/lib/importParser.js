import { normalizeDate, today } from './utils'
import { getPresetOptions } from './transactionOptions'

function parseDateCandidate(raw) {
  if (!raw) return ''
  const cleaned = raw.replace(/\./g, '/').trim()

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(cleaned)) {
    return normalizeDate(cleaned.replace(/\//g, '-'))
  }

  const dmy = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/)
  if (dmy) {
    const [, a, b, c] = dmy
    const year = c.length === 2 ? `20${c}` : c
    return normalizeDate(`${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`)
  }

  const parsed = new Date(cleaned)
  if (!Number.isNaN(parsed.getTime())) return normalizeDate(parsed.toISOString())
  return ''
}

function parseAmountValue(raw) {
  const value = parseFloat(String(raw || '').replace(/,/g, ''))
  if (Number.isNaN(value) || value <= 0) return null
  return value
}

function extractWalletAmount(lines) {
  const patterns = [
    /(?:amount|total|sent|paid|received|credited|debited)[^\d]{0,16}(?:php|₱)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:php|₱)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /\b([\d,]+\.\d{2})\b/,
  ]

  let best = null

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (!match) continue
      const value = parseAmountValue(match[1])
      if (!value) continue
      if (best === null || value > best) best = value
    }
  }

  return best
}

function extractLineAmounts(line) {
  const candidates = []
  const regex = /(?:₱|php|\bp\b)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})?|[0-9]+(?:\.\d{1,2})?)/gi

  for (const match of line.matchAll(regex)) {
    const amountText = match[1]
    const value = parseAmountValue(amountText)
    if (!value) continue

    const start = match.index ?? 0
    const full = match[0]
    const end = start + full.length
    const before = line[start - 1] || ''
    const after = line[end] || ''

    if (before === '/' || after === '/' || before === ':' || after === ':' || after === '%') continue

    candidates.push({
      value,
      raw: amountText,
      full,
      hasDecimal: amountText.includes('.'),
      hasCurrency: /₱|php|\bp\b/i.test(full),
    })
  }

  return candidates
}

function scoreReceiptAmountCandidate(line, candidate, lineIndex, totalLines, lineAmountCount) {
  const lower = line.toLowerCase()
  let score = 0

  if (/\bgrand total\b|\btotal amount\b/.test(lower)) score += 120
  else if (/\bamount due\b|\btotal due\b|\bbalance due\b|\bnet total\b|\bamount payable\b/.test(lower)) score += 110
  else if (/\btotal\b/.test(lower)) score += 82
  else if (/\bamount\b/.test(lower)) score += 18

  if (candidate.hasCurrency) score += 14
  if (candidate.hasDecimal) score += 12
  score += Math.round((lineIndex / Math.max(totalLines - 1, 1)) * 18)

  if (/\bchange\b/.test(lower)) score -= 140
  if (/\bcash\b|\btendered\b/.test(lower)) score -= 92
  if (/\bsubtotal\b|\bsub total\b/.test(lower)) score -= 70
  if (/\bdiscount\b|\bsavings\b|\bpromo\b/.test(lower)) score -= 58
  if (/\bvat\b|\btax\b|\bservice charge\b/.test(lower)) score -= 44
  if (/\bqty\b|\bquantity\b|\bunit price\b|\bprice\b|\bitem\b/.test(lower)) score -= 34
  if (lineAmountCount > 2 && !/\b(total|due|payable|amount)\b/.test(lower)) score -= 20
  if (!candidate.hasDecimal && !candidate.hasCurrency && candidate.value >= 1900 && candidate.value <= 2100) score -= 80
  if (!candidate.hasDecimal && candidate.value < 20 && !/\b(total|due|payable|amount)\b/.test(lower)) score -= 12

  return score
}

function extractReceiptAmount(lines) {
  let best = null

  lines.forEach((line, index) => {
    const amounts = extractLineAmounts(line)
    amounts.forEach(candidate => {
      const score = scoreReceiptAmountCandidate(line, candidate, index, lines.length, amounts.length)
      if (
        !best ||
        score > best.score ||
        (score === best.score && index > best.index) ||
        (score === best.score && index === best.index && candidate.value > best.value)
      ) {
        best = { ...candidate, score, index }
      }
    })
  })

  if (!best || best.score < 10) {
    return { value: null, confidence: 'none' }
  }

  return {
    value: best.value,
    confidence: best.score >= 110 ? 'high' : best.score >= 70 ? 'medium' : 'low',
  }
}

function extractReference(lines) {
  for (const line of lines) {
    const match = line.match(/(?:ref(?:erence)?(?: no\.?| #)?|transaction id|trace no\.?)[\s:]*([A-Z0-9-]{5,})/i)
    if (match) return match[1]
  }
  return ''
}

function extractDate(lines) {
  for (const line of lines) {
    const match = line.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})/)
    if (match) {
      const parsed = parseDateCandidate(match[1])
      if (parsed) return parsed
    }
  }
  return ''
}

function guessCategory(text) {
  const lower = text.toLowerCase()
  if (/restaurant|food|meal|dining|coffee|cafe|jollibee|mcdonald|starbucks|milk tea/.test(lower)) return 'Food & Dining'
  if (/grab|angkas|joyride|taxi|bus|train|lrt|mrt|transport|fuel|gas|parking/.test(lower)) return 'Transport'
  if (/shop|shopping|lazada|shopee|mall|store|market|supermarket/.test(lower)) return 'Shopping'
  if (/hospital|clinic|pharmacy|drugstore|medicine|health/.test(lower)) return 'Health'
  if (/movie|cinema|netflix|spotify|game|entertainment/.test(lower)) return 'Entertainment'
  if (/meralco|maynilad|water|internet|pldt|globe|smart|telco|bill/.test(lower)) return 'Bills'
  if (/salon|barber|spa|beauty|personal/.test(lower)) return 'Personal Care'
  return 'Other'
}

function detectPreset(type, text = '') {
  const lower = String(text || '').toLowerCase()
  if (!lower) return null
  return getPresetOptions(type).find(item => {
    if (!item || item.isCustom) return false
    const labels = [item.label, item.desc].filter(Boolean)
    return labels.some(label => lower.includes(String(label).toLowerCase()))
  }) || null
}

function guessSubcategory(type, cat, text = '') {
  const lower = String(text || '').toLowerCase()

  if (type === 'income') {
    if (cat === 'Salary') {
      if (/overtime|ot/.test(lower)) return 'Overtime'
      if (/commission/.test(lower)) return 'Commission'
      return 'Salary'
    }
    if (cat === 'Freelance') {
      if (/retainer/.test(lower)) return 'Retainer'
      if (/side hustle|sideline|gig/.test(lower)) return 'Side Hustle'
      return 'Client Project'
    }
    if (cat === 'Business') {
      if (/online/.test(lower)) return 'Online Selling'
      if (/service/.test(lower)) return 'Service Income'
      return 'Sales'
    }
    if (cat === 'Investment') {
      if (/dividend/.test(lower)) return 'Dividends'
      if (/gain/.test(lower)) return 'Investment Gain'
      return 'Interest'
    }
    if (cat === 'Bonus') {
      if (/incentive/.test(lower)) return 'Incentive'
      if (/performance/.test(lower)) return 'Performance Bonus'
      return 'Bonus'
    }
    if (cat === '13th Month') return '13th Month'
    if (/allowance/.test(lower)) return 'Allowance'
    if (/padala|remittance/.test(lower)) return 'Padala Received'
    if (/gift/.test(lower)) return 'Gift Received'
    if (/refund/.test(lower)) return 'Refund'
    if (/reimburse/.test(lower)) return 'Reimbursement'
    return 'Miscellaneous'
  }

  if (cat === 'Food & Dining') {
    if (/grocer|palengke|market|supermarket/.test(lower)) return 'Groceries / Palengke'
    if (/jollibee|mcdonald|mcdo|fast food/.test(lower)) return 'Fast Food'
    if (/coffee|milk tea|cafe|starbucks/.test(lower)) return 'Coffee / Milk Tea'
    if (/snack/.test(lower)) return 'Snacks'
    return 'Restaurants / Kainan'
  }

  if (cat === 'Transport') {
    if (/angkas|joyride|move it|motor/.test(lower)) return 'Motor Taxi'
    if (/grab|taxi/.test(lower)) return 'Taxi / Grab'
    if (/jeep|bus|mrt|lrt|train/.test(lower)) return 'Public Transport'
    if (/fuel|gas/.test(lower)) return 'Fuel'
    if (/parking/.test(lower)) return 'Parking'
    if (/toll/.test(lower)) return 'Toll'
    return 'Other'
  }

  if (cat === 'Shopping') {
    if (/shopee|lazada|online/.test(lower)) return 'Online Shopping'
    if (/household|grocery|home/.test(lower)) return 'Household'
    if (/electronic|gadget/.test(lower)) return 'Electronics'
    return 'Personal'
  }

  if (cat === 'Health') {
    if (/clinic/.test(lower)) return 'Clinic'
    if (/hospital/.test(lower)) return 'Hospital'
    if (/dental|dentist/.test(lower)) return 'Dental'
    if (/vitamin/.test(lower)) return 'Vitamins'
    return 'Medicine'
  }

  if (cat === 'Entertainment') {
    if (/movie|cinema/.test(lower)) return 'Movies'
    if (/game/.test(lower)) return 'Games'
    if (/event|concert/.test(lower)) return 'Events'
    return 'Hobbies'
  }

  if (cat === 'Personal Care') {
    if (/hair|barber|salon/.test(lower)) return 'Haircut / Salon'
    if (/skin|toiletr|watsons|beauty/.test(lower)) return 'Skincare / Toiletries'
    if (/laundry/.test(lower)) return 'Laundry'
    return 'Other'
  }

  if (cat === 'Education') {
    if (/tuition/.test(lower)) return 'Tuition'
    if (/suppl/.test(lower)) return 'School Supplies'
    if (/project|contribution/.test(lower)) return 'Projects / Contributions'
    if (/course/.test(lower)) return 'Online Course'
    return 'Other'
  }

  if (cat === 'Bills') {
    if (/electric|kuryente|meralco/.test(lower)) return 'Electricity'
    if (/water|maynilad|manila water/.test(lower)) return 'Water'
    if (/internet|fiber|wifi|pldt|converge/.test(lower)) return 'Internet'
    if (/globe|smart|dito|mobile|postpaid|load/.test(lower)) return 'Mobile'
    if (/rent/.test(lower)) return 'Rent'
    if (/association|assoc/.test(lower)) return 'Association Dues'
    if (/netflix|spotify|youtube|icloud|subscription/.test(lower)) return 'Subscriptions'
    if (/loan|installment|hulugan/.test(lower)) return 'Loan / Installment'
    if (/sss|pag-ibig|philhealth|bir|government/.test(lower)) return 'Government'
    if (/fee|charge/.test(lower)) return 'Fees'
    return 'Other'
  }

  if (/padala|support/.test(lower)) return 'Family Support / Padala'
  if (/saving|transfer/.test(lower)) return 'Transfer to Savings'
  if (/cash in|cash out|wallet/.test(lower)) return 'Cash In / Cash Out'
  return 'Miscellaneous'
}

function sanitizeEntity(value) {
  return String(value || '')
    .replace(/^[^A-Za-z0-9]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isLikelyEntity(value) {
  const cleaned = sanitizeEntity(value)
  if (cleaned.length < 3 || cleaned.length > 60) return false
  if (!/[A-Za-z]/.test(cleaned)) return false
  if (/^(gcash|maya)$/i.test(cleaned)) return false
  if (/official receipt|thank you|reference|transaction|trace no|date|time|amount|total/i.test(cleaned)) return false
  return true
}

function pickEntity(lines, lowerText, fallbackLabel = 'Imported transaction') {
  const labeledPatterns = [
    /(?:to|recipient|merchant|biller|sent to)[\s:]+(.+)/i,
    /(?:from|sender|received from)[\s:]+(.+)/i,
  ]

  for (const line of lines) {
    for (const pattern of labeledPatterns) {
      const match = line.match(pattern)
      const cleaned = sanitizeEntity(match?.[1])
      if (isLikelyEntity(cleaned)) return cleaned
    }
  }

  for (const line of lines) {
    const cleaned = sanitizeEntity(line)
    if (!isLikelyEntity(cleaned)) continue
    return cleaned
  }

  if (lowerText.includes('gcash')) return 'GCash transaction'
  if (lowerText.includes('maya')) return 'Maya transaction'
  return fallbackLabel
}

export function parseReceiptText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  const amountCandidate = extractReceiptAmount(lines)
  const date = extractDate(lines)
  const desc = pickEntity(lines, text.toLowerCase(), 'Receipt')
  const preset = detectPreset('expense', `${text}\n${desc}`)
  const cat = preset?.cat || guessCategory(text)
  const subcat = preset?.subcat || guessSubcategory('expense', cat, `${text}\n${desc}`)

  return {
    source: 'receipt',
    type: 'expense',
    amount: amountCandidate.value,
    amountConfidence: amountCandidate.confidence,
    date: date || today(),
    desc,
    cat,
    subcat,
    presetKey: preset?.key || '',
    reference: extractReference(lines),
    needsReview: true,
  }
}

export function parseWalletText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  const lower = text.toLowerCase()
  const wallet = lower.includes('gcash') ? 'GCash' : lower.includes('maya') ? 'Maya' : 'Wallet'
  const amount = extractWalletAmount(lines)

  let type = 'expense'
  if (/cash in|transfer to bank|bank transfer|wallet transfer|load wallet|top up/.test(lower)) type = 'transfer'
  else if (/received|money received|incoming|credited|you got/.test(lower)) type = 'income'
  else if (/paid|payment|you sent|send money|merchant payment|purchase|debited/.test(lower)) type = 'expense'

  const desc = pickEntity(lines, lower)
  const fallbackDesc = type === 'income'
    ? `${wallet} income`
    : type === 'transfer'
      ? `${wallet} transfer`
      : `${wallet} payment`
  const resolvedType = type === 'income' ? 'income' : 'expense'
  const preset = detectPreset(resolvedType, `${text}\n${desc}`)
  const cat = preset?.cat || guessCategory(text)
  const subcat = preset?.subcat || guessSubcategory(resolvedType, cat, `${text}\n${desc}`)

  return {
    source: 'wallet',
    wallet,
    type,
    amount,
    amountConfidence: amount ? 'medium' : 'none',
    date: extractDate(lines) || today(),
    desc: desc && !/^(GCash|Maya|Wallet) transaction$/i.test(desc) ? desc : fallbackDesc,
    cat,
    subcat,
    presetKey: preset?.key || '',
    reference: extractReference(lines),
    needsReview: type === 'transfer' || !amount,
  }
}
