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

The installer is output to `dist/PillPal Setup <version>.exe`. The compiled app files land in `dist/win-unpacked/`.

### First-time packaging on Windows

`electron-builder` downloads a signing toolkit that contains macOS symlinks. Windows blocks symlink creation by default, causing the build to fail. Fix it once by pre-extracting the cache manually:

```powershell
# Run from the project root
& ".\node_modules\7zip-bin\win\x64\7za.exe" x -y "-xr!darwin" `
  "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\<any .7z in that folder>" `
  "-o$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0"
```

Replace `<any .7z in that folder>` with an actual filename — electron-builder will have downloaded one during the failed attempt. After this runs once, subsequent `npm run package` calls work normally.

Alternatively, enable **Windows Developer Mode** (Settings → System → For Developers → Developer Mode: On), which grants symlink creation privileges permanently.

### Distributing to others

The installer is unsigned, so Windows SmartScreen will show a "Windows protected your PC" warning when recipients run it. They need to click **More info → Run anyway** to proceed. This is expected for unsigned apps and is safe to dismiss.

For wider distribution without this warning, a code-signing certificate is required (e.g. Azure Trusted Signing at ~$10/month).

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
