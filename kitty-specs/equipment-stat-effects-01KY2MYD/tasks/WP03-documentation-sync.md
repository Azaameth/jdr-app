---
work_package_id: WP03
title: 'Documentation sync: MIGRATION_BACKLOG.md and NEXTSTEPS.md'
dependencies:
- WP02
requirement_refs:
- FR-009
tracker_refs: []
planning_base_branch: feat/equipment-stat-effects
merge_target_branch: feat/equipment-stat-effects
branch_strategy: Planning artifacts for this mission were generated on feat/equipment-stat-effects. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/equipment-stat-effects unless the human explicitly redirects the landing branch.
subtasks:
- T012
agent: ""
shell_pid: ""
history:
- timestamp: "2026-07-21T16:10:00Z"
  agent: "system"
  action: "Prompt generated via /spec-kitty.tasks remediation (closes analyze finding A2)"
agent_profile: curator-carla
authoritative_surface: MIGRATION_BACKLOG.md
create_intent: []
execution_mode: planning_artifact
model: claude-sonnet-5
owned_files:
- MIGRATION_BACKLOG.md
- NEXTSTEPS.md
role: implementer
tags:
- docs
---

# WP03 — Documentation sync: MIGRATION_BACKLOG.md and NEXTSTEPS.md

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load curator-carla
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Close a gap `/spec-kitty.analyze` flagged (finding A2): `plan.md`'s Charter Check promised that `MIGRATION_BACKLOG.md` item 4 and `NEXTSTEPS.md` would be updated once this mission shipped — required by charter Directive 2 ("Keep documentation synchronized with workflow and behavior changes") and by `CLAUDE.md`'s high-complexity-spec policy ("Keep the increment ledger... in `NEXTSTEPS.md` so any session can resume") — but no task previously implemented it. This WP is that task. It is purely documentation: no source code changes.

**Prerequisite**: WP01 and WP02 should be merged/complete first, so this WP can describe what actually shipped (including anything that changed from the original plan during implementation) rather than what was merely planned.

## Context (read these, in this order)

1. `MIGRATION_BACKLOG.md` — the file you're editing. Look specifically at item 4 (currently reads "Equipment stat effects. Equipped items should automatically modify computed stats/rolls...") and the "Suggested sequencing" section's Cluster 1 bullet.
2. `NEXTSTEPS.md` — the file you're editing. Read its structure: one section per high-complexity spec, with a Status line, schema/contract-to-lock list, and increment checklist; sections are deleted once the spec is fully done and merged (per the file's own header note). Look at how the "Typed inventory schema" section (a completed, shipped feature) is written as a short "Implemented" pointer to real code, for the tone/format to match.
3. `kitty-specs/equipment-stat-effects-01KY2MYD/spec.md` — the Success Criteria and Requirements tables, for an accurate one-paragraph summary of what this mission actually does.
4. How the equivalent update was done for Cluster 0 (git history): `git log --oneline main -- MIGRATION_BACKLOG.md` and look at the commit that changed the "Suggested sequencing" bullet from "pending" to "Done" — match that style (concrete, dated, names what was actually pushed/built, not just "done").

Branch strategy: planning base and merge target are both `feat/equipment-stat-effects`. Execution worktrees are allocated per computed lane from `lanes.json`; run `spec-kitty agent action implement WP03 --agent claude` and work in the workspace it reports.

## Subtasks

### T012 — Update `MIGRATION_BACKLOG.md` and `NEXTSTEPS.md`

**Purpose**: make both docs reflect reality once this mission ships (FR/NFR/SC references per `spec.md`, not re-derived from scratch).

1. **`MIGRATION_BACKLOG.md` item 4**: rewrite to mark it done, in the same style as item 1-3's "Bugs" section resolutions (see how those were closed out) — state what was actually built (the `statBonus`/`equipped` fields, the `computeEffectiveMaxStat` function, the child-inventory cache, which sheets now render the effective max) and reference the mission slug `equipment-stat-effects-01KY2MYD` for anyone wanting the full spec/plan/task trail. Keep the note about roll-total bonuses (`jetTotal`) remaining out of scope, per spec.md C-001, as an explicit "not yet done" pointer for whoever picks that up next.
2. **`MIGRATION_BACKLOG.md`'s "Suggested sequencing" section**: update the Cluster 1 bullet — equipment stat effects is done; the remaining Cluster 1 item (transformation-generalization guided attach-UI, item 5) is still open. Don't mark Cluster 1 as fully done, only the equipment-effects half of it.
3. **`NEXTSTEPS.md`**: add a new section (or extend the existing structure) following the same format as the "Typed inventory schema" entry — a short "Implemented" pointer citing `src/models/types/Inventory.ts` (the two new fields), `src/utils/effectiveStats.ts` (the aggregation function), and `src/controllers/useInventoryStore.ts` (the `childInventories` cache), plus the mission slug for the full history. This does not need the same depth as the still-open "Locked contracts" sections above it in the file — those are for specs not yet built; this is a shipped-and-done pointer, so keep it brief.

**Validation**: both files read correctly as of *after* this mission — a future reader (or a future session picking up Cluster 2/3) should not need to open `kitty-specs/equipment-stat-effects-01KY2MYD/` to know this is done and roughly what it covers. No source code files touched in this WP's diff.

## Definition of Done

- [ ] `MIGRATION_BACKLOG.md` item 4 reads as done, not as an open backlog item.
- [ ] `MIGRATION_BACKLOG.md`'s Cluster 1 sequencing bullet reflects partial completion (equipment effects done, transformation-attach UI still open).
- [ ] `NEXTSTEPS.md` has a pointer entry for this mission, matching the existing "Implemented" entries' format and brevity.
- [ ] `git status` shows changes to exactly these two files — no source code, no `kitty-specs/` changes (this WP reads from there, doesn't write to it).

## Risks

- None — this is documentation only. The only real risk is describing something that didn't actually ship (e.g. claiming e2e coverage exists if it doesn't) — cross-check every claim against the real diff from WP01/WP02, not against the original plan's intentions.

## Reviewer Guidance

- Cross-check every factual claim in the new prose against the actual merged WP01/WP02 diffs, not against `plan.md`'s original intentions — plans can drift during implementation; docs should describe what shipped.
- Confirm the "still open" framing (roll-total bonuses, transformation-attach UI) is preserved, not accidentally implied as done.

## Activity Log

- 2026-07-21T16:10:00Z – system – Prompt generated via /spec-kitty.tasks remediation (closes analyze finding A2)
