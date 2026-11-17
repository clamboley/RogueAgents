# Rogue Agents : fiche de conception

> Ce document décrit le jeu tel qu'il est. Les chiffres viennent de `src/game/progress.ts`, qui fait foi.

## Le pitch

Ta guilde descend un donjon de 105 étages. Chaque session OpenCode active envoie un aventurier au combat, chaque
sous-agent invoque un petit familier, et **chaque token consommé frappe le monstre en face**. Le jeu se joue tout
seul ; toi, tu choisis de temps en temps des talents qui orientent la guilde selon ta façon de vibecoder.

« J'ai dépensé 300 M de tokens, je suis au boss de l'étage 21. Et toi ? »

## Principes

1. **Seule la consommation compte.** Les tokens et le rythme de travail, jamais le projet ni la « réussite » d'une
   tâche.
2. **Ce que tu vois, c'est ce qui se passe.** Les dégâts tombent pendant que l'agent travaille, pas d'un coup à la fin.
3. **Jouable sans rien faire.** Le donjon avance tout seul ; choisir des talents est un plus, jamais une obligation.
4. **Aucune punition.** Pas de mort, pas de perte, rien ne se dégrade quand tu ne codes pas.
5. **Comparable entre collègues.** La profondeur dépend surtout des tokens ; les talents l'infléchissent sans la
   dominer.

## Le donjon

- **105 étages.** Un étage, c'est 4 monstres (15 % de son coût chacun) puis un boss (40 %).
- **Un biome tous les 10 étages**, chacun avec ses décors, ses monstres et son boss de biome à l'étage 10, 20, 30… :
  cryptes (Roi-Liche) · grottes de cristal (Colosse prismatique) · forêt fongique (Seigneur mycélien) · forge
  volcanique (Roi de la forge) · abysses (Léviathan) · citadelle gelée (Wyrm de givre) · royaume des nuages · palais
  céleste (Archonte) · espace · néant. On descend jusqu'aux abysses, puis on remonte par la glace et le ciel jusqu'aux
  étoiles et au néant. Sur les autres étages, le boss est un monstre « champion », deux fois
  plus grand et couronné.
- **Le cœur du donjon (étages 101 à 105).** Cinq ultra boss, un par étage, seuls, avec toute la vie de l'étage : le
  Limiteur de débit, l'Hallucination, la Boucle infinie, la Fenêtre de contexte, puis le Dévoreur de tokens. Quand le
  dernier tombe, le donjon est vaincu : la guilde campe pour de bon, les tokens continuent d'être comptés, et la ligne
  de partage dit en combien de jours.
- **Les points de vie se comptent en dégâts.** L'étage n coûte `300 000 × 1,1^(n−1)` points de dégâts. La
  progression est rapide au début, puis se mérite :

  | Boss vaincu                | Dégâts cumulés |
  | -------------------------- | -------------- |
  | Étage 10 : Roi-Liche       | ~5 M           |
  | Étage 20 : Colosse         | ~17 M          |
  | Étage 30 : Seigneur        | ~49 M          |
  | Étage 40 : Roi de la forge | ~133 M         |
  | Étage 50 : Léviathan       | ~350 M         |
  | Étage 60 : Wyrm de givre   | ~910 M         |
  | Étage 80 : Archonte        | ~6 milliards   |
  | Étage 100 : boss du néant  | ~41 milliards  |
  | Étage 105 : Dévoreur       | ~67 milliards  |

  Calibré sur un gros utilisateur d'un seul agent à la fois (~75 M de dégâts par jour) : les six premiers biomes en
  moins de deux semaines, l'étage 100 en un an et demi, la fin en deux ans. À 1,5 M de dégâts par jour, l'étage 20
  prend dix jours et l'étage 40 trois mois.

- **On part de zéro.** Au premier lancement, la guilde démarre à l'étage 1 : l'historique OpenCode d'avant
  l'installation ne compte pas. Ensuite, le travail fait pendant que l'app était fermée est rattrapé à l'ouverture
  (statistiques du serveur OpenCode).

## Le combat

- **Les tokens générés frappent en entier, le contexte à 5 %.** Sortie et raisonnement : 1 token = 1 point de dégât.
  Entrée, lecture et écriture de cache : 1 token = 0,05 point, avant talents. Chaque étape d'un agent relit tout son
  contexte, qui s'accumule une vingtaine de fois plus vite que la sortie : compté en entier, il ferait tout le jeu.
  Entrée et cache pèsent pareil, pour qu'un fournisseur qui met en cache et un qui ne le fait pas progressent au même
  rythme.
- **En direct.** Les tokens de sortie et de raisonnement frappent pendant le streaming, estimés d'après le texte reçu
  (~4 caractères par token). À la fin de chaque étape, le chiffre exact du serveur corrige l'estimation.
