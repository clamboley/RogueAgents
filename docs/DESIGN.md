# Rogue Agents : fiche de conception

> Ce document décrit le jeu tel qu'il est. Les chiffres viennent de `src/game/progress.ts`, qui fait foi.

## Le pitch

Ta guilde descend un donjon infini. Chaque session OpenCode active envoie un aventurier au combat, chaque sous-agent
invoque un petit familier, et **chaque token consommé frappe le monstre en face**. Le jeu se joue tout seul ; toi, tu
choisis de temps en temps des talents qui orientent la guilde selon ta façon de vibecoder.

« J'ai dépensé 5 M de tokens, je suis au boss de l'étage 21. Et toi ? »

## Principes

1. **Seule la consommation compte.** Les tokens et le rythme de travail, jamais le projet ni la « réussite » d'une
   tâche.
2. **Ce que tu vois, c'est ce qui se passe.** Les dégâts tombent pendant que l'agent travaille, pas d'un coup à la fin.
3. **Jouable sans rien faire.** Le donjon avance tout seul ; choisir des talents est un plus, jamais une obligation.
4. **Aucune punition.** Pas de mort, pas de perte, rien ne se dégrade quand tu ne codes pas.
5. **Comparable entre collègues.** La profondeur dépend surtout des tokens ; les talents l'infléchissent sans la
   dominer.

## Le donjon

- **Infini, découpé en étages.** Un étage, c'est 4 monstres (15 % de son coût chacun) puis un boss (40 %).
- **Un biome tous les 10 étages**, chacun avec ses décors, ses monstres et son boss de biome à l'étage 10, 20, 30… :
  cryptes (Roi-Liche) · grottes de cristal (Colosse prismatique) · forêt fongique (Seigneur mycélien) · forge
  volcanique (Roi de la forge) · abysses (Léviathan) · palais céleste (Archonte). Ensuite, les biomes reviennent en
  version « corrompue », plus sombre. Sur les autres étages, le boss est un monstre « champion », deux fois plus grand
  et couronné.
- **Les points de vie se comptent en tokens.** L'étage n coûte `50 000 × 1,15^(n−1)` tokens. La progression est
  rapide au début, puis se mérite, et il n'y a pas de fin :

  | Boss vaincu                | Tokens cumulés |
  | -------------------------- | -------------- |
  | Étage 10 : Roi-Liche       | ~1 M           |
  | Étage 20 : Colosse         | ~5 M           |
  | Étage 30 : Seigneur        | ~22 M          |
  | Étage 40 : Roi de la forge | ~89 M          |
  | Étage 50 : Léviathan       | ~360 M         |
  | Étage 60 : Archonte        | ~1,5 milliard  |

- **L'historique compte.** Au premier lancement, les tokens déjà dépensés (statistiques du serveur OpenCode) sont
  convertis en progression : on démarre directement à l'étage mérité. Le travail fait pendant que l'app était fermée
  est rattrapé de la même façon.

## Le combat

- **1 token = 1 point de dégât**, quel que soit son type (entrée, sortie, raisonnement, cache), avant talents.
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

- **1 point de talent tous les 2 étages vaincus.** Les points restent rares pour que l'arbre soit un vrai choix :
  5 points vers 1 M de tokens, 15 vers 22 M, 30 seulement après l'Archonte, et les 40 qui remplissent tout l'arbre
  au-delà de 20 milliards.
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
`Rogue Agents · Étage 21 (Forêt fongique) · 5,2 M tokens · Essaim 5 / Marathon 3`

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
- La progression est sauvegardée par machine (stockage de l'app desktop). Les tokens passés se recalculent depuis le
  serveur, mais pas les choix de talents.
- L'estimation en direct est approximative ; seul le chiffre de fin d'étape fait foi.
