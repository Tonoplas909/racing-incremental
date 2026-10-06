# Racing Incremental

Jeu incrémental de course en vue de dessus, dans le navigateur. On ne pilote pas les voitures : on agrandit le circuit (lignes droites, virages, checkpoints) et on achète des améliorations pour gagner plus d'argent.

## Fonctionnalités

- Plusieurs voitures qui tournent en continu sur le circuit
- Ajout de segments au circuit pendant la course
- Argent gagné à chaque passage de checkpoint
- Améliorations : nombre de voitures, vitesse, gain par checkpoint
- Progression sauvegardée en local dans le navigateur (localStorage), aucun serveur

## Jouer

En local, il faut un petit serveur : les modules ES ne se chargent pas depuis `file://`.

```
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

Les tests se lancent avec `npm test` (Node 20 ou plus).

Version en ligne : https://tonoplas909.github.io/racing-incremental/ (une fois GitHub Pages activé sur `main` / racine).

## Stack

- JavaScript vanilla, Canvas 2D, localStorage
- Aucune étape de build

## Design

Voir [docs/design.md](docs/design.md).
