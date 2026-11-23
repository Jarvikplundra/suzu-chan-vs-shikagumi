// Entities: player, mice, deer enemies, bosses + shared physics helpers

import { PAL } from '../art/gfx.js';

export const GRAV = 2200, JUMP_V = -830, MAX_FALL = 1200;
export const MOVE = 400, ACC = 2600, FRICTION = 1900;
export const DASH_V = 780, DASH_TIME = 0.16, DASH_CD = 0.7;

export function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// move & collide vs solid list [{x,y,w,h}]; returns touched flags
export function moveCollide(ent, solids, dt, opts = {}) {
  ent.x += ent.vx * dt;
  for (const s of solids) {
    if (aabbOverlap(ent, s)) {
      if (ent.vx > 0) ent.x = s.x - ent.w;
      else if (ent.vx < 0) ent.x = s.x + s.w;
      ent.vx = 0;
    }
  }
  ent.y += ent.vy * dt;
  ent.onGround = false;
  for (const s of solids) {
    if (!(s.oneWay && opts.dropThrough) && aabbOverlap(ent, s)) {
      if (ent.vy > 0) {
        // one-way: only land if above
        if (s.oneWay && ent.y + ent.h - ent.vy * dt > s.y + 4) continue;
        ent.y = s.y - ent.h; ent.vy = 0; ent.onGround = true;
      } else if (ent.vy < 0 && !s.oneWay) {
        ent.y = s.y + s.h; ent.vy = 0;
      }
    }
  }
}

export class Player {
  constructor() {
    this.w = 34; this.h = 78; // collision box (visual ~60x100)
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.face = 1; this.onGround = false;
    this.state = 'idle'; this.f = 0; this.at = 0;
    this.hp = 5; this.maxHp = 5;
    this.iFrames = 0; this.coyote = 0; this.jumpBuf = 0;
    this.dashT = 0; this.dashCd = 0;
    this.combo = 0; this.comboT = 0;
    this.attackHitbox = null;
    this.dead = false;
    this.scoutCd = 0; this.swarmCd = 0;
    this.miceCount = 0;
    this.hasMice = false;
  }
  hitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  update(dt, input, level, game) {
    const t = this;
    t.iFrames = Math.max(0, t.iFrames - dt);
    t.dashCd = Math.max(0, t.dashCd - dt);
    t.scoutCd = Math.max(0, t.scoutCd - dt);
    t.swarmCd = Math.max(0, t.swarmCd - dt);
    t.comboT = Math.max(0, t.comboT - dt);
    if (t.comboT === 0) t.combo = 0;

    if (t.dead) { t.vy += GRAV * dt; return; }

    const solids = level.solids();
    const left = input.action('left'), right = input.action('right');

    // dash
    if (input.action('dashHit') && t.dashT <= 0 && t.dashCd <= 0) {
      t.dashT = DASH_TIME; t.dashCd = DASH_CD;
      t.vx = t.face * DASH_V; t.vy = Math.min(t.vy, 0) * 0.3;
      game.sfx('dash'); game.spawnFx('dust', t.x + t.w / 2, t.y + t.h - 6, 1);
    }
    if (t.dashT > 0) {
      t.dashT -= dt;
      t.vy = 0;
    } else {
      const target = (right ? MOVE : 0) - (left ? MOVE : 0);
      if (target !== 0) {
        t.face = Math.sign(target);
        t.vx += Math.sign(target) * ACC * dt;
      } else {
        const fr = FRICTION * (t.onGround ? 1 : 0.25) * dt;
        if (Math.abs(t.vx) <= fr) t.vx = 0; else t.vx -= Math.sign(t.vx) * fr;
      }
      t.vx = Math.max(-MOVE, Math.min(MOVE, t.vx));
      t.vy += GRAV * dt;
      t.vy = Math.min(t.vy, MAX_FALL);
    }

    // jump: coyote + buffer + variable height, double jump
    if (t.onGround) t.coyote = 0.1; else t.coyote -= dt;
    if (input.action('jumpHit')) t.jumpBuf = 0.14; else t.jumpBuf -= dt;
    if (t.jumpBuf > 0 && t.coyote > 0) {
      t.vy = JUMP_V; t.jumpBuf = 0; t.coyote = 0; t.jumps = 1;
      game.sfx('jump'); game.spawnFx('dust', t.x + t.w / 2, t.y + t.h, 1);
    } else if (t.jumpBuf > 0 && (t.jumps ?? 1) < 2 && t.dashT <= 0) {
      t.vy = JUMP_V * 0.92; t.jumps = (t.jumps ?? 1) + 1; t.jumpBuf = 0;
      game.sfx('jump2'); game.spawnFx('spark', t.x + t.w / 2, t.y + t.h - 4);
    }
    if (!input.action('jump') && t.vy < -300) t.vy = -300;

    // attack
    if (input.action('attackHit') && t.at <= 0) {
      t.at = 0.32; t.combo = (t.combo + 1) % 3; t.comboT = 0.7;
      t.attackId = (t.attackId || 0) + 1;
      game.sfx('swoosh');
      const reach = 78;
      t.attackHitbox = { x: t.face > 0 ? t.x + t.w - 6 : t.x - reach + 6, y: t.y + 6, w: reach, h: 60, damage: 1, life: 0.18, id: t.attackId };
    }
    if (t.attackHitbox) {
      t.attackHitbox.life -= dt;
      if (t.attackHitbox.life <= 0) t.attackHitbox = null;
    }

    // mice commands
    if (t.hasMice && input.action('scoutHit') && t.scoutCd <= 0) {
      t.scoutCd = 9; game.miceScout();
    }
    if (t.hasMice && input.action('swarmHit') && t.swarmCd <= 0) {
      t.swarmCd = 11; game.miceSwarm();
    }

    moveCollide(t, solids, dt);
    t.x = Math.max(0, Math.min(level.width - t.w, t.x));
    // pit
    if (t.y > level.height + 240) { game.playerFall(); }

    // anim state
    const moving = Math.abs(t.vx) > 40 && t.onGround;
    let st = 'idle';
    if (t.dashT > 0) st = 'dash';
    else if (!t.onGround) st = t.vy < 0 ? 'jump' : 'fall';
    else if (t.at > 0) st = 'atk' + t.combo;
    else if (moving) st = 'run';
    if (t.iFrames > 0.85) st = 'hurt';
    t.state = st;
    const animT = st === 'run' ? 12 : st === 'idle' ? 4 : 0;
    if (animT > 0) t.f = (t.f + dt * animT) % (st === 'run' ? 6 : 4);
    t.at = Math.max(0, t.at - dt);
  }
}

