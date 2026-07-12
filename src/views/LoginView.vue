<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../controllers/useAuthStore'

const authStore = useAuthStore()
const user = computed(() => authStore.user.value)
</script>

<template>
  <main class="login-view">
    <section class="panel">
      <h1>La Tour des Sorciers</h1>
      <p>Connectez-vous pour accéder à vos campagnes.</p>
      <button @click="authStore.signInWithGoogle()" :disabled="authStore.loading.value">
        {{ authStore.loading.value ? 'Connexion...' : 'Se connecter avec Google' }}
      </button>
      <p v-if="authStore.error.value" class="error">{{ authStore.error.value }}</p>
      <p v-if="user" class="success">Connecté en tant que {{ user.displayName }}</p>
    </section>
  </main>
</template>

<style scoped>
.login-view {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #111008, #1a140c);
  color: #f2e6cc;
}

.panel {
  width: min(420px, 90vw);
  padding: 2rem;
  border-radius: 16px;
  background: rgba(22, 18, 12, 0.95);
  border: 1px solid rgba(212, 168, 67, 0.2);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

button {
  margin-top: 1rem;
  padding: 0.8rem 1rem;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #a07820, #d4a843);
  color: #111008;
  cursor: pointer;
  font-weight: 700;
}

.error {
  color: #ff8f8f;
  margin-top: 0.75rem;
}

.success {
  margin-top: 0.75rem;
  color: #8fe0a8;
}
</style>
