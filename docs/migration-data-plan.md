# Plan de migration des données vers le nouveau modèle

## Objet

Ce document décrit comment migrer les données héritées du projet vers la structure cible présentée dans [docs/architecture-rpg-data-target.md](architecture-rpg-data-target.md) et [docs/rpg-data-model.md](rpg-data-model.md).

## Hypothèse de travail

- Les scripts et fixtures présents dans [scripts](scripts) sont la source officielle de migration.
- Le script de seed existant dans [scripts/seedAll.mjs](scripts/seedAll.mjs) sera réécrit pour produire le nouveau schéma cible.
- Il n’y a pas de compatibilité legacy à maintenir pendant la migration.

---

## 1. Source de données

### Données existantes à utiliser
- [scripts/data/campaigns-config.json](scripts/data/campaigns-config.json)
- [scripts/data/characters.json](scripts/data/characters.json)
- [scripts/data/defaultChars.json](scripts/data/defaultChars.json)
- [scripts/data/participants.json](scripts/data/participants.json)
- [scripts/data/inventories.json](scripts/data/inventories.json)
- [scripts/seedAll.mjs](scripts/seedAll.mjs)

### Objectif
Convertir ces données vers la nouvelle hiérarchie Firestore, en gardant les informations métier tout en remplaçant l’ancien modèle de stockage.

---

## 2. Règles de migration

### Règle 1 — remplacer le schéma existant
Le schéma legacy est supprimé et remplacé, sans couche de compatibilité. Les données sont réécrites dans le nouveau format.

### Règle 2 — préserver la logique métier
Les informations utiles existantes doivent être conservées, notamment :
- campagne et MJ
- personnages et classes / races
- bonus et traits
- inventaire et équipement
- état de combat
- notes de campagne

### Règle 3 — produire des objets conformes au contrat cible
Chaque document généré doit respecter les structures définies dans [docs/architecture-rpg-data-target.md](architecture-rpg-data-target.md).

---

## 3. Mapping legacy → cible

### 3.1 Campagnes
Ancien modèle : collection globale des campagnes.

Nouveau modèle :
- `Campaigns/{campaignId}`
- `Campaigns/{campaignId}/CampaignRules/Main`

### 3.2 Personnages
Ancien modèle : personnages globaux ou attachés à un `campaignId` sans sous-arbre explicite.

Nouveau modèle :
- `Campaigns/{campaignId}/Characters/{characterId}`
- `Campaigns/{campaignId}/Characters/{characterId}/States/Current`
- `Campaigns/{campaignId}/Characters/{characterId}/Equipment/Main`
- `Campaigns/{campaignId}/Characters/{characterId}/Items/{itemId}`

### 3.3 Classes et races
Ancien modèle : souvent dans des collections globales ou séparées.

Nouveau modèle :
- `Campaigns/{campaignId}/Classes/{classId}`
- `Campaigns/{campaignId}/Races/{raceId}`

### 3.4 Participants / joueurs
Ancien modèle : collection de participants.

Nouveau modèle :
- `Campaigns/{campaignId}/Players/{uid}`

### 3.5 Inventaire
Ancien modèle : inventaire séparé ou collection globale.

Nouveau modèle :
- personnage -> `Equipment/Main`
- bag -> `Items/{itemId}`

### 3.6 Roster
Ancien modèle : calcul ou vue dédiée en client.

Nouveau modèle :
- `Campaigns/{campaignId}/Roster/Summary`

---

## 4. Ordre de génération des documents

### Étape 1 — campagnes
Créer les documents de campagne et la racine.

### Étape 2 — règles de campagne
Créer `CampaignRules/Main` avec :
- `Statistics`
- `Dice`
- `CharacterCreation`
- `CurrencyName`
- `MaxItems`
- `MaxArmorSlots`
- `MaxWeaponSlots`

### Étape 3 — classes et races
Créer les classes et races attachées à la campagne.

### Étape 4 — joueurs
Créer les documents de `Players/{uid}`.

### Étape 5 — personnages
Créer les personnages et leur fiche principale.

### Étape 6 — objets dérivés
Créer `States/Current`, `Equipment/Main`, `Items/...`, et `Roster/Summary`.

### Étape 7 — notes
Créer les sous-documents de notes selon les permissions.

---

## 5. Transformation métier attendue

### 5.1 Classes et races
Les données de bonus doivent être converties en structure conforme :
- `Bonuses` : map de bonus
- `Traits` : map d’objets description / valeur
- `StatConstraints` : remplacements de bornes par stat

### 5.2 Personnages
Les personnages hérités doivent être transformés en :
- `Statistics` : base + bonus
- `Secondaries` : calculs dérivés
- `Actions` / `Skills` : champs de fiche
- `PlayerId`, `CampaignId` : dénormalisés

### 5.3 État de combat
Les valeurs de live state doivent être séparées de la fiche et écrites dans `States/Current`.

### 5.4 Inventaire
Les objets d’inventaire et équipements hérités doivent être transformés vers :
- `Equipment/Main` pour portés
- `Items/{itemId}` pour sac / stock
- `BonusRaw` / `BonusConditional` selon le format cible

---

## 6. Modifications attendues sur les scripts de seed

### Fichier cible
- [scripts/seedAll.mjs](scripts/seedAll.mjs)

### Objectif
Le script doit produire directement les collections et sous-collections ciblées, sans génération intermédiaire legacy.

### À faire
- réécrire la logique de génération des documents
- utiliser les fixtures existantes comme source
- produire les données finalisées dans le bon arbre Firestore
- invalider toute génération de données legacy dans le même script

---

## 7. Vérification de migration

### Contrôles de validation
- toutes les campagnes ont un `CampaignRules/Main`
- chaque personnage appartient bien à une campagne
- les classes et races sont attachées à la bonne campagne
- chaque personnage a un `States/Current`
- chaque inventaire est bien positionné sous le personnage
- les notes sont bien réparties selon `Gm`, `Shared`, `Collaborative`

### Critères de succès
- la migration produit un schéma conforme à la cible
- les données remontées par le script ne dépendent plus du legacy
- le back peut lire directement dans les nouveaux chemins

---

## 8. Risques et points de vigilance

### Risque 1 — incohérence sur les stats
Les `Statistics` et les formules doivent rester cohérentes au même endroit. Il faut empêcher toute divergence entre stat definitions et règles applicatives.

### Risque 2 — perte d’informations artisanales
Les scripts hérités peuvent contenir des données non explicites ou incomplètes. Il faudra vérifier les champs manquants et leur correspondance avec le nouveau schéma.

### Risque 3 — inventaire réparti dans trop de sources
Certaines données d’inventaire peuvent avoir été stockées ailleurs. Il faut les regrouper dans le bon sous-arbre du personnage.

### Risque 4 — logique de probabilités / règles de jeux non couvertes
Le moteur de calcul n’est pas un simple affichage ; le modèle cible impose une logique de `Dice` et de `CampaignRules` explicite. Il faut éviter de conserver des valeurs entrelacées avec du legacy.

---

## 9. Décision de migration retenue

La migration se fait en réécriture du script de seed existant, sans créer un script parallèle. Cela simplifie le workflow, réduit la duplication et force le code à générer le schéma cible immédiatement.

---

## 10. Prochaine étape

La suite logique est de passer au refacto technique du back :

- repositories
- stores
- tests
- sécurité Firestore
- migration progressives des vues par blocs
