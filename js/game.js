// OIIA Cat Upgraded Game Engine: Rhythm Parry + RPM Tiers + Vortex Overload + Wave Perks + Boss
(function() {
  const STORAGE_KEY = 'oiia_cat_pixel_save_v2';

  let saveState = {
    highScore: 0,
    totalFish: 0,
    selectedSkin: 'classic',
    autoIdle: false,
    instantAutoPerk: false,
    infiniteSpin: false
  };

  // Konami: ↑↑↓↓←→←→BA — must be entered as one continuous chain
  const KONAMI_SEQ = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA'
  ];
  const KONAMI_GAP_MS = 1400;
  let konamiProgress = 0;
  let konamiLastAt = 0;

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.highScore === 'number') saveState.highScore = parsed.highScore;
        if (typeof parsed.totalFish === 'number') saveState.totalFish = parsed.totalFish;
        if (typeof parsed.selectedSkin === 'string') saveState.selectedSkin = parsed.selectedSkin;
        if (typeof parsed.autoIdle === 'boolean') saveState.autoIdle = parsed.autoIdle;
        if (typeof parsed.instantAutoPerk === 'boolean') saveState.instantAutoPerk = parsed.instantAutoPerk;
        if (typeof parsed.infiniteSpin === 'boolean') saveState.infiniteSpin = parsed.infiniteSpin;
      }
    } catch (e) {}
  }

  function setInfiniteSpin(on, announce) {
    saveState.infiniteSpin = !!on;
    keys.spin = !!on;
    persistSave();
    if (announce && state && state.cat) {
      if (on) {
        addFloatingText('CHEAT ON: HOLD SPACE FOREVER', state.cat.x, state.cat.y - 40, '#ffe600');
        state.lastSyllable = '∞ SPIN';
      } else {
        addFloatingText('CHEAT OFF: NORMAL SPACE', state.cat.x, state.cat.y - 40, '#00f0ff');
        state.lastSyllable = 'READY';
      }
      updateHUD();
      drawScene();
    }
  }

  function trackKonami(code, isRepeat) {
    if (isRepeat) return;
    const now = performance.now();
    if (konamiProgress > 0 && now - konamiLastAt > KONAMI_GAP_MS) {
      konamiProgress = 0;
    }
    if (code === KONAMI_SEQ[konamiProgress]) {
      konamiProgress += 1;
      konamiLastAt = now;
      if (konamiProgress >= KONAMI_SEQ.length) {
        konamiProgress = 0;
        konamiLastAt = 0;
        setInfiniteSpin(!saveState.infiniteSpin, true);
      }
      return;
    }
    // Break the chain on any wrong key; only restart if this key begins a new chain
    if (code === KONAMI_SEQ[0]) {
      konamiProgress = 1;
      konamiLastAt = now;
    } else {
      konamiProgress = 0;
      konamiLastAt = 0;
    }
  }

  function persistSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
    } catch (e) {}
  }

  function formatCompact(n) {
    const v = Math.max(0, Math.floor(Number(n) || 0));
    if (v < 10000) return String(v);
    if (v < 1000000) {
      const k = v / 1000;
      return (k >= 100 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '')) + 'K';
    }
    if (v < 1000000000) {
      const m = v / 1000000;
      return (m >= 100 ? m.toFixed(0) : m.toFixed(2).replace(/\.?0+$/, '')) + 'M';
    }
    const b = v / 1000000000;
    return (b >= 100 ? b.toFixed(0) : b.toFixed(2).replace(/\.?0+$/, '')) + 'B';
  }

  function fitStatEl(el, text) {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('stat-num-sm', 'stat-num-xs');
    const len = String(text).length;
    if (len >= 8) el.classList.add('stat-num-xs');
    else if (len >= 6) el.classList.add('stat-num-sm');
  }

  let canvas, ctx;
  let animId = null;
  let gameMode = 'endless';
  let gameState = 'ready'; // 'ready' | 'playing' | 'paused' | 'perk' | 'gameover'

  const PERK_POOL = [
    { id: 'magnet', icon: '🧲', title: '超導磁力場', desc: '旋轉吸引魚乾與道具的半徑 +45%' },
    { id: 'battery', icon: '🔋', title: '永動貓罐電池', desc: '旋轉能量消耗速度降低 30%，回復速度 +35%' },
    { id: 'shockwave', icon: '💥', title: '擴散音爆圈', desc: 'PERFECT 節拍音爆與反彈傷害範圍 +40%' },
    { id: 'vortex_fast', icon: '🌌', title: '黑洞加速器', desc: '漩渦爆發與 FEVER 狂熱條累積速度 +40%' },
    { id: 'heal', icon: '💖', title: '九命貓薄荷', desc: '立即恢復 1 顆愛心生命，並獲得 +250 額外加分' }
  ];

  let state = {};

  function resetGameState() {
    const w = canvas ? canvas.width : 560;
    const h = canvas ? canvas.height : 340;
    state = {
      score: 0,
      combo: 1,
      maxCombo: 1,
      hp: 3,
      spinEnergy: 100,
      feverGauge: 0,
      vortexCharge: 0,
      isFever: false,
      feverTimer: 0,
      wave: 1,
      nextWaveScore: 700,
      perkCountdownTicks: 0,
      perkCountdownMax: 180,
      currentPerkChoices: [],
      tick: 0,
      beatPhase: 0, // 0..30 rhythm ring cycle
      timeLeft: 60,
      lastSyllable: 'READY!',
      spinHoldTicks: 0,
      rpm: 0,
      rpmTier: 0,
      dashCd: 0,
      dashActive: 0,
      shockwaves: [],
      perks: {
        magnet: 1.0,
        battery: 1.0,
        shockwave: 1.0,
        vortexRate: 1.0,
        list: []
      },
      cat: {
        x: w / 2,
        y: h / 2,
        vx: 0,
        vy: 0,
        facingLeft: false,
        isSpinning: false
      },
      items: [],
      particles: [],
      floatingTexts: []
    };
    updateHUD();
    renderBuffPills();
  }

  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    spin: false
  };

  let pointerTarget = null;

  function addFloatingText(text, x, y, color) {
    state.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      color: color || '#ffffff',
      alpha: 1.0,
      vy: -1.5
    });
  }

  function addBurst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.2 + Math.random() * 4.2;
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: color,
        life: 16 + Math.floor(Math.random() * 14)
      });
    }
  }

  function addShockwave(x, y, maxR, color) {
    state.shockwaves.push({
      x: x,
      y: y,
      r: 14,
      maxR: maxR * state.perks.shockwave,
      color: color || '#00f0ff',
      alpha: 0.95
    });
  }

  // Triggered when player initiates spin right on the beat!
  function checkBeatParryOnSpinStart() {
    if (gameState !== 'playing') return;
    // beatPhase cycles 0..29. Sweet spot is when shrinking ring meets inner ring (phase 21..29 or 0..3)
    const isPerfect = (state.beatPhase >= 21 || state.beatPhase <= 4);
    if (isPerfect) {
      window.OIIAAudio.playSFX('perfect');
      state.spinEnergy = Math.min(100, state.spinEnergy + 14);
      state.vortexCharge = Math.min(100, state.vortexCharge + Math.round(12 * state.perks.vortexRate));
      state.combo += 1;
      if (state.combo > state.maxCombo) state.maxCombo = state.combo;

      const bonus = 25 * state.combo;
      state.score += bonus;
      addFloatingText('PERFECT BEAT! +' + bonus, state.cat.x, state.cat.y - 34, '#00ff66');
      addShockwave(state.cat.x, state.cat.y, 115, '#00ff66');

      // Stun and push nearby enemies + pull nearby fish
      state.items.forEach(function(it) {
        const d = Math.hypot(it.x - state.cat.x, it.y - state.cat.y);
        if (d < 125 * state.perks.shockwave) {
          if (it.type === 'cucumber' || it.type === 'vacuum' || it.type === 'boss_vacuum') {
            it.stunned = 90;
            const ang = Math.atan2(it.y - state.cat.y, it.x - state.cat.x);
            it.vx = Math.cos(ang) * 4.2;
            it.vy = Math.sin(ang) * 4.2;
          }
        }
      });
    }
  }

  function triggerDash() {
    if (gameState !== 'playing' || state.dashCd > 0) return;
    state.dashCd = 95; // ~1.5s cooldown
    state.dashActive = 14;
    window.OIIAAudio.playSFX('perfect');

    let dirX = state.cat.vx;
    let dirY = state.cat.vy;
    if (Math.hypot(dirX, dirY) < 0.2) {
      dirX = state.cat.facingLeft ? -1 : 1;
      dirY = 0;
    }
    const len = Math.hypot(dirX, dirY) || 1;
    state.cat.vx = (dirX / len) * 11.5;
    state.cat.vy = (dirY / len) * 11.5;

    addShockwave(state.cat.x, state.cat.y, 75, '#00f0ff');
    addFloatingText('DASH!', state.cat.x, state.cat.y - 22, '#00f0ff');
  }

  function triggerVortexOverload() {
    if (gameState !== 'playing' || state.vortexCharge < 100) return;
    state.vortexCharge = 0;
    window.OIIAAudio.playSFX('vortex');
    addShockwave(state.cat.x, state.cat.y, 260, '#ffe600');
    addFloatingText('VORTEX OVERLOAD!!', state.cat.x, state.cat.y - 38, '#ffe600');

    // Convert all cucumbers/vacuums into golden fish and pull everything to cat!
    state.items.forEach(function(it) {
      if (it.type === 'cucumber' || it.type === 'vacuum') {
        it.type = 'golden_fish';
        addBurst(it.x, it.y, '#ffe600', 8);
      } else if (it.type === 'boss_vacuum') {
        it.hp -= 2;
        it.stunned = 120;
        addBurst(it.x, it.y, '#ff2a85', 18);
      }
    });
    triggerFever();
    updateHUD();
  }

  function triggerFever() {
    state.isFever = true;
    state.feverTimer = 330;
    state.spinEnergy = 100;
    window.OIIAAudio.playSFX('fever');
    const stageCard = document.getElementById('stage-container');
    if (stageCard) stageCard.classList.add('fever-active');
  }

  function endFever() {
    state.isFever = false;
    state.feverGauge = 0;
    const stageCard = document.getElementById('stage-container');
    if (stageCard) stageCard.classList.remove('fever-active');
  }

  function spawnItem() {
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (edge === 0) { x = Math.random() * w; y = -18; }
    else if (edge === 1) { x = w + 18; y = Math.random() * h; }
    else if (edge === 2) { x = Math.random() * w; y = h + 18; }
    else { x = -18; y = Math.random() * h; }

    const angle = Math.atan2((h / 2 + (Math.random() - 0.5) * 140) - y, (w / 2 + (Math.random() - 0.5) * 180) - x);
    const speedBase = 1.5 + Math.min(2.2, state.wave * 0.22);

    const roll = Math.random();
    let type = 'fish';
    if (state.isFever && roll < 0.42) {
      type = 'golden_fish';
    } else if (roll < 0.36) {
      type = 'fish';
    } else if (roll < 0.50) {
      type = 'can';
    } else if (roll < 0.62) {
      type = 'disco';
    } else if (roll < 0.72) {
      type = 'laser_gem';
    } else if (roll < 0.87) {
      type = 'cucumber';
    } else {
      type = 'vacuum';
    }

    state.items.push({
      x: x,
      y: y,
      vx: (type === 'laser_gem' ? Math.cos(angle) * speedBase * 1.65 : Math.cos(angle) * speedBase),
      vy: (type === 'laser_gem' ? Math.sin(angle) * speedBase * 1.65 : Math.sin(angle) * speedBase),
      type: type,
      stunned: 0,
      tick: 0
    });
  }

  function spawnBossVacuum() {
    if (!canvas) return;
    const hasBoss = state.items.some(function(it) { return it.type === 'boss_vacuum'; });
    if (hasBoss) return;
    addFloatingText('BOSS INCOMING — spin to smash!', canvas.width / 2, 42, '#ff2a85');
    state.items.push({
      x: canvas.width / 2,
      y: -30,
      vx: 1.2,
      vy: 1.0,
      type: 'boss_vacuum',
      hp: 4 + Math.floor(state.wave / 2),
      maxHp: 4 + Math.floor(state.wave / 2),
      stunned: 0,
      tick: 0
    });
  }

  function pickRecommendedPerk(choices) {
    if (!choices || choices.length === 0) return PERK_POOL[0];
    if (state.hp <= 2) {
      const healPerk = choices.find(function(p) { return p.id === 'heal'; });
      if (healPerk) return healPerk;
    }
    return choices[0];
  }

  function selectPerkAndResume(perk, isAuto) {
    if (!perk) return;
    applyPerk(perk);
    const overlay = document.getElementById('perk-overlay');
    if (overlay) overlay.classList.add('hidden');
    state.currentPerkChoices = [];
    gameState = 'playing';
    addFloatingText((isAuto ? 'AUTO ' : '+ ') + perk.title, state.cat.x, state.cat.y - 42, '#e8a838');
    if (state.wave % 2 === 0) {
      spawnBossVacuum();
    }
  }

  function openPerkSelection() {
    const shuffled = PERK_POOL.slice().sort(function() { return Math.random() - 0.5; }).slice(0, 3);
    state.currentPerkChoices = shuffled;

    // If AFK mode or Instant Auto-Perk is enabled, pick immediately without pausing!
    if (saveState.autoIdle || saveState.instantAutoPerk) {
      const best = pickRecommendedPerk(shuffled);
      selectPerkAndResume(best, true);
      return;
    }

    gameState = 'perk';
    if (!saveState.infiniteSpin) keys.spin = false;
    state.perkCountdownMax = 180; // 3.0 seconds at 60fps
    state.perkCountdownTicks = 180;

    const overlay = document.getElementById('perk-overlay');
    const container = document.getElementById('perk-cards');
    if (!overlay || !container) return;

    container.innerHTML = '';
    const recommended = pickRecommendedPerk(shuffled);

    shuffled.forEach(function(perk, idx) {
      const isRec = (perk.id === recommended.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'neon-btn p-3 text-left flex flex-col justify-between gap-1.5 relative' +
        (isRec ? ' ui-btn is-on' : ' ui-btn');
      btn.style.minHeight = '110px';
      btn.innerHTML =
        '<div class="flex items-center justify-between gap-1">' +
          '<span style="font-size:18px">' + perk.icon + '</span>' +
          '<div class="flex items-center gap-1">' +
            (isRec ? '<span class="chip">推薦</span>' : '') +
            '<span class="kbd">' + (idx + 1) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="font-bold text-xs mt-1" style="color:var(--text)">' + perk.title + '</div>' +
        '<div class="text-[11px] leading-snug" style="color:var(--muted)">' + perk.desc + '</div>';

      btn.addEventListener('click', function() {
        selectPerkAndResume(perk, false);
      });
      container.appendChild(btn);
    });

    updateAutoIdleButtons();
    overlay.classList.remove('hidden');
  }

  function applyPerk(perk) {
    window.OIIAAudio.playSFX('fever');
    state.perks.list.push(perk.icon);
    if (perk.id === 'magnet') state.perks.magnet *= 1.45;
    else if (perk.id === 'battery') state.perks.battery *= 0.72;
    else if (perk.id === 'shockwave') state.perks.shockwave *= 1.4;
    else if (perk.id === 'vortex_fast') state.perks.vortexRate *= 1.4;
    else if (perk.id === 'heal') {
      state.hp = Math.min(5, state.hp + 1);
      state.score += 250;
    }
    renderBuffPills();
    updateHUD();
  }

  function renderBuffPills() {
    const box = document.getElementById('hud-buffs');
    if (!box) return;
    if (state.perks.list.length === 0) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = '<span class="hint-chip buff-pills" style="color:var(--yellow);border-color:rgba(255,42,133,0.45)">強化 ' +
      state.perks.list.join(' ') + '</span>';
  }

  function runAutoIdleAI() {
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    // 1. Auto-release Vortex Overload when charged 100%
    if (state.vortexCharge >= 100) {
      triggerVortexOverload();
    }

    // 2. Scan items for threats and rewards
    let nearestThreat = null;
    let minThreatDist = Infinity;
    let bestTarget = null;
    let bestTargetScore = -Infinity;

    for (let i = 0; i < state.items.length; i++) {
      const it = state.items[i];
      const d = Math.hypot(it.x - state.cat.x, it.y - state.cat.y);
      const isEnemy = (it.type === 'cucumber' || it.type === 'vacuum' || it.type === 'boss_vacuum');
      if (isEnemy) {
        if (d < minThreatDist) {
          minThreatDist = d;
          nearestThreat = it;
        }
      } else {
        let val = 20;
        if (it.type === 'laser_gem') val = 95;
        else if (it.type === 'golden_fish') val = 75;
        else if (it.type === 'disco') val = 65;
        else if (it.type === 'can') val = (state.spinEnergy < 55 ? 90 : 45);
        const score = val - d * 0.35;
        if (score > bestTargetScore) {
          bestTargetScore = score;
          bestTarget = it;
        }
      }
    }

    // 3. Smart Spin Management:
    // Start spinning on the sweet-spot beat when energy is healthy or threat is near
    if (saveState.infiniteSpin) {
      keys.spin = true;
    } else {
      const isSweetSpot = (state.beatPhase >= 22 || state.beatPhase <= 3);
      if (!state.cat.isSpinning) {
        if ((state.spinEnergy >= 38 && isSweetSpot) || (minThreatDist < 92 && state.spinEnergy > 14) || state.isFever) {
          keys.spin = true;
        } else {
          keys.spin = false;
        }
      } else {
        // Keep spinning until energy drops below 16% (unless threatening enemy is right next to cat)
        if (state.spinEnergy < 16 && !state.isFever && minThreatDist > 75) {
          keys.spin = false;
        } else {
          keys.spin = true;
        }
      }
    }

    // 4. Smart Dash if enemy is dangerously close and we're out of spin energy, or to ram boss while spinning
    if (state.dashCd <= 0) {
      if ((!state.cat.isSpinning && minThreatDist < 68) || (state.cat.isSpinning && nearestThreat && nearestThreat.type === 'boss_vacuum' && minThreatDist < 130)) {
        triggerDash();
      }
    }

    // 5. Steering vector (seek collectibles / ram enemies when spinning, evade enemies when not spinning)
    let moveX = 0;
    let moveY = 0;

    if (!state.cat.isSpinning && nearestThreat && minThreatDist < 115) {
      // Evade threat
      moveX = state.cat.x - nearestThreat.x;
      moveY = state.cat.y - nearestThreat.y;
    } else if (state.cat.isSpinning && nearestThreat && minThreatDist < 120) {
      // Ram & deflect enemy for bonus combo!
      moveX = nearestThreat.x - state.cat.x;
      moveY = nearestThreat.y - state.cat.y;
    } else if (bestTarget) {
      moveX = bestTarget.x - state.cat.x;
      moveY = bestTarget.y - state.cat.y;
    } else {
      // Gently orbit center stage
      const cx = w / 2 + Math.cos(state.tick * 0.03) * (w * 0.22);
      const cy = h / 2 + Math.sin(state.tick * 0.04) * (h * 0.22);
      moveX = cx - state.cat.x;
      moveY = cy - state.cat.y;
    }

    // Keep away from walls
    const margin = 46;
    if (state.cat.x < margin) moveX += 80;
    if (state.cat.x > w - margin) moveX -= 80;
    if (state.cat.y < margin) moveY += 80;
    if (state.cat.y > h - margin) moveY -= 80;

    pointerTarget = {
      x: state.cat.x + moveX,
      y: state.cat.y + moveY
    };
  }

  function updateGame() {
    if (gameState === 'perk') {
      if (state.perkCountdownTicks > 0) {
        state.perkCountdownTicks--;
        const secEl = document.getElementById('perk-countdown-sec');
        const barEl = document.getElementById('perk-timer-bar');
        if (secEl) secEl.textContent = Math.max(0, (state.perkCountdownTicks / 60)).toFixed(1);
        if (barEl) barEl.style.width = Math.max(0, (state.perkCountdownTicks / state.perkCountdownMax) * 100) + '%';
        if (state.perkCountdownTicks <= 0) {
          const rec = pickRecommendedPerk(state.currentPerkChoices);
          selectPerkAndResume(rec, true);
        }
      }
      return;
    }

    if (gameState !== 'playing') return;

    state.tick++;
    state.beatPhase = (state.tick % 30);

    if (state.dashCd > 0) state.dashCd--;
    if (state.dashActive > 0) state.dashActive--;

    // Check Wave Progression (spaced out so it doesn't interrupt too frequently)
    if (state.score >= state.nextWaveScore) {
      state.wave++;
      state.nextWaveScore = Math.floor(state.nextWaveScore * 1.85 + 650);
      openPerkSelection();
      return;
    }

    // Run AI pilot if Auto-Idle is enabled and user isn't manually pressing directional keys
    const manualMove = keys.up || keys.down || keys.left || keys.right;
    if (saveState.autoIdle && !manualMove) {
      runAutoIdleAI();
    }

    // Rhythm mode timer countdown
    if (gameMode === 'rhythm' && state.tick % 60 === 0) {
      state.timeLeft--;
      if (state.timeLeft <= 0) {
        triggerGameOver('TIME UP! 60秒節奏狂熱演出完成！');
        return;
      }
    }

    // Fever countdown
    if (state.isFever) {
      state.feverTimer--;
      state.spinEnergy = 100;
      if (state.feverTimer <= 0) {
        endFever();
      }
    }

    // Spin & 3-Tier RPM Overdrive Logic
    const wantsSpin = keys.spin || saveState.infiniteSpin || state.isFever || state.dashActive > 0;
    if (wantsSpin && state.spinEnergy > 1.5) {
      if (!state.cat.isSpinning) {
        checkBeatParryOnSpinStart();
      }
      state.cat.isSpinning = true;
      state.spinHoldTicks++;

      if (!state.isFever && state.dashActive <= 0) {
        state.spinEnergy = Math.max(0, state.spinEnergy - (0.45 * state.perks.battery));
      }

      // Compute RPM & Tier (Tier 1: <45 ticks, Tier 2: 45..100 ticks, Tier 3 HYPER: >100 ticks)
      state.rpm = Math.min(999, Math.floor(300 + state.spinHoldTicks * 6.5));
      state.rpmTier = state.spinHoldTicks > 100 ? 3 : (state.spinHoldTicks > 42 ? 2 : 1);

      const beatInterval = (state.isFever || state.rpmTier === 3) ? 6 : 8;
      if (state.tick % beatInterval === 0) {
        const syl = window.OIIAAudio.stepSpinBeat(state.isFever || state.rpmTier === 3);
        state.lastSyllable = syl + (state.rpmTier === 3 ? '!!' : '!');
        const colors = { O: '#00f0ff', I: '#ff2a85', A: '#ffe600' };
        addFloatingText(syl, state.cat.x + (Math.random() - 0.5) * 38, state.cat.y - 24, colors[syl] || '#ffffff');
      }
    } else {
      state.cat.isSpinning = false;
      state.spinHoldTicks = Math.max(0, state.spinHoldTicks - 4);
      state.rpm = Math.max(0, Math.floor(state.rpm * 0.8));
      state.rpmTier = 0;
      state.spinEnergy = Math.min(100, state.spinEnergy + (0.72 / state.perks.battery));
    }

    // Movement
    let dx = 0, dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;

    if (pointerTarget) {
      const pdx = pointerTarget.x - state.cat.x;
      const pdy = pointerTarget.y - state.cat.y;
      const dist = Math.hypot(pdx, pdy);
      if (dist > 6) {
        dx = pdx / dist;
        dy = pdy / dist;
      }
    }

    const baseMove = state.cat.isSpinning ? (4.4 + state.rpmTier * 0.45) : 3.5;
    if (state.dashActive <= 0) {
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        state.cat.vx = (dx / len) * baseMove;
        state.cat.vy = (dy / len) * baseMove;
        if (dx < -0.1) state.cat.facingLeft = true;
        if (dx > 0.1) state.cat.facingLeft = false;
      } else {
        state.cat.vx *= 0.76;
        state.cat.vy *= 0.76;
      }
    }

    state.cat.x = Math.max(24, Math.min(canvas.width - 24, state.cat.x + state.cat.vx));
    state.cat.y = Math.max(24, Math.min(canvas.height - 24, state.cat.y + state.cat.vy));

    // Spawn items
    const spawnRate = state.isFever ? 16 : Math.max(18, 32 - state.wave * 2);
    if (state.tick % spawnRate === 0) {
      spawnItem();
    }

    // Update shockwaves
    for (let s = state.shockwaves.length - 1; s >= 0; s--) {
      const sw = state.shockwaves[s];
      sw.r += (sw.maxR - sw.r) * 0.22;
      sw.alpha -= 0.06;
      if (sw.alpha <= 0) state.shockwaves.splice(s, 1);
    }

    // Update items & collisions
    const pullRadius = (115 + state.rpmTier * 28) * state.perks.magnet;

    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.tick++;
      if (it.stunned > 0) it.stunned--;

      const distToCat = Math.hypot(state.cat.x - it.x, state.cat.y - it.y);
      const isGood = (it.type === 'fish' || it.type === 'golden_fish' || it.type === 'can' || it.type === 'disco' || it.type === 'laser_gem');

      // Boss AI tracking
      if (it.type === 'boss_vacuum') {
        if (it.stunned <= 0) {
          const ang = Math.atan2(state.cat.y - it.y, state.cat.x - it.x);
          it.x += Math.cos(ang) * 1.35;
          it.y += Math.sin(ang) * 1.35;
        } else {
          it.x += it.vx * 0.4;
          it.y += it.vy * 0.4;
        }
        it.x = Math.max(30, Math.min(canvas.width - 30, it.x));
        it.y = Math.max(30, Math.min(canvas.height - 30, it.y));
      } else if (state.cat.isSpinning && isGood && distToCat < pullRadius) {
        it.x += (state.cat.x - it.x) * (0.08 + state.rpmTier * 0.03);
        it.y += (state.cat.y - it.y) * (0.08 + state.rpmTier * 0.03);
      } else {
        // Laser gem zig-zags playfully
        if (it.type === 'laser_gem' && it.tick % 25 === 0) {
          it.vx += (Math.random() - 0.5) * 2.2;
          it.vy += (Math.random() - 0.5) * 2.2;
        }
        it.x += it.vx;
        it.y += it.vy;
      }

      const hitRadius = (it.type === 'boss_vacuum') ? 38 : (state.cat.isSpinning ? 32 : 22);
      if (distToCat < hitRadius) {
        if (isGood) {
          let pts = 15;
          let col = '#00f0ff';

          if (it.type === 'golden_fish') {
            pts = 40;
            col = '#ffe600';
            saveState.totalFish += 3;
          } else if (it.type === 'fish') {
            pts = 15;
            col = '#00f0ff';
            saveState.totalFish += 1;
          } else if (it.type === 'can') {
            pts = 25;
            col = '#ff2a85';
            state.spinEnergy = Math.min(100, state.spinEnergy + 35);
          } else if (it.type === 'disco') {
            pts = 35;
            col = '#00ff66';
            state.feverGauge = Math.min(100, state.feverGauge + 30);
          } else if (it.type === 'laser_gem') {
            pts = 60;
            col = '#ff0055';
            state.vortexCharge = Math.min(100, state.vortexCharge + 35);
            state.spinEnergy = 100;
          }

          const tierMult = state.cat.isSpinning ? state.rpmTier : 1;
          const totalGain = pts * state.combo * tierMult;
          state.score += totalGain;
          state.combo++;
          if (state.combo > state.maxCombo) state.maxCombo = state.combo;

          state.vortexCharge = Math.min(100, state.vortexCharge + Math.round(9 * state.perks.vortexRate));
          if (!state.isFever) {
            state.feverGauge = Math.min(100, state.feverGauge + Math.round(8 * state.perks.vortexRate));
            if (state.feverGauge >= 100) {
              triggerFever();
            }
          }

          addFloatingText('+' + totalGain, it.x, it.y, col);
          addBurst(it.x, it.y, col, 9);
          window.OIIAAudio.playSFX('collect');
          state.items.splice(i, 1);
          continue;
        } else {
          // Obstacle or Boss Vacuum
          if (state.cat.isSpinning || state.dashActive > 0) {
            if (it.type === 'boss_vacuum') {
              it.hp--;
              it.stunned = 35;
              const pushAng = Math.atan2(it.y - state.cat.y, it.x - state.cat.x);
              it.x += Math.cos(pushAng) * 36;
              it.y += Math.sin(pushAng) * 36;
              addBurst(it.x, it.y, '#ffe600', 14);
              window.OIIAAudio.playSFX('perfect');

              if (it.hp <= 0) {
                const bossBonus = 300 * state.wave;
                state.score += bossBonus;
                saveState.totalFish += 10;
                addShockwave(it.x, it.y, 180, '#ff2a85');
                addFloatingText('BOSS CLEAR +' + bossBonus, it.x, it.y, '#ffe600');
                state.items.splice(i, 1);
              } else {
                addFloatingText('撞擊首領! HP ' + it.hp, it.x, it.y - 20, '#00f0ff');
              }
              continue;
            } else {
              const deflectPts = 25 * state.combo * Math.max(1, state.rpmTier);
              state.score += deflectPts;
              state.combo++;
              state.vortexCharge = Math.min(100, state.vortexCharge + 10);
              addFloatingText('彈飛! +' + deflectPts, it.x, it.y, '#ffe600');
              addBurst(it.x, it.y, '#ffe600', 12);
              window.OIIAAudio.playSFX('collect');
              state.items.splice(i, 1);
              continue;
            }
          } else {
            state.hp--;
            state.combo = 1;
            addFloatingText('HIT -1 HP', state.cat.x, state.cat.y - 20, '#ff2a85');
            addBurst(state.cat.x, state.cat.y, '#ff2a85', 16);
            window.OIIAAudio.playSFX('hit');
            if (it.type !== 'boss_vacuum') {
              state.items.splice(i, 1);
            } else {
              it.x = 40;
              it.y = 40;
            }
            if (state.hp <= 0) {
              triggerGameOver('被黃瓜與掃地機軍團嚇跑了！');
              return;
            }
            continue;
          }
        }
      }

      if (it.type !== 'boss_vacuum' && (it.x < -50 || it.x > canvas.width + 50 || it.y < -50 || it.y > canvas.height + 50)) {
        state.items.splice(i, 1);
      }
    }

    // Update particles & floating texts
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = state.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.028;
      if (ft.alpha <= 0) state.floatingTexts.splice(i, 1);
    }

    if (state.score > saveState.highScore) {
      saveState.highScore = state.score;
      persistSave();
    }

    if (saveState.infiniteSpin) {
      keys.spin = true;
    }

    if (state.tick % 3 === 0) {
      updateHUD();
    }
  }

  function drawScene() {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = state.isFever ? '#1d053a' : '#090414';
    ctx.fillRect(0, 0, w, h);

    // Perspective disco grid
    ctx.strokeStyle = state.isFever
      ? 'rgba(255, 42, 133, 0.35)'
      : 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 36;
    const offset = (state.tick * (state.cat.isSpinning ? (2.0 + state.rpmTier * 0.8) : 0.7)) % gridSize;

    for (let x = offset; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = offset; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Disco lasers during spin or fever
    if (state.cat.isSpinning || state.isFever) {
      const laserColors = ['#ff2a85', '#00f0ff', '#ffe600', '#00ff66'];
      for (let l = 0; l < 4; l++) {
        ctx.save();
        ctx.strokeStyle = laserColors[(l + Math.floor(state.tick / 5)) % laserColors.length];
        ctx.globalAlpha = state.isFever ? 0.42 : 0.22;
        ctx.lineWidth = state.isFever ? 5 : 3;
        ctx.beginPath();
        ctx.moveTo(w * (0.2 + l * 0.2), 0);
        const sweepX = (w / 2) + Math.sin(state.tick * 0.08 + l * 1.5) * (w * 0.48);
        ctx.lineTo(sweepX, h);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Rhythm Beat Shrinking Ring around Cat (Visual cue for Beat Parry!)
    ctx.save();
    const targetR = 32;
    const shrinkR = targetR + ((29 - state.beatPhase) / 29) * 44;
    const isSweetSpot = (state.beatPhase >= 21 || state.beatPhase <= 4);

    // Inner target ring
    ctx.strokeStyle = isSweetSpot ? 'rgba(0, 255, 102, 0.75)' : 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = isSweetSpot ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(state.cat.x, state.cat.y, targetR, 0, Math.PI * 2);
    ctx.stroke();

    // Shrinking beat ring
    if (!state.cat.isSpinning && gameState === 'playing') {
      ctx.strokeStyle = isSweetSpot ? '#00ff66' : 'rgba(0, 240, 255, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.cat.x, state.cat.y, shrinkR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Draw expanding shockwaves
    for (let s = 0; s < state.shockwaves.length; s++) {
      const sw = state.shockwaves[s];
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw items
    for (let i = 0; i < state.items.length; i++) {
      window.OIIASprites.drawItem(ctx, state.items[i]);
    }

    // Draw particles
    for (let i = 0; i < state.particles.length; i++) {
      const p = state.particles[i];
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 5, 5);
    }

    // Draw OIIA Cat
    window.OIIASprites.drawCat(ctx, {
      x: state.cat.x,
      y: state.cat.y,
      vx: state.cat.vx,
      vy: state.cat.vy,
      facingLeft: state.cat.facingLeft,
      isSpinning: state.cat.isSpinning,
      isFever: state.isFever,
      rpmTier: state.rpmTier,
      skinId: saveState.selectedSkin,
      tick: state.tick,
      pixelSize: Math.min(3.6, Math.max(2.6, Math.min(w, h) / 105))
    });

    // Draw floating texts
    for (let i = 0; i < state.floatingTexts.length; i++) {
      const ft = state.floatingTexts[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = 'bold 12px "Press Start 2P", monospace';
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  function gameLoop() {
    updateGame();
    drawScene();
    animId = requestAnimationFrame(gameLoop);
  }

  function updateHUD() {
    const scoreEl = document.getElementById('hud-score');
    const highEl = document.getElementById('hud-high');
    const comboEl = document.getElementById('hud-combo');
    const hpEl = document.getElementById('hud-hp');
    const spinBar = document.getElementById('bar-spin');
    const feverBar = document.getElementById('bar-fever');
    const sylEl = document.getElementById('hud-syllable');
    const rpmEl = document.getElementById('hud-rpm');
    const waveBadge = document.getElementById('hud-wave-badge');
    const vortexStatus = document.getElementById('hud-vortex-status');
    const btnVortex = document.getElementById('btn-vortex');
    const btnVortexSub = document.getElementById('hud-vortex-btn-sub');
    const dashCdEl = document.getElementById('hud-dash-cd');
    const modeTimerEl = document.getElementById('hud-timer');

    fitStatEl(scoreEl, formatCompact(state.score));
    fitStatEl(highEl, formatCompact(saveState.highScore));
    fitStatEl(comboEl, 'x' + formatCompact(state.combo));
    if (hpEl) hpEl.textContent = state.hp > 0 ? ('HP ' + state.hp) : 'HP 0';
    if (spinBar) spinBar.style.width = Math.round(state.spinEnergy) + '%';
    if (feverBar) feverBar.style.width = (state.isFever ? 100 : Math.round(state.vortexCharge)) + '%';
    if (sylEl) {
      let syl = state.lastSyllable || 'READY';
      if (state.isFever) syl = 'FEVER';
      else if (saveState.infiniteSpin) syl = '∞ SPIN';
      if (syl.length > 12) syl = syl.slice(0, 11) + '…';
      sylEl.textContent = syl;
    }
    if (rpmEl) {
      const tierNames = ['', 'T1', 'T2', 'MAX'];
      rpmEl.textContent = formatCompact(state.rpm) + ' RPM ' + (tierNames[state.rpmTier] || '');
    }
    if (waveBadge) waveBadge.textContent = 'W' + formatCompact(state.wave);

    if (vortexStatus) {
      vortexStatus.textContent = state.vortexCharge >= 100 ? 'READY · E' : (state.vortexCharge + '%');
    }
    if (btnVortex && btnVortexSub) {
      if (state.vortexCharge >= 100) {
        btnVortex.disabled = false;
        btnVortex.classList.add('overload-Ready');
        btnVortexSub.textContent = 'READY · E';
      } else {
        btnVortex.disabled = true;
        btnVortex.classList.remove('overload-Ready');
        btnVortexSub.textContent = state.vortexCharge + '% · E';
      }
    }
    if (dashCdEl) {
      dashCdEl.textContent = state.dashCd > 0 ? (Math.ceil(state.dashCd / 60) + 's') : 'Q';
    }
    if (modeTimerEl) {
      modeTimerEl.textContent = gameMode === 'rhythm' ? (state.timeLeft + 's') : '∞';
    }

    // Update all fish bank counters (desktop + mobile drawer)
    document.querySelectorAll('#hud-fish-bank, .fish-bank-val').forEach(function(el) {
      el.textContent = formatCompact(saveState.totalFish);
    });
  }

  function startGame(mode) {
    if (mode) gameMode = mode;
    window.OIIAAudio.ensureContext();
    persistSave();
    resetGameState();
    gameState = 'playing';

    const overlay = document.getElementById('game-overlay');
    if (overlay) overlay.classList.add('hidden');
    const perkOverlay = document.getElementById('perk-overlay');
    if (perkOverlay) perkOverlay.classList.add('hidden');

    renderSkinsModal();
    updateModeButtons();
    updateAutoIdleButtons();
  }

  function pauseOrResumeGame() {
    if (gameState === 'playing') {
      gameState = 'paused';
      showOverlay('PAUSED 暫停中', '休息一下，隨時準備繼續旋轉 O-I-I-A！', '繼續遊戲');
    } else if (gameState === 'paused') {
      gameState = 'playing';
      const overlay = document.getElementById('game-overlay');
      if (overlay) overlay.classList.add('hidden');
    }
  }

  function triggerGameOver(reason) {
    gameState = 'gameover';
    if (!saveState.infiniteSpin) keys.spin = false;
    endFever();
    persistSave();
    updateHUD();
    renderSkinsModal();
    showOverlay(
      'GAME OVER',
      reason + ' 本局得分：' + formatCompact(state.score) +
        '｜波數：WAVE ' + formatCompact(state.wave) +
        '｜最高連擊：x' + formatCompact(state.maxCombo) +
        (saveState.highScore ? ('｜BEST：' + formatCompact(saveState.highScore)) : ''),
      '再轉一局 (O-I-I-A!)'
    );
  }

  function showOverlay(title, subtitle, btnText) {
    const overlay = document.getElementById('game-overlay');
    const titleEl = document.getElementById('overlay-title');
    const subEl = document.getElementById('overlay-sub');
    const btnEl = document.getElementById('btn-start-main');

    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    if (btnEl) btnEl.textContent = btnText;
    if (overlay) overlay.classList.remove('hidden');
  }

  function updateAutoIdleButtons() {
    const btnIdle = document.getElementById('btn-auto-idle');
    if (btnIdle) {
      if (saveState.autoIdle) {
        btnIdle.className = 'neon-btn ui-btn is-on px-1.5 py-1.5';
        btnIdle.textContent = 'AUTO ON';
      } else {
        btnIdle.className = 'neon-btn ui-btn px-1.5 py-1.5';
        btnIdle.textContent = 'AUTO';
      }
    }
    const btnAutoPerk = document.getElementById('btn-toggle-auto-perk');
    if (btnAutoPerk) {
      if (saveState.instantAutoPerk) {
        btnAutoPerk.className = 'neon-btn ui-btn is-on px-3 py-1.5 text-[11px]';
        btnAutoPerk.textContent = '自動秒選：開';
      } else {
        btnAutoPerk.className = 'neon-btn ui-btn px-3 py-1.5 text-[11px]';
        btnAutoPerk.textContent = '自動秒選：關';
      }
    }
    const hintEl = document.getElementById('hud-beat-hint');
    if (hintEl) {
      hintEl.textContent = saveState.autoIdle
        ? 'AUTO 模式中 — 自動 Perfect 與選強化'
        : '縮圈重合時按旋轉 = Perfect';
    }
  }

  function updateModeButtons() {
    const btnEndless = document.getElementById('btn-mode-endless');
    const btnRhythm = document.getElementById('btn-mode-rhythm');
    if (!btnEndless || !btnRhythm) return;

    if (gameMode === 'endless') {
      btnEndless.className = 'neon-btn ui-btn is-on px-1.5 py-1.5 btn-infinity';
      btnRhythm.className = 'neon-btn ui-btn px-1.5 py-1.5';
    } else {
      btnRhythm.className = 'neon-btn ui-btn is-teal px-1.5 py-1.5';
      btnEndless.className = 'neon-btn ui-btn px-1.5 py-1.5 btn-infinity';
    }
  }

  function isSkinUnlocked(key) {
    const sk = window.OIIASprites.SKINS[key];
    if (!sk) return false;
    return key === 'classic' || saveState.highScore >= sk.unlockScore;
  }

  function ensureSelectedSkinValid() {
    if (!isSkinUnlocked(saveState.selectedSkin)) {
      saveState.selectedSkin = 'classic';
      persistSave();
    }
  }

  function renderSkinsModal() {
    ensureSelectedSkinValid();
    const containers = document.querySelectorAll('#skins-grid, .skins-grid-clone');
    containers.forEach(function(container) {
      container.innerHTML = '';
      const skinKeys = Object.keys(window.OIIASprites.SKINS);
      skinKeys.forEach(function(key) {
        const sk = window.OIIASprites.SKINS[key];
        const unlocked = isSkinUnlocked(key);
        const isSelected = saveState.selectedSkin === key;

        const card = document.createElement('div');
        card.className = 'skin-card p-2.5 flex flex-col justify-between gap-1.5';
        card.style.cursor = 'default';
        if (isSelected) {
          card.classList.add('skin-card-on');
        } else if (!unlocked) {
          card.classList.add('skin-card-locked');
        } else {
          card.classList.add('skin-card-ready');
        }

        const nameColor = isSelected ? '#ffffff' : (unlocked ? 'var(--cyan)' : '#e8dff8');
        const descColor = isSelected ? 'rgba(255,255,255,0.88)' : (unlocked ? '#cbb8e8' : '#b7a8d4');
        const topRow = document.createElement('div');
        topRow.innerHTML =
          '<div class="flex items-center justify-between gap-1">' +
            '<span class="font-bold text-xs" style="color:' + nameColor + '">' + sk.name + '</span>' +
            '<span class="chip">' +
              (sk.unlockScore === 0 ? '預設' : ('最高分 ' + sk.unlockScore)) +
            '</span>' +
          '</div>' +
          '<p class="text-[11px] mt-1 leading-snug" style="color:' + descColor + '">' + sk.desc + '</p>';

        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        if (isSelected) {
          actionBtn.className = 'neon-btn ui-btn is-teal w-full py-1.5 text-[11px] font-bold';
          actionBtn.textContent = '使用中';
        } else if (unlocked) {
          actionBtn.className = 'neon-btn ui-btn is-on w-full py-1.5 text-[11px] font-bold';
          actionBtn.textContent = '切換';
          actionBtn.addEventListener('click', function() {
            saveState.selectedSkin = key;
            persistSave();
            window.OIIAAudio.playSFX('collect');
            renderSkinsModal();
            drawScene();
          });
        } else {
          actionBtn.className = 'neon-btn skin-lock-btn w-full py-1.5 text-[11px] font-bold';
          actionBtn.disabled = true;
          actionBtn.textContent = '未解鎖';
          actionBtn.title = '需最高分達 ' + sk.unlockScore;
        }

        card.appendChild(topRow);
        card.appendChild(actionBtn);
        container.appendChild(card);
      });
    });
  }

  function resizeCanvas() {
    if (!canvas) return;
    const wrap = document.getElementById('stage-container');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const targetW = Math.max(260, Math.floor(rect.width));
    const targetH = Math.max(160, Math.floor(rect.height));
    canvas.width = targetW;
    canvas.height = targetH;
    if (state && state.cat) {
      state.cat.x = Math.min(canvas.width - 26, Math.max(26, state.cat.x || canvas.width / 2));
      state.cat.y = Math.min(canvas.height - 26, Math.max(26, state.cat.y || canvas.height / 2));
    }
    drawScene();
  }

  function bindEvents() {
    window.addEventListener('keydown', function(e) {
      trackKonami(e.code, e.repeat);
      if (gameState === 'perk' && state.currentPerkChoices && state.currentPerkChoices.length > 0) {
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          selectPerkAndResume(state.currentPerkChoices[0], false);
          return;
        }
        if (e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          if (state.currentPerkChoices[1]) selectPerkAndResume(state.currentPerkChoices[1], false);
          return;
        }
        if (e.code === 'Digit3' || e.code === 'Numpad3') {
          e.preventDefault();
          if (state.currentPerkChoices[2]) selectPerkAndResume(state.currentPerkChoices[2], false);
          return;
        }
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
      if (e.code === 'Space') {
        e.preventDefault();
        keys.spin = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyQ') {
        e.preventDefault();
        triggerDash();
      }
      if (e.code === 'KeyE' || e.code === 'Enter') {
        e.preventDefault();
        triggerVortexOverload();
      }
      if (e.code === 'KeyP') {
        pauseOrResumeGame();
      }
    });

    window.addEventListener('keyup', function(e) {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
      if (e.code === 'Space') {
        if (!saveState.infiniteSpin) keys.spin = false;
      }
    });

    canvas.addEventListener('pointerdown', function(e) {
      window.OIIAAudio.ensureContext();
      const rect = canvas.getBoundingClientRect();
      pointerTarget = {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
      };
    });

    canvas.addEventListener('pointermove', function(e) {
      if (!pointerTarget) return;
      const rect = canvas.getBoundingClientRect();
      pointerTarget = {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
      };
    });

    window.addEventListener('pointerup', function() {
      pointerTarget = null;
    });

    function bindHoldButton(id, keyName) {
      const btn = document.getElementById(id);
      if (!btn) return;
      const startHold = function(e) {
        e.preventDefault();
        window.OIIAAudio.ensureContext();
        keys[keyName] = true;
      };
      const endHold = function(e) {
        e.preventDefault();
        if (keyName === 'spin' && saveState.infiniteSpin) return;
        keys[keyName] = false;
      };
      btn.addEventListener('pointerdown', startHold);
      btn.addEventListener('pointerup', endHold);
      btn.addEventListener('pointerleave', endHold);
      btn.addEventListener('pointercancel', endHold);
    }

    bindHoldButton('btn-dpad-up', 'up');
    bindHoldButton('btn-dpad-down', 'down');
    bindHoldButton('btn-dpad-left', 'left');
    bindHoldButton('btn-dpad-right', 'right');
    bindHoldButton('btn-spin-hold', 'spin');

    const btnDash = document.getElementById('btn-dash');
    if (btnDash) {
      btnDash.addEventListener('click', function() {
        window.OIIAAudio.ensureContext();
        triggerDash();
      });
    }

    const btnVortex = document.getElementById('btn-vortex');
    if (btnVortex) {
      btnVortex.addEventListener('click', function() {
        window.OIIAAudio.ensureContext();
        triggerVortexOverload();
      });
    }

    const btnStartMain = document.getElementById('btn-start-main');
    if (btnStartMain) {
      btnStartMain.addEventListener('click', function() {
        if (gameState === 'paused') {
          pauseOrResumeGame();
        } else {
          startGame(gameMode);
        }
      });
    }

    const btnEndless = document.getElementById('btn-mode-endless');
    if (btnEndless) {
      btnEndless.addEventListener('click', function() {
        startGame('endless');
      });
    }

    const btnRhythm = document.getElementById('btn-mode-rhythm');
    if (btnRhythm) {
      btnRhythm.addEventListener('click', function() {
        startGame('rhythm');
      });
    }

    const btnAutoIdle = document.getElementById('btn-auto-idle');
    if (btnAutoIdle) {
      btnAutoIdle.addEventListener('click', function() {
        window.OIIAAudio.ensureContext();
        saveState.autoIdle = !saveState.autoIdle;
        if (!saveState.autoIdle) {
          pointerTarget = null;
          if (!saveState.infiniteSpin) keys.spin = false;
        } else if (gameState === 'ready') {
          startGame(gameMode);
        } else if (gameState === 'perk' && state.currentPerkChoices && state.currentPerkChoices.length > 0) {
          selectPerkAndResume(pickRecommendedPerk(state.currentPerkChoices), true);
        }
        persistSave();
        updateAutoIdleButtons();
      });
    }

    const btnToggleAutoPerk = document.getElementById('btn-toggle-auto-perk');
    if (btnToggleAutoPerk) {
      btnToggleAutoPerk.addEventListener('click', function() {
        saveState.instantAutoPerk = !saveState.instantAutoPerk;
        persistSave();
        updateAutoIdleButtons();
        if (saveState.instantAutoPerk && gameState === 'perk' && state.currentPerkChoices && state.currentPerkChoices.length > 0) {
          selectPerkAndResume(pickRecommendedPerk(state.currentPerkChoices), true);
        }
      });
    }

    const btnPause = document.getElementById('btn-pause');
    if (btnPause) {
      btnPause.addEventListener('click', function() {
        pauseOrResumeGame();
      });
    }

    const btnMute = document.getElementById('btn-mute');
    if (btnMute) {
      btnMute.addEventListener('click', function() {
        const isMuted = window.OIIAAudio.toggleMute();
        btnMute.textContent = isMuted ? 'MUTE' : 'SND';
      });
    }

    // Mobile Drawer Open/Close
    const btnOpenDrawer = document.getElementById('btn-open-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const drawerBackdrop = document.getElementById('mobile-drawer-backdrop');
    const mobileDrawerContent = document.getElementById('mobile-drawer-content');
    const sideDrawer = document.getElementById('side-drawer');

    if (btnOpenDrawer && drawerBackdrop && mobileDrawerContent && sideDrawer) {
      btnOpenDrawer.addEventListener('click', function() {
        if (gameState === 'playing') pauseOrResumeGame();
        const drawerSource = sideDrawer.querySelector('.drawer-scroll');
        if (!drawerSource) return;
        mobileDrawerContent.innerHTML = drawerSource.innerHTML;
        // Re-tag cloned IDs to classes to avoid duplicate IDs while keeping functionality
        const clonedSkinGrid = mobileDrawerContent.querySelector('#skins-grid');
        if (clonedSkinGrid) {
          clonedSkinGrid.removeAttribute('id');
          clonedSkinGrid.classList.add('skins-grid-clone');
        }
        const clonedFishBank = mobileDrawerContent.querySelector('#hud-fish-bank');
        if (clonedFishBank) {
          clonedFishBank.removeAttribute('id');
          clonedFishBank.classList.add('fish-bank-val');
        }
        mobileDrawerContent.querySelectorAll('#btn-dj-o, #btn-dj-i, #btn-dj-a, #btn-dj-rave').forEach(function(el) {
          el.classList.add(el.id);
          el.removeAttribute('id');
        });
        bindDjButtonsInContainer(mobileDrawerContent);
        renderSkinsModal();
        drawerBackdrop.classList.remove('hidden');
      });
    }

    if (btnCloseDrawer && drawerBackdrop) {
      btnCloseDrawer.addEventListener('click', function() {
        drawerBackdrop.classList.add('hidden');
      });
    }

    bindDjButtonsInContainer(document);
    window.addEventListener('resize', resizeCanvas);
  }

  function bindDjButtonsInContainer(root) {
    const djMap = [
      { sel: '#btn-dj-o, .btn-dj-o', syl: 'O', pitch: 220 },
      { sel: '#btn-dj-i, .btn-dj-i', syl: 'I', pitch: 277.18 },
      { sel: '#btn-dj-a, .btn-dj-a', syl: 'A', pitch: 246.94 }
    ];
    djMap.forEach(function(item) {
      const b = root.querySelector(item.sel);
      if (b) {
        b.addEventListener('click', function() {
          window.OIIAAudio.ensureContext();
          window.OIIAAudio.playVowel(item.syl, item.pitch, 0.22, state.isFever);
          state.lastSyllable = item.syl + '!';
          addFloatingText(item.syl + '!', state.cat.x, state.cat.y - 24, '#00f0ff');
          updateHUD();
          drawScene();
        });
      }
    });

    const btnRave = root.querySelector('#btn-dj-rave, .btn-dj-rave');
    if (btnRave) {
      btnRave.addEventListener('click', function() {
        window.OIIAAudio.ensureContext();
        const s = window.OIIAAudio.stepSpinBeat(true);
        state.lastSyllable = 'O-I-I-A (' + s + ')';
        addFloatingText(s, state.cat.x, state.cat.y - 24, '#ffe600');
        updateHUD();
        drawScene();
      });
    }
  }

  window.onload = function() {
    loadSave();
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resetGameState();
    resizeCanvas();
    bindEvents();
    renderSkinsModal();
    updateModeButtons();
    updateAutoIdleButtons();
    updateHUD();
    if (saveState.infiniteSpin) {
      keys.spin = true;
      const sylEl = document.getElementById('hud-syllable');
      if (sylEl) sylEl.textContent = '∞ SPIN';
    }
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(gameLoop);
  };
})();
