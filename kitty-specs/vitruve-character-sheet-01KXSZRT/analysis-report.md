---
schema_version: 1
artifact_type: spec-kitty.analysis-report
command: /spec-kitty.analyze
mission_slug: vitruve-character-sheet-01KXSZRT
mission_id: 01KXSZRT7HDDKGXAM4C463AMYK
generated_at: '2026-07-18T07:22:57.347461+00:00'
analyzer_agent: unknown
input_artifacts:
  spec.md:
    path: /srv/dev-disk-by-uuid-880448de-a6f5-449f-a238-d5306ef7c278/programming/monthie/jdr-app/kitty-specs/vitruve-character-sheet-01KXSZRT/spec.md
    sha256: 0313a2ec5a539aa692ef8b5fdf3b0424b4e8e7c9f2bfecd194f5cc8a935df2ed
  plan.md:
    path: /srv/dev-disk-by-uuid-880448de-a6f5-449f-a238-d5306ef7c278/programming/monthie/jdr-app/kitty-specs/vitruve-character-sheet-01KXSZRT/plan.md
    sha256: 7ae90359857946972b80e63274622e3b326380697c63a33467c62c1df6f15243
  tasks.md:
    path: /srv/dev-disk-by-uuid-880448de-a6f5-449f-a238-d5306ef7c278/programming/monthie/jdr-app/kitty-specs/vitruve-character-sheet-01KXSZRT/tasks.md
    sha256: 05427d722859a360d40bd9112825c7d12fcd9e50206f7bb4cd338303cfa511cb
  charter:
    path: /srv/dev-disk-by-uuid-880448de-a6f5-449f-a238-d5306ef7c278/programming/monthie/jdr-app/.kittify/charter/charter.md
    sha256: 9be3aa3adef52c6aeb2278637f52277850543b5302307689e7b10186f09e0c2b
verdict: ready
issue_counts:
  medium: 1
  critical: 0
  high: 0
  low: 3
  info: 0
findings:
- id: U1
  severity: medium
  category: underspecification
  summary: FR-012 requires 'valeurs as pills' but CharacterProfile has no valeurs field; WP03/T014 already instructs conditional rendering/omission, but the spec states it unconditionally.
- id: I1
  severity: low
  category: inconsistency
  summary: Spec C-003 lists rules scope as participant session + campaignSessions, but contracts/session-state-api.md and WP01/T007 additionally add an owner backstory-only write rule on characters (needed by FR-012).
- id: C1
  severity: low
  category: coverage
  summary: NFR-001 (<2s propagation) has no automated test task; verification is manual (quickstart step 2) — inherent to multi-client sync without an emulator, per research D-06.
- id: I2
  severity: low
  category: inconsistency
  summary: WP06 DoD says smoke e2e 'green on all configured browsers', but webkit cannot run on the dev box (missing system libs); the effective local/CI gate is chromium-only.
---

## Specification Analysis Report

**Mission**: `vitruve-character-sheet-01KXSZRT` · **Date**: 2026-07-18 · Artifacts: spec.md, plan.md, tasks.md (+ research.md, data-model.md, contracts/, charter)

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| U1 | Underspecification | MEDIUM | spec.md FR-012; tasks/WP03 T014 | FR-012 requires "valeurs as pills" but the locked data model (`CharacterProfile`) carries no `valeurs` field; legacy stored free-text lines. WP03/T014 already instructs the implementer to render conditionally from whatever field exists and omit otherwise — but the spec states the pills unconditionally. | Accept the WP03 conditional behavior as the FR-012 reading (valeurs section renders only when data exists); if the table wants valeurs, add the field in a later mission — do not invent schema mid-mission (C-004). |
| I1 | Inconsistency | LOW | spec.md C-003; contracts/session-state-api.md; tasks/WP01 T007 | C-003 enumerates rules scope as participant-session extensions + campaignSessions, but the contract and WP01 additionally add an owner backstory-only write on `characters` (required for FR-012 owner histoire edit). The addition is consistent with the role model but not listed in C-003's enumeration. | Treat contracts/session-state-api.md as authoritative (it is the locked surface); reviewer of WP01 checks the rules diff against the contract matrix, which includes the characters rule. |
| C1 | Coverage | LOW | spec.md NFR-001; tasks.md | NFR-001 (<2s propagation) is verified manually (quickstart step 2, two-session check) — no automated task, consistent with the recorded decision to defer emulator-based e2e (research D-06, decision 01KXT0MF6T7BFAY5M3CZYWDBS9). | Keep manual verification in WP06's final sweep; revisit if a Firebase-emulator harness lands later. |
| I2 | Inconsistency | LOW | tasks/WP06 DoD; project environment | WP06 DoD says the smoke e2e must be "green on all configured browsers", but webkit is known-broken on the dev box (missing system libs, no sudo); CI and the effective gate are chromium (`CI=true npx playwright test --project=chromium`). | Implementer/reviewer of WP06 validate on chromium locally; webkit outcome is informational unless CI runs it. |

**Coverage Summary Table:**

| Requirement Key | Has Task? | Task IDs (via WP) | Notes |
|-----------------|-----------|-------------------|-------|
| FR-001–003, FR-011 | Yes | T009–T013 (WP02) | Layout, vitals, portrait, tabs |
| FR-004 | Yes | T029 (WP06) | Raw editor |
| FR-005–008 | Yes | T019–T022 (WP04); FR-006 lists also T017 (WP03) | Calculator + toggles |
| FR-009–010, FR-017 | Yes | T023–T026 (WP05); FR-017 also store-side T005/T008 (WP01) | Group widgets, exclusion |
| FR-012–014 | Yes | T014–T018 (WP03); FR-014 data side T001/T002/T005 (WP01) | Tabs, injuries |
| FR-015–016 | Yes | T027–T028 (WP06); FR-015 data side T001–T005 (WP01) | Children |
| FR-018 | Yes | T008 (WP01) | Furmiaou seed |
| NFR-001 | Partial | Manual (quickstart) | See C1 |
| NFR-002–005 | Yes | T012 (WP02), T008/T026 tests, T019 (WP04), NFR-004 pervasive | — |
| C-001–006 | Yes | Embedded in WP guidance/DoD | Charter-derived |

**Charter Alignment Issues:** none — plan.md Charter Check passes all clauses; testing/quality-gate commands in WP DoD match charter Testing Standards; DIR-001..005 are explicitly carried into WP guidance.

**Unmapped Tasks:** none — all 31 subtasks belong to exactly one WP; all WPs carry validated `requirement_refs` (18/18 FRs mapped).

**Metrics:**

- Total Requirements: 18 FR + 5 NFR + 6 C
- Total Tasks: 31 subtasks across 6 WPs
- Coverage: 100% of FRs have ≥1 task; NFR-001 manual-only (deliberate)
- Ambiguity Count: 0 unresolved placeholders / NEEDS CLARIFICATION markers
- Duplication Count: 0
- Critical Issues Count: 0

**Next Actions:** No CRITICAL or HIGH findings — implementation may proceed. U1 requires no edit (WP03/T014 already encodes the safe reading); I1/I2/C1 are execution notes for the respective WP reviewers.
