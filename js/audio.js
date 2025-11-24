// OIIA Cat Web Audio Synthesizer (Formant "O-I-I-A-I" + Techno Beat)
window.OIIAAudio = (function() {
  let ctx = null;
  let muted = false;
  let stepIndex = 0;

  const PATTERN = [
    { syl: 'O', pitch: 220, dur: 0.15 },
    { syl: 'I', pitch: 277.18, dur: 0.12 },
    { syl: 'I', pitch: 277.18, dur: 0.12 },
    { syl: 'A', pitch: 246.94, dur: 0.15 },
    { syl: 'I', pitch: 277.18, dur: 0.14 },
    { syl: 'O', pitch: 220, dur: 0.15 },
    { syl: 'I', pitch: 329.63, dur: 0.11 },
    { syl: 'I', pitch: 329.63, dur: 0.11 },
    { syl: 'I', pitch: 329.63, dur: 0.11 },
    { syl: 'A', pitch: 293.66, dur: 0.15 },
    { syl: 'I', pitch: 277.18, dur: 0.15 }
  ];

  const FORMANTS = {
    O: { f1: 450, f2: 850 },
    I: { f1: 300, f2: 2300 },
    A: { f1: 780, f2: 1250 }
  };

  function ensureContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function playVowel(syl, pitchHz, durationSec, isFever) {
    if (muted) return;
    const audio = ensureContext();
    if (!audio) return;

    const now = audio.currentTime;
    const osc = audio.createOscillator();
    osc.type = 'sawtooth';
    const mult = isFever ? 1.25 : 1.0;
    osc.frequency.setValueAtTime(pitchHz * mult, now);

    const fData = FORMANTS[syl] || FORMANTS.O;
    const filter1 = audio.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(fData.f1, now);
    filter1.Q.setValueAtTime(5.5, now);

    const filter2 = audio.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(fData.f2, now);
    filter2.Q.setValueAtTime(7.0, now);

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.008, now + durationSec);

    osc.connect(filter1);
    osc.connect(filter2);
    filter1.connect(gain);
    filter2.connect(gain);
    gain.connect(audio.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  function playKick() {
    if (muted) return;
    const audio = ensureContext();
    if (!audio) return;

    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.11);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.12);

    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  function stepSpinBeat(isFever) {
    const note = PATTERN[stepIndex % PATTERN.length];
    stepIndex++;
    playVowel(note.syl, note.pitch, note.dur, isFever);
    if (stepIndex % 2 === 1) {
      playKick();
    }
    return note.syl;
  }

  function playSFX(type) {
    if (muted) return;
    const audio = ensureContext();
    if (!audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    if (type === 'collect') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.05);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.13);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'perfect') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(783.99, now + 0.05);
      osc.frequency.setValueAtTime(1046.5, now + 0.10);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.22);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (type === 'fever' || type === 'vortex') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.linearRampToValueAtTime(987.77, now + 0.28);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.32);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.34);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(52, now + 0.22);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.24);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  return {
    ensureContext: ensureContext,
    playVowel: playVowel,
    playKick: playKick,
    stepSpinBeat: stepSpinBeat,
    playSFX: playSFX,
    toggleMute: toggleMute
  };
})();
