# OIIA 旋轉貓咪：像素電音大冒險

[English](./README.md) · **繁體中文**

> **像素街機節奏遊戲** — 旋轉 O-I-I-A 貓、抓 Perfect、釋放漩渦爆發

<p align="center">
  <a href="https://github.com/ReiKama414/oiia-cat-pixel-game">Star</a>
  ·
  <a href="https://reikama414.vercel.app/">個人網站</a>
  ·
  <a href="#快速開始">快速開始</a>
  ·
  <a href="./LICENSE">MIT</a>
</p>

---

## 為什麼做

以旋轉貓迷因為主題的全螢幕（`100dvw` / `100dvh`）瀏覽器街機：節拍打點、RPM 變速、衝刺與漩渦清場

## 亮點

- **三欄 HUD** — 左狀態、中舞台、右操作；零頁面滾動
- **Perfect 打點** — 縮圈重合時按旋轉
- **波次肉鴿** — 選強化、打掃地機首領、可掛機
- **造型解鎖** — 依最高分解鎖，未達標不可裝備

## 技術棧

| 層級 | 技術 |
| --- | --- |
| 介面 | `index.html` · Tailwind CDN · `css/style.css` |
| 迴圈 | Canvas 2D · `js/game.js` |
| 繪圖 | 像素精靈 · `js/sprites.js` |
| 音訊 | Web Audio 共振峰合成 · `js/audio.js` |
| 素材 | `assets/`（圖示 · favicon） |

## 專案結構

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

## 快速開始

用瀏覽器開啟 `index.html`，或靜態伺服：

```bash
npx serve .
```

## 操作

| 輸入 | 動作 |
| --- | --- |
| WASD / 方向鍵 / 虛擬鍵 | 移動 |
| Space / 按住旋轉 | 旋轉 |
| Q / Shift | 衝刺 |
| E | 漩渦（蓄滿） |
| P | 暫停 |

## 連結

- [GitHub](https://github.com/ReiKama414/oiia-cat-pixel-game)
- [個人網站](https://reikama414.vercel.app/)
- [授權全文](./LICENSE)

## 授權

MIT License — Copyright (c) 2026 ReiKama414

本專案明確以 MIT 開源（相對於 Code 根目錄預設 All Rights Reserved 的例外）

[授權全文](./LICENSE)

---

<sub>ReiKama414 · [GitHub](https://github.com/ReiKama414) · [個人網站](https://reikama414.vercel.app/)</sub>
