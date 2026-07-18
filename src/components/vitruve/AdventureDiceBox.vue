<script setup lang="ts">
import { computed } from 'vue'
import { useCampaignSessionStore } from '../../controllers/useCampaignSessionStore'

// "Dés d'Aventure" (FR-010): shared campaign Aventure/Mésaventure counters.
// Data comes from useCampaignSessionStore().adventureDice (a singleton
// computed that already defaults to {aventure: 0, mesaventure: 0} when the
// campaignSessions doc is missing, per I-S1/NFR-003). Adjustment (± buttons)
// is only rendered when `canAdjust` is true (view passes isMj || isAdmin) —
// non-MJ viewers see plain read-only counters, no buttons at all.
const props = defineProps<{
  canAdjust: boolean
}>()

const campaignSessionStore = useCampaignSessionStore()

const aventure = computed(() => campaignSessionStore.adventureDice.value.aventure)
const mesaventure = computed(() => campaignSessionStore.adventureDice.value.mesaventure)
const error = computed(() => campaignSessionStore.error.value)

function adjust(die: 'aventure' | 'mesaventure', delta: number) {
  if (!props.canAdjust) return
  campaignSessionStore.adjust(die, delta)
}
</script>

<template>
  <div class="adv-dice-box">
    <div class="adv-dice-title"><i class="ti ti-dice" aria-hidden="true"></i>Dés d'Aventure</div>

    <div class="adv-dice-row">
      <div class="adv-dice-counter aventure">
        <span class="adv-dice-label">Aventure</span>
        <button
          v-if="canAdjust"
          type="button"
          class="adv-dice-btn"
          :disabled="aventure <= 0"
          aria-label="Diminuer Aventure"
          @click="adjust('aventure', -1)"
        >
          −
        </button>
        <span class="adv-dice-value aventure">{{ aventure }}</span>
        <button
          v-if="canAdjust"
          type="button"
          class="adv-dice-btn"
          aria-label="Augmenter Aventure"
          @click="adjust('aventure', 1)"
        >
          +
        </button>
      </div>

      <div class="adv-dice-counter mesaventure">
        <span class="adv-dice-label">Mésaventure</span>
        <button
          v-if="canAdjust"
          type="button"
          class="adv-dice-btn"
          :disabled="mesaventure <= 0"
          aria-label="Diminuer Mésaventure"
          @click="adjust('mesaventure', -1)"
        >
          −
        </button>
        <span class="adv-dice-value mesaventure">{{ mesaventure }}</span>
        <button
          v-if="canAdjust"
          type="button"
          class="adv-dice-btn"
          aria-label="Augmenter Mésaventure"
          @click="adjust('mesaventure', 1)"
        >
          +
        </button>
      </div>
    </div>

    <div class="adv-dice-footer">
      <span class="adv-dice-summary aventure">
        <i class="ti ti-circle-filled" aria-hidden="true"></i>Aventure : <strong>{{ aventure }}</strong>
      </span>
      <span class="adv-dice-summary mesaventure">
        <i class="ti ti-circle-filled" aria-hidden="true"></i>Mésaventure : <strong>{{ mesaventure }}</strong>
      </span>
    </div>

    <p v-if="error" class="adv-dice-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.adv-dice-box {
  background: rgba(30, 20, 8, 0.85);
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: 10px;
  padding: 12px 14px;
}
.adv-dice-title {
  font-family: 'Cinzel', serif;
  font-size: 13px;
  color: #d4a843;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.adv-dice-title i {
  margin-right: 6px;
}
.adv-dice-row {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}
.adv-dice-counter {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  justify-content: center;
  padding: 6px 8px;
  border-radius: 8px;
}
.adv-dice-counter.aventure {
  background: rgba(50, 160, 80, 0.08);
  border: 1px solid rgba(50, 160, 80, 0.25);
}
.adv-dice-counter.mesaventure {
  background: rgba(160, 60, 40, 0.08);
  border: 1px solid rgba(160, 60, 40, 0.25);
}
.adv-dice-label {
  font-size: 11px;
  color: #a09070;
  margin-right: 4px;
}
.adv-dice-value {
  font-family: 'Cinzel', serif;
  font-size: 18px;
  font-weight: 700;
  min-width: 20px;
  text-align: center;
}
.adv-dice-value.aventure {
  color: #50c070;
}
.adv-dice-value.mesaventure {
  color: #d06050;
}
.adv-dice-btn {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(212, 168, 67, 0.3);
  color: #f2e6cc;
  border-radius: 5px;
  padding: 1px 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  line-height: 1.4;
}
.adv-dice-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.adv-dice-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}
.adv-dice-summary {
  font-size: 11px;
  font-style: italic;
}
.adv-dice-summary.aventure {
  color: #50a070;
}
.adv-dice-summary.aventure i {
  color: #2e7d32;
}
.adv-dice-summary.mesaventure {
  color: #a05040;
}
.adv-dice-summary.mesaventure i {
  color: #c0392b;
}
.adv-dice-summary i {
  font-size: 9px;
  margin-right: 3px;
}
.adv-dice-error {
  margin-top: 8px;
  font-size: 11px;
  font-style: italic;
  color: #d06050;
}
</style>
