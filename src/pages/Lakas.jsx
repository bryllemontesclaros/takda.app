import { useEffect, useMemo, useState } from 'react'
import {
  fsAdd,
  fsDel,
  fsDeleteLakasBodyLog,
  fsDeleteLakasMeal,
  fsSaveLakasBodyLog,
  fsSaveLakasMeal,
  fsUpdate,
} from '../lib/firestore'
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

const BUILT_IN_ROUTINES = [
  {
    name: 'Push Day',
    focus: 'Hypertrophy',
    duration: 60,
    notes: 'Chest, shoulders, triceps. Add weight only when reps stay clean.',
    exercises: [
      { name: 'Bench press', sets: 4, reps: 8, weight: 0, duration: 0, rest: 120, notes: '' },
      { name: 'Shoulder press', sets: 3, reps: 10, weight: 0, duration: 0, rest: 90, notes: '' },
      { name: 'Incline dumbbell press', sets: 3, reps: 10, weight: 0, duration: 0, rest: 90, notes: '' },
      { name: 'Triceps pushdown', sets: 3, reps: 12, weight: 0, duration: 0, rest: 60, notes: '' },
    ],
  },
  {
    name: 'Pull Day',
    focus: 'Strength',
    duration: 60,
    notes: 'Back and biceps. Keep shoulder blades controlled.',
    exercises: [
      { name: 'Lat pulldown', sets: 4, reps: 10, weight: 0, duration: 0, rest: 90, notes: '' },
      { name: 'Barbell row', sets: 4, reps: 8, weight: 0, duration: 0, rest: 120, notes: '' },
      { name: 'Face pull', sets: 3, reps: 15, weight: 0, duration: 0, rest: 60, notes: '' },
      { name: 'Dumbbell curl', sets: 3, reps: 12, weight: 0, duration: 0, rest: 60, notes: '' },
    ],
  },
  {
    name: 'Leg Day',
    focus: 'Strength',
    duration: 65,
    notes: 'Lower body day. Warm up knees and hips before heavy sets.',
    exercises: [
      { name: 'Squat', sets: 4, reps: 6, weight: 0, duration: 0, rest: 150, notes: '' },
      { name: 'Romanian deadlift', sets: 3, reps: 8, weight: 0, duration: 0, rest: 120, notes: '' },
      { name: 'Leg press', sets: 3, reps: 12, weight: 0, duration: 0, rest: 90, notes: '' },
      { name: 'Calf raise', sets: 4, reps: 15, weight: 0, duration: 0, rest: 60, notes: '' },
    ],
  },
  {
    name: 'Full Body',
    focus: 'Conditioning',
    duration: 45,
    notes: 'Simple whole-body plan for busy days.',
    exercises: [
      { name: 'Goblet squat', sets: 3, reps: 12, weight: 0, duration: 0, rest: 75, notes: '' },
      { name: 'Push-up', sets: 3, reps: 12, weight: 0, duration: 0, rest: 60, notes: '' },
      { name: 'Dumbbell row', sets: 3, reps: 10, weight: 0, duration: 0, rest: 75, notes: '' },
      { name: 'Plank', sets: 3, reps: 0, weight: 0, duration: 45, rest: 45, notes: '' },
    ],
  },
  {
    name: 'Home Workout',
    focus: 'Mobility',
    duration: 30,
    notes: 'No equipment needed.',
    exercises: [
      { name: 'Bodyweight squat', sets: 3, reps: 15, weight: 0, duration: 0, rest: 45, notes: '' },
      { name: 'Push-up', sets: 3, reps: 10, weight: 0, duration: 0, rest: 45, notes: '' },
      { name: 'Glute bridge', sets: 3, reps: 15, weight: 0, duration: 0, rest: 45, notes: '' },
      { name: 'Dead bug', sets: 3, reps: 12, weight: 0, duration: 0, rest: 30, notes: '' },
    ],
  },
  {
    name: 'Cardio Base',
    focus: 'Cardio',
    duration: 35,
    notes: 'Easy pace. Build consistency before speed.',
    exercises: [
      { name: 'Brisk walk', sets: 1, reps: 0, weight: 0, duration: 1800, rest: 0, notes: 'Zone 2 pace' },
      { name: 'Cool down stretch', sets: 1, reps: 0, weight: 0, duration: 300, rest: 0, notes: '' },
    ],
  },
]

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
const GOAL_TYPES = ['Workout', 'Weight', 'Calories', 'Protein', 'Steps', 'Body', 'Habit', 'Custom']
const ROUTINE_FOCUS = ['Strength', 'Hypertrophy', 'Cardio', 'Mobility', 'Conditioning', 'Custom']
const ACTIVITY_TYPES = ['Walk', 'Run', 'Cardio', 'Cycling', 'Sport', 'Active day']
const REMINDER_TYPES = ['Workout', 'Weigh-in', 'Rest day', 'Steps', 'Habit', 'Meal prep']
const REMINDER_FREQUENCIES = ['once', 'daily', 'weekly', 'monthly']

const HABIT_OPTIONS = [
  { key: 'water', label: 'Water' },
  { key: 'protein', label: 'Protein' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'stretching', label: 'Stretching' },
  { key: 'restDay', label: 'Rest day' },
  { key: 'vitamins', label: 'Vitamins' },
]

function createExerciseRow(overrides = {}) {
  return {
    rowId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: '',
    sets: '3',
    reps: '10',
    weight: '',
    duration: '',
    rest: '90',
    notes: '',
    ...overrides,
  }
}

function createWorkoutForm() {
  return {
    routineId: '',
    date: today(),
    title: '',
    duration: '',
    exercises: [createExerciseRow()],
    notes: '',
  }
}

function createRoutineForm() {
  return {
    name: '',
    focus: 'Strength',
    duration: '',
    exercises: [createExerciseRow()],
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
    height: '',
    waist: '',
    chest: '',
    hips: '',
    arm: '',
    thigh: '',
    notes: '',
  }
}

function createActivityForm() {
  return {
    date: today(),
    type: 'Walk',
    steps: '',
    walkingMinutes: '',
    cardioMinutes: '',
    activeMinutes: '',
    distance: '',
    notes: '',
  }
}

