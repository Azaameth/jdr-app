<script setup lang="ts">
import { computed } from 'vue'
import type { WeaponArmorItem } from '../models/types/Inventory'
import { formatWeaponArmorStat, weaponArmorStatLabel } from '../utils/inventoryText'

const props = withDefaults(
  defineProps<{
    title: string
    kind: 'weapons' | 'armor'
    items: WeaponArmorItem[]
    editable?: boolean
  }>(),
  {
    editable: true,
  },
)

const emit = defineEmits<{
  'slot-click': [payload: { kind: 'weapons' | 'armor'; item?: WeaponArmorItem }]
}>()

const MIN_SLOTS = 3

function badgeLabel(item: WeaponArmorItem): string {
  return weaponArmorStatLabel(item, props.kind)
}

const slots = computed<Array<WeaponArmorItem | null>>(() => {
  const filled: Array<WeaponArmorItem | null> = [...props.items]
  const emptyCount = Math.max(0, MIN_SLOTS - filled.length)
  return [...filled, ...Array.from({ length: emptyCount }, () => null)]
})

function slotKey(entry: WeaponArmorItem | null, index: number): string {
  return entry ? entry.itemId : `empty-${props.kind}-${index}`
}

function badgeValue(item: WeaponArmorItem): string {
  return formatWeaponArmorStat(item)
}

function handleSlotClick(item?: WeaponArmorItem) {
  if (!props.editable) return
  emit('slot-click', { kind: props.kind, item })
}
</script>

<template>
  <section class="weapon-armor-list">
    <h3 class="list-title">{{ title }}</h3>
    <div class="slot-list">
      <component
        :is="editable ? 'button' : 'div'"
        v-for="(entry, index) in slots"
        :key="slotKey(entry, index)"
        :type="editable ? 'button' : undefined"
        class="slot"
        :class="{ 'slot-empty': !entry }"
        :aria-label="entry ? undefined : 'Emplacement libre'"
        @click="handleSlotClick(entry ?? undefined)"
      >
        <template v-if="entry">
          <span class="slot-name">{{ entry.name }}</span>
          <span v-if="badgeValue(entry)" class="stat-badge">
            <span class="stat-value">{{ badgeValue(entry) }}</span>
            <span class="stat-label">{{ badgeLabel(entry) }}</span>
          </span>
        </template>
        <span v-else class="slot-dash" aria-hidden="true">–</span>
      </component>
    </div>
  </section>
</template>

<style scoped>
.weapon-armor-list {
  min-width: 0;
}
.list-title {
  font-size: 0.85rem;
  color: #c9a84c;
  margin: 0 0 0.5rem;
}
.slot-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.slot {
  background: rgba(45, 30, 10, 0.6);
  border: 1px solid #5c4a2a;
  border-left: 3px solid rgba(212, 168, 67, 0.5);
  border-radius: 6px;
  padding: 0.5rem 0.7rem;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  color: #f2e6cc;
  text-align: left;
  cursor: pointer;
}
.slot:hover {
  border-left-color: #f0c96a;
}
.slot-empty {
  border-style: dashed;
  border-left-style: dashed;
  border-color: rgba(92, 74, 42, 0.6);
  justify-content: center;
  opacity: 0.55;
}
.slot:not(button) {
  cursor: default;
}
.slot-name {
  font-size: 0.9rem;
  font-weight: 600;
  flex: 1;
  min-width: 0;
}
.stat-badge {
  flex-shrink: 0;
  background: rgba(212, 168, 67, 0.12);
  border: 1px solid rgba(212, 168, 67, 0.22);
  border-radius: 8px;
  padding: 0.3rem 0.6rem;
  text-align: center;
  min-width: 56px;
}
.stat-value {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: #f0c96a;
  white-space: nowrap;
}
.stat-label {
  display: block;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: #c9a84c;
  opacity: 0.85;
  margin-top: 0.1rem;
}
.slot-dash {
  color: #806840;
}
</style>