export class Mouse {
  constructor(idx, owner) {
    this.idx = idx;
    this.owner = owner;
    this.x = owner.x; this.y = owner.y + 10;
    this.vx = 0; this.vy = 0;
    this.mode = 'follow'; // follow | scout | swarm | return
    this.w = 16; this.h = 12; this.onGround = false;
    this.sx = 0; this.sy = 0; // scout target
    this.phase = Math.random() * 6;
    this.msg = null; this.msgT = 0;
  }
  update(dt, level, game) {
    const t = this, o = this.owner;
    const speed = 340;
    const pointAt = (px, py, arrive = 12) => {
      const dx = px - (t.x + t.w / 2), dy = py - (t.y + t.h / 2);
      const d = Math.hypot(dx, dy);
      if (d > arrive) { t.vx = dx / d * speed; t.vy = dy / d * speed * 1.4; }
      else { t.vx *= 0.7; t.vy *= 0.7; return true; }
      return false;
    };
    if (t.mode === 'scout') {
      const arrived = pointAt(t.sx, t.sy);
      t.x += t.vx * dt; t.y += t.vy * dt;
      if (arrived || t.scT <= 0) { t.mode = 'follow'; }
      t.scT = (t.scT ?? 6) - dt;
    } else if (t.mode === 'swarm') {
      const target = t.target;
      if (!target || target.hp <= 0) { t.mode = 'follow'; }
      else {
        t.sTimer -= dt;
        pointAt(target.x + target.w / 2, target.y + target.h / 2, 14);
        t.x += t.vx * dt; t.y += t.vy * dt;
        if (t.biteT === undefined || t.biteT <= 0) {
          t.biteT = 0.5;
          target.damage && target.damage(1, game, 'mouse');
          game.sfx('mouseat');
          game.spawnFx('spark', target.x + target.w / 2, target.y + target.h / 2);
        }
        t.biteT -= dt;
        if (t.sTimer <= 0) t.mode = 'follow';
      }
    } else { // follow — orbit behind player
      const idx = t.idx;
      const ox = o.x + o.w / 2 - o.face * (26 + idx * 20) - t.w / 2;
      const oy = o.y + o.h - t.h + 6;
      pointAt(ox + Math.sin(t.phase + performance.now() / 500) * 6, oy, 6);
      t.x += t.vx * dt; t.y += t.vy * dt;
      // simple gravity settle
      if (Math.abs(t.vy) < 30) t.y += Math.sin(t.phase + performance.now() / 300) * 0.2;
    }
    t.msgT = Math.max(0, (t.msgT || 0) - dt);
    t.phase += dt * 8;
  }
}

