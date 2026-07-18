<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CharacterProfile } from '../../models/types/Character'

const props = withDefaults(
  defineProps<{
    character: CharacterProfile
    raceName?: string
    canEdit: boolean
  }>(),
  {
    raceName: undefined,
  },
)

const emit = defineEmits<{
  'save-histoire': [text: string]
}>()

// NOTE (T014): the legacy sheet also rendered a "Valeurs" pill row from a
// free-text `valeurs` field on the character. `CharacterProfile` (WP01) has
// no equivalent field — no `values`/`valeurs` property exists anywhere in
// the new schema — so that section is intentionally omitted rather than
// inventing a field. Revisit if/when a values field is added to the model.

const editingHistoire = ref(false)
const draftHistoire = ref('')

watch(
  () => props.character.id,
  () => {
    editingHistoire.value = false
    draftHistoire.value = ''
  },
)

function startEditHistoire() {
  draftHistoire.value = props.character.backstory ?? ''
  editingHistoire.value = true
}

function cancelEditHistoire() {
  editingHistoire.value = false
  draftHistoire.value = ''
}

function saveHistoire() {
  emit('save-histoire', draftHistoire.value.trim())
  editingHistoire.value = false
}
</script>

<template>
  <div class="fiche-tab">
    <h2 class="tab-head">Fiche</h2>

    <div class="vcard-grid">
      <div class="vcard">
        <div class="vcard-lbl">Race</div>
        <div class="vcard-val">{{ raceName || '—' }}</div>
      </div>
      <div class="vcard">
        <div class="vcard-lbl">Genre</div>
        <div class="vcard-val">{{ character.gender || '—' }}</div>
      </div>
      <div class="vcard">
        <div class="vcard-lbl">Langues</div>
        <div class="vcard-val">
          {{ character.languages && character.languages.length ? character.languages.join(', ') : '—' }}
        </div>
      </div>
    </div>

    <div class="vcard histoire-card">
      <div class="vcard-lbl">Histoire</div>

      <template v-if="!editingHistoire">
        <p class="histoire-text">{{ character.backstory || '—' }}</p>
        <button
          v-if="canEdit"
          type="button"
          class="edit-btn"
          @click="startEditHistoire"
        >
          Modifier l'histoire
        </button>
      </template>

      <template v-else>
        <textarea
          v-model="draftHistoire"
          class="histoire-textarea"
          rows="8"
          aria-label="Histoire du personnage"
        ></textarea>
        <div class="histoire-actions">
          <button type="button" class="btn primary" @click="saveHistoire">Enregistrer</button>
          <button type="button" class="btn secondary" @click="cancelEditHistoire">Annuler</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.fiche-tab {
  min-width: 0;
}
.tab-head {
  font-size: 1rem;
  color: #f0c96a;
  margin: 0 0 0.75rem;
}
.vcard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
  margin-bottom: 0.9rem;
}
.vcard {
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(212, 168, 67, 0.15);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  min-width: 0;
}
.vcard-lbl {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a6a30;
  margin-bottom: 0.25rem;
}
.vcard-val {
  font-size: 1.05rem;
  color: #f2e6cc;
  word-break: break-word;
}
.histoire-card {
  border-left: 2px solid rgba(160, 120, 32, 0.5);
}
.histoire-text {
  color: #e0d8c8;
  white-space: pre-line;
  margin: 0 0 0.6rem;
  line-height: 1.5;
}
.edit-btn {
  background: none;
  border: 1px solid rgba(212, 168, 67, 0.35);
  color: #d4a843;
  border-radius: 5px;
  padding: 0.3rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
}
.edit-btn:hover {
  border-color: #d4a843;
  background: rgba(212, 168, 67, 0.1);
}
.histoire-textarea {
  width: 100%;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(212, 168, 67, 0.25);
  border-radius: 6px;
  color: #f2e6cc;
  padding: 0.6rem;
  font: inherit;
  resize: vertical;
  margin-bottom: 0.5rem;
}
.histoire-actions {
  display: flex;
  gap: 0.5rem;
}
.btn {
  border-radius: 5px;
  padding: 0.35rem 0.9rem;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn.primary {
  background: rgba(212, 168, 67, 0.18);
  border-color: rgba(212, 168, 67, 0.5);
  color: #f0c96a;
}
.btn.primary:hover {
  background: rgba(212, 168, 67, 0.28);
}
.btn.secondary {
  background: none;
  border-color: rgba(212, 168, 67, 0.25);
  color: #a89a7c;
}
.btn.secondary:hover {
  color: #f2e6cc;
}

@media (max-width: 767px) {
  .vcard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
