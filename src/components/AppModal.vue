<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
  }>(),
  {
    title: undefined,
  },
)

const emit = defineEmits<{
  close: []
}>()

const panelRef = ref<HTMLElement | null>(null)

function handleClose() {
  emit('close')
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleClose()
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeydown)
      await nextTick()
      panelRef.value?.focus()
    } else {
      document.removeEventListener('keydown', handleKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div v-if="open" class="app-modal-overlay" @click="handleBackdropClick">
    <div
      ref="panelRef"
      class="app-modal-panel"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      tabindex="-1"
    >
      <div v-if="title || $slots.header" class="app-modal-header">
        <slot name="header">
          <h2 class="app-modal-title">{{ title }}</h2>
        </slot>
        <button type="button" class="app-modal-close" aria-label="Fermer" @click="handleClose">
          ✕
        </button>
      </div>

      <div class="app-modal-body">
        <slot />
      </div>

      <div v-if="$slots.footer" class="app-modal-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  background: rgba(7, 5, 2, 0.66);
  backdrop-filter: blur(2px);
}
.app-modal-panel {
  width: min(400px, 92vw);
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  border-radius: 12px;
  background: linear-gradient(160deg, #1a1005, #100a03);
  border: 1px solid rgba(212, 168, 67, 0.35);
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.38);
  color: #f2e6cc;
  position: relative;
}
.app-modal-panel:focus {
  outline: none;
}
.app-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.app-modal-title {
  margin: 0;
  font-size: 1.05rem;
  color: #d4a843;
}
.app-modal-close {
  background: none;
  border: none;
  color: #907050;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
}
.app-modal-close:hover {
  color: #f0c96a;
}
.app-modal-footer {
  margin-top: 1.25rem;
}
</style>