const KIND_STATS = {
  grunt: { hp: 3, speed: 120, sense: 360, damage: 1, sprite: 'deer', score: 150 },
  bruiser: { hp: 6, speed: 150, sense: 420, damage: 1, sprite: 'deerb', score: 300 },
  boss_wanibuchi: { hp: 14, speed: 190, sense: 2000, damage: 1, sprite: 'ceo', score: 2000 },
  boss_ganryu: { hp: 26, speed: 230, sense: 2000, damage: 1, sprite: 'boss', score: 5000 },
};

export class Enemy {
  constructor(kind, x, y) {
    const boss = kind.startsWith('boss_');
    const stats = KIND_STATS[kind];
    this.kind = kind; this.stats = stats; this.boss = boss;
    this.w = boss ? 70 : 46; this.h = boss ? 128 : 100;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.hp = stats.hp; this.maxHp = stats.hp;
    this.face = -1; this.state = 'patrol'; this.f = 0; this.at = 0;
    this.homeX = x; this.patrol = 200;
    this.iFrames = 0; this.atkCd = 0; this.stun = 0;
    this.dead = false; this.deadT = 0;
    this.stateT = 0;
    if (boss) { this.ai = 'idle'; this.aiT = 1.2; this.phase = 0; }
    this.fearT = 0;
  }

  damage(dmg, game, source) {
    if (this.dead || this.iFrames > 0) return;
    this.hp -= dmg;
    this.iFrames = 0.18;
    game.sfx(source === 'mouse' ? 'mouseat' : 'hit');
    game.spawnFx('spark', this.x + this.w / 2, this.y + this.h / 3);
    if (source !== 'mouse') { this.stun = Math.max(this.stun, this.boss ? 0.05 : 0.35); }
    if (this.hp <= 0) {
      this.dead = true; this.deadT = 0;
      game.onEnemyDead(this);
      game.spawnFx('impact', this.x + this.w / 2, this.y + this.h / 2, 1.4);
      game.sfx('heavyhit');
    }
  }

  update(dt, player, level, game) {
    const t = this;
    if (t.dead) { t.deadT += dt; return; }
    t.iFrames = Math.max(0, t.iFrames - dt);
    t.atkCd = Math.max(0, t.atkCd - dt);
    t.fearT = Math.max(0, t.fearT - dt);
    t.stun = Math.max(0, t.stun - dt);
    const st = KIND_STATS[t.kind];
    const px = player.x + player.w / 2, py = player.y + player.h;
    const tx = t.x + t.w / 2, ty = t.y + t.h;
    const dx = px - tx, dy = py - ty, dist = Math.hypot(dx, dy);
    const solids = level.solids();

    if (t.stun > 0 || t.fearT > 0) {
      // staggered / scared
      t.state = 'stun';
      t.vx = -Math.sign(dx) * 40;
      t.vy += GRAV * dt;
      moveCollide(t, solids, dt);
      return;
    }

    if (t.boss) { this.updateBoss(dt, player, level, game, dx, dy, dist, solids); return; }

    // grunt AI
    if (t.state === 'patrol') {
      t.vx = Math.sign(Math.sin(t.x * 0.01)) * 0;
      const dir = t.face;
      t.vx = dir * st.speed * 0.6; t.vy += GRAV * dt;
      if (t.x < t.homeX - t.patrol) t.face = 1;
      if (t.x > t.homeX + t.patrol) t.face = -1;
      if (!t.onGround) t.face = t.prevFace ?? t.face;
      t.prevFace = t.face;
      t.vx = t.face * st.speed * 0.6; t.vy = t.vy;
      if (dist < st.sense && Math.abs(dy) < 120) { t.state = 'alert'; t.stateT = 0.5; }
    } else if (t.state === 'alert') {
      t.stateT -= dt;
      t.vx *= 0.8; t.vy += GRAV * dt;
      t.face = Math.sign(dx) || t.face;
      if (t.stateT <= 0) t.state = 'chase';
      game.sfxDeerGrunt && game.sfxDeerGrunt();
    } else if (t.state === 'chase') {
      t.face = Math.sign(dx) || t.face;
      t.vx = t.face * st.speed; t.vy += GRAV * dt;
      if (dist > st.sense * 1.6) t.state = 'patrol';
      if (dist < 90 && Math.abs(dy) < 80 && t.atkCd <= 0) { t.state = 'windup'; t.stateT = 0.38; }
    } else if (t.state === 'windup') {
      t.stateT -= dt; t.vx *= 0.6; t.vy += GRAV * dt;
      if (t.stateT <= 0) { t.state = 'lunge'; t.stateT = 0.3; t.lungeDir = Math.sign(dx) || 1; game.sfx('swoosh'); }
    } else if (t.state === 'lunge') {
      t.stateT -= dt;
      t.vx = t.lungeDir * st.speed * 3.2; t.vy += GRAV * dt;
      t.lungeBox = { x: t.x + (t.lungeDir > 0 ? t.w - 10 : -50), y: t.y + 20, w: 60, h: 60, damage: st.damage };
      if (t.stateT <= 0) { t.state = 'chase'; t.atkCd = 1.4; t.lungeBox = null; }
    }
    moveCollide(t, solids, dt);
    t.x = Math.max(0, Math.min(level.width - t.w, t.x));
    if (t.state !== 'lunge') t.lungeBox = null;
    t.f = (t.f + dt * 6) % 4;
  }

