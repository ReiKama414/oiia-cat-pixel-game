// Pixel Art Matrices & Procedural Pixel Renderer for OIIA Cat
window.OIIASprites = (function() {
  const SKINS = {
    classic: {
      name: '經典虎斑 Ethel',
      desc: '原汁原味 O-I-I-A 迷因旋轉胖虎斑貓',
      unlockScore: 0,
      palette: {
        O: '#161020',
        B: '#8c7a6b',
        D: '#4a3d33',
        L: '#d9cbb8',
        P: '#ff8da1',
        W: '#ffffff',
        E: '#00f0ff'
      }
    },
    neon: {
      name: '霓虹電音貓',
      desc: '賽博龐克夜店專屬螢光紫青色貓咪',
      unlockScore: 300,
      palette: {
        O: '#090314',
        B: '#9d4edd',
        D: '#3c096c',
        L: '#e0aaff',
        P: '#00f0ff',
        W: '#ffffff',
        E: '#ffe600'
      }
    },
    golden: {
      name: '黃金傳說貓',
      desc: '閃耀 24K 純金光芒的招財旋轉神貓',
      unlockScore: 800,
      palette: {
        O: '#2b1900',
        B: '#ffb703',
        D: '#bc6c25',
        L: '#fff3b0',
        P: '#ff2a85',
        W: '#ffffff',
        E: '#00ff66'
      }
    },
    shades: {
      name: '墨鏡派對 DJ 貓',
      desc: '戴著像素酷墨鏡、掌控全場節奏的 DJ 貓',
      unlockScore: 1500,
      palette: {
        O: '#111118',
        B: '#778da9',
        D: '#1b263b',
        L: '#e0e1dd',
        P: '#ff2a85',
        W: '#00f0ff',
        E: '#ff0055'
      }
    }
  };

  const CAT_IDLE = [
    "....OO....OO....",
    "...OPPO..OPPO...",
    "..OBBBBOOBBBBO..",
    "..OBDBBBBBBBDO..",
    ".OBBWEOO..OBWEO.",
    ".OBDBBBOOBBBBDO.",
    ".OBBBBBPPBBBBBO.",
    ".O.OBBLLLLLLBBO.",
    "O..OBLLLLLLLLBO.",
    "O.OOBLLLLLLLLBO.",
    ".OOBBBLLLLLLBBO.",
    "..OBBBBBBBBBBBO.",
    "..OBBDOOOOBDBBO.",
    "...OBO....OBO...",
    "...OOO....OOO...",
    "................"
  ];

  const CAT_WALK = [
    "....OO....OO....",
    "...OPPO..OPPO...",
    "..OBBBBOOBBBBO..",
    "..OBDBBBBBBBDO..",
    ".OBBWEOO..OBWEO.",
    ".OBDBBBOOBBBBDO.",
    ".OBBBBBPPBBBBBO.",
    "..OOBBLLLLLLBBO.",
    ".O.OBLLLLLLLLBO.",
    "O..OBLLLLLLLLBO.",
    ".OOBBBLLLLLLBBO.",
    "..OBBBBBBBBBBBO.",
    "..OBDOOOOOOBDBO.",
    "..OOO.......OOO.",
    "................",
    "................"
  ];

  const CAT_SPIN_1 = [
    "................",
    "....OOOOOOOO....",
    "..OOBBBBBBBBBO..",
    ".OBWWBDDDDDBWWO.",
    "OBWBBBBBBBBBBBWO",
    "OBLLLLLLLLLLLLBO",
    "OBWWBDDDDDDBWWBO",
    "OBLLLLLLLLLLLLBO",
    ".OBWBBBBBBBBWWO.",
    "..OOBBBBBBBBOO..",
    "....OOOOOOOO....",
    "................",
    "................",
    "................",
    "................",
    "................"
  ];

  const CAT_SPIN_2 = [
    "................",
    "...OOOOOOOOOO...",
    ".OOBDDDDDDDDBOO.",
    "OBWBBBBBBBBBBWBO",
    "OBWWLLLLLLLLWWBO",
    "OBBDDDDDDDDDDBBO",
    "OBWWLLLLLLLLWWBO",
    "OBBBBBBBBBBBBBBO",
    ".OOBDDDDDDDDBOO.",
    "...OOOOOOOOOO...",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................"
  ];

  const FISH_SPRITE = [
    "....OOOO....",
    "..OOBBBBOO..",
    ".OBBWWWWBBO.",
    "OBBWOBBBBBO.",
    "OBBBBBBBBBO.",
    ".OBBBBBBBBO.",
    "..OOBBBBOO..",
    "....OOOO....",
    "...OOBBOO...",
    "..OBO..OBO..",
    "..OO....OO..",
    "............"
  ];

  const CAN_SPRITE = [
    "..OOOOOOOO..",
    ".OLLLLLLLLo.",
    "OLLLLLLLLLLo",
    "OOOOOOOOOOOO",
    "OPPPPPPPPPPO",
    "OPWWWWWWWWPO",
    "OPPPPPPPPPPO",
    "OOOOOOOOOOOO",
    ".OOOOOOOOOO.",
    "............",
    "............",
    "............"
  ];

  const CUCUMBER_SPRITE = [
    ".......OOO..",
    "......OGGGO.",
    ".....OGGGGGO",
    "....OGGWGGO.",
    "...OGGGGGO..",
    "..OGGWGGO...",
    ".OGGGGGO....",
    "OGGWGGO.....",
    "OGGGGO......",
    ".OOOO.......",
    "............",
    "............"
  ];

  function drawMatrix(ctx, matrix, x, y, pixelSize, palette, flipX) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const startX = x - (cols * pixelSize) / 2;
    const startY = y - (rows * pixelSize) / 2;

    for (let r = 0; r < rows; r++) {
      const rowStr = matrix[r];
      for (let c = 0; c < cols; c++) {
        const ch = rowStr[c];
        if (ch === '.' || !palette[ch]) continue;
        const drawCol = flipX ? (cols - 1 - c) : c;
        ctx.fillStyle = palette[ch];
        ctx.fillRect(
          Math.floor(startX + drawCol * pixelSize),
          Math.floor(startY + r * pixelSize),
          Math.ceil(pixelSize),
          Math.ceil(pixelSize)
        );
      }
    }
  }

  function drawCat(ctx, state) {
    const skin = SKINS[state.skinId] || SKINS.classic;
    let pal = Object.assign({}, skin.palette);

    if (state.isFever || state.rpmTier >= 3) {
      const hues = ['#ff2a85', '#ffe600', '#00ff66', '#00f0ff', '#b5179e'];
      const idx = Math.floor(state.tick / 2) % hues.length;
      pal.W = hues[idx];
      pal.E = hues[(idx + 2) % hues.length];
    }

    const px = state.pixelSize || 3.2;

    if (state.isSpinning) {
      const radius = px * (8.5 + (state.rpmTier || 1) * 1.6);
      ctx.save();
      ctx.translate(state.x, state.y);
      const auraColors = (state.isFever || state.rpmTier >= 3)
        ? ['#ff2a85', '#ffe600', '#00ff66', '#00f0ff']
        : ['#00f0ff', '#ff2a85', '#ffe600'];
      for (let i = 0; i < auraColors.length; i++) {
        ctx.strokeStyle = auraColors[(i + Math.floor(state.tick / 2)) % auraColors.length];
        ctx.lineWidth = 2 + (state.rpmTier || 1) * 0.6;
        ctx.beginPath();
        const startAng = (state.tick * 0.5) + (i * Math.PI * 0.65);
        ctx.arc(0, 0, radius + i * 3.5, startAng, startAng + Math.PI * 0.95);
        ctx.stroke();
      }
      ctx.restore();

      const matrix = (Math.floor(state.tick / 2) % 2 === 0) ? CAT_SPIN_1 : CAT_SPIN_2;
      const flip = (Math.floor(state.tick / 2) % 4 >= 2);
      drawMatrix(ctx, matrix, state.x, state.y, px * 1.08, pal, flip);

      ctx.fillStyle = state.rpmTier >= 3 ? '#ffe600' : '#ffffff';
      const lineY = state.y + ((state.tick % 5) - 2) * 5;
      ctx.fillRect(state.x - 30, lineY, 13, 3);
      ctx.fillRect(state.x + 17, lineY - 4, 13, 3);
    } else {
      const isMoving = Math.abs(state.vx) > 0.2 || Math.abs(state.vy) > 0.2;
      const matrix = (isMoving && Math.floor(state.tick / 6) % 2 === 1) ? CAT_WALK : CAT_IDLE;
      drawMatrix(ctx, matrix, state.x, state.y, px, pal, state.facingLeft);

      if (state.skinId === 'shades') {
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(state.x - px * 4, state.y - px * 4, px * 3.5, px * 1.6);
        ctx.fillRect(state.x + px * 0.8, state.y - px * 4, px * 3.5, px * 1.6);
      }
    }
  }

  function drawItem(ctx, item) {
    const px = 2.8;
    if (item.type === 'fish') {
      drawMatrix(ctx, FISH_SPRITE, item.x, item.y, px, {
        O: '#0b132b', B: '#00f0ff', W: '#ffffff'
      }, false);
    } else if (item.type === 'golden_fish') {
      drawMatrix(ctx, FISH_SPRITE, item.x, item.y, px * 1.15, {
        O: '#3b2000', B: '#ffe600', W: '#ffffff'
      }, false);
    } else if (item.type === 'can') {
      drawMatrix(ctx, CAN_SPRITE, item.x, item.y, px, {
        O: '#161020', L: '#adb5bd', o: '#6c757d', P: '#ff2a85', W: '#ffe600'
      }, false);
    } else if (item.type === 'disco') {
      ctx.save();
      ctx.translate(item.x, item.y);
      const colors = ['#ff2a85', '#00f0ff', '#ffe600', '#00ff66'];
      for (let dx = -2; dx <= 1; dx++) {
        for (let dy = -2; dy <= 1; dy++) {
          ctx.fillStyle = colors[Math.abs(dx + dy + Math.floor(item.tick / 4)) % colors.length];
          ctx.fillRect(dx * 4.5, dy * 4.5, 4, 4);
        }
      }
      ctx.restore();
    } else if (item.type === 'laser_gem') {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(0, 0, 7 + Math.sin(item.tick * 0.3) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    } else if (item.type === 'cucumber') {
      drawMatrix(ctx, CUCUMBER_SPRITE, item.x, item.y, px * 1.08, {
        O: '#081c15', G: '#2d6a4f', W: '#74c69d'
      }, false);
    } else if (item.type === 'vacuum') {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.fillStyle = '#111118';
      ctx.fillRect(-15, -15, 30, 30);
      ctx.fillStyle = item.stunned > 0 ? '#00f0ff' : '#d90429';
      ctx.fillRect(-12, -12, 24, 24);
      ctx.fillStyle = (Math.floor(item.tick / 5) % 2 === 0) ? '#ffe600' : '#ff2a85';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    } else if (item.type === 'boss_vacuum') {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.fillStyle = '#090314';
      ctx.fillRect(-28, -28, 56, 56);
      ctx.fillStyle = item.stunned > 0 ? '#00f0ff' : '#9b00e8';
      ctx.fillRect(-24, -24, 48, 48);
      ctx.fillStyle = '#ff2a85';
      ctx.fillRect(-16, -16, 32, 32);
      ctx.fillStyle = '#ffe600';
      ctx.fillRect(-8, -8, 16, 16);
      // Boss HP bar
      ctx.fillStyle = '#111118';
      ctx.fillRect(-26, -36, 52, 6);
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(-25, -35, Math.max(0, (item.hp / item.maxHp) * 50), 4);
      ctx.restore();
    }
  }

  return {
    SKINS: SKINS,
    drawCat: drawCat,
    drawItem: drawItem
  };
})();
