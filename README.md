# OIIA Cat Pixel Spin

Retro 16-bit arcade game based on the O-I-I-A spinning cat meme. Full-viewport (`100dvw` / `100dvh`) responsive shell for desktop and mobile.

## Structure

- `index.html` — app shell (HUD / stage / controls)
- `style.css` — layout and arcade HUD styles
- `sprites.js` — pixel sprite drawing
- `audio.js` — Web Audio formant synth and SFX
- `game.js` — core loop, combat, perks, skins, save
- `assets/oiia_icon.jpg` — app icon
- `oiia_cat_standalone.html` — single-file offline build (legacy)

## Play

Open `index.html` in a browser, or serve the folder statically.

## Controls

- Move: WASD / arrows / on-screen pad / drag on canvas
- Spin: hold Space or Hold Spin
- Dash: Q / Shift
- Vortex: E (when charged)
- Pause: P

## Notes

- Skins unlock by high score; locked skins cannot be equipped
- Progress persists in `localStorage`
