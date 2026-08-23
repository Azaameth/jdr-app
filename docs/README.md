# docs/

Design docs for the ongoing migration to the target Firestore data model
(campaign-owned rules, materialized derived stats, `GearEntry`-based
equipment — see `NEXTSTEPS.md` for the live increment ledger). Read in this
order if you're new to the migration; skip straight to whichever one answers
your question otherwise.

1. **[rpg-data-model.md](rpg-data-model.md)** — **the authoritative schema.**
   Full data model, rules engine (probability, materialization pipeline),
   permission/integrity model, and a worked end-to-end example. Every other
   doc in this folder defers to this one; if something conflicts, this file
   wins.
2. **[architecture-rpg-data-target.md](architecture-rpg-data-target.md)** —
   the target contract restated as design principles (campaign as functional
   root, `CampaignRules/Main` as single source of truth, hot combat state
   separated from slow sheet data). French. Reference for repository/store/view
   refactor work.
3. **[refacto-plan-rpg-data-model.md](refacto-plan-rpg-data-model.md)** — the
   proposed refactor from the old ad-hoc structure (campaigns/participants/
   characters/inventories scattered) to the unified hierarchy. French.
4. **[migration-data-plan.md](migration-data-plan.md)** — how legacy data gets
   migrated to the target schema (seed scripts as the migration source,
   `scripts/seedAll.mjs` rewritten to the new schema, no legacy compatibility
   maintained mid-migration). French.
5. **[refacto-back-front-plan.md](refacto-back-front-plan.md)** — the
   technical refactor ordering (back then front, views rebuilt in blocks once
   data is stable) once the target model and data migration are defined.
   French.
6. **[refacto-acceptance-criteria.md](refacto-acceptance-criteria.md)** — the
   validation criteria (technical + functional) for the whole migration.
   French.

For irreversible architectural decisions outside this migration (why stores
are hand-rolled instead of Pinia, why roles are shaped the way they are), see
[decisions/](decisions/).
