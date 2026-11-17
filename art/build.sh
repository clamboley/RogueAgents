#!/usr/bin/env bash
# Rebuilds every sprite from the generated images in art/raw, then exports them to src/assets.
# Needs Python 3 with numpy and a Pillow built with libimagequant (see art/README.md).
set -euo pipefail
cd "$(dirname "$0")"

S="python3 -I tools/sheet.py"
P="python3 -I tools/pixelize.py"
rm -rf processed
mkdir -p processed

# Backgrounds: 480x300, the floor stretched down where the image left it short.
for n in 1 2; do
  $P raw/bg-crypt-$n.jpeg processed/bg-crypt-$n.png --width 480 --height 300 --colors 64 --floor 0.73 --floor-to 0.64
  $P raw/bg-crystal-$n.jpeg processed/bg-crystal-$n.png --width 480 --height 300 --colors 64 --floor 0.70 --floor-to 0.64
  $P raw/bg-fungal-$n.jpeg processed/bg-fungal-$n.png --width 480 --height 300 --colors 64
  $P raw/bg-forge-$n.jpeg processed/bg-forge-$n.png --width 480 --height 300 --colors 64 --floor 0.665 --floor-to 0.64
  $P raw/bg-abyss-$n.jpeg processed/bg-abyss-$n.png --width 480 --height 300 --colors 64
  $P raw/bg-celestial-$n.jpeg processed/bg-celestial-$n.png --width 480 --height 300 --colors 64 --floor 0.66 --floor-to 0.62
  $P raw/bg-frost-$n.jpeg processed/bg-frost-$n.png --width 480 --height 300 --colors 64 --floor 0.69 --floor-to 0.64
  $P raw/bg-storm-$n.jpeg processed/bg-storm-$n.png --width 480 --height 300 --colors 64 --floor 0.68 --floor-to 0.64
  $P raw/bg-space-$n.jpeg processed/bg-space-$n.png --width 480 --height 300 --colors 64 --floor 0.67 --floor-to 0.64
  $P raw/bg-void-$n.jpeg processed/bg-void-$n.png --width 480 --height 300 --colors 64 --floor 0.67 --floor-to 0.64
done

# Adventurers and familiars.
$S raw/heroes-1.jpeg processed/heroes --grid 4x3 --scale 7.6 \
  --names knight-idle,knight-attack,knight-sit,dwarf-idle,dwarf-attack,dwarf-sit,archer-idle,archer-attack,archer-sit,wizard-idle,wizard-attack,wizard-sit
$S raw/heroes-2.jpeg processed/heroes-2 --grid 4x3 --scale 7.6 \
  --names rogue-idle,rogue-attack,rogue-sit,cleric-idle,cleric-attack,cleric-sit,barbarian-idle,barbarian-attack,barbarian-sit,necromancer-idle,necromancer-attack,necromancer-sit
$S raw/familiars.jpeg processed/familiars --grid 4x2 --scale 12 \
  --names cat-idle,cat-attack,owl-idle,owl-attack,dragon-idle,dragon-attack,slime-idle,slime-attack
$S raw/familiars-2.jpeg processed/familiars-2 --grid 4x2 --scale 12 \
  --names wisp-idle,wisp-attack,fox-idle,fox-attack,frog-idle,frog-attack,mushroom-idle,mushroom-attack

# Monsters and biome bosses.
$S raw/monsters-crypt.jpeg processed/monsters-crypt --grid 1x4 --scale 9.5 --despill --names skeleton,rat,ghost,bat
$S raw/monsters-crystal.jpeg processed/monsters-crystal --grid 1x4 --scale 9.5 --names shardling,geode,echo,glimmerbat
$S raw/monsters-fungal.jpeg processed/monsters-fungal --grid 1x4 --scale 9.5 --names mossbones,boar,sporeling,mothling
$S raw/monsters-forge.jpeg processed/monsters-forge --grid 1x4 --scale 9.5 --names ashwraith,cinderhound,ember,magmaw
$S raw/monsters-abyss.jpeg processed/monsters-abyss --grid 1x4 --scale 9.5 --names drowned,lurker,shade,jelly
$S raw/monsters-celestial-facing-right.jpeg processed/monsters-celestial --grid 1x4 --scale 9.5 --flip \
  --names sentinel,griffin,seraphling,starbat