  updateBoss(dt, player, level, game, dx, dy, dist, solids) {
    const t = this;
    t.aiT -= dt;
    t.face = Math.sign(dx) || t.face;
    if (t.ai === 'idle') {
      t.vx *= 0.85; t.vy += GRAV * dt;
      if (t.aiT <= 0) {
        const patterns = t.kind === 'boss_wanibuchi' ? ['walk', 'throw', 'charge'] : ['walk', 'sweep', 'charge', 'summon'];
        t.ai = patterns[Math.floor(Math.random() * (t.hp < t.maxHp * 0.4 ? patterns.length : patterns.length - 1))];
        t.aiT = t.ai === 'charge' ? 0.8 : t.ai === 'walk' ? 1.6 : 0.5;
        if (t.ai === 'throw') game.spawnProjectile(t);
        if (t.ai === 'summon' && game.enemies.filter(e => !e.dead && !e.boss).length < 3) game.spawnReinforcement(t);
        if (t.ai === 'sweep') game.sfx('swoosh');
        if (t.ai === 'charge') game.sfx('deer');
      }
    } else if (t.ai === 'walk') {
      t.vx = t.face * KIND_STATS[t.kind].speed * 0.8; t.vy += GRAV * dt;
      if (t.aiT <= 0) { t.ai = 'idle'; t.aiT = 0.7 + Math.random() * 0.6; }
    } else if (t.ai === 'charge') {
      if (t.aiT > 0.25) { t.vx *= 0.7; t.vy += GRAV * dt; } // telegraph
      else { t.vx = t.face * KIND_STATS[t.kind].speed * 4.5; t.vy += GRAV * dt; }
      t.chargeBox = { x: t.x + (t.face > 0 ? t.w - 14 : -40), y: t.y + 30, w: 54, h: t.h - 40, damage: 1 };
      if (t.aiT <= -0.9 || Math.abs(t.vx) < 20) { t.ai = 'idle'; t.aiT = 1.0; t.chargeBox = null; game.spawnFx('dust', t.x + t.w / 2, t.y + t.h, 1.4); game.sfx('stamp'); }
    } else if (t.ai === 'throw') {
      t.vx *= 0.8; t.vy += GRAV * dt;
      if (t.aiT <= 0) { t.ai = 'idle'; t.aiT = 0.8; }
    } else if (t.ai === 'sweep') {
      t.vx *= 0.8; t.vy += GRAV * dt;
      t.sweepBox = { x: t.x + (t.face > 0 ? t.w - 8 : -96), y: t.y + 20, w: 104, h: 80, damage: 1 };
      if (t.aiT <= 0) { t.ai = 'idle'; t.aiT = 0.9; t.sweepBox = null; }
    } else if (t.ai === 'summon') {
      t.vx *= 0.8; t.vy += GRAV * dt;
      if (t.aiT <= 0) { t.ai = 'idle'; t.aiT = 1.1; }
    }
    moveCollide(t, solids, dt);
    t.x = Math.max(t.kind === 'boss_wanibuchi' ? 4300 : 5300, Math.min(t.kind === 'boss_wanibuchi' ? 5540 : 6600, t.x));
    t.f = (t.f + dt * 6) % 4;
  }

  spriteFrame() {
    const s = this.stats.sprite;
    if (this.dead) return s + '.stun';
    if (this.boss) {
      const map = { idle: 'walk0', walk: 'walk' + Math.floor(this.f), charge: 'lunge', throw: 'throw', sweep: 'lunge', summon: 'lunge' };
      if (this.kind === 'boss_wanibuchi') {
        return this.ai === 'throw' ? 'ceo.throw' : this.ai === 'charge' ? 'ceo.rage' : 'ceo.walk' + Math.floor(this.f);
      }
      return 'boss.' + (map[this.ai] || 'walk0');
    }
    const base = this.kind === 'grunt' ? 'deer' : 'deerb';
    if (this.state === 'windup' || this.state === 'lunge') return base + '.lunge';
    if (this.state === 'stun' || this.stun > 0) return base + '.stun';
    return base + '.walk' + Math.floor(this.f);
  }
}

export function makeProjectile(x, y, vx, vy, owner) {
  return { x, y, w: 18, h: 14, vx, vy, life: 3, owner };
}
