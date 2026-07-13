<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../controllers/useAuthStore'
import { matchClassFromCharacter, matchRaceFromCharacter } from '../models/characterCatalog'
import { getCharacterById, updateCharacter } from '../models/repositories/CharacterRepository'
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
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)
const raceCatalogCache = ref<Record<string, Race[]>>({})
const classCatalogCache = ref<Record<string, Class[]>>({})
const characterRace = ref<Race | null>(null)
const characterClass = ref<Class | null>(null)

// Portrait path is derived from the character id rather than stored on the
// document — deterministic (matches how scripts/generateCharacterData.mjs's
// toCharacterImagePath works) and avoids depending on a field that may not
// exist on every character. Not every character has a custom portrait;
// handlePortraitError hides the <img> rather than show a broken-image icon.
function portraitUrl(id: string): string {
  return `${import.meta.env.BASE_URL}images/portraits/${id}.jpg`
}

function handlePortraitError(event: Event) {
  const img = event.target as HTMLImageElement | null
  if (!img) return
  img.style.display = 'none'
}

const canEdit = computed(() => authStore.isMj.value || authStore.isAdmin.value)
const isEditing = ref(false)
const editName = ref('')
const editLevel = ref(1)
const editError = ref('')
const editSaving = ref(false)

function startEditing() {
  if (!character.value) return
  editName.value = character.value.name
  editLevel.value = character.value.level
  editError.value = ''
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  editError.value = ''
}

async function saveEditing() {
  if (!character.value) return
  if (!editName.value.trim()) {
    editError.value = 'Le nom ne peut pas être vide.'
    return
  }
  editSaving.value = true
  editError.value = ''
  try {
    await updateCharacter(character.value.id, {
      name: editName.value.trim(),
      level: editLevel.value,
    })
    isEditing.value = false
    await loadCharacter()
  } catch (err) {
    editError.value =
      err instanceof Error ? err.message : 'Erreur lors de la mise à jour du personnage.'
  } finally {
    editSaving.value = false
  }
}

async function ensureCatalogLoaded(targetCampaignId: string) {
  if (!raceCatalogCache.value[targetCampaignId]) {
    raceCatalogCache.value[targetCampaignId] = await listRacesByCampaign(targetCampaignId)
  }

  if (!classCatalogCache.value[targetCampaignId]) {
    classCatalogCache.value[targetCampaignId] = await listClassesByCampaign(targetCampaignId)
  }
}

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
    characterRace.value = null
    characterClass.value = null
    error.value = ''
    forbidden.value = false
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  forbidden.value = false

  try {
    const [char, mem] = await Promise.all([
      getCharacterById(characterId.value),
      getMembershipByCharacterId(characterId.value, campaignId.value),
    ])

    await ensureCatalogLoaded(campaignId.value)

    character.value = char
    membership.value = mem
    characterRace.value = char
      ? matchRaceFromCharacter(char, raceCatalogCache.value[campaignId.value] ?? [])
      : null
    characterClass.value = char
      ? matchClassFromCharacter(char, classCatalogCache.value[campaignId.value] ?? [])
      : null

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
      </div>
    </template>

    <p v-else>Personnage introuvable.</p>
  </div>
</template>

<style scoped>
.player-view {
  padding: 1.25rem;
  color: #f2e6cc;
  max-width: 1400px;
}
.player-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}
.player-col-left,
.player-col-right {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  margin: 0;
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

.edit-btn {
  border: 1px solid #5c4a2a;
  background: #1a1208;
  color: #e7d3a0;
  border-radius: 4px;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  font-size: 0.8rem;
}

.edit-btn:hover {
  background: #2a1f0e;
}

.edit-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  background: #2a1f0e;
  border: 1px solid #5c4a2a;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}

.edit-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #b8a07a;
}

.edit-form input {
  background: #1a1208;
  border: 1px solid #5c4a2a;
  border-radius: 4px;
  color: #f2e6cc;
  padding: 0.35rem 0.5rem;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-actions button {
  border: 1px solid #5c4a2a;
  background: #1a1208;
  color: #e7d3a0;
  border-radius: 4px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
}

.edit-actions button:hover {
  background: #2a1f0e;
}

.bonus-card {
  background:
    radial-gradient(circle at top right, rgba(201, 168, 76, 0.12), transparent 42%), #1a1208;
}

.bonus-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.bonus-panel {
  background: #22170b;
  border: 1px solid #5c4a2a;
  border-radius: 8px;
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.bonus-header {
  display: grid;
  gap: 0.2rem;
}

.bonus-label {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  color: #a07820;
}

.bonus-subtitle {
  margin: 0;
  color: #b8a07a;
  font-size: 0.85rem;
}

h4 {
  margin: 0;
  color: #f0c96a;
  font-size: 0.85rem;
}

.bonus-list-wrap {
  display: grid;
  gap: 0.35rem;
}

.bonus-list {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.25rem;
  color: #d8c8a3;
  font-size: 0.88rem;
}

.bonus-list.malus {
  color: #e1b39c;
}

.class-mods {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.mod-chip {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid #6d562f;
  background: rgba(240, 201, 106, 0.08);
  color: #f0c96a;
}

.muted {
  margin: 0;
  font-size: 0.88rem;
  color: #b8a07a;
}

@media (max-width: 800px) {
  .player-columns {
    display: block;
  }
  .player-col-left {
    margin-bottom: 1rem;
  }
  .bonus-grid,
  .grid-2,
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
