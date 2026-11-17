# Gemini prompts: floors 51–105

Prompts for the biomes and ultra bosses after the abyss, in the order the guild meets them. Send them in the same
Gemini conversation as the earlier biomes, so "the empty rooms you made", "the crypt monster sheet" and "the Lich King
sprite" point at the right images. Save each result in `art/raw/` under the file name given, then add its line to
`art/build.sh` (see `art/README.md`).

Each biome needs four images: two empty rooms, one sheet of four monsters, one biome boss. Gemini sometimes draws
monsters facing right anyway: `--flip` in `build.sh` mirrors a sheet.

## 6. Frozen citadel (floors 51–60)

Done: `bg-frost-1`, `bg-frost-2`, `monsters-frost`, `boss-frost`.

`bg-frost-1.jpeg`

> Same pixel art style, level of detail and camera as the empty rooms you made. Draw ONLY the empty room, with no
> characters and no creatures. A frozen citadel hall carved in blue ice filling the entire 16:10 canvas edge to edge,
> with no black bars. Seen slightly from above like a stage: the back wall fills the top 60% and a wide, deep, flat
> and completely clear floor of frosted stone slabs dusted with snow fills the bottom 40%, down to the bottom edge.
> Pillars of clear blue ice with frozen banners, tall windows showing a green and violet aurora, a great frozen
> gateway in the horizontal center, two braziers with cold pale blue flames at about 25% and 75% of the width and 30%
> of the height, falling snowflakes and icicles hanging from the ceiling. No text, no UI, no watermark.

`bg-frost-2.jpeg`

> Now same but make it different from the first one: a giant frozen waterfall behind the pillars, an adventurer's
> shield and sword trapped inside the ice of the wall, a frozen fountain at the very base of the wall.

`monsters-frost.jpeg`

> Same style and scale as the crypt monster sheet you made. Perfectly flat solid magenta background (#FF00FF), one
> row of 4 monsters, plenty of space between them, all facing LEFT: 1) icebound, a frozen knight encased in jagged
> blue ice with glowing pale eyes, 2) frost wolf, a white wolf with icy blue mane and frosty breath, 3) rime wisp, a
> small floating spirit of snow and swirling ice crystals, 4) snow owl, a large white owl with frost-tipped wings,
> flying. Crisp pixels, no anti-aliasing, no text.

`boss-frost.jpeg`

> Same style as the Lich King sprite. A single large boss on a perfectly flat solid magenta background (#FF00FF): the
> Frost Wyrm, a huge serpentine ice dragon with translucent blue crystal scales, tattered frozen wings, a crown of
> icicle horns and glowing white eyes, rearing up. About three times as tall as the skeleton, full body, facing LEFT,
> centred with plenty of empty magenta around. Crisp pixels, no anti-aliasing, no text.

## 7. Storm peaks (floors 61–70)

Done: `bg-storm-1`, `bg-storm-2`, `monsters-storm`, `boss-storm`. A first, cloud-kingdom take came out too cute for a
late level; the tone line at the start of each prompt fixed it.

`bg-storm-1.jpeg`

> Same pixel art style, level of detail and camera as the empty rooms you made. Draw ONLY the empty room, with no
> characters and no creatures. This is a late, dangerous level: dark, menacing and epic, nothing cute. The battlements
> of a black stone fortress on a mountain summit, inside a perpetual thunderstorm, filling the entire 16:10 canvas edge
> to edge, with no black bars. Seen slightly from above like a stage: the back wall fills the top 60% and a wide, deep,
> flat and completely clear floor of wet dark slate with faint glowing blue lightning runes fills the bottom 40%, down
> to the bottom edge. Shattered battlements and torn war banners, swirling purple-grey storm clouds, lightning bolts
> striking in the distance, rain driven sideways by the wind, a huge bronze gate engraved with storm runes in the
> horizontal center, two iron lightning rods crackling with blue-white electricity at about 25% and 75% of the width
> and 30% of the height. No text, no UI, no watermark.

`bg-storm-2.jpeg`

> Now same but make it different from the first one: a colossal tornado behind the ruins with rocks and debris caught
> in it, the wreck of an airship impaled on the battlements, chained floating boulders at the very base of the wall.

`monsters-storm.jpeg`

> Same style and scale as the crypt monster sheet you made. Perfectly flat solid magenta background (#FF00FF), one
> row of 4 monsters, plenty of space between them, all facing LEFT. These are late-game monsters: menacing and
> battle-worn, nothing cute. 1) storm knight, a warrior in dark bronze plate armour crackling with lightning, holding
> a halberd, 2) tempest harpy, a gaunt fierce harpy with tattered black-grey feathers, lightning in its eyes, screaming
> with its talons out, 3) wind wraith, a vortex of grey wind and debris with a skull-like face inside, floating, 4)
> thunder wyvern, a dark slate wyvern with glowing blue veins and a barbed tail, flying. Crisp pixels, no
> anti-aliasing, no text.

