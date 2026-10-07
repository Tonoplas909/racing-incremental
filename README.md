# Pit Wall

Jeu incrémental de course en vue de dessus, dans le navigateur. Tu diriges une écurie : tes voitures roulent seules contre cinq écuries rivales, et tu investis l'argent gagné pour devenir plus rapide, agrandir l'écurie et débloquer de nouveaux circuits.

## Comment jouer

- Les courses s'enchaînent automatiquement : départ au feu, 3 tours, puis nouvelle course.
- Tu gagnes de l'argent à chaque tour, à chaque dépassement et selon ta place à l'arrivée.
- Clique sur tes voitures pour déclencher le nitro (recharge entre deux utilisations).
- Améliorations : moteur, pneus, freins et nitro, plus jusqu'à 4 voitures dans l'écurie.
- Les bonnes places rapportent de la réputation, qui débloque 5 circuits de plus en plus lucratifs.
- Ta progression est sauvegardée dans le navigateur (localStorage), aucun serveur.

## Lancer en local

Il faut un petit serveur : les modules ES ne se chargent pas depuis `file://`.

```
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

## Tests

```
npm test
```

Node 20 ou plus. Aucune dépendance, aucune étape de build.

## En ligne

https://tonoplas909.github.io/racing-incremental/

## Stack

- JavaScript vanilla (modules ES), Canvas 2D, localStorage

## Design

Voir [docs/design.md](docs/design.md).
