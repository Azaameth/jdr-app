# Architecture cible – modèle de données RPG

## Objet

Ce document fixe le contrat de données cible du projet, selon le modèle décrit dans [docs/rpg-data-model.md](rpg-data-model.md). Il sert de référence pour la migration de données, le refacto des repositories, les stores et la refonte des vues.

## Principes de conception

- Une campagne est la racine fonctionnelle.
- Les règles d’une campagne vivent dans un seul document : `CampaignRules/Main`.
- Les personnages sont rattachés à une campagne et vivent sous cette hiérarchie.
- Les états de combat chaud sont séparés des données lentes de fiche.
- Les données dérivées sont matériellement calculées et non recalculées indépendamment côté client.
- La donnée de campagne devient la source de vérité unique.

---

## Collection map cible

```text
/Campaigns/{campaignId}
  /CampaignRules/Main
  /Roster/Summary
  /Classes/{classId}
  /Races/{raceId}
  /Players/{uid}
  /Characters/{characterId}
    /States/Current
    /Equipment/Main
    /Items/{itemId}
  /Notes/Gm
  /Notes/Shared
  /Notes/Collaborative
```

---

## 1. `/Campaigns/{campaignId}`

### Rôle
Représente la campagne elle-même.

### Champs attendus
- `DisplayName`
- `Description`
- `Status`
- `GmId`
- `CreatedAt`
- `UpdatedAt`

### Règles
- lecture autorisée aux utilisateurs authentifiés
- écriture autorisée au GM ou à l’admin

---

## 2. `/Campaigns/{campaignId}/CampaignRules/Main`

### Rôle
Document central de règles, unique source de vérité pour le calcul et la création de personnage.

### Sous-structures attendues
- `Statistics`
- `Dice`
- `CharacterCreation`
- `CurrencyName`
- `AdvantageDiceCount`
- `DisadvantageDiceCount`
- `MaxItems`
- `MaxArmorSlots`
- `MaxWeaponSlots`

### Détails
- `Statistics.Primary` : liste des stats primaires
- `Statistics.Secondary` : stats dérivées avec `Formula`
- `Dice` : configuration du moteur de probabilités
- `CharacterCreation` : formules de créations et budgets

### Contraintes
- il ne doit plus exister de couche `GameRules` distincte
- toute règle dépendante de stats doit tirer ses clés depuis ce document

---

## 3. `/Campaigns/{campaignId}/Classes/{classId}` et `/Races/{raceId}`

### Rôle
Définir les classes et races du système et leurs bonus.

### Champs attendus
- `DisplayName`
- `Description`
- `PictureUrl`
- `Bonuses`
- `Traits`
- `StatConstraints`
- `CreatedAt`
- `UpdatedAt`

### Politique
- les bonus peuvent cibler des stats de base ou des stats primaires
- les traits sont exposés dans le calculateur comme référence

---

## 4. `/Campaigns/{campaignId}/Players/{uid}`

### Rôle
Représente le joueur dans la campagne.

### Champs attendus
- `Status`
- `Notes`
- `CreatedAt`
- `UpdatedAt`

### Règles
- `Pending`, `Approved`, `Denied`
- les notes sont privées par thème

---

## 5. `/Campaigns/{campaignId}/Characters/{characterId}`

### Rôle
Fiche de personnage, slow-changing data.

### Champs attendus
- `ParentCharacterId`
- `ActiveFormId`
- `DisplayName`
- `Description`
- `PictureUrl`
- `Gender`
- `Level`
- `Status`
- `ClassId`
- `RaceId`
- `Statistics`
- `Secondaries`
- `Actions`
- `Skills`
- `AdvantageDiceCount`
- `DisadvantageDiceCount`
- `Elements`
- `Languages`
- `PlayerId`
- `CampaignId`
- `CreatedAt`
- `UpdatedAt`

### Règles
- une forme est aussi un personnage
- `ParentCharacterId` distingue les formes alternatives
- `Statistics.<stat>.Base` et `Statistics.<stat>.Bonus` doivent rester distingués

---

## 6. `/Campaigns/{campaignId}/Characters/{characterId}/States/Current`

### Rôle
État live, hot path du combat.

### Champs attendus
- `Health`
- `HealthCurrent`
- `Mana`
- `ManaCurrent`
- `PhysicalArmor`
- `PhysicalArmorCurrent`
- `MagicalArmor`
- `MagicalArmorCurrent`
- `PhysicalAttack`
- `MagicalAttack`
- `PhysicalDefense`
- `MagicalDefense`
- `PlayerId`
- `CampaignId`

### Règles
- les max sont calculés et écrits par la materialisation
- les `...Current` sont les valeurs de jeu en temps réel
- les valeurs de combat ne doivent pas être calculées dans l’UI

---

## 7. `/Campaigns/{campaignId}/Characters/{characterId}/Equipment/Main`

### Rôle
Équipement porté / actuellement équipé.

### Champs attendus
- `Armor`
- `Weapons`
- `Currency`
- `PlayerId`
- `CampaignId`

### Règle
- l’équipement est un sous-arbre du personnage
- le déplacement entre inventaire et équipement est transactionnel

---

## 8. `/Campaigns/{campaignId}/Characters/{characterId}/Items/{itemId}`

### Rôle
Inventaire du personnage.

### Champs attendus
- `DisplayName`
- `Description`
- `BonusRaw`
- `BonusConditional`
- `Quantity`
- `PlayerId`
- `CampaignId`

---

## 9. `/Campaigns/{campaignId}/Roster/Summary`

### Rôle
Vue synthétique du MJ.

### Champs attendus
- `Characters` : map par id
- `UpdatedAt`

### Règles
- document de lecture synthétique
- pas de logique de jeu dans le client

---

## 10. `/Campaigns/{campaignId}/Notes/{Gm|Shared|Collaborative}`

### Rôle
Notes partagées selon le niveau de visibilité.

### Structure
- `Entries: map<themeName, { Content, UpdatedAt, UpdatedBy }>`

### Permission
- `Gm` : GM / admin only
- `Shared` : GM / admin + joueurs approuvés
- `Collaborative` : GM / admin + joueurs approuvés

---

## 11. Matérialisation (source de vérité dérivée)

L’architecture cible prévoit une unique chaîne de materialisation, sans duplication de logique :

1. calcul des primaires effectifs
2. calcul des secondaries
3. calcul des max de pools et statiques
4. écriture dans `States/Current`
5. mise à jour du `Roster/Summary`

### Aucun recalcul implicite dans les vues
Les écrans doivent lire les données déjà materialisées, pas les recalculer entre eux.

---

## 12. Points de décision à garder stables

- `CampaignRules/Main` remplace la couche `GameRules` anciennement séparée
- `Statistics` et formules vivent au même endroit
- `PlayerId` et `CampaignId` restent dénormalisés mais validés côté serveur
- `ActiveFormId` et `ParentCharacterId` restent les pointeurs de transformation
- le model laisse de côté les effets temporaires et la logique de combat automatisée

---

## 13. Critère de validation fonctionnelle

Le refacto est conforme si :

- chaque document est bien placé selon les chemins ci-dessus
- les stats et formules sont contenues dans `CampaignRules/Main`
- les personnages sont stockés sous leur campagne
- le `States/Current` contient uniquement les valeurs hot path
- le `Roster/Summary` reste un document de lecture synthétique
- les transformations alternatives respectent le contrat `ParentCharacterId` / `ActiveFormId`

---

## 14. Prochaine étape

La suite est de convertir ce contrat cible en :

- plan de migration des données
- refacto back (repositories + stores)
- refacto front par blocs
- critères de validation technique
