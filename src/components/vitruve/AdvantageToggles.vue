<script setup lang="ts">
import type { CharacterStateDocument } from '../../models/repositories/CharacterStateRepository'

// Avantage/Désavantage toggles (FR-008). Both persist via
// usePlayerStore().setAdvantage/setDisadvantage (wired by the view) and are
// live States/Current values — this component holds NO local optimistic
// state that could shadow them; the checkbox `checked` is bound straight to
// `state.Advantage`/`state.Disadvantage` so remote changes (another viewer,
// MJ) are always reflected.
const props = defineProps<{
  state: CharacterStateDocument | null
  canEdit: boolean
}>()

const emit = defineEmits<{
  'set-advantage': [value: boolean]
  'set-disadvantage': [value: boolean]
}>()

function handleAdvantageChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  emit('set-advantage', checked)
}

function handleDisadvantageChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  emit('set-disadvantage', checked)
}
</script>

<template>
  <div class="avdis-box">
    <div class="avdis-title"><i class="ti ti-cards" aria-hidden="true"></i>Avantages &amp; Désavantages</div>

    <label class="avdis-row advantage">
      <span class="avdis-label">Avantage</span>
      <input
        type="checkbox"
        :checked="props.state?.Advantage ?? false"
        :disabled="!props.canEdit"
        aria-label="Avantage"
        @change="handleAdvantageChange"
      />
    </label>

    <label class="avdis-row disadvantage">
      <span class="avdis-label">Désavantage</span>
      <input
        type="checkbox"
        :checked="props.state?.Disadvantage ?? false"
        :disabled="!props.canEdit"
        aria-label="Désavantage"
        @change="handleDisadvantageChange"
      />
    </label>
  </div>
</template>

<style scoped>
.avdis-box {
  background: rgba(30, 20, 8, 0.85);
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: 10px;
  padding: 12px 14px;
}
.avdis-title {
  font-family: 'Cinzel', serif;
  font-size: 13px;
  color: #d4a843;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.avdis-title i {
  margin-right: 6px;
}
.avdis-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
}
.avdis-row:last-child {
  margin-bottom: 0;
}
.avdis-row.advantage {
  background: rgba(50, 160, 80, 0.08);
  border: 1px solid rgba(50, 160, 80, 0.25);
}
.avdis-row.disadvantage {
  background: rgba(160, 60, 40, 0.08);
  border: 1px solid rgba(160, 60, 40, 0.25);
}
.avdis-label {
  font-size: 15px;
  font-family: 'Cinzel', serif;
}
.avdis-row.advantage .avdis-label {
  color: #50c070;
}
.avdis-row.disadvantage .avdis-label {
  color: #d06050;
}
.avdis-row input[type='checkbox'] {
  width: 22px;
  height: 22px;
  cursor: pointer;
}
.avdis-row.advantage input[type='checkbox'] {
  accent-color: #50c070;
}
.avdis-row.disadvantage input[type='checkbox'] {
  accent-color: #d06050;
}
.avdis-row input[type='checkbox']:disabled {
  cursor: not-allowed;
}
</style>
