<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { BagItemDocument } from '../models/repositories/ItemRepository'

const props = withDefaults(
  defineProps<{
    items: BagItemDocument[]
    maxItems?: number | null
    currency?: number
    editable?: boolean
  }>(),
  {
    maxItems: null,
    currency: 0,
    editable: true,
  },
)

const emit = defineEmits<{
  'slot-click': [item?: BagItemDocument]
  'update-currency': [value: number]
}>()

const MIN_SLOTS = 8

function slotLabel(item: BagItemDocument): string {
  return item.Quantity > 1 ? `${item.DisplayName} ×${item.Quantity}` : item.DisplayName
}

const slotCap = computed(() => props.maxItems ?? Math.max(MIN_SLOTS, props.items.length))

const slots = computed<Array<BagItemDocument | null>>(() => {
  const filled: Array<BagItemDocument | null> = [...props.items]
  const emptyCount = Math.max(0, slotCap.value - filled.length)
  return [...filled, ...Array.from({ length: emptyCount }, () => null)]
})

function slotKey(entry: BagItemDocument | null, index: number): string {
  return entry ? entry.EntryId : `empty-${index}`
}

function handleSlotClick(item?: BagItemDocument) {
  if (!props.editable) return
  emit('slot-click', item)
}

const currencyText = ref(String(props.currency))

watch(
  () => props.currency,
  (value) => {
    currencyText.value = String(value)
  },
)

function commitCurrency() {
  // `<input type="number">` can hand back a numeric value in some environments
  // (e.g. jsdom via @vue/test-utils' setValue) rather than the string v-model
  // normally binds; coerce defensively either way.
  const trimmed = String(currencyText.value).trim()
  const parsed = Number.parseInt(trimmed, 10)
  const nextValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : props.currency
  currencyText.value = String(nextValue)
  if (nextValue !== props.currency) {
    emit('update-currency', nextValue)
  }
}
</script>

<template>
  <div class="backpack-grid">
    <section class="category">
      <h3 class="category-header">Monnaie</h3>
      <input
        type="number"
        min="0"
        class="currency-input"
        :disabled="!editable"
        v-model="currencyText"
        aria-label="Monnaie"
        @blur="commitCurrency"
        @keydown.enter="commitCurrency"
      />
    </section>

    <section class="category">
      <h3 class="category-header">
        Sac à dos
        <span v-if="maxItems !== null">— {{ items.length }}/{{ maxItems }}</span>
      </h3>
      <div class="slot-grid">
        <component
          :is="editable ? 'button' : 'div'"
          v-for="(entry, index) in slots"
          :key="slotKey(entry, index)"
          :type="editable ? 'button' : undefined"
          class="slot"
          :class="{ 'slot-empty': !entry }"
          :aria-label="entry ? undefined : 'Emplacement libre'"
          :title="entry?.Description"
          @click="handleSlotClick(entry ?? undefined)"
        >
          <span v-if="entry" class="slot-name">{{ slotLabel(entry) }}</span>
          <span v-else class="slot-dash" aria-hidden="true">–</span>
        </component>
      </div>
    </section>
  </div>
</template>

<style scoped>
.backpack-grid {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
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
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
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
.currency-input {
  background: rgba(40, 28, 10, 0.6);
  border: 1px solid #5c4a2a;
  border-radius: 6px;
  min-height: 46px;
  padding: 0.3rem 0.35rem;
  color: #f2e6cc;
  font-size: 0.85rem;
  text-align: center;
  width: 100%;
  max-width: 160px;
  box-sizing: border-box;
}
.currency-input:focus {
  outline: none;
  border-color: #f0c96a;
}
.currency-input:disabled {
  opacity: 0.7;
  cursor: default;
}
</style>
