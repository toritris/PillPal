import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import TodayView from './views/TodayView'
import MedicationsView from './views/MedicationsView'
import SettingsView from './views/SettingsView'
import HistoryView from './views/HistoryView'

export type View = 'today' | 'medications' | 'settings' | 'history'

export default function App(): JSX.Element {
  const [view, setView] = useState<View>('today')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar activeView={view} onNavigate={setView} />
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'today' && <TodayView />}
        {view === 'medications' && <MedicationsView />}
        {view === 'settings' && <SettingsView />}
        {view === 'history' && <HistoryView />}
      </main>
    </div>
  )
}
