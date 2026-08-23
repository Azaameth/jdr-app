# 1. Hand-rolled store composables over Pinia

## Status

Accepted

## Context

The project initially installed Pinia, the standard state-management library
for Vue 3, and registered it in the app. In practice it was never used beyond
that registration — every store ended up written as a plain composable
(module-scope `ref`/`computed` plus a factory function returning computed
properties and async methods), because that pattern already covered every
need the app had: singleton state, reactive computed values, async Firestore
calls, and a consistent error-handling shape. Pinia added a dependency and an
indirection layer without changing how any store was actually built.

## Decision

Remove Pinia. Stores under `src/controllers/use*Store.ts` are hand-rolled
singleton composables, not Pinia stores. New stores follow the existing
pattern (see `useCampaignStore.ts`): module-scope `ref`/`computed`, a factory
function, and `error.value = err instanceof Error ? err.message : '<French
fallback>'` on every catch.

## Consequences

- One less dependency, one less abstraction layer to understand.
- No Pinia devtools integration, no built-in plugin ecosystem (persistence
  plugins, etc.) — anything like that would need to be hand-rolled too if
  ever needed.
- If a future need genuinely outgrows this pattern (e.g. cross-store
  dependency graphs get hard to reason about, or SSR/hydration requirements
  appear), revisit this decision explicitly rather than reintroducing Pinia
  piecemeal.
