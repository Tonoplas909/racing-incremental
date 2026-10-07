# Pit Wall — spécification

**Date :** 2026-10-06
**Thème imposé :** jeu incrémental de course, vue de dessus, en 2D. Tout le reste est choisi par Claude.
**Contraintes :** site statique sur GitHub Pages, aucune base de données, progression en local (localStorage), JavaScript sans dépendance ni build.

## 1. Concept

Le joueur dirige une écurie de course. Ses voitures (1 au départ, jusqu'à 4) affrontent 5 écuries rivales pilotées par l'IA sur un circuit dessiné en vue de dessus. Les courses s'enchaînent automatiquement. Le joueur gagne de l'argent pendant et après chaque course, l'investit dans ses voitures, et gagne de la réputation qui débloque des circuits plus longs, plus techniques et plus rémunérateurs.

Boucle :
1. Départ arrêté (feux rouges puis vert), 3 tours.
2. Pendant la course : argent à chaque tour bouclé et à chaque dépassement ; le joueur clique sur ses voitures pour déclencher un nitro (temps de recharge).
3. Fin de course : prime selon la position de chaque voiture du joueur, réputation selon la meilleure position.
4. Le joueur achète des améliorations ; la course suivante démarre seule.

## 2. Circuits

- 5 circuits, chacun défini par une liste de points de contrôle reliés par une spline fermée lisse ; largeur de piste 70 unités.
- Débloqués par la réputation : 0, 15, 45, 110, 250.
- Chaque circuit a un multiplicateur de récompense : ×1, ×2,5, ×6, ×15, ×40.
- Les rivaux sont plus forts sur les circuits avancés : performance ×(0,98 × 1,25^rang du circuit), modulée par un niveau propre à chaque écurie.
- Le joueur choisit son circuit parmi ceux débloqués ; un nouveau circuit débloqué est sélectionné automatiquement pour la course suivante.

## 3. Course et pilotage

- Chaque voiture a 4 caractéristiques : vitesse de pointe, accélération, freinage, adhérence.
- Les voitures suivent la piste, calculent la vitesse maximale des virages à venir (adhérence / courbure) et freinent à temps : elles ralentissent avant les virages et réaccélèrent en sortie.
- Trafic : une voiture ne traverse jamais celle de devant ; si elle est plus rapide, elle se décale pour la doubler.
- Nitro : +40 % de vitesse de pointe et +60 % d'accélération pendant une courte durée, puis recharge.
- Fin de course : chaque voiture termine au bout de 3 tours ; la course s'arrête quand toutes ont terminé ou 20 s après le vainqueur (les autres sont classées par distance parcourue).

## 4. Économie

- Tour bouclé : 5 $ × multiplicateur du circuit, par voiture du joueur.
- Dépassement : 3 $ × multiplicateur, uniquement quand la voiture atteint une place jamais atteinte depuis le départ (pas de farm en se faisant redoubler).
- Prime de fin : 120, 80, 60, 40, 30, 20, 15, 10, 10 $ selon la position × multiplicateur.
- Réputation : (5 / 3 / 2 / 1 pour une meilleure place de 1 / 2 / 3 / 4) × (rang du circuit + 1), rang compté à partir de 0.
- Améliorations (coût = base × croissance^niveau) :
  - Moteur (50, ×1,6) : vitesse de pointe ×1,06 et accélération ×1,08 par niveau
  - Pneus (50, ×1,6) : adhérence ×1,07 par niveau
  - Freins (40, ×1,55) : freinage ×1,10 par niveau
  - Nitro (80, ×1,7) : durée 1,5 s + 0,3 s par niveau, recharge 8 s × 0,93^niveau
  - Nouvelle voiture : 300, 2 000, 12 000 $ (4 voitures max)

## 5. Rendu

- Herbe tondue en bandes, arbres décoratifs, piste asphalte bordée de lignes blanches, vibreurs rouge et blanc à l'intérieur des virages, ligne d'arrivée en damier, cases de la grille de départ.
- Voitures dessinées : ombre, carrosserie aux couleurs de l'écurie, aileron, cockpit, roues ; les voitures du joueur ont un halo, leur position et une jauge de nitro.
- Effets : traces de freinage qui s'estompent, flammes de nitro, gains flottants (« +15 $ »), feux de départ.
- Panneau latéral : argent, réputation, circuit et tour en cours, classement en direct, améliorations, circuits. Interface en français.

## 6. Sauvegarde

- Seul le profil est sauvegardé (argent, réputation, niveaux, nombre de voitures, circuit choisi, statistiques) ; une course interrompue recommence au rechargement.
- Clé localStorage `pitwall.v2` ; sauvegarde toutes les 5 s, après chaque achat et à la fermeture de la page ; une sauvegarde invalide ou un stockage indisponible donnent une partie neuve sans planter.

## 7. Hors périmètre (v1)

Progression hors ligne, prestige, sons, multijoueur, classements en ligne.
