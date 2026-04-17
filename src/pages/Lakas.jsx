import { useEffect, useMemo, useState } from 'react'
import {
  fsAdd,
  fsDel,
  fsDeleteLakasBodyLog,
  fsDeleteLakasMeal,
  fsSaveLakasBodyLog,
  fsSaveLakasMeal,
  fsSetProfile,
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

const BEGINNER_PHASES = [
  {
    title: 'Weeks 1-2: Learn the moves',
    desc: 'Use light effort, stop 2-3 reps before failure, and focus on smooth pain-free range of motion.',
  },
  {
    title: 'Weeks 3-4: Add one small step',
    desc: 'Add 1-2 reps per set or one extra set only when form still looks controlled.',
  },
  {
    title: 'Weeks 5-8: Build consistency',
    desc: 'Add a little weight only after you can finish all reps twice with clean form and normal recovery.',
  },
]

const FORM_GUIDES = [
  {
    match: ['squat', 'goblet squat', 'bodyweight squat'],
    name: 'Squat',
    setup: 'Feet about shoulder-width, ribs down, brace like someone will poke your stomach.',
    execution: 'Sit between your hips, keep knees tracking over toes, stand by pushing the floor away.',
    mistakes: 'Knees collapsing inward, heels lifting, rushing the bottom, or loading heavy before depth feels stable.',
    safety: 'Stop if you feel sharp knee, hip, or back pain. Reduce depth or use a box squat.',
  },
  {
    match: ['push-up', 'push up', 'bench press', 'incline dumbbell press'],
    name: 'Pressing',
    setup: 'Shoulder blades gently back/down, wrists stacked, elbows around 30-60 degrees from the body.',
    execution: 'Lower with control, pause lightly, press without shrugging or bouncing.',
    mistakes: 'Flaring elbows hard, losing wrist stack, bouncing off the chest, or arching aggressively.',
    safety: 'Use incline push-ups or lighter dumbbells if shoulders feel pinchy.',
  },
  {
    match: ['row', 'barbell row', 'dumbbell row', 'lat pulldown', 'face pull'],
    name: 'Pulling',
    setup: 'Start tall or hinged with a braced trunk. Let the shoulder blade move, then pull the elbow.',
    execution: 'Pull toward ribs or chest, pause briefly, lower slowly without yanking.',
    mistakes: 'Using momentum, craning the neck, shrugging every rep, or turning rows into lower-back swings.',
    safety: 'Lower the load if you cannot keep your ribs and neck quiet.',
  },
  {
    match: ['romanian deadlift', 'deadlift', 'glute bridge'],
    name: 'Hip hinge',
    setup: 'Soft knees, brace, then push hips back like closing a car door.',
    execution: 'Keep weight close, feel hamstrings/glutes, stand tall without leaning back.',
    mistakes: 'Rounding the back, squatting the hinge, letting weight drift forward, or chasing too much range.',
    safety: 'Stop above the point where your back wants to round.',
  },
  {
    match: ['plank', 'dead bug'],
    name: 'Core control',
    setup: 'Ribs down, glutes lightly squeezed, breathe through the brace.',
    execution: 'Hold tension without shaking the lower back into an arch.',
    mistakes: 'Holding breath, sagging hips, neck strain, or turning every rep into speed work.',
    safety: 'Shorten the set when form changes. Quality beats time.',
  },
]

const GYM_SESSION_TYPES = [
  {
    key: 'beginner-a',
    label: 'Beginner',
    templateName: 'Beginner Foundation A',
    desc: 'First gym day or coming back after a long break.',
  },
  {
    key: 'push',
    label: 'Push day',
    templateName: 'Push Day',
    desc: 'Chest, shoulders, and triceps.',
  },
  {
    key: 'pull',
    label: 'Pull day',
    templateName: 'Pull Day',
    desc: 'Back, rear delts, and biceps.',
  },
  {
    key: 'legs',
    label: 'Leg day',
    templateName: 'Leg Day',
    desc: 'Quads, glutes, hamstrings, and calves.',
  },
  {
    key: 'full-body',
    label: 'Full body',
    templateName: 'Full Body',
    desc: 'Simple all-around session for busy days.',
  },
  {
    key: 'cardio',
    label: 'Cardio',
    templateName: 'Cardio Base',
    desc: 'Easy conditioning before chasing speed.',
  },
]

const EXERCISE_VIDEO_GUIDES = [
  {
    match: ['bodyweight squat', 'goblet squat', 'squat', 'leg press'],
    id: '6AAqJyUDTnk',
    title: 'Goblet squat form guide',
  },
  {
    match: ['incline push-up', 'push-up', 'push up'],
    id: 'y8I66lWtNB8',
    title: 'Incline push-up form',
  },
  {
    match: ['dumbbell row', 'barbell row', 'row', 'face pull'],
    id: 'ufhQhwyrx-4',
    title: 'Row form tutorial',
  },
  {
    match: ['dead bug', 'plank'],
    id: '4XLEnwUr1d8',
    title: 'Core form tutorial',
  },
  {
    match: ['bench press', 'incline dumbbell press'],
    id: 'Qjxrp9Hwv_Q',
    title: 'Bench press exercise guide',
  },
  {
    match: ['shoulder press'],
    id: '0JfYxMRsUCQ',
    title: 'Dumbbell shoulder press guide',
  },
  {
    match: ['triceps pushdown'],
    id: '_w-HpW70nSQ',
    title: 'Cable triceps pushdown guide',
  },
  {
    match: ['lat pulldown'],
    id: 'lueEJGjTuPQ',
    title: 'Lat pulldown exercise guide',
  },
  {
    match: ['romanian deadlift', 'deadlift', 'glute bridge'],
    id: 'CQp5I9KgdXI',
    title: 'Hip hinge form',
  },
  {
    match: ['dumbbell curl', 'curl', 'bicep'],
    id: '3OZ2MT_5r3Q',
    title: 'Dumbbell curl exercise guide',
  },
  {
    match: ['calf raise'],
    id: 'wxwY7GXxL4k',
    title: 'Standing calf raise guide',
  },
  {
    match: ['brisk walk', 'walk', 'treadmill'],
    id: '09LAB5ErEfo',
    title: 'Walking form',
  },
]

const BUILT_IN_ROUTINES = [
  {
    name: 'Beginner Foundation A',
    focus: 'Beginner',
    difficulty: 'Beginner',
    weeks: 'Weeks 1-2',
    duration: 28,
    progression: 'When every set feels clean twice, add 1 rep per set next time.',
    deload: 'If form breaks or soreness lasts more than 48 hours, repeat the same numbers or remove one set.',
    notes: 'A safe first gym or home session. Move slowly, leave 2-3 reps in reserve, and do not chase failure.',
    exercises: [
      { name: 'Bodyweight squat', sets: 2, reps: 8, weight: 0, duration: 0, rest: 90, notes: 'Slow down, stand tall, knees track over toes' },
      { name: 'Incline push-up', sets: 2, reps: 6, weight: 0, duration: 0, rest: 90, notes: 'Hands on bench/table; body straight' },
      { name: 'Dumbbell row', sets: 2, reps: 8, weight: 0, duration: 0, rest: 90, notes: 'Pull elbow toward ribs' },
      { name: 'Dead bug', sets: 2, reps: 8, weight: 0, duration: 0, rest: 60, notes: 'Keep lower back quiet' },
    ],
  },
  {
    name: 'Beginner Foundation B',
    focus: 'Beginner',
    difficulty: 'Beginner',
    weeks: 'Weeks 1-2',
    duration: 30,
    progression: 'Add one set only after the whole workout feels easy and controlled.',
    deload: 'If joints feel irritated, switch to walking and mobility for the day.',
    notes: 'Alternate this with Foundation A. Keep effort light enough that you could talk between sets.',
    exercises: [
      { name: 'Glute bridge', sets: 2, reps: 10, weight: 0, duration: 0, rest: 75, notes: 'Squeeze glutes, avoid lower-back arch' },
      { name: 'Goblet squat', sets: 2, reps: 8, weight: 0, duration: 0, rest: 90, notes: 'Use light weight or bodyweight' },
      { name: 'Lat pulldown', sets: 2, reps: 10, weight: 0, duration: 0, rest: 90, notes: 'Pull elbows down, no swinging' },
      { name: 'Brisk walk', sets: 1, reps: 0, weight: 0, duration: 600, rest: 0, notes: 'Easy pace, nasal breathing if possible' },
    ],
  },
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
const ROUTINE_FOCUS = ['Beginner', 'Strength', 'Hypertrophy', 'Cardio', 'Mobility', 'Conditioning', 'Custom']
const ACTIVITY_TYPES = ['Walk', 'Run', 'Cardio', 'Cycling', 'Sport', 'Active day']
const REMINDER_TYPES = ['Workout', 'Weigh-in', 'Rest day', 'Steps', 'Habit', 'Meal prep']
const REMINDER_FREQUENCIES = ['once', 'daily', 'weekly', 'monthly']
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const HABIT_OPTIONS = [
  { key: 'water', label: 'Water' },
  { key: 'protein', label: 'Protein' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'stretching', label: 'Stretching' },
  { key: 'restDay', label: 'Rest day' },
  { key: 'vitamins', label: 'Vitamins' },
]

const DEFAULT_LAKAS_SETTINGS = {
  units: {
    weight: 'kg',
    body: 'cm',
    distance: 'km',
  },
  targets: {
    steps: 8000,
    calories: 2200,
    protein: 120,
    water: 8,
    sleep: 7,
    workoutsPerWeek: 3,
  },
  workoutDefaults: {
    sets: 3,
    reps: 10,
    restSeconds: 90,
    durationMinutes: 60,
  },
  training: {
    experienceLevel: 'Beginner',
    progressionMode: 'Guided',
  },
  meals: {
    calorieGoal: 2200,
    proteinGoal: 120,
    macroStyle: 'Balanced',
  },
  reminders: {
    workoutTime: '08:00',
    weighInDay: 'Monday',
    frequency: 'weekly',
  },
  display: {
    showBmi: true,
    hideProgressPhotosInPrivacy: true,
  },
}

const LAKAS_TAB_COPY = {
  overview: {
    eyebrow: 'Lakas overview',
    title: 'Your fitness command center.',
    sub: 'Records, charts, calendar signals, and reminders stay together so progress feels easy to read at a glance.',
    guide: ['Scan your week', 'Check records', 'Plan the next session'],
  },
  workouts: {
    eyebrow: 'Workout log',
    title: 'Start safely. Progress on purpose.',
    sub: 'Beginner foundation plans, form cues, reusable routines, and workout logs keep training useful without pushing too heavy too soon.',
    guide: ['Pick a safe template', 'Check form cues', 'Progress slowly'],
  },
  activity: {
    eyebrow: 'Steps and activity',
    title: 'Capture the movement between workouts.',
    sub: 'Use this for walks, runs, cardio minutes, steps, distance, and active days when a full workout log is too much.',
    guide: ['Pick activity type', 'Add steps or minutes', 'Save the day'],
  },
  body: {
    eyebrow: 'Body progress',
    title: 'Track the trend, not the panic.',
    sub: 'Log weight, measurements, BMI inputs, notes, and optional progress photos with privacy mode support.',
    guide: ['Add today\'s photo', 'Enter key measurements', 'Compare over time'],
  },
  meals: {
    eyebrow: 'Photo meal log',
    title: 'Save the meal, estimate the macros.',
    sub: 'Photo-first meal logging with manual calories and macros for now, built to upgrade into image calorie scanning later.',
    guide: ['Snap or upload food', 'Estimate calories', 'Save meal history'],
  },
  habits: {
    eyebrow: 'Recovery habits',
    title: 'Small check-ins, useful signal.',
    sub: 'Track water, protein, sleep, stretching, rest day, vitamins, and notes without turning recovery into homework.',
    guide: ['Tick what happened', 'Add recovery notes', 'Build consistency'],
  },
  goals: {
    eyebrow: 'Fitness goals',
    title: 'Turn vague intent into measurable targets.',
    sub: 'Track weight, steps, workouts, protein, body, habit, or custom goals with simple progress updates.',
    guide: ['Create a target', 'Add progress', 'Close the loop'],
  },
  reminders: {
    eyebrow: 'Reminders',
    title: 'Keep the plan from disappearing.',
    sub: 'Schedule workout, weigh-in, rest day, steps, habit, or meal-prep reminders that can be paused when life changes.',
    guide: ['Set the cue', 'Choose repeat', 'Pause anytime'],
  },
  settings: {
    eyebrow: 'Lakas settings',
    title: 'Tune Lakas to how you train.',
    sub: 'Set units, daily targets, workout defaults, meal goals, reminders, and privacy preferences for the fitness space.',
    guide: ['Choose units', 'Set targets', 'Save defaults'],
  },
}

function createExerciseRow(overrides = {}, defaults = {}) {
  return {
    rowId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: '',
    sets: String(defaults.sets ?? '3'),
    reps: String(defaults.reps ?? '10'),
    weight: '',
    duration: '',
    rest: String(defaults.restSeconds ?? '90'),
    notes: '',
    ...overrides,
  }
}

function createWorkoutForm(settings = DEFAULT_LAKAS_SETTINGS) {
  return {
    routineId: '',
    date: today(),
    title: '',
    duration: settings.workoutDefaults?.durationMinutes ? String(settings.workoutDefaults.durationMinutes) : '',
    exercises: [createExerciseRow({}, settings.workoutDefaults)],
    notes: '',
  }
}

function createRoutineForm(settings = DEFAULT_LAKAS_SETTINGS) {
  return {
    name: '',
    focus: 'Strength',
    duration: settings.workoutDefaults?.durationMinutes ? String(settings.workoutDefaults.durationMinutes) : '',
    exercises: [createExerciseRow({}, settings.workoutDefaults)],
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

function createReminderForm(settings = DEFAULT_LAKAS_SETTINGS) {
  return {
    title: '',
    type: 'Workout',
    date: today(),
    time: settings.reminders?.workoutTime || '08:00',
    frequency: settings.reminders?.frequency || 'weekly',
    notes: '',
  }
}

function getLakasSettings(profile = {}) {
  const settings = profile?.lakasSettings || {}
  return {
    units: { ...DEFAULT_LAKAS_SETTINGS.units, ...(settings.units || {}) },
    targets: { ...DEFAULT_LAKAS_SETTINGS.targets, ...(settings.targets || {}) },
    workoutDefaults: { ...DEFAULT_LAKAS_SETTINGS.workoutDefaults, ...(settings.workoutDefaults || {}) },
    training: { ...DEFAULT_LAKAS_SETTINGS.training, ...(settings.training || {}) },
    meals: { ...DEFAULT_LAKAS_SETTINGS.meals, ...(settings.meals || {}) },
    reminders: { ...DEFAULT_LAKAS_SETTINGS.reminders, ...(settings.reminders || {}) },
    display: { ...DEFAULT_LAKAS_SETTINGS.display, ...(settings.display || {}) },
  }
}

function sanitizeLakasSettings(settings = {}) {
  const next = getLakasSettings({ lakasSettings: settings })
  return {
    units: {
      weight: next.units.weight === 'lb' ? 'lb' : 'kg',
      body: next.units.body === 'in' ? 'in' : 'cm',
      distance: next.units.distance === 'mi' ? 'mi' : 'km',
    },
    targets: {
      steps: numberOrZero(next.targets.steps),
      calories: numberOrZero(next.targets.calories),
      protein: numberOrZero(next.targets.protein),
      water: numberOrZero(next.targets.water),
      sleep: numberOrZero(next.targets.sleep),
      workoutsPerWeek: numberOrZero(next.targets.workoutsPerWeek),
    },
    workoutDefaults: {
      sets: numberOrZero(next.workoutDefaults.sets),
      reps: numberOrZero(next.workoutDefaults.reps),
      restSeconds: numberOrZero(next.workoutDefaults.restSeconds),
      durationMinutes: numberOrZero(next.workoutDefaults.durationMinutes),
    },
    training: {
      experienceLevel: ['Beginner', 'Returning', 'Intermediate'].includes(next.training.experienceLevel) ? next.training.experienceLevel : 'Beginner',
      progressionMode: ['Guided', 'Flexible'].includes(next.training.progressionMode) ? next.training.progressionMode : 'Guided',
    },
    meals: {
      calorieGoal: numberOrZero(next.meals.calorieGoal),
      proteinGoal: numberOrZero(next.meals.proteinGoal),
      macroStyle: next.meals.macroStyle || 'Balanced',
    },
    reminders: {
      workoutTime: next.reminders.workoutTime || '08:00',
      weighInDay: next.reminders.weighInDay || 'Monday',
      frequency: REMINDER_FREQUENCIES.includes(next.reminders.frequency) ? next.reminders.frequency : 'weekly',
    },
    display: {
      showBmi: next.display.showBmi !== false,
      hideProgressPhotosInPrivacy: next.display.hideProgressPhotosInPrivacy !== false,
    },
  }
}

function getExerciseGuide(name = '') {
  const normalized = String(name || '').trim().toLowerCase()
  if (!normalized) return null
  return FORM_GUIDES.find(guide => guide.match.some(term => normalized.includes(term)))
}

function buildTemplateNotes(template = {}) {
  return [
    template.notes,
    template.progression ? `Progression: ${template.progression}` : '',
    template.deload ? `Deload: ${template.deload}` : '',
  ].filter(Boolean).join(' ')
}

function getExerciseVideoGuide(exerciseName = '') {
  const normalized = String(exerciseName || '').trim().toLowerCase()
  if (!normalized) return null
  return EXERCISE_VIDEO_GUIDES.find(video => video.match.some(term => normalized.includes(term))) || null
}

function getYouTubeEmbedUrl(videoId = '') {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`
}

function getExerciseActiveSeconds(exercise = {}) {
  const timedDuration = numberOrZero(exercise.duration)
  if (timedDuration > 0) return timedDuration
  const reps = numberOrZero(exercise.reps)
  return Math.max(30, reps > 0 ? reps * 4 : 45)
}

function estimateExerciseMinutes(exercise = {}) {
  const sets = Math.max(1, numberOrZero(exercise.sets) || 1)
  const restSeconds = Math.max(0, numberOrZero(exercise.rest))
  const activeSeconds = getExerciseActiveSeconds(exercise)
  return Math.max(1, Math.round(((sets * activeSeconds) + ((sets - 1) * restSeconds)) / 60))
}

function estimateRoutineMinutes(exercises = []) {
  return normalizeRows(exercises).reduce((sum, exercise) => sum + estimateExerciseMinutes(exercise), 0)
}

function formatDurationClock(seconds = 0) {
  const totalSeconds = Math.max(0, Math.floor(numberOrZero(seconds)))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
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

function formatExerciseLine(row = {}, hidden = false, weightUnit = 'kg') {
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
  const load = weight && !hidden ? ` @ ${formatNumber(weight, 1)}${weightUnit}` : ''
  const restText = rest ? `, ${formatNumber(rest)}s rest` : ''
  return `${row.name || 'Exercise'} ${effort}${load}${restText}`
}

function displayMetric(value, unit = '', hidden = false, decimals = 1) {
  if (hidden) return unit ? `... ${unit}` : '...'
  const numeric = Number(value) || 0
  return `${numeric.toLocaleString('en-PH', { maximumFractionDigits: decimals })}${unit ? ` ${unit}` : ''}`
}

function calculateBmi(weight, height, weightUnit = 'kg', bodyUnit = 'cm') {
  const rawWeight = numberOrZero(weight)
  const rawHeight = numberOrZero(height)
  if (!rawWeight || !rawHeight) return 0
  const kg = weightUnit === 'lb' ? rawWeight * 0.45359237 : rawWeight
  const meters = bodyUnit === 'in' ? rawHeight * 0.0254 : rawHeight / 100
  if (!meters) return 0
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

export default function Lakas({ user, data = {}, profile = {}, privacyMode = false, activeTab = 'overview' }) {
  const initialSettings = getLakasSettings(profile)
  const [routineForm, setRoutineForm] = useState(() => createRoutineForm(initialSettings))
  const [workoutForm, setWorkoutForm] = useState(() => createWorkoutForm(initialSettings))
  const [mealForm, setMealForm] = useState(createMealForm)
  const [mealPhoto, setMealPhoto] = useState(null)
  const [bodyPhoto, setBodyPhoto] = useState(null)
  const [bodyPhotoPreview, setBodyPhotoPreview] = useState('')
  const [bodyForm, setBodyForm] = useState(createBodyForm)
  const [activityForm, setActivityForm] = useState(createActivityForm)
  const [habitForm, setHabitForm] = useState(createHabitForm)
  const [goalForm, setGoalForm] = useState(createGoalForm)
  const [reminderForm, setReminderForm] = useState(() => createReminderForm(initialSettings))
  const [settingsForm, setSettingsForm] = useState(initialSettings)
  const [goalProgress, setGoalProgress] = useState({})
  const [savingMeal, setSavingMeal] = useState(false)
  const [savingBody, setSavingBody] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [deletingLakasData, setDeletingLakasData] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(today().slice(0, 7))
  const [selectedGymSessionKey, setSelectedGymSessionKey] = useState('beginner-a')
  const [gymSessionMode, setGymSessionMode] = useState({
    open: false,
    sessionKey: 'beginner-a',
    exerciseIndex: 0,
    completed: {},
    startedAt: null,
  })
  const [gymSessionNow, setGymSessionNow] = useState(Date.now())
  const savedLakasSettings = getLakasSettings(profile)
  const profileSettingsKey = JSON.stringify(profile?.lakasSettings || {})

  const routines = sortNewest(normalizeRows(data.lakasRoutines))
  const workouts = sortNewest(normalizeRows(data.lakasWorkouts))
  const meals = sortNewest(normalizeRows(data.lakasMeals))
  const bodyLogs = sortNewest(normalizeRows(data.lakasBodyLogs))
  const activities = sortNewest(normalizeRows(data.lakasActivities))
  const habits = sortNewest(normalizeRows(data.lakasHabits))
  const reminders = sortNewest(normalizeRows(data.lakasReminders))
  const goals = normalizeRows(data.lakasGoals)
  const selectedGymSession = GYM_SESSION_TYPES.find(session => session.key === selectedGymSessionKey) || GYM_SESSION_TYPES[0]
  const selectedGymTemplate = BUILT_IN_ROUTINES.find(template => template.name === selectedGymSession.templateName) || BUILT_IN_ROUTINES[0]
  const selectedGymEstimate = selectedGymTemplate?.duration || estimateRoutineMinutes(selectedGymTemplate?.exercises)
  const activeGymSession = GYM_SESSION_TYPES.find(session => session.key === gymSessionMode.sessionKey) || selectedGymSession
  const activeGymTemplate = BUILT_IN_ROUTINES.find(template => template.name === activeGymSession.templateName) || selectedGymTemplate
  const activeGymExercises = normalizeRows(activeGymTemplate?.exercises)
  const activeGymExerciseIndex = Math.min(gymSessionMode.exerciseIndex, Math.max(0, activeGymExercises.length - 1))
  const activeGymExercise = activeGymExercises[activeGymExerciseIndex] || {}
  const activeGymVideo = getExerciseVideoGuide(activeGymExercise.name)
  const activeGymGuide = getExerciseGuide(activeGymExercise.name)
  const activeGymCompletedCount = Object.values(gymSessionMode.completed || {}).filter(Boolean).length
  const activeGymPlanMinutes = activeGymTemplate?.duration || estimateRoutineMinutes(activeGymExercises)
  const activeGymElapsedSeconds = gymSessionMode.startedAt
    ? Math.max(0, Math.floor((gymSessionNow - gymSessionMode.startedAt) / 1000))
    : 0
  const activeGymProgress = activeGymExercises.length
    ? Math.round((activeGymCompletedCount / activeGymExercises.length) * 100)
    : 0

  useEffect(() => {
    setSettingsForm(getLakasSettings(profile))
  }, [profileSettingsKey])

  useEffect(() => {
    if (!gymSessionMode.open) return undefined

    setGymSessionNow(Date.now())
    const timerId = window.setInterval(() => setGymSessionNow(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [gymSessionMode.open, gymSessionMode.startedAt])

  useEffect(() => {
    if (!gymSessionMode.open) return undefined

    const previousOverflow = document.body.style.overflow
    function handleKeyDown(event) {
      if (event.key === 'Escape') closeGymSessionMode()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [gymSessionMode.open])

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
    const latestBmi = calculateBmi(latestBody.weight, latestBody.height, savedLakasSettings.units.weight, savedLakasSettings.units.body)
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
  }, [activities, bodyLogs, goals, habits, meals, profileSettingsKey, routines.length, savedLakasSettings.units.body, savedLakasSettings.units.weight, workouts])

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
      exercises: [...current.exercises, createExerciseRow({}, savedLakasSettings.workoutDefaults)],
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

  function openGymSessionMode(template = selectedGymTemplate, session = selectedGymSession) {
    if (!template) return
    setWorkoutForm(current => ({
      ...current,
      routineId: '',
      date: today(),
      title: template.name || session.label,
      duration: String(template.duration || estimateRoutineMinutes(template.exercises)),
      exercises: hydrateExerciseRows(template.exercises),
      notes: [`Gym session: ${session.label}.`, buildTemplateNotes(template)].filter(Boolean).join(' '),
    }))
    setGymSessionMode({
      open: true,
      sessionKey: session.key,
      exerciseIndex: 0,
      completed: {},
      startedAt: Date.now(),
    })
    notifyApp({ title: 'Gym session started', message: `${template.name || session.label} is open in session mode.`, tone: 'success' })
  }

  function editGymSessionAsRoutine(template = selectedGymTemplate) {
    if (!template) return
    applyRoutineTemplate(template)
  }

  function closeGymSessionMode() {
    setGymSessionMode(current => ({ ...current, open: false }))
  }

  function setGymModeExercise(index) {
    setGymSessionMode(current => ({
      ...current,
      exerciseIndex: Math.max(0, Math.min(index, Math.max(0, activeGymExercises.length - 1))),
    }))
  }

  function completeCurrentGymExercise() {
    setGymSessionMode(current => {
      const index = Math.max(0, Math.min(current.exerciseIndex, Math.max(0, activeGymExercises.length - 1)))
      const wasCompleted = Boolean(current.completed?.[index])
      const completed = {
        ...(current.completed || {}),
        [index]: !wasCompleted,
      }
      const nextIndex = !wasCompleted && index < activeGymExercises.length - 1
        ? index + 1
        : index

      return {
        ...current,
        completed,
        exerciseIndex: nextIndex,
      }
    })
  }

  function applyRoutineTemplate(template) {
    setRoutineForm({
      name: template.name,
      focus: template.focus,
      duration: String(template.duration || ''),
      exercises: hydrateExerciseRows(template.exercises),
      notes: buildTemplateNotes(template),
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
        {rows.map((row, index) => {
          const guide = getExerciseGuide(row.name)
          return (
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
              {guide && (
                <div className={lStyles.formGuide}>
                  <strong>{guide.name} form cues</strong>
                  <span>{guide.setup}</span>
                  <span>{guide.execution}</span>
                  <small>Watch for: {guide.mistakes}</small>
                  <small>Safety: {guide.safety}</small>
                </div>
              )}
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
                  <span>Weight ({savedLakasSettings.units.weight})</span>
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
          )
        })}
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
    setRoutineForm(createRoutineForm(savedLakasSettings))
    notifyApp({ title: 'Routine saved', message: 'You can now load it when logging a workout.', tone: 'success' })
  }

  async function handleAddWorkout() {
    const exercises = sanitizeExerciseRows(workoutForm.exercises)
    if (!workoutForm.title.trim() || !workoutForm.date || !exercises.length) {
      notifyApp({ title: 'Workout needs details', message: 'Add a workout name, date, and at least one exercise.', tone: 'warning' })
      return false
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
    setWorkoutForm(createWorkoutForm(savedLakasSettings))
    notifyApp({ title: 'Workout logged', message: 'Your Lakas workout was saved.', tone: 'success' })
    return true
  }

  async function handleSaveGymSession() {
    const saved = await handleAddWorkout()
    if (saved) closeGymSessionMode()
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
        bmi: calculateBmi(bodyForm.weight, bodyForm.height, savedLakasSettings.units.weight, savedLakasSettings.units.body),
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
    setReminderForm(createReminderForm(savedLakasSettings))
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
      updatedAt: Date.now(),
    })
    setGoalProgress(current => ({ ...current, [goal._id]: '' }))
  }

  function updateSettingGroup(group, field, value) {
    setSettingsForm(current => ({
      ...current,
      [group]: {
        ...(current[group] || {}),
        [field]: value,
      },
    }))
  }

  async function handleSaveLakasSettings() {
    setSavingSettings(true)
    try {
      const nextSettings = sanitizeLakasSettings(settingsForm)
      await fsSetProfile(user.uid, { lakasSettings: nextSettings })
      setSettingsForm(nextSettings)
      notifyApp({ title: 'Lakas settings saved', message: 'Your fitness defaults were updated.', tone: 'success' })
    } catch {
      notifyApp({ title: 'Settings not saved', message: 'Check your connection and try again.', tone: 'error' })
    } finally {
      setSavingSettings(false)
    }
  }

  function handleExportLakasData() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: {
        lakasSettings: sanitizeLakasSettings(settingsForm),
      },
      lakasRoutines: routines,
      lakasWorkouts: workouts,
      lakasBodyLogs: bodyLogs,
      lakasActivities: activities,
      lakasHabits: habits,
      lakasReminders: reminders,
      lakasMeals: meals,
      lakasGoals: goals,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `buhay-lakas-backup-${today()}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    notifyApp({ title: 'Lakas export ready', message: 'Your fitness backup was downloaded.', tone: 'success' })
  }

  async function handleLogout() {
    const [{ signOut }, { auth }] = await Promise.all([
      import('firebase/auth'),
      import('../lib/firebase'),
    ])
    await signOut(auth)
  }

  async function handleDeleteLakasData() {
    const confirmed = await confirmDeleteApp('all Lakas fitness data')
    if (!confirmed) return

    setDeletingLakasData(true)
    try {
      const collections = [
        ['lakasRoutines', routines],
        ['lakasWorkouts', workouts],
        ['lakasActivities', activities],
        ['lakasHabits', habits],
        ['lakasReminders', reminders],
        ['lakasGoals', goals],
      ]
      const docDeletes = collections.flatMap(([collectionName, rows]) => (
        normalizeRows(rows)
          .filter(row => row._id)
          .map(row => fsDel(user.uid, collectionName, row._id))
      ))
      const mediaDeletes = [
        ...bodyLogs.filter(row => row._id).map(row => fsDeleteLakasBodyLog(user.uid, row)),
        ...meals.filter(row => row._id).map(row => fsDeleteLakasMeal(user.uid, row)),
      ]
      await Promise.all([...docDeletes, ...mediaDeletes])
      notifyApp({ title: 'Lakas data cleared', message: 'Fitness logs were deleted. Lakas settings were kept.', tone: 'success' })
    } catch {
      notifyApp({ title: 'Could not clear Lakas', message: 'Some data may still remain. Check your connection and try again.', tone: 'error' })
    } finally {
      setDeletingLakasData(false)
    }
  }

  const latestBmiLabel = getBmiLabel(insights.latestBmi)
  const upcomingReminders = reminders.filter(row => row.enabled !== false).slice(0, 5)
  const currentTab = activeTab || 'overview'
  const showOverview = currentTab === 'overview'
  const showWorkouts = currentTab === 'workouts'
  const showActivity = currentTab === 'activity'
  const showBody = currentTab === 'body'
  const showMeals = currentTab === 'meals'
  const showHabits = currentTab === 'habits'
  const showGoals = currentTab === 'goals'
  const showReminders = currentTab === 'reminders'
  const showSettings = currentTab === 'settings'
  const tabCopy = LAKAS_TAB_COPY[currentTab] || LAKAS_TAB_COPY.overview
  const workoutVolume7d = insights.volumeByDay.reduce((sum, row) => sum + numberOrZero(row.value), 0)
  const mealsToday = meals.filter(row => row.date === today()).length
  const latestBodyLog = bodyLogs[0] || {}
  const completedGoals = goals.filter(goal => {
    const target = numberOrZero(goal.target)
    return target > 0 && numberOrZero(goal.current) >= target
  }).length
  const activeGoalsCount = goals.filter(goal => {
    const target = numberOrZero(goal.target)
    return target > 0 && numberOrZero(goal.current) < target
  }).length
  const enabledReminders = reminders.filter(row => row.enabled !== false).length
  const pausedReminders = reminders.filter(row => row.enabled === false).length
  const todayReminders = reminders.filter(row => row.enabled !== false && row.date === today()).length
  const habitCheckins7d = habits.filter(row => row.date >= dateDaysAgo(6)).length
  const shouldShowBmi = savedLakasSettings.display.showBmi !== false
  const hideBodyPhotos = privacyMode && savedLakasSettings.display.hideProgressPhotosInPrivacy !== false
  let latestBodyMeta = 'Add height and weight to calculate BMI'
  if (!shouldShowBmi) {
    latestBodyMeta = 'BMI hidden'
  } else if (latestBodyLog.date || insights.latestBmi) {
    latestBodyMeta = privacyMode
      ? 'Private measurements'
      : insights.latestBmi
        ? `BMI ${formatNumber(insights.latestBmi, 1)} · ${latestBmiLabel}`
        : latestBmiLabel
  }
  const tabHeroCard = {
    overview: {
      label: 'This week',
      value: displayMetric(insights.workoutsThisWeek, 'workouts', privacyMode, 0),
      meta: `${displayMetric(insights.activeDays, 'active days', privacyMode, 0)} · ${insights.routineCount ? `${insights.routineCount} routines ready` : 'Build a routine to start'}`,
    },
    workouts: {
      label: 'Training load',
      value: displayMetric(workoutVolume7d, savedLakasSettings.units.weight, privacyMode, 0),
      meta: `${displayMetric(insights.workoutsThisWeek, 'workouts', privacyMode, 0)} this week · ${displayMetric(insights.records.workoutStreak, 'day streak', privacyMode, 0)}`,
    },
    activity: {
      label: 'Today movement',
      value: displayMetric(insights.stepsToday, 'steps', privacyMode, 0),
      meta: `${displayMetric(insights.activeMinutesToday, 'active min', privacyMode, 0)} · ${displayMetric(insights.activeDays, 'active days', privacyMode, 0)} this week`,
    },
    body: {
      label: 'Latest body log',
      value: insights.latestWeight ? displayMetric(insights.latestWeight, savedLakasSettings.units.weight, privacyMode) : 'No log',
      meta: latestBodyLog.date ? `${formatDisplayDate(latestBodyLog.date)} · ${latestBodyMeta}` : latestBodyMeta,
    },
    meals: {
      label: 'Today fuel',
      value: displayMetric(insights.caloriesToday, 'kcal', privacyMode, 0),
      meta: `${displayMetric(insights.proteinToday, 'g protein', privacyMode, 0)} · ${displayMetric(mealsToday, 'meals', privacyMode, 0)}`,
    },
    habits: {
      label: 'Today recovery',
      value: privacyMode ? `.../${HABIT_OPTIONS.length}` : `${insights.habitScoreToday}/${HABIT_OPTIONS.length}`,
      meta: `${displayMetric(habitCheckins7d, 'check-ins', privacyMode, 0)} this week`,
    },
    goals: {
      label: 'Goal board',
      value: displayMetric(activeGoalsCount, 'active', privacyMode, 0),
      meta: `${displayMetric(completedGoals, 'completed', privacyMode, 0)} · ${displayMetric(goals.length, 'total goals', privacyMode, 0)}`,
    },
    reminders: {
      label: 'Upcoming cues',
      value: displayMetric(enabledReminders, 'active', privacyMode, 0),
      meta: `${displayMetric(todayReminders, 'today', privacyMode, 0)} · ${displayMetric(pausedReminders, 'paused', privacyMode, 0)}`,
    },
    settings: {
      label: 'Current units',
      value: `${savedLakasSettings.units.weight}/${savedLakasSettings.units.body}`,
      meta: `${savedLakasSettings.units.distance} distance · ${savedLakasSettings.display.showBmi ? 'BMI on' : 'BMI hidden'}`,
    },
  }[currentTab] || {
    label: 'This week',
    value: displayMetric(insights.workoutsThisWeek, 'workouts', privacyMode, 0),
    meta: `${displayMetric(insights.activeDays, 'active days', privacyMode, 0)} · ${insights.routineCount ? `${insights.routineCount} routines ready` : 'Build a routine to start'}`,
  }
  const tabStats = ({
    overview: [
      { label: 'Workouts', value: displayMetric(insights.workoutsThisWeek, '', privacyMode, 0), meta: 'Last 7 days' },
      { label: 'Steps', value: displayMetric(insights.stepsToday, '', privacyMode, 0), meta: 'Today' },
      { label: 'Protein', value: displayMetric(insights.proteinToday, 'g', privacyMode, 0), meta: 'Logged today' },
      { label: 'Body', value: insights.latestWeight ? displayMetric(insights.latestWeight, savedLakasSettings.units.weight, privacyMode) : 'No log', meta: latestBodyMeta },
    ],
    workouts: [
      { label: 'Routines', value: displayMetric(insights.routineCount, '', privacyMode, 0), meta: 'Saved templates' },
      { label: 'Workouts', value: displayMetric(insights.workoutsThisWeek, '', privacyMode, 0), meta: 'Last 7 days' },
      { label: 'Volume', value: displayMetric(workoutVolume7d, savedLakasSettings.units.weight, privacyMode, 0), meta: 'Last 7 days' },
      { label: 'Streak', value: displayMetric(insights.records.workoutStreak, 'days', privacyMode, 0), meta: 'Current' },
    ],
    activity: [
      { label: 'Steps', value: displayMetric(insights.stepsToday, '', privacyMode, 0), meta: 'Today' },
      { label: 'Active min', value: displayMetric(insights.activeMinutesToday, '', privacyMode, 0), meta: 'Today' },
      { label: 'Active days', value: displayMetric(insights.activeDays, '', privacyMode, 0), meta: 'Last 7 days' },
      { label: 'Logs', value: displayMetric(activities.length, '', privacyMode, 0), meta: 'Saved movement' },
    ],
    body: [
      { label: 'Weight', value: insights.latestWeight ? displayMetric(insights.latestWeight, savedLakasSettings.units.weight, privacyMode) : 'No log', meta: latestBodyLog.date ? formatDisplayDate(latestBodyLog.date) : 'Latest' },
      { label: 'BMI', value: shouldShowBmi && insights.latestBmi ? displayMetric(insights.latestBmi, '', privacyMode, 1) : shouldShowBmi ? 'No BMI' : 'Hidden', meta: shouldShowBmi ? latestBmiLabel : 'Disabled in settings' },
      { label: 'Logs', value: displayMetric(bodyLogs.length, '', privacyMode, 0), meta: 'Body entries' },
      { label: 'Photos', value: displayMetric(bodyLogs.filter(row => row.photoUrl).length, '', privacyMode, 0), meta: 'Progress photos' },
    ],
    meals: [
      { label: 'Calories', value: displayMetric(insights.caloriesToday, 'kcal', privacyMode, 0), meta: 'Today' },
      { label: 'Protein', value: displayMetric(insights.proteinToday, 'g', privacyMode, 0), meta: 'Today' },
      { label: 'Meals', value: displayMetric(mealsToday, '', privacyMode, 0), meta: 'Today' },
      { label: 'Photos', value: displayMetric(meals.filter(row => row.photoUrl).length, '', privacyMode, 0), meta: 'Saved meals' },
    ],
    habits: [
      { label: 'Score', value: privacyMode ? `.../${HABIT_OPTIONS.length}` : `${insights.habitScoreToday}/${HABIT_OPTIONS.length}`, meta: 'Today' },
      { label: 'Check-ins', value: displayMetric(habitCheckins7d, '', privacyMode, 0), meta: 'Last 7 days' },
      { label: 'Options', value: displayMetric(HABIT_OPTIONS.length, '', privacyMode, 0), meta: 'Recovery habits' },
      { label: 'All logs', value: displayMetric(habits.length, '', privacyMode, 0), meta: 'Saved check-ins' },
    ],
    goals: [
      { label: 'Active', value: displayMetric(activeGoalsCount, '', privacyMode, 0), meta: 'In progress' },
      { label: 'Completed', value: displayMetric(completedGoals, '', privacyMode, 0), meta: 'Reached target' },
      { label: 'Total', value: displayMetric(goals.length, '', privacyMode, 0), meta: 'Tracked goals' },
      { label: 'Types', value: displayMetric(GOAL_TYPES.length, '', privacyMode, 0), meta: 'Goal categories' },
    ],
    reminders: [
      { label: 'Active', value: displayMetric(enabledReminders, '', privacyMode, 0), meta: 'Enabled cues' },
      { label: 'Today', value: displayMetric(todayReminders, '', privacyMode, 0), meta: 'Due today' },
      { label: 'Paused', value: displayMetric(pausedReminders, '', privacyMode, 0), meta: 'Not firing' },
      { label: 'Upcoming', value: displayMetric(upcomingReminders.length, '', privacyMode, 0), meta: 'Visible list' },
    ],
    settings: [
      { label: 'Units', value: `${savedLakasSettings.units.weight}/${savedLakasSettings.units.body}`, meta: `${savedLakasSettings.units.distance} distance` },
      { label: 'Steps target', value: displayMetric(savedLakasSettings.targets.steps, '', privacyMode, 0), meta: 'Daily target' },
      { label: 'Workout default', value: displayMetric(savedLakasSettings.workoutDefaults.durationMinutes, 'min', privacyMode, 0), meta: `${savedLakasSettings.workoutDefaults.sets}x${savedLakasSettings.workoutDefaults.reps} · ${savedLakasSettings.workoutDefaults.restSeconds}s rest` },
      { label: 'Meal target', value: displayMetric(savedLakasSettings.meals.calorieGoal, 'kcal', privacyMode, 0), meta: `${savedLakasSettings.meals.proteinGoal}g protein` },
    ],
  })[currentTab] || []

  return (
    <div className={`${styles.page} ${lStyles.page}`}>
      <div className={lStyles.hero}>
        <div>
          <div className={lStyles.eyebrow}>{tabCopy.eyebrow}</div>
          <div className={lStyles.title}>{tabCopy.title}</div>
          <div className={lStyles.sub}>{tabCopy.sub}</div>
        </div>
        <div className={lStyles.heroCard}>
          <div className={lStyles.heroCardLabel}>{tabHeroCard.label}</div>
          <div className={lStyles.heroCardValue}>{tabHeroCard.value}</div>
          <div className={lStyles.heroCardMeta}>{tabHeroCard.meta}</div>
        </div>
      </div>

      <div className={lStyles.statsGrid}>
        {tabStats.map(stat => (
          <div key={stat.label} className={lStyles.statCard}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.meta}</small>
          </div>
        ))}
      </div>

      <div className={lStyles.quickWins}>
        {tabCopy.guide.map((item, index) => (
          <div key={item} className={lStyles.quickWinCard}>
            <span className={lStyles.quickWinIndex}>{index + 1}</span>
            <span className={lStyles.quickWinText}>{item}</span>
          </div>
        ))}
      </div>

      {(showOverview || showReminders) && (
      <div className={lStyles.insightGrid}>
        {showOverview && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Records</div>
              <h3>Personal records</h3>
              <p className={lStyles.sectionHint}>Best lifts, reps, volume, cardio, and streaks update from saved logs.</p>
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
            ].map(([label, record]) => {
              const recordUnit = record?.unit === 'kg'
                ? savedLakasSettings.units.weight
                : record?.unit === 'kg volume'
                  ? `${savedLakasSettings.units.weight} volume`
                  : record?.unit
              return (
                <div key={label} className={lStyles.recordCard}>
                  <span>{label}</span>
                  <strong>{record ? displayMetric(record.value, recordUnit, privacyMode) : 'No record'}</strong>
                  <small>{record?.label || 'Log more to unlock'}</small>
                </div>
              )
            })}
          </div>
        </section>
        )}

        {showOverview && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Charts</div>
              <h3>Progress charts</h3>
              <p className={lStyles.sectionHint}>A compact 7-day view for workout frequency, volume, steps, and body trend.</p>
            </div>
          </div>
          <div className={lStyles.chartGrid}>
            <MiniBarChart title="Workout frequency" rows={insights.workoutFrequency} unit="workouts" hidden={privacyMode} />
            <MiniBarChart title="Volume lifted" rows={insights.volumeByDay} unit={savedLakasSettings.units.weight} hidden={privacyMode} />
            <MiniBarChart title="Steps" rows={insights.stepsByDay} unit="steps" hidden={privacyMode} />
            <MiniBarChart title="Weight trend" rows={insights.weightTrend.length ? insights.weightTrend : [{ key: 'empty', label: '--', value: 0 }]} unit={savedLakasSettings.units.weight} hidden={privacyMode} />
          </div>
        </section>
        )}

        {showOverview && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Calendar</div>
              <h3>Training calendar</h3>
              <p className={lStyles.sectionHint}>Dots show the days with workouts, activity, body logs, or habit check-ins.</p>
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
        )}

        {(showOverview || showReminders) && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Reminders</div>
              <h3>Workout reminders</h3>
              <p className={lStyles.sectionHint}>Create cues for workouts, weigh-ins, steps, rest days, and habit routines.</p>
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
        )}
      </div>
      )}

      {(showWorkouts || showActivity || showHabits) && (
      <div className={lStyles.grid}>
        {showWorkouts && (
        <>
        <section className={`${lStyles.panel} ${lStyles.gymSessionPanel}`}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Gym session</div>
              <h3>Are you doing gym today?</h3>
              <p className={lStyles.sectionHint}>Choose the day type and Lakas will load a ready routine with exercise timing, rest, form cues, and YouTube form help.</p>
            </div>
          </div>

          <div className={lStyles.sessionPicker} role="group" aria-label="Choose gym session type">
            {GYM_SESSION_TYPES.map(session => (
              <button
                key={session.key}
                type="button"
                className={`${lStyles.sessionChip} ${selectedGymSessionKey === session.key ? lStyles.sessionChipActive : ''}`}
                onClick={() => setSelectedGymSessionKey(session.key)}
                aria-pressed={selectedGymSessionKey === session.key}
              >
                <strong>{session.label}</strong>
                <span>{session.desc}</span>
              </button>
            ))}
          </div>

          <div className={lStyles.gymSessionLayout}>
            <div className={lStyles.gymSessionSummary}>
              <div className={lStyles.gymSessionEyebrow}>{selectedGymSession.label}</div>
              <h4>{selectedGymTemplate.name}</h4>
              <p>{buildTemplateNotes(selectedGymTemplate) || selectedGymSession.desc}</p>
              <div className={lStyles.gymSessionStats}>
                <span>{selectedGymTemplate.exercises.length} exercises</span>
                <span>{selectedGymEstimate} min plan</span>
                <span>{selectedGymTemplate.focus}</span>
              </div>
              <div className={lStyles.gymSessionActions}>
                <button type="button" className={lStyles.primaryBtn} onClick={() => openGymSessionMode(selectedGymTemplate, selectedGymSession)}>
                  Start this session
                </button>
                <button type="button" className={lStyles.ghostBtn} onClick={() => editGymSessionAsRoutine(selectedGymTemplate)}>
                  Edit as routine
                </button>
              </div>
            </div>

            <div className={lStyles.gymExerciseList}>
              {selectedGymTemplate.exercises.map((exercise, index) => {
                const guide = getExerciseGuide(exercise.name)
                return (
                  <article key={`${selectedGymTemplate.name}-${exercise.name}`} className={lStyles.gymExerciseCard}>
                    <div className={lStyles.gymExerciseTop}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{exercise.name}</strong>
                    </div>
                    <div className={lStyles.gymExerciseMeta}>
                      <span>{exercise.sets || 1} sets</span>
                      <span>{exercise.reps ? `${exercise.reps} reps` : `${Math.round(numberOrZero(exercise.duration) / 60)} min`}</span>
                      <span>{exercise.rest || 0}s rest</span>
                      <span>{estimateExerciseMinutes(exercise)} min</span>
                    </div>
                    {guide && <p>{guide.setup} {guide.safety}</p>}
                    {exercise.notes && <small>{exercise.notes}</small>}
                    <span className={lStyles.gymExerciseVideoHint}>Video plays inside session mode</span>
                  </article>
                )
              })}
            </div>
          </div>

          <div className={lStyles.gymSessionSafety}>
            Safety rule: if form breaks, pain feels sharp, or recovery feels bad, reduce load, reduce range, or stop the set.
          </div>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Beginner path</div>
              <h3>Start light, progress safely</h3>
              <p className={lStyles.sectionHint}>For users with no workout history, Lakas now starts with foundation routines and slow progression rules.</p>
            </div>
          </div>
          <div className={lStyles.phaseGrid}>
            {BEGINNER_PHASES.map(phase => (
              <div key={phase.title} className={lStyles.phaseCard}>
                <strong>{phase.title}</strong>
                <span>{phase.desc}</span>
              </div>
            ))}
          </div>
          <div className={lStyles.empty}>
            Beginner rule: choose Foundation A/B first, keep 2-3 reps in reserve, and add reps before adding weight.
          </div>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Good form guide</div>
              <h3>Reduce injury risk before adding load</h3>
              <p className={lStyles.sectionHint}>Form cues appear automatically in the exercise editor when Lakas recognizes the movement name.</p>
            </div>
          </div>
          <div className={lStyles.formGuideGrid}>
            {FORM_GUIDES.map(guide => (
              <div key={guide.name} className={lStyles.formGuideCard}>
                <strong>{guide.name}</strong>
                <span>{guide.setup}</span>
                <small>{guide.safety}</small>
              </div>
            ))}
          </div>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Routines</div>
              <h3>Build a reusable routine</h3>
              <p className={lStyles.sectionHint}>Start from Beginner Foundation, Push/Pull/Legs, Full Body, Home, or Cardio, then customize before saving.</p>
            </div>
          </div>
          <div className={lStyles.templateRow}>
            {BUILT_IN_ROUTINES.map(template => (
              <button key={template.name} type="button" className={`${lStyles.templateCard} ${template.difficulty === 'Beginner' ? lStyles.templateCardBeginner : ''}`} onClick={() => applyRoutineTemplate(template)}>
                <strong>{template.name}</strong>
                <span>{template.difficulty || template.focus}{template.weeks ? ` · ${template.weeks}` : ''}</span>
                {template.progression && <small>{template.progression}</small>}
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
                    <small>{routine.exercises.slice(0, 3).map(row => formatExerciseLine(row, privacyMode, savedLakasSettings.units.weight)).join(' | ')}</small>
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
              <p className={lStyles.sectionHint}>Load a saved routine or enter exercises manually, then adjust the actual work done.</p>
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
        </>
        )}

        {showActivity && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Steps & activity</div>
              <h3>Log movement</h3>
              <p className={lStyles.sectionHint}>For walks, runs, cardio, errands, commute, and active minutes outside the gym.</p>
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
              <span>Distance ({savedLakasSettings.units.distance})</span>
              <input type="number" min="0" inputMode="decimal" value={activityForm.distance} placeholder="3.5" onChange={event => setActivityForm(current => ({ ...current, distance: event.target.value }))} />
            </label>
            <label>
              <span>Notes</span>
              <input value={activityForm.notes} placeholder="Easy pace, errands, commute" onChange={event => setActivityForm(current => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <button type="button" className={lStyles.primaryBtn} onClick={handleAddActivity}>Save activity</button>
        </section>
        )}

        {showHabits && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Habit check-ins</div>
              <h3>Daily recovery</h3>
              <p className={lStyles.sectionHint}>Tick the basics quickly so recovery becomes visible without becoming a chore.</p>
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
        )}
      </div>
      )}

      {(showBody || showGoals) && (
      <div className={lStyles.grid}>
        {showBody && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Body</div>
              <h3>Body progress</h3>
              <p className={lStyles.sectionHint}>Save measurements and optional progress photos; privacy mode hides sensitive details.</p>
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
              <span>Weight ({savedLakasSettings.units.weight})</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.weight} placeholder="70" onChange={event => setBodyForm(current => ({ ...current, weight: event.target.value }))} />
            </label>
            <label>
              <span>Height ({savedLakasSettings.units.body})</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.height} placeholder="170" onChange={event => setBodyForm(current => ({ ...current, height: event.target.value }))} />
            </label>
            <label>
              <span>Waist ({savedLakasSettings.units.body})</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.waist} placeholder="82" onChange={event => setBodyForm(current => ({ ...current, waist: event.target.value }))} />
            </label>
            <label>
              <span>Chest ({savedLakasSettings.units.body})</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.chest} placeholder="96" onChange={event => setBodyForm(current => ({ ...current, chest: event.target.value }))} />
            </label>
            <label>
              <span>Hips ({savedLakasSettings.units.body})</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.hips} placeholder="94" onChange={event => setBodyForm(current => ({ ...current, hips: event.target.value }))} />
            </label>
            <label>
              <span>Arm ({savedLakasSettings.units.body})</span>
              <input type="number" min="0" inputMode="decimal" value={bodyForm.arm} placeholder="32" onChange={event => setBodyForm(current => ({ ...current, arm: event.target.value }))} />
            </label>
            <label>
              <span>Thigh ({savedLakasSettings.units.body})</span>
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
        )}

        {showGoals && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Goals</div>
              <h3>Lakas goals</h3>
              <p className={lStyles.sectionHint}>Use measurable targets like workouts, steps, kg, protein, days, or your own unit.</p>
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
        )}
      </div>
      )}

      {showMeals && (
      <div className={lStyles.grid}>
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Photo Meal Log</div>
              <h3>Log meal with photo</h3>
              <p className={lStyles.sectionHint}>Photo first, manual nutrition estimate second; ready for future calorie scanning.</p>
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
      )}

      {showSettings && (
      <div className={lStyles.grid}>
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Units & display</div>
              <h3>Lakas preferences</h3>
              <p className={lStyles.sectionHint}>Set the measurement system and privacy behavior used by the fitness space.</p>
            </div>
          </div>
          <div className={lStyles.formGrid}>
            <label>
              <span>Weight</span>
              <select value={settingsForm.units.weight} onChange={event => updateSettingGroup('units', 'weight', event.target.value)}>
                <option value="kg">Kilograms (kg)</option>
                <option value="lb">Pounds (lb)</option>
              </select>
            </label>
            <label>
              <span>Body measurements</span>
              <select value={settingsForm.units.body} onChange={event => updateSettingGroup('units', 'body', event.target.value)}>
                <option value="cm">Centimeters (cm)</option>
                <option value="in">Inches (in)</option>
              </select>
            </label>
            <label>
              <span>Distance</span>
              <select value={settingsForm.units.distance} onChange={event => updateSettingGroup('units', 'distance', event.target.value)}>
                <option value="km">Kilometers (km)</option>
                <option value="mi">Miles (mi)</option>
              </select>
            </label>
            <label>
              <span>Show BMI</span>
              <select value={settingsForm.display.showBmi ? 'yes' : 'no'} onChange={event => updateSettingGroup('display', 'showBmi', event.target.value === 'yes')}>
                <option value="yes">Show BMI</option>
                <option value="no">Hide BMI</option>
              </select>
            </label>
            <label className={lStyles.full}>
              <span>Progress photos in privacy mode</span>
              <select value={settingsForm.display.hideProgressPhotosInPrivacy ? 'hide' : 'show'} onChange={event => updateSettingGroup('display', 'hideProgressPhotosInPrivacy', event.target.value === 'hide')}>
                <option value="hide">Hide progress photos</option>
                <option value="show">Show progress photos</option>
              </select>
            </label>
          </div>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Daily targets</div>
              <h3>What a good day means</h3>
              <p className={lStyles.sectionHint}>These targets guide Lakas summaries without forcing you into a strict plan.</p>
            </div>
          </div>
          <div className={lStyles.formGrid}>
            <label>
              <span>Steps</span>
              <input type="number" min="0" inputMode="numeric" value={settingsForm.targets.steps} onChange={event => updateSettingGroup('targets', 'steps', event.target.value)} />
            </label>
            <label>
              <span>Calories</span>
              <input type="number" min="0" inputMode="numeric" value={settingsForm.targets.calories} onChange={event => updateSettingGroup('targets', 'calories', event.target.value)} />
            </label>
            <label>
              <span>Protein (g)</span>
              <input type="number" min="0" inputMode="numeric" value={settingsForm.targets.protein} onChange={event => updateSettingGroup('targets', 'protein', event.target.value)} />
            </label>
            <label>
              <span>Water glasses</span>
              <input type="number" min="0" inputMode="numeric" value={settingsForm.targets.water} onChange={event => updateSettingGroup('targets', 'water', event.target.value)} />
            </label>
            <label>
              <span>Sleep hours</span>
              <input type="number" min="0" inputMode="decimal" value={settingsForm.targets.sleep} onChange={event => updateSettingGroup('targets', 'sleep', event.target.value)} />
            </label>
            <label>
              <span>Workouts/week</span>
              <input type="number" min="0" inputMode="numeric" value={settingsForm.targets.workoutsPerWeek} onChange={event => updateSettingGroup('targets', 'workoutsPerWeek', event.target.value)} />
            </label>
          </div>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Workout defaults</div>
              <h3>Experience and progression</h3>
              <p className={lStyles.sectionHint}>Beginner mode favors lighter defaults, form cues, and slower progression before heavier plans.</p>
            </div>
          </div>
          <div className={lStyles.formGrid}>
            <label>
              <span>Experience level</span>
              <select value={settingsForm.training.experienceLevel} onChange={event => updateSettingGroup('training', 'experienceLevel', event.target.value)}>
                <option>Beginner</option>
                <option>Returning</option>
                <option>Intermediate</option>
              </select>
            </label>
            <label>
              <span>Progression mode</span>
              <select value={settingsForm.training.progressionMode} onChange={event => updateSettingGroup('training', 'progressionMode', event.target.value)}>
                <option>Guided</option>
                <option>Flexible</option>
              </select>
            </label>
            <label>
              <span>Sets</span>
              <input type="number" min="0" inputMode="numeric" value={settingsForm.workoutDefaults.sets} onChange={event => updateSettingGroup('workoutDefaults', 'sets', event.target.value)} />
            </label>
            <label>
              <span>Reps</span>
              <input type="number" min="0" inputMode="numeric" value={settingsForm.workoutDefaults.reps} onChange={event => updateSettingGroup('workoutDefaults', 'reps', event.target.value)} />
            </label>
            <label>
              <span>Rest seconds</span>
              <input type="number" min="0" inputMode="numeric" value={settingsForm.workoutDefaults.restSeconds} onChange={event => updateSettingGroup('workoutDefaults', 'restSeconds', event.target.value)} />
            </label>
            <label>
              <span>Duration min</span>
              <input type="number" min="0" inputMode="numeric" value={settingsForm.workoutDefaults.durationMinutes} onChange={event => updateSettingGroup('workoutDefaults', 'durationMinutes', event.target.value)} />
            </label>
          </div>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Meals & reminders</div>
              <h3>Fuel and reminder defaults</h3>
              <p className={lStyles.sectionHint}>Keep nutrition and reminder defaults close to the way you actually live.</p>
            </div>
          </div>
          <div className={lStyles.formGrid}>
            <label>
              <span>Calorie goal</span>
              <input type="number" min="0" inputMode="numeric" value={settingsForm.meals.calorieGoal} onChange={event => updateSettingGroup('meals', 'calorieGoal', event.target.value)} />
            </label>
            <label>
              <span>Protein goal</span>
              <input type="number" min="0" inputMode="numeric" value={settingsForm.meals.proteinGoal} onChange={event => updateSettingGroup('meals', 'proteinGoal', event.target.value)} />
            </label>
            <label>
              <span>Macro style</span>
              <select value={settingsForm.meals.macroStyle} onChange={event => updateSettingGroup('meals', 'macroStyle', event.target.value)}>
                <option>Balanced</option>
                <option>High protein</option>
                <option>Cutting</option>
                <option>Bulking</option>
              </select>
            </label>
            <label>
              <span>Workout time</span>
              <input type="time" value={settingsForm.reminders.workoutTime} onChange={event => updateSettingGroup('reminders', 'workoutTime', event.target.value)} />
            </label>
            <label>
              <span>Weigh-in day</span>
              <select value={settingsForm.reminders.weighInDay} onChange={event => updateSettingGroup('reminders', 'weighInDay', event.target.value)}>
                {WEEK_DAYS.map(day => <option key={day}>{day}</option>)}
              </select>
            </label>
            <label>
              <span>Reminder repeat</span>
              <select value={settingsForm.reminders.frequency} onChange={event => updateSettingGroup('reminders', 'frequency', event.target.value)}>
                {REMINDER_FREQUENCIES.map(freq => <option key={freq}>{freq}</option>)}
              </select>
            </label>
          </div>
          <button type="button" className={lStyles.primaryBtn} onClick={handleSaveLakasSettings} disabled={savingSettings}>
            {savingSettings ? 'Saving settings...' : 'Save Lakas settings'}
          </button>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Data controls</div>
              <h3>Lakas-only backup and reset</h3>
              <p className={lStyles.sectionHint}>Export or clear fitness data without touching Takda finance records.</p>
            </div>
          </div>
          <div className={lStyles.settingsActions}>
            <button type="button" className={lStyles.secondaryBtn} onClick={handleExportLakasData}>
              Export Lakas data
            </button>
            <button type="button" className={lStyles.ghostBtn} onClick={handleDeleteLakasData} disabled={deletingLakasData}>
              {deletingLakasData ? 'Deleting...' : 'Delete Lakas logs'}
            </button>
          </div>
          <div className={lStyles.empty}>
            Settings are kept when logs are deleted. Progress photos and meal photos are also removed from storage.
          </div>
        </section>

        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Account</div>
              <h3>Leave this device safely</h3>
              <p className={lStyles.sectionHint}>Log out of Buhay from Lakas without switching back to Takda settings.</p>
            </div>
          </div>
          <button type="button" className={lStyles.ghostBtn} onClick={handleLogout}>
            Log out
          </button>
        </section>
      </div>
      )}

      {(showWorkouts || showActivity || showMeals || showBody || showHabits || showGoals) && (
      <div className={lStyles.timelineGrid}>
        {showWorkouts && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>History</div>
              <h3>Recent workouts</h3>
              <p className={lStyles.sectionHint}>Recent sessions stay scannable with duration, sets, volume, and top exercises.</p>
            </div>
          </div>
          {!workouts.length ? <div className={lStyles.empty}>No workouts logged yet.</div> : workouts.slice(0, 6).map(workout => (
            <div key={workout._id} className={lStyles.rowCard}>
              <div>
                <strong>{workout.title}</strong>
                <span>{formatDisplayDate(workout.date)} · {workout.duration ? `${workout.duration} min` : 'No duration'} · {workout.exerciseCount || 0} exercises · {workout.setCount || 0} sets · {formatNumber(workout.volume || getExerciseTotals(workout.exercises).volume)} {savedLakasSettings.units.weight} volume</span>
                {Array.isArray(workout.exercises) && workout.exercises.length > 0 && (
                  <small>{workout.exercises.slice(0, 3).map(row => formatExerciseLine(row, privacyMode, savedLakasSettings.units.weight)).join(' | ')}</small>
                )}
                {typeof workout.exercises === 'string' && workout.exercises && (
                  <small>{workout.exercises.split('\n').slice(0, 2).join(' | ')}</small>
                )}
              </div>
              <button type="button" onClick={async () => { if (await confirmDeleteApp(workout.title)) await fsDel(user.uid, 'lakasWorkouts', workout._id) }}>Delete</button>
            </div>
          ))}
        </section>
        )}

        {showActivity && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Activity</div>
              <h3>Recent movement</h3>
              <p className={lStyles.sectionHint}>Quick review of steps, cardio, walking, and active minutes.</p>
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
        )}

        {showMeals && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Meals</div>
              <h3>Recent meals</h3>
              <p className={lStyles.sectionHint}>Saved meal photos and macro estimates live here for easy review.</p>
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
        )}

        {showBody && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Progress</div>
              <h3>Body logs</h3>
              <p className={lStyles.sectionHint}>Measurements and photos are summarized without exposing them in privacy mode.</p>
            </div>
          </div>
          {!bodyLogs.length ? <div className={lStyles.empty}>No body logs yet.</div> : bodyLogs.slice(0, 6).map(log => (
            <div key={log._id} className={lStyles.mealRow}>
              {log.photoUrl && !hideBodyPhotos ? <img src={log.photoUrl} alt="" /> : <div className={lStyles.photoPlaceholder}>{log.photoUrl ? 'Hidden' : 'Body'}</div>}
              <div>
                <strong>{formatDisplayDate(log.date)}</strong>
                <span>{log.weight ? displayMetric(log.weight, savedLakasSettings.units.weight, privacyMode) : 'No weight'} · {log.waist ? displayMetric(log.waist, `${savedLakasSettings.units.body} waist`, privacyMode) : 'No waist'} · {!shouldShowBmi ? 'BMI hidden' : privacyMode && log.bmi ? 'BMI ...' : log.bmi ? `BMI ${formatNumber(log.bmi, 1)}` : 'No BMI'}</span>
                <small>{privacyMode ? 'Private measurements' : ['chest', 'hips', 'arm', 'thigh'].map(key => log[key] ? `${key} ${formatNumber(log[key], 1)}${savedLakasSettings.units.body}` : '').filter(Boolean).join(' · ') || log.notes || 'No measurements'}</small>
              </div>
              <button type="button" onClick={async () => { if (await confirmDeleteApp('this body log')) await fsDeleteLakasBodyLog(user.uid, log) }}>Delete</button>
            </div>
          ))}
        </section>
        )}

        {showHabits && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Habits</div>
              <h3>Recent check-ins</h3>
              <p className={lStyles.sectionHint}>A lightweight recovery trail for patterns across the week.</p>
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
        )}

        {showGoals && (
        <section className={lStyles.panel}>
          <div className={lStyles.sectionHeader}>
            <div>
              <div className={lStyles.sectionKicker}>Goal board</div>
              <h3>Tracked goals</h3>
              <p className={lStyles.sectionHint}>Each goal shows progress and lets you add a small update without opening a form.</p>
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
        )}
      </div>
      )}

      {gymSessionMode.open && (
        <div className={lStyles.gymModeOverlay} role="dialog" aria-modal="true" aria-labelledby="gym-session-title">
          <div className={lStyles.gymModeBackdrop} onClick={closeGymSessionMode} aria-hidden="true" />
          <section className={lStyles.gymModeSheet}>
            <div className={lStyles.gymModeHeader}>
              <div>
                <div className={lStyles.gymModeEyebrow}>Gym session mode</div>
                <h3 id="gym-session-title">{activeGymTemplate.name}</h3>
                <p>{activeGymSession.label} · {activeGymCompletedCount}/{activeGymExercises.length} exercises done · {activeGymPlanMinutes} min plan</p>
              </div>
              <button type="button" className={lStyles.gymModeClose} onClick={closeGymSessionMode} aria-label="Close gym session mode">Close</button>
            </div>

            <div className={lStyles.gymModeProgress}>
              <div>
                <span>Elapsed</span>
                <strong>{formatDurationClock(activeGymElapsedSeconds)}</strong>
              </div>
              <div>
                <span>Plan duration</span>
                <strong>{activeGymPlanMinutes} min</strong>
              </div>
              <div>
                <span>Progress</span>
                <strong>{activeGymProgress}%</strong>
              </div>
              <div className={lStyles.gymModeProgressTrack} aria-hidden="true">
                <i style={{ width: `${activeGymProgress}%` }} />
              </div>
            </div>

            <div className={lStyles.gymModeBody}>
              {activeGymVideo ? (
                <div className={lStyles.gymModeVideoCard}>
                  <iframe
                    title={`${activeGymExercise.name || 'Exercise'} form video`}
                    src={getYouTubeEmbedUrl(activeGymVideo.id)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                  <div className={lStyles.gymModeVideoMeta}>
                    <span>{activeGymVideo.title}</span>
                    <a href={`https://www.youtube.com/watch?v=${activeGymVideo.id}`} target="_blank" rel="noreferrer">Open form video</a>
                  </div>
                </div>
              ) : (
                <div className={`${lStyles.gymModeVideoCard} ${lStyles.gymModeVideoEmpty}`}>
                  <div>
                    <span>No curated form video yet</span>
                    <strong>{activeGymExercise.name || 'Exercise'}</strong>
                    <p>Lakas only embeds direct proper-form references here. For this move, use the written cues until a vetted guide is added.</p>
                  </div>
                </div>
              )}

              <div className={lStyles.gymModeCurrentCard}>
                <div className={lStyles.gymModeCurrentTop}>
                  <span>Exercise {activeGymExerciseIndex + 1}</span>
                  <strong>{activeGymExercise.name}</strong>
                </div>
                <div className={lStyles.gymModeStatGrid}>
                  <div><span>Sets</span><strong>{activeGymExercise.sets || 1}</strong></div>
                  <div><span>Reps</span><strong>{activeGymExercise.reps || '-'}</strong></div>
                  <div><span>Work</span><strong>{estimateExerciseMinutes(activeGymExercise)} min</strong></div>
                  <div><span>Rest</span><strong>{activeGymExercise.rest || 0}s</strong></div>
                </div>
                {activeGymGuide && (
                  <div className={lStyles.gymModeCue}>
                    <strong>{activeGymGuide.name} cue</strong>
                    <span>{activeGymGuide.setup}</span>
                    <small>{activeGymGuide.safety}</small>
                  </div>
                )}
                {activeGymExercise.notes && <p className={lStyles.gymModeNotes}>{activeGymExercise.notes}</p>}
                <div className={lStyles.gymModeControls}>
                  <button type="button" className={lStyles.ghostBtn} onClick={() => setGymModeExercise(activeGymExerciseIndex - 1)} disabled={activeGymExerciseIndex === 0}>Previous</button>
                  <button type="button" className={lStyles.secondaryBtn} onClick={completeCurrentGymExercise}>
                    {gymSessionMode.completed?.[activeGymExerciseIndex]
                      ? 'Undo done'
                      : activeGymExerciseIndex >= activeGymExercises.length - 1
                        ? 'Mark done'
                        : 'Done and next'}
                  </button>
                  <button type="button" className={lStyles.ghostBtn} onClick={() => setGymModeExercise(activeGymExerciseIndex + 1)} disabled={activeGymExerciseIndex >= activeGymExercises.length - 1}>Next</button>
                </div>
                <button type="button" className={lStyles.primaryBtn} onClick={handleSaveGymSession}>
                  Save workout log
                </button>
              </div>
            </div>

            <div className={lStyles.gymModeExerciseStrip} aria-label="Gym session exercise list">
              {activeGymExercises.map((exercise, index) => (
                <button
                  key={`${activeGymTemplate.name}-${exercise.name}-${index}`}
                  type="button"
                  className={`${lStyles.gymModeExerciseChip} ${index === activeGymExerciseIndex ? lStyles.gymModeExerciseChipActive : ''} ${gymSessionMode.completed?.[index] ? lStyles.gymModeExerciseChipDone : ''}`}
                  onClick={() => setGymModeExercise(index)}
                  aria-pressed={index === activeGymExerciseIndex}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{exercise.name}</strong>
                  <small>{estimateExerciseMinutes(exercise)} min</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
