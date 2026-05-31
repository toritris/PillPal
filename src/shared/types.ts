export type TimingRule =
  | 'before_food'
  | 'after_food'
  | 'with_food'
  | 'any_time'
  | 'upon_waking'
  | 'before_bed'

export type MedType = 'medicine' | 'supplement'

export type Meal = 'breakfast' | 'lunch' | 'dinner'

export interface Medication {
  id: number
  name: string
  type: MedType
  dose_amount: number
  dose_unit: string
  doses_per_day: number
  timing_rule: TimingRule
  timing_minutes: number | null
  notes: string | null
  start_date: string | null
  end_date: string | null
  active: number // 0 | 1 in SQLite
  paused: number // 0 | 1 in SQLite
}

export interface MealTime {
  id: number
  meal: Meal
  time: string // HH:MM
}

export interface DoseLog {
  id: number
  medication_id: number
  scheduled_date: string // YYYY-MM-DD
  scheduled_time: string // HH:MM
  taken_at: string | null
  slot_label: string
  timing_rule: TimingRule
  timing_minutes: number | null
  // joined from medications
  name?: string
  type?: MedType
  dose_amount?: number
  dose_unit?: string
  notes?: string | null
}

export interface DoseEntry {
  id: number
  medication_id: number
  name: string
  type: MedType
  dose_amount: number
  dose_unit: string
  notes: string | null
  scheduled_time: string
  user_time_override: string | null
  slot_label: string
  timing_rule: TimingRule
  timing_minutes: number | null
  taken_at: string | null
}

export interface DoseGroup {
  time: string // HH:MM (effective: user_time_override ?? scheduled_time)
  label: string
  entries: DoseEntry[]
  allTaken: boolean
  hasTimeOverride: boolean
}

export interface TodayData {
  groups: DoseGroup[]
  taken: number
  total: number
}

export interface DaySummary {
  date: string
  total: number
  taken: number
  status: 'complete' | 'partial' | 'missed' | 'future' | 'empty'
}

export interface MedicationInput {
  name: string
  type: MedType
  dose_amount: number
  dose_unit: string
  doses_per_day: number
  timing_rule: TimingRule
  timing_minutes?: number | null
  notes?: string | null
  start_date?: string | null
  end_date?: string | null
  active?: number
}

export interface AppSettings {
  favoured_anytime_time: string | null
  wake_time: string | null
  bed_time: string | null
}

export interface Api {
  meds: {
    list: (activeOnly?: boolean) => Promise<Medication[]>
    create: (med: MedicationInput) => Promise<Medication>
    update: (id: number, med: Partial<MedicationInput>) => Promise<Medication>
    archive: (id: number) => Promise<void>
    reactivate: (id: number) => Promise<void>
    pause: (id: number) => Promise<void>
    unpause: (id: number) => Promise<void>
  }
  mealTimes: {
    list: () => Promise<MealTime[]>
    update: (meal: Meal, time: string) => Promise<void>
    setDayOverride: (date: string, meal: Meal, newTime: string | null) => Promise<void>
  }
  settings: {
    get: () => Promise<AppSettings>
    update: (patch: Partial<AppSettings>) => Promise<void>
  }
  today: {
    get: (date?: string) => Promise<TodayData>
  }
  dose: {
    toggle: (id: number, taken: boolean) => Promise<void>
    markGroup: (ids: number[], taken: boolean) => Promise<void>
    setGroupTime: (ids: number[], time: string | null) => Promise<void>
  }
  history: {
    getMonth: (year: number, month: number) => Promise<DaySummary[]>
    getDay: (date: string) => Promise<DoseEntry[]>
    streak: () => Promise<number>
  }
}
