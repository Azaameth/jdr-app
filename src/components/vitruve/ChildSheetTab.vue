<script setup lang="ts">
import { computed } from 'vue'
import type { CharacterProfile } from '../../models/types/Character'
import type { CharacterStateDocument } from '../../models/repositories/CharacterStateRepository'
import type { WeaponArmorItem } from '../../models/types/Inventory'
import type { InjuryState, SecondaryAttributeName } from '../../models/types/Participant'
import CaracCategoryBlock, { type CaracCategorySub } from './CaracCategoryBlock.vue'
import { adjustedCategoryPct } from './tickState'
import { JET_CATEGORY_META, type JetCategory } from './jetFormula'
import { computeArmorTotal, computeEffectiveMaxStat } from '../../utils/effectiveStats'

// Child-character mini-sheet (FR-015): "Forme" tab for a child (transformation,
// e.g. Furmiaou) of the currently displayed character. Generalizes legacy's
// hardcoded buildFurmHTML (legacy-reference/index.html ~l.3496) — portrait
// banner, PV ± card, Mana card ("Aucune magie" when maxMana===0), element
// badges, then the three carac category blocks (Physique/Social/Mental) with
// the child's OWN injury squares. Reuses CaracCategoryBlock.vue (extracted
// from CaracTab.vue this WP) so the block markup/styling never drifts.
const props = defineProps<{
  child: CharacterProfile
  state: CharacterStateDocument | null
  canEdit: boolean
  equipment?: WeaponArmorItem[]
}>()

const emit = defineEmits<{
  'adjust-hp': [delta: number]
  'set-injury': [attr: SecondaryAttributeName, state: InjuryState | null]
}>()

// A child is its own Character doc with its own States/Current (Cluster 3b) —
// but one with no bootstrapped state yet (e.g. added via the raw editor,
// before its first ± click) has no "seeded max" to read. This all-zero
// fallback is what gets displayed and is what the first ± click starts
// adjusting from, so it can never read `undefined + delta` and produce NaN.
// Once PlayerView's first write persists, the real doc takes over via the
// `state` prop.
const FALLBACK_STATE: CharacterStateDocument = {
  Health: 0,
  HealthCurrent: 0,
  Mana: 0,
  ManaCurrent: 0,
  Posture: 'FOCUS',
  PlayerId: '',
  CampaignId: '',
}

const state = computed(() => props.state ?? FALLBACK_STATE)

const SUB_LABELS: Record<SecondaryAttributeName, string> = {
  puissance: 'Puissance',
  finesse: 'Finesse',
  aura: 'Aura',
  relation: 'Relation',
  instinct: 'Instinct',
  savoir: 'Savoir',
}

const CATEGORY_ORDER: JetCategory[] = ['physique', 'social', 'mental']

interface ChildCategoryView {
  key: JetCategory
  label: string
  adjPct: number
  pinned: boolean
  subs: CaracCategorySub[]
}

const categories = computed<ChildCategoryView[]>(() => {
  const injuries = state.value.Injuries ?? {}
  const secondary = props.child.attributes.secondary

  return CATEGORY_ORDER.map((key) => {
    const meta = JET_CATEGORY_META[key]
    const subs: CaracCategorySub[] = meta.subs.map((attr) => ({
      attr,
      label: SUB_LABELS[attr],
      value: secondary[attr],
      state: injuries[attr] ?? null,
    }))
    const states = subs.map((sub) => sub.state)
    return {
      key,
      label: meta.label,
      adjPct: adjustedCategoryPct(props.child.attributes.primary[meta.primary], states),
      pinned: states.length > 0 && states.every((state) => state === 'rouge'),
      subs,
    }
  })
})

// Cycle saine → jaune → rouge → saine, same rule as CaracTab's cycleInjury —
// emits the NEXT state; PlayerView owns the actual persistence path
// (playerStore.setInjury against this child's own States/Current doc).
function cycleInjury(attr: SecondaryAttributeName) {
  if (!props.canEdit) return
  const current = state.value.Injuries?.[attr] ?? null
  const next: InjuryState | null =
    current === null ? 'jaune' : current === 'jaune' ? 'rouge' : null
  emit('set-injury', attr, next)
}

// Effective max HP/Mana (FR-004/FR-005): base state max plus bonuses from
// this child's OWN equipped items only — never the parent's (SC-004,
// research.md D3). `props.equipment` is sourced by PlayerView from
// `useInventoryStore().childInventories.value[child.id]`, isolated from the
// parent's singleton `inventory` ref.
const effectiveMaxHp = computed(() =>
  computeEffectiveMaxStat(state.value.Health, props.equipment ?? [], 'maxHp'),
)
const effectiveMaxMana = computed(() =>
  computeEffectiveMaxStat(state.value.Mana, props.equipment ?? [], 'maxMana'),
)
const armorTotal = computed(() => computeArmorTotal(props.equipment ?? []))

