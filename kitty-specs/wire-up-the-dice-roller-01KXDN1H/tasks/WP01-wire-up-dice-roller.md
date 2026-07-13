---
work_package_id: WP01
title: Wire up dice roller in campaign sidebar
dependencies: []
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-004
tracker_refs: []
planning_base_branch: dev
merge_target_branch: dev
branch_strategy: Planning artifacts for this mission were generated on dev. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into dev unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
- T005
assignee: ''
agent: ''
history: []
agent_profile: frontend-freddy
authoritative_surface: src/
create_intent:
- src/components/DiceRoller.vue
- src/components/__tests__/DiceRoller.spec.ts
execution_mode: code_change
model: ''
owned_files:
- src/components/layout/CampaignShell.vue
- src/components/DiceRoller.vue
- src/components/__tests__/DiceRoller.spec.ts
role: implementer
tags: []
---

# Work Package Prompt: WP01 - Wire up dice roller in campaign sidebar

## Objective

Implement a functional dice roller in the campaign sidebar by replacing placeholder labels with interactive dice buttons and an immediate result display.

## Context

Mission spec and plan are in the same mission directory. Keep implementation local UI only (no Firestore and no store changes). Keep French-facing strings consistent with existing app tone.

### Subtask T001: Create DiceRoller component

- Add `src/components/DiceRoller.vue`.
- Render buttons for d4, d6, d8, d10, d12, d20.
- Keep local state for last roll result.

### Subtask T002: Implement rolling logic

- On button click, compute random integer in `[1, faces]`.
- Display result immediately in component UI.

### Subtask T003: Integrate in CampaignShell

- Replace current dice placeholders with `DiceRoller` in `src/components/layout/CampaignShell.vue`.
- Ensure sidebar layout remains clean on desktop and mobile widths.

### Subtask T004: Add unit coverage

- Add `src/components/__tests__/DiceRoller.spec.ts`.
- Test that all dice buttons render.
- Test click updates displayed result with value in valid range.

### Subtask T005: Validate quality gates

- Run `npm run type-check` and `npm run test:unit`.
- Confirm FR-001..FR-004 are satisfied.

## Definition of Done

- [ ] Dice buttons for d4/d6/d8/d10/d12/d20 are visible (FR-001)
- [ ] Clicking a button rolls and displays a result (FR-002, FR-003)
- [ ] Result is local-only and resets on reload (FR-004)
- [ ] Unit tests pass for new behavior

Implementation command: `spec-kitty agent action implement WP01 --agent claude`
