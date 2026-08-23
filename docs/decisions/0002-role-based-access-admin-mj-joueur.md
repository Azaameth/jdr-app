# 2. Three-role access model: admin / mj / joueur

## Status

Accepted

## Context

The app serves a single Firebase project shared by a friend group: a
Game Master (MJ) running campaigns, players (joueurs) with their own
characters, and the project owner needing full administrative control. Access
needs to be enforced both client-side (which routes/views a user can reach)
and server-side (Firestore rules), and the two enforcement points must agree,
or a client-side check becomes purely cosmetic.

## Decision

A single `user.role` field takes one of three values: `admin`, `mj`, or
`joueur`. It gates:

- **Routes**: `router.beforeEach` in `src/router/index.ts`.
- **In-view checks**: e.g. `PlayerView.vue` only lets a `joueur` see their own
  character, resolved via `usePlayerStore().resolveCharacterId`.
- **Firestore rules**: `firestore.rules` enforces the same model server-side.
  A user can never write their own `role` field (preventing privilege
  escalation via a client write); only `mj`/`admin` can write campaigns.

## Consequences

- Client-side gating is UX only — the real enforcement is
  `firestore.rules`, deployed to production automatically whenever the file
  changes (`.github/workflows/deploy.yml`).
- Adding a fourth role, or per-campaign roles (a user is `mj` in one campaign
  but `joueur` in another), is out of scope for this model and would need a
  new decision record — today `role` is a single global field on the user,
  not scoped per campaign.
