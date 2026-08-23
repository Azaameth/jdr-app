<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CharacterProfile } from '../../models/types/Character'
import type { CharacterStateDocument } from '../../models/repositories/CharacterStateRepository'
import type { GearEntry } from '../../models/repositories/EquipmentRepository'
import { computeArmorTotal, computeEffectiveStat } from '../../utils/effectiveStats'

const props = withDefaults(
  defineProps<{
    character: CharacterProfile
    state: CharacterStateDocument | null
    raceName?: string
    className?: string
    canEditSession: boolean
    sessionLoading?: 'hp' | 'mana' | 'posture' | null
    sessionError?: string
    equipment?: GearEntry[]
  }>(),
  {
    raceName: undefined,
    className: undefined,
    sessionLoading: null,
    sessionError: '',
    equipment: () => [],
  },
)

const emit = defineEmits<{
  'adjust-hp': [delta: number]
  'adjust-mana': [delta: number]
}>()

// Header subtitle: «race» · «classe» · Niv.«level» · «éléments joined with · »
const subtitle = computed(() => {
  const segments: string[] = []
  if (props.raceName) segments.push(props.raceName)
  if (props.className) segments.push(props.className)
  segments.push(`Niv.${props.character.level}`)
  if (props.character.elements.length) segments.push(props.character.elements.join(' · '))
  return segments.join(' · ')
})

const state = computed(() => props.state)

const effectiveMaxHp = computed(() => {
  const s = state.value
  if (!s) return 0
  return computeEffectiveStat(s.Health, props.equipment, 'Health')
})
const effectiveMaxMana = computed(() => {
  const s = state.value
  if (!s) return 0
  return computeEffectiveStat(s.Mana, props.equipment, 'Mana')
})
const armorTotal = computed(() => computeArmorTotal(props.equipment))

const hpMinusDisabled = computed(() => {
  const s = state.value
  if (!s) return true
  return props.sessionLoading !== null || s.HealthCurrent <= -effectiveMaxHp.value
})
const hpPlusDisabled = computed(() => {
  const s = state.value
  if (!s) return true
  return props.sessionLoading !== null || s.HealthCurrent >= effectiveMaxHp.value
})
const manaMinusDisabled = computed(() => {
  const s = state.value
  if (!s) return true
  return props.sessionLoading !== null || s.ManaCurrent <= 0
})
const manaPlusDisabled = computed(() => {
  const s = state.value
  if (!s) return true
  return props.sessionLoading !== null || s.ManaCurrent >= effectiveMaxMana.value
})

// Portrait: image with object-fit:cover, else class-icon placeholder fallback
// (see ClassCarouselView.vue's card-image-placeholder for the app's existing
// icon-fallback convention).
const portraitFailed = ref(false)
watch(
  () => props.character.id,
  () => {
    portraitFailed.value = false
  },
)

function imageUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const clean = path.replace(/^\//, '')
  return `${import.meta.env.BASE_URL}${clean}`
}

function handlePortraitError() {
  portraitFailed.value = true
}
</script>

