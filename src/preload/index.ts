import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/constants'
import type { Api, AppSettings, Meal, MedicationInput } from '../shared/types'

const api: Api = {
  meds: {
    list: (activeOnly?) => ipcRenderer.invoke(IPC.MEDS_LIST, activeOnly),
    create: (med: MedicationInput) => ipcRenderer.invoke(IPC.MEDS_CREATE, med),
    update: (id, med) => ipcRenderer.invoke(IPC.MEDS_UPDATE, id, med),
    archive: (id) => ipcRenderer.invoke(IPC.MEDS_ARCHIVE, id),
    reactivate: (id) => ipcRenderer.invoke(IPC.MEDS_REACTIVATE, id),
    pause: (id) => ipcRenderer.invoke(IPC.MEDS_PAUSE, id),
    unpause: (id) => ipcRenderer.invoke(IPC.MEDS_UNPAUSE, id)
  },
  mealTimes: {
    list: () => ipcRenderer.invoke(IPC.MEAL_TIMES_LIST),
    update: (meal: Meal, time: string) => ipcRenderer.invoke(IPC.MEAL_TIMES_UPDATE, meal, time),
    setDayOverride: (date: string, meal: Meal, newTime: string | null) =>
      ipcRenderer.invoke(IPC.MEAL_TIMES_SET_DAY_OVERRIDE, date, meal, newTime)
  },
  today: {
    get: (date?) => ipcRenderer.invoke(IPC.TODAY_GET, date)
  },
  dose: {
    toggle: (id, taken) => ipcRenderer.invoke(IPC.DOSE_TOGGLE, id, taken),
    markGroup: (ids, taken) => ipcRenderer.invoke(IPC.DOSE_MARK_GROUP, ids, taken),
    setGroupTime: (ids, time) => ipcRenderer.invoke(IPC.DOSE_SET_GROUP_TIME, ids, time)
  },
  history: {
    getMonth: (year, month) => ipcRenderer.invoke(IPC.HISTORY_GET_MONTH, year, month),
    getDay: (date) => ipcRenderer.invoke(IPC.HISTORY_GET_DAY, date),
    streak: () => ipcRenderer.invoke(IPC.HISTORY_STREAK)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
    update: (patch: Partial<AppSettings>) => ipcRenderer.invoke(IPC.SETTINGS_UPDATE, patch)
  }
}

contextBridge.exposeInMainWorld('api', api)

// Extend Window type for TypeScript
declare global {
  interface Window {
    api: Api
  }
}
