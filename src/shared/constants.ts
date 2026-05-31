import type { TimingRule, Meal } from './types'

export const TIMING_RULE_LABELS: Record<TimingRule, string> = {
  before_food: 'Before food',
  after_food: 'After food',
  with_food: 'With food',
  any_time: 'Any time',
  upon_waking: 'Upon waking',
  before_bed: 'Before bed'
}

export const WAKING_TIME = '07:00'
export const BEDTIME = '22:00'

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner'
}

export const MEALS_ORDER: Meal[] = ['breakfast', 'lunch', 'dinner']

// Default slots for any_time medications (1, 2, or 3 doses)
export const ANYTIME_SLOTS: Record<number, string[]> = {
  1: ['08:00'],
  2: ['08:00', '19:00'],
  3: ['08:00', '13:00', '19:00']
}

export const DEFAULT_MEAL_TIMES: Record<Meal, string> = {
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '19:00'
}

export const IPC = {
  MEDS_LIST: 'meds:list',
  MEDS_CREATE: 'meds:create',
  MEDS_UPDATE: 'meds:update',
  MEDS_ARCHIVE: 'meds:archive',
  MEDS_REACTIVATE: 'meds:reactivate',
  MEDS_PAUSE: 'meds:pause',
  MEDS_UNPAUSE: 'meds:unpause',
  MEAL_TIMES_LIST: 'mealTimes:list',
  MEAL_TIMES_UPDATE: 'mealTimes:update',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  TODAY_GET: 'today:get',
  DOSE_TOGGLE: 'dose:toggle',
  DOSE_MARK_GROUP: 'dose:markGroup',
  DOSE_SET_GROUP_TIME: 'dose:setGroupTime',
  HISTORY_GET_MONTH: 'history:getMonth',
  HISTORY_GET_DAY: 'history:getDay',
  HISTORY_STREAK: 'history:streak',
  MEAL_TIMES_SET_DAY_OVERRIDE: 'mealTimes:setDayOverride'
} as const
