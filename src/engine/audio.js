// mineru audio — procedural Japanese-orchestral soundtrack + SFX (WebAudio, no assets)

const NOTE_BASE = { 'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11 };
function freqOf(n) {
  // "A4" style
  const m = /^([A-G][#b]?)(-?\d)$/.exec(n);
  if (!m) return 440;
  const semis = NOTE_BASE[m[1]] + (parseInt(m[2]) + 1) * 12;
  return 440 * Math.pow(2, (semis - 69) / 12);
}
const HIRA = { 'A': ['A', 'B', 'C', 'E', 'F'], 'A2': ['A', 'B', 'C', 'E', 'F'] };

export class AudioEngine {
  constructor() {
    this.ctx = null; this.musicVol = 0.5; this.sfxVol = 0.7;
    this.currentSong = null; this.songName = '';
    this.lookahead = 0.18; this.timerID = null; this.nextBeat = 0; this.beatIndex = 0;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 5; comp.connect(this.master);
    this.bus = comp;
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicVol; this.musicGain.connect(this.bus);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfxVol; this.sfxGain.connect(this.bus);
    this.convolver = null;
  }

  setVolumes(mv, sv) {
    this.musicVol = mv; this.sfxVol = sv;
    if (this.musicGain) this.musicGain.gain.value = mv;
    if (this.sfxGain) this.sfxGain.gain.value = sv;
  }

  // ---------- instruments ----------
  pluck(f, t, dur = 0.5, vel = 1, dest = null) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2.001;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(f * 8, t); lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + dur * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.5, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(dest || this.musicGain);
    o.start(t); o.stop(t + dur + 0.05); o2.start(t); o2.stop(t + dur + 0.05);
  }
  mallet(f, t, dur = 0.6, vel = 1) {
    const ctx = this.ctx;
    const carriers = [[1, 1.0], [2.76, 0.35], [5.4, 0.12]];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.4, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.musicGain);
    for (const [ratio, amp] of carriers) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * ratio;
      const og = ctx.createGain(); og.gain.value = amp;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.05);
    }
  }
  pad(freqs, t, dur = 2.5, vel = 1, dest = null) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.25, t + 0.8);
    g.gain.setValueAtTime(vel * 0.25, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    g.connect(dest || this.musicGain);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600; lp.connect(g);
    for (const f of freqs) {
      for (const det of [-4, 3]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
        const og = ctx.createGain(); og.gain.value = 1 / (freqs.length * 2);
        o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.1);
      }
    }
  }
  taiko(t, vel = 1, dest = null) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.14);
    const g = ctx.createGain(); g.gain.setValueAtTime(vel * 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g); g.connect(dest || this.musicGain); o.start(t); o.stop(t + 0.5);
    const nb = ctx.createBufferSource(); nb.buffer = this._noise(0.06);
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 400;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(vel * 0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    nb.connect(nf); nf.connect(ng); ng.connect(dest || this.musicGain); nb.start(t);
  }
  hihat(t, vel = 0.3, dest = null) {
    const ctx = this.ctx;
    const nb = ctx.createBufferSource(); nb.buffer = this._noise(0.05);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
    const g = ctx.createGain(); g.gain.setValueAtTime(vel * 0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    nb.connect(f); f.connect(g); g.connect(dest || this.musicGain); nb.start(t);
  }
  _noise(dur = 0.2) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  strings(freqs, t, dur = 3, vel = 1, dest = null) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.16, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    g.connect(dest || this.musicGain);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.5; lp.connect(g);
    for (const f of freqs) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 10;
      const og = ctx.createGain(); og.gain.value = 1 / freqs.length;
      const vib = ctx.createOscillator(); vib.frequency.value = 4.8 + Math.random();
      const vg = ctx.createGain(); vg.gain.value = 2.5; vib.connect(vg); vg.connect(o.detune); vib.start(t); vib.stop(t + dur + 0.1);
      o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.1);
    }
  }

  // ---------- songs (hand-written motifs in hirajoshi / in scale ----------
  _scheduleNote(inst, f, t, dur, vel, dest) {
    switch (inst) {
      case 'pluck': this.pluck(f, t, dur, vel, dest); break;
      case 'mallet': this.mallet(f, t, dur, vel); break;
      case 'pad': this.pad(f, t, dur, vel, undefined); break; // f is array
      case 'strings': this.strings(f, t, dur, vel); break;
      case 'taiko': this.taiko(t, vel); break;
      case 'hat': this.hihat(t, vel); break;
      default: break;
    }
  }

  playSong(name) {
    this.ensure();
    if (this.songName === name) return;
    this.stopSong();
    const song = SONGS[name]; if (!song) return;
    this.songName = name; this.beatIndex = 0;
    this.secPerBeat = 60 / song.bpm;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.song = song;
    this.timerID = setInterval(() => this._pump(), 60);
    this._pump();
  }

  stopSong() {
    if (this.timerID) { clearInterval(this.timerID); this.timerID = null; }
    this.songName = ''; this.song = null;
  }

  _pump() {
    if (!this.song || !this.ctx) return;
    const spb = this.secPerBeat, song = this.song, total = song.bars * 4;
    while (this.nextTime < this.ctx.currentTime + this.lookahead) {
      const beat = this.beatIndex % total;
      for (const tr of song.tracks) {
        const hits = tr.pat[beat];
        if (hits) for (const h of hits) {
          try {
            if (h.n) this._scheduleNote(tr.inst, h.a ? h.n.map(freqOf) : freqOf(h.n), this.nextTime, (h.d || tr.d || 0.5) * spb, h.v ?? tr.v ?? 1, this.musicGain);
            else this._scheduleNote(tr.inst, 0, this.nextTime, h.d || 0.2, h.v ?? tr.v ?? 1, this.musicGain);
          } catch (e) { /* keep audio alive */ }
        }
      }
      this.beatIndex++;
      this.nextTime += spb;
    }
  }

  // ---------- SFX ----------
  sfx(name, opt = {}) {
    this.ensure();
    const ctx = this.ctx, t = ctx.currentTime, dest = this.sfxGain;
    const O = (type, f0, f1, d, v, curve = 'exp') => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1) { if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + d); else o.frequency.linearRampToValueAtTime(f1, t + d); }
      g.gain.setValueAtTime(v * 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.02);
    };
    const N = (f0, q, d, v) => {
      const nb = ctx.createBufferSource(); nb.buffer = this._noise(d);
      const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f0; fl.Q.value = q;
      const g = ctx.createGain(); g.gain.setValueAtTime(v * 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      nb.connect(fl); fl.connect(g); g.connect(dest); nb.start(t);
    };
    switch (name) {
      case 'jump': O('sine', 320, 620, 0.16, 0.7, 'exp'); break;
      case 'jump2': O('sine', 420, 800, 0.14, 0.6); break;
      case 'dash': N(1800, 1.2, 0.14, 0.7); O('sine', 200, 90, 0.12, 0.4); break;
      case 'swoosh': N(2400, 2, 0.12, 0.6); break;
      case 'hit': N(900, 0.8, 0.12, 0.9); O('square', 180, 60, 0.1, 0.6); break;
      case 'heavyhit': N(500, 0.6, 0.2, 1.0); O('square', 120, 40, 0.2, 0.9); break;
      case 'hurt': O('sawtooth', 500, 140, 0.25, 0.6); N(800, 1, 0.2, 0.5); break;
      case 'coin': O('sine', 1150, 0, 0.06, 0.5); setTimeout(() => this.sfx('coin2'), 40); break;
      case 'coin2': O('sine', 1730, 0, 0.12, 0.4); break;
      case 'senbei': O('triangle', 700, 990, 0.2, 0.6); break;
      case 'heal': [660, 830, 990].forEach((f, i) => setTimeout(() => O('sine', f, 0, 0.2, 0.4), i * 70)); break;
      case 'blip': O('square', opt.pitch || 620 + Math.random() * 120, 0, 0.045, 0.16); break;
      case 'squeak': O('sine', 2000 + Math.random() * 500, 2600, 0.09, 0.4); break;
      case 'mouseat': [2100, 2400, 2100].forEach((f, i) => setTimeout(() => O('sine', f, f * 1.2, 0.06, 0.4), i * 55)); break;
      case 'deer': O('sawtooth', 200, 110, 0.4, 0.6); N(300, 0.7, 0.3, 0.6); break;
      case 'select': O('sine', 740, 990, 0.12, 0.5); break;
      case 'start': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => O('sine', f, 0, 0.25, 0.5), i * 90)); break;
      case 'phone': [1240, 1160, 1240].forEach((f, i) => setTimeout(() => O('sine', f, 0, 0.34, 0.34), i * 380)); break;
      case 'stamp': O('sine', 130, 55, 0.22, 0.8); N(600, 1, 0.08, 0.7); break;
      case 'door': O('sawtooth', 90, 240, 0.3, 0.4); N(300, 0.8, 0.25, 0.6); break;
      case 'roar': O('sawtooth', 120, 55, 0.8, 0.8); N(180, 0.6, 0.7, 0.8); break;
      case 'smash': N(240, 0.5, 0.4, 1.1); O('sine', 100, 30, 0.4, 1.0); break;
      case 'power': [392, 523, 659, 880].forEach((f, i) => setTimeout(() => O('triangle', f, f * 1.5, 0.3, 0.5), i * 100)); break;
      default: break;
    }
  }
}

