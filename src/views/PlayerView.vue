<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'

const route = useRoute()
const campaignId = computed(() => route.params.id as string)
const playerId = computed(() => route.params.uid as string)
</script>

<template>
  <CampaignShell :campaign-id="campaignId" :team-id="'1'" :player-id="playerId">
    <main>
      <h1>Joueur</h1>
      <p>Vue du joueur {{ playerId }} de la campagne {{ campaignId }}.</p>
    </main>
  </CampaignShell>
</template>
