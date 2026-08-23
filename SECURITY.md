# Politique de securite

## Signaler une vulnerabilite

Ne publiez pas une vulnerabilite, une cle Firebase, un compte de service ou des donnees personnelles dans une issue publique. Utilisez le signalement prive de vulnerabilite de GitHub lorsqu'il est active pour le depot, ou contactez directement un mainteneur du projet.

Indiquez les etapes de reproduction, l'impact estime et, si possible, une proposition de correction. Un accusé de reception sera envoye des que le signalement aura ete examine.

## Secrets et donnees de production

Les fichiers `.env.local` et `scripts/keys/*.json` restent locaux. Les workflows utilisent des secrets GitHub pour les credentials de deploiement. Toute exposition accidentelle doit etre consideree comme une compromission : revoquez ou faites tourner le secret concerne avant toute autre action.
