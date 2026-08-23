# Changelog

Notable user-facing and structural changes to jdr-app. Follows the spirit of
[Keep a Changelog](https://keepachangelog.com/) — dated entries under
Added/Changed/Fixed. Started 2026-08-23; for history before that, see
`git log`.

## Unreleased

### Added

- `LICENSE`, this changelog, `AGENTS.md`, `docs/README.md` (docs index),
  `docs/decisions/` (architecture decision records), and a
  `test:unit:coverage` script (`@vitest/coverage-v8`).

### Changed

- `MIGRATION_BACKLOG.md` and `legacy-reference/README.md` corrected to match
  current shipped status (both had drifted — see each file's history for
  detail) and now each state which one is the source of truth.

### Fixed

- Removed stale references to the pre-Cluster-4 `Inventory.ts`/`WeaponArmorItem`
  schema from `MIGRATION_BACKLOG.md`; it now points at the current
  `GearEntry`-based schema.
