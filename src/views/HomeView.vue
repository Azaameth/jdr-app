<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../controllers/useAuthStore'

const authStore = useAuthStore()
const user = computed(() => authStore.user.value)
</script>

<template>
  <main style="max-width: 480px; margin: 4rem auto; font-family: sans-serif; padding: 1.5rem">
    <h1>Bienvenue sur La Tour des Sorciers</h1>
    <p>Connectez-vous avec Google pour accéder à votre espace.</p>

    <div
      v-if="!user"
      style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem"
    >
      <button
        @click="authStore.signInWithGoogle()"
        :disabled="authStore.loading.value"
        style="padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid #ccc; cursor: pointer"
      >
        {{ authStore.loading.value ? 'Connexion...' : 'Se connecter avec Google' }}
      </button>

      <p v-if="authStore.error.value" style="color: crimson">{{ authStore.error.value }}</p>
    </div>

    <div v-else style="margin-top: 1.5rem">
      <p>
        Connecté en tant que <strong>{{ user.displayName }}</strong>
        <span style="color: #555">(rôle : {{ user.role }})</span>
      </p>

      <p v-if="user.role === 'admin'" style="margin-top: 0.5rem">
        Vous avez les droits administrateur.
      </p>
      <p v-else-if="user.role === 'mj'" style="margin-top: 0.5rem">Vous êtes maître du jeu.</p>
      <p v-else style="margin-top: 0.5rem">Vous êtes joueur.</p>

      <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem">
        <RouterLink to="/campaigns" style="color: #1a73e8; text-decoration: none">
          Accéder aux campagnes
        </RouterLink>
        <button
          @click="authStore.signOut()"
          style="
            margin-top: 0.75rem;
            padding: 0.8rem 1rem;
            border-radius: 8px;
            border: 1px solid #ccc;
            cursor: pointer;
          "
        >
          Se déconnecter
        </button>
      </div>
    </div>
  </main>
</template>
