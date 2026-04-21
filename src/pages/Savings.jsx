import { useState } from 'react'
import GamificationCard from '../components/GamificationCard'
import { fsAdd, fsDel, fsUpdate } from '../lib/firestore'
import { confirmDeleteApp, notifyApp } from '../lib/appFeedback'
import { displayValue, fmt, formatDisplayDate, maskMoney } from '../lib/utils'
import styles from './Page.module.css'
import sStyles from './Savings.module.css'

export default function Savings({ user, data, profile = {}, symbol, privacyMode = false, gamification }) {
  const s = symbol || '₱'
  const [form, setForm] = useState({ name: '', target: '', current: '', date: '' })
  const [contribs, setContribs] = useState({})

  function set(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function handleAdd() {
    if (!form.name || !form.target) {
      notifyApp({ title: 'Goal needs details', message: 'Add a goal name and target amount before saving.', tone: 'warning' })
      return
    }
    const target = Number(form.target)
    const current = form.current === '' ? 0 : Number(form.current)
    if (!Number.isFinite(target) || target <= 0) {
      notifyApp({ title: 'Check target', message: 'Target amount must be greater than zero.', tone: 'warning' })
      return
    }
    if (!Number.isFinite(current) || current < 0) {
      notifyApp({ title: 'Check current saved', message: 'Current saved cannot be below zero.', tone: 'warning' })
      return
    }
    if (current > target) {
      notifyApp({ title: 'Check current saved', message: 'Current saved cannot be higher than the target amount.', tone: 'warning' })
      return
    }
    await fsAdd(user.uid, 'goals', {
      name: form.name,
      target,
      current,
      date: form.date,
    })
    setForm({ name: '', target: '', current: '', date: '' })
  }

  async function handleContrib(goal) {
    const value = parseFloat(contribs[goal._id] || 0)
    if (!Number.isFinite(value) || value <= 0) {
      notifyApp({ title: 'Check contribution', message: 'Add a contribution greater than zero.', tone: 'warning' })
      return
    }
    const newValue = Math.min(goal.target, (goal.current || 0) + value)
    await fsUpdate(user.uid, 'goals', goal._id, { current: newValue })
    setContribs(current => ({ ...current, [goal._id]: '' }))
  }

  const money = value => displayValue(privacyMode, fmt(value, s), maskMoney(s))
  const hasTargetDate = Boolean(form.date)
  const goals = data.goals.map(goal => {
    const current = Number(goal.current) || 0
    const target = Number(goal.target) || 0
    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
    const remaining = Math.max(0, target - current)
    return { ...goal, current, target, pct, remaining }
  })
  const totalSaved = goals.reduce((sum, goal) => sum + goal.current, 0)
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0)
  const totalRemaining = Math.max(0, totalTarget - totalSaved)
  const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0
  const completedGoals = goals.filter(goal => goal.pct >= 100).length
  const nextGoal = goals
    .filter(goal => goal.pct < 100)
    .sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct
      return a.remaining - b.remaining
    })[0] || null

  return (
    <div className={`${styles.page} ${sStyles.savingsPage}`}>
      <div className={sStyles.heroSection}>
        <div className={sStyles.heroCopy}>
          <div className={sStyles.pageEyebrow}>Savings</div>
          <div className={sStyles.pageTitle}>Turn goals into visible next steps.</div>
          <div className={sStyles.pageSub}>
            Keep the target, remaining gap, and next contribution visible without pretending a goal is guaranteed.
          </div>
        </div>

        <div className={sStyles.heroAside}>
          <div className={sStyles.heroAsideLabel}>{nextGoal ? 'Closest next win' : 'Overall progress'}</div>
          <div className={sStyles.heroAsideValue}>
            {nextGoal ? nextGoal.name : displayValue(privacyMode, `${overallPct}%`, '•••')}
          </div>
          <div className={sStyles.heroAsideTrack}>
            <div
              className={sStyles.heroAsideFill}
              style={{ width: `${nextGoal ? nextGoal.pct : overallPct}%` }}
            />
          </div>
          <div className={sStyles.heroAsideMeta}>
            {nextGoal
              ? `${displayValue(privacyMode, `${nextGoal.pct}% funded`, 'Progress hidden')} · ${displayValue(privacyMode, `${fmt(nextGoal.remaining, s)} left`, `${maskMoney(s)} left`)}`
              : goals.length
                ? `${completedGoals} completed · ${goals.length} active`
                : 'Create your first goal below'}
          </div>
        </div>
      </div>

      <div className={sStyles.summaryGrid}>
        <div className={sStyles.summaryCard}>
          <div className={sStyles.summaryLabel}>Saved total</div>
          <div className={`${sStyles.summaryValue} ${sStyles.summaryValueAccent}`}>{money(totalSaved)}</div>
          <div className={sStyles.summaryMeta}>Across all savings goals</div>
        </div>
        <div className={sStyles.summaryCard}>
          <div className={sStyles.summaryLabel}>Remaining gap</div>
          <div className={`${sStyles.summaryValue} ${sStyles.summaryValueBlue}`}>{money(totalRemaining)}</div>
          <div className={sStyles.summaryMeta}>
            {goals.length ? displayValue(privacyMode, `${overallPct}% funded overall`, 'Progress hidden') : 'Add a real target when you are ready'}
          </div>
        </div>
        <div className={sStyles.summaryCard}>
          <div className={sStyles.summaryLabel}>Goals</div>
          <div className={sStyles.summaryValue}>{goals.length}</div>
          <div className={sStyles.summaryMeta}>
            {completedGoals ? `${completedGoals} completed` : goals.length ? 'All still in progress' : 'Start with one clear target'}
          </div>
        </div>
      </div>

      <div className={sStyles.composerCard}>
        <div className={sStyles.sectionHeader}>
          <div>
            <div className={sStyles.sectionTitle}>New goal</div>
            <div className={sStyles.sectionSub}>Start simple. You can add the amount first and fine-tune later.</div>
          </div>
        </div>

        <div className={sStyles.composerGrid}>
          <div className={sStyles.field}>
            <label className={sStyles.fieldLabel} htmlFor="savings-goal-name">Goal name</label>
            <input
              id="savings-goal-name"
              className={sStyles.fieldInput}
              placeholder="e.g. Emergency fund"
              value={form.name}
              onChange={event => set('name', event.target.value)}
            />
          </div>

          <div className={sStyles.field}>
            <label className={sStyles.fieldLabel} htmlFor="savings-goal-target">Target amount ({s})</label>
            <input
              id="savings-goal-target"
              className={sStyles.fieldInput}
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              value={form.target}
              onChange={event => set('target', event.target.value)}
            />
          </div>
        </div>

        <details className={sStyles.advancedBox}>
          <summary className={sStyles.advancedSummary}>
            <span>More options</span>
            <small>Target date, starting amount</small>
          </summary>
          <div className={sStyles.advancedGrid}>
            <div className={sStyles.field}>
              <div className={sStyles.fieldLabelRow}>
                <label className={sStyles.fieldLabel} htmlFor="savings-target-date">Target date</label>
                <span className={sStyles.fieldNote}>Optional</span>
              </div>
              <div className={sStyles.dateFieldWrap}>
                <div className={`${sStyles.dateFieldDisplay} ${!hasTargetDate ? sStyles.dateFieldPlaceholder : ''}`}>
                  {formatDisplayDate(form.date)}
                </div>
                <input
                  id="savings-target-date"
                  type="date"
                  className={sStyles.dateFieldNative}
                  value={form.date}
                  aria-label="Target date"
                  onChange={event => set('date', event.target.value)}
                />
              </div>
            </div>

            <div className={sStyles.field}>
              <label className={sStyles.fieldLabel} htmlFor="savings-goal-current">Current saved ({s})</label>
              <input
                id="savings-goal-current"
                className={sStyles.fieldInput}
                type="number"
                min="0"
                inputMode="decimal"
                placeholder="0.00"
                value={form.current}
                onChange={event => set('current', event.target.value)}
              />
            </div>
          </div>
        </details>

        <div className={sStyles.composerFooter}>
          <div className={sStyles.composerHint}>
            Set a target date only when it helps pacing. The goal still works fine without one.
          </div>
          <button type="button" className={sStyles.primaryButton} onClick={handleAdd}>Add goal</button>
        </div>
      </div>

      <div className={sStyles.gamificationWrap}>
        <GamificationCard
          gamification={gamification}
          privacyMode={privacyMode}
          compact
          title="Savings progress"
          message="Goals work better when the finish line and the remaining gap stay visible."
        />
      </div>

      {!goals.length ? (
        <div className={sStyles.emptyCard}>
          <div className={sStyles.emptyTitle}>No savings goals yet</div>
          <div className={sStyles.emptyBody}>Add one above to create a clear target and make progress easier to judge at a glance.</div>
        </div>
      ) : (
        <div className={sStyles.goalList}>
          {goals.map(goal => (
            <div key={goal._id} className={sStyles.goalCard}>
              <div className={sStyles.goalCardTop}>
                <div className={sStyles.goalCopy}>
                  <div className={sStyles.goalNameRow}>
                    <div className={sStyles.goalName}>{goal.name}</div>
                    {goal.date && <span className={sStyles.goalDateChip}>Target {formatDisplayDate(goal.date)}</span>}
                  </div>
                  <div className={sStyles.goalValueRow}>
                    <span className={sStyles.goalSaved}>{displayValue(privacyMode, `${fmt(goal.current, s)} saved`, `${maskMoney(s)} saved`)}</span>
                    <span className={sStyles.goalTarget}>of {money(goal.target)}</span>
                  </div>
                </div>

                <div className={sStyles.goalActions}>
                  <span className={sStyles.goalPct}>{displayValue(privacyMode, `${goal.pct}%`, '•••')}</span>
                  <button
                    type="button"
                    className={sStyles.goalDelete}
                    onClick={async () => {
                      if (await confirmDeleteApp(goal.name)) await fsDel(user.uid, 'goals', goal._id)
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className={sStyles.goalTrack}>
                <div
                  className={`${sStyles.goalTrackFill} ${goal.pct >= 100 ? sStyles.goalTrackFillComplete : ''}`}
                  style={{ width: `${goal.pct}%` }}
                />
              </div>

              <div className={sStyles.goalMetaRow}>
                <span className={sStyles.goalRemaining}>{displayValue(privacyMode, `${fmt(goal.remaining, s)} left`, `${maskMoney(s)} left`)}</span>
                <span className={sStyles.goalState}>
                  {goal.pct >= 100 ? 'Completed' : goal.date ? `Finish by ${formatDisplayDate(goal.date)}` : 'No target date set'}
                </span>
              </div>

              <div className={sStyles.contributionRow}>
                <input
                  className={sStyles.contributionInput}
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder={`Add contribution (${s})`}
                  value={contribs[goal._id] || ''}
                  onChange={event => setContribs(current => ({ ...current, [goal._id]: event.target.value }))}
                  onKeyDown={event => {
                    if (event.key === 'Enter') handleContrib(goal)
                  }}
                />
                <button
                  type="button"
                  className={sStyles.contributionBtn}
                  onClick={() => handleContrib(goal)}
                >
                  Add funds
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
