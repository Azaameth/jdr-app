<script setup lang="ts">
import { computed } from 'vue'
import type { CharacterProfile } from '../../models/types/Character'
import type {
  CharacterSessionState,
  InjuryState,
  Posture,
  SecondaryAttributeName,
} from '../../models/types/Participant'
import type { Race } from '../../models/types/Race'
import { adjustedCategoryPct, useTickState, type TickEntry } from './tickState'
// Review cycle 1 (WP04 review): CaracTab used to hard-code its own
// category → primary/subs mapping, duplicating JET_CATEGORY_META in
// jetFormula.ts (WP04-owned). Importing the shared source here keeps the
// physique/social/mental → primary attribute + subs mapping single-sourced
// so the two files cannot silently drift. Out-of-map edit on CaracTab.vue
// (WP03-owned), sanctioned by the WP04 reviewer — coordination recorded in
// review-cycle-1.md and the WP04 handoff note.
import { JET_CATEGORY_META, type JetCategory } from './jetFormula'
// WP06: the category-block markup (label/bar/pct + injury-square subs) is now
// shared with ChildSheetTab via this extracted component, so the child mini-
// sheet renders byte-identical carac blocks instead of a second copy. See
// CaracCategoryBlock.vue's header comment for the sanctioned out-of-map note.
import CaracCategoryBlock from './CaracCategoryBlock.vue'

const props = withDefaults(
  defineProps<{
    character: CharacterProfile
    session: CharacterSessionState | null
    canEdit: boolean
    race?: Race | null
    postureOptions: Array<{ value: Posture; label: string; tone: string }>
    sessionLoading?: 'hp' | 'mana' | 'posture' | null
  }>(),
  {
    race: null,
    sessionLoading: null,
  },
)

const emit = defineEmits<{
  'set-injury': [attr: SecondaryAttributeName, state: InjuryState | null]
  'set-posture': [posture: Posture]
}>()

const tickState = useTickState()

// --- Category blocks (Physique / Social / Mental) ---------------------

interface CategorySub {
  attr: SecondaryAttributeName
  label: string
  value: number
  state: InjuryState | null
}

interface CategoryView {
  key: 'physique' | 'social' | 'mental'
  label: string
  adjPct: number
  pinned: boolean
  subs: CategorySub[]
}

// Category mapping (physique/social/mental → primary attribute + subs) is
// derived from the shared JET_CATEGORY_META (jetFormula.ts) — see import
// comment above. Only the sub-attribute display labels are local
// presentation data; the key→primary/subs structure itself has exactly one
// source of truth.
const SUB_LABELS: Record<SecondaryAttributeName, string> = {
  puissance: 'Puissance',
  finesse: 'Finesse',
  aura: 'Aura',
  relation: 'Relation',
  instinct: 'Instinct',
  savoir: 'Savoir',
}

const CATEGORY_ORDER: JetCategory[] = ['physique', 'social', 'mental']

const categories = computed<CategoryView[]>(() => {
  const injuries = props.session?.injuries ?? {}
  const secondary = props.character.attributes.secondary
  const defs: Array<{
    key: CategoryView['key']
    label: string
    base: number
    subs: Array<{ attr: SecondaryAttributeName; label: string }>
  }> = CATEGORY_ORDER.map((key) => {
    const meta = JET_CATEGORY_META[key]
    return {
      key,
      label: meta.label,
      base: props.character.attributes.primary[meta.primary],
      subs: meta.subs.map((attr) => ({ attr, label: SUB_LABELS[attr] })),
    }
  })

  return defs.map((def) => {
    const subs: CategorySub[] = def.subs.map((sub) => ({
      ...sub,
      value: secondary[sub.attr],
      state: injuries[sub.attr] ?? null,
    }))
    const states = subs.map((sub) => sub.state)
    return {
      key: def.key,
      label: def.label,
      adjPct: adjustedCategoryPct(def.base, states),
      pinned: states.length > 0 && states.every((state) => state === 'rouge'),
      subs,
    }
  })
})

// Cycle saine → jaune → rouge → saine; emits the NEXT state.
function cycleInjury(attr: SecondaryAttributeName) {
  if (!props.canEdit) return
  const current = props.session?.injuries?.[attr] ?? null
  const next: InjuryState | null =
    current === null ? 'jaune' : current === 'jaune' ? 'rouge' : null
  emit('set-injury', attr, next)
}

// --- Compétences (rank × 10%, excluding the 6 secondary-attribute names) --

const MAIN_SKILL_KEYS = ['puissance', 'finesse', 'aura', 'relation', 'instinct', 'savoir']