function createHabitForm() {
  return {
    date: today(),
    water: false,
    protein: false,
    sleep: false,
    stretching: false,
    restDay: false,
    vitamins: false,
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

function createReminderForm() {
  return {
    title: '',
    type: 'Workout',
    date: today(),
    time: '08:00',
    frequency: 'weekly',
    notes: '',
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

function sortOldest(rows = []) {
  return [...rows].sort((a, b) => {
    const dateCompare = String(a.date || '').localeCompare(String(b.date || ''))
    if (dateCompare) return dateCompare
    return Number(a.createdAt || 0) - Number(b.createdAt || 0)
  })
}

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatNumber(value, maximumFractionDigits = 0) {
  return numberOrZero(value).toLocaleString('en-PH', { maximumFractionDigits })
}

function hydrateExerciseRows(rows = []) {
  if (!Array.isArray(rows) || !rows.length) return [createExerciseRow()]
  return rows.map(row => createExerciseRow({
    name: row.name || '',
    sets: row.sets || row.sets === 0 ? String(row.sets) : '',
    reps: row.reps || row.reps === 0 ? String(row.reps) : '',
    weight: row.weight || row.weight === 0 ? String(row.weight) : '',
    duration: row.duration || row.duration === 0 ? String(row.duration) : '',
    rest: row.rest || row.rest === 0 ? String(row.rest) : '',
    notes: row.notes || '',
  }))
}

function sanitizeExerciseRows(rows = []) {
  return normalizeRows(rows)
    .map(row => ({
      name: String(row.name || '').trim(),
      sets: numberOrZero(row.sets),
      reps: numberOrZero(row.reps),
      weight: numberOrZero(row.weight),
      duration: numberOrZero(row.duration),
      rest: numberOrZero(row.rest),
      notes: String(row.notes || '').trim(),
    }))
    .filter(row => row.name)
}

function getExerciseTotals(exercises = []) {
  return exercises.reduce((summary, row) => {
    const sets = numberOrZero(row.sets)
    const reps = numberOrZero(row.reps)
    const weight = numberOrZero(row.weight)
    return {
      exerciseCount: summary.exerciseCount + 1,
      setCount: summary.setCount + sets,
      volume: summary.volume + (sets * reps * weight),
    }
  }, { exerciseCount: 0, setCount: 0, volume: 0 })
}

function formatExerciseLine(row = {}, hidden = false) {
  const sets = numberOrZero(row.sets)
  const reps = numberOrZero(row.reps)
  const duration = numberOrZero(row.duration)
  const rest = numberOrZero(row.rest)
  const weight = numberOrZero(row.weight)
  const effort = duration
    ? `${formatNumber(duration)}s`
    : reps
      ? `${sets || 1}x${formatNumber(reps)}`
      : `${sets || 1} sets`
  const load = weight && !hidden ? ` @ ${formatNumber(weight, 1)}kg` : ''
  const restText = rest ? `, ${formatNumber(rest)}s rest` : ''
  return `${row.name || 'Exercise'} ${effort}${load}${restText}`
}

function displayMetric(value, unit = '', hidden = false, decimals = 1) {
  if (hidden) return unit ? `... ${unit}` : '...'
  const numeric = Number(value) || 0
  return `${numeric.toLocaleString('en-PH', { maximumFractionDigits: decimals })}${unit ? ` ${unit}` : ''}`
}

function calculateBmi(weight, height) {
  const kg = numberOrZero(weight)
  const cm = numberOrZero(height)
  if (!kg || !cm) return 0
  const meters = cm / 100
  return kg / (meters * meters)
}

function getBmiLabel(bmi) {
  if (!bmi) return 'Add height'
  if (bmi < 18.5) return 'Under range'
  if (bmi < 25) return 'Healthy range'
  if (bmi < 30) return 'Above range'
  return 'High range'
}

function getLastDateKeys(days = 7) {
  return Array.from({ length: days }, (_, index) => dateDaysAgo(days - 1 - index))
}

function addMonths(monthKey, delta) {
  const [year, month] = String(monthKey || today().slice(0, 7)).split('-').map(Number)
  const base = new Date(year || new Date().getFullYear(), (month || 1) - 1 + delta, 1)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`
}

function getMonthDays(monthKey) {
  const [year, month] = String(monthKey || today().slice(0, 7)).split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  const leading = start.getDay()
  const days = []

  for (let index = 0; index < leading; index += 1) {
    days.push({ key: `empty-${index}`, empty: true })
  }

  for (let day = 1; day <= end.getDate(); day += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    days.push({ key, day, empty: false })
  }

  return days
}

function createDateMap(rows = []) {
  return normalizeRows(rows).reduce((map, row) => {
    const key = row.date
    if (!key) return map
    if (!map[key]) map[key] = []
    map[key].push(row)
    return map
  }, {})
}

function calculateWorkoutStreak(workouts = []) {
  const dates = new Set(workouts.map(row => row.date).filter(Boolean))
  let current = today()
  let streak = 0
  while (dates.has(current)) {
    streak += 1
    current = dateDaysAgo(streak)
  }
  return streak
}

function getPersonalRecords(workouts = [], activities = []) {
  const records = {
    bestLift: null,
    mostReps: null,
    highestVolume: null,
    longestWorkout: null,
    longestCardio: null,
    workoutStreak: calculateWorkoutStreak(workouts),
  }

  workouts.forEach(workout => {
    const workoutVolume = numberOrZero(workout.volume) || getExerciseTotals(workout.exercises).volume
    if (workoutVolume && (!records.highestVolume || workoutVolume > records.highestVolume.value)) {
      records.highestVolume = { label: workout.title || 'Workout', value: workoutVolume, unit: 'kg volume' }
    }

    const duration = numberOrZero(workout.duration)
    if (duration && (!records.longestWorkout || duration > records.longestWorkout.value)) {
      records.longestWorkout = { label: workout.title || 'Workout', value: duration, unit: 'min' }
    }

    normalizeRows(workout.exercises).forEach(exercise => {
      const weight = numberOrZero(exercise.weight)
      const reps = numberOrZero(exercise.reps)
      if (weight && (!records.bestLift || weight > records.bestLift.value)) {
        records.bestLift = { label: exercise.name || 'Exercise', value: weight, unit: 'kg' }
      }
      if (reps && (!records.mostReps || reps > records.mostReps.value)) {
        records.mostReps = { label: exercise.name || 'Exercise', value: reps, unit: 'reps' }
      }
    })
  })

  activities.forEach(activity => {
    const duration = numberOrZero(activity.cardioMinutes) + numberOrZero(activity.walkingMinutes) + numberOrZero(activity.activeMinutes)
    if (duration && (!records.longestCardio || duration > records.longestCardio.value)) {
      records.longestCardio = { label: activity.type || 'Activity', value: duration, unit: 'min' }
    }
  })

  return records
}

function getHabitScore(row = {}) {
  return HABIT_OPTIONS.reduce((score, option) => score + (row[option.key] ? 1 : 0), 0)
}

function MiniBarChart({ title, rows, unit = '', hidden = false }) {
  const maxValue = Math.max(1, ...rows.map(row => numberOrZero(row.value)))
  return (
    <div className={lStyles.chartCard}>
      <div className={lStyles.chartTitle}>{title}</div>
      <div className={lStyles.barChart}>
        {rows.map(row => (
          <div key={row.key} className={lStyles.barSlot}>
            <div className={lStyles.barTrack}>
              <div className={lStyles.barFill} style={{ height: `${Math.max(5, (numberOrZero(row.value) / maxValue) * 100)}%` }} />
            </div>
            <span>{row.label}</span>
          </div>
        ))}
      </div>
      <div className={lStyles.chartMeta}>
        {hidden ? 'Private' : `${formatNumber(rows.reduce((sum, row) => sum + numberOrZero(row.value), 0), 1)} ${unit}`.trim()}
      </div>
    </div>
  )
}

export default function Lakas({ user, data = {}, privacyMode = false }) {
  const [routineForm, setRoutineForm] = useState(createRoutineForm)
  const [workoutForm, setWorkoutForm] = useState(createWorkoutForm)
  const [mealForm, setMealForm] = useState(createMealForm)
  const [mealPhoto, setMealPhoto] = useState(null)
  const [bodyPhoto, setBodyPhoto] = useState(null)
  const [bodyPhotoPreview, setBodyPhotoPreview] = useState('')
  const [bodyForm, setBodyForm] = useState(createBodyForm)
  const [activityForm, setActivityForm] = useState(createActivityForm)
  const [habitForm, setHabitForm] = useState(createHabitForm)
  const [goalForm, setGoalForm] = useState(createGoalForm)
  const [reminderForm, setReminderForm] = useState(createReminderForm)
  const [goalProgress, setGoalProgress] = useState({})
  const [savingMeal, setSavingMeal] = useState(false)
  const [savingBody, setSavingBody] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(today().slice(0, 7))

  const routines = sortNewest(normalizeRows(data.lakasRoutines))
  const workouts = sortNewest(normalizeRows(data.lakasWorkouts))
  const meals = sortNewest(normalizeRows(data.lakasMeals))
  const bodyLogs = sortNewest(normalizeRows(data.lakasBodyLogs))
  const activities = sortNewest(normalizeRows(data.lakasActivities))
  const habits = sortNewest(normalizeRows(data.lakasHabits))
  const reminders = sortNewest(normalizeRows(data.lakasReminders))
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

  useEffect(() => {
    if (!bodyPhoto) {
      setBodyPhotoPreview('')
      return undefined
    }

    const nextPreview = URL.createObjectURL(bodyPhoto)
    setBodyPhotoPreview(nextPreview)
    return () => URL.revokeObjectURL(nextPreview)
  }, [bodyPhoto])

  const insights = useMemo(() => {
    const weekStart = dateDaysAgo(6)
    const lastSevenDays = getLastDateKeys(7)
    const workoutsThisWeek = workouts.filter(row => row.date >= weekStart).length
    const todaysMeals = meals.filter(row => row.date === today())
    const caloriesToday = todaysMeals.reduce((sum, row) => sum + numberOrZero(row.calories), 0)
    const proteinToday = todaysMeals.reduce((sum, row) => sum + numberOrZero(row.protein), 0)
    const latestBody = bodyLogs.find(row => numberOrZero(row.weight) > 0 || numberOrZero(row.waist) > 0) || {}
    const latestWeight = latestBody.weight || 0
    const latestBmi = calculateBmi(latestBody.weight, latestBody.height)
    const activeGoals = goals.filter(goal => numberOrZero(goal.current) < numberOrZero(goal.target)).length
    const todayActivity = activities.find(row => row.date === today()) || {}
    const todayHabit = habits.find(row => row.date === today()) || {}
    const activeDays = new Set([
      ...workouts.filter(row => row.date >= weekStart).map(row => row.date),
      ...activities.filter(row => row.date >= weekStart && (
        numberOrZero(row.steps) || numberOrZero(row.cardioMinutes) || numberOrZero(row.walkingMinutes) || numberOrZero(row.activeMinutes)
      )).map(row => row.date),
    ]).size
    const volumeByDay = lastSevenDays.map(day => ({
      key: day,
      label: day.slice(8),
      value: workouts.filter(row => row.date === day).reduce((sum, row) => sum + (numberOrZero(row.volume) || getExerciseTotals(row.exercises).volume), 0),
    }))
    const stepsByDay = lastSevenDays.map(day => ({
      key: day,
      label: day.slice(8),
      value: activities.filter(row => row.date === day).reduce((sum, row) => sum + numberOrZero(row.steps), 0),
    }))
    const workoutFrequency = lastSevenDays.map(day => ({
      key: day,
      label: day.slice(8),
      value: workouts.filter(row => row.date === day).length,
    }))
    const weightTrend = sortOldest(bodyLogs.filter(row => numberOrZero(row.weight) > 0)).slice(-7).map(row => ({
      key: row._id || row.date,
      label: row.date?.slice(5) || '',
      value: numberOrZero(row.weight),
    }))
    const records = getPersonalRecords(workouts, activities)

    return {
      workoutsThisWeek,
      caloriesToday,
      proteinToday,
      latestWeight,
      latestBmi,
      activeGoals,
      routineCount: routines.length,
      stepsToday: numberOrZero(todayActivity.steps),
      activeMinutesToday: numberOrZero(todayActivity.activeMinutes) + numberOrZero(todayActivity.cardioMinutes) + numberOrZero(todayActivity.walkingMinutes),
      habitScoreToday: getHabitScore(todayHabit),
      activeDays,
      volumeByDay,
      stepsByDay,
      workoutFrequency,
      weightTrend,
      records,
    }
  }, [activities, bodyLogs, goals, habits, meals, routines.length, workouts])

  const calendarData = useMemo(() => {
    const workoutMap = createDateMap(workouts)
    const activityMap = createDateMap(activities)
    const bodyMap = createDateMap(bodyLogs)
    const habitMap = createDateMap(habits)
    const days = getMonthDays(calendarMonth)
    return days.map(day => {
      if (day.empty) return day
      return {
        ...day,
        workouts: workoutMap[day.key] || [],
        activities: activityMap[day.key] || [],
        bodies: bodyMap[day.key] || [],
        habits: habitMap[day.key] || [],
      }
    })
  }, [activities, bodyLogs, calendarMonth, habits, workouts])

  function updateExerciseRow(formSetter, rowId, field, value) {
    formSetter(current => ({
      ...current,
      exercises: current.exercises.map(row => (
        row.rowId === rowId ? { ...row, [field]: value } : row
      )),
    }))
  }

  function addExerciseRow(formSetter) {
    formSetter(current => ({
      ...current,
      exercises: [...current.exercises, createExerciseRow()],
    }))
  }

  function removeExerciseRow(formSetter, rowId) {
    formSetter(current => ({
      ...current,
      exercises: current.exercises.length <= 1
        ? current.exercises
        : current.exercises.filter(row => row.rowId !== rowId),
    }))
  }

  function loadRoutine(routine) {
    if (!routine) return
    setWorkoutForm(current => ({
      ...current,
      routineId: routine._id || '',
      title: routine.name || current.title,
      duration: routine.duration || routine.duration === 0 ? String(routine.duration) : current.duration,
      exercises: hydrateExerciseRows(routine.exercises),
      notes: routine.notes || current.notes,
    }))
    notifyApp({ title: 'Routine loaded', message: `${routine.name || 'Routine'} is ready to log.`, tone: 'success' })
  }

  function applyRoutineTemplate(template) {
    setRoutineForm({
      name: template.name,
      focus: template.focus,
      duration: String(template.duration || ''),
      exercises: hydrateExerciseRows(template.exercises),
      notes: template.notes || '',
    })
    notifyApp({ title: 'Template loaded', message: `${template.name} is ready to save or edit.`, tone: 'success' })
  }

  function handleRoutineSelect(routineId) {
    if (!routineId) {
      setWorkoutForm(current => ({ ...current, routineId: '' }))
      return
    }

    loadRoutine(routines.find(routine => routine._id === routineId))
  }

  function renderExerciseEditor(rows, formSetter, ariaLabel) {
    return (
      <div className={lStyles.exerciseBuilder} aria-label={ariaLabel}>
        {rows.map((row, index) => (
          <div key={row.rowId} className={lStyles.exerciseRow}>
            <div className={lStyles.exerciseRowTop}>
              <label className={lStyles.exerciseName}>
                <span>Exercise {index + 1}</span>
                <input
                  value={row.name}
                  placeholder="Bench press, Squat, Treadmill"
                  onChange={event => updateExerciseRow(formSetter, row.rowId, 'name', event.target.value)}
                />
              </label>
              <button
                type="button"
                className={lStyles.ghostBtn}
                onClick={() => removeExerciseRow(formSetter, row.rowId)}
                disabled={rows.length <= 1}
              >
                Remove
              </button>
            </div>
            <div className={lStyles.exerciseMetrics}>
              <label>
                <span>Sets</span>
                <input type="number" min="0" inputMode="numeric" value={row.sets} onChange={event => updateExerciseRow(formSetter, row.rowId, 'sets', event.target.value)} />
              </label>
              <label>
                <span>Reps</span>
                <input type="number" min="0" inputMode="numeric" value={row.reps} onChange={event => updateExerciseRow(formSetter, row.rowId, 'reps', event.target.value)} />
              </label>
              <label>
                <span>Kg</span>
                <input type="number" min="0" inputMode="decimal" value={row.weight} onChange={event => updateExerciseRow(formSetter, row.rowId, 'weight', event.target.value)} />
              </label>
              <label>
                <span>Duration (s)</span>
                <input type="number" min="0" inputMode="numeric" value={row.duration} onChange={event => updateExerciseRow(formSetter, row.rowId, 'duration', event.target.value)} />
              </label>
              <label>
                <span>Rest (s)</span>
                <input type="number" min="0" inputMode="numeric" value={row.rest} onChange={event => updateExerciseRow(formSetter, row.rowId, 'rest', event.target.value)} />
              </label>
            </div>
            <label className={lStyles.exerciseNotes}>
              <span>Exercise notes</span>
              <input value={row.notes} placeholder="Warmup, RPE, form cue" onChange={event => updateExerciseRow(formSetter, row.rowId, 'notes', event.target.value)} />
            </label>
          </div>
        ))}
        <button type="button" className={lStyles.secondaryBtn} onClick={() => addExerciseRow(formSetter)}>
          Add exercise
        </button>
      </div>
    )
  }

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

  async function handleAddRoutine() {
    const exercises = sanitizeExerciseRows(routineForm.exercises)
    if (!routineForm.name.trim() || !exercises.length) {
      notifyApp({ title: 'Routine needs details', message: 'Add a routine name and at least one exercise.', tone: 'warning' })
      return
    }

    const totals = getExerciseTotals(exercises)
    await fsAdd(user.uid, 'lakasRoutines', {
      name: routineForm.name.trim(),
      focus: routineForm.focus,
      duration: numberOrZero(routineForm.duration),
      exercises,
      exerciseCount: totals.exerciseCount,
      setCount: totals.setCount,
      volume: totals.volume,
      notes: routineForm.notes.trim(),
      source: 'lakas',
    })
    setRoutineForm(createRoutineForm())
    notifyApp({ title: 'Routine saved', message: 'You can now load it when logging a workout.', tone: 'success' })
  }

  async function handleAddWorkout() {
    const exercises = sanitizeExerciseRows(workoutForm.exercises)
    if (!workoutForm.title.trim() || !workoutForm.date || !exercises.length) {
      notifyApp({ title: 'Workout needs details', message: 'Add a workout name, date, and at least one exercise.', tone: 'warning' })
      return
    }

    const routine = routines.find(row => row._id === workoutForm.routineId)
    const totals = getExerciseTotals(exercises)

    await fsAdd(user.uid, 'lakasWorkouts', {
      title: workoutForm.title.trim(),
      routineId: routine?._id || '',
      routineName: routine?.name || '',
      date: workoutForm.date,
      duration: numberOrZero(workoutForm.duration),
      exercises,
      exerciseCount: totals.exerciseCount,
      setCount: totals.setCount,
      volume: totals.volume,
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
    const hasMetric = Object.entries(bodyForm).some(([key, value]) => key !== 'date' && key !== 'notes' && String(value || '').trim())
    if (!bodyForm.date || (!hasMetric && !bodyPhoto)) {
      notifyApp({ title: 'Body log needs details', message: 'Add a metric or progress photo before saving.', tone: 'warning' })
      return
    }

    setSavingBody(true)
    try {
      await fsSaveLakasBodyLog(user.uid, {
        ...bodyForm,
        weight: numberOrZero(bodyForm.weight),
        height: numberOrZero(bodyForm.height),
        waist: numberOrZero(bodyForm.waist),
        chest: numberOrZero(bodyForm.chest),
        hips: numberOrZero(bodyForm.hips),
        arm: numberOrZero(bodyForm.arm),
        thigh: numberOrZero(bodyForm.thigh),
        bmi: calculateBmi(bodyForm.weight, bodyForm.height),
        notes: bodyForm.notes.trim(),
        photoBlob: bodyPhoto,
        fileName: bodyPhoto?.name || '',
      })
      setBodyForm(createBodyForm())
      setBodyPhoto(null)
      notifyApp({ title: 'Body progress saved', message: 'Your body log was added.', tone: 'success' })
    } catch {
      notifyApp({ title: 'Body log not saved', message: 'Check your connection and Firebase Storage rules, then try again.', tone: 'error' })
    } finally {
      setSavingBody(false)
    }
  }

  async function handleAddActivity() {
    if (!activityForm.date || (!activityForm.steps && !activityForm.walkingMinutes && !activityForm.cardioMinutes && !activityForm.activeMinutes)) {
      notifyApp({ title: 'Activity needs details', message: 'Add steps or activity minutes before saving.', tone: 'warning' })
      return
    }

    await fsAdd(user.uid, 'lakasActivities', {
      date: activityForm.date,
      type: activityForm.type,
      steps: numberOrZero(activityForm.steps),
      walkingMinutes: numberOrZero(activityForm.walkingMinutes),
      cardioMinutes: numberOrZero(activityForm.cardioMinutes),
      activeMinutes: numberOrZero(activityForm.activeMinutes),
      distance: numberOrZero(activityForm.distance),
      notes: activityForm.notes.trim(),
      source: 'lakas',
    })
    setActivityForm(createActivityForm())
    notifyApp({ title: 'Activity saved', message: 'Steps and cardio activity were added.', tone: 'success' })
  }

  async function handleAddHabit() {
    const score = getHabitScore(habitForm)
    if (!habitForm.date || (!score && !habitForm.notes.trim())) {
      notifyApp({ title: 'Check-in needs details', message: 'Tick at least one habit or add a note.', tone: 'warning' })
      return
    }

    await fsAdd(user.uid, 'lakasHabits', {
      ...HABIT_OPTIONS.reduce((payload, option) => ({ ...payload, [option.key]: Boolean(habitForm[option.key]) }), {}),
      date: habitForm.date,
      score,
      notes: habitForm.notes.trim(),
      source: 'lakas',
    })
    setHabitForm(createHabitForm())
    notifyApp({ title: 'Check-in saved', message: 'Habit check-in added for the day.', tone: 'success' })
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

  async function handleAddReminder() {
    if (!reminderForm.title.trim() || !reminderForm.date) {
      notifyApp({ title: 'Reminder needs details', message: 'Add a reminder title and date.', tone: 'warning' })
      return
    }

    await fsAdd(user.uid, 'lakasReminders', {
      title: reminderForm.title.trim(),
      type: reminderForm.type,
      date: reminderForm.date,
      time: reminderForm.time,
      frequency: reminderForm.frequency,
      notes: reminderForm.notes.trim(),
      enabled: true,
      source: 'lakas',
    })
    setReminderForm(createReminderForm())
    notifyApp({ title: 'Reminder saved', message: 'Lakas reminder was added.', tone: 'success' })
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

  const latestBmiLabel = getBmiLabel(insights.latestBmi)
  const upcomingReminders = reminders.filter(row => row.enabled !== false).slice(0, 5)

  return (
    <div className={`${styles.page} ${lStyles.page}`}>
      <div className={lStyles.hero}>
        <div>
          <div className={lStyles.eyebrow}>Lakas</div>
          <div className={lStyles.title}>Train, eat, recover, and see progress over time.</div>
          <div className={lStyles.sub}>
            A focused fitness space for structured workouts, routines, body progress, activity, habits, goals, records, charts, calendar, and reminders.
          </div>
        </div>
        <div className={lStyles.heroCard}>
          <div className={lStyles.heroCardLabel}>This week</div>
          <div className={lStyles.heroCardValue}>{displayMetric(insights.workoutsThisWeek, 'workouts', privacyMode)}</div>
          <div className={lStyles.heroCardMeta}>
            {insights.routineCount ? `${insights.routineCount} routines ready` : 'Build a routine to start'} · {insights.activeDays} active days
          </div>
        </div>
      </div>

      <div className={lStyles.statsGrid}>
        <div className={lStyles.statCard}>
          <span>Workouts</span>
          <strong>{displayMetric(insights.workoutsThisWeek, '', privacyMode)}</strong>
          <small>Last 7 days</small>
        </div>
        <div className={lStyles.statCard}>
          <span>Steps</span>
          <strong>{displayMetric(insights.stepsToday, '', privacyMode, 0)}</strong>
          <small>Today</small>
        </div>
        <div className={lStyles.statCard}>
          <span>Protein</span>
          <strong>{displayMetric(insights.proteinToday, 'g', privacyMode)}</strong>
          <small>Logged today</small>
        </div>
        <div className={lStyles.statCard}>
          <span>Body</span>
          <strong>{insights.latestWeight ? displayMetric(insights.latestWeight, 'kg', privacyMode) : 'No log'}</strong>
          <small>{privacyMode ? 'Private' : insights.latestBmi ? `BMI ${formatNumber(insights.latestBmi, 1)} · ${latestBmiLabel}` : latestBmiLabel}</small>
        </div>
      </div>

      <div className={lStyles.insightGrid}>
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Records</div>
              <h3>Personal records</h3>
            </div>
          </div>
          <div className={lStyles.recordGrid}>
            {[
              ['Best lift', insights.records.bestLift],
              ['Most reps', insights.records.mostReps],
              ['Best volume', insights.records.highestVolume],
              ['Longest workout', insights.records.longestWorkout],
              ['Longest cardio', insights.records.longestCardio],
              ['Workout streak', { label: 'Current', value: insights.records.workoutStreak, unit: 'days' }],
            ].map(([label, record]) => (
              <div key={label} className={lStyles.recordCard}>
                <span>{label}</span>
                <strong>{record ? displayMetric(record.value, record.unit, privacyMode) : 'No record'}</strong>
                <small>{record?.label || 'Log more to unlock'}</small>
              </div>
            ))}
          </div>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Charts</div>
              <h3>Progress charts</h3>
            </div>
          </div>
          <div className={lStyles.chartGrid}>
            <MiniBarChart title="Workout frequency" rows={insights.workoutFrequency} unit="workouts" hidden={privacyMode} />
            <MiniBarChart title="Volume lifted" rows={insights.volumeByDay} unit="kg" hidden={privacyMode} />
            <MiniBarChart title="Steps" rows={insights.stepsByDay} unit="steps" hidden={privacyMode} />
            <MiniBarChart title="Weight trend" rows={insights.weightTrend.length ? insights.weightTrend : [{ key: 'empty', label: '--', value: 0 }]} unit="kg" hidden={privacyMode} />
          </div>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Calendar</div>
              <h3>Training calendar</h3>
            </div>
            <div className={lStyles.monthControls}>
              <button type="button" onClick={() => setCalendarMonth(current => addMonths(current, -1))}>Prev</button>
              <strong>{calendarMonth}</strong>
              <button type="button" onClick={() => setCalendarMonth(current => addMonths(current, 1))}>Next</button>
            </div>
          </div>
          <div className={lStyles.calendarGrid}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <div key={`${label}-${index}`} className={lStyles.calendarHead}>{label}</div>)}
            {calendarData.map(day => (
              <div key={day.key} className={`${lStyles.calendarDay} ${day.empty ? lStyles.calendarEmpty : ''} ${day.key === today() ? lStyles.calendarToday : ''}`}>
                {!day.empty && (
                  <>
                    <strong>{day.day}</strong>
                    <div className={lStyles.calendarDots}>
                      {!!day.workouts.length && <span title="Workout" className={lStyles.dotWorkout} />}
                      {!!day.activities.length && <span title="Activity" className={lStyles.dotActivity} />}
                      {!!day.bodies.length && <span title="Body log" className={lStyles.dotBody} />}
                      {!!day.habits.length && <span title="Habit" className={lStyles.dotHabit} />}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className={lStyles.legendRow}>
            <span><i className={lStyles.dotWorkout} /> Workout</span>
            <span><i className={lStyles.dotActivity} /> Activity</span>
            <span><i className={lStyles.dotBody} /> Body</span>
            <span><i className={lStyles.dotHabit} /> Habit</span>
          </div>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Reminders</div>
              <h3>Workout reminders</h3>
            </div>
          </div>
          <div className={lStyles.formGrid}>
            <label>
              <span>Reminder</span>
              <input value={reminderForm.title} placeholder="Leg day, weigh-in, walk" onChange={event => setReminderForm(current => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              <span>Type</span>
              <select value={reminderForm.type} onChange={event => setReminderForm(current => ({ ...current, type: event.target.value }))}>
                {REMINDER_TYPES.map(type => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span>Date</span>
              <input type="date" value={reminderForm.date} onChange={event => setReminderForm(current => ({ ...current, date: event.target.value }))} />
            </label>
            <label>
              <span>Time</span>
              <input type="time" value={reminderForm.time} onChange={event => setReminderForm(current => ({ ...current, time: event.target.value }))} />
            </label>
            <label>
              <span>Repeat</span>
              <select value={reminderForm.frequency} onChange={event => setReminderForm(current => ({ ...current, frequency: event.target.value }))}>
                {REMINDER_FREQUENCIES.map(freq => <option key={freq}>{freq}</option>)}
              </select>
            </label>
            <label>
              <span>Notes</span>
              <input value={reminderForm.notes} placeholder="Optional cue" onChange={event => setReminderForm(current => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <button type="button" className={lStyles.primaryBtn} onClick={handleAddReminder}>Save reminder</button>
          <div className={lStyles.routineList}>
            {!upcomingReminders.length ? <div className={lStyles.empty}>No reminders yet.</div> : upcomingReminders.map(reminder => (
              <div key={reminder._id} className={lStyles.routineCard}>
                <div>
                  <strong>{reminder.title}</strong>
                  <span>{reminder.type} · {formatDisplayDate(reminder.date)} {reminder.time || ''} · {reminder.frequency}</span>
                  {reminder.notes && <small>{reminder.notes}</small>}
                </div>
                <div className={lStyles.routineActions}>
                  <button type="button" onClick={() => fsUpdate(user.uid, 'lakasReminders', reminder._id, { enabled: reminder.enabled === false })}>
                    {reminder.enabled === false ? 'Enable' : 'Pause'}
                  </button>
                  <button type="button" onClick={async () => { if (await confirmDeleteApp(reminder.title)) await fsDel(user.uid, 'lakasReminders', reminder._id) }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className={lStyles.grid}>
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Routines</div>
              <h3>Build a reusable routine</h3>
            </div>
          </div>
          <div className={lStyles.templateRow}>
            {BUILT_IN_ROUTINES.map(template => (
              <button key={template.name} type="button" className={lStyles.chip} onClick={() => applyRoutineTemplate(template)}>
                {template.name}
              </button>
            ))}
          </div>
          <div className={lStyles.formGrid}>
            <label>
              <span>Routine name</span>
              <input value={routineForm.name} placeholder="Push day, Legs, 5K prep" onChange={event => setRoutineForm(current => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>Focus</span>
              <select value={routineForm.focus} onChange={event => setRoutineForm(current => ({ ...current, focus: event.target.value }))}>
                {ROUTINE_FOCUS.map(focus => <option key={focus}>{focus}</option>)}
              </select>
            </label>
            <label>
              <span>Target duration (min)</span>
              <input type="number" min="0" inputMode="decimal" value={routineForm.duration} placeholder="60" onChange={event => setRoutineForm(current => ({ ...current, duration: event.target.value }))} />
            </label>
            <label>
              <span>Notes</span>
              <input value={routineForm.notes} placeholder="Progression, warmup, target RPE" onChange={event => setRoutineForm(current => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          {renderExerciseEditor(routineForm.exercises, setRoutineForm, 'Routine exercises')}
          <button type="button" className={lStyles.primaryBtn} onClick={handleAddRoutine}>Save routine</button>
          <div className={lStyles.routineList}>
            {!routines.length ? (
              <div className={lStyles.empty}>No routines yet. Save your first template here.</div>
            ) : routines.slice(0, 4).map(routine => (
              <div key={routine._id} className={lStyles.routineCard}>
                <div>
                  <strong>{routine.name}</strong>
                  <span>{routine.focus || 'Routine'} · {routine.exerciseCount || 0} exercises · {routine.setCount || 0} sets</span>
                  {Array.isArray(routine.exercises) && routine.exercises.length > 0 && (
                    <small>{routine.exercises.slice(0, 3).map(row => formatExerciseLine(row, privacyMode)).join(' | ')}</small>
                  )}
                </div>
                <div className={lStyles.routineActions}>
                  <button type="button" onClick={() => loadRoutine(routine)}>Use</button>
                  <button type="button" onClick={async () => { if (await confirmDeleteApp(routine.name)) await fsDel(user.uid, 'lakasRoutines', routine._id) }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Workout log</div>
              <h3>Log a workout</h3>
            </div>
          </div>
          <div className={lStyles.formGrid}>
            <label className={lStyles.full}>
              <span>Use routine</span>
              <select value={workoutForm.routineId} onChange={event => handleRoutineSelect(event.target.value)}>
                <option value="">No routine selected</option>
                {routines.map(routine => <option key={routine._id} value={routine._id}>{routine.name}</option>)}
              </select>
            </label>
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
              <span>Notes</span>
              <input value={workoutForm.notes} placeholder="Energy, soreness, form notes" onChange={event => setWorkoutForm(current => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          {renderExerciseEditor(workoutForm.exercises, setWorkoutForm, 'Workout exercises')}
          <button type="button" className={lStyles.primaryBtn} onClick={handleAddWorkout}>Save workout</button>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Steps & activity</div>
              <h3>Log movement</h3>
            </div>
          </div>
          <div className={lStyles.formGrid}>
            <label>
              <span>Date</span>
              <input type="date" value={activityForm.date} onChange={event => setActivityForm(current => ({ ...current, date: event.target.value }))} />
            </label>
            <label>
              <span>Type</span>
              <select value={activityForm.type} onChange={event => setActivityForm(current => ({ ...current, type: event.target.value }))}>
                {ACTIVITY_TYPES.map(type => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span>Steps</span>
              <input type="number" min="0" inputMode="numeric" value={activityForm.steps} placeholder="8000" onChange={event => setActivityForm(current => ({ ...current, steps: event.target.value }))} />
            </label>
            <label>
              <span>Walk min</span>
              <input type="number" min="0" inputMode="numeric" value={activityForm.walkingMinutes} placeholder="30" onChange={event => setActivityForm(current => ({ ...current, walkingMinutes: event.target.value }))} />
            </label>
            <label>
              <span>Cardio min</span>
              <input type="number" min="0" inputMode="numeric" value={activityForm.cardioMinutes} placeholder="20" onChange={event => setActivityForm(current => ({ ...current, cardioMinutes: event.target.value }))} />
            </label>
            <label>
              <span>Active min</span>
              <input type="number" min="0" inputMode="numeric" value={activityForm.activeMinutes} placeholder="45" onChange={event => setActivityForm(current => ({ ...current, activeMinutes: event.target.value }))} />
            </label>
            <label>
              <span>Distance km</span>
              <input type="number" min="0" inputMode="decimal" value={activityForm.distance} placeholder="3.5" onChange={event => setActivityForm(current => ({ ...current, distance: event.target.value }))} />
            </label>
            <label>
              <span>Notes</span>
              <input value={activityForm.notes} placeholder="Easy pace, errands, commute" onChange={event => setActivityForm(current => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <button type="button" className={lStyles.primaryBtn} onClick={handleAddActivity}>Save activity</button>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Habit check-ins</div>
              <h3>Daily recovery</h3>
            </div>
          </div>
          <div className={lStyles.formGrid}>
            <label className={lStyles.full}>
              <span>Date</span>
              <input type="date" value={habitForm.date} onChange={event => setHabitForm(current => ({ ...current, date: event.target.value }))} />
            </label>
          </div>
          <div className={lStyles.habitGrid}>
            {HABIT_OPTIONS.map(option => (
              <label key={option.key} className={`${lStyles.habitPill} ${habitForm[option.key] ? lStyles.habitPillActive : ''}`}>
                <input type="checkbox" checked={habitForm[option.key]} onChange={event => setHabitForm(current => ({ ...current, [option.key]: event.target.checked }))} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <div className={lStyles.formGrid}>
            <label className={lStyles.full}>
              <span>Notes</span>
              <input value={habitForm.notes} placeholder="Sleep quality, soreness, mood, recovery" onChange={event => setHabitForm(current => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <button type="button" className={lStyles.primaryBtn} onClick={handleAddHabit}>Save check-in</button>
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
          <div className={lStyles.progressPhotoBox}>
            {bodyPhotoPreview ? (
              <img src={bodyPhotoPreview} alt="Selected progress preview" />
            ) : (
              <div>
                <strong>Add progress photo</strong>
                <span>Optional. Saved privately with this body log.</span>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={event => setBodyPhoto(event.target.files?.[0] || null)} aria-label="Progress photo" />
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
              <span>Height (cm)</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.height} placeholder="170" onChange={event => setBodyForm(current => ({ ...current, height: event.target.value }))} />
            </label>
            <label>
              <span>Waist (cm)</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.waist} placeholder="82" onChange={event => setBodyForm(current => ({ ...current, waist: event.target.value }))} />
            </label>
            <label>
              <span>Chest (cm)</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.chest} placeholder="96" onChange={event => setBodyForm(current => ({ ...current, chest: event.target.value }))} />
            </label>
            <label>
              <span>Hips (cm)</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.hips} placeholder="94" onChange={event => setBodyForm(current => ({ ...current, hips: event.target.value }))} />
            </label>
            <label>
              <span>Arm (cm)</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.arm} placeholder="32" onChange={event => setBodyForm(current => ({ ...current, arm: event.target.value }))} />
            </label>
            <label>
              <span>Thigh (cm)</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.thigh} placeholder="54" onChange={event => setBodyForm(current => ({ ...current, thigh: event.target.value }))} />
            </label>
            <label className={lStyles.full}>
              <span>Notes</span>
              <input value={bodyForm.notes} placeholder="Morning weigh-in, photo angle, energy" onChange={event => setBodyForm(current => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <button type="button" className={lStyles.primaryBtn} onClick={handleAddBodyLog} disabled={savingBody}>
            {savingBody ? 'Saving body log...' : 'Save body log'}
          </button>
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
              <input value={goalForm.name} placeholder="Lose 5kg, walk 8k daily" onChange={event => setGoalForm(current => ({ ...current, name: event.target.value }))} />
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
              <input value={goalForm.unit} placeholder="kg, steps, sessions, days" onChange={event => setGoalForm(current => ({ ...current, unit: event.target.value }))} />
            </label>
          </div>
          <button type="button" className={lStyles.primaryBtn} onClick={handleAddGoal}>Save goal</button>
        </section>
      </div>

      <div className={lStyles.grid}>
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
                <span>{formatDisplayDate(workout.date)} · {workout.duration ? `${workout.duration} min` : 'No duration'} · {workout.exerciseCount || 0} exercises · {workout.setCount || 0} sets · {formatNumber(workout.volume || getExerciseTotals(workout.exercises).volume)} kg volume</span>
                {Array.isArray(workout.exercises) && workout.exercises.length > 0 && (
                  <small>{workout.exercises.slice(0, 3).map(row => formatExerciseLine(row, privacyMode)).join(' | ')}</small>
                )}
                {typeof workout.exercises === 'string' && workout.exercises && (
                  <small>{workout.exercises.split('\n').slice(0, 2).join(' | ')}</small>
                )}
              </div>
              <button type="button" onClick={async () => { if (await confirmDeleteApp(workout.title)) await fsDel(user.uid, 'lakasWorkouts', workout._id) }}>Delete</button>
            </div>
          ))}
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Activity</div>
              <h3>Recent movement</h3>
            </div>
          </div>
          {!activities.length ? <div className={lStyles.empty}>No activity logs yet.</div> : activities.slice(0, 6).map(activity => (
            <div key={activity._id} className={lStyles.rowCard}>
              <div>
                <strong>{activity.type}</strong>
                <span>{formatDisplayDate(activity.date)} · {displayMetric(activity.steps, 'steps', privacyMode, 0)} · {displayMetric(numberOrZero(activity.cardioMinutes) + numberOrZero(activity.walkingMinutes) + numberOrZero(activity.activeMinutes), 'active min', privacyMode, 0)}</span>
                {activity.notes && <small>{activity.notes}</small>}
              </div>
              <button type="button" onClick={async () => { if (await confirmDeleteApp('this activity')) await fsDel(user.uid, 'lakasActivities', activity._id) }}>Delete</button>
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
            <div key={log._id} className={lStyles.mealRow}>
              {log.photoUrl && !privacyMode ? <img src={log.photoUrl} alt="" /> : <div className={lStyles.photoPlaceholder}>{log.photoUrl ? 'Hidden' : 'Body'}</div>}
              <div>
                <strong>{formatDisplayDate(log.date)}</strong>
                <span>{log.weight ? displayMetric(log.weight, 'kg', privacyMode) : 'No weight'} · {log.waist ? displayMetric(log.waist, 'cm waist', privacyMode) : 'No waist'} · {privacyMode && log.bmi ? 'BMI ...' : log.bmi ? `BMI ${formatNumber(log.bmi, 1)}` : 'No BMI'}</span>
                <small>{privacyMode ? 'Private measurements' : ['chest', 'hips', 'arm', 'thigh'].map(key => log[key] ? `${key} ${formatNumber(log[key], 1)}cm` : '').filter(Boolean).join(' · ') || log.notes || 'No measurements'}</small>
              </div>
              <button type="button" onClick={async () => { if (await confirmDeleteApp('this body log')) await fsDeleteLakasBodyLog(user.uid, log) }}>Delete</button>
            </div>
          ))}
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Habits</div>
              <h3>Recent check-ins</h3>
            </div>
          </div>
          {!habits.length ? <div className={lStyles.empty}>No habit check-ins yet.</div> : habits.slice(0, 6).map(habit => (
            <div key={habit._id} className={lStyles.rowCard}>
              <div>
                <strong>{formatDisplayDate(habit.date)} · {getHabitScore(habit)}/{HABIT_OPTIONS.length}</strong>
                <span>{HABIT_OPTIONS.filter(option => habit[option.key]).map(option => option.label).join(' · ') || 'No habits ticked'}</span>
                {habit.notes && <small>{habit.notes}</small>}
              </div>
              <button type="button" onClick={async () => { if (await confirmDeleteApp('this check-in')) await fsDel(user.uid, 'lakasHabits', habit._id) }}>Delete</button>
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
