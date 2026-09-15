import { useState } from 'react'
import { MONSTER_LIBRARY } from '../data/monsters'
import type { Combatant } from '../types'

interface Props {
  existing: Combatant[]
  onAdd: (combatants: Combatant[]) => void
}

function rollInitiative(): number {
  return Math.floor(Math.random() * 20) + 1
}

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

export function AddCombatantPanel({ existing, onAdd }: Props) {
  const [mode, setMode] = useState<'monster' | 'pc'>('monster')

  // monster quick-add
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(MONSTER_LIBRARY[0].id)
  const [count, setCount] = useState(1)

  // pc form
  const [pcName, setPcName] = useState('')
  const [pcHp, setPcHp] = useState('')
  const [pcAc, setPcAc] = useState('')

  const filtered = MONSTER_LIBRARY.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))

  const addMonsters = () => {
    const template = MONSTER_LIBRARY.find((m) => m.id === selectedId)
    if (!template) return
    const n = Math.max(1, Math.min(20, count))
    const existingCount = existing.filter((c) => c.monsterTemplateId === template.id).length
    const created: Combatant[] = Array.from({ length: n }, (_, i) => ({
      id: makeId(),
      name: n === 1 ? template.name : `${template.name} ${existingCount + i + 1}`,
      type: 'monster',
      initiative: rollInitiative(),
      maxHp: template.maxHp,
      currentHp: template.maxHp,
      tempHp: 0,
      ac: template.ac,
      conditions: [],
      monsterTemplateId: template.id,
    }))
    onAdd(created)
    setCount(1)
  }

  const addPc = () => {
    if (!pcName.trim()) return
    const hp = Number(pcHp) || 1
    const created: Combatant = {
      id: makeId(),
      name: pcName.trim(),
      type: 'pc',
      initiative: rollInitiative(),
      maxHp: hp,
      currentHp: hp,
      tempHp: 0,
      ac: pcAc ? Number(pcAc) : null,
      conditions: [],
      monsterTemplateId: null,
    }
    onAdd([created])
    setPcName('')
    setPcHp('')
    setPcAc('')
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setMode('monster')}
          className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${mode === 'monster' ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
        >
          + Monster
        </button>
        <button
          onClick={() => setMode('pc')}
          className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${mode === 'pc' ? 'bg-sky-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
        >
          + Player Character
        </button>
      </div>

      {mode === 'monster' ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Search monster…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-32 rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-white outline-none focus:border-rose-400"
          />
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 min-w-[8rem] rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-white outline-none"
          >
            {filtered.length === 0 && <option value={selectedId}>No matches</option>}
            {filtered.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (CR {m.cr})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-400">×</span>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
              className="w-14 rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-center text-sm text-white outline-none"
            />
          </div>
          <button onClick={addMonsters} className="rounded bg-rose-600 px-4 py-2 text-sm font-bold text-white active:bg-rose-700">
            Add
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Name"
            value={pcName}
            onChange={(e) => setPcName(e.target.value)}
            className="min-w-[8rem] flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-white outline-none focus:border-sky-400"
          />
          <input
            type="number"
            placeholder="Max HP"
            value={pcHp}
            onChange={(e) => setPcHp(e.target.value)}
            className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-white outline-none"
          />
          <input
            type="number"
            placeholder="AC"
            value={pcAc}
            onChange={(e) => setPcAc(e.target.value)}
            className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-white outline-none"
          />
          <button onClick={addPc} className="rounded bg-sky-600 px-4 py-2 text-sm font-bold text-white active:bg-sky-700">
            Add
          </button>
        </div>
      )}
    </div>
  )
}
