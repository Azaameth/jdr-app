<script lang="ts">
import type { GearEntry } from '../models/repositories/EquipmentRepository'
import type { BagItemDocument } from '../models/repositories/ItemRepository'
import type { BaseStatKey } from '../utils/effectiveStats'

export type InventorySlotContext =
  | { kind: 'bag'; item?: BagItemDocument }
  | { kind: 'Armor' | 'Weapons'; item?: GearEntry }

export type InventorySlotSavePayload =
  | {
      kind: 'bag'
      item: Omit<BagItemDocument, 'EntryId' | 'PlayerId' | 'CampaignId'> & { EntryId?: string }
    }
  | { kind: 'Armor' | 'Weapons'; item: Omit<GearEntry, 'EntryId'> & { EntryId?: string } }

export type InventorySlotDeletePayload = {
  kind: 'bag' | 'Armor' | 'Weapons'
  entryId: string
}

export type InventorySlotMovePayload = {
  direction: 'equip' | 'unequip'
  kind: 'Armor' | 'Weapons'
  entryId: string
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppModal from './AppModal.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    context: InventorySlotContext
    errorMessage?: string | null
  }>(),
  {
    errorMessage: null,
  },
)

const emit = defineEmits<{
  close: []
  save: [payload: InventorySlotSavePayload]
  delete: [payload: InventorySlotDeletePayload]
  move: [payload: InventorySlotMovePayload]
}>()

const BASE_STAT_OPTIONS: Array<{ value: BaseStatKey; label: string }> = [
  { value: 'Health', label: 'Santé' },
  { value: 'Mana', label: 'Mana' },
  { value: 'PhysicalArmor', label: 'Armure physique' },
  { value: 'MagicalArmor', label: 'Armure magique' },
  { value: 'PhysicalAttack', label: 'Attaque physique' },
  { value: 'MagicalAttack', label: 'Attaque magique' },
  { value: 'PhysicalDefense', label: 'Défense physique' },
  { value: 'MagicalDefense', label: 'Défense magique' },
]

const name = ref('')
const description = ref('')
const quantityText = ref('')
type BonusRow = { stat: BaseStatKey; amountText: string }
const bonusRawRows = ref<BonusRow[]>([])
type ConditionalRow = { name: string; stat: BaseStatKey; amountText: string }
const conditionalRows = ref<ConditionalRow[]>([])

const isEditing = computed(() => Boolean(props.context.item))
const isBag = computed(() => props.context.kind === 'bag')

function resetForm() {
  const ctx = props.context
  const item = ctx.item as (BagItemDocument | GearEntry | undefined)
  name.value = item?.DisplayName ?? ''
  description.value = item?.Description ?? ''
  quantityText.value =
    ctx.kind === 'bag' && ctx.item && ctx.item.Quantity > 1 ? String(ctx.item.Quantity) : ''
  bonusRawRows.value = Object.entries(item?.BonusRaw ?? {}).map(([stat, amount]) => ({
    stat: stat as BaseStatKey,
    amountText: String(amount),
  }))
  conditionalRows.value = (item?.BonusConditional ?? []).flatMap((conditional) =>
    Object.entries(conditional.Effects).map(([stat, amount]) => ({
      name: conditional.Name,
      stat: stat as BaseStatKey,
      amountText: String(amount),
    })),
  )
}

watch(
  () => [props.open, props.context],
  () => {
    if (props.open) {
      resetForm()
    }
  },
  { immediate: true, deep: true },
)

function addBonusRow() {
  bonusRawRows.value.push({ stat: 'Health', amountText: '' })
}

function removeBonusRow(index: number) {
  bonusRawRows.value.splice(index, 1)
}

function addConditionalRow() {
  conditionalRows.value.push({ name: '', stat: 'Health', amountText: '' })
}

function removeConditionalRow(index: number) {
  conditionalRows.value.splice(index, 1)
}

function parsePositiveInt(text: string | number): number | null {
  // `<input type="number">` can hand back a numeric value in some environments
  // (e.g. jsdom via @vue/test-utils' setValue) rather than the string v-model
  // normally binds; coerce defensively either way.
  const trimmed = String(text).trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null
}

