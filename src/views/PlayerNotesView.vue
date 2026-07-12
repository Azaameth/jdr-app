<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const campaignId = computed(() => String(route.params.id ?? ''))
const uid = computed(() => String(route.params.uid ?? ''))
</script>

<template>
  <main>
    <h1>Notes de joueur — {{ uid }}</h1>
    <p>Notes personnelles pour le joueur {{ uid }} dans la campagne {{ campaignId }}.</p>
  </main>
</template>

<style scoped>
main {
  padding: 1.25rem;
  color: #f2e6cc;
}
</style>
