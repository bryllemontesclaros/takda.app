import { useEffect, useMemo, useState } from 'react'
import { fsAdd, fsDel, fsDeleteLakasMeal, fsSaveLakasMeal, fsUpdate } from '../lib/firestore'
import { confirmDeleteApp, notifyApp } from '../lib/appFeedback'
import { formatDisplayDate, today } from '../lib/utils'
import styles from './Page.module.css'
import lStyles from './Lakas.module.css'

const FOOD_PRESETS = [
  { name: 'White rice (1 cup)', calories: 205, protein: 4, carbs: 45, fat: 0 },
  { name: 'Chicken adobo', calories: 320, protein: 28, carbs: 6, fat: 20 },
  { name: 'Boiled egg', calories: 78, protein: 6, carbs: 1, fat: 5 },
  { name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: 'Chicken breast 150g', calories: 248, protein: 46, carbs: 0, fat: 5 },
  { name: 'Tuna flakes', calories: 180, protein: 24, carbs: 2, fat: 8 },
  { name: 'Pancit serving', calories: 350, protein: 12, carbs: 52, fat: 11 },
  { name: 'Milk tea regular', calories: 420, protein: 5, carbs: 70, fat: 12 },
]

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
const GOAL_TYPES = ['Workout', 'Weight', 'Calories', 'Protein', 'Steps', 'Custom']

function createWorkoutForm() {
  return {
    date: today(),
    title: '',
    duration: '',
    exercises: '',
    notes: '',
  }
}

function createMealForm() {
  return {
    date: today(),
    mealType: 'Lunch',
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    notes: '',
  }
}

function createBodyForm() {
  return {
    date: today(),
    weight: '',
    waist: '',
    notes: '',
  }
}

function createGoalForm() {
  return {
    name: '',
    type: 'Workout',
    target: '',
    current: '',
    unit: 'sessions',
  }
}

function normalizeRows(rows = []) {
  return Array.isArray(rows) ? rows : []
}

function dateDaysAgo(days) {
  const base = new Date(`${today()}T00:00:00`)
  base.setDate(base.getDate() - days)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
}

function sortNewest(rows = []) {
  return [...rows].sort((a, b) => {
    const dateCompare = String(b.date || '').localeCompare(String(a.date || ''))
    if (dateCompare) return dateCompare
    return Number(b.createdAt || 0) - Number(a.createdAt || 0)
  })
}

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function displayMetric(value, unit = '', hidden = false) {
  if (hidden) return unit ? `••• ${unit}` : '•••'
  const numeric = Number(value) || 0
  return `${numeric.toLocaleString('en-PH', { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ''}`
}

