<script setup lang="ts">
import type { CharacterGift } from '../models/types/Character'

defineProps<{
  gifts: CharacterGift[]
}>()

const emit = defineEmits<{
  open: [gift: CharacterGift]
}>()

// Legacy gift names may carry a leading decorative emoji (e.g. '⚡ Lame de Foudre').
// It is stripped from the displayed name and reused as the card icon.
// The variation selector (U+FE0F) is matched as its own optional atom, not
// inside the character class, so it isn't flagged as a misleading combining
// sequence — and so it can be discarded when extracting the bare icon glyph.
const LEADING_EMOJI = /^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])\u{FE0F}?\s*/u

// A "short" first line reads as a one-line teaser under the name; long first
// "lines" (paragraphs with no early newline) are left for the detail modal
// instead of overflowing the card.
const SHORT_LINE_MAX = 80

function giftIcon(name: string): string {
  const match = name.match(LEADING_EMOJI)
  return match?.[1] ?? ''
}

function giftLabel(name: string): string {
  return name.replace(LEADING_EMOJI, '').trim()
}

function effectLine(gift: CharacterGift): string | null {
  const firstLine = gift.description.split('\n')[0]?.trim() ?? ''
  return firstLine && firstLine.length <= SHORT_LINE_MAX ? firstLine : null
}

// A signed damage bonus of exactly 0 is treated the same as "absent" — FR-010
// forbids synthesizing/displaying misleading zeros.
function signedBonus(bonus?: number): string | null {
  if (bonus === undefined || bonus === 0) return null
  return bonus > 0 ? `+${bonus}` : String(bonus)
}

function manaValue(gift: CharacterGift): string | null {
  if (gift.manaCost !== undefined) return String(gift.manaCost)
  if (gift.manaNote) return gift.manaNote
  return null
}

function damageValue(gift: CharacterGift): string | null {
  if (!gift.damageDice) return null
  const bonus = signedBonus(gift.damageBonus)
  return bonus ? `${gift.damageDice} ${bonus}` : gift.damageDice
}

function handleOpen(gift: CharacterGift) {
  emit('open', gift)
}
</script>

<template>
  <section class="don-list">
    <p v-if="gifts.length === 0" class="dons-empty">Aucun don.</p>
    <div v-else class="gift-cards">
      <button
        v-for="gift in gifts"
        :key="gift.id"
        type="button"
        class="gift-card"
        @click="handleOpen(gift)"
      >
        <span v-if="giftIcon(gift.name)" class="gift-icon" aria-hidden="true">{{
          giftIcon(gift.name)
        }}</span>
        <span class="gift-body">
          <span class="gift-name">{{ giftLabel(gift.name) }}</span>
          <span v-if="effectLine(gift)" class="gift-effect">{{ effectLine(gift) }}</span>
        </span>
        <span v-if="manaValue(gift) || damageValue(gift)" class="gift-badges">
          <span v-if="manaValue(gift)" class="gift-badge gift-badge-mana">
            <span class="badge-value">{{ manaValue(gift) }}</span>
            <span class="badge-label">MANA</span>
          </span>
          <span v-if="damageValue(gift)" class="gift-badge gift-badge-damage">
            <span class="badge-value">{{ damageValue(gift) }}</span>
            <span class="badge-label">DÉGÂTS</span>
          </span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.don-list {
  min-width: 0;
}
.dons-empty {
  color: #a09070;
  font-style: italic;
  padding: 1.25rem 0;
  margin: 0;
}
.gift-cards {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.gift-card {
  background: rgba(45, 30, 10, 0.6);
  border: 1px solid rgba(212, 168, 67, 0.18);
  border-left: 3px solid rgba(212, 168, 67, 0.5);
  border-radius: 8px;
  padding: 0.7rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  color: #f2e6cc;
  text-align: left;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.gift-card:hover {
  border-color: rgba(212, 168, 67, 0.5);
}
.gift-icon {
  font-size: 1.75rem;
  line-height: 1;
  flex-shrink: 0;
}
.gift-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.gift-name {
  font-size: 1.05rem;
  font-weight: 600;
}
.gift-effect {
  font-size: 0.85rem;
  color: #a09070;
  font-style: italic;
}
.gift-badges {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}
.gift-badge {
  border-radius: 8px;
  padding: 0.35rem 0.65rem;
  text-align: center;
  min-width: 56px;
}
.gift-badge-mana {
  background: rgba(80, 100, 200, 0.18);
  border: 1px solid rgba(80, 100, 200, 0.3);
}
.gift-badge-damage {
  background: rgba(200, 80, 40, 0.12);
  border: 1px solid rgba(200, 80, 40, 0.3);
}
.badge-value {
  display: block;
  font-size: 0.95rem;
  font-weight: 700;
  white-space: nowrap;
}
.gift-badge-mana .badge-value {
  color: #8090e0;
}
.gift-badge-damage .badge-value {
  color: #d07050;
}
.badge-label {
  display: block;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  margin-top: 0.15rem;
}
.gift-badge-mana .badge-label {
  color: #5060a0;
}
.gift-badge-damage .badge-label {
  color: #904030;
}
</style>
