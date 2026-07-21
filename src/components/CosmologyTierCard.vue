<script setup lang="ts">
import { computed } from 'vue'
import type { CosmologyTier } from '../models/types/Cosmology'

const props = defineProps<{
  tier: CosmologyTier
  open: boolean
}>()

defineEmits<{
  toggle: []
}>()

const bodyId = computed(() => `cosmology-body-${props.tier.id}`)

function imageUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const clean = path.replace(/^\//, '')
  const withImages = clean.startsWith('images/') ? clean : `images/${clean}`
  return `${import.meta.env.BASE_URL}${withImages}`
}
</script>

<template>
  <div v-if="tier.branch" class="up-tick" aria-hidden="true"></div>
  <article class="tier-card" :class="`tier-${tier.id}`">
    <button
      type="button"
      class="tier-header"
      :aria-expanded="open"
      :aria-controls="bodyId"
      @click="$emit('toggle')"
    >
      <div class="tier-header-text">
        <div class="tier-title">{{ tier.title }}</div>
        <div class="tier-subtitle">{{ tier.subtitle }}</div>
      </div>
      <span class="tier-chevron" :class="{ open }" aria-hidden="true">⌄</span>
    </button>

    <div v-show="open" :id="bodyId" class="tier-body">
      <p class="tier-description">{{ tier.description }}</p>
      <p v-if="tier.ruleNote" class="tier-rule-note">{{ tier.ruleNote }}</p>
      <div v-if="tier.examples.length" class="tier-examples">
        <div v-for="example in tier.examples" :key="example.name" class="tier-example">
          <img
            v-if="example.img"
            class="tier-example-img"
            :src="imageUrl(example.img)"
            :alt="example.name"
          />
          <div class="tier-example-name">{{ example.name }}</div>
          <div class="tier-example-epithet">{{ example.epithet }}</div>
        </div>
      </div>
    </div>
  </article>
  <p v-if="tier.footnote" class="tier-footnote">{{ tier.footnote }}</p>
</template>

<style scoped>
.tier-card {
  width: 260px;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.tier-card:hover {
  transform: translateY(-3px);
}

.tier-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
}

.tier-header-text {
  min-width: 0;
}

.tier-title {
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  margin-bottom: 0.15rem;
}

.tier-subtitle {
  font-size: 0.72rem;
  font-style: italic;
  opacity: 0.85;
}

.tier-chevron {
  flex-shrink: 0;
  font-size: 1rem;
  opacity: 0.75;
  transition: transform 0.2s ease;
  display: inline-block;
}

.tier-chevron.open {
  transform: rotate(180deg);
}

.tier-body {
  padding: 0.65rem 1rem 0.85rem;
  font-size: 0.78rem;
  line-height: 1.6;
  color: #cfc09a;
}

.tier-description {
  margin: 0;
}

.tier-rule-note {
  margin: 0.6rem 0 0;
}

.tier-examples {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.5rem;
  margin-top: 0.6rem;
}

.tier-example {
  border-radius: 8px;
  border: 1px solid rgba(100, 100, 100, 0.3);
  padding: 0.35rem 0.5rem;
  text-align: center;
  overflow: hidden;
}

.tier-example-img {
  width: calc(100% + 1rem);
  margin: -0.35rem -0.5rem 0.35rem;
  height: 80px;
  object-fit: cover;
  display: block;
}

.tier-example-name {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}

.tier-example-epithet {
  font-size: 0.68rem;
  font-style: italic;
  opacity: 0.75;
}

.up-tick {
  width: 2px;
  height: 20px;
  background: rgba(180, 140, 60, 0.35);
}

.tier-footnote {
  margin-top: 0.6rem;
  font-size: 0.68rem;
  font-style: italic;
  color: rgba(212, 168, 67, 0.55);
  text-align: center;
}

/* Déïque — gold */
.tier-deique.tier-card {
  border: 1px solid rgba(201, 168, 76, 0.5);
  box-shadow: 0 4px 18px rgba(201, 168, 76, 0.25);
}
.tier-deique .tier-header {
  background: linear-gradient(135deg, #8b6914, #c9a84c, #8b6914);
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}
.tier-deique .tier-subtitle {
  color: rgba(255, 255, 255, 0.8);
}
.tier-deique .tier-body {
  background: rgba(201, 168, 76, 0.08);
  border-top: 1px solid rgba(201, 168, 76, 0.2);
}

/* Légendaire — purple */
.tier-legendaire.tier-card {
  border: 1px solid rgba(150, 80, 200, 0.4);
  box-shadow: 0 4px 14px rgba(123, 63, 160, 0.2);
}
.tier-legendaire .tier-header {
  background: linear-gradient(135deg, #4a2060, #7b3fa0, #4a2060);
  color: #e0c0ff;
}
.tier-legendaire .tier-subtitle {
  color: rgba(220, 180, 255, 0.8);
}
.tier-legendaire .tier-body {
  background: rgba(123, 63, 160, 0.08);
  border-top: 1px solid rgba(150, 80, 200, 0.2);
}

/* Effroyable — dark red */
.tier-effroyable.tier-card {
  border: 1px solid rgba(180, 40, 40, 0.35);
  box-shadow: 0 3px 12px rgba(139, 32, 32, 0.18);
}
.tier-effroyable .tier-header {
  background: linear-gradient(135deg, #5c1a1a, #8b2020, #5c1a1a);
  color: #ffd0d0;
}
.tier-effroyable .tier-subtitle {
  color: rgba(255, 180, 180, 0.8);
}
.tier-effroyable .tier-body {
  background: rgba(139, 32, 32, 0.07);
  border-top: 1px solid rgba(180, 40, 40, 0.2);
}

/* Rare — teal/green */
.tier-rare.tier-card {
  border: 1px solid rgba(29, 107, 90, 0.35);
  box-shadow: 0 3px 10px rgba(29, 107, 90, 0.15);
}
.tier-rare .tier-header {
  background: linear-gradient(135deg, #1a4a30, #1d6b5a, #1a4a30);
  color: #80e0c0;
}
.tier-rare .tier-subtitle {
  color: rgba(120, 210, 180, 0.8);
}
.tier-rare .tier-body {
  background: rgba(29, 107, 90, 0.07);
  border-top: 1px solid rgba(29, 107, 90, 0.2);
}

/* Commune — slate-indigo */
.tier-commune.tier-card {
  border: 1px solid rgba(100, 100, 150, 0.3);
  box-shadow: 0 3px 8px rgba(50, 50, 80, 0.15);
}
.tier-commune .tier-header {
  background: linear-gradient(135deg, #2a2a3a, #3a3a5a, #2a2a3a);
  color: #c0c0e0;
}
.tier-commune .tier-subtitle {
  color: rgba(180, 180, 210, 0.8);
}
.tier-commune .tier-body {
  background: rgba(50, 50, 80, 0.07);
  border-top: 1px solid rgba(100, 100, 150, 0.2);
}

@media (max-width: 860px) {
  .up-tick {
    display: none;
  }
}
</style>
