<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DiceRoller from '../components/DiceRoller.vue'
import CampaignShell from '../components/layout/CampaignShell.vue'

const route = useRoute()
const campaignId = computed(() => route.params.id as string)
</script>

<template>
  <CampaignShell :campaign-id="campaignId">
    <main>
      <h1><i class="ti ti-dice" aria-hidden="true"></i> Lanceur de dés</h1>
      <DiceRoller />
    </main>
  </CampaignShell>
</template>

<style scoped>
main {
  padding: 1.25rem;
  color: #f2e6cc;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 860px;
}

h1 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f0c96a;
  font-size: 1.5rem;
}
</style>
