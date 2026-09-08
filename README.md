# TrioProjet

[![Licence MIT](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)
[![Dépendances](https://img.shields.io/badge/d%C3%A9pendances-0-brightgreen)]()
[![PRs bienvenues](https://img.shields.io/badge/PRs-bienvenues-ff69b4)](CONTRIBUTING.md)

**Le projet de groupe, enfin bien réparti.**

TrioProjet est un petit outil pour les étudiants : vous ajoutez les membres du
groupe, vous listez les tâches, et l'outil fait une répartition équitable avec
la règle du serpentin — celle des terrains de jeu. Plus de dispute sur qui fait
quoi, et surtout plus de personne qui se retrouve avec tout le travail.

![Aperçu de TrioProjet](docs/preview-resultat.png)

## Pourquoi ?

Parce que les projets de groupe, c'est souvent le même scénario : deux
personnes travaillent, une personne disparaît, et la répartition se fait dans
la précipitation la veille de l'échéance. TrioProjet règle ce moment en
30 secondes, avec une méthode que tout le monde comprend et que personne ne
peut contester — puisque c'est le hasard et le tour de rôle qui décident.

## Utilisation

Le site est disponible en ligne : **https://strongbug999.github.io/trioprojet/**

1. Ajoutez les membres du groupe (au moins deux)
2. Listez les tâches à faire
3. Cliquez sur « Répartir équitablement »
4. Copiez le résultat et envoyez-le au groupe

Aucune inscription, aucune publicité, et **toutes les données restent sur votre
appareil** (rien n'est envoyé sur un serveur).

## La règle du serpentin

C'est la méthode utilisée pour répartir : on distribue les tâches une par une,
dans un ordre mélangé, à tour de rôle — puis on repart en sens inverse, comme
lorsqu'on constitue des équipes dans la cour de récréation. Résultat : les
écarts entre membres ne dépassent jamais une tâche, et l'ordre de prise reste
impartial.

## Technologies

Du HTML, du CSS et du JavaScript. C'est tout.

- **0 dépendance**, aucun framework, aucune base de données
- **0 serveur** : le site est un ensemble de fichiers statiques
- Les données sont conservées dans le `localStorage` de votre navigateur

## Feuille de route

Des idées pour les prochaines versions (toute contribution est bienvenue) :

- [ ] Indiquer ses préférences (tâche souhaitée / tâche évitée) pour une
      répartition qui tient compte des envies
- [ ] Lien de partage (le projet encodé dans l'URL, toujours sans serveur)
- [ ] Pondération des tâches (une recherche documentaire ne demande pas la
      même charge qu'une répétition d'oral)
- [ ] Export en image pour partage facile
- [ ] Version anglaise

## Contribuer

Les contributions sont les bienvenues, même (surtout !) si c'est votre première
fois. Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour bien démarrer.

## Licence

[MIT](LICENSE) — faites-en ce que vous voulez.
