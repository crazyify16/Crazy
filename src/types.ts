export type ConditionName =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious'
  | 'concentrating'

export const ALL_CONDITIONS: ConditionName[] = [
  'blinded',
  'charmed',
  'deafened',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
  'concentrating',
]

export interface MonsterAction {
  name: string
  text: string
}

export interface MonsterTemplate {
  id: string
  name: string
  cr: string
  ac: number
  maxHp: number
  hpDice: string
  speed: string
  actions: MonsterAction[]
  traits: MonsterAction[]
}

export type CombatantType = 'pc' | 'monster'

export interface Combatant {
  id: string
  name: string
  type: CombatantType
  initiative: number
  maxHp: number
  currentHp: number
  tempHp: number
  ac: number | null
  conditions: ConditionName[]
  monsterTemplateId: string | null
}

export interface EncounterState {
  combatants: Combatant[]
  round: number
  activeId: string | null
  started: boolean
}

export const emptyEncounter: EncounterState = {
  combatants: [],
  round: 1,
  activeId: null,
  started: false,
}
