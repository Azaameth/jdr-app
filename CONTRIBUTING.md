# Contribuer

## Avant de commencer

1. Lisez `README.md`, `CLAUDE.md` et `MIGRATION_BACKLOG.md`.
2. Utilisez la version de Node definie dans `.node-version`, puis executez `npm ci`.
3. Creez une branche courte depuis `main`. Une issue doit decrire les criteres d'acceptation avant un travail de taille significative.

## Organisation du travail

- Une pull request traite un sujet coherent et lie l'issue correspondante.
- Les evolutions issues du prototype consultent la section concernee de `legacy-reference/index.html`, sans recopier son implementation.
- Les changements touchant l'etat, l'interface et Firestore commencent par verrouiller le contrat dans `NEXTSTEPS.md`, conformement a `CLAUDE.md`.
- Ne commitez jamais `.env.local`, une cle de service ou des donnees de production.

## Verification locale

Executez les controles adaptes avant d'ouvrir une pull request :

```sh
npm run type-check
npm run test:unit -- --run
npm run build
npm run test:e2e -- --project=chromium
```

`npm run lint` corrige automatiquement les problemes detectes ; inspectez son diff avant de l'inclure.

## Revue

Expliquez le comportement change, les donnees ou regles Firestore affectees, et le scenario de verification. Les PR qui modifient l'interface joignent une capture ou une courte description du parcours teste.
