# Proposition de refacto : migration vers la nouvelle structure de données RPG

## Objet

Cette proposition a pour but de refondre la structure de données du projet pour aligner l’application sur le modèle défini dans [docs/rpg-data-model.md](rpg-data-model.md), tout en s’appuyant sur les scripts et fixtures déjà présents pour sécuriser la migration côté back.

Le projet est aujourd’hui encore structuré autour d’une logique legacy : campagnes, participants, personnages, inventaires et règles de jeu répartis de façon non unifiée. Le nouveau modèle impose une hiérarchie plus cohérente et plus robuste, avec :

- une unique source de vérité pour les règles de campagne : `CampaignRules/Main`
- des personnages organisés sous les campagnes concernées
- des états de combat chaud séparés dans `States/Current`
- des objets d’équipement dans `Equipment/Main` et `Items/{itemId}`
- une logique de materialisation explicitement centralisée
- une séparation claire entre données de campagne, données de personnage, et données de session live

---

## Constat actuel

Le code d’application est majoritairement compatible avec le modèle précédent, avec des repositories et stores encore centrés sur :

- `Campaigns` en tant qu’entité globale
- `participants` / `players` séparés
- `characters` globalement listés et filtrés par campagne
- `inventories` dans une collection distincte
- absence de couche `CampaignRules` unifiée

Les fichiers existants comme [src/models/repositories/CharacterRepository.ts](src/models/repositories/CharacterRepository.ts), [src/controllers/useCampaignStore.ts](src/controllers/useCampaignStore.ts), [src/controllers/usePlayerStore.ts](src/controllers/usePlayerStore.ts) et [scripts/seedAll.mjs](scripts/seedAll.mjs) sont utiles et doivent être réutilisés, mais ils doivent être repensés pour correspondre au nouveau contrat de données.

---

## Principes directeurs du refacto

1. Ne pas reconstruire l’UI avant la donnée
2. S’appuyer sur les scripts existants comme source de migration back-first
3. Conserver le style actuel du projet : repos Firestore fonctionnels, stores singleton, subscriptions idempotentes, gestion d’erreurs en français
4. Définir un contrat de données stable avant modification de l’UI
5. Faire un refacto progressif, sans casser l’app en une seule étape

---

## Cible fonctionnelle

### 1. Structure de données cible

Le nouveau schéma établi dans [docs/rpg-data-model.md](docs/rpg-data-model.md) prévoit :

- `/Campaigns/{campaignId}`
- `/Campaigns/{campaignId}/CampaignRules/Main`
- `/Campaigns/{campaignId}/Classes/{classId}`
- `/Campaigns/{campaignId}/Races/{raceId}`
- `/Campaigns/{campaignId}/Players/{uid}`
- `/Campaigns/{campaignId}/Characters/{characterId}`
- `/Campaigns/{campaignId}/Characters/{characterId}/States/Current`
- `/Campaigns/{campaignId}/Characters/{characterId}/Equipment/Main`
- `/Campaigns/{campaignId}/Characters/{characterId}/Items/{itemId}`
- `/Campaigns/{campaignId}/Roster/Summary`
- `/Campaigns/{campaignId}/Notes/{Gm|Shared|Collaborative}`

### 2. Rôle de la couche `CampaignRules`

La documentation impose une simplification claire :

- `CampaignRules/Main` contient les `Statistics`, les `Dice`, la configuration de création, les formules de calcul et les limites.
- plus de double source de vérité entre `GameRules` et `CampaignRules`
- plus de dépendance fragile entre stat definitions et règles par collection

### 3. Rôle des personnages et des formes

Les personnages peuvent désormais être transformés en formes alternatives, avec :

- `ParentCharacterId`
- `ActiveFormId`
- `States/Current` propre à chaque forme
- `Statistics` et `Secondaries` recalculés via materialisation

---

## Plan d’action proposé

### Phase 1 — Stabiliser le contrat de données

#### Livrables
- définition des types TypeScript du nouveau modèle
- mapping explicite entre legacy et nouveau schéma
- schéma de stockage migré en version “cible”

#### Dossiers concernés
- [src/models/types](src/models/types)
- [src/models/repositories](src/models/repositories)
- [src/controllers](src/controllers)