function buildBonusRaw(): Record<string, number> | undefined {
  const entries: Array<[string, number]> = []
  for (const row of bonusRawRows.value) {
    const amount = Number.parseInt(String(row.amountText).trim(), 10)
    if (Number.isFinite(amount) && amount !== 0) {
      entries.push([row.stat, amount])
    }
  }
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function buildBonusConditional(): GearEntry['BonusConditional'] {
  const conditional = conditionalRows.value
    .filter((row) => row.name.trim())
    .map((row) => {
      const amount = Number.parseInt(String(row.amountText).trim(), 10)
      return {
        Name: row.name.trim(),
        Effects: Number.isFinite(amount) && amount !== 0 ? { [row.stat]: amount } : {},
      }
    })
    .filter((row) => Object.keys(row.Effects).length > 0)
  return conditional.length > 0 ? conditional : undefined
}

function handleClose() {
  emit('close')
}

function handleSave() {
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    // Legacy behavior: an empty name on save just closes the modal, no-op.
    emit('close')
    return
  }

  const trimmedDescription = description.value.trim()
  const bonusRaw = buildBonusRaw()
  const bonusConditional = buildBonusConditional()

  const ctx = props.context
  if (ctx.kind === 'bag') {
    emit('save', {
      kind: 'bag',
      item: {
        EntryId: ctx.item?.EntryId,
        DisplayName: trimmedName,
        ...(trimmedDescription ? { Description: trimmedDescription } : {}),
        ...(bonusRaw ? { BonusRaw: bonusRaw } : {}),
        ...(bonusConditional ? { BonusConditional: bonusConditional } : {}),
        Quantity: parsePositiveInt(quantityText.value) ?? 1,
      },
    })
    return
  }

  emit('save', {
    kind: ctx.kind,
    item: {
      EntryId: ctx.item?.EntryId,
      DisplayName: trimmedName,
      ...(trimmedDescription ? { Description: trimmedDescription } : {}),
      ...(bonusRaw ? { BonusRaw: bonusRaw } : {}),
      ...(bonusConditional ? { BonusConditional: bonusConditional } : {}),
    },
  })
}

function handleDelete() {
  const ctx = props.context
  if (!ctx.item) return
  emit('delete', { kind: ctx.kind, entryId: ctx.item.EntryId })
}

function handleEquip(kind: 'Armor' | 'Weapons') {
  const ctx = props.context
  if (ctx.kind !== 'bag' || !ctx.item) return
  emit('move', { direction: 'equip', kind, entryId: ctx.item.EntryId })
}

function handleUnequip() {
  const ctx = props.context
  if (ctx.kind === 'bag' || !ctx.item) return
  emit('move', { direction: 'unequip', kind: ctx.kind, entryId: ctx.item.EntryId })
}
</script>

<template>
  <AppModal :open="open" title="Modifier l'emplacement" @close="handleClose">
    <form class="inventory-slot-form" @submit.prevent="handleSave">
      <label class="field-label" for="inv-slot-name">Nom de l'objet</label>
      <input
        id="inv-slot-name"
        v-model="name"
        type="text"
        placeholder="ex : Kit médical"
        class="field-input"
      />

      <label class="field-label" for="inv-slot-description">
        Description <span class="field-optional">(optionnel)</span>
      </label>
      <textarea
        id="inv-slot-description"
        v-model="description"
        rows="2"
        placeholder="ex : D10/+4, ou une note libre"
        class="field-input field-textarea"
      />

      <template v-if="isBag">
        <label class="field-label" for="inv-slot-quantity">
          Quantité <span class="field-optional">(optionnel)</span>
        </label>
        <input
          id="inv-slot-quantity"
          v-model="quantityText"
          type="number"
          min="1"
          placeholder="ex : 4"
          class="field-input"
        />
      </template>

      <div class="bonus-section">
        <div class="bonus-header">
          <span class="field-label">Bonus fixes <span class="field-optional">(optionnel)</span></span>
          <button type="button" class="bonus-add" @click="addBonusRow">+ Ajouter</button>
        </div>
        <div v-for="(row, index) in bonusRawRows" :key="index" class="bonus-row">
          <select v-model="row.stat" class="field-input bonus-stat">
            <option v-for="opt in BASE_STAT_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <input v-model="row.amountText" type="number" placeholder="ex : 2" class="field-input bonus-amount" />
          <button type="button" class="bonus-remove" @click="removeBonusRow(index)">✕</button>
        </div>
      </div>

      <div class="bonus-section">
        <div class="bonus-header">
          <span class="field-label">
            Bonus conditionnels <span class="field-optional">(optionnel, jamais matérialisés)</span>
          </span>
          <button type="button" class="bonus-add" @click="addConditionalRow">+ Ajouter</button>
        </div>
        <div v-for="(row, index) in conditionalRows" :key="index" class="bonus-row">
          <input v-model="row.name" type="text" placeholder="ex : Enraciné" class="field-input bonus-name" />
          <select v-model="row.stat" class="field-input bonus-stat">
            <option v-for="opt in BASE_STAT_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <input
            v-model="row.amountText"
            type="number"
            placeholder="ex : 2"
            class="field-input bonus-amount"
          />
          <button type="button" class="bonus-remove" @click="removeConditionalRow(index)">✕</button>
        </div>
      </div>

      <p v-if="errorMessage" class="inventory-slot-error">{{ errorMessage }}</p>

      <div class="inventory-slot-actions">
        <button type="submit" class="inventory-slot-save">Valider</button>
        <button
          v-if="isEditing"
          type="button"
          class="inventory-slot-delete"
          @click="handleDelete"
        >
          Supprimer
        </button>
      </div>

      <div v-if="isEditing && isBag" class="inventory-slot-move">
        <button type="button" class="inventory-slot-move-btn" @click="handleEquip('Weapons')">
          Équiper comme arme
        </button>
        <button type="button" class="inventory-slot-move-btn" @click="handleEquip('Armor')">
          Équiper comme armure
        </button>
      </div>
      <div v-else-if="isEditing" class="inventory-slot-move">
        <button type="button" class="inventory-slot-move-btn" @click="handleUnequip">
          Déséquiper
        </button>
      </div>
    </form>
  </AppModal>