$S raw/monsters-frost.jpeg processed/monsters-frost --grid 1x4 --scale 10 --flip --despill \
  --names icebound,frostwolf,rimewisp,snowowl
$S raw/monsters-storm.jpeg processed/monsters-storm --grid 1x4 --scale 10 --despill \
  --flip-only stormknight,tempestharpy,windwraith --names stormknight,tempestharpy,windwraith,thunderwyvern
$S raw/monsters-space.jpeg processed/monsters-space --grid 1x4 --scale 10 --despill \
  --flip-only moongolem,comethound --names moongolem,comethound,nebulajelly,starmanta
$S raw/monsters-void.jpeg processed/monsters-void --grid 1x4 --scale 10 --despill \
  --flip-only voidwalker,riftcrawler --names voidwalker,riftcrawler,nulleye,stareater
$S raw/boss-crypt.jpeg processed/monsters-boss-crypt --grid 1x1 --scale 8 --colors 48 --names lich
$S raw/boss-crystal.jpeg processed/monsters-boss-crystal --grid 1x1 --scale 8.8 --colors 48 --strict --names prism
$S raw/boss-fungal.jpeg processed/monsters-boss-fungal --grid 1x1 --scale 8.6 --colors 48 --drop-far 60 --names mycelord
$S raw/boss-forge.jpeg processed/monsters-boss-forge --grid 1x1 --scale 8.6 --colors 48 --names forgeking
$S raw/boss-abyss.jpeg processed/monsters-boss-abyss --grid 1x1 --scale 9.5 --colors 48 --strict --names leviathan
$S raw/boss-celestial.jpeg processed/monsters-boss-celestial --grid 1x1 --scale 10.5 --colors 48 --strict --names archon
$S raw/boss-frost.jpeg processed/monsters-boss-frost --grid 1x1 --scale 8.4 --colors 48 --despill --names frostwyrm
$S raw/boss-storm.jpeg processed/monsters-boss-storm --grid 1x1 --scale 9 --colors 48 --despill --flip --drop-far 40 \
  --names tempestking
$S raw/boss-space.jpeg processed/monsters-boss-space --grid 1x1 --scale 9.5 --colors 48 --despill --drop-far 40 \
  --names starweaver
$S raw/boss-void.jpeg processed/monsters-boss-void --grid 1x1 --scale 9.5 --colors 48 --despill --flip --drop-far 40 \
  --names unmaker

# Props.
$S raw/crown.jpeg processed/crown --grid 1x1 --scale 22 --colors 24 --names crown
$S raw/campfire.jpeg processed/campfire --grid 1x4 --scale 14 --colors 32 --names campfire-0,campfire-1,campfire-2,campfire-3

# Talent menu: icons, buttons, gems, then the frame, scroll and banner.
$S raw/talent-icons.jpeg processed/talents --grid 2x4 --scale 8 --strict --colors 64 \
  --names talent-swarm,talent-legion,talent-lone,talent-marathon,talent-phoenix,talent-scholar,talent-thrift,talent-artisan
$S raw/ui-buttons.jpeg processed/ui-buttons --grid 2x4 --scale 18 --colors 32 --names ui-close,ui-plus,ui-minus,ui-reset,-,-,-,-
$S raw/ui-gems.jpeg processed/ui-gems --grid 1x3 --scale 30 --colors 24 --names ui-socket,ui-gem,ui-medallion
python3 -I tools/ui.py

# HUD.
$S raw/hud-plaque.jpeg processed/hud-plaque --grid 1x1 --scale 10.5 --colors 24 --names hud-plaque
$S raw/hud-bar.jpeg processed/hud-bar --grid 1x1 --scale 22 --colors 24 --names hud-bar
$S raw/hud-buttons.jpeg processed/hud-buttons --grid 1x4 --scale 15 --colors 32 --names hud-talents,-,hud-share,hud-demo

python3 -I tools/export.py