`boss-storm.jpeg`

> Same style as the Lich King sprite. A single large boss on a perfectly flat solid magenta background (#FF00FF): the
> Tempest King, a colossal giant in dark bronze armour fused with black storm clouds, a crown of crackling lightning,
> eyes of white fire, a cloak torn by the wind, wielding a huge war hammer glowing with electricity. Menacing and epic.
> About three times as tall as the skeleton, full body, standing, facing LEFT, centred with plenty of empty magenta
> around. Crisp pixels, no anti-aliasing, no text.

## 8. Celestial palace (floors 71–80)

Already done.

## 9. Outer space (floors 81–90)

Done: `bg-space-1`, `bg-space-2`, `monsters-space`, `boss-space`. The boss is not humanoid on purpose, after the
Archon and the Tempest King; its prompt names "the boss sprites" rather than the Lich King, which pulls towards a
humanoid.

`bg-space-1.jpeg`

> Same pixel art style, level of detail and camera as the empty rooms you made. Draw ONLY the empty room, with no
> characters and no creatures. This is a late, dangerous level: dark, menacing and epic, nothing cute. A ruined astral
> observatory platform drifting in outer space filling the entire 16:10 canvas edge to edge, with no black bars. Seen
> slightly from above like a stage: the back wall fills the top 60% and a wide, deep, flat and completely clear floor
> of dark blue stone with silver constellation inlays fills the bottom 40%, down to the bottom edge. Broken silver
> arches open onto deep space with blue and teal nebulae, a ringed planet and a comet, a giant telescope in the
> horizontal center, two floating silver lamps with cold white light at about 25% and 75% of the width and 30% of the
> height, drifting stardust. No pink or magenta in the sky. No text, no UI, no watermark.

`bg-space-2.jpeg`

> Now same but make it different from the first one: a huge moon very close behind the arches, an astrolabe floating
> in the air, a cracked globe of the stars at the very base of the wall.

`monsters-space.jpeg`

> Same style and scale as the crypt monster sheet you made. Perfectly flat solid magenta background (#FF00FF), one
> row of 4 monsters, plenty of space between them, all facing LEFT. These are late-game monsters: menacing and
> battle-worn, nothing cute. Avoid pink and magenta tones in the monsters themselves: 1) moon golem, a hulking golem
> of grey moon rock covered in craters, with glowing white cracks, 2) comet hound, a dark blue hound with a blazing
> white-blue comet tail and bared fangs, 3) nebula jelly, a menacing floating jellyfish made of blue and teal nebula
> gas with long stinging tendrils, 4) star manta, a large flying manta ray with a starry back and a barbed tail,
> flying. Crisp pixels, no anti-aliasing, no text.

`boss-space.jpeg`