export default function Lakas({ user, data = {}, privacyMode = false }) {
  const [workoutForm, setWorkoutForm] = useState(createWorkoutForm)
  const [mealForm, setMealForm] = useState(createMealForm)
  const [mealPhoto, setMealPhoto] = useState(null)
  const [bodyForm, setBodyForm] = useState(createBodyForm)
  const [goalForm, setGoalForm] = useState(createGoalForm)
  const [goalProgress, setGoalProgress] = useState({})
  const [savingMeal, setSavingMeal] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')

  const workouts = sortNewest(normalizeRows(data.lakasWorkouts))
  const meals = sortNewest(normalizeRows(data.lakasMeals))
  const bodyLogs = sortNewest(normalizeRows(data.lakasBodyLogs))
  const goals = normalizeRows(data.lakasGoals)

  useEffect(() => {
    if (!mealPhoto) {
      setPhotoPreview('')
      return undefined
    }

    const nextPreview = URL.createObjectURL(mealPhoto)
    setPhotoPreview(nextPreview)
    return () => URL.revokeObjectURL(nextPreview)
  }, [mealPhoto])

  const stats = useMemo(() => {
    const weekStart = dateDaysAgo(6)
    const workoutsThisWeek = workouts.filter(row => row.date >= weekStart).length
    const todaysMeals = meals.filter(row => row.date === today())
    const caloriesToday = todaysMeals.reduce((sum, row) => sum + numberOrZero(row.calories), 0)
    const proteinToday = todaysMeals.reduce((sum, row) => sum + numberOrZero(row.protein), 0)
    const latestWeight = bodyLogs.find(row => numberOrZero(row.weight) > 0)?.weight || 0
    const activeGoals = goals.filter(goal => numberOrZero(goal.current) < numberOrZero(goal.target)).length
    return { workoutsThisWeek, caloriesToday, proteinToday, latestWeight, activeGoals }
  }, [bodyLogs, goals, meals, workouts])

  function applyFoodPreset(food) {
    setMealForm(current => ({
      ...current,
      name: food.name,
      calories: String(food.calories),
      protein: String(food.protein),
      carbs: String(food.carbs),
      fat: String(food.fat),
    }))
  }

  async function handleAddWorkout() {
    if (!workoutForm.title.trim() || !workoutForm.date) {
      notifyApp({ title: 'Workout needs details', message: 'Add a workout name and date.', tone: 'warning' })
      return
    }

    const exerciseLines = workoutForm.exercises
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)

    await fsAdd(user.uid, 'lakasWorkouts', {
      title: workoutForm.title.trim(),
      date: workoutForm.date,
      duration: numberOrZero(workoutForm.duration),
      exercises: workoutForm.exercises.trim(),
      exerciseCount: exerciseLines.length,
      notes: workoutForm.notes.trim(),
      source: 'lakas',
    })
    setWorkoutForm(createWorkoutForm())
    notifyApp({ title: 'Workout logged', message: 'Your Lakas workout was saved.', tone: 'success' })
  }

  async function handleAddMeal() {
    if (!mealForm.name.trim() || !mealForm.date) {
      notifyApp({ title: 'Meal needs details', message: 'Add a meal name and date before saving.', tone: 'warning' })
      return
    }

    setSavingMeal(true)
    try {
      await fsSaveLakasMeal(user.uid, {
        ...mealForm,
        name: mealForm.name.trim(),
        calories: numberOrZero(mealForm.calories),
        protein: numberOrZero(mealForm.protein),
        carbs: numberOrZero(mealForm.carbs),
        fat: numberOrZero(mealForm.fat),
        notes: mealForm.notes.trim(),
        photoBlob: mealPhoto,
        fileName: mealPhoto?.name || '',
      })
      setMealForm(createMealForm())
      setMealPhoto(null)
      notifyApp({ title: 'Meal logged', message: 'Photo Meal Log saved with your nutrition estimate.', tone: 'success' })
    } catch {
      notifyApp({ title: 'Meal not saved', message: 'Check your connection and Firebase Storage rules, then try again.', tone: 'error' })
    } finally {
      setSavingMeal(false)
    }
  }

  async function handleAddBodyLog() {
    if (!bodyForm.date || (!bodyForm.weight && !bodyForm.waist)) {
      notifyApp({ title: 'Body log needs a metric', message: 'Add weight or waist measurement before saving.', tone: 'warning' })
      return
    }

    await fsAdd(user.uid, 'lakasBodyLogs', {
      date: bodyForm.date,
      weight: numberOrZero(bodyForm.weight),
      waist: numberOrZero(bodyForm.waist),
      notes: bodyForm.notes.trim(),
      source: 'lakas',
    })
    setBodyForm(createBodyForm())
    notifyApp({ title: 'Body progress saved', message: 'Your body log was added.', tone: 'success' })
  }

  async function handleAddGoal() {
    if (!goalForm.name.trim() || !goalForm.target) {
      notifyApp({ title: 'Goal needs details', message: 'Add a goal name and target.', tone: 'warning' })
      return
    }

    const target = numberOrZero(goalForm.target)
    const current = numberOrZero(goalForm.current)
    if (target <= 0) {
      notifyApp({ title: 'Check goal target', message: 'Goal target must be greater than zero.', tone: 'warning' })
      return
    }

    await fsAdd(user.uid, 'lakasGoals', {
      name: goalForm.name.trim(),
      type: goalForm.type,
      target,
      current,
      unit: goalForm.unit.trim() || 'units',
      source: 'lakas',
    })
    setGoalForm(createGoalForm())
    notifyApp({ title: 'Lakas goal saved', message: 'Your fitness goal is now tracked.', tone: 'success' })
  }

  async function handleGoalProgress(goal) {
    const value = numberOrZero(goalProgress[goal._id])
    if (value <= 0) {
      notifyApp({ title: 'Progress needs a value', message: 'Add a number greater than zero.', tone: 'warning' })
      return
    }
    await fsUpdate(user.uid, 'lakasGoals', goal._id, {
      current: Math.min(numberOrZero(goal.target), numberOrZero(goal.current) + value),
    })
    setGoalProgress(current => ({ ...current, [goal._id]: '' }))
  }

  return (
    <div className={`${styles.page} ${lStyles.page}`}>
      <div className={lStyles.hero}>
        <div>
          <div className={lStyles.eyebrow}>Lakas</div>
          <div className={lStyles.title}>Train, eat, and track body progress in one place.</div>
          <div className={lStyles.sub}>
            A focused fitness module: Hevy-style workout logs, body check-ins, goals, and an honest Photo Meal Log for calories and macros.
          </div>
        </div>
        <div className={lStyles.heroCard}>
          <div className={lStyles.heroCardLabel}>This week</div>
          <div className={lStyles.heroCardValue}>{displayMetric(stats.workoutsThisWeek, 'workouts', privacyMode)}</div>
          <div className={lStyles.heroCardMeta}>{stats.activeGoals ? `${stats.activeGoals} active goals` : 'Set one goal to start'}</div>
        </div>
      </div>

      <div className={lStyles.statsGrid}>
        <div className={lStyles.statCard}>
          <span>Workouts</span>
          <strong>{displayMetric(stats.workoutsThisWeek, '', privacyMode)}</strong>
          <small>Last 7 days</small>
        </div>
        <div className={lStyles.statCard}>
          <span>Calories</span>
          <strong>{displayMetric(stats.caloriesToday, 'kcal', privacyMode)}</strong>
          <small>Logged today</small>
        </div>
        <div className={lStyles.statCard}>
          <span>Protein</span>
          <strong>{displayMetric(stats.proteinToday, 'g', privacyMode)}</strong>
          <small>Logged today</small>
        </div>
        <div className={lStyles.statCard}>
          <span>Latest weight</span>
          <strong>{stats.latestWeight ? displayMetric(stats.latestWeight, 'kg', privacyMode) : 'No log'}</strong>
          <small>Body progress</small>
        </div>
      </div>

      <div className={lStyles.grid}>
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Workout log</div>
              <h3>Log a workout</h3>
            </div>
          </div>
          <div className={lStyles.formGrid}>
            <label>
              <span>Workout name</span>
              <input value={workoutForm.title} placeholder="Push day, Full body, Run" onChange={event => setWorkoutForm(current => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              <span>Date</span>
              <input type="date" value={workoutForm.date} onChange={event => setWorkoutForm(current => ({ ...current, date: event.target.value }))} />
            </label>
            <label>
              <span>Duration (min)</span>
              <input type="number" min="0" inputMode="decimal" value={workoutForm.duration} placeholder="60" onChange={event => setWorkoutForm(current => ({ ...current, duration: event.target.value }))} />
            </label>
            <label className={lStyles.full}>
              <span>Exercises</span>
              <textarea value={workoutForm.exercises} placeholder={'Bench press 3x8 @ 50kg\nSquat 3x5 @ 70kg'} onChange={event => setWorkoutForm(current => ({ ...current, exercises: event.target.value }))} />
            </label>
            <label className={lStyles.full}>
              <span>Notes</span>
              <input value={workoutForm.notes} placeholder="Energy, soreness, form notes" onChange={event => setWorkoutForm(current => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <button type="button" className={lStyles.primaryBtn} onClick={handleAddWorkout}>Save workout</button>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Photo Meal Log</div>
              <h3>Log meal with photo</h3>
            </div>
          </div>
          <div className={lStyles.presetRow}>
            {FOOD_PRESETS.slice(0, 6).map(food => (
              <button key={food.name} type="button" className={lStyles.chip} onClick={() => applyFoodPreset(food)}>
                {food.name}
              </button>
            ))}
          </div>
          <div className={lStyles.mealPhotoBox}>
            {photoPreview ? (
              <img src={photoPreview} alt="Selected meal preview" />
            ) : (
              <div>
                <strong>Add meal photo</strong>
                <span>No AI scan yet. The photo is saved with your manual calorie estimate.</span>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={event => setMealPhoto(event.target.files?.[0] || null)} aria-label="Meal photo" />
          </div>
          <div className={lStyles.formGrid}>
            <label>
              <span>Meal</span>
              <input value={mealForm.name} placeholder="Chicken adobo with rice" onChange={event => setMealForm(current => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>Type</span>
              <select value={mealForm.mealType} onChange={event => setMealForm(current => ({ ...current, mealType: event.target.value }))}>
                {MEAL_TYPES.map(type => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span>Date</span>
              <input type="date" value={mealForm.date} onChange={event => setMealForm(current => ({ ...current, date: event.target.value }))} />
            </label>
            <label>
              <span>Calories</span>
              <input type="number" min="0" inputMode="decimal" value={mealForm.calories} placeholder="450" onChange={event => setMealForm(current => ({ ...current, calories: event.target.value }))} />
            </label>
            <label>
              <span>Protein (g)</span>
              <input type="number" min="0" inputMode="decimal" value={mealForm.protein} placeholder="30" onChange={event => setMealForm(current => ({ ...current, protein: event.target.value }))} />
            </label>
            <label>
              <span>Carbs (g)</span>
              <input type="number" min="0" inputMode="decimal" value={mealForm.carbs} placeholder="50" onChange={event => setMealForm(current => ({ ...current, carbs: event.target.value }))} />
            </label>
            <label>
              <span>Fat (g)</span>
              <input type="number" min="0" inputMode="decimal" value={mealForm.fat} placeholder="12" onChange={event => setMealForm(current => ({ ...current, fat: event.target.value }))} />
            </label>
            <label className={lStyles.full}>
              <span>Notes</span>
              <input value={mealForm.notes} placeholder="Portion notes, sauce, drink, etc." onChange={event => setMealForm(current => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <button type="button" className={lStyles.primaryBtn} onClick={handleAddMeal} disabled={savingMeal}>
            {savingMeal ? 'Saving meal...' : 'Save meal'}
          </button>
        </section>
      </div>

      <div className={lStyles.grid}>
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Body</div>
              <h3>Body progress</h3>
            </div>
          </div>
          <div className={lStyles.formGrid}>
            <label>
              <span>Date</span>
              <input type="date" value={bodyForm.date} onChange={event => setBodyForm(current => ({ ...current, date: event.target.value }))} />
            </label>
            <label>
              <span>Weight (kg)</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.weight} placeholder="70" onChange={event => setBodyForm(current => ({ ...current, weight: event.target.value }))} />
            </label>
            <label>
              <span>Waist (cm)</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.waist} placeholder="82" onChange={event => setBodyForm(current => ({ ...current, waist: event.target.value }))} />
            </label>
            <label className={lStyles.full}>
              <span>Notes</span>
              <input value={bodyForm.notes} placeholder="Morning weigh-in, after workout, etc." onChange={event => setBodyForm(current => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <button type="button" className={lStyles.primaryBtn} onClick={handleAddBodyLog}>Save body log</button>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Goals</div>
              <h3>Lakas goals</h3>
            </div>
          </div>
          <div className={lStyles.formGrid}>
            <label>
              <span>Goal name</span>
              <input value={goalForm.name} placeholder="Workout 3x weekly" onChange={event => setGoalForm(current => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>Type</span>
              <select value={goalForm.type} onChange={event => setGoalForm(current => ({ ...current, type: event.target.value }))}>
                {GOAL_TYPES.map(type => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span>Current</span>
              <input type="number" min="0" inputMode="decimal" value={goalForm.current} placeholder="0" onChange={event => setGoalForm(current => ({ ...current, current: event.target.value }))} />
            </label>
            <label>
              <span>Target</span>
              <input type="number" min="0" inputMode="decimal" value={goalForm.target} placeholder="12" onChange={event => setGoalForm(current => ({ ...current, target: event.target.value }))} />
            </label>
            <label>
              <span>Unit</span>
              <input value={goalForm.unit} placeholder="sessions, kg, steps" onChange={event => setGoalForm(current => ({ ...current, unit: event.target.value }))} />
            </label>
          </div>
          <button type="button" className={lStyles.primaryBtn} onClick={handleAddGoal}>Save goal</button>
        </section>
      </div>

      <div className={lStyles.timelineGrid}>
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>History</div>
              <h3>Recent workouts</h3>
            </div>
          </div>
          {!workouts.length ? <div className={lStyles.empty}>No workouts logged yet.</div> : workouts.slice(0, 6).map(workout => (
            <div key={workout._id} className={lStyles.rowCard}>
              <div>
                <strong>{workout.title}</strong>
                <span>{formatDisplayDate(workout.date)} · {workout.duration ? `${workout.duration} min` : 'No duration'} · {workout.exerciseCount || 0} exercises</span>
                {workout.exercises && <small>{workout.exercises.split('\n').slice(0, 2).join(' | ')}</small>}
              </div>
              <button type="button" onClick={async () => { if (await confirmDeleteApp(workout.title)) await fsDel(user.uid, 'lakasWorkouts', workout._id) }}>Delete</button>
            </div>
          ))}
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Meals</div>
              <h3>Recent meals</h3>
            </div>
          </div>
          {!meals.length ? <div className={lStyles.empty}>No meals logged yet.</div> : meals.slice(0, 6).map(meal => (
            <div key={meal._id} className={lStyles.mealRow}>
              {meal.photoUrl && !privacyMode ? <img src={meal.photoUrl} alt="" /> : <div className={lStyles.photoPlaceholder}>{meal.photoUrl ? 'Hidden' : 'Meal'}</div>}
              <div>
                <strong>{meal.name}</strong>
                <span>{formatDisplayDate(meal.date)} · {meal.mealType} · {displayMetric(meal.calories, 'kcal', privacyMode)}</span>
                <small>{displayMetric(meal.protein, 'g protein', privacyMode)} · {displayMetric(meal.carbs, 'g carbs', privacyMode)} · {displayMetric(meal.fat, 'g fat', privacyMode)}</small>
              </div>
              <button type="button" onClick={async () => { if (await confirmDeleteApp(meal.name)) await fsDeleteLakasMeal(user.uid, meal) }}>Delete</button>
            </div>
          ))}
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Progress</div>
              <h3>Body logs</h3>
            </div>
          </div>
          {!bodyLogs.length ? <div className={lStyles.empty}>No body logs yet.</div> : bodyLogs.slice(0, 6).map(log => (
            <div key={log._id} className={lStyles.rowCard}>
              <div>
                <strong>{formatDisplayDate(log.date)}</strong>
                <span>{log.weight ? displayMetric(log.weight, 'kg', privacyMode) : 'No weight'} · {log.waist ? displayMetric(log.waist, 'cm waist', privacyMode) : 'No waist'}</span>
                {log.notes && <small>{log.notes}</small>}
              </div>
              <button type="button" onClick={async () => { if (await confirmDeleteApp('this body log')) await fsDel(user.uid, 'lakasBodyLogs', log._id) }}>Delete</button>
            </div>
          ))}
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Goal board</div>
              <h3>Tracked goals</h3>
            </div>
          </div>
          {!goals.length ? <div className={lStyles.empty}>No Lakas goals yet.</div> : goals.map(goal => {
            const target = numberOrZero(goal.target)
            const current = numberOrZero(goal.current)
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
            return (
              <div key={goal._id} className={lStyles.goalCard}>
                <div className={lStyles.goalTop}>
                  <div>
                    <strong>{goal.name}</strong>
                    <span>{goal.type} · {displayMetric(current, goal.unit, privacyMode)} of {displayMetric(target, goal.unit, privacyMode)}</span>
                  </div>
                  <button type="button" onClick={async () => { if (await confirmDeleteApp(goal.name)) await fsDel(user.uid, 'lakasGoals', goal._id) }}>Delete</button>
                </div>
                <div className={lStyles.track}><div style={{ width: `${pct}%` }} /></div>
                <div className={lStyles.goalUpdate}>
                  <input type="number" min="0" inputMode="decimal" placeholder={`Add ${goal.unit || 'progress'}`} value={goalProgress[goal._id] || ''} onChange={event => setGoalProgress(currentRows => ({ ...currentRows, [goal._id]: event.target.value }))} />
                  <button type="button" onClick={() => handleGoalProgress(goal)}>Add</button>
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
