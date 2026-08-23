# Critères d’acceptation du refacto

## Objectif

Ce document fixe les critères de validation de la migration vers la nouvelle architecture de données et du refacto technique / fonctionnel associé.

---

## 1. Critères techniques

### 1.1 Schéma de données cible
- le schéma Firestore correspond au modèle défini dans [docs/rpg-data-model.md](docs/rpg-data-model.md)
- chaque campagne possède ses structures propres dans `Campaigns/{campaignId}`
- les règles de campagne sont centralisées dans `CampaignRules/Main`
- les personnages sont organisés sous leur campagne
- le `States/Current` est distinct de la fiche lente
- l’inventaire est organisé sous le personnage

### 1.2 Seed / migration
- le script de seed existant produit bien les nouveaux chemins
- les fixtures existantes sont converties pour produire le schéma cible
- aucune donnée legacy ne continue à alimenter le système dans la version cible

### 1.3 Repositories
- les repositories touchent les bons sous-arbres
- les `subscribe*` fonctionnent sur les bons paths
- les fonctions de lecture / écriture respectent les conventions du projet

### 1.4 Stores
- les stores exposent les données selon la nouvelle source de vérité
- l’état live et les données lentement changées sont séparés
- les erreurs sont gérées selon le style du projet

---

## 2. Critères fonctionnels

### 2.1 Campagnes
- une campagne a bien ses règles, classes, races, joueurs et personnages rattachés
- toute logique de règles dépend de `CampaignRules/Main`

### 2.2 Personnages
- chaque personnage a une fiche de personnage propre
- les formes alternatives respectent `ParentCharacterId` et `ActiveFormId`
- le personnage possède bien un `States/Current`

### 2.3 Inventaire
- l’équipement porté est distinct du sac
- les objets sont sur le bon sous-arbre
- les transitions entre bag et équipement restent cohérentes

### 2.4 Roster / MJ
- le roster synthétique est bien alimenté via `Roster/Summary`
- le dashboard MJ reflète l’état vivant des personnages

### 2.5 Notes
- les notes sont bien séparées selon `Gm`, `Shared`, `Collaborative`
- les niveaux de permission correspondent au modèle cible

---

## 3. Critères de sécurité

- les droits par campagne sont cohérents
- les personnages ne peuvent être écrits que par leur propriétaire ou le MJ / admin
- les règles de campagne ne sont modifiables que par le bon niveau de rôle
- `Roster/Summary` n’est pas modifiable depuis le client
- les champs de propriété (`PlayerId`, `CampaignId`, `ParentCharacterId`) sont validés

---

## 4. Critères de tests

- les tests existants sont mis à jour pour refléter la nouvelle structure
- les tests repos / stores couvrent les nouveaux chemins Firestore
- les cas de migration sont validés sur les données d’exemple
- la suite de tests passe au moins sur les modules directement touchés

---

## 5. Critères de “done” pour le projet

Le refacto est considéré comme terminé si :

- le schéma cible est cohérent et documenté
- la migration des données fonctionne sur les fixtures existantes
- les repositories et stores lisent / écrivent sur le bon schéma
- les permissions de base sont en place
- les vues majeures sont migrées par blocs
- les tests passent sur la zone touchée
- la donnée legacy a été retirée du flux principal

---

## 6. Sign-off proposé

Le refacto est acceptée lorsque ces critères sont validés par le développeur en charge et par le chef de projet / validateur fonctionnel.

La validation doit se faire sur 3 niveaux :

1. cohérence du schéma de données
2. cohérence du back et des stores
3. cohérence fonctionnelle des vues migrées