</template>

<style scoped>
.inventory-slot-form {
  display: flex;
  flex-direction: column;
}
.field-label {
  font-size: 0.72rem;
  color: #8a6a30;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 0.35rem;
}
.field-optional {
  color: #604830;
  font-style: italic;
  text-transform: none;
  letter-spacing: normal;
}
.field-input {
  width: 100%;
  background: rgba(50, 36, 16, 0.9);
  border: 1px solid rgba(212, 168, 67, 0.4);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  color: #f2e6cc;
  font-size: 0.95rem;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 0.85rem;
}
.field-textarea {
  resize: vertical;
  font-family: inherit;
}
.inventory-slot-error {
  color: #ffb0b0;
  font-size: 0.85rem;
  margin: -0.3rem 0 0.85rem;
}
.inventory-slot-actions {
  display: flex;
  gap: 0.5rem;
}
.inventory-slot-save {
  flex: 1;
  background: linear-gradient(135deg, rgba(160, 120, 32, 0.5), rgba(212, 168, 67, 0.3));
  border: 1px solid rgba(212, 168, 67, 0.5);
  color: #f2e6cc;
  border-radius: 7px;
  padding: 0.55rem;
  font-size: 0.85rem;
  cursor: pointer;
  letter-spacing: 0.05em;
}
.inventory-slot-delete {
  background: rgba(192, 48, 48, 0.15);
  border: 1px solid rgba(192, 48, 48, 0.4);
  color: #d06050;
  border-radius: 7px;
  padding: 0.55rem 0.85rem;
  font-size: 0.85rem;
  cursor: pointer;
}
.bonus-section {
  margin-bottom: 0.5rem;
}
.bonus-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}
.bonus-add {
  background: none;
  border: 1px solid rgba(212, 168, 67, 0.35);
  color: #c9a84c;
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  font-size: 0.72rem;
  cursor: pointer;
}
.bonus-row {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
  align-items: center;
}
.bonus-row .field-input {
  margin-bottom: 0;
}
.bonus-stat {
  flex: 2;
}
.bonus-name {
  flex: 2;
}
.bonus-amount {
  flex: 1;
  min-width: 0;
}
.bonus-remove {
  background: none;
  border: 1px solid rgba(192, 48, 48, 0.4);
  color: #d06050;
  border-radius: 6px;
  padding: 0.4rem 0.55rem;
  font-size: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
}
.inventory-slot-move {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.6rem;
}
.inventory-slot-move-btn {
  flex: 1;
  background: none;
  border: 1px dashed rgba(212, 168, 67, 0.35);
  color: #a89a7c;
  border-radius: 7px;
  padding: 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
}
.inventory-slot-move-btn:hover {
  color: #f0c96a;
  border-color: #d4a843;
}
</style>