const competenceExtras = computed(() =>
  (props.character.skills ?? []).filter((skill) => {
    const low = skill.name.toLowerCase()
    // Excludes the plain names and "savoir (xxx)"-style variants of the six
    // secondary attributes — matches legacy vitruveShowPanel's `extras` filter.
    return !MAIN_SKILL_KEYS.some((key) => low === key || low.startsWith(`${key} (`))
  }),
)

function skillEntry(skillId: string, name: string, rank: number): TickEntry {
  return { key: `skill:${skillId}`, label: name, value: rank * 10 }
}

// --- Bonus & malus de race --------------------------------------------
// CharacterProfile carries no per-character race-bonus field (legacy's
// `race_bonus` free text has no equivalent in the new model). The race
// document itself (src/models/types/Race.ts) carries `bon`/`mal` string
// arrays (e.g. "Agilité +20%") — that's the structured data this section
// renders. Section is omitted entirely when no race data is available.

interface RaceModifierEntry extends TickEntry {
  kind: 'bonus' | 'malus'
  hasValue: boolean
}

function parseRaceEntry(text: string): { label: string; value: number; hasValue: boolean } {
  const match = text.match(/^(.*?)\s*([+−-]\s*\d+)%?\s*$/)
  if (!match) return { label: text, value: 0, hasValue: false }
  const label = (match[1] ?? '').trim() || text
  const raw = (match[2] ?? '').replace(/−/g, '-').replace(/\s+/g, '')
  const parsed = Number.parseInt(raw, 10)
  return { label, value: Number.isNaN(parsed) ? 0 : parsed, hasValue: !Number.isNaN(parsed) }
}

const raceModifiers = computed<RaceModifierEntry[]>(() => {
  const race = props.race
  if (!race) return []
  const bonus = (race.bon ?? []).map((text, index) => {
    const { label, value, hasValue } = parseRaceEntry(text)
    return { key: `race:bonus:${index}`, label, value, hasValue, kind: 'bonus' as const }
  })
  const malus = (race.mal ?? []).map((text, index) => {
    const { label, value, hasValue } = parseRaceEntry(text)
    return { key: `race:malus:${index}`, label, value, hasValue, kind: 'malus' as const }
  })
  return [...bonus, ...malus]
})

// --- Posture ------------------------------------------------------------

const POSTURE_FX: Record<Posture, { icon: string; lines: string[] }> = {
  FOCUS: {
    icon: '✨',
    lines: [
      'Dégâts normaux (lance le dé)',
      'Bonus +5% sur tous les jets',
      'Coût Mana réduit de 1',
      "Pas d'esquive possible",
    ],
  },
  OFFENSIF: {
    icon: '⚔',
    lines: [
      'Dégâts maximum automatiques',
      'Zone critique élargie +5%',
      'Aucune esquive ou parade possible',
    ],
  },
  DEFENSIF: {
    icon: '🛡',
    lines: ['Dégâts normaux', '1 esquive ou 1 parade par tour', 'Pas de bonus offensif'],
  },
}

const currentPostureFx = computed(() => {
  const posture = props.session?.posture
  if (!posture) return null
  return POSTURE_FX[posture]
})
</script>

