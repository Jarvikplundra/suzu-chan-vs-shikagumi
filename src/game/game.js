// Game orchestrator: scenes, camera, HUD, dialogue UI, particles
import { Renderer } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { buildAtlas } from '../art/atlas.js';
import { buildOfficeBG, buildStreetBG, buildSky, buildNaraScene, platformTex } from '../art/backgrounds.js';
import { Player, Mouse, Enemy, makeProjectile, moveCollide, aabbOverlap, GRAV } from './entities.js';
import { SCRIPTS, LEVELS } from './data.js';
import { rr, ell, txt, poly } from '../art/gfx.js';

const VW = 960, VH = 540;

export class Game {
  constructor(glCanvas, uiCanvas) {
    this.renderer = new Renderer(glCanvas);
    this.ui = uiCanvas; this.ug = uiCanvas.getContext('2d');
    this.input = new Input();
    this.scene = 'boot';
    this.frame = 0;
    this.time = 0;
    this.fade = 1; // 0 = clear
    this.cam = { cx: VW / 2, cy: VH / 2, vw: VW, vh: VH, shake: 0 };
    this.particles = [];
    this.bindUI();
  }

  async preloadAssets() {
    const load = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = src; });
    this.atlasImg = buildAtlas();
    this.atlas = this.renderer.texture(this.atlasImg.canvas);
    this.portraits = {
      suzu: await load('assets/portrait_suzu.png'),
      kapi: await load('assets/portrait_kapi.png'),
    };
    this.suzTex = this.renderer.texture(this.portraits.suzu);
    this.kapiTex = this.renderer.texture(this.portraits.kapi);
    this.skyTex = { sunset: this.renderer.texture(buildSky('sunset')), nara: this.renderer.texture(buildSky('nara')) };
    this.officeBG = buildOfficeBG(); this.streetBG = buildStreetBG();
    this.officeTex = this.officeBG.layers.map(c => this.renderer.textureMipped(c));
    this.streetTex = this.streetBG.layers.map(c => this.renderer.textureMipped(c));
    this.naraScene = this.renderer.texture(buildNaraScene());
    this.plateforms = new Map();
  }

  bindUI() {
    this.ui.addEventListener('click', () => {
      if (this.scene === 'title') this.startGame();
      else if (this.dlg) this.dlgAdvance();
    });
    window.addEventListener('keydown', e => { if (this.scene === 'title' && e.code === 'Enter') this.startGame(); });
  }

  // ---------------- scenes flow ----------------
  toTitle() {
    this.scene = 'title';
    this.fade = 1;
    Audio.playSong('title');
  }

  startGame() {
    Audio.sfx('start');
    this.runScript('intro', () => this.startLevel('level1'));
  }

  startLevel(id) {
    const L = this.level = LEVELS[id];
    this.levelId = id;
    this.scene = 'play';
    this.player = new Player();
    this.player.hasMice = id === 'level2';
    this.player.miceCount = id === 'level2' ? 3 : 0;
    this.player.x = L.spawn.x; this.player.y = L.spawn.y;
    if (id === 'level2') { this.mice = [0, 1, 2].map(i => new Mouse(i, this.player)); }
    else this.mice = [];
    this.enemies = L.enemies.map(e => new Enemy(e.kind, e.x, e.y));
    this.boss = new Enemy('boss_' + L.boss.kind, L.boss.x, L.boss.y);
    this.bossActive = false; this.bossDefeated = false;
    this.bossArena = L.boss.arena;
    this.pickups = L.pickups.map(p => ({ ...p, taken: false, t: Math.random() * 6, w: 26, h: 26 }));
    this.triggers = L.triggers.map(t => ({ ...t, fired: false }));
    this.checkpoint = { x: L.spawn.x, y: L.spawn.y };
    this.hitCheckpoint = new Set();
    this.projectiles = [];
    this.particles.length = 0;
    this.yen = this.yen ?? 0;
    this.forms = this.forms ?? 0;
    this.fade = 1;
    Audio.playSong(L.music);
    this.cam.cx = this.player.x;
    this.cam.cy = this.player.y;
  }

  onBossDefeated() {
    this.bossDefeated = true;
    if (this.levelId === 'level1') this.runScript('office_postboss', () => {});
    else this.runScript('street_postboss', () => {});
  }

  runScript(id, done) {
    const lines = SCRIPTS[id];
    if (!lines) { done && done(); return; }
    this.dlg = { lines, i: 0, chars: 0, t: 0, done };
    Audio.sfx('phone');
  }

  dlgSkip() { const d = this.dlg; if (!d) return; d.chars = 9999; }
  dlgAdvance() {
    const d = this.dlg; if (!d) return;
    const line = d.lines[d.i];
    if (d.chars < line.jp.length) { d.chars = 9999; return; }
    d.i++;
    d.chars = 0;
    if (d.i >= d.lines.length) { const cb = d.done; this.dlg = null; cb && cb(); }
    else Audio.sfx('blip', { pitch: 700 });
  }

  playerFall() {
    if (this._fallCd) return;
    this._fallCd = 1;
    this.damagePlayer(1, true);
    this.player.x = this.checkpoint.x; this.player.y = this.checkpoint.y - 40;
    this.player.vx = 0; this.player.vy = 0;
  }

  damagePlayer(dmg, ignoreI = false) {
    const p = this.player;
    if (!ignoreI && p.iFrames > 0) return;
    p.hp -= dmg;
    p.iFrames = 1.0;
    p.vy = -350; p.vx = -p.face * 260;
    this.cam.shake = 8;
    Audio.sfx('hurt');
    if (p.hp <= 0) { p.hp = 0; this.gameOver(); }
  }

  gameOver() {
    this.scene = 'gameover';
    this.goT = 0;
    this.dlg = null;
    Audio.playSong('title');
  }

  // ---------------- game bridge methods (called by entities) ----------------
  sfx(name, opt) { Audio.sfx(name, opt); }

  spawnFx(kind, x, y, scale = 1) {
    this.particles.push({ kind, x, y, scale, t: 0, life: kind === 'dust' ? 0.5 : 0.4, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 80 });
  }

  sfxDeerGrunt() { if (Math.random() < 0.02) Audio.sfx('deer'); }

  miceScout() {
    if (!this.mice.length) return;
    const p = this.player, dir = p.face;
    const targetX = p.x + dir * 420;
    for (const m of this.mice) m.mode = 'scout', m.sx = targetX, m.sy = p.y + p.h - 12, m.scT = 5.5;
    Audio.sfx('squeak');
    this.toast = { t: 3.2, jp: 'ねずみ偵察、開始！', en: 'Mouse squad — scouting ahead!' };
  }

  miceSwarm() {
    if (!this.mice.length) return;
    const p = this.player;
    let best = null, bd = 1e9;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 380 && d < bd) { bd = d; best = e; }
    }
    if (this.bossActive && !this.boss.dead) {
      const d = Math.hypot(this.boss.x - p.x, this.boss.y - p.y);
      if (d < 380 && d < bd) best = this.boss;
    }
    if (!best) { Audio.sfx('squeak'); this.toast = { t: 2, jp: 'ねずみ：ターゲットなし！', en: 'Mice: "No targets in range!"' }; return; }
    for (const m of this.mice) { m.mode = 'swarm'; m.target = best; m.sTimer = 4.5; }
    best.fearT = 2.2;
    Audio.sfx('mouseat');
    this.toast = { t: 3, jp: 'ねずみ突撃！！', en: 'MICE SWARM ATTACK!!' };
  }

  onEnemyDead(e) {
    this.yen += Math.round(e.stats.score / 3);
    if (e.boss) {
      this.cam.shake = 14;
      Audio.sfx('roar');
      setTimeout(() => this.onBossDefeated(), 1200);
    } else Audio.sfx('coin');
  }

  spawnProjectile(boss) {
    const dx = this.player.x - boss.x;
    const dir = Math.sign(dx) || 1;
    this.projectiles.push(makeProjectile(boss.x + boss.w / 2, boss.y + 30, dir * 460, -260, boss));
    Audio.sfx('swoosh');
  }

  spawnReinforcement(boss) {
    const e = new Enemy('grunt', boss.x - boss.face * 120, boss.y);
    e.state = 'chase';
    this.enemies.push(e);
    this.toast = { t: 2.5, jp: '増援！！', en: 'REINFORCEMENTS!!' };
  }

  // ---------------- update ----------------
  update(dt) {
    this.time += dt;
    this.frame++;
    const input = this.input;
    input.poll();
    if (input.hitKey('KeyM')) Audio.setVolumes(Audio.musicVol > 0 ? 0 : 0.5, Audio.sfxVol);

    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 1.6);
    this._fallCd = Math.max(0, (this._fallCd || 0) - dt);
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }

    // dialogue
    if (this.dlg) {
      const d = this.dlg;
      d.t += dt;
      const line = d.lines[d.i];
      if (d.chars < line.jp.length) {
        d.chars = Math.min(line.jp.length, d.chars + dt * (this.dlgFast ? 200 : 34));
        if (d.t % 0.06 < dt) Audio.sfx('blip', { pitch: line.portrait === 'kapi' ? 240 : line.portrait === 'oji' ? 320 : 640 + Math.random() * 140 });
      }
      if (input.action('confirmHit') && d.t > 0.35) { this.dlgAdvance(); d.t = 0; }
      if (input.action('skipHit')) this.dlg = null;
    }

    if (this.scene === 'title') {
      if (input.action('confirmHit') && this.time > 1) this.startGame();
    } else if (this.scene === 'gameover') {
      this.goT += dt;
      if (this.goT > 1.5 && input.action('confirmHit')) {
        this.scene = 'play';
        this.player.hp = this.player.maxHp;
        this.player.x = this.checkpoint.x; this.player.y = this.checkpoint.y - 40;
        this.player.vx = 0; this.player.vy = 0;
        Audio.playSong(this.level.music);
      }
    } else if (this.scene === 'play') {
      this.updatePlay(dt);
    } else if (this.scene === 'ending') {
      this.endT += dt;
      if (this.endT > 4 && input.action('confirmHit')) this.toTitle();
    }

    // freeze gameplay during dialogue but allow particles
    this.updateParticles(dt);
    input.endFrame();
  }

  updatePlay(dt) {
    const p = this.player, L = this.level;
    p.update(dt, this.input, L, this);

    for (const m of this.mice) m.update(dt, L, this);

    const inBossArena = p.x + p.w / 2 > this.bossArena[0] && p.x < this.bossArena[1];
    if (this.boss && !this.boss.dead) {
      if (!this.bossActive && inBossArena) {
        this.bossActive = true;
        Audio.playSong('boss');
        this.toast = { t: 2.6, jp: 'BOSS 戦！！', en: 'BOSS BATTLE!!' };
        Audio.sfx('roar');
      }
      if (this.bossActive) this.boss.update(dt, p, L, this);
    }

    for (const e of this.enemies) {
      // only update near ones
      if (Math.abs(e.x - (this.cam.cx)) < 900) e.update(dt, p, L, this);
    }

    // projectiles
    for (const pr of this.projectiles) {
      pr.vy += GRAV * 0.6 * dt;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      pr.life -= dt;
      // portal? no — hit player
      if (aabbOverlap(pr, p.hitbox())) { this.damagePlayer(1); pr.life = 0; }
      if (pr.y > 640) pr.life = 0;
    }
    this.projectiles = this.projectiles.filter(pr => pr.life > 0);

    // player attack vs enemies
    if (p.attackHitbox) {
      const hb = p.attackHitbox;
      const targets = [this.enemies, this.boss && this.bossActive && !this.boss.dead ? [this.boss] : []].flat();
      for (const e of targets) {
        if (e.dead || e._hitByAtk === hb.id) continue;
        if (aabbOverlap(hb, e)) {
          e._hitByAtk = hb.id;
          e.damage(hb.damage, this, 'claw');
          this.cam.shake = 5;
        }
      }
    }
    // enemy contact & attacks
    const targets = [this.enemies, this.boss && this.bossActive && !this.boss.dead ? [this.boss] : []].flat();
    for (const e of targets) {
      if (e.dead) continue;
      const boxes = [];
      if (e.lungeBox) boxes.push(e.lungeBox);
      if (e.chargeBox) boxes.push(e.chargeBox);
      if (e.sweepBox) boxes.push(e.sweepBox);
      for (const b of boxes) if (aabbOverlap(b, p.hitbox())) { this.damagePlayer(b.damage); }
      if (!boxes.length && aabbOverlap(e, p.hitbox())) this.damagePlayer(e.stats.damage);
    }

    // pickups
    for (const pk of this.pickups) {
      pk.t += dt * 3;
      if (pk.taken) continue;
      if (aabbOverlap({ x: pk.x - 13, y: pk.y - 13, w: 26, h: 26 }, p.hitbox())) {
        pk.taken = true;
        if (pk.kind === 'coin') { this.yen += 100 * (pk.n || 1); Audio.sfx('coin'); }
        else if (pk.kind === 'senbei') { p.hp = Math.min(p.maxHp, p.hp + 1); Audio.sfx('senbei'); this.spawnFx('spark', pk.x, pk.y); }
        else if (pk.kind === 'onigiri') { p.hp = p.maxHp; Audio.sfx('heal'); this.spawnFx('star', pk.x, pk.y); }
        else if (pk.kind === 'form') { this.forms++; Audio.sfx('select'); this.toast = { t: 2, jp: `辞表スタンプ ${this.forms}/3`, en: `Resignation stamped ${this.forms}/3` }; }
      }
    }

    // triggers
    for (const tr of this.triggers) {
      if (!tr.fired && p.x > tr.x) { tr.fired = true; this.runScript(tr.script, () => {}); }
    }

    // checkpoints
    for (let i = 0; i < L.checkpoints.length; i++) {
      const cp = L.checkpoints[i];
      if (!this.hitCheckpoint.has(i) && Math.abs(p.x - cp.x) < 60) {
        this.hitCheckpoint.add(i);
        this.checkpoint = { x: cp.x, y: cp.y };
        this.toast = { t: 2, jp: 'チェックポイント！', en: 'Checkpoint saved!' };
        Audio.sfx('heal');
      }
    }

    // boss defeat → enable exit
    if (this.boss.dead && !this.bossDefeated) { this.bossDefeated = true; }

    // exit
    const ex = L.exit;
    if (this.bossDefeated && aabbOverlap({ x: ex.x, y: ex.y, w: ex.w, h: ex.h }, p.hitbox())) {
      this.fade = 1;
      if (ex.cutscene) this.startEnding(ex.cutscene);
      else this.nextLevel();
    }

    // camera
    const targetX = p.x + p.w / 2 + p.face * 60, targetY = p.y + p.h / 2;
    this.cam.cx += (targetX - this.cam.cx) * Math.min(1, dt * 6);
    this.cam.cy += (targetY - this.cam.cy) * Math.min(1, dt * 4);
    this.cam.cx = Math.max(VW / 2, Math.min(L.width - VW / 2, this.cam.cx));
    this.cam.cy = Math.max(VH / 2 - 40, Math.min(L.height - VH / 2 + 60, this.cam.cy));
    this.cam.shake = Math.max(0, this.cam.shake - dt * 30);
  }

  nextLevel() {
    if (this.levelId !== 'level1') { this.startEnding(); return; }
    this.fade = 1;
    setTimeout(() => this.startLevel('level2'), 350);
  }

  startEnding() {
    this.scene = 'ending';
    this.endT = 0;
    this.fade = 1;
    this.dlg = null;
    this.runScript('outro', () => {});
    Audio.playSong('title');
  }

  // ---------------- particles ----------------
  spawnPetals() {
    if (Math.random() < 0.35) {
      this.particles.push({ kind: 'petal', x: this.cam.cx + (Math.random() - 0.5) * VW, y: this.cam.cy - VH / 2 - 20, vx: -40 - Math.random() * 40, vy: 30 + Math.random() * 40, t: 0, life: 8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 4, scale: 0.7 + Math.random() });
    }
  }

  updateParticles(dt) {
    for (const pt of this.particles) {
      pt.t += dt;
      pt.x += (pt.vx || 0) * dt; pt.y += (pt.vy || 0) * dt;
      if (pt.rot !== undefined) pt.rot += pt.vr * dt;
      if (pt.kind === 'petal') pt.vx = Math.sin(pt.t * 2) * 50 - 30;
      else pt.vy += 300 * dt;
    }
    this.particles = this.particles.filter(pt => pt.t < pt.life);
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  // ---------------- render ----------------
  render() {
    const r = this.renderer;
    const { w: pw, h: ph } = r.resizeCssToWindow();
    // letterboxed virtual view
    const scale = Math.min(pw / VW, ph / VH) * 1;
    const vw = VW, vh = VH;
    const shakeX = (Math.random() - 0.5) * this.cam.shake, shakeY = (Math.random() - 0.5) * this.cam.shake;

    if (this.scene === 'boot') { this.renderUIBoot(); return; }
    if (this.scene === 'title') this.renderTitle(r, shakeX, shakeY);
    else if (this.scene === 'ending') this.renderEnding(r, shakeX, shakeY);
    else this.renderWorld(r, shakeX, shakeY);
    this.renderUI();
    r.endFrame();

    // fade overlay on UI canvas
    if (this.fade > 0) {
      this.paintUI(g => {
        g.fillStyle = `rgba(7,7,13,${Math.min(1, this.fade)})`;
        g.fillRect(0, 0, VW, VH);
      });
    }
  }

  renderWorld(r, shakeX, shakeY) {
    const cam = { cx: this.cam.cx + shakeX, cy: this.cam.cy + shakeY, vw: VW, vh: VH };
    r.begin(cam);
    const L = this.level;
    const B = this;
    // sky (screen-space)
    const sky = this.skyTex[L?.sky || 'sunset'];
    r.drawSprite(sky, cam.cx, cam.cy, Math.max(VW / 1024, VH / 620) * 1.05, 0, 1);
    if (this.scene !== 'play') { return; }

    const px = cam.cx, py = cam.cy;
    const par = (tex, f) => {
      const lw = tex.width / 2, lh = 620;
      const offx = (((px * (1 - f)) % lw) + lw) % lw;
      const yBase = L.height - lh / 2 + (py - L.height / 2) * 0.25;
      for (let i = -1; i <= 1; i++) {
        const x = Math.floor((px - VW / 2 - offx) / lw + i + 1) * lw + offx;
        if (x + lw / 2 < px - VW / 2 - lw || x - lw / 2 > px + VW / 2 + lw) continue;
        r.drawSprite(tex, x + lw / 2, yBase, 0.5, 0, 1);
      }
    };

    const bgTex = L.bg === 'office' ? this.officeTex : this.streetTex;
    par(bgTex[0], 0.18);
    par(bgTex[1], 0.4);
    par(bgTex[2], 0.65);

    // platforms
    for (const pl of L.platforms.concat(L.oneways)) {
      const tex = platformTex(this.renderer, pl.type, pl.w, pl.h);
      r.drawSprite(tex, pl.x + pl.w / 2, pl.y + pl.h / 2, 1, 0, 1);
    }
    // props
    for (const pr of L.props) {
      const reg = this.atlasImg.regions[pr.r];
      if (!reg) continue;
      r.atlas(this.atlas, reg, pr.x + (pr.ox || 0) + reg.w / 4, pr.y + (pr.oy || 0) + reg.h / 4, 0.5, 0, [1, 1, 1, 1]);
    }

    // checkpoints markers
    for (let i = 0; i < L.checkpoints.length; i++) {
      const cp = L.checkpoints[i];
      const on = this.hitCheckpoint.has(i);
      r.atlas(this.atlas, this.atlasImg.regions[on ? 'fx.star' : 'pickup.senbei'], cp.x, cp.y - 60, 0.6, Math.sin(this.time * 3) * 0.2, [1, 1, 1, on ? 0.9 : 0.45]);
    }

    // pickups
    const pkReg = {
      coin: i => 'pickup.coin' + (Math.floor(this.time * 8 + i) % 4),
      senbei: () => 'pickup.senbei', onigiri: () => 'pickup.onigiri', form: () => 'pickup.form',
    };
    let pki = 0;
    for (const pk of this.pickups) {
      if (pk.taken) { pki++; continue; }
      const name = pk.kind === 'coin' ? pkReg.coin(pki++) : pkReg[pk.kind]();
      const reg = this.atlasImg.regions[name];
      r.atlas(this.atlas, reg, pk.x, pk.y - Math.sin(this.time * 3 + pk.t) * 5, 1, Math.sin(this.time * 2 + pk.t) * 0.15);
    }

    // projectiles (staplers)
    for (const pr of this.projectiles) {
      r.atlas(this.atlas, this.atlasImg.regions['fx.impact'], pr.x + pr.w / 2, pr.y + pr.h / 2, 0.34, this.time * 12, [1, 0.7, 0.6, 1]);
    }

    // enemies
    for (const e of this.enemies) {
      if (e.dead && e.deadT > 0.8) continue;
      this.drawEnemy(r, e);
    }
    if (this.boss && (!this.boss.dead || this.boss.deadT < 0.8) && this.bossActive) this.drawEnemy(r, this.boss, true);

    // mice
    for (const m of this.mice) {
      const mid = ['aka', 'ao', 'kin'][m.idx];
      const reg = this.atlasImg.regions[m.mode === 'follow' ? `mouse.${mid}.run${Math.floor(this.time * 10 + m.idx) % 4}` : `mouse.${mid}.run${Math.floor(this.time * 16) % 4}`];
      r.atlas(this.atlas, reg, m.x + m.w / 2, m.y + m.h / 2, 0.5, 0, [1, 1, 1, 1], false, m.vx < 0);
    }

    // player
    this.drawPlayer(r);

    // particles
    this.renderParticles(r);
  }

  drawPlayer(r) {
    const p = this.player;
    if (!p) return;
    const flick = p.iFrames > 0 && Math.floor(p.iFrames * 14) % 2 === 0;
    const name = 'suzu.' + (
      p.state === 'atk' + 0 ? 'atk0' : p.state === 'atk1' ? 'atk1' : p.state === 'atk2' ? 'atk2' :
      p.state === 'hurt' ? 'hurt' : p.state === 'dash' ? 'dash' : p.state === 'jump' ? 'jump' :
      p.state === 'fall' ? 'fall' : p.state === 'run' ? 'run' + Math.floor(p.f) : 'idle' + Math.floor(p.f % 4)
    );
    const reg = this.atlasImg.regions[name] || this.atlasImg.regions['suzu.idle0'];
    if (!flick) {
      r.atlas(this.atlas, reg, p.x + p.w / 2, p.y + p.h - reg.h / 4, 0.5, 0, [1, 1, 1, 1], false, p.face < 0);
    }
    // attack arc fx
    if (p.attackHitbox) {
      const fr = 'fx.slash' + (p.attackHitbox.life > 0.14 ? 0 : p.attackHitbox.life > 0.08 ? 1 : 2);
      const regA = this.atlasImg.regions[fr];
      const fx = p.face > 0 ? p.x + p.w + 26 : p.x - 26;
      r.atlas(this.atlas, regA, fx, p.y + 40, 0.8, p.face > 0 ? -0.3 : 3.4, [1, 1, 1, 1], true);
    }
  }

  drawEnemy(r, e, isBoss = false) {
    const name = e.spriteFrame();
    const reg = this.atlasImg.regions[name];
    if (!reg) return;
    const flick = e.iFrames > 0 && Math.floor(e.iFrames * 14) % 2 === 0;
    const alpha = e.dead ? Math.max(0, 1 - e.deadT / 0.8) : 1;
    if (!flick) {
      r.atlas(this.atlas, reg, e.x + e.w / 2, e.y + e.h - reg.h / 4, 0.5, 0, [1, 1, 1, alpha], false, e.face < 0);
    }
    // hp bar for boss
    if (isBoss && !e.dead && this.bossActive) {
      const y = 40, w = 420;
      this.uiBars.push({ x: VW / 2 - w / 2, y, w, h: 14, frac: e.hp / e.maxHp, label: e.kind === 'boss_wanibuchi' ? '社長' : '厳竜' });
    } else if (!e.boss && !e.dead && e.hp < e.maxHp) {
      this.miniBars.push({ x: e.x + e.w / 2, y: e.y - 14, w: 44, frac: e.hp / e.maxHp });
    }
    if (e.dead && e.deadT < 0.5 && Math.random() < 0.4) this.spawnFx('star', e.x + Math.random() * e.w, e.y - 10);
  }

  renderParticles(r) {
    for (const pt of this.particles) {
      const reg = this.atlasImg.regions[pt.kind === 'petal' ? 'fx.petaldrop' : 'fx.' + pt.kind];
      if (!reg) continue;
      const a = pt.kind === 'petal' ? Math.min(1, (pt.life - pt.t) / 2) : Math.max(0, 1 - pt.t / pt.life);
      r.atlas(this.atlas, reg, pt.x, pt.y, (pt.scale || 1) * 0.5, pt.rot || 0, [1, 1, 1, a]);
    }
    // ambient petals in street
    if (this.scene === 'play' && this.level?.bg === 'street' && this.frame % 8 === 0) this.spawnPetals();
  }

  // ---------------- UI (2D canvas overlay) ----------------
  paintUI(fn) {
    const g = this.ug;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.ui.clientWidth, h = this.ui.clientHeight;
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (this.ui.width !== W || this.ui.height !== H) { this.ui.width = W; this.ui.height = H; }
    g.setTransform(H / VH, 0, 0, H / VH, (W - VW * (H / VH)) / 2, 0);
    fn(g, VW, VH);
  }

  uiBars = []; miniBars = [];

  renderUIBoot() {
    this.paintUI((g, vw, vh) => {
      g.fillStyle = '#07070D'; g.fillRect(0, 0, vw, vh);
      txt(g, '読み込み中…', vw / 2, vh / 2, 28, '#FFD9A8');
    });
  }

  renderTitle(r, sx, sy) {
    const cam = { cx: VW / 2 + sx, cy: VH / 2 + sy, vw: VW, vh: VH };
    r.begin(cam);
    const sky = this.skyTex['sunset'];
    r.drawSprite(sky, VW / 2, VH / 2, Math.max(VW / 1024, VH / 620) * 1.05);
    const reg = this.atlasImg.regions['suzu.win0'];
    r.atlas(this.atlas, reg, VW / 2, VH / 2 - 40 + Math.sin(this.time * 2) * 8, 2.2, 0, [1, 1, 1, 1]);
    r.atlas(this.atlas, this.atlasImg.regions['kapi.idle'], VW / 2 - 220, VH / 2 + 40, 0.8, 0, [1, 1, 1, 0.95]);
    r.atlas(this.atlas, this.atlasImg.regions['mouse.aka.run0'], VW / 2 + 150, VH / 2 + 60, 0.8, 0);
    r.atlas(this.atlas, this.atlasImg.regions['mouse.kin.run0'], VW / 2 + 190, VH / 2 + 66, 0.8, 0);
  }

  renderEnding(r, sx, sy) {
    const cam = { cx: VW / 2 + sx, cy: VH / 2 + sy, vw: VW, vh: VH };
    r.begin(cam);
    r.drawSprite(this.skyTex['nara'], VW / 2, VH / 2, Math.max(VW / 1024, VH / 620) * 1.05);
    r.drawSprite(this.naraScene, VW / 2, VH / 2, VW / (this.naraScene.width / 2));
  }

  renderUI() {
    this.uiBars = []; this.miniBars = [];
    this.paintUI((g, vw, vh) => {
      const t = this.time;
      if (this.scene === 'title') {
        g.fillStyle = 'rgba(10,8,20,0.35)'; g.fillRect(0, 0, vw, vh);
        txt(g, 'スズちゃん vs シカグミ', vw / 2, 120, 56, '#FFF2E0', 'center', '900');
        txt(g, '— SUZU-CHAN vs. THE SHIKA-GUMI —', vw / 2, 160, 17, '#FFD9A8');
        txt(g, '第二章まで：奈良は遠い。退職は近い。', vw / 2, 200, 15, 'rgba(255,220,180,0.75)');
        const blinkA = 0.6 + Math.sin(t * 4) * 0.4;
        g.globalAlpha = blinkA;
        txt(g, 'PRESS START／ENTER／CLICK  — にゃ!', vw / 2, vh - 120, 22, '#FFFFFF', 'center', 'bold');
        g.globalAlpha = 1;
        txt(g, '© 猫娘事変 NEKO-GARU JIHEN — Studio Vibe', vw / 2, vh - 24, 12, 'rgba(255,255,255,0.4)');
        return;
      }
      if (this.scene === 'gameover') {
        g.fillStyle = 'rgba(10,4,10,0.55)'; g.fillRect(0, 0, vw, vh);
        txt(g, 'やられた…！', vw / 2, 200, 52, '#FF8899', 'center', '900');
        txt(g, 'GA-TEN — you got bonked', vw / 2, 244, 17, 'rgba(255,200,210,0.9)');
        if (this.goT > 1.5) { txt(g, 'ENTER／A でもう一度 (retry)', vw / 2, 320, 20, '#FFF'); }
        return;
      }
      if (this.scene === 'ending') {
        g.fillStyle = 'rgba(8,10,26,0.25)'; g.fillRect(0, 0, vw, vh);
        txt(g, '第三章：奈良 — COMING SOON', vw / 2, 96, 34, '#FFF2E0', 'center', '900');
        txt(g, 'ご視聴ありがとうございました！', vw / 2, 450, 16, 'rgba(255,220,180,0.7)');
        return;
      }

      if (this.scene !== 'play' || !this.player) return;

      // HUD hearts (katsuobushi hearts, drawn)
      for (let i = 0; i < this.player.maxHp; i++) {
        const x = 44 + i * 34, y = 44;
        const on = i < this.player.hp;
        g.save(); g.translate(x, y); g.scale(1.1, 1.1);
        g.globalAlpha = on ? 1 : 0.28;
        g.fillStyle = on ? '#E86A6A' : '#3A3244';
        g.beginPath();
        g.moveTo(0, 9); g.bezierCurveTo(-11, 0, -9, -10, -1, -6);
        g.bezierCurveTo(0, -7, 0, -7, 1, -6);
        g.bezierCurveTo(9, -10, 11, 0, 0, 9);
        g.closePath(); g.fill();
        if (on) { g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.ellipse(-4, -2, 2.2, 1.5, -0.6, 0, 7); g.fill(); }
        g.restore();
      }
      g.globalAlpha = 1;
      // yen & forms
      g.fillStyle = 'rgba(12,10,22,0.55)'; rr(g, 24, 62, 150, 30, 8); g.fill();
      txt(g, `¥ ${this.yen.toLocaleString()}`, 40, 78, 18, '#FFD9A8', 'left', 'bold');
      txt(g, '辞', 158, 78, 16, '#C4544C', 'left', 'bold');
      txt(g, `${this.forms}/3`, 172, 78, 15, '#FFF', 'left');

      // mice indicator
      if (this.player.hasMice) {
        const cd1 = this.player.scoutCd, cd2 = this.player.swarmCd;
        g.fillStyle = 'rgba(12,10,22,0.55)'; rr(g, vw - 190, 28, 166, 62, 10); g.fill();
        txt(g, 'UB／LB 偵察', vw - 176, 48, 14, cd1 > 0 ? 'rgba(255,255,255,0.3)' : '#BFE8C0', 'left', 'bold');
        txt(g, 'IE／RB 突撃', vw - 176, 74, 14, cd2 > 0 ? 'rgba(255,255,255,0.3)' : '#F0C8A8', 'left', 'bold');
        for (let i = 0; i < 3; i++) {
          const reg = this.atlasImg.regions['mouse.' + ['aka', 'ao', 'kin'][i] + '.idle'];
          // draw via atlas on gl is complex here; simple circle marker
          g.fillStyle = ['#D64545', '#3F6FB5', '#C99A1E'][i];
          ell(g, vw - 148 + i * 16, 106, 4, 4, null);
          g.beginPath(); g.arc(vw - 148 + i * 16, 106, 4, 0, Math.PI * 2); g.fillStyle = ['#D64545', '#3F6FB5', '#C99A1E'][i]; g.fill();
        }
      }

      // level name banner (first 4s)
      if (t < 4.5) {
        const a = t < 3.5 ? 1 : 1 - (t - 3.5);
        g.globalAlpha = a * 0.9;
        g.fillStyle = 'rgba(10,8,22,0.6)'; rr(g, vw / 2 - 260, 70, 520, 74, 12); g.fill();
        g.fillStyle = '#E8B22A'; g.fillRect(vw / 2 - 260, 70, 8, 74);
        txt(g, this.level.nameJP, vw / 2, 96, 30, '#FFF2E0', 'center', '900');
        txt(g, this.level.nameEN, vw / 2, 126, 14, 'rgba(255,220,180,0.85)');
        g.globalAlpha = 1;
      }

      // toast
      if (this.toast) {
        const a = Math.min(1, this.toast.t);
        g.globalAlpha = a;
        g.fillStyle = 'rgba(12,10,25,0.75)'; rr(g, vw / 2 - 220, 150, 440, 46, 10); g.fill();
        txt(g, this.toast.jp, vw / 2, 166, 18, '#FFF2E0');
        txt(g, this.toast.en, vw / 2, 188, 12, 'rgba(255,220,180,0.8)');
        g.globalAlpha = 1;
      }

      // boss bar
      for (const b of this.uiBars) {
        g.fillStyle = 'rgba(10,8,18,0.7)'; rr(g, b.x - 4, b.y - 6, b.w + 8, b.h + 12, 6); g.fill();
        g.fillStyle = '#5A1E28'; rr(g, b.x, b.y, b.w, b.h, 4); g.fill();
        g.fillStyle = '#E8B22A'; rr(g, b.x, b.y, b.w * Math.max(0, b.frac), b.h, 4); g.fill();
        txt(g, b.label, b.x + b.w / 2, b.y - 16, 18, '#FFF2E0', 'center', 'bold');
      }
      for (const mb of this.miniBars) {
        g.fillStyle = 'rgba(10,8,18,0.6)'; rr(g, mb.x - mb.w / 2 - 1, mb.y - 3, mb.w + 2, 7, 3); g.fill();
        g.fillStyle = '#C9452E'; rr(g, mb.x - mb.w / 2, mb.y - 2, mb.w * Math.max(0, mb.frac), 5, 2); g.fill();
      }

      // dialogue box
      if (this.dlg) this.renderDialogue(g, vw, vh);
    });
  }

  renderDialogue(g, vw, vh) {
    const d = this.dlg;
    const line = d.lines[d.i];
    if (!line) return;
    const bw = 720, bx = vw / 2 - bw / 2, by = vh - 168, bh = 132;
    // portrait
    const ptex = line.portrait === 'suzu' ? this.suzTex : line.portrait === 'kapi' ? this.kapiTex : null;
    const px = bx - 10, py = by - 30;
    g.save();
    // frame
    g.fillStyle = 'rgba(14,12,24,0.92)'; rr(g, bx, by, bw, bh, 16); g.fill();
    g.strokeStyle = 'rgba(255,210,150,0.55)'; g.lineWidth = 2; rr(g, bx, by, bw, bh, 16); g.stroke();
    if (ptex) {
      g.save();
      rr(g, px + 4, by + 6, 128, bh - 12, 12); g.clip();
      const im = ptex === this.suzTex ? this.portraits.suzu : this.portraits.kapi;
      const s = Math.max(140 / im.width, (bh - 12) / im.height);
      const w2 = im.width * s, h2 = im.height * s;
      g.drawImage(im, px + 4 + (140 - w2) / 2, by + 6 + (bh - 12 - h2) / 2 + Math.sin(this.time * 2) * 2, w2, h2);
      g.restore();
    } else {
      // sprite-based portrait
      g.save();
      rr(g, px + 4, by + 6, 128, bh - 12, 12); g.clip();
      g.fillStyle = 'rgba(30,24,44,0.9)'; g.fillRect(px + 4, by + 6, 128, bh - 12);
      const map = { oji: 'deer.walk0', wanibuchi: 'ceo.rage', ganryu: 'boss.lunge' };
      const reg = this.atlasImg.regions[map[line.portrait] || 'deer.walk0'];
      if (reg) {
        const s = Math.min(100 / reg.w * 2, (bh - 24) / reg.h * 2);
        // draw sprite via temp canvas
        const ac = document.createElement('canvas'); ac.width = reg.w; ac.height = reg.h;
        ac.getContext('2d').drawImage(this.atlasImg.canvas, reg.x, reg.y, reg.w, reg.h, 0, 0, reg.w, reg.h);
        const s2 = Math.min(120 / (reg.w / 2), (bh - 24) / (reg.h / 2));
        g.imageSmoothingEnabled = true;
        g.drawImage(ac, px + 68 - reg.w / 2 * s2 / 2, by + bh / 2 - reg.h / 2 * s2 / 2 + Math.sin(this.time * 2) * 2, reg.w / 2 * s2, reg.h / 2 * s2);
      }
      g.restore();
    }
    // name
    const [njp, nR] = line.name.includes('｜') ? line.name.split('｜') : [line.name, line.nameR];
    g.fillStyle = '#E8B22A'; rr(g, bx + 146, by - 12, Math.max(90, njp.length * 20), 30, 8); g.fill();
    txt(g, njp, bx + 146 + Math.max(45, njp.length * 10), by + 4, 16, '#1A1420', 'center', 'bold');
    // jp text (typewriter)
    const shown = line.jp.slice(0, Math.floor(d.chars));
    g.font = '26px "Hiragino Sans","Yu Gothic","Noto Sans JP",sans-serif';
    g.fillStyle = '#FFF6E8';
    wrapText(g, shown, bx + 152, by + 46, bw - 180, 36, 4);
    // en translation
    g.font = '13px Georgia, serif';
    g.fillStyle = 'rgba(255,225,190,0.82)';
    wrapText(g, line.en, bx + 152, by + 88, bw - 180, 15, 3);
    // continue marker
    if (d.chars >= line.jp.length) {
      g.fillStyle = '#FFD9A8'; g.globalAlpha = 0.6 + Math.sin(this.time * 6) * 0.4;
      poly(g, [[bx + bw - 26, by + bh - 18], [bx + bw - 12, by + bh - 18], [bx + bw - 19, by + bh - 8]], '#FFD9A8');
      g.globalAlpha = 1;
    }
    g.restore();
  }
}

function wrapText(g, text, x, y, maxW, lh, maxLines) {
  const words = text.split('');
  let line = '', yy = y, lines = 0;
  for (const ch of words) {
    const test = line + ch;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, yy);
      line = ch; yy += lh; lines++;
      if (lines >= maxLines && lines * lh) return;
    } else line = test;
  }
  if (line) g.fillText(line, x, yy);
}
