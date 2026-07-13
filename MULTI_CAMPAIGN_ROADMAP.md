# Multi-Campaign Architecture Roadmap

This is a planning document, not a mission — it lays out what "a dynamic, Firebase-hosted app
that can handle multiple campaigns with the same backbone" actually requires, based on the
current state of the code as of 2026-07-13, so future spec-kitty missions can be carved out of
it deliberately instead of discovered one gap at a time.

**No code changes accompany this document.** It's the deliverable for the "plan the remaining
migration" ask — a roadmap, not an implementation.

## Where the app already is

The `Campaign` layer itself is further along than it might look:

- `campaigns/{id}` already exists as a first-class collection with full CRUD
  (`CampaignRepository.ts`: `listCampaigns`, `createCampaign`, `updateCampaign`,
  `deleteCampaign`, `assignCampaignMj`/`clearCampaignMj`), and `CampaignListView.vue` already
  has an in-app "Nouvelle campagne" creation flow — creating a *second* campaign today doesn't
  require touching the database by hand.
- `characters/{id}` and `memberships/{id}` are already `campaignId`-scoped and queried that way
  (`listCharactersByCampaign`, `listMembershipsByCampaign`).
- `races`/`classes` are already `campaignId`-scoped, both in the seed script
  (`uploadStaticDataAdmin.mjs` stamps `campaignId` on write) and in their repositories
  (`where('campaignId', '==', campaignId)`).
- `factions` (castes) are the one remaining reference-data collection *not* scoped this way —
  closing that gap is exactly what the `castes-campaign-scoping` mission (scaffolded alongside
  this document) does.

So after that mission lands, every piece of *campaign content data* — characters, memberships,
races, classes, factions — will be consistently scoped by `campaignId`, using the same query
pattern throughout. That's a real, near-complete milestone, not a distant one.

## What's still missing for genuine multi-campaign isolation

The gaps below aren't about data scoping — they're about whether two *different* campaigns
(potentially run by different MJs, for different friend groups, sharing one Firebase project)
can actually coexist without stepping on each other. This is where the app is still
effectively single-campaign in practice, even though the data model mostly isn't anymore.

### 1. User roles are global, not per-campaign — the biggest gap

