<script setup lang="ts">
// Extracted from CaracTab.vue (WP03) so WP06's ChildSheetTab can render the
// exact same Physique/Social/Mental block markup+styling for a child
// character's carac-tab without duplicating it. Out-of-map edit on
// CaracTab.vue (WP03-owned), sanctioned by the WP06 task file ("REUSE the
// category-block rendering from CaracTab.vue ... extract CaracCategoryBlock.vue
// within CaracTab.vue's file family"). Purely presentational — injury-state
// cycling logic (saine→jaune→rouge→saine) stays with the caller (CaracTab /
// ChildSheetTab), which knows whether to write to `session` or `childSessions`.
import type { InjuryState, SecondaryAttributeName } from '../../models/types/Participant'

export interface CaracCategorySub {
  attr: SecondaryAttributeName
  label: string
  value: number
  state: InjuryState | null
}

const props = defineProps<{
  label: string
  adjPct: number
  pinned: boolean
  subs: CaracCategorySub[]
  canEdit: boolean
}>()

const emit = defineEmits<{
  'cycle-injury': [attr: SecondaryAttributeName]
}>()

function onSquareClick(sub: CaracCategorySub) {
  if (!props.canEdit) return
  emit('cycle-injury', sub.attr)
}
</script>

<template>
  <div class="carac-cat" :class="{ pinned }">
    <div class="cat-header">
      <div class="cat-label">{{ label }}</div>
      <div class="cat-bar">
        <div class="cat-bar-fill" :style="{ width: adjPct + '%' }"></div>
      </div>
      <div class="cat-pct">{{ adjPct }}%</div>
    </div>
    <div class="cat-subs">
      <div v-for="sub in subs" :key="sub.attr" class="sub-row" :class="sub.state">
        <div class="sub-label">{{ sub.label }}</div>
        <div class="sub-val">{{ sub.state === 'rouge' ? '—' : sub.value }}</div>
        <button
          type="button"
          class="injury-square"
          :class="sub.state"
          :disabled="!canEdit"
          :aria-label="`État de ${sub.label} : ${sub.state ?? 'saine'}`"
          title="Cliquer pour changer l'état"
          @click="onSquareClick(sub)"
        ></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.carac-cat {
  background: rgba(45, 30, 10, 0.4);
  border: 1px solid rgba(212, 168, 67, 0.15);
  border-radius: 10px;
  padding: 0.8rem 1rem;
}
.carac-cat.pinned {
  border: 2px solid #c03030;
}
.cat-header {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 0.5rem;
}
.cat-label {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #d4a843;
  min-width: 80px;
}
.carac-cat.pinned .cat-label,
.carac-cat.pinned .cat-pct {
  color: #c03030;
}
.cat-bar {
  flex: 1;
  height: 8px;
  background: rgba(212, 168, 67, 0.08);
  border-radius: 4px;
  overflow: hidden;
}
.cat-bar-fill {
  height: 100%;
  background: currentColor;
  color: #d4a843;
  opacity: 0.7;
}
.carac-cat.pinned .cat-bar-fill {
  color: #c03030;
}
.cat-pct {
  font-size: 1.3rem;
  font-weight: 700;
  color: #d4a843;
  min-width: 48px;
  text-align: right;
}
.cat-subs {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.sub-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.6rem;
  background: rgba(0, 0, 0, 0.22);
  border-radius: 8px;
}
.sub-row.rouge {
  opacity: 0.4;
}
.sub-label {
  flex: 1;
  color: #e0d8c8;
}
.sub-row.rouge .sub-label {
  color: #807060;
  text-decoration: line-through;
}
.sub-val {
  font-weight: 700;
  min-width: 30px;
  text-align: center;
  color: #d4a843;
}
.sub-row.jaune .sub-val {
  color: #d4a843;
}
.injury-square {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: 2px solid rgba(212, 168, 67, 0.35);
  background: transparent;
  flex-shrink: 0;
  cursor: pointer;
  padding: 0;
}
.injury-square:disabled {
  cursor: not-allowed;
}
.injury-square.jaune {
  background: #d4a843;
  border-color: #d4a843;
}
.injury-square.rouge {
  background: #c03030;
  border-color: #c03030;
}
</style>
