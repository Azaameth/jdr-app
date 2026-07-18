<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '../../controllers/usePlayerStore'

// "État du groupe" (FR-009): a real-time PV/Mana roster of every approved
// party character. Data comes straight from usePlayerStore().party — a
// singleton computed already filtered store-side to approved participants
// with a resolvable character, excluding transformation children
// (character.parentCharacterId, see I-C2/FR-017). This component renders
// exactly what `party` provides; it does no filtering of its own.
const props = withDefaults(
  defineProps<{
    highlightCharacterId?: string
  }>(),
  {
    highlightCharacterId: undefined,
  },
)

const playerStore = usePlayerStore()

interface PartyRow {
  characterId: string
  name: string
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  hpPct: number
  manaPct: number
  lowHp: boolean
  highlighted: boolean
}

function pct(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.max(0, Math.min(100, (value / max) * 100))
}

const rows = computed<PartyRow[]>(() =>
  playerStore.party.value.map(({ character, session }) => {
    const maxHp = Math.max(0, session.maxHp)
    const maxMana = Math.max(0, session.maxMana)
    return {
      characterId: character.id,
      name: character.name,
      hp: session.hp,
      maxHp,
      mana: session.mana,
      maxMana,
      hpPct: pct(session.hp, maxHp),
      manaPct: pct(session.mana, maxMana),
      // ≤25% of max PV gets the red-tinted low-PV warning treatment.
      lowHp: maxHp > 0 && session.hp / maxHp <= 0.25,
      highlighted: props.highlightCharacterId === character.id,
    }
  }),
)
</script>

<template>
  <div class="party-status">
    <div class="party-status-title">
      <i class="ti ti-heartbeat" aria-hidden="true"></i>État du groupe
    </div>

    <p v-if="rows.length === 0" class="party-status-empty">Aucun personnage dans le groupe.</p>

    <div v-else class="party-status-list">
      <div
        v-for="row in rows"
        :key="row.characterId"
        class="party-row"
        :class="{ highlighted: row.highlighted }"
      >
        <div class="party-row-head">
          <span class="party-row-name">{{ row.name }}</span>
          <span class="party-row-hp-text" :class="{ 'low-hp': row.lowHp }">
            {{ row.hp }}/{{ row.maxHp }} PV
          </span>
        </div>
        <div class="party-bar party-bar-hp">
          <div
            class="party-bar-fill"
            :class="{ 'low-hp': row.lowHp }"
            :style="{ width: row.hpPct + '%' }"
          ></div>
        </div>
        <div class="party-row-mana-text">{{ row.mana }}/{{ row.maxMana }} mana</div>
        <div class="party-bar party-bar-mana">
          <div class="party-bar-fill" :style="{ width: row.manaPct + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.party-status {
  background: rgba(30, 20, 8, 0.85);
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: 10px;
  padding: 12px 14px;
}
.party-status-title {
  font-family: 'Cinzel', serif;
  font-size: 13px;
  color: #d4a843;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.party-status-title i {
  margin-right: 6px;
}
.party-status-empty {
  font-size: 12px;
  color: #a09070;
  font-style: italic;
  margin: 0;
}
.party-status-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.party-row {
  border-radius: 6px;
  padding: 2px 4px;
}
.party-row.highlighted {
  background: rgba(212, 168, 67, 0.1);
  outline: 1px solid rgba(212, 168, 67, 0.35);
}
.party-row-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 3px;
}
.party-row-name {
  font-size: 11.5px;
  color: #e0d0a8;
  font-family: 'Cinzel', serif;
}
.party-row-hp-text {
  font-size: 10.5px;
  color: #e07060;
}
.party-row-hp-text.low-hp {
  color: #ff6b5c;
  font-weight: 700;
}
.party-row-mana-text {
  font-size: 10px;
  color: #7090d0;
  text-align: right;
  margin-bottom: 2px;
}
.party-bar {
  background: rgba(0, 0, 0, 0.35);
  border-radius: 4px;
  height: 6px;
  overflow: hidden;
  margin-bottom: 4px;
}
.party-bar-mana {
  height: 4px;
  margin-bottom: 0;
}
.party-bar-fill {
  height: 100%;
  background: #c0392b;
  transition: width 0.3s;
}
.party-bar-fill.low-hp {
  background: #ff4d3d;
}
.party-bar-mana .party-bar-fill {
  background: #4a6fc0;
}
</style>
