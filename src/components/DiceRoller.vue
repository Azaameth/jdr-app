<script setup lang="ts">
import { ref } from 'vue'

type DiceResult = {
  faces: number
  value: number
}

type DiceOption = {
  faces: number
  icon: string
}

const diceOptions: DiceOption[] = [
  { faces: 4, icon: 'ti-triangle' },
  { faces: 6, icon: 'ti-square' },
  { faces: 8, icon: 'ti-octagon' },
  { faces: 10, icon: 'ti-pentagon' },
  { faces: 12, icon: 'ti-hexagon' },
  { faces: 20, icon: 'ti-star' },
  { faces: 100, icon: 'ti-circle' },
]

const lastResult = ref<DiceResult | null>(null)
const history = ref<DiceResult[]>([])
const rollSequence = ref(0)

function rollDie(faces: number) {
  const value = Math.floor(Math.random() * faces) + 1
  const result = { faces, value }

  lastResult.value = result
  history.value.unshift(result)
  history.value = history.value.slice(0, 8)
  rollSequence.value += 1
}
</script>

<template>
  <div class="dice-roller">
    <div class="dice-result">
      <div :key="rollSequence" class="dice-num" :class="{ 'roll-anim': lastResult }">
        {{ lastResult?.value ?? '—' }}
      </div>
      <div class="dice-lbl">
        {{ lastResult ? `Résultat du d${lastResult.faces}` : 'Choisissez un dé' }}
      </div>
    </div>

    <div class="dice-grid">
      <button
        v-for="die in diceOptions"
        :key="die.faces"
        type="button"
        class="die-btn"
        :aria-label="`Lancer un d${die.faces}`"
        @click="rollDie(die.faces)"
      >
        <i class="ti" :class="die.icon" aria-hidden="true"></i>
        d{{ die.faces }}
      </button>
    </div>

    <div class="dice-history-title">Historique</div>
    <div v-if="history.length" class="dice-history">
      <div
        v-for="(entry, index) in history"
        :key="`${entry.faces}-${entry.value}-${index}`"
        class="dh-row"
      >
        <span>d{{ entry.faces }}</span>
        <span>{{ entry.value }}</span>
      </div>
    </div>
    <p v-else class="dice-history-empty">Aucun lancer pour le moment.</p>
  </div>
</template>

<style scoped>
.dice-roller {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.dice-result {
  background: linear-gradient(160deg, rgba(40, 30, 18, 0.97), rgba(30, 22, 12, 0.99));
  border: 1px solid rgba(201, 168, 76, 0.75);
  border-radius: 10px;
  padding: 1.4rem;
  text-align: center;
  box-shadow:
    0 0 30px rgba(212, 168, 67, 0.08),
    0 12px 24px rgba(0, 0, 0, 0.25);
}

.dice-num {
  font-size: clamp(3rem, 8vw, 5.8rem);
  font-family: 'Cinzel', serif;
  font-weight: 700;
  color: #d4a843;
  line-height: 1;
  text-shadow: 0 0 26px rgba(212, 168, 67, 0.45);
}

.dice-lbl {
  margin-top: 0.45rem;
  font-size: 1rem;
  color: #a09070;
  font-style: italic;
}

.dice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(78px, 1fr));
  gap: 0.55rem;
}

.die-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 0.4rem;
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: 10px;
  background: rgba(40, 30, 16, 0.8);
  color: #cfc09a;
  font-family: 'Cinzel', serif;
  font-size: 1.05rem;
  line-height: 1;
  text-align: center;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}

.die-btn i {
  font-size: 1.8rem;
  color: rgba(201, 168, 76, 0.9);
}

.die-btn:hover {
  border-color: rgba(212, 168, 67, 0.9);
  color: #d4a843;
  background: rgba(212, 168, 67, 0.08);
  box-shadow: 0 0 12px rgba(212, 168, 67, 0.1);
}

.dice-history-title {
  font-family: 'Cinzel', serif;
  font-size: 0.84rem;
  letter-spacing: 0.1em;
  color: #a07820;
  text-transform: uppercase;
}

.dice-history {
  display: grid;
  gap: 0.34rem;
}

.dh-row {
  display: flex;
  justify-content: space-between;
  padding: 0.34rem 0.6rem;
  border-radius: 6px;
  background: rgba(45, 32, 14, 0.7);
  border: 1px solid rgba(212, 168, 67, 0.2);
  color: #cfc09a;
}

.dh-row span:last-child {
  font-family: 'Cinzel', serif;
  color: #d4a843;
  font-weight: 600;
}

.dice-history-empty {
  margin: 0;
  color: #907860;
  font-size: 0.95rem;
}

@keyframes rollA {
  0% {
    transform: scale(0.5) rotate(-10deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.15) rotate(2deg);
  }
  100% {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}

.roll-anim {
  animation: rollA 0.4s ease-out;
}
</style>
