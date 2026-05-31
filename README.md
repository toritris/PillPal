# PillPal

A calm, local-first desktop medication tracker built with Electron + React + SQLite.

## Prerequisites

- Node.js 18+ (tested on Node 20)
- npm 9+

**Windows only:** `better-sqlite3` uses a native C++ addon. On most machines the prebuilt binary is downloaded automatically. If `npm install` fails with a build error, install the C++ build tools:

```
npm install --global windows-build-tools
# or install "Desktop development with C++" from the Visual Studio Build Tools installer
```

## Setup & development

```bash
npm install
npm run dev
```

The app opens a single 1100×750 window. On first run it seeds 14 medications and default meal times (Breakfast 08:00, Lunch 13:00, Dinner 19:00) into a SQLite database at:

- **Windows:** `%APPDATA%\pillpal\pillpal.db`
- **macOS:** `~/Library/Application Support/pillpal/pillpal.db`
- **Linux:** `~/.config/pillpal/pillpal.db`

## Build / package

```bash
npm run build      # compile only
npm run package    # compile + package with electron-builder
```

Outputs go to `dist/` (compiled) and `release/` (installer).

## How the schedule works

Each medication has a *timing rule* and a *doses per day* count. On startup (and whenever meal times or medications change) the app computes dose times relative to your meal times:

| Rule | Offset |
|---|---|
| Before food (30 min) | meal − 30 min |
| Before food (20 min) | meal − 20 min |
| After food | meal + 15 min |
| After food — no eating 30 min | meal + 15 min + warning shown |
| With food | meal exactly |
| Any time | 08:00 / 13:00 / 19:00 (spread by dose count) |

For medications with doses per day > 1, meals are assigned: 1 → breakfast; 2 → breakfast + dinner; 3 → all three meals.

## Views

- **Today** — chronological timeline of today's doses; tap a checkbox to mark taken
- **Medications** — add, edit, and archive medications
- **Settings** — change meal times (rebuilds today's schedule immediately)
- **History** — calendar of past days; click a day to see taken/missed detail; streak counter

## Reminders

Desktop notifications fire at each scheduled dose time while the app is running. Click a notification to focus the window.
