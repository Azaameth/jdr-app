# Legacy reference

`index.html` in this folder is the pre-migration version of jdr-app: a single
~4200-line monolithic HTML file with inline CSS/JS that predates the Vue 3 +
Firebase rewrite. It is **not live code** and is not part of the build.

It's kept as the behavioral source-of-truth for features that haven't been
ported to the new app yet. When migrating one of these, read the relevant
section here for the intended behavior/content, then implement it properly
against the current architecture (Pinia-less composable stores, the
repository layer, Firestore) — don't copy the markup/JS as-is.

Known unported features (see the migration backlog for current status):

- Character sheet layout ("vitruve" — search `Layout vitruve JDR`)
- Faction/caste browser ("classeur" tabs — La Rose Noire, L'Ordre du Savoir,
  Téméraires, Paysans, Nobles, Marchands, Fonctionnaires, Religieux)
- Cosmology tree (Déïques / Légendaires / Effroyables / Rares / Communes)
- Negotiation / balance mechanic
- Theme & design editor (sidebar + design editor modals)
- Inventory slots & "dons" (gifts) system
