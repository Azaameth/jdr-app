# Data Model: Vitruve Character Sheet Layout

**Mission**: `vitruve-character-sheet-01KXSZRT` · **Date**: 2026-07-18
**Source of truth**: spec.md "Schema Contract (locked)". This file adds validation rules, invariants, and transitions; names must not drift from the contract.

## CharacterProfile (extended)

Collection: `characters` (existing).

| Field | Type | New? | Rules |
|---|---|---|---|
| `parentCharacterId` | `string?` | ✅ | Present ⇔ the character is a child (transformation). Must reference a character in the **same campaign**. Absent on regular characters. |

**Invariants**
- I-C1: A child character never has children of its own (depth 1). Enforced in seed tooling and raw-editor validation, not by rules (Firestore can't traverse).
- I-C2: Children are excluded from every roster surface: `PlayerListView`, `TeamView`, `PartyStatus` (état du groupe). Exclusion key: `parentCharacterId != null`.
- I-C3: Child docs are full `CharacterProfile`s — same attribute/skill/gift shapes; renderers must not special-case fields beyond mana-less display ("Aucune magie" when `maxMana === 0`).

## Participant / CharacterSessionState (extended)

Collection: `participants` (existing). One doc per (uid, campaign) — children get **no** doc (research D-02).

| Field | Type | New? | Rules |
|---|---|---|---|
| `session.injuries` | `Partial<Record<SecondaryAttributeName, 'jaune' \| 'rouge'>>?` | ✅ | Key ∈ {puissance, finesse, aura, relation, instinct, savoir}. Absent key = saine. Never store `'none'`. |
| `session.advantage` | `boolean?` | ✅ | Both toggles may be true simultaneously (spec FR-008). Absent = false. |
| `session.disadvantage` | `boolean?` | ✅ | idem. |
| `childSessions` | `Record<string, CharacterSessionState>?` | ✅ | Key = child characterId; value carries the child's own hp/maxHp/mana/maxMana/posture/injuries. Only keys matching actual children of `characterId` are meaningful; stale keys are ignored by readers. |

**State transitions**
- Injury cycle (per sub-caractéristique, user click): `saine → jaune → rouge → saine`. No other transitions; concurrent writers last-write-wins (acceptable at table scale).
- Vitals: `hp`/`mana` clamped ≥ 0 by mutators; max values only editable via MJ raw editor.
- Posture: existing 3-state enum, unchanged.

**Write authorization** (client checks + `firestore.rules`)
- Owner (`uid` match): may update `session` and `childSessions` of their own participant doc.
- `mj` / `admin`: may update any participant's `session`/`childSessions`.
- Nobody may change `uid`, `campaignId`, `characterId`, `status` through this feature (existing rules preserved).

## CampaignSessionState (new)

Collection: `campaignSessions`, **doc id = campaignId** (research D-03).

| Field | Type | Rules |
|---|---|---|
| `campaignId` | `string` | Equals doc id. |
| `adventureDice.aventure` | `number` | Integer ≥ 0. |
| `adventureDice.mesaventure` | `number` | Integer ≥ 0. |
| `updatedAt` | `string?` | Server timestamp on write. |

**Invariants**
- I-S1: Missing doc ⇒ UI renders 0 / 0 (FR-010); first MJ ± creates the doc via merge write.
- I-S2: Read: campaign members. Write: `mj`/`admin` only.
- I-S3: Counters never go below 0 (mutator clamps; rules enforce `>= 0`).

## Derived (never stored)

- Adjusted category % — computed per research D-05 formula from `attributes.primary.*` + `session.injuries` (or child equivalents when a child tab is active).
- Jet total — adjusted + ticked modifiers + manual modifier, clamped [5, 95].
- Calculator tick/category/modifier state — per-viewer ephemeral component state; reset on character switch (research D-04).
- Empty-tab fallback — active child tab of a character without that child ⇒ Fiche.

## Entity relationships

```
Campaign 1 ── n Participant ── 1 CharacterProfile (parent)
                    │                   │ 1
                    │                   └── n CharacterProfile (children, parentCharacterId)
                    └── childSessions[childId] ── session state for each child
Campaign 1 ── 0..1 CampaignSessionState (adventure dice)
```
