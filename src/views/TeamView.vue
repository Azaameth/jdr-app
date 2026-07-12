<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'

const route = useRoute()
const campaignId = computed(() => route.params.id as string)
const teamId = computed(() => (route.params.teamId as string | undefined) ?? '1')
</script>

<template>
  <CampaignShell :campaign-id="campaignId" :team-id="teamId">
    <main>
      <h1>Équipe</h1>
      <p>Vue de l’équipe {{ teamId }} de la campagne {{ campaignId }}.</p>
    </main>
  </CampaignShell>
</template>
