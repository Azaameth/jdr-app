# Plan de refacto back / front – migration vers le nouveau modèle

## Objet

Ce document décrit l’ordre de refacto technique du projet après la définition du modèle cible et après la migration des données vers le nouveau schéma.

## Hypothèses retenues

- refacto complet du back + front
- pas de compatibilité legacy
- le modèle de [docs/rpg-data-model.md](docs/rpg-data-model.md) est la cible finale
- les scripts hérités servent de base de migration
- les vues seront refaites par blocs après la stabilisation des données

---

## 1. Ordre de travail recommandé

### Bloc 1 — contrat de données cible
- définir les types du modèle cible
- formaliser les chemins Firestore
- valider le mapping legacy → cible

### Bloc 2 — migration des données / seed
- réécrire [scripts/seedAll.mjs](scripts/seedAll.mjs)
- convertir les fixtures JSON
- produire le schéma cible directement

### Bloc 3 — refacto des repositories
- mettre les fonctions Firestore sur les bons chemins
- adapter les `subscribe*` et les lectures
- supprimer les dépendances legacy

### Bloc 4 — refacto des stores
- réorganiser les `controllers` autour des nouvelles responsabilités
- séparer `CampaignRules`, personnage, états, roster, équipement
- garder le style de programmation actuel si c’est compatible

### Bloc 5 — sécurisation Firestore
- sécuriser les sous-arbres de campagne
- protéger les personnages et notes
- valider les champs de propriété et de parentage

### Bloc 6 — refacto bloc par bloc des vues
- campagnes
- personnages et joueurs
- fiche PJ
- inventaire / équipement
- roster / dashboard MJ
- notes / outils de jeu

---

## 2. Refacto du back

### Fichiers principaux concernés
- [src/models/repositories/CampaignRepository.ts](src/models/repositories/CampaignRepository.ts)
- [src/models/repositories/CharacterRepository.ts](src/models/repositories/CharacterRepository.ts)
- [src/models/repositories/ParticipantRepository.ts](src/models/repositories/ParticipantRepository.ts)
- [src/models/repositories/InventoryRepository.ts](src/models/repositories/InventoryRepository.ts)
- [src/models/repositories/ClassRepository.ts](src/models/repositories/ClassRepository.ts)
- [src/models/repositories/RaceRepository.ts](src/models/repositories/RaceRepository.ts)

### Règles techniques
- conserver les fonctions async Firestore
- mappe systématique des documents en objet avec `id`
- `if (!db) return ...` à l’entrée de chaque fonction
- ne pas écrire de cast brut sans validation
- garder les `subscribe*` avec unsubscribe idempotent

### Ce qu’il faut modifier
- chemins de lecture vers les nouveaux sous-arbres
- points d’accès aux règles de campagne
- accès à l’état de combat
- sources d’équipement et d’inventaire
- lecture des notes et du roster

---

## 3. Refacto des stores

### Fichiers principaux concernés
- [src/controllers/useCampaignStore.ts](src/controllers/useCampaignStore.ts)
- [src/controllers/usePlayerStore.ts](src/controllers/usePlayerStore.ts)
- [src/controllers/useCampaignSessionStore.ts](src/controllers/useCampaignSessionStore.ts)

### Nouveau découpage recommandé
- `useCampaignRulesStore`
- `useCharacterSheetStore`
- `useRosterStore`
- `useEquipmentStore`

### Responsabilités par store
- `CampaignRulesStore` : règles / limites / formules / stats
- `CharacterSheetStore` : fiche personnage / attributs / actions / skills
- `RosterStore` : synthèse MJ / statuts / vue de campagne
- `EquipmentStore` : inventaire / équipement / objets / bonus

### Règles de structure
- refs module-scoped
- computed exposés à la vue
- gestion d’erreurs conforme au style actuel
- unsubscribe unique et idempotent

---

## 4. Sécurité Firestore

### Objectif
S’assurer que le nouveau schéma soit cohérent et protégé.

### À sécuriser
- données de campagne
- règles de campagne
- personnages et leurs sous-arbres
- notes
- roster

### Règles essentielles
- les joueurs ne peuvent écrire que leurs propres personnages
- les `PlayerId`, `CampaignId`, `ParentCharacterId` doivent être validés
- le roster ne doit pas être modifiable côté client
- les `CampaignRules` ne sont modifiables que par le MJ / admin

---

## 5. Refacto des vues

### Ordre recommandé
1. liste des campagnes
2. règles de campagne
3. liste des joueurs / personnages
4. fiche personnage
5. équipement / inventaire
6. roster MJ
7. notes
8. probabilités / outils de jeu

### Principe
Les vues ne doivent plus reconstruire des données héritées. Elles doivent consommer les données selon le nouveau modèle cible.

---

## 6. Points de vigilance

### 1. Les données dérivées ne doivent plus être calculées dans les vues
Les max de stats, secondaires, et état de combat doivent venir de la materialisation.

### 2. L’ancien modèle ne doit pas subsister dans le code d’accès
L’application doit lire à partir des bons sous-arbres, sans logique de fallback legacy.

### 3. Chaque bloc front doit être refait avec un contrat de données dédié
Les écrans ne doivent pas dépendre d’un “god object” de données.

### 4. Les tests doivent être ajustés pour refléter la structure cible
Les tests existants seront mis à jour, pas recopiés à l’identique.

---

## 7. Critère de validation technique

Le refacto technique est terminé si :

- les données sont générées dans le bon schéma
- les repositories lisent et écrivent dans les bons sous-arbres
- les stores exposent les bons flux
a- les permissions protègent les zones sensibles
- les vues peuvent être migrées par bloc sans dépendre du legacy

---

## 8. Prochaine étape

La suite logique est la définition des critères de “done” pour la refonte, puis la mise en œuvre des blocs techniques un par un.
