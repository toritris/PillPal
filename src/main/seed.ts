import { getDb, dbOne, dbTransaction, saveDb } from './db'
import { DEFAULT_MEAL_TIMES } from '../shared/constants'

export function seedIfEmpty(): void {
  const medCount = dbOne<{ c: number }>('SELECT COUNT(*) as c FROM medications')?.c ?? 0
  if (medCount === 0) seedMedications()

  const mealCount = dbOne<{ c: number }>('SELECT COUNT(*) as c FROM meal_times')?.c ?? 0
  if (mealCount === 0) seedMealTimes()
}

function seedMealTimes(): void {
  const db = getDb()
  dbTransaction(() => {
    for (const [meal, time] of Object.entries(DEFAULT_MEAL_TIMES)) {
      db.run('INSERT OR IGNORE INTO meal_times (meal, time) VALUES (?, ?)', [meal, time])
    }
  })
}

function seedMedications(): void {
  const db = getDb()
  const sixWeeksOut = new Date()
  sixWeeksOut.setDate(sixWeeksOut.getDate() + 42)
  const nystEnd = sixWeeksOut.toISOString().slice(0, 10)

  const meds: [string, string, number, string, number, string, number | null, string | null, string | null][] = [
    ['Metformin', 'medicine', 1, 'tab', 2, 'with_food', null, '500mg', null],
    ['Lisinopril', 'medicine', 1, 'tab', 1, 'any_time', null, '10mg', null],
    ['Vitamin D', 'supplement', 1, 'tab', 1, 'with_food', null, '1000 IU', null],
    ['Omega-3 Fish Oil', 'supplement', 2, 'tab', 1, 'with_food', null, null, null],
    ['Magnesium', 'supplement', 1, 'tab', 1, 'any_time', null, null, null],
    ['Probiotic', 'supplement', 1, 'tab', 1, 'before_food', 30, null, null],
    ['Amoxicillin', 'medicine', 1, 'tab', 3, 'after_food', 15, '500mg — 7-day course', nystEnd],
  ]

  dbTransaction(() => {
    for (const [name, type, doseAmt, doseUnit, dpd, rule, timingMins, notes, endDate] of meds) {
      db.run(
        `INSERT INTO medications (name, type, dose_amount, dose_unit, doses_per_day, timing_rule, timing_minutes, notes, end_date, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [name, type, doseAmt, doseUnit, dpd, rule, timingMins, notes, endDate]
      )
    }
  })
}