// Mirrors VitruveSheet's hp clamp display (PlayerView's clampSessionValue
// allows hp down to -maxHp, not just 0 — same convention here for the child).
const hpMinusDisabled = computed(
  () => !props.canEdit || state.value.HealthCurrent <= -effectiveMaxHp.value,
)
const hpPlusDisabled = computed(
  () => !props.canEdit || state.value.HealthCurrent >= effectiveMaxHp.value,
)

const hasMana = computed(() => effectiveMaxMana.value > 0)

function imageUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const clean = path.replace(/^\//, '')
  return `${import.meta.env.BASE_URL}${clean}`
}
</script>

<template>
  <div class="child-sheet-tab">
    <h2 class="tab-head child-head">{{ child.name }} — Forme</h2>

    <div class="child-portrait">
      <img
        v-if="child.img"
        class="portrait"
        :src="imageUrl(child.img)"
        :alt="`Portrait de ${child.name}`"
      />
      <div v-else class="child-portrait-fallback">
        <i class="ti ti-paw" aria-hidden="true"></i>
      </div>
    </div>

    <div class="summary-cards">
      <div class="vcard">
        <div class="vcard-lbl">PV / {{ effectiveMaxHp }}</div>
        <div class="vcard-val big pv">{{ state.HealthCurrent }}</div>
        <div v-if="canEdit" class="child-hp-btns">
          <button
            type="button"
            class="child-hp-btn"
            :disabled="hpMinusDisabled"
            aria-label="Diminuer les PV"
            @click="emit('adjust-hp', -1)"
          >
            −
          </button>
          <button
            type="button"
            class="child-hp-btn"
            :disabled="hpPlusDisabled"
            aria-label="Augmenter les PV"
            @click="emit('adjust-hp', 1)"
          >
            +
          </button>
        </div>
      </div>

      <div class="vcard">
        <div class="vcard-lbl">Mana / {{ effectiveMaxMana }}</div>
        <div class="vcard-val big mana">{{ state.ManaCurrent }}</div>
        <p v-if="!hasMana" class="no-mana-note">Aucune magie</p>
      </div>
    </div>

    <div class="armor-cell">
      <span class="armor-total">{{ armorTotal.total }}</span>
      <span class="armor-label">Armure</span>
      <span class="armor-breakdown">AM {{ armorTotal.magique }} · AP {{ armorTotal.physique }}</span>
    </div>

    <div v-if="child.elements.length" class="element-badges">
      <span v-for="element in child.elements" :key="element" class="element-badge">
        {{ element }}
      </span>
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
  </div>
</template>

<style scoped>
.child-sheet-tab {
  min-width: 0;
}
.tab-head {
  font-size: 1rem;
  margin: 0 0 0.75rem;
}
.child-head {
  color: #7fbf7a;
}
.child-portrait {
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 180px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 14px;
  border: 1px solid rgba(74, 160, 80, 0.3);
  background: rgba(0, 0, 0, 0.2);
}
.portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
  display: block;
}
.child-portrait-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(74, 160, 80, 0.35);
  font-size: 3rem;
}
.summary-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
  margin-bottom: 1.1rem;
}
.vcard {
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(74, 160, 80, 0.2);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  text-align: center;
  min-width: 0;
}
.vcard-lbl {
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #4a7040;
  margin-bottom: 0.2rem;
}
.vcard-val.big {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f2e6cc;
}
.vcard-val.big.pv {
  color: #50c050;
}
.vcard-val.big.mana {
  color: #9050c0;
}
.child-hp-btns {
  display: flex;
  gap: 4px;
  justify-content: center;
  margin-top: 6px;
}
.child-hp-btn {
  background: none;
  border: 1px solid rgba(74, 160, 80, 0.25);
  color: #4a7040;
  border-radius: 4px;
  padding: 1px 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}
.child-hp-btn:hover:not(:disabled) {
  border-color: #4a9050;
  background: rgba(74, 160, 80, 0.1);
}
.child-hp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.no-mana-note {
  font-size: 0.72rem;
  color: #6a5a8a;
  font-style: italic;
  margin: 0.25rem 0 0;
}
.armor-cell {
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(74, 160, 80, 0.2);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  text-align: center;
  margin-bottom: 1rem;
}
.armor-total {
  font-size: 1.3rem;
  font-weight: 700;
  color: #f2e6cc;
}
.armor-label {
  font-size: 0.72rem;
  color: #a89a7c;
  margin-left: 6px;
}
.armor-breakdown {
  display: block;
  font-size: 0.68rem;
  color: #a89a7c;
  margin-top: 2px;
}
.element-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.element-badge {
  font-size: 0.78rem;
  padding: 3px 10px;
  border: 1px solid rgba(160, 80, 200, 0.35);
  color: #9050c0;
  border-radius: 4px;
}
.carac-categories {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

@media (max-width: 767px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
}
</style>
