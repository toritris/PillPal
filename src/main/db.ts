import type { Database, BindParams, SqlJsStatic } from 'sql.js'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// Dynamic require prevents Rollup from bundling sql.js inline.
// At runtime, Node.js loads it from node_modules properly.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const initSqlJs: () => Promise<SqlJsStatic> = require('sql.js')

let _db: Database | null = null
let _dbPath: string = ''

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs()
  _dbPath = path.join(app.getPath('userData'), 'pillpal.db')

  if (fs.existsSync(_dbPath)) {
    const fileBuffer = fs.readFileSync(_dbPath)
    _db = new SQL.Database(fileBuffer)
  } else {
    _db = new SQL.Database()
  }

  _db.run('PRAGMA foreign_keys = ON')
  createSchema()
  saveDb()
}

export function getDb(): Database {
  if (!_db) throw new Error('DB not initialized — call initDb() first')
  return _db
}

export function saveDb(): void {
  if (!_db || !_dbPath) return
  const data = _db.export()
  fs.writeFileSync(_dbPath, Buffer.from(data))
}

export function dbQuery<T>(sql: string, params: BindParams = []): T[] {
  const rows: T[] = []
  getDb().each(sql, params, (row) => rows.push(row as unknown as T))
  return rows
}

export function dbOne<T>(sql: string, params: BindParams = []): T | undefined {
  return dbQuery<T>(sql, params)[0]
}

export function dbRun(sql: string, params: BindParams = []): void {
  getDb().run(sql, params)
  saveDb()
}

export function dbLastId(): number {
  const row = dbOne<{ id: number }>('SELECT last_insert_rowid() as id')
  return row?.id ?? 0
}

export function dbTransaction(fn: () => void): void {
  const db = getDb()
  db.run('BEGIN')
  try {
    fn()
    db.run('COMMIT')
    saveDb()
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  }
}

function createSchema(): void {
  const db = getDb()
  db.run(`
    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      dose_amount INTEGER NOT NULL DEFAULT 1,
      dose_unit TEXT NOT NULL DEFAULT 'tab',
      doses_per_day INTEGER NOT NULL DEFAULT 1,
      timing_rule TEXT NOT NULL DEFAULT 'any_time',
      notes TEXT,
      end_date TEXT,
      active INTEGER NOT NULL DEFAULT 1
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS meal_times (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal TEXT NOT NULL UNIQUE,
      time TEXT NOT NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS dose_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      taken_at TEXT,
      slot_label TEXT NOT NULL DEFAULT '',
      timing_rule TEXT NOT NULL DEFAULT 'any_time',
      UNIQUE(medication_id, scheduled_date, scheduled_time),
      FOREIGN KEY (medication_id) REFERENCES medications(id)
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_dose_log_date ON dose_log(scheduled_date)`)
  // Migration: add user_time_override if it doesn't exist yet
  try { db.run('ALTER TABLE dose_log ADD COLUMN user_time_override TEXT') } catch { /* already exists */ }
  // Migration: add paused column to medications
  try { db.run('ALTER TABLE medications ADD COLUMN paused INTEGER NOT NULL DEFAULT 0') } catch { /* already exists */ }
  // Migration: add start_date column to medications
  try { db.run('ALTER TABLE medications ADD COLUMN start_date TEXT') } catch { /* already exists */ }
  // Migration: add timing_minutes and normalize timing_rule to category-only values
  try {
    db.run('ALTER TABLE medications ADD COLUMN timing_minutes INTEGER')
    db.run('ALTER TABLE dose_log ADD COLUMN timing_minutes INTEGER')
    db.run(`UPDATE medications SET timing_rule = 'before_food', timing_minutes = 30 WHERE timing_rule = 'before_food_30'`)
    db.run(`UPDATE medications SET timing_rule = 'before_food', timing_minutes = 20 WHERE timing_rule = 'before_food_20'`)
    db.run(`UPDATE medications SET timing_minutes = 15 WHERE timing_rule = 'after_food'`)
    db.run(`UPDATE medications SET timing_rule = 'after_food', timing_minutes = 15 WHERE timing_rule = 'after_food_no_eat_30'`)
    db.run(`UPDATE dose_log SET timing_rule = 'before_food', timing_minutes = 30 WHERE timing_rule = 'before_food_30'`)
    db.run(`UPDATE dose_log SET timing_rule = 'before_food', timing_minutes = 20 WHERE timing_rule = 'before_food_20'`)
    db.run(`UPDATE dose_log SET timing_minutes = 15 WHERE timing_rule = 'after_food'`)
    db.run(`UPDATE dose_log SET timing_rule = 'after_food', timing_minutes = 15 WHERE timing_rule = 'after_food_no_eat_30'`)
  } catch { /* already exists */ }
  db.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      favoured_anytime_time TEXT
    )
  `)
  db.run(`INSERT OR IGNORE INTO app_settings (id, favoured_anytime_time) VALUES (1, NULL)`)
  try { db.run('ALTER TABLE app_settings ADD COLUMN wake_time TEXT') } catch { /* already exists */ }
  try { db.run('ALTER TABLE app_settings ADD COLUMN bed_time TEXT') } catch { /* already exists */ }
}
