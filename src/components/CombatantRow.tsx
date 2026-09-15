import { useState } from 'react'
import type { Combatant, ConditionName, MonsterTemplate } from '../types'
import { ALL_CONDITIONS } from '../types'

interface Props {
  combatant: Combatant
  isActive: boolean
  monster: MonsterTemplate | null
  onChange: (next: Combatant) => void
  onRemove: () => void
}

export function CombatantRow({ combatant: c, isActive, monster, onChange, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [amount, setAmount] = useState('')

  const applyDelta = (sign: 1 | -1) => {
    const n = Number(amount)
    if (!amount || Number.isNaN(n) || n <= 0) return
    let dmg = sign === -1 ? n : 0
    let heal = sign === 1 ? n : 0
    let tempHp = c.tempHp
    let currentHp = c.currentHp

    if (dmg > 0) {
      const fromTemp = Math.min(tempHp, dmg)
      tempHp -= fromTemp
      dmg -= fromTemp
      currentHp = Math.max(0, currentHp - dmg)
    }
    if (heal > 0) {
      currentHp = Math.min(c.maxHp, currentHp + heal)
    }
    onChange({ ...c, currentHp, tempHp })
    setAmount('')
  }

  const toggleCondition = (cond: ConditionName) => {
    const has = c.conditions.includes(cond)
    onChange({
      ...c,
      conditions: has ? c.conditions.filter((x) => x !== cond) : [...c.conditions, cond],
    })
  }

  const isDown = c.currentHp <= 0
  const hpPct = c.maxHp > 0 ? Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100)) : 0

  return (
    <div
      className={`rounded-lg border p-3 transition ${
        isActive ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/50' : 'border-zinc-700 bg-zinc-900'
      } ${isDown ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-col gap-2">
        {/* line 1: init, name, stats toggle, remove */}
        <div className="flex items-center gap-2">
          <div className="flex min-w-[3rem] shrink-0 flex-col items-center rounded bg-zinc-800 px-2 py-1">
            <span className="text-[10px] uppercase text-zinc-400">Init</span>
            <input
              type="number"
              value={c.initiative}
              onChange={(e) => onChange({ ...c, initiative: Number(e.target.value) || 0 })}
              className="w-10 bg-transparent text-center text-lg font-bold text-white outline-none"
            />
          </div>
          <span className={`h-2 w-2 shrink-0 rounded-full ${c.type === 'pc' ? 'bg-sky-400' : 'bg-rose-400'}`} />
          <input
            value={c.name}
            onChange={(e) => onChange({ ...c, name: e.target.value })}
            className="min-w-0 flex-1 truncate bg-transparent text-base font-semibold text-white outline-none"
          />
          {monster && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="shrink-0 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              stats {expanded ? '▲' : '▼'}
            </button>
          )}
          <button onClick={onRemove} className="shrink-0 px-1 text-zinc-500 hover:text-rose-400" aria-label="Remove combatant">
            ✕
          </button>
        </div>

        {/* line 2: hp bar + labels */}
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full ${hpPct > 50 ? 'bg-emerald-500' : hpPct > 20 ? 'bg-amber-500' : 'bg-rose-600'}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <div className="mt-0.5 flex gap-3 text-xs text-zinc-400">
            <span>
              HP {c.currentHp}/{c.maxHp}
              {c.tempHp > 0 ? ` (+${c.tempHp})` : ''}
            </span>
            <span>AC {c.ac ?? '—'}</span>
          </div>
        </div>

        {/* line 3: damage/heal controls — always its own row */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="amt"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-center text-sm text-white outline-none focus:border-rose-400"
          />
          <button
            onClick={() => applyDelta(-1)}
            className="flex-1 rounded bg-rose-600 px-3 py-2 text-sm font-bold text-white active:bg-rose-700"
          >
            Dmg
          </button>
          <button
            onClick={() => applyDelta(1)}
            className="flex-1 rounded bg-emerald-600 px-3 py-2 text-sm font-bold text-white active:bg-emerald-700"
          >
            Heal
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {ALL_CONDITIONS.map((cond) => {
          const active = c.conditions.includes(cond)
          return (
            <button
              key={cond}
              onClick={() => toggleCondition(cond)}
              className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${
                active ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {cond}
            </button>
          )
        })}
      </div>

      {expanded && monster && (
        <div className="mt-3 rounded border border-zinc-700 bg-zinc-950 p-3 text-left text-sm text-zinc-300">
          <div className="mb-1 flex gap-4 text-xs text-zinc-400">
            <span>AC {monster.ac}</span>
            <span>HP {monster.maxHp} ({monster.hpDice})</span>
            <span>Speed {monster.speed}</span>
            <span>CR {monster.cr}</span>
          </div>
          {monster.traits.length > 0 && (
            <div className="mb-2">
              {monster.traits.map((t) => (
                <p key={t.name}>
                  <span className="font-semibold text-zinc-100">{t.name}.</span> {t.text}
                </p>
              ))}
            </div>
          )}
          <div>
            <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-500">Actions</p>
            {monster.actions.map((a) => (
              <p key={a.name}>
                <span className="font-semibold text-zinc-100">{a.name}.</span> {a.text}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
