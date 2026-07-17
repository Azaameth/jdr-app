<script lang="ts">
import type { InventoryCategory, InventoryItem, WeaponArmorItem } from '../models/types/Inventory'

export type InventorySlotContext =
  | { kind: 'backpack'; category: InventoryCategory; item?: InventoryItem }
  | { kind: 'weapons' | 'armor'; item?: WeaponArmorItem }

export type InventorySlotSavePayload =
  | { kind: 'backpack'; item: Omit<InventoryItem, 'itemId'> & { itemId?: string } }
  | { kind: 'weapons' | 'armor'; item: Omit<WeaponArmorItem, 'itemId'> & { itemId?: string } }

export type InventorySlotDeletePayload = {
  kind: 'backpack' | 'weapons' | 'armor'
  itemId: string
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppModal from './AppModal.vue'
import { formatWeaponArmorStat, parseWeaponArmorText } from '../utils/inventoryText'

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
}>()

const name = ref('')
const quantityText = ref('')
const statText = ref('')

const isEditing = computed(() => Boolean(props.context.item))

const statLabel = computed(() =>
  props.context.kind === 'weapons' ? 'Dégâts / particularité' : 'Armure (RD) / particularité',
)
const statPlaceholder = computed(() =>
  props.context.kind === 'weapons' ? 'ex : D10/+4' : 'ex : RD4 ou Résiste au feu',
)

function resetForm() {
  const ctx = props.context
  if (ctx.kind === 'backpack') {
    name.value = ctx.item?.name ?? ''
    quantityText.value = ctx.item && ctx.item.quantity > 1 ? String(ctx.item.quantity) : ''
    statText.value = ''
  } else {
    name.value = ctx.item?.name ?? ''
    statText.value = ctx.item ? formatWeaponArmorStat(ctx.item) : ''
    quantityText.value = ''
  }
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

function parsePositiveInt(text: string | number): number | null {
  // `<input type="number">` can hand back a numeric value in some environments
  // (e.g. jsdom via @vue/test-utils' setValue) rather than the string v-model
  // normally binds; coerce defensively either way.
  const trimmed = String(text).trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null
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

  const ctx = props.context
  if (ctx.kind === 'backpack') {
    emit('save', {
      kind: 'backpack',
      item: {
        itemId: ctx.item?.itemId,
        name: trimmedName,
        category: ctx.category,
        quantity: parsePositiveInt(quantityText.value) ?? 1,
      },
    })
    return
  }

  const stat = statText.value.trim()
  const parsed = parseWeaponArmorText(stat ? `${trimmedName} (${stat})` : trimmedName)
  emit('save', {
    kind: ctx.kind,
    item: {
      itemId: ctx.item?.itemId,
      ...parsed,
    },
  })
}

function handleDelete() {
  const ctx = props.context
  if (!ctx.item) return
  emit('delete', { kind: ctx.kind, itemId: ctx.item.itemId })
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

      <template v-if="context.kind === 'backpack'">
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
      <template v-else>
        <label class="field-label" for="inv-slot-stat">{{ statLabel }}</label>
        <input
          id="inv-slot-stat"
          v-model="statText"
          type="text"
          :placeholder="statPlaceholder"
          class="field-input"
        />
      </template>

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
</style>
