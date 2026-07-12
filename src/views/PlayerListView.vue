<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCampaignStore } from '../controllers/useCampaignStore'

const route = useRoute()
const router = useRouter()
const campaignId = computed(() => String(route.params.id ?? ''))
const campaignStore = useCampaignStore()
const campaign = computed(() =>
  campaignStore.campaigns.value.find((c) => c.id === campaignId.value),
)

import defaultChars from '../data/defaultChars.json'

const players = computed(() => {
  // If this is the Alésia campaign (id '2'), use the provided default characters
  if (campaignId.value === '2') {
    return Object.keys(defaultChars).map((k) => ({ uid: k, name: defaultChars[k].name }))
  }
  return [
    { uid: '1', name: 'Alice' },
    { uid: '2', name: 'Bob' },
  ]
})

function openPlayer(uid: string) {
  router.push(`/campaigns/${campaignId.value}/players/${uid}`)
}
</script>

<template>
  <main>
    <h1>Participants — {{ campaign?.title ?? 'Campagne' }}</h1>
    <ul>
      <li v-for="p in players" :key="p.uid">
        <a @click.prevent="openPlayer(p.uid)" href="#">{{ p.name }}</a>
      </li>
    </ul>
  </main>
</template>

<style scoped>
main {
  padding: 1.25rem;
  color: #f2e6cc;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
a {
  color: #f0c96a;
  text-decoration: none;
  cursor: pointer;
}
</style>
