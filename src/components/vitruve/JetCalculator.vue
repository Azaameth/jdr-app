<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CharacterAttributes } from '../../models/types/Character'
import type { InjuryState, SecondaryAttributeName } from '../../models/types/Participant'
import { clampManualMod, jetTotal, totalTone, JET_CATEGORY_META, type JetCategory } from './jetFormula'
import { adjustedCategoryPct, useTickState } from './tickState'

// Display-only "Calculateur de jet" (FR-005/006/007): computes a jet
// threshold from the active character's attributes/injuries, the ticked
// compétences/race modifiers (WP03's useTickState), and a local manual
// bonus/malus. It NEVER writes to Firestore and never rolls dice — see
// JetCalculator.spec.ts's "display-only" assertion.
const props = defineProps<{
  attributes: CharacterAttributes
  injuries: Partial<Record<SecondaryAttributeName, InjuryState>> | undefined
  contextKey: string
}>()

const category = ref<JetCategory>('physique')
const manualMod = ref(0)

// Character/child context switch (WP06 will pass a child's contextKey too):
// the manual mod and category selection are local UI state, not part of the
// character — reset them so they don't leak across characters. The ticked
// sum itself is reset by the view's existing character-switch watcher
// (tickState.reset(), wired in WP03/PlayerView.vue).
watch(
  () => props.contextKey,
  () => {
    manualMod.value = 0
    category.value = 'physique'
  },
)

const tickState = useTickState()
const tickedSum = computed(() => tickState.sum.value)

const categoryMeta = computed(() => JET_CATEGORY_META[category.value])

const adjBase = computed(() => {
  const meta = categoryMeta.value
  const base = props.attributes.primary[meta.primary]
  const states = meta.subs.map((attr) => props.injuries?.[attr] ?? null)
  return adjustedCategoryPct(base, states)
})

const total = computed(() =>
  jetTotal({ base: adjBase.value, tickedSum: tickedSum.value, manualMod: manualMod.value }),
)
const tone = computed(() => totalTone(total.value))

function selectCategory(key: JetCategory) {
  category.value = key
}

function categoryButtonStyle(key: JetCategory) {
  const meta = JET_CATEGORY_META[key]
  const active = category.value === key
  return {
    borderColor: meta.color,
    color: meta.color,
    background: active ? `${meta.color}33` : 'transparent',
  }
}

function adjustMod(delta: number) {
  manualMod.value = clampManualMod(manualMod.value + delta)
}

function resetMod() {
  manualMod.value = 0
}
</script>

<template>
  <div class="jet-calc">
    <div class="jet-calc-title"><i class="ti ti-dice-5" aria-hidden="true"></i>Calculateur de jet</div>

    <div class="jet-cat-btns">
      <button
        v-for="key in (Object.keys(JET_CATEGORY_META) as JetCategory[])"
        :key="key"
        type="button"
        class="jet-cat-btn"
        :class="{ active: category === key }"
        :style="categoryButtonStyle(key)"
        @click="selectCategory(key)"
      >
        {{ JET_CATEGORY_META[key].short }}
      </button>
    </div>

    <div class="jet-base-row">Base : <span class="jet-base-lbl">{{ adjBase }}%</span></div>

    <div v-if="tickedSum !== 0" class="jet-check-row" :class="{ negative: tickedSum < 0 }">
      Compétences :
      <span class="jet-check-lbl">{{ tickedSum >= 0 ? '+' : '' }}{{ tickedSum }}%</span>
    </div>

    <div class="jet-mod-row">
      <span class="jet-mod-label">Bonus/Malus :</span>
      <button type="button" class="jet-mod-btn minus" aria-label="Diminuer le bonus/malus" @click="adjustMod(-5)">
        −
      </button>
      <span class="jet-mod-lbl">{{ manualMod >= 0 ? '+' : '' }}{{ manualMod }}%</span>
      <button type="button" class="jet-mod-btn plus" aria-label="Augmenter le bonus/malus" @click="adjustMod(5)">
        +
      </button>
      <button type="button" class="jet-mod-reset" aria-label="Réinitialiser le bonus/malus" @click="resetMod">
        ↺
      </button>
    </div>

    <div class="jet-total-row">
      <span class="jet-total-label">Total à atteindre :</span>
      <span class="jet-total" :class="tone">{{ total }}%</span>
    </div>

    <div class="jet-hints-row">
      <span class="jet-hint-min">Min. : 5%</span>
      <span class="jet-hint-max">Max. : 95%</span>
    </div>
  </div>
</template>

<style scoped>
.jet-calc {
  background: rgba(30, 20, 8, 0.85);
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: 10px;
  padding: 12px 14px;
}
.jet-calc-title {
  font-family: 'Cinzel', serif;
  font-size: 13px;
  color: #d4a843;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.jet-calc-title i {
  margin-right: 6px;
}
.jet-cat-btns {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.jet-cat-btn {
  flex: 1;
  padding: 5px 4px;
  font-family: 'Cinzel', serif;
  font-size: 11px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid;
  background: transparent;
}
.jet-base-row {
  font-size: 12px;
  color: #a09070;
  margin-bottom: 6px;
}
.jet-base-lbl {
  color: #d4a843;
  font-weight: bold;
}
.jet-check-row {
  font-size: 12px;
  color: #a09070;
  margin-bottom: 6px;
}
.jet-check-lbl {
  color: #6cc090;
  font-weight: bold;
}
.jet-check-row.negative .jet-check-lbl {
  color: #d07060;
}
.jet-mod-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.jet-mod-label {
  font-size: 12px;
  color: #a09070;
  white-space: nowrap;
}
.jet-mod-btn {
  border-radius: 5px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  border: 1px solid;
}
.jet-mod-btn.minus {
  background: rgba(192, 48, 48, 0.15);
  border-color: rgba(192, 48, 48, 0.3);
  color: #c03030;
}
.jet-mod-btn.plus {
  background: rgba(48, 160, 112, 0.1);
  border-color: rgba(48, 160, 112, 0.3);
  color: #30a070;
}
.jet-mod-lbl {
  font-family: 'Cinzel', serif;
  font-size: 16px;
  color: #f2e6cc;
  min-width: 44px;
  text-align: center;
}
.jet-mod-reset {
  background: none;
  border: 1px solid rgba(212, 168, 67, 0.2);
  color: #907050;
  border-radius: 5px;
  padding: 2px 7px;
  cursor: pointer;
  font-size: 11px;
  margin-left: 2px;
}
.jet-total-row {
  border-top: 1px solid rgba(212, 168, 67, 0.15);
  padding-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.jet-total-label {
  font-size: 12px;
  color: #a09070;
}
.jet-total {
  font-family: 'Cinzel', serif;
  font-size: 26px;
  font-weight: 700;
}
.jet-total.favorable {
  color: #50c050;
}
.jet-total.medium {
  color: #d4a843;
}
.jet-total.risky {
  color: #c03030;
}
.jet-hints-row {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}
.jet-hint-min {
  font-size: 11px;
  color: rgba(192, 48, 48, 0.7);
  font-style: italic;
}
.jet-hint-max {
  font-size: 11px;
  color: rgba(48, 160, 112, 0.7);
  font-style: italic;
}
</style>
