<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../../controllers/useAuthStore'

const route = useRoute()
const authStore = useAuthStore()

const user = computed(() => authStore.user.value)

const navItems = [
  { name: 'Accueil', to: '/', icon: 'home', requiresAuth: false },
  { name: 'Campagnes', to: '/campaigns', icon: 'books', requiresAuth: true },
  { name: 'Équipe', to: '/campaigns/1/team', icon: 'users', requiresAuth: true },
  { name: 'Joueur', to: '/campaigns/1/players/1', icon: 'user', requiresAuth: true },
]

function isActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">LT</div>
        <div>
          <p class="brand-title">La Tour</p>
          <p class="brand-subtitle">des Sorciers</p>
        </div>
      </div>

      <nav class="nav-list" aria-label="Navigation principale">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.name }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div v-if="user" class="user-card">
          <p class="user-name">{{ user.displayName }}</p>
          <p class="user-role">{{ user.role }}</p>
        </div>
        <button v-else class="login-button" @click="authStore.signInWithGoogle()">
          Se connecter
        </button>
      </div>
    </aside>

    <div class="content-area">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background: #111008;
  color: #f2e6cc;
}

.sidebar {
  width: 250px;
  background: linear-gradient(180deg, #16120c 0%, #120e08 100%);
  border-right: 1px solid rgba(212, 168, 67, 0.2);
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  gap: 1rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.25rem 1rem;
}

.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(212, 168, 67, 0.14);
  color: #f0c96a;
  font-weight: 700;
}

.brand-title {
  font-family: 'Cinzel', serif;
  color: #f0c96a;
  font-size: 1rem;
}

.brand-subtitle {
  font-size: 0.9rem;
  color: #a09070;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.85rem;
  border-radius: 8px;
  color: #b8a070;
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-item:hover,
.nav-item.active {
  background: rgba(212, 168, 67, 0.14);
  color: #f2e6cc;
}

.nav-icon {
  width: 1.2rem;
  text-align: center;
}

.sidebar-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-card,
.login-button {
  border: 1px solid rgba(212, 168, 67, 0.2);
  border-radius: 8px;
  padding: 0.75rem;
  background: rgba(212, 168, 67, 0.08);
}

.user-name {
  font-weight: 600;
  color: #f0c96a;
}

.user-role {
  font-size: 0.9rem;
  color: #a09070;
}

.login-button {
  cursor: pointer;
  color: #f2e6cc;
}

.content-area {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
}

@media (max-width: 900px) {
  .app-shell {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    border-right: 0;
    border-bottom: 1px solid rgba(212, 168, 67, 0.2);
  }

  .nav-list {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
