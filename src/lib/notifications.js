import { getMonthKey, maskMoney, today as todayKey, toMonthKey } from './utils'

// Notification engine — generates in-app alerts based on user data

export const DEFAULT_NOTIFICATION_PREFS = {
  budget: true,
  bills: true,
  goals: true,
  salary: true,
  spending: true,
}

export function getNotificationPrefs(profile = {}) {
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(profile?.notificationPrefs || {}),
  }
}

export function getAlerts(data, profile, privacyMode = false) {
  const alerts = []
  const now = new Date()
  const currentDay = now.getDate()
  const ym = toMonthKey(now.getFullYear(), now.getMonth())
  const prefs = getNotificationPrefs(profile)

  // 1. Budget overspending alerts
  const spending = {}
  data.expenses.filter(t => getMonthKey(t.date) === ym).forEach(t => {
    spending[t.cat] = (spending[t.cat] || 0) + (t.amount || 0)
  })

  if (prefs.budget) {
    data.budgets.forEach(b => {
      const spent = spending[b.cat] || 0
      const pct = spent / b.limit
      if (pct >= 1) {
        alerts.push({
          id: `budget-over-${b.cat}`,
          type: 'danger',
          icon: '⚠',
          title: `Over budget — ${b.cat}`,
          body: `You've exceeded your ${b.cat} budget by ${formatOver(spent - b.limit, privacyMode)}.`,
          priority: 1,
        })
      } else if (pct >= 0.8) {
        alerts.push({
          id: `budget-warn-${b.cat}`,
          type: 'warning',
          icon: '⚡',
          title: `Budget warning — ${b.cat}`,
          body: `${Math.round(pct * 100)}% of your ${b.cat} budget used. ${formatOver(b.limit - spent, privacyMode)} remaining.`,
          priority: 2,
        })
      }
    })
  }

  // 2. Bills due soon (within next 3 days or overdue this month)
  if (prefs.bills) {
    data.bills.forEach(b => {
      if (b.paid) return
      const daysUntil = b.due - currentDay
      if (daysUntil < 0) {
        alerts.push({
          id: `bill-overdue-${b._id}`,
          type: 'danger',
          icon: '📄',
          title: `Bill overdue — ${b.name}`,
          body: `${b.name} was due on day ${b.due}. Mark it paid when settled.`,
          priority: 1,
        })
      } else if (daysUntil <= 3) {
        alerts.push({
          id: `bill-due-${b._id}`,
          type: 'warning',
          icon: '📄',
          title: `Bill due in ${daysUntil === 0 ? 'today' : daysUntil + ' day' + (daysUntil > 1 ? 's' : '')} — ${b.name}`,
          body: `${b.name} payment of ${privacyMode ? maskMoney() : formatOver(b.amount || 0, false)} is due ${daysUntil === 0 ? 'today' : `in ${daysUntil} days`}.`,
          priority: 2,
        })
      }
    })
  }

  // 3. Savings goals near completion
  if (prefs.goals) {
    data.goals.forEach(g => {
      const pct = (g.current || 0) / (g.target || 1)
      if (pct >= 1) {
        alerts.push({
          id: `goal-done-${g._id}`,
          type: 'success',
          icon: '🎯',
          title: `Goal reached — ${g.name}`,
          body: `Congrats! You've reached your ${g.name} savings goal.`,
          priority: 3,
        })
      } else if (pct >= 0.9) {
        alerts.push({
          id: `goal-near-${g._id}`,
          type: 'info',
          icon: '🎯',
          title: `Almost there — ${g.name}`,
          body: `You're ${Math.round(pct * 100)}% of the way to your ${g.name} goal. Keep it up!`,
          priority: 3,
        })
      }
    })
  }

  // 4. No salary income logged this month
  const hasSalary = data.income.some(t => getMonthKey(t.date) === ym && t.cat === 'Salary')
  const profileSalary = profile?.salary
  if (prefs.salary && profileSalary && !hasSalary && currentDay >= 5) {
    alerts.push({
      id: 'no-salary',
      type: 'info',
      icon: '💼',
      title: 'Salary not logged yet',
      body: `You haven't logged your salary for this month. Add it via the Calendar or + Income button.`,
      priority: 4,
    })
  }

  // 5. High spending day (today > 20% of monthly budget)
  const totalBudget = data.budgets.reduce((s, b) => s + (b.limit || 0), 0)
  const todayStr = todayKey()
  const todaySpend = data.expenses.filter(t => t.date === todayStr).reduce((s, t) => s + (t.amount || 0), 0)
  if (prefs.spending && totalBudget > 0 && todaySpend > totalBudget * 0.2) {
    alerts.push({
      id: 'high-spend-today',
      type: 'warning',
      icon: '💸',
      title: 'High spending today',
      body: `You've spent ${privacyMode ? maskMoney() : formatOver(todaySpend, false)} today — over 20% of your monthly budget in one day.`,
      priority: 2,
    })
  }

  return alerts.sort((a, b) => a.priority - b.priority)
}

function formatOver(n, hidden = false) {
  if (hidden) return maskMoney()
  return '₱' + Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Browser push notification request
export async function requestPushPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// Send browser push notification
export function sendPushNotification(title, body, icon = '/favicon.svg') {
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon })
}
