import { CombatTracker } from './components/CombatTracker'

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight">🐉 DM Toolkit</h1>
        <nav className="mt-2 flex gap-2 text-sm">
          <span className="rounded bg-rose-600 px-3 py-1 font-semibold text-white">Combat Tracker</span>
          <span className="rounded bg-zinc-900 px-3 py-1 text-zinc-500" title="Coming later">
            NPCs
          </span>
          <span className="rounded bg-zinc-900 px-3 py-1 text-zinc-500" title="Coming later">
            Notes
          </span>
        </nav>
      </header>
      <CombatTracker />
    </div>
  )
}

export default App
