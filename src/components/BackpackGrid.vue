<script setup lang="ts">
import { computed } from 'vue'
import { BACKPACK_MAX_SLOTS, type InventoryCategory, type InventoryItem } from '../models/types/Inventory'

const props = withDefaults(
  defineProps<{
    items: InventoryItem[]
    editable?: boolean
  }>(),
  {
    editable: true,
  },
)

const emit = defineEmits<{
  'slot-click': [payload: { category: InventoryCategory; item?: InventoryItem }]
}>()

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  nourriture: 'Nourriture',
  munitions: 'Munitions',
  bivouac: 'Matériel de bivouac & camp',
  soins: 'Matériel de soins',
  potions: 'Potions, Poisons, Antidotes',
  quete: 'Objets de quête',
  speciaux: 'Objets spéciaux & Reliques',
  docs: 'Documents, Livres, Titres',
  gemmes: 'Gemmes & Pierres précieuses',
  butin: 'Butin à revendre (ou pas)',
}

/** Column count for each category's slot grid — mirrors legacy layout. */
const CATEGORY_COLS: Record<InventoryCategory, number> = {
  nourriture: 1,
  munitions: 1,
  bivouac: 5,
  soins: 5,
  potions: 5,
  quete: 3,
  speciaux: 3,
  docs: 3,
  gemmes: 3,
  butin: 4,
}

/** Row groupings and column-split, in legacy display order. */
const LAYOUT_ROWS: Array<{ cols?: string; categories: InventoryCategory[] }> = [
  { cols: '2fr 1fr', categories: ['nourriture', 'munitions'] },
  { categories: ['bivouac'] },
  { categories: ['soins'] },
  { categories: ['potions'] },
  { cols: '1fr 1fr', categories: ['quete', 'speciaux'] },
  { cols: '1fr 1fr', categories: ['docs', 'gemmes'] },
  { categories: ['butin'] },
]

function headerText(category: InventoryCategory): string {
  const max = BACKPACK_MAX_SLOTS[category]
  const unit = max > 1 ? 'emplacements' : 'emplacement'
  return `${CATEGORY_LABELS[category]} — ${max} ${unit}`
}

function slotLabel(item: InventoryItem): string {
  return item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name
}

const slotsByCategory = computed<Record<InventoryCategory, Array<InventoryItem | null>>>(() => {
  const result = {} as Record<InventoryCategory, Array<InventoryItem | null>>
  for (const category of Object.keys(CATEGORY_LABELS) as InventoryCategory[]) {
    const filled = props.items.filter((item) => item.category === category)
    const max = BACKPACK_MAX_SLOTS[category]
    const emptyCount = Math.max(0, max - filled.length)
    result[category] = [...filled, ...Array.from({ length: emptyCount }, () => null)]
  }
  return result
})

function slotKey(category: InventoryCategory, entry: InventoryItem | null, index: number): string {
  return entry ? entry.itemId : `empty-${category}-${index}`
}

function handleSlotClick(category: InventoryCategory, item?: InventoryItem) {
  if (!props.editable) return
  emit('slot-click', { category, item })
}
</script>

<template>
  <div class="backpack-grid">
    <div
      v-for="(row, rowIndex) in LAYOUT_ROWS"
      :key="rowIndex"
      class="backpack-row"
      :class="{ 'backpack-row-split': row.categories.length > 1 }"
      :style="row.cols ? { gridTemplateColumns: row.cols } : undefined"
    >
      <section v-for="category in row.categories" :key="category" class="category">
        <h3 class="category-header">{{ headerText(category) }}</h3>
        <div
          class="slot-grid"
          :style="{ gridTemplateColumns: `repeat(${CATEGORY_COLS[category]}, 1fr)` }"
        >
          <component
            :is="editable ? 'button' : 'div'"
            v-for="(entry, index) in slotsByCategory[category]"
            :key="slotKey(category, entry, index)"
            :type="editable ? 'button' : undefined"
            class="slot"
            :class="{ 'slot-empty': !entry }"
            :aria-label="entry ? undefined : 'Emplacement libre'"
            @click="handleSlotClick(category, entry ?? undefined)"
          >
            <span v-if="entry" class="slot-name">{{ slotLabel(entry) }}</span>
            <span v-else class="slot-dash" aria-hidden="true">–</span>
          </component>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.backpack-grid {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.backpack-row {
  display: flex;
  flex-direction: column;
}
.backpack-row-split {
  display: grid;
  gap: 0.75rem;
}
.category-header {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #b8975a;
  margin: 0 0 0.4rem;
  font-weight: 700;
}
.slot-grid {
  display: grid;
  gap: 0.4rem;
}
.slot {
  background: rgba(40, 28, 10, 0.6);
  border: 1px solid #5c4a2a;
  border-radius: 6px;
  min-height: 46px;
  padding: 0.3rem 0.35rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #f2e6cc;
  font-size: 0.75rem;
  line-height: 1.2;
  cursor: pointer;
}
.slot:hover {
  border-color: #f0c96a;
}
.slot-empty {
  border-style: dashed;
  border-color: rgba(92, 74, 42, 0.6);
  opacity: 0.55;
}
.slot:not(button) {
  cursor: default;
}
.slot-dash {
  color: #806840;
}
@media (max-width: 640px) {
  .backpack-row-split {
    grid-template-columns: 1fr !important;
  }
}
</style>
