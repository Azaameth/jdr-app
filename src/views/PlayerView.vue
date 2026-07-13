<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../controllers/useAuthStore'
import { getCharacterById } from '../models/repositories/CharacterRepository'
import { listClassesByCampaign } from '../models/repositories/ClassRepository'
import { getMembershipByCharacterId } from '../models/repositories/MembershipRepository'
import { listRacesByCampaign } from '../models/repositories/RaceRepository'
import type { CharacterProfile } from '../models/types/Character'
import type { Class } from '../models/types/Class'
import type { Membership } from '../models/types/Membership'
import type { Race } from '../models/types/Race'

const props = withDefaults(
  defineProps<{
    campaignId?: string
    characterId?: string
  }>(),
  {
    campaignId: undefined,
    characterId: undefined,
  },
)

const route = useRoute()
const authStore = useAuthStore()
const campaignId = computed(() => props.campaignId ?? (route.params.id as string))
const characterId = computed(() => props.characterId ?? (route.params.characterId as string))

const character = ref<CharacterProfile | null>(null)
const membership = ref<Membership | null>(null)
const races = ref<Race[]>([])
const classes = ref<Class[]>([])
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)

const selectedRace = computed(() => {
  const raceId = character.value?.raceId
  if (!raceId) return null
  const normalized = raceId.trim().toLowerCase()
  return (
    races.value.find((race) => race.id === raceId) ??
    races.value.find((race) => race.n.trim().toLowerCase() === normalized) ??
    null
  )
})

const selectedClass = computed(() => {
  const classId = character.value?.classId
  if (!classId) return null
  const normalized = classId.trim().toLowerCase()
  return (
    classes.value.find((klass) => klass.id === classId) ??
    classes.value.find((klass) => klass.n.trim().toLowerCase() === normalized) ??
    null
  )
})

function imageUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const clean = path.replace(/^\//, '')
  return `${import.meta.env.BASE_URL}${clean}`
}

function handlePortraitError(event: Event) {
  const img = event.target as HTMLImageElement | null
  if (!img) return
  img.style.display = 'none'
}