// pattern helper: "A3 . C4 E4 ." -> tokens; '.' rest; supports chord via "A3+C4"
function melody(str, vel = 1, d = 1) {
  const out = [];
  for (let b = 0; b < str.split(/\s+/).length; b++) {
    const tok = str.split(/\s+/)[b];
    if (tok === '.' || tok === '-') continue;
    const notes = tok.split('+');
    out.push({ b, n: notes.length === 1 ? notes[0] : notes, v: vel, d });
  }
  return out;
}

// songs: hirajoshi A (A B C E F)
const SONGS = {
  title: {
    bpm: 66, bars: 8,
    tracks: [
      { inst: 'pad', pat: melody('A3+C4+E4 . . . C4+F4 . . . C3+F3+A3 . . . E3+A3+C4', 1.4, 2), v: 1, d: 1 },
      { inst: 'strings', pat: melody('A3+C4+E4', 2.0, 1), d: 3, v: 1, t: 1 },
      { inst: 'pluck', pat: melody('A4 . E4 C5 . A4 . . C5 . F4 . E4 . . .', 0.8, 0.8), v: 0.8, d: 0.8 },
      { inst: 'mallet', pat: (() => {
        const m = melody('A5 . C6 E5 A5 . . F5 . E5 C5 . A4 . . .');
        const shift = melody('');
        return m;
      })(), v: 0.5 },
      { inst: 'taiko', pat: (() => { const p = []; for (let b = 0; b < 32; b++) { if (b % 8 === 0) p.push({ b, v: 0 }); } return p.filter(x => false); })(), v: 0 },
    ],
  },
  office: {
    bpm: 84, bars: 8,
    tracks: [
      { inst: 'pad', pat: melody('F3+A3+C4 . . . C3+F3+A3 . . . E3+G3+B3 . . . D3+F3+A3', 0.8, 2), v: 0.7, d: 1 },
      { inst: 'hat', pat: (() => { const p = []; for (let b = 0; b < 32; b++) { if (b % 2 === 0) p.push({ b, v: b % 4 === 0 ? 0.35 : 0.18 }); } return p; })() },
      { inst: 'taiko', pat: (() => { const p = []; for (let b = 0; b < 32; b++) { if (b % 8 === 0) p.push({ b, v: 0.5 }); if (b % 16 === 12) p.push({ b, v: 0.3 }); } return p; })() },
      { inst: 'pluck', pat: melody('A4 C5 . E5 F5 . E5 . C5 . A4 . C5 . . . F4 A4 . C5 . E5 . . C5 . A4 . . C5 . .', 0.9, 0.9), v: 0.85 },
      { inst: 'mallet', pat: melody('E5 . . F5 . . . C5 . . . A4 . . . . .', 0.6, 0.7) },
    ],
  },
  streets: {
    bpm: 132, bars: 8,
    tracks: [
      { inst: 'taiko', pat: (() => { const p = []; for (let b = 0; b < 32; b++) { if (b % 4 === 0) p.push({ b, v: 0.85 }); if (b % 8 === 6) p.push({ b, v: 0.5 }); if (b % 16 === 14) p.push({ b, v: 0.7 }); } return p; })() },
      { inst: 'hat', pat: (() => { const p = []; for (let b = 0; b < 32; b++) { if (b % 2 === 1) p.push({ b, v: 0.22 }); } return p; })() },
      { inst: 'strings', pat: melody('A2+E3+A3 . . . F2+A2+F3 . . . E2+G2+B2 . . . D2+A2+D3', 1.0, 2), v: 1, d: 1 },
      { inst: 'pluck', pat: melody('A4 . C5 E5 . F5 E5 C5 A4 . C5 . E5 F5 E5 . F5 . E5 C5 . A4 C5 A4 . E4 . A4 . . . .', 1.0, 0.8), v: 1, d: 0.8 },
      { inst: 'mallet', pat: melody('A5 C6 . A5 F5 . E5 . C5 . E5 . A4 . C5 . A5 C6 . A5 F5 . E5 . C5 . E5 . D5 . C5 .', 0.8, 0.6) },
      { inst: 'pad', pat: melody('A3+C4+E4 . . . C4+F4+A4 . . . C3+E3+G3 . . . D3+F3+A3 .', 0.6, 2), v: 0.8, d: 1 },
    ],
  },
  boss: {
    bpm: 152, bars: 8,
    tracks: [
      { inst: 'taiko', pat: (() => { const p = []; for (let b = 0; b < 32; b++) { if (b % 2 === 0) p.push({ b, v: b % 4 === 0 ? 1.0 : 0.45 }); } return p; })() },
      { inst: 'hat', pat: (() => { const p = []; for (let b = 0; b < 32; b++) p.push({ b, v: 0.3 }); return p; })() },
      { inst: 'strings', pat: melody('A2+E3 . . . A2+E3 . . Bb2+F3 . . . Bb2+F3 . . A2+E3 . . . A2+E3 . . G2+D3 . . . G2+D3 . .', 1.0, 1.5), v: 1.1, d: 1 },
      { inst: 'pluck', pat: melody('A4 A4 C5 . E5 D5 C5 A4 G4 G4 A4 C5 . A4 A4 . A4 A4 C5 . F5 E5 C5 A4 G4 G4 A4 C5 A4 G4 E4 A4', 1.1, 0.6), v: 1, d: 0.6 },
      { inst: 'mallet', pat: melody('A5 . A5 E5 . F5 E5 C5 A5 . A5 E5 . F5 E5 D5 C5', 0.9, 0.5) },
      { inst: 'pad', pat: melody('A2+C3+E3 . . Bb2+D3+F3 . . A2+C3+E3 . . G2+B2+D3 . .', 0.7, 2), v: 0.9, d: 1 },
    ],
  },
};

export const Audio = new AudioEngine();