> Same pixel art style and level of detail as the boss sprites you made. A single large boss on a perfectly flat solid
> magenta background (#FF00FF). Not humanoid. The Star Weaver, a colossal cosmic spider whose body is a dark cracked
> planet with a glowing blue core, eight long legs made of silver constellation lines joined by bright stars, a
> cluster of cold white eyes, and a torn web of starlight stretched behind it. Menacing and epic. About three times as
> tall as the skeleton and wider than tall, full body, facing LEFT, centred with plenty of empty magenta around. Avoid
> pink and magenta tones in the boss itself. Crisp pixels, no anti-aliasing, no text.

## 10. The void (floors 91–100)

Done: `bg-void-1`, `bg-void-2`, `monsters-void`, `boss-void`. Gemini drew the rooms as the space observatory swallowed
by the void, which makes a good transition.

`bg-void-1.jpeg`

> Same pixel art style, level of detail and camera as the empty rooms you made. Draw ONLY the empty room, with no
> characters and no creatures. This is the last biome before the end: dark, menacing and epic, nothing cute. A broken
> hall floating in the void filling the entire 16:10 canvas edge to edge, with no black bars. Seen slightly from above
> like a stage: the back wall fills the top 60% and a wide, deep, flat and completely clear floor of cracked black
> obsidian with faint violet veins fills the bottom 40%, down to the bottom edge. The wall crumbles into a starless
> violet-black emptiness, fragments of the earlier biomes (a crypt arch, a crystal, an icicle, a marble column) float
> in it, a rift glowing violet in the horizontal center, two floating shards of violet light at about 25% and 75% of
> the width and 30% of the height, drifting motes of dark matter. No text, no UI, no watermark.

`bg-void-2.jpeg`

> Now same but make it different from the first one: a huge black hole with a glowing ring behind the ruins, chains
> hanging into nothing, a broken staircase that ends in mid-air at the very base of the wall.

`monsters-void.jpeg`

> Same style and scale as the crypt monster sheet you made. Perfectly flat solid magenta background (#FF00FF), one
> row of 4 monsters, plenty of space between them, all facing LEFT. These are late-game monsters: menacing and
> unsettling, nothing cute. Avoid pink and magenta tones in the monsters themselves: 1) void walker, a tall thin
> humanoid silhouette whose body shows a starfield, with long clawed fingers, 2) rift crawler, a many-legged crawling
> creature of black glass with violet cracks, 3) null eye, a floating eye surrounded by a ring of dark tentacles, 4)
> star eater, a long eel-like flier of darkness with glowing violet spots and a jaw full of needles, flying. Crisp
> pixels, no anti-aliasing, no text.

`boss-void.jpeg`