async function loadCharacter() {
  if (!campaignId.value || !characterId.value) {
    character.value = null
    membership.value = null
    races.value = []
    classes.value = []
    error.value = ''
    forbidden.value = false
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  forbidden.value = false

  try {
    const [char, mem, raceList, classList] = await Promise.all([
      getCharacterById(characterId.value),
      getMembershipByCharacterId(characterId.value, campaignId.value),
      listRacesByCampaign(campaignId.value),
      listClassesByCampaign(campaignId.value),
    ])
    character.value = char
    membership.value = mem
    races.value = raceList
    classes.value = classList

    // Guard : un joueur ne peut voir que son propre personnage
    const user = authStore.user.value
    if (authStore.isPlayer.value && char?.ownerUid !== user?.uid) {
      forbidden.value = true
      return
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur de chargement.'
  } finally {
    loading.value = false
  }
}

watch([campaignId, characterId, () => authStore.user.value?.uid], loadCharacter, {
  immediate: true,
})
</script>

<template>
  <div class="player-view">
    <p v-if="loading">Chargement...</p>
    <p v-else-if="forbidden" class="error">Accès refusé.</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="character">
      <!-- Identité -->
      <section class="card">
        <img
          v-if="character.img"
          class="portrait"
          :src="imageUrl(character.img)"
          :alt="`Portrait de ${character.name}`"
          @error="handlePortraitError"
        />
        <h1>{{ character.name }}</h1>
        <div class="grid-2">
          <span><b>Race :</b> {{ character.raceId }}</span>
          <span><b>Classe :</b> {{ character.classId }}</span>
          <span><b>Genre :</b> {{ character.gender }}</span>
          <span><b>Niveau :</b> {{ character.level }}</span>
          <span v-if="character.xp !== undefined"><b>XP :</b> {{ character.xp }}</span>
          <span><b>Éléments :</b> {{ character.elements.join(', ') || '—' }}</span>
          <span><b>Langues :</b> {{ character.languages.join(', ') || '—' }}</span>
        </div>
      </section>

      <section class="card" v-if="selectedRace || selectedClass">
        <h2>Bonus d'origine</h2>
        <div class="grid-2 bonus-grid">
          <div class="bonus-block" v-if="selectedRace">
            <h3>Race · {{ selectedRace.n }}</h3>
            <template v-if="selectedRace.bon.length">
              <p class="bonus-label">Bonus</p>
              <ul class="bonus-list">
                <li v-for="(item, index) in selectedRace.bon" :key="`race-bon-${index}`">
                  {{ item }}
                </li>
              </ul>
            </template>
            <template v-if="selectedRace.mal.length">
              <p class="bonus-label">Malus</p>
              <ul class="bonus-list malus-list">
                <li v-for="(item, index) in selectedRace.mal" :key="`race-mal-${index}`">
                  {{ item }}
                </li>
              </ul>
            </template>
          </div>

          <div class="bonus-block" v-if="selectedClass">
            <h3>Classe · {{ selectedClass.n }}</h3>
            <div class="class-stats">
              <span><b>PV :</b> {{ selectedClass.pv }}</span>
              <span><b>Mana :</b> {{ selectedClass.mana }}</span>
              <span><b>Armure :</b> {{ selectedClass.arm }}</span>
            </div>
            <template v-if="selectedClass.caps.length">
              <p class="bonus-label">Capacités</p>
              <ul class="bonus-list">
                <li v-for="(item, index) in selectedClass.caps" :key="`class-cap-${index}`">
                  {{ item }}
                </li>
              </ul>
            </template>
          </div>
        </div>
      </section>

      <!-- Attributs -->
      <section class="card">
        <h2>Attributs principaux</h2>
        <div class="grid-3">
          <div class="attr" v-for="(val, key) in character.attributes.primary" :key="key">
            <span class="label">{{ key }}</span>
            <span class="val">{{ val }}</span>
          </div>
        </div>
        <h2>Attributs secondaires</h2>
        <div class="grid-3">
          <div class="attr" v-for="(val, key) in character.attributes.secondary" :key="key">
            <span class="label">{{ key }}</span>
            <span class="val">{{ val }}</span>
          </div>
        </div>
      </section>

      <!-- Compétences -->
      <section class="card" v-if="character.skills.length">
        <h2>Compétences</h2>
        <div class="grid-2">
          <div v-for="skill in character.skills" :key="skill.id" class="skill-row">
            <span>{{ skill.name }}</span>
            <span class="badge">{{ skill.domain }}</span>
            <span class="val">{{ skill.rank }}</span>
          </div>
        </div>
      </section>

      <!-- Dons -->
      <section class="card" v-if="character.gifts.length">
        <h2>Dons</h2>
        <div v-for="gift in character.gifts" :key="gift.id" class="gift-row">
          <b>{{ gift.name }}</b>
          <span v-if="gift.manaCost"> · {{ gift.manaCost }} mana</span>
          <p class="desc">{{ gift.description }}</p>
        </div>
      </section>

      <!-- Histoire -->
      <section class="card" v-if="character.backstory">
        <h2>Histoire</h2>
        <p class="lore">{{ character.backstory }}</p>
      </section>

      <!-- Session -->
      <section class="card" v-if="membership?.session">
        <h2>État de session</h2>
        <div class="grid-2">
          <span><b>PV :</b> {{ membership.session.hp }} / {{ membership.session.maxHp }}</span>
          <span
            ><b>Mana :</b> {{ membership.session.mana }} / {{ membership.session.maxMana }}</span
          >
          <span><b>Posture :</b> {{ membership.session.posture }}</span>
        </div>
        <template v-if="membership.session.inventory.length">
          <h3>Inventaire</h3>
          <ul class="inventory">
            <li v-for="item in membership.session.inventory" :key="item.itemId">
              {{ item.name }}
              <span v-if="item.quantity > 1">×{{ item.quantity }}</span>
              <span v-if="item.equipped" class="badge">équipé</span>
            </li>
          </ul>
        </template>
      </section>
    </template>

    <p v-else>Personnage introuvable.</p>
  </div>
</template>

<style scoped>
.player-view {
  padding: 1.25rem;
  color: #f2e6cc;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 860px;
}
.card {
  background: #1a1208;
  border: 1px solid #5c4a2a;
  border-radius: 6px;
  padding: 1rem 1.25rem;
}
.portrait {
  width: 110px;
  height: 110px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #5c4a2a;
  margin-bottom: 0.75rem;
}
h1 {
  font-size: 1.5rem;
  color: #f0c96a;
  margin: 0 0 0.75rem;
}
h2 {
  font-size: 1rem;
  color: #f0c96a;
  margin: 0.75rem 0 0.5rem;
}
h3 {
  font-size: 0.9rem;
  color: #c9a84c;
  margin: 0.5rem 0 0.25rem;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.3rem 1rem;
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.3rem;
}
.attr {
  display: flex;
  justify-content: space-between;
  background: #2a1f0e;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.label {
  text-transform: capitalize;
  font-size: 0.85rem;
}
.val {
  font-weight: 700;
  color: #f0c96a;
}
.skill-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
}
.badge {
  font-size: 0.7rem;
  background: #3a2e1a;
  border: 1px solid #5c4a2a;
  border-radius: 3px;
  padding: 0 4px;
  color: #c9a84c;
}
.gift-row {
  margin-bottom: 0.5rem;
}
.desc {
  font-size: 0.85rem;
  color: #b8a07a;
  margin: 0.15rem 0 0;
}
.lore {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #d4c49a;
  white-space: pre-wrap;
}
.inventory {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}
.error {
  color: #ffb0b0;
}
.bonus-grid {
  align-items: start;
}
.bonus-block {
  background: #2a1f0e;
  border: 1px solid #5c4a2a;
  border-radius: 6px;
  padding: 0.6rem 0.7rem;
}
.bonus-label {
  margin: 0.45rem 0 0.2rem;
  color: #c9a84c;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.bonus-list {
  margin: 0;
  padding-left: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.9rem;
}
.malus-list {
  color: #e0b9a1;
}
.class-stats {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.9rem;
}
</style>
