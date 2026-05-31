import { Notification, BrowserWindow } from 'electron'
import { ensureScheduleForDate, getDayGrouped } from './schedule'

const activeTimers: NodeJS.Timeout[] = []

export function rescheduleReminders(): void {
  for (const t of activeTimers) clearTimeout(t)
  activeTimers.length = 0

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  ensureScheduleForDate(todayStr)
  const groups = getDayGrouped(todayStr)

  for (const group of groups) {
    if (group.allTaken) continue

    const [h, m] = group.time.split(':').map(Number)
    const fireAt = new Date()
    fireAt.setHours(h, m, 0, 0)
    const msUntil = fireAt.getTime() - now.getTime()
    if (msUntil <= 0) continue

    const medNames = group.entries
      .filter((e) => !e.taken_at)
      .map((e) => e.name)
      .join(', ')

    const t = setTimeout(() => {
      if (!Notification.isSupported()) return
      const notif = new Notification({
        title: `Time for: ${group.label}`,
        body: medNames
      })
      notif.on('click', () => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) {
          if (win.isMinimized()) win.restore()
          win.focus()
        }
      })
      notif.show()
    }, msUntil)

    activeTimers.push(t)
  }
}

export function scheduleMidnightRollover(onMidnight: () => void): void {
  const now = new Date()
  const midnight = new Date()
  midnight.setHours(24, 0, 0, 0)
  const msUntilMidnight = midnight.getTime() - now.getTime()
  setTimeout(() => {
    onMidnight()
    setInterval(onMidnight, 24 * 60 * 60 * 1000)
  }, msUntilMidnight)
}
