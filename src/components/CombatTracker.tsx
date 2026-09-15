import { useMemo } from 'react'
import { usePersistedState } from '../usePersistedState'
import { emptyEncounter, type Combatant, type EncounterState } from '../types'
import { MONSTER_LIBRARY } from '../data/monsters'
import { AddCombatantPanel } from './AddCombatantPanel'
import { CombatantRow } from './CombatantRow'

export function CombatTracker() {
  const [encounter, setEncounter] = usePersistedState<EncounterState>('dm-toolkit:encounter', emptyEncounter)

  const sorted = useMemo(
    () => [...encounter.combatants].sort((a, b) => b.initiative - a.initiative),
    [encounter.combatants],
  )

  const monsterById = useMemo(() => {
    const map = new Map(MONSTER_LIBRARY.map((m) => [m.id, m]))
    return map
  }, [])

  const addCombatants = (newOnes: Combatant[]) => {
    setEncounter((prev) => ({
      ...prev,
      combatants: [...prev.combatants, ...newOnes],
      activeId: prev.activeId ?? newOnes[0]?.id ?? null,
    }))
  }

  const updateCombatant = (next: Combatant) => {
    setEncounter((prev) => ({
      ...prev,
      combatants: prev.combatants.map((c) => (c.id === next.id ? next : c)),
    }))
  }

  const removeCombatant = (id: string) => {
    setEncounter((prev) => {
      const combatants = prev.combatants.filter((c) => c.id !== id)
      return {
        ...prev,
        combatants,
        activeId: prev.activeId === id ? null : prev.activeId,
      }
    })
  }

  const startEncounter = () => {
    if (sorted.length === 0) return
    setEncounter((prev) => ({ ...prev, started: true, round: 1, activeId: sorted[0].id }))
  }

  const nextTurn = () => {
    if (sorted.length === 0) return
    const idx = sorted.findIndex((c) => c.id === encounter.activeId)
    const nextIdx = idx === -1 ? 0 : (idx + 1) % sorted.length
    const wrapped = idx !== -1 && nextIdx === 0
    setEncounter((prev) => ({
      ...prev,
      activeId: sorted[nextIdx].id,
      round: wrapped ? prev.round + 1 : prev.round,
    }))
  }

  const endEncounter = () => {
    if (!confirm('End encounter and clear the combat tracker?')) return
    setEncounter(emptyEncounter)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">Round</span>
          <span className="text-2xl font-bold text-white">{encounter.round}</span>
        </div>
        <div className="flex gap-2">
          {!encounter.started ? (
            <button
              onClick={startEncounter}
              disabled={sorted.length === 0}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              Start Encounter
            </button>
          ) : (
            <button onClick={nextTurn} className="rounded bg-amber-500 px-4 py-2 text-sm font-bold text-black active:bg-amber-600">
              Next Turn →
            </button>
          )}
          <button onClick={endEncounter} className="rounded bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700">
            End
          </button>
        </div>
      </div>

      <AddCombatantPanel existing={encounter.combatants} onAdd={addCombatants} />

      <div className="flex flex-col gap-2">
        {sorted.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
            Add monsters or PCs above to build the initiative order.
          </p>
        )}
        {sorted.map((c) => (
          <CombatantRow
            key={c.id}
            combatant={c}
            isActive={encounter.started && encounter.activeId === c.id}
            monster={c.monsterTemplateId ? monsterById.get(c.monsterTemplateId) ?? null : null}
            onChange={updateCombatant}
            onRemove={() => removeCombatant(c.id)}
          />
        ))}
      </div>
    </div>
  )
}
