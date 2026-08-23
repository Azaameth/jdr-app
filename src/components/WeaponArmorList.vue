<script setup lang="ts">
import { computed } from 'vue'
import type { GearEntry } from '../models/repositories/EquipmentRepository'

const props = withDefaults(
  defineProps<{
    title: string
    kind: 'Armor' | 'Weapons'
    items: GearEntry[]
    maxSlots?: number | null
    editable?: boolean
  }>(),
  {
    maxSlots: null,
    editable: true,
  },
)

const emit = defineEmits<{
  'slot-click': [payload: { kind: 'Armor' | 'Weapons'; item?: GearEntry }]
}>()

const MIN_SLOTS = 3

const BONUS_LABELS: Record<string, string> = {
  Health: 'PV',
  Mana: 'MANA',
  PhysicalArmor: 'AP',
  MagicalArmor: 'AM',
  PhysicalAttack: 'ATQ.PHY',
  MagicalAttack: 'ATQ.MAG',
  PhysicalDefense: 'DEF.PHY',
  MagicalDefense: 'DEF.MAG',
}

/** e.g. { PhysicalArmor: 2, Health: 1 } → "+2 AP, +1 PV"; '' when no BonusRaw. */
function bonusSummary(item: GearEntry): string {
  const entries = Object.entries(item.BonusRaw ?? {})
  if (entries.length === 0) return ''
  return entries
    .map(([stat, amount]) => {
      const sign = amount >= 0 ? '+' : '-'
      return `${sign}${Math.abs(amount)} ${BONUS_LABELS[stat] ?? stat}`
    })
    .join(', ')
}

function conditionalTitle(item: GearEntry): string | undefined {
  const conditional = item.BonusConditional ?? []
  if (conditional.length === 0) return undefined
  return conditional.map((c) => c.Name).join(', ')
}

const slotCap = computed(() => props.maxSlots ?? MIN_SLOTS)

const slots = computed<Array<GearEntry | null>>(() => {
  const filled: Array<GearEntry | null> = [...props.items]
  const emptyCount = Math.max(0, slotCap.value - filled.length)
  return [...filled, ...Array.from({ length: emptyCount }, () => null)]
})

function slotKey(entry: GearEntry | null, index: number): string {
  return entry ? entry.EntryId : `empty-${props.kind}-${index}`
}

function handleSlotClick(item?: GearEntry) {
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
        :title="entry ? conditionalTitle(entry) : undefined"
        @click="handleSlotClick(entry ?? undefined)"
      >
        <template v-if="entry">
          <span class="slot-name">{{ entry.DisplayName }}</span>
          <span v-if="bonusSummary(entry)" class="stat-badge">{{ bonusSummary(entry) }}</span>
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
  font-size: 0.7rem;
  font-weight: 700;
  color: #f0c96a;
  white-space: nowrap;
}
.slot-dash {
  color: #806840;
}
</style>
