<script setup lang="ts">
import { computed } from 'vue'
import AppModal from './AppModal.vue'
import type { CharacterGift } from '../models/types/Character'

const props = withDefaults(
  defineProps<{
    open: boolean
    gift: CharacterGift | null
  }>(),
  {
    gift: null,
  },
)

const emit = defineEmits<{
  close: []
}>()

// Same leading-emoji convention as DonList: extract the decorative glyph for
// the header icon, and strip it from the displayed name. The variation
// selector (U+FE0F) is matched as its own optional atom, not inside the
// character class, so it isn't flagged as a misleading combining sequence.
const LEADING_EMOJI = /^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])\u{FE0F}?\s*/u
const FALLBACK_ICON = '✦'

const icon = computed(() => {
  const match = props.gift?.name.match(LEADING_EMOJI)
  return match?.[1] ?? FALLBACK_ICON
})

const label = computed(() => props.gift?.name.replace(LEADING_EMOJI, '').trim() ?? '')

const manaTile = computed(() => {
  const gift = props.gift
  if (!gift) return '—'
  if (gift.manaCost !== undefined) return `${gift.manaCost} mana`
  if (gift.manaNote) return gift.manaNote
  return '—'
})

const damageTile = computed(() => props.gift?.damageDice ?? '—')

// A signed bonus of exactly 0 reads as "no bonus" — FR-010 forbids
// synthesizing/displaying misleading zeros.
const bonusTile = computed(() => {
  const bonus = props.gift?.damageBonus
  if (bonus === undefined || bonus === 0) return '—'
  return bonus > 0 ? `+${bonus}` : String(bonus)
})

function handleClose() {
  emit('close')
}
</script>

<template>
  <AppModal :open="open" :title="label" @close="handleClose">
    <template #header>
      <div class="don-modal-header">
        <span class="don-modal-icon" aria-hidden="true">{{ icon }}</span>
        <h2 class="don-modal-title">{{ label }}</h2>
      </div>
    </template>

    <div class="don-modal-tiles">
      <div class="don-tile don-tile-mana">
        <span class="don-tile-value">{{ manaTile }}</span>
        <span class="don-tile-label">MANA</span>
      </div>
      <div class="don-tile don-tile-des">
        <span class="don-tile-value">{{ damageTile }}</span>
        <span class="don-tile-label">DÉS</span>
      </div>
      <div class="don-tile don-tile-bonus">
        <span class="don-tile-value">{{ bonusTile }}</span>
        <span class="don-tile-label">BONUS</span>
      </div>
    </div>

    <p class="don-modal-desc">{{ gift?.description }}</p>
  </AppModal>
</template>

<style scoped>
.don-modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}
.don-modal-icon {
  font-size: 1.75rem;
  line-height: 1;
  flex-shrink: 0;
}
.don-modal-title {
  margin: 0;
  font-size: 1.05rem;
  color: #f2e6cc;
  font-weight: 600;
}
.don-modal-tiles {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1rem;
}
.don-tile {
  flex: 1;
  text-align: center;
  border-radius: 8px;
  padding: 0.6rem;
}
.don-tile-mana {
  background: rgba(80, 100, 200, 0.12);
  border: 1px solid rgba(80, 100, 200, 0.3);
}
.don-tile-des {
  background: rgba(200, 80, 40, 0.1);
  border: 1px solid rgba(200, 80, 40, 0.3);
}
.don-tile-bonus {
  background: rgba(212, 168, 67, 0.08);
  border: 1px solid rgba(212, 168, 67, 0.25);
}
.don-tile-value {
  display: block;
  font-size: 1.15rem;
  font-weight: 700;
}
.don-tile-mana .don-tile-value {
  color: #8090e0;
}
.don-tile-des .don-tile-value {
  color: #d07050;
}
.don-tile-bonus .don-tile-value {
  color: #d4a843;
}
.don-tile-label {
  display: block;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  margin-top: 0.25rem;
}
.don-tile-mana .don-tile-label {
  color: #5060a0;
}
.don-tile-des .don-tile-label {
  color: #904030;
}
.don-tile-bonus .don-tile-label {
  color: #906830;
}
.don-modal-desc {
  font-size: 0.95rem;
  color: #c0b090;
  line-height: 1.7;
  white-space: pre-line;
  margin: 0;
}
</style>
