# Implementation Plan: wire-up-the-dice-roller

**Branch**: `dev` | **Spec**: kitty-specs/wire-up-the-dice-roller-01KXDN1H/spec.md

## Summary

Add a functional DiceRoller.vue component to the CampaignShell.vue sidebar, replacing the existing placeholder labels. Uses local Vue ref() state only — no Firestore, no Pinia store.

## Technical Context

**Language/Version**: TypeScript, Vue 3 (Composition API)
**Primary Dependencies**: Vue 3, Vite
**Storage**: N/A — local component state only
**Testing**: N/A
**Target Platform**: Browser (GitHub Pages static hosting)
**Project Type**: web
**Performance Goals**: N/A
**Constraints**: No backend calls, no persistence, must fit existing sidebar layout in CampaignShell.vue
**Scale/Scope**: Single component, single file modification

## Project Structure

src/
├── components/
│ └── DiceRoller.vue ← new
├── views/
│ └── CampaignShell.vue ← modified (replace placeholder labels)

## Implementation Concern Map

### IC-01 — DiceRoller component

- **Purpose**: Create a self-contained component with d4/d6/d8/d10/d12/d20 buttons and a result display
- **Relevant requirements**: FR-001, FR-002, FR-003, FR-004
- **Affected surfaces**: src/components/DiceRoller.vue (new file)
- **Sequencing/depends-on**: none
- **Risks**: none

### IC-02 — CampaignShell integration

- **Purpose**: Replace placeholder labels with the DiceRoller component in the sidebar
- **Relevant requirements**: FR-001
- **Affected surfaces**: src/views/CampaignShell.vue
- **Sequencing/depends-on**: IC-01
- **Risks**: Sidebar layout may need minor CSS adjustment
