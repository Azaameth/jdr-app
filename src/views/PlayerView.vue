<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../controllers/useAuthStore'
import { getCharacterById } from '../models/repositories/CharacterRepository'
import { getMembershipByCharacterId } from '../models/repositories/MembershipRepository'
import type { CharacterProfile } from '../models/types/Character'
import type { Membership } from '../models/types/Membership'

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

async function loadCharacter() {
  if (!campaignId.value || !characterId.value) {
    character.value = null
    membership.value = null
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
    character.value = char
    membership.value = mem

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

      <!-- Lore -->
      <section class="card" v-if="character.lore.backstory">
        <h2>Histoire</h2>
        <p class="lore">{{ character.lore.backstory }}</p>
        <template v-if="character.lore.notesPrivate">
          <h3>Notes privées</h3>
          <p class="lore">{{ character.lore.notesPrivate }}</p>
        </template>
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
</style>
