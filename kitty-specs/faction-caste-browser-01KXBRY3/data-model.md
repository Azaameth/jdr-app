# Data Model: Faction/Caste Browser

## Entity: Faction

Static reference content — one document per faction/caste. Not campaign-scoped, not user-editable, no relationship to `Campaign`, `CharacterProfile`, or `Membership`.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Firestore doc id (slugified title, e.g. `les-temeraires`) — not stored as a field, comes from `doc.id` per the established `{ id: doc.id, ...doc.data() }` mapping convention. |
| `order` | `number` | 0–7. Firestore doesn't preserve insertion order; the repository query sorts by this field to reproduce the legacy tab sequence. |
| `icon` | `string` | Single emoji character (e.g. `⚔`), matches legacy `tab-icon`/`fiche-stamp` content. |
| `title` | `string` | Faction name, e.g. `"Les Téméraires"`. |
| `subtitle` | `string` | One-line descriptor, e.g. `"Cercle occulte · Prophétie des Douze Voies"`. |
| `badge` | `string` | Status label, e.g. `"Alliance active"`, `"Hostile"`, `"Neutre / Ambigu"`. |
| `accent` | `string` | Hex color, e.g. `"#D4A843"` — drives the fiche's accent styling (`--fiche-accent` in the legacy CSS). |
| `description` | `string` | Full prose paragraph, French. |
| `facts` | `FactionFact[]` | Ordered list, 2–4 entries depending on faction. |

### Sub-entity: FactionFact

| Field | Type | Notes |
|---|---|---|
| `label` | `string` | e.g. `"Structure"`, `"Objectif"`. |
| `value` | `string` | e.g. `"12 Maîtres actifs, un par royaume"`. |

## Relationships

None. This is intentionally a standalone, global reference collection — no foreign keys to `Campaign` or any other entity. See `research.md` D1 for why this still lives in Firestore rather than being bundled.

## Seed Data Shape

`scripts/data/factions.json` is an array of 8 objects matching the `Faction` shape above (including `order`, excluding `id` — the upload script derives `id` from a slugified `title`, same as the existing races/classes seed script). See `tasks/WP01-faction-caste-browser.md` subtask T003 for the per-faction content breakdown (icon/badge/accent/fact-count for all 8).
