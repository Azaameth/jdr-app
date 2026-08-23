# Legacy reference

`index.html` in this folder is the pre-migration version of jdr-app: a single
~4200-line monolithic HTML file with inline CSS/JS that predates the Vue 3 +
Firebase rewrite. It is **not live code** and is not part of the build.

It's kept as the behavioral source-of-truth for features that haven't been
ported to the new app yet. When migrating one of these, read the relevant
section here for the intended behavior/content, then implement it properly
against the current architecture (Pinia-less composable stores, the
repository layer, Firestore) — don't copy the markup/JS as-is.

**`MIGRATION_BACKLOG.md` is the source of truth for what's shipped vs. unported
— this file only points at where each feature's legacy spec lives.**

Still unported (see `MIGRATION_BACKLOG.md` for the full open list, including
newer pages like Adventure Dice, Economy, Create a Character, Rules, 12
Kingdoms, History, and NPCs & Factions):

- Negotiation / balance mechanic (`#s-negociation`)
- Theme & design editor (sidebar + design editor modals)

Shipped, but the legacy section is still the reference for original intent if
you need it (see `MIGRATION_BACKLOG.md`'s "Already covered by the current app"
for what actually landed and where):

- Character sheet layout ("vitruve" — search `Layout vitruve JDR`)
- Faction/caste browser ("classeur" tabs — La Rose Noire, L'Ordre du Savoir,
  Téméraires, Paysans, Nobles, Marchands, Fonctionnaires, Religieux)
- Cosmology tree (Déïques / Légendaires / Effroyables / Rares / Communes)
- Inventory slots & "dons" (gifts) system