<template>
  <div class="carac-tab">
    <h2 class="tab-head">Caractéristiques</h2>

    <div class="summary-cards">
      <div class="vcard">
        <div class="vcard-lbl">PV / {{ session?.maxHp ?? '—' }}</div>
        <div class="vcard-val big pv">{{ session?.hp ?? '—' }}</div>
      </div>
      <div class="vcard">
        <div class="vcard-lbl">Mana / {{ session?.maxMana ?? '—' }}</div>
        <div class="vcard-val big mana">{{ session?.mana ?? '—' }}</div>
      </div>
      <div class="vcard">
        <div class="vcard-lbl">Niveau</div>
        <div class="vcard-val big">{{ character.level }}</div>
      </div>
      <div class="vcard posture-card">
        <div class="vcard-lbl">Posture</div>
        <div class="posture-buttons">
          <button
            v-for="opt in postureOptions"
            :key="opt.value"
            type="button"
            class="posture-btn"
            :class="[opt.tone, { active: session?.posture === opt.value }]"
            :disabled="sessionLoading === 'posture'"
            @click="emit('set-posture', opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
        <details v-if="currentPostureFx" class="posture-fx">
          <summary>{{ currentPostureFx.icon }} Effets de la posture</summary>
          <ul>
            <li v-for="line in currentPostureFx.lines" :key="line">{{ line }}</li>
          </ul>
        </details>
      </div>
    </div>

    <div class="carac-categories">
      <CaracCategoryBlock
        v-for="cat in categories"
        :key="cat.key"
        :label="cat.label"
        :adj-pct="cat.adjPct"
        :pinned="cat.pinned"
        :subs="cat.subs"
        :can-edit="canEdit"
        @cycle-injury="cycleInjury"
      />
    </div>

    <div class="section-head">Compétences</div>
    <p v-if="!competenceExtras.length" class="empty-note">Aucune compétence spéciale.</p>
    <div v-else class="tick-list">
      <label v-for="skill in competenceExtras" :key="skill.id" class="tick-row">
        <span class="tick-label">{{ skill.name }}</span>
        <span class="tick-value">{{ skill.rank * 10 }}%</span>
        <input
          type="checkbox"
          :checked="tickState.isTicked(`skill:${skill.id}`)"
          @change="tickState.toggle(skillEntry(skill.id, skill.name, skill.rank))"
        />
      </label>
    </div>

    <template v-if="raceModifiers.length">
      <div class="section-head">Bonus &amp; malus de race</div>
      <div class="tick-list">
        <label
          v-for="mod in raceModifiers"
          :key="mod.key"
          class="tick-row"
          :class="mod.kind"
        >
          <span class="tick-label">{{ mod.label }}</span>
          <span class="tick-value">
            <template v-if="mod.hasValue">{{ mod.value > 0 ? '+' + mod.value : mod.value }}%</template>
          </span>
          <input
            type="checkbox"
            :checked="tickState.isTicked(mod.key)"
            @change="tickState.toggle(mod)"
          />
        </label>
      </div>
    </template>
  </div>
</template>

<style scoped>
.carac-tab {
  min-width: 0;
}
.tab-head {
  font-size: 1rem;
  color: #f0c96a;
  margin: 0 0 0.75rem;
}
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.6rem;
  margin-bottom: 1.1rem;
}
.vcard {
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(212, 168, 67, 0.15);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  text-align: center;
  min-width: 0;
}
.vcard-lbl {
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8a6a30;
  margin-bottom: 0.2rem;
}
.vcard-val.big {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f2e6cc;
}
.vcard-val.big.pv {
  color: #e05050;
}
.vcard-val.big.mana {
  color: #5090e0;
}
.posture-buttons {
  display: flex;
  gap: 3px;
}
.posture-btn {
  flex: 1;
  background: none;
  border: 1px solid rgba(212, 168, 67, 0.2);
  color: rgba(212, 168, 67, 0.5);
  border-radius: 5px;
  padding: 0.25rem 0.15rem;
  font-size: 0.72rem;
  cursor: pointer;
}
.posture-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.posture-btn.active.focus {
  background: rgba(80, 140, 200, 0.25);
  border-color: #5090d0;
  color: #80c0f0;
}
.posture-btn.active.off {
  background: rgba(192, 60, 40, 0.25);
  border-color: #c04030;
  color: #e07060;
}
.posture-btn.active.def {
  background: rgba(192, 168, 40, 0.2);
  border-color: #c0a830;
  color: #d4a843;
}
.posture-fx {
  margin-top: 0.4rem;
  text-align: left;
  font-size: 0.75rem;
}
.posture-fx summary {
  cursor: pointer;
  color: #a89a7c;
}
.posture-fx ul {
  margin: 0.35rem 0 0;
  padding-left: 1rem;
  color: #c8b888;
}
.carac-categories {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1rem;
}
/* .carac-cat and its descendants (header/bar/pct/subs/injury-square) moved to
   CaracCategoryBlock.vue (WP06) — shared with ChildSheetTab. */
.section-head {
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #a09070;
  margin: 1rem 0 0.5rem;
}
.empty-note {
  color: #a09070;
  font-style: italic;
  margin: 0;
  padding: 0.4rem 0;
}
.tick-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.tick-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.7rem;
  background: rgba(0, 0, 0, 0.18);
  border-radius: 7px;
  cursor: pointer;
}
.tick-row.malus {
  border-left: 3px solid rgba(192, 60, 40, 0.5);
}
.tick-row.bonus {
  border-left: 3px solid rgba(48, 160, 112, 0.5);
}
.tick-label {
  flex: 1;
  color: #e0d8c8;
}
.tick-value {
  font-weight: 700;
  color: #a09070;
  min-width: 44px;
  text-align: right;
}
.tick-row input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: #d4a843;
  cursor: pointer;
}

@media (max-width: 767px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