- **L'attaque chargée.** Les tokens d'entrée et de cache ne sont connus qu'en fin d'étape : pendant l'étape,
  l'aventurier charge une attaque (jauge au-dessus de sa tête) qui part quand l'étape se termine.
- **Les outils sont des gestes**, purement visuels : une bulle montre l'outil en cours ; un outil en erreur fait
  trébucher l'aventurier, sans effet sur le jeu.

## Le groupe

- **Une session active = un aventurier.** Active : un signe d'activité dans les 5 dernières minutes (l'activité d'un
  sous-agent compte pour sa session parente). Ensuite, l'aventurier quitte le donjon.
- **Huit classes** (chevalier, nain, archer, sorcier, voleur, clerc, barbare, nécromancien), tirées à partir de
  l'identifiant de la session, avec une couleur de vêtements au hasard : un même aventurier pour toute la session.
- **Un sous-agent = un familier** (chat, chouette, dragonnet, slime, feu follet, renard, grenouille, champignon) qui
  suit l'aventurier de sa session parente et combat avec les tokens du sous-agent.
- **Pas de limite de taille.** Au-delà d'une dizaine d'unités, l'écran montre les plus récemment actives.
- **Au repos** (aucune session ne travaille), la guilde campe autour d'un feu.

## Les talents

- **1 point de talent tous les 5 étages vaincus**, un au champion du milieu de chaque biome et un à son boss : 20
  points à la fin du dernier biome, aucun pour les ultra boss. L'arbre compte 40 rangs, on n'en remplit donc jamais
  que la moitié : c'est un vrai choix.
- **Une branche par style de vibecoding**, 5 rangs chacune :

  | Branche            | Style récompensé            | Effet par rang                                                 |
  | ------------------ | --------------------------- | -------------------------------------------------------------- |
  | **Essaim**         | Beaucoup de sous-agents     | Les familiers frappent +6 %                                    |
  | **Légion**         | Plusieurs sessions          | +1,5 % par aventurier en plus du premier (4 au plus)           |
  | **Loup solitaire** | Une seule session à la fois | +6 % quand un seul aventurier combat                           |
  | **Marathon**       | Sessions très longues       | Jusqu'à +6 %, atteint quand la session a 2 h                   |
  | **Phénix**         | Compactions fréquentes      | Une explosion à la compaction, puis +8 % pendant 15 min        |
  | **Érudit**         | Beaucoup de raisonnement    | Les tokens de raisonnement frappent +8 %                       |
  | **Économe**        | Beaucoup de cache           | Les tokens lus en cache frappent +6 %                          |
  | **Artisan**        | Beaucoup d'appels d'outils  | +0,5 % par outil réussi dans l'exécution en cours (12 au plus) |

- **Impact borné.** Chaque branche au maximum donne +30 à +40 % dans sa situation. Comme les points sont rares et
  certaines branches s'excluent (loup solitaire ou légion), la profondeur reste d'abord une affaire de tokens.
- **Réinitialisation gratuite**, pour essayer un autre style.

## Le partage

Le bouton « Copier ma progression » copie par exemple :
`Rogue Agents · Étage 21 (Forêt fongique) · 307,6 M tokens · Essaim 5 / Marathon 3`

## L'interface

- **Le panneau n'est que l'écran de jeu**, à 1,6:1, centré dans le panneau.
- **Un HUD peint** : en haut à gauche l'étage, la salle, les tokens dépensés et une gemme de connexion (verte en
  direct, rouge hors ligne, violette en démo) ; en haut à droite le monstre et sa barre de vie ; en bas à droite le
  bouton Talents, avec le médaillon des points libres, et à côté, en petit, Démo et Copier ma progression.
- **Le menu des talents** s'ouvre par-dessus la scène : cadre de pierre, bannière, icônes des branches et parchemin
  qui décrit la branche choisie.
- **Un bandeau** annonce chaque nouvel étage et son biome.
- **La démo** montre une fausse guilde au combat dans un biome au hasard, sans rien sauvegarder.

## Limites connues

- L'API des plugins d'interface d'OpenCode est expérimentale ; une mise à jour d'OpenCode peut demander d'adapter le
  plugin.
- La progression est sauvegardée par machine (stockage de l'app desktop) : sur un nouvel ordinateur, la guilde
  repart de l'étage 1.
- Les nuages, l'espace, le néant et les ultra boss n'ont pas encore leur art : ils empruntent, recolorés, celui des
  premiers biomes (`placeholder` dans `src/game/art.ts`).
- L'estimation en direct est approximative ; seul le chiffre de fin d'étape fait foi.