#### Actions
- introduire les types `CampaignRules`, `Character`, `CharacterState`, `Equipment`, `RosterSummary`
- définir les structures de `Statistics`, `Secondaries`, `Bonuses`, `Traits`, `Skills`, et `Actions`
- formaliser le format attendu côté Firestore

#### Critère de validation
- tous les nouveaux types correspondent au schéma de [docs/rpg-data-model.md](docs/rpg-data-model.md)
- aucun écran ne dépend plus d’un format ambigu ou ancien

---

### Phase 2 — Migrer les scripts de seed et fixtures existants

#### Objectif
Utiliser les scripts et JSON déjà présents comme base de migration back-first, sans reconstruire manuellement toute la donnée.

#### Sources à exploiter
- [scripts/seedAll.mjs](scripts/seedAll.mjs)
- [scripts/data/characters.json](scripts/data/characters.json)
- [scripts/data/defaultChars.json](scripts/data/defaultChars.json)
- [scripts/data/inventories.json](scripts/data/inventories.json)
- [scripts/data/participants.json](scripts/data/participants.json)
- [scripts/data/campaigns-config.json](scripts/data/campaigns-config.json)

#### Actions
- créer un script de migration dédié : `migrateLegacyCampaignData.mjs`
- lire les valeurs JSON existantes
- convertir la structure vers le nouveau format Firestore
- générer les documents suivants :
  - `Campaigns/{id}`
  - `Campaigns/{id}/CampaignRules/Main`
  - `Campaigns/{id}/Classes/{classId}`
  - `Campaigns/{id}/Races/{raceId}`
  - `Campaigns/{id}/Players/{uid}`
  - `Campaigns/{id}/Characters/{id}`
  - `Campaigns/{id}/Characters/{id}/States/Current`
  - `Campaigns/{id}/Characters/{id}/Equipment/Main`
  - `Campaigns/{id}/Characters/{id}/Items/{itemId}`
- préparer les mappings pour `Bonuses`, `StatConstraints`, `Secondary` et `Class/Race` traits

#### Critère de validation
- le script produit des documents conformes au nouveau schéma
- aucun id ou référence ne dépend plus du format legacy

---

### Phase 3 — Adapter les repositories au nouveau modèle

#### Objectif
Aligner les accès Firestore sur la nouvelle hiérarchie sans casser les conventions actuelles du projet.

#### Repositories à réviser
- [src/models/repositories/CharacterRepository.ts](src/models/repositories/CharacterRepository.ts)
- [src/models/repositories/CampaignRepository.ts](src/models/repositories/CampaignRepository.ts)
- [src/models/repositories/ParticipantRepository.ts](src/models/repositories/ParticipantRepository.ts)
- [src/models/repositories/InventoryRepository.ts](src/models/repositories/InventoryRepository.ts)
- [src/models/repositories/ClassRepository.ts](src/models/repositories/ClassRepository.ts)
- [src/models/repositories/RaceRepository.ts](src/models/repositories/RaceRepository.ts)

#### Règles à respecter
- `if (!db) return ...` en entrée de chaque fonction
- mapper les snapshots avec `{ id: doc.id, ...doc.data() }`
- ne pas cast brut vers le type sans validation
- conserver les subscriptions avec `unsubscribe` idempotent

#### Exemple de migration logique
- `listCharactersByCampaign()` doit lire `Campaigns/{campaignId}/Characters`
- `listCampaigns()` reste sur la collection `Campaigns`
- `subscribeParticipantsByCampaign()` est migré vers `Campaigns/{campaignId}/Players`
- l’inventaire d’un personnage devient un sous-arbre de personnage, pas une collection globale

---

### Phase 4 — Refactor des stores selon la nouvelle séparation des responsabilités

#### Objectif
Représenter le fonctionnement réel du modèle de données dans les stores :

- `Campaign rules` pour config / calculs / limites
- `Character` pour feuille de personnage
- `States` pour état live
- `Roster` pour dashboard MJ
- `Equipment` pour inventaire et équipement

#### Stores à revoir
- [src/controllers/useCampaignStore.ts](src/controllers/useCampaignStore.ts)
- [src/controllers/usePlayerStore.ts](src/controllers/usePlayerStore.ts)
- [src/controllers/useCampaignSessionStore.ts](src/controllers/useCampaignSessionStore.ts)
- nouveaux stores spécifiques : `useCampaignRulesStore`, `useCharacterSheetStore`, `useRosterStore`, `useEquipmentStore`

