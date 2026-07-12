<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import CampaignShell from '../components/layout/CampaignShell.vue'
import { useCampaignStore } from '../controllers/useCampaignStore'

const route = useRoute()
const campaignStore = useCampaignStore()

onMounted(async () => {
  await campaignStore.fetchCampaigns()
})

const campaignId = computed(() => route.params.id as string)
const campaign = computed(() =>
  campaignStore.campaigns.value.find((item) => item.id === campaignId.value),
)
</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main>
      <h1>{{ campaign?.title ?? 'Campagne' }}</h1>
      <p>{{ campaign?.summary }}</p>
      <p>{{ campaign?.lore }}</p>
    </main>
  </CampaignShell>
</template>