<template>
  <aside class="vitruve-sheet">
    <div class="vit-header">
      <h1 class="vit-name">{{ character.name }}</h1>
      <p class="vit-sub">{{ subtitle }}</p>
    </div>

    <div v-if="state" class="vitals-strip">
      <div class="vpill pv-pill">
        <div class="vbig pv">{{ state.HealthCurrent }}</div>
        <div class="vlbl">PV / {{ effectiveMaxHp }}</div>
        <div v-if="canEditSession" class="vbtns">
          <button
            type="button"
            class="vbtn"
            :disabled="hpMinusDisabled"
            aria-label="Diminuer les PV"
            @click="emit('adjust-hp', -1)"
          >
            −
          </button>
          <button
            type="button"
            class="vbtn"
            :disabled="hpPlusDisabled"
            aria-label="Augmenter les PV"
            @click="emit('adjust-hp', 1)"
          >
            +
          </button>
        </div>
      </div>

      <div class="vpill mana-pill">
        <div class="vbig mana">{{ state.ManaCurrent }}</div>
        <div class="vlbl">Mana / {{ effectiveMaxMana }}</div>
        <div v-if="canEditSession" class="vbtns">
          <button
            type="button"
            class="vbtn"
            :disabled="manaMinusDisabled"
            aria-label="Diminuer le mana"
            @click="emit('adjust-mana', -1)"
          >
            −
          </button>
          <button
            type="button"
            class="vbtn"
            :disabled="manaPlusDisabled"
            aria-label="Augmenter le mana"
            @click="emit('adjust-mana', 1)"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <div v-if="state" class="armor-cell">
      <span class="armor-total">{{ armorTotal.total }}</span>
      <span class="armor-label">Armure</span>
      <span class="armor-breakdown">AM {{ armorTotal.magique }} · AP {{ armorTotal.physique }}</span>
    </div>

    <p v-if="sessionError" class="error session-error">{{ sessionError }}</p>

    <div class="vitruve-illo">
      <img
        v-if="character.img && !portraitFailed"
        class="portrait"
        :src="imageUrl(character.img)"
        :alt="`Portrait de ${character.name}`"
        @error="handlePortraitError"
      />
      <div v-else class="vit-portrait">
        <i class="ti ti-user" aria-hidden="true"></i>
      </div>
    </div>

    <div class="vitruve-widgets">
      <slot name="widgets" />
    </div>
  </aside>
</template>

<style scoped>
.vitruve-sheet {
  min-width: 0;
  background: linear-gradient(165deg, #1c1408 0%, #120e06 60%, #1a1208 100%);
  border: 1px solid rgba(212, 168, 67, 0.28);
  border-radius: 6px;
  padding: 14px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}
.vit-header {
  text-align: center;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(212, 168, 67, 0.18);
}
.vit-name {
  font-size: 1.3rem;
  color: #f0e4c8;
  letter-spacing: 0.04em;
  margin: 0;
}
.vit-sub {
  font-size: 0.9rem;
  color: #907060;
  font-style: italic;
  margin: 3px 0 0;
}
.vitals-strip {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.vpill {
  flex: 1;
  min-width: 0;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(212, 168, 67, 0.18);
  border-radius: 5px;
  padding: 6px 8px;
  text-align: center;
}
.vbig {
  font-size: 1.9rem;
  font-weight: 700;
  line-height: 1;
}
.vbig.pv {
  color: #e05050;
}
.vbig.mana {
  color: #5090e0;
}
.vlbl {
  font-size: 0.78rem;
  color: #a89a7c;
  margin-top: 2px;
}
.vbtns {
  display: flex;
  gap: 3px;
  justify-content: center;
  margin-top: 4px;
}
.vbtn {
  background: none;
  border: 1px solid rgba(212, 168, 67, 0.28);
  color: #d4a843;
  border-radius: 3px;
  padding: 1px 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}
.vbtn:hover:not(:disabled) {
  border-color: #d4a843;
  background: rgba(212, 168, 67, 0.1);
}
.vbtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.armor-cell {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(212, 168, 67, 0.18);
  border-radius: 5px;
  padding: 6px 8px;
  text-align: center;
  margin-bottom: 10px;
}
.armor-total {
  font-size: 1.4rem;
  font-weight: 700;
  color: #a8a8a8;
}
.armor-label {
  font-size: 0.78rem;
  color: #a89a7c;
  margin-left: 6px;
}
.armor-breakdown {
  display: block;
  font-size: 0.72rem;
  color: #a89a7c;
  margin-top: 2px;
}
.session-error {
  margin: 0 0 10px;
}
.error {
  color: #ffb0b0;
}
.vitruve-illo {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(212, 168, 67, 0.12);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}
.portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.vit-portrait {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(212, 168, 67, 0.25);
  font-size: 4rem;
}
.vitruve-widgets:empty {
  display: none;
}
</style>
