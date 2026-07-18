<script setup lang="ts">
import { ref, watch } from 'vue'
import AppModal from '../AppModal.vue'
import { updateCharacter } from '../../models/repositories/CharacterRepository'
import type { CharacterProfile } from '../../models/types/Character'

// MJ/admin-only raw-JSON editor (FR-004), modernizing legacy's editRawChar
// (legacy-reference/index.html ~l.2634 — an onblur textarea with a silent
// 'JSON invalide' toast that lost the edit). This version is atomic: the
// whole textarea is JSON.parse'd BEFORE anything is written, an invalid
// payload writes nothing and shows an in-modal French error, and a valid
// payload always has `id`/`campaignId` stripped (Firestore-doc-identity
// fields — never MJ-editable) before the write. Also the only UI in this
// mission for editing a child character's identity fields (spec assumption:
// no dedicated child-creation UI — see spec.md's Out of Scope).
const props = defineProps<{
  character: CharacterProfile
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const text = ref('')
const errorMessage = ref('')
const saving = ref(false)

watch(
  () => [props.open, props.character],
  () => {
    if (props.open) {
      text.value = JSON.stringify(props.character, null, 2)
      errorMessage.value = ''
    }
  },
  { immediate: true, deep: true },
)

function handleClose() {
  emit('close')
}

async function handleSave() {
  errorMessage.value = ''

  let parsed: unknown
  try {
    parsed = JSON.parse(text.value)
  } catch {
    errorMessage.value = 'JSON invalide — aucune modification enregistrée.'
    return
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    errorMessage.value = 'JSON invalide — aucune modification enregistrée.'
    return
  }

  // id/campaignId are Firestore doc-identity fields, never MJ-editable —
  // strip them even if the MJ's edited JSON still carries the prefilled
  // values (or, per reviewer guidance, mismatched/junk ones) so a raw-editor
  // save can never repoint or fork a document's identity.
  const payload = { ...(parsed as Record<string, unknown>) }
  delete payload.id
  delete payload.campaignId

  saving.value = true
  try {
    await updateCharacter(props.character.id, payload as Partial<CharacterProfile>)
    emit('saved')
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : "Erreur lors de l'enregistrement des données."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal :open="open" title="Éditer les données brutes" @close="handleClose">
    <p class="raw-editor-hint">
      Édition JSON complète du personnage. Les champs <code>id</code> et
      <code>campaignId</code> sont ignorés même s'ils apparaissent dans le texte.
    </p>
    <p v-if="errorMessage" class="raw-editor-error">{{ errorMessage }}</p>
    <textarea
      v-model="text"
      class="raw-editor-textarea"
      spellcheck="false"
      :disabled="saving"
      aria-label="Données brutes du personnage (JSON)"
    ></textarea>

    <template #footer>
      <div class="raw-editor-actions">
        <button type="button" class="raw-editor-btn cancel" :disabled="saving" @click="handleClose">
          Annuler
        </button>
        <button type="button" class="raw-editor-btn save" :disabled="saving" @click="handleSave">
          Enregistrer
        </button>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.raw-editor-hint {
  font-size: 0.78rem;
  color: #a89a7c;
  margin: 0 0 0.75rem;
}
.raw-editor-hint code {
  color: #d4a843;
}
.raw-editor-error {
  color: #ffb0b0;
  font-size: 0.85rem;
  margin: 0 0 0.6rem;
}
.raw-editor-textarea {
  width: 100%;
  min-height: 320px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  color: #f2e6cc;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(212, 168, 67, 0.25);
  border-radius: 6px;
  padding: 0.6rem;
  resize: vertical;
}
.raw-editor-textarea:disabled {
  opacity: 0.6;
}
.raw-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
.raw-editor-btn {
  border-radius: 6px;
  padding: 0.45rem 1.1rem;
  cursor: pointer;
  font-size: 0.88rem;
  border: 1px solid rgba(212, 168, 67, 0.3);
  background: none;
  color: #d4a843;
}
.raw-editor-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.raw-editor-btn.save {
  background: rgba(212, 168, 67, 0.15);
}
.raw-editor-btn.cancel {
  color: #a89a7c;
  border-color: rgba(168, 154, 124, 0.3);
}
</style>
