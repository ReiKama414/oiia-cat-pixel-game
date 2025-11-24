# OIIA Cat Pixel Spin

**English** · [繁體中文](./README.zh-TW.md)

> **Pixel arcade rhythm game** — spin the O-I-I-A cat, nail Perfect beats, unleash vortex overload

<p align="center">
  <a href="https://github.com/ReiKama414/oiia-cat-pixel-game">Star</a>
  ·
  <a href="https://reikama414.vercel.app/">Site</a>
  ·
  <a href="#quick-start">Quick start</a>
  ·
  <a href="./LICENSE">MIT</a>
</p>

---

## Why

A compact, full-viewport (`100dvw` / `100dvh`) browser arcade built around the spinning-cat meme: beat timing, RPM tiers, dash, and vortex clear

## Highlights

- **Full-bleed HUD** — left stats, center stage, right controls; no page scroll
- **Beat Perfect** — press spin when the shrink ring meets the inner ring
- **Roguelite waves** — pick perks, fight the vacuum boss, optional auto-idle
- **Unlockable skins** — gated by high score (no free trial bypass)

## Stack

| Layer | Tech |
| --- | --- |
| Shell | `index.html` · Tailwind CDN · `css/style.css` |
| Loop | Canvas 2D · `js/game.js` |
| Art | Pixel sprites · `js/sprites.js` |
| Audio | Web Audio formant synth · `js/audio.js` |
| Assets | `assets/` (icon · favicons) |

## Structure

```
oiia-cat-pixel-game/
├── index.html
├── css/style.css
├── js/{game,sprites,audio}.js
├── assets/
├── LICENSE
├── README.md
└── README.zh-TW.md
```

## Quick start

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows / pad | Move |
| Space / Hold Spin | Spin |
| Q / Shift | Dash |
| E | Vortex (when charged) |
| P | Pause |

## Links

- [GitHub](https://github.com/ReiKama414/oiia-cat-pixel-game)
- [Personal site](https://reikama414.vercel.app/)
- [License](./LICENSE)

## License

MIT License — Copyright (c) 2026 ReiKama414

This project is explicitly open-sourced under MIT (exception to the default All Rights Reserved policy in the Code root README)

[Full license text](./LICENSE)

---

<sub>ReiKama414 · [GitHub](https://github.com/ReiKama414) · [Site](https://reikama414.vercel.app/)</sub>