`users/{uid}.role` is a single value (`joueur` / `mj` / `admin`) that applies across *every*
campaign (`src/models/types/User.ts`, `firestore.rules`' `isMjOrAdmin()`). Concretely: someone
who is `mj` for campaign A is, today, also `mj` for campaign B, C, and every future campaign in
the same project — there's no way to be an MJ for one campaign and an ordinary player in
another. `Campaign.gmId` exists as a field, but nothing in the authorization logic (client-side
`canEdit` checks, or `firestore.rules`) actually checks it — a global `mj` role is sufficient
everywhere.

For a single friend group running one campaign at a time, this has never mattered. It becomes a
real problem the moment two independent campaigns with different MJs share the project: MJ of
campaign A could edit campaign B's characters, campaigns, and rosters, because the authorization
model has no concept of "MJ of *this* campaign" versus "MJ, full stop."

**What closing this needs**: a per-campaign membership/role concept — most naturally, extending
the existing `memberships/{id}` collection (which already has `uid` + `campaignId`) with a role
field of its own (`campaignRole: 'mj' | 'joueur'`), and rewriting both the client-side
`canEdit`-style checks and `firestore.rules`' `isMjOrAdmin()` to check "is this user an MJ *of
this campaign*" instead of "is this user an MJ, globally." `role: 'admin'` on the user doc can
reasonably stay global (a site-wide superuser concept is fine) — it's specifically the `mj`
case that needs to become per-campaign.

### 2. Firestore rules don't scope writes by campaign membership

Directly downstream of gap 1: the drafted (not yet deployed) `firestore.rules` grants any
`mj`/`admin` write access to `campaigns/*`, `characters/*`, `memberships/*` — full stop, not
"campaigns/characters/memberships belonging to a campaign this MJ is actually attached to."
Deploying those rules as-is (a decision already parked, separately, per the project's earlier
security pass) would correctly close the "any signed-in user can grant themselves admin" hole,
but would *not* give genuine multi-campaign isolation — it would just make the existing
single-global-role model airtight, gaps and all. Fixing this properly depends on gap 1 landing
first; there's no point rewriting the rules' campaign-scoping logic twice.

### 3. No self-service way for a player to join a campaign

Today, `memberships/{id}` documents are created only via admin seed scripts, or (once the
`character-data-dashboard-integration` mission lands) by an MJ manually creating a character
for a specific player through the UI. There is no invite-code, join-link, or "request to join"
flow — an MJ starting a *new* campaign has no way to let players find and join it themselves;
onboarding is entirely MJ-driven, one character at a time. For a single ongoing campaign this
is a minor friction. For "multiple campaigns with the same backbone" — presumably multiple
independent groups using the same deployed app — this is a real onboarding bottleneck: every
new campaign's every new player needs hands-on MJ setup.

**What closing this needs**: some form of campaign-scoped invite mechanism (a shareable
join-code or link tied to `campaignId`, resolved to a self-service "create my character in this
campaign" flow) — naturally builds on top of the create-character work already scaffolded in
`character-data-dashboard-integration`, since that mission's `createCharacterWithMembership()`
is the same underlying write this would need, just triggered by a player instead of an MJ.

### 4. Reference-data authoring (races/classes/castes) is script-only

Populating a new campaign's races, classes, and castes today means editing JSON fixtures in
`scripts/data/` and running `uploadStaticDataAdmin.mjs` with a service-account key — something
only whoever holds `scripts/keys/serviceAccountKey.json` can do (see README's Setup section).
For one campaign maintained by the project owner, this is a non-issue. For "multiple campaigns"
run by different MJs, requiring shell access and a production credential to set up a new
campaign's world content is a hard ceiling on how self-service this can ever be.

**What closing this needs**: an in-app content-authoring UI (MJ-only, campaign-scoped forms for
races/classes/castes) backed by proper `create`/`update` repository functions — the same kind
of CRUD-completion work the `character-data-dashboard-integration` mission is already doing for
characters, just applied to the three reference-data collections instead. This is the largest
single piece of remaining work in this roadmap and should be its own future mission (or a small
family of them, one per collection), not bundled into anything already scaffolded.

## Suggested sequencing

This is a recommendation, not a commitment — sequencing missions is a decision to make when
each one is actually started, informed by whatever's most pressing at the time.

1. **Land the three missions already scaffolded** (`character-data-dashboard-integration`,
   `characters-view-two-column-layout`, `castes-campaign-scoping`) — they're either
   prerequisites for or orthogonal to everything below.
2. **Per-campaign roles** (gap 1) — the foundational piece; every other multi-tenancy gap
   either depends on it or is much smaller in comparison.
3. **Firestore rules rewrite for real campaign-scoped authorization** (gap 2) — natural
   follow-on to (2), and the point at which the already-parked "deploy firestore.rules"
   decision should probably be revisited rather than deployed as-is beforehand.
4. **Self-service campaign join flow** (gap 3) — meaningfully improves onboarding once (2) and
   (3) mean a new campaign's MJ can actually be isolated from others.
5. **In-app reference-data authoring** (gap 4) — largest scope, least urgent while there's a
   single maintainer able to run the seed scripts; revisit if/when a second MJ who isn't the
   project owner actually needs to stand up their own campaign's content.

## Relationship to other tracked work

- `MIGRATION_BACKLOG.md` tracks *feature parity* with the legacy monolith (porting existing
  functionality) — this document is about *new* multi-tenancy capability the legacy monolith
  never had (it was single-campaign by construction). The two lists are complementary, not
  overlapping.
- README.md's "Known follow-ups" section tracks smaller, already-identified gaps (Firestore
  rules deployment, field-level privacy). Gap 2 above supersedes/extends the Firestore-rules
  follow-up specifically — deploying the rules as currently drafted is still a valid,
  independent step (it fixes a real privilege-escalation hole regardless of multi-campaign
  concerns), but full campaign-scoped authorization is the roadmap item that should come after.
