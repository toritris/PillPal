import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { initDb } from './db'
import { seedIfEmpty } from './seed'
import { ensureScheduleForDate } from './schedule'
import { registerIpc } from './ipc'
import { rescheduleReminders, scheduleMidnightRollover } from './notifications'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    resizable: true,
    minWidth: 900,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.on('focus', () => {
    ensureScheduleForDate(today())
    rescheduleReminders()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(async () => {
  await initDb()
  seedIfEmpty()
  ensureScheduleForDate(today())
  registerIpc()
  rescheduleReminders()

  scheduleMidnightRollover(() => {
    ensureScheduleForDate(today())
    rescheduleReminders()
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