> Same pixel art style and level of detail as the boss sprites you made. A single large boss on a perfectly flat solid
> magenta background (#FF00FF): the Unmaker, a colossal faceless being made of void and starlight, a cracked white
> mask floating where its face should be, a hooded cloak that dissolves into darkness, four long clawed arms trailing
> violet light, its lower body fading into nothing. Menacing and epic. Avoid pink and magenta tones in the boss
> itself. About three times as tall as the skeleton, full body, floating, facing LEFT, centred with plenty of empty
> magenta around. Crisp pixels, no anti-aliasing, no text.

## Outside the simulation (floors 101–105)

The guild escapes the dungeon, which was a simulation, and meets its makers: alien beings, not humans. Everything is
white, smooth and curved, like porcelain and mother-of-pearl: no screens, no machines, no metal. (A first, fantasy
take on a red cavern, then a futuristic lab, were dropped: the lab looked like a human spaceship.) The ultra bosses
are a little taller than the biome bosses.

Done: `bg-heart-1`, `bg-heart-2`, `ultra-ratelimiter`.

`bg-heart-1.jpeg`

> Same pixel art style, level of detail and camera as the empty rooms you made. Draw ONLY the empty room, with no
> characters and no creatures. This is the final arena of the whole game: the adventurers have escaped the dungeon and
> reach the realm of the alien beings who created it. Not human: no screens, no computers, no machines, no cables, no
> straight panels. An immense hall of seamless white, made of smooth flowing curves like porcelain and
> mother-of-pearl, organic and impossibly advanced, filling the entire 16:10 canvas edge to edge, with no black bars.
> Seen slightly from above like a stage: the back wall fills the top 60% and a wide, deep, flat and completely clear
> floor of smooth pearly white stone with faint flowing lines of pale cyan light fills the bottom 40%, down to the
> bottom edge. Curved arches and ribs that flow into each other like a seashell, a large translucent floating sphere in
> the horizontal center containing a tiny glowing pixel dungeon, two floating smooth white orbs glowing pale cyan at
> about 25% and 75% of the width and 30% of the height, drifting motes of light. Palette of whites, pearly greys and
> pale cyan. No text, no UI, no watermark.

`bg-heart-2.jpeg`

> Now same but make it different from the first one: the floating sphere is cracked and the tiny dungeon inside
> flickers, the curved walls open like petals onto a bright white infinity, smooth white droplets floating weightless
> at the very base of the wall.

`ultra-ratelimiter.jpeg`

> Same pixel art style and level of detail as the boss sprites you made. A single huge ultra boss on a perfectly flat
> solid magenta background (#FF00FF): the Rate Limiter, a towering alien guardian, not human, elongated and graceful,
> with a seamless smooth pearly white body of flowing curves, a curved crescent-shaped head without a face, an
> hourglass-shaped hollow of pale cyan light in its chest, and a curved shield of light. No metal, no machine parts.
> Menacing and epic. About three and a half times as tall as the skeleton, full body, standing, facing LEFT, centred
> with plenty of empty magenta around. Crisp pixels, no anti-aliasing, no text.

`ultra-hallucination.jpeg`

> Same pixel art style and level of detail as the boss sprites you made. A single huge ultra boss on a perfectly flat
> solid magenta background (#FF00FF). Not humanoid. The Hallucination, a glitching iridescent hologram chimera made of
> mismatched parts of the dungeon's monsters (a wolf's head, a crystal arm, a wyvern wing, a spider leg), pale cyan
> and pearly white light, flickering and broken by scanlines and corrupted pixel blocks. Unsettling and epic. Avoid
> pink and magenta tones in the boss itself. About three and a half times as tall as the skeleton, full body, facing
> LEFT, centred with plenty of empty magenta around. Crisp pixels, no anti-aliasing, no text.

`ultra-infiniteloop.jpeg`

> Same pixel art style and level of detail as the boss sprites you made. A single huge ultra boss on a perfectly flat
> solid magenta background (#FF00FF). Not humanoid. The Infinite Loop, a giant alien serpent with a seamless smooth
> pearly white body like porcelain, coiled into a perfect ring and biting its own tail, flowing lines of pale cyan
> light running along it, a second smooth head without eyes rising from the ring. No metal, no machine parts. Menacing
> and epic. About three and a half times as tall as the skeleton, full body, facing LEFT, centred with plenty of empty
> magenta around. Crisp pixels, no anti-aliasing, no text.

`ultra-contextwindow.jpeg`

> Same pixel art style and level of detail as the boss sprites you made. A single huge ultra boss on a perfectly flat
> solid magenta background (#FF00FF). Not humanoid. The Context Window, a giant floating oval frame of smooth pearly
> white material like a curved porcelain mirror, holding a pane of liquid light with a single enormous eye looking out
> of it, long flowing white tendrils trailing from the frame and ribbons of light pouring down from it. No metal, no
> machine parts. Menacing and epic. About three and a half times as tall as the skeleton, full body, facing LEFT,
> centred with plenty of empty magenta around. Crisp pixels, no anti-aliasing, no text.

`ultra-devourer.jpeg`

> Same pixel art style and level of detail as the boss sprites you made. A single huge final boss on a perfectly flat
> solid magenta background (#FF00FF). Not humanoid. The Token Devourer, the creators' ultimate being: a colossal alien
> beast with a seamless curved pearly white shell like porcelain, a huge open maw full of blinding light swallowing a
> stream of small glowing cubes, many small pale cyan eyes, a halo of floating curved white blades, and the broken
> weapons of adventurers stuck in its shell. No metal, no machine parts. The largest and most menacing of all, about
> four times as tall as the skeleton, full body, facing LEFT, centred with plenty of empty magenta around. Crisp
> pixels, no anti-aliasing, no text.