#### Conventions à préserver
- refs module-scoped
- `computed` exposés au composant
- `error.value = err instanceof Error ? err.message : '...'`
- unsubscribe unique par abonnement
- `subscribeX(id)` idempotent

---

### Phase 5 — Adapter les vues progressivement

#### Ordre conseillé
1. liste des campagnes
2. campagne et règles
3. liste des personnages / joueurs
4. fiche PJ
5. inventaire / équipement
6. notes et roster MJ
7. vues calcul de probabilité / outils de jeu

#### Pourquoi cet ordre
Parce que l’UI actuelle dépend encore fortement de l’ancien modèle. La migration doit être progressive pour éviter une rupture globale.

---

### Phase 6 — Sécuriser les règles et permissions

#### Objectif
Faire correspondre les droits Firestore au nouveau schéma, sans couche de règles séparée inutile.

#### À sécuriser
- `Campaigns/{campaignId}`
- `Campaigns/{campaignId}/CampaignRules/{doc}`
- `Campaigns/{campaignId}/Classes/{classId}`
- `Campaigns/{campaignId}/Races/{raceId}`
- `Campaigns/{campaignId}/Characters/{characterId}`
- `Campaigns/{campaignId}/Notes/*`

#### À vérifier
- droits GM / Admin
- droits joueurs sur leur propre personnage
- validation de `PlayerId`, `CampaignId`, `ParentCharacterId`, `ActiveFormId`
- protection de `Roster/Summary` en écriture côté client

---

## Livrables attendus

### Back
- schéma de données cible documenté
- script de migration depuis les fixtures existantes
- repositories mis à jour pour le nouveau chemin de stockage
- stores alignés sur le nouveau modèle
- permissions Firestore cohérentes

### Front
- vues compatibles avec le nouveau schéma
- listes de personnages / joueurs / campagne adaptatives
- fiches PJ et états live lisibles
- inventaire et calcul de probabilités compatibles avec les nouvelles règles

---

## Jalon de validation

La refonte est validée quand les conditions suivantes sont réunies :

- les scripts de seed produisent bien les nouvelles structures Firestore
- les repositories lisent et écrivent dans les bons sous-arbres
- les stores exposent les nouvelles données sans logique legacy
- les règles de campagne sont unifiées dans `CampaignRules/Main`
- les personnages et formes respectent le contrat `ParentCharacterId` / `ActiveFormId`
- le front continue à fonctionner sur une base migrée sans rupture majeure

---

## Risques et points de vigilance

### 1. Cohérence des données legacy / new model
Il faudra garantir qu’une migration ne produise pas une donnée partiellement compatible ou incohérente.

### 2. Duplications de logique
Le risque principal est de courir deux modèles en parallèle trop longtemps. La règle est claire : la donnée cible doit devenir la seule source de vérité.

### 3. UI totalement couplée au format ancien
Il faudra migrer progressivement les composants en blocs, sans bricolage transitoire dispersé.

### 4. Permissions insuffisantes sur les sous-documents
Le modèle impose des contrôles précis sur les charactères, leurs sous-collections, et leurs notes.

---

## Recommandation finale

La meilleure stratégie est une migration progressive, orchestrée à partir des scripts et fixtures existants, avec un ordre strict :

1. contrat de données
2. migration de la donnée back
3. repositories
4. stores
5. vues et permissions
6. validation fonctionnelle

C’est le chemin le plus sûr pour obtenir une refonte robuste, cohérente et proprement alignée avec [docs/rpg-data-model.md](docs/rpg-data-model.md), sans mettre en péril le flux de développement actuel.

---

## Résumé décisionnel

Le projet doit passer d’un modèle legacy “plat” et dispersé vers un modèle hiérarchique et explicite centré sur les campagnes. Cette migration est faisable avec les scripts existants comme base de travail, à condition de traiter d’abord la donnée, puis les repositories, puis les stores, puis les vues. C’est la seule approche qui permet de passer à la nouvelle structure sans reposer sur une refonte UI aveugle ou une migration destructrice.
