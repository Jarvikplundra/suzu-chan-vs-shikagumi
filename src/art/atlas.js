// Art: procedural sprite atlas — all characters & props drawn as vector anime art
import { PAL, rr, ell, poly, txt } from './gfx.js';

const SCALE = 2; // draw resolution multiplier inside the atlas

export function buildAtlas() {
  const Size = 4096;
  const cv = document.createElement('canvas'); cv.width = Size; cv.height = Size;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = true;
  const REG = {};
  let cx = 16, cy = 16, rowH = 0;

  function slot(name, w, h, drawFn) {
    w = Math.ceil(w); h = Math.ceil(h);
    if (cx + w * SCALE + 8 > Size) { cx = 16; cy += rowH + 8; rowH = 0; }
    const px = cx, py = cy;
    g.save();
    g.translate(px + (w * SCALE) / 2, py + (h * SCALE) / 2);
    g.scale(SCALE, SCALE);
    drawFn(g, 0, 0);
    g.restore();
    REG[name] = { x: px, y: py, w: w * SCALE, h: h * SCALE };
    cx += w * SCALE + 8;
    rowH = Math.max(rowH, h * SCALE);
  }

  // walk cycles
  const WALK = [0, 1, 2, 3];

  // ---------------- SUZU-CHAN ----------------
  const F = 84, FH = 110;
  function drawSuzuBody(g, P) {
    const cx = 0, cy = 0;
    const s = P.scale || 1;
    g.save(); g.scale(s, s);
    if (P.shadow !== false) ell(g, 0, 46, 18, 5, 'rgba(20,12,32,0.3)');
    const lean = P.lean || 0;
    g.save(); g.translate(0, P.bob || 0); g.rotate(lean);
    // tail (behind) — wavy bezier
    const tA = (P.tail || 0);
    g.strokeStyle = PAL.hairBase; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-3, 14);
    g.bezierCurveTo(-14, 26 + tA * 6, -26, 18 + tA * 10, -30, 4 + tA * 14);
    g.stroke();
    ell(g, -30, 4 + tA * 14, 4.5, 4.5, PAL.hairLight);
    // legs
    const leg = (hip, knee, back) => {
      const col = PAL.thigh;
      const j = chain(g, -1, 14, [hip, knee], [back ? 9 : 10, back ? 9 : 10], 7, col);
      if (back) { g.globalAlpha = 1; }
      // stocking top stripe
      ell(g, j[0], j[1] + 8, 4.6, 2.2, PAL.shoe);
      ell(g, j[0] + 2.5, j[1] + 7.4, 3.5, 2.4, PAL.sole);
    };
    leg(P.legB?.[0] ?? 0, P.legB?.[1] ?? 0, true);
    leg(P.legF?.[0] ?? 0, P.legF?.[1] ?? 0, false);
    // shorts
    rr(g, -8, 8, 17, 12, 3); g.fillStyle = PAL.denim; g.fill();
    g.strokeStyle = PAL.denimDark; g.lineWidth = 1.4; g.stroke();
    // fray
    for (let i = 0; i < 4; i++) { g.fillStyle = PAL.denimHi; g.fillRect(-6 + i * 4, 19 + (i % 2), 2, 2.5); }
    // torso — black tee
    rr(g, -8.5, -14, 18, 24, 5); g.fillStyle = PAL.tee; g.fill();
    rr(g, -8.5, -14, 18, 8, 4); g.fillStyle = PAL.teeHi; g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1;
    // hem
    g.strokeStyle = PAL.tee; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-8, 8); g.lineTo(9, 8); g.stroke();
    // NYA!
    txt(g, 'NYA!', 0.5, -3, 6, '#FFFFFF', 'center', 'bold');
    // back arm
    const arm = (sh, el, front) => {
      chain(g, front ? 6 : -6, -11, [sh, el], [9, 8], 5.4, front ? PAL.skin : PAL.skinShade);
    };
    arm(P.armB?.[0] ?? 0.2, P.armB?.[1] ?? 0.2, false);
    // head + hair
    const hb = (P.headTilt || 0);
    g.save(); g.translate(0.5, -20); g.rotate(hb);
    // hair back blob
    ell(g, 0, 2, 13.8, 16, PAL.hairBase);
    g.strokeStyle = PAL.hairBase; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-9, 8);
    g.bezierCurveTo(-14, 20, -12 + (P.hairSway || 0) * 3, 32, -15 + (P.hairSway || 0) * 6, 40);
    g.stroke();
    g.beginPath(); g.moveTo(9, 10);
    g.bezierCurveTo(12, 22, 10, 34, 11, 42);
    g.stroke();
    // head
    ell(g, 0, 0.6, 11.6, 10.9, PAL.skin, PAL.skinShade, 1);
    // cheeks
    ell(g, -6, 4, 2.6, 1.7, PAL.blush);
    ell(g, 6, 4, 2.6, 1.7, PAL.blush);
    // eyes
    const ef = P.eyes || 'open';
    const doEye = (x) => {
      if (ef === 'blink') { g.strokeStyle = PAL.outline; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 3, 1); g.lineTo(x + 3, 1); g.stroke(); }
      else if (ef === 'x') { g.strokeStyle = PAL.outline; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 2.6, 1); g.lineTo(x + 2.6, 4.6); g.moveTo(x + 2.6, 1); g.lineTo(x - 2.6, 4.6); g.stroke(); }
      else {
        ell(g, x, 2, 3.1, 3.9, '#FFF');
        ell(g, x, 2, 2.5, 3.3, PAL.eyeDark);
        ell(g, x, 1.8, 2.1, 2.7, PAL.eye);
        ell(g, x - 0.9, 0.7, 0.8, 1, '#FFFFFF');
        if (ef === 'sparkle') { ell(g, x + 0.8, 3.2, 0.6, 0.8, '#FFFFFF'); }
      }
    };
    if (!P.leftOnlyEyes) { doEye(-4); }
    doEye(4.6);
    // brows
    if (P.eyes === 'angry') { g.strokeStyle = PAL.hairDark; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-7, -3.5); g.lineTo(-2, -1.5); g.moveTo(7, -3.5); g.lineTo(2, -1.5); g.stroke(); }
    // mouth
    g.strokeStyle = '#C4544C'; g.lineWidth = 1.3; g.lineCap = 'round';
    if (P.mouth === 'open') { ell(g, 1.5, 7.5, 2.2, 1.6, '#A74444', '#7C2F2F', 0.8); }
    else if (P.mouth === 'grit') { g.beginPath(); g.moveTo(-1, 7.8); g.lineTo(2, 7.8); g.stroke(); }
    else { // cat ω
      g.beginPath(); g.moveTo(0.2, 7.2); g.quadraticCurveTo(0.9, 8.4, 1.7, 7.2); g.quadraticCurveTo(2.3, 8.4, 3.1, 7.2); g.stroke();
    }
    // ears
    const ear = (ex, flip) => {
      poly(g, [[ex - 6 * flip, -8], [ex - 1 * flip, -19], [ex + 5.5 * flip, -8]], PAL.hairBase);
      poly(g, [[ex - 4.4 * flip, -9.4], [ex - 1.4 * flip, -16.4], [ex + 3.6 * flip, -9.4]], '#F7B7C4');
    };
    ear(-8, -1); ear(8.6, 1);
    // bangs (front)
    g.fillStyle = PAL.hairBase;
    g.beginPath();
    g.moveTo(-12.5, -3);
    g.quadraticCurveTo(-13, -14, 0, -13.5);
    g.quadraticCurveTo(12, -13.5, 12.6, -2);
    g.quadraticCurveTo(10, -7.5, 7.5, -3.5);
    g.quadraticCurveTo(5, -9, -1, -7);
    g.quadraticCurveTo(-6, -12, -12.5, -3);
    g.closePath(); g.fill();
    g.fillStyle = PAL.hairLight; g.globalAlpha = 0.5;
    g.beginPath(); g.moveTo(-8, -10.5); g.quadraticCurveTo(0, -13, 8, -10.8); g.quadraticCurveTo(0, -10.8, -8, -8.5); g.closePath(); g.fill(); g.globalAlpha = 1;
    g.restore();
    // front arm
    arm(P.armF?.[0] ?? 0, P.armF?.[1] ?? 0, true);
    g.restore();
    g.restore();
  }

  const suzuFrames = {
    'suzu.idle0': { bob: 0, tail: 0, eyes: 'open', legF: [-0.06, 0.08], legB: [0.06, 0.06], armF: [-0.15, 0.25], armB: [0.18, 0.15] },
    'suzu.idle1': { bob: 0.8, tail: 0.3, eyes: 'open', legF: [-0.04, 0.08], legB: [0.05, 0.06], armF: [-0.2, 0.3], armB: [0.22, 0.15] },
    'suzu.idle2': { bob: 1.6, tail: 0.6, eyes: 'blink', legF: [-0.02, 0.08], legB: [0.04, 0.06], armF: [-0.25, 0.34], armB: [0.26, 0.15] },
    'suzu.idle3': { bob: 0.8, tail: 0.3, eyes: 'open', legF: [-0.04, 0.08], legB: [0.05, 0.06], armF: [-0.2, 0.3], armB: [0.22, 0.15] },
    // run cycle (6)
    'suzu.run0': { lean: 0.1, bob: -2, tail: 0.5, eyes: 'open', mouth: 'nya', legF: [-0.7, 0.15], legB: [0.6, 0.7], armF: [0.5, 0.6], armB: [-0.5, 0.6], hairSway: -0.5 },
    'suzu.run1': { lean: 0.13, bob: -0.5, tail: 0.2, eyes: 'open', mouth: 'nya', legF: [-0.2, 0.6], legB: [0.3, 0.2], armF: [0.1, 0.7], armB: [-0.2, 0.6], hairSway: -0.3 },
    'suzu.run2': { lean: 0.15, bob: 0.5, tail: -0.2, eyes: 'open', mouth: 'nya', legF: [0.3, 0.8], legB: [-0.2, 0.4], armF: [-0.3, 0.8], armB: [0.25, 0.6], hairSway: 0 },
    'suzu.run3': { lean: 0.1, bob: -2, tail: -0.5, eyes: 'open', mouth: 'nya', legF: [0.7, 0.7], legB: [-0.65, 0.15], armF: [-0.55, 0.6], armB: [0.5, 0.6], hairSway: 0.5 },
    'suzu.run4': { lean: 0.13, bob: -0.5, tail: -0.2, eyes: 'open', mouth: 'nya', legF: [0.25, 0.2], legB: [-0.25, 0.6], armF: [-0.15, 0.7], armB: [0.2, 0.6], hairSway: 0.3 },
    'suzu.run5': { lean: 0.15, bob: 0.5, tail: 0.3, eyes: 'open', mouth: 'nya', legF: [-0.25, 0.4], legB: [0.3, 0.8], armF: [0.3, 0.8], armB: [-0.3, 0.7], hairSway: 0 },
    'suzu.jump': { lean: -0.06, bob: 0, tail: 0.7, eyes: 'open', mouth: 'open', legF: [-0.5, 1.1], legB: [0.3, 0.8], armF: [-1.9, 0.2], armB: [-1.6, 0.3], hairSway: -0.8 },
    'suzu.fall': { lean: 0.1, bob: 0, tail: -0.6, eyes: 'open', mouth: 'open', legF: [0.5, 0.3], legB: [-0.5, 0.6], armF: [-2.3, 0.1], armB: [-2.0, 0.2], hairSway: 0.9 },
    'suzu.dash': { lean: 0.42, bob: 0, tail: -0.9, eyes: 'open', mouth: 'nya', legF: [-0.9, 0.2], legB: [0.9, 0.6], armF: [1.2, 0.4], armB: [-1.2, 0.6], hairSway: -1.4 },
    'suzu.atk0': { lean: -0.12, bob: 0, tail: 0.4, eyes: 'open', mouth: 'open', legF: [-0.3, 0.15], legB: [0.3, 0.2], armF: [1.8, 0.6], armB: [-0.7, 0.6], hairSway: 0.3 },
    'suzu.atk1': { lean: 0.22, bob: -1, tail: -0.5, eyes: 'sparkle', mouth: 'open', legF: [-0.7, 0.5], legB: [0.6, 0.6], armF: [-1.7, 0.15], armB: [0.9, 0.6], hairSway: -0.7 },
    'suzu.atk2': { lean: -0.15, bob: -2, tail: 0.5, eyes: 'sparkle', mouth: 'open', legF: [-0.4, 0.9], legB: [0.4, 0.6], armF: [-2.6, 0.2], armB: [-0.4, 0.6], hairSway: -0.5 },
    'suzu.hurt': { lean: -0.3, bob: 1, tail: 0.8, eyes: 'x', mouth: 'open', legF: [0.5, 0.4], legB: [-0.7, 0.7], armF: [-2.4, 0.4], armB: [-2.1, 0.5], hairSway: 1.2 },
    'suzu.win0': { bob: 0, tail: 0.3, eyes: 'sparkle', mouth: 'nya', legF: [-0.08, 0.08], legB: [0.08, 0.06], armF: [-2.7, 0.1], armB: [0.3, 0.3] },
    'suzu.win1': { bob: -1.4, tail: -0.2, eyes: 'sparkle', mouth: 'open', legF: [-0.06, 0.08], legB: [0.06, 0.06], armF: [-2.3, 0.15], armB: [0.3, 0.3] },
  };
  for (const [name, pose] of Object.entries(suzuFrames)) slot(name, 60, 100, (g) => drawSuzuBody(g, pose));

  // ---------------- KAPI-DONO (capybara) ----------------
  const KF = 104, KH = 96;
  function drawKapi(g, P) {
    ell(g, 0, 44, 30, 6, 'rgba(20,12,32,0.3)');
    const bob = P.bob || 0;
    g.save(); g.translate(0, bob);
    // feet
    ell(g, -14, 40, 10, 5, PAL.capyDark); ell(g, 14, 40, 10, 5, PAL.capyDark);
    // body
    ell(g, 0, 18, 32, 27, PAL.capy);
    ell(g, -6, 10, 24, 18, PAL.capyHi);
    // yukata
    g.save();
    rr(g, -26, 6, 52, 34, 8); g.fillStyle = PAL.yukata; g.fill();
    g.clip();
    // floral pattern
    g.fillStyle = PAL.yukataPat;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
      const fx = -20 + i * 11, fy = 12 + j * 12;
      ell(g, fx, fy, 2, 2, PAL.yukataPat);
      ell(g, fx + 2.4, fy, 1.5, 1.5, PAL.yukataPat);
      ell(g, fx - 2.4, fy, 1.5, 1.5, PAL.yukataPat);
    }
    // wave band bottom
    g.fillStyle = PAL.yukataDark; rr(g, -26, 32, 52, 9, 0); g.fill();
    g.fillStyle = PAL.yukata;
    for (let i = 0; i < 7; i++) { ell(g, -22 + i * 8, 33, 4, 4, PAL.yukata); }
    g.restore();
    // obi
    rr(g, -26, 20, 52, 8, 3); g.fillStyle = '#1E1B24'; g.fill();
    // arm
    ell(g, 20, 16, 6, 10, PAL.capy); ell(g, 24, 24, 5, 4, PAL.capyDark);
    if (P.armUp) ell(g, 22, 2, 6, 9, PAL.capy);
    // head
    g.save(); g.translate(P.headX || 0, -24); g.rotate(P.headTilt || 0);
    ell(g, 0, 0, 25, 20, PAL.capy);
    ell(g, -8, -12, 6, 5, PAL.capy); ell(g, 8, -12, 6, 5, PAL.capy); // ears
    ell(g, 0, -16, 14, 8, PAL.capyDark); // head cap
    // muzzle
    ell(g, 4, 7, 12, 8, PAL.capyHi);
    ell(g, 11, 5, 2.2, 1.8, '#402A18');
    g.strokeStyle = '#402A18'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(11, 8); g.lineTo(11, 11); g.stroke();
    // grumpy brows + eyes
    g.strokeStyle = '#4A3320'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-9, -2); g.lineTo(-2, 1); g.moveTo(7, -2); g.lineTo(14, 1); g.stroke();
    ell(g, -5, 4, 2.2, 2.2, '#2B1D10'); ell(g, 9, 4, 2.2, 2.2, '#2B1D10');
    // headband
    rr(g, -16, -12, 32, 6, 3); g.fillStyle = '#F2EFE8'; g.fill();
    if (P.bandKnot) { ell(g, -17, -8, 3.5, 2.2, '#F2EFE8'); }
    g.restore();
    g.restore();
  }
  slot('kapi.idle', KF, KH, (g) => drawKapi(g, {}));
  slot('kapi.walk0', KF, KH, (g) => drawKapi(g, { bob: 0, headX: 1 }));
  slot('kapi.walk1', KF, KH, (g) => drawKapi(g, { bob: -2, headX: -1 }));
  slot('kapi.walk2', KF, KH, (g) => drawKapi(g, { bob: 0, headX: 1 }));
  slot('kapi.walk3', KF, KH, (g) => drawKapi(g, { bob: -2, headX: -1 }));
  slot('kapi.drink', KF, KH, (g) => drawKapi(g, { armUp: true }));

  // ---------------- MICE ----------------
  function drawMouse(g, P) {
    const col = PAL[P.col] || '#B9ACB4';
    ell(g, 0, 14, 9, 3, 'rgba(20,12,32,0.3)');
    // tail
    g.strokeStyle = '#C9A9B4'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-6, 8); g.quadraticCurveTo(-13, 6 + P.tail * 6, -16, 1 + P.tail * 9); g.stroke();
    // legs
    const lf = P.f ?? 0;
    ell(g, -3 + Math.sin(lf * 6) * 2, 12.4, 2.2, 1.8, '#8E8088');
    ell(g, 3 - Math.sin(lf * 6) * 2, 12.4, 2.2, 1.8, '#8E8088');
    // body
    ell(g, 0, 6, 8, 7, col);
    ell(g, 2.5, 4, 4.5, 3.5, P.hi || '#D8CDD3');
    // scarf
    poly(g, [[-4, 2.2], [4, 2.2], [2.8, 7]], PAL.scarf);
    // ears + head
    ell(g, -5, -4, 3.4, 3.4, col); ell(g, 5, -4, 3.4, 3.4, col);
    ell(g, -5, -4, 2, 2, '#F2C4CE'); ell(g, 5, -4, 2, 2, '#F2C4CE');
    ell(g, 1, -1.5, 6, 5.5, col);
    ell(g, 4.6, -1.4, 1.5, 1.5, '#241A20');
    // nose
    ell(g, 7.2, -0.4, 1.1, 0.9, '#E2879A');
  }
  for (const [mid, col, hi, scarf] of [['mouse.aka', '#B9ACB4', '#D8CDD3', '#D64545'], ['mouse.ao', '#A9B4C4', '#CDD6E2', '#3F6FB5'], ['mouse.kin', '#C4B4A9', '#E2D6CD', '#C99A1E']]) {
    PAL[col] !== undefined; // noop
    const base = { col, hi, scarf };
    slot(mid + '.idle', 40, 34, (g) => drawMouse(g, { ...base, tail: 0 }));
    for (let i = 0; i < 4; i++) slot(mid + '.run' + i, 40, 34, (g) => drawMouse(g, { ...base, tail: Math.sin(i * 1.57) * 0.6, f: i }));
  }

  // ---------------- DEER (shika-gumi) ----------------
  const DF = 76, DH = 118;
  function drawDeer(g, P) {
    const bruiser = P.variant === 'bruiser';
    const boss = P.variant === 'boss';
    const S = bruiser ? 1.18 : 1;
    ell(g, 0, 52, 20, 5, 'rgba(20,12,32,0.3)');
    g.save(); g.scale(S, S);
    const f = P.f ?? 0, sw = Math.sin((f / 4) * Math.PI * 2);
    g.save(); g.translate(0, P.bob || 0); g.rotate(P.lean || 0);
    // legs (suit trousers)
    const leg = (hx, ang) => {
      const j = chain(g, hx, 18, [ang, ang < 0 ? 0.35 : 0.15], [13, 13], 7, PAL.hoof);
      poly(g, [[j[0] - 3.4, j[1] - 4], [j[0] + 5.4, j[1] - 4], [j[0] + 4.4, j[1] + 1.5], [j[0] - 2, j[1] + 1.5]], '#191410');
    };
    leg(-5, sw * 0.5); leg(5, -sw * 0.5);
    // tail
    ell(g, -11, 2, 4, 3.5, PAL.deer); ell(g, -11, 2, 2, 1.8, '#FFF');
    // torso — blazer
    rr(g, -13, -14, 27, 34, 7); g.fillStyle = PAL.suit; g.fill();
    if (boss) { poly(g, [[-13, -14], [14, -14], [14, -2], [-13, -2]], '#B23A3A'); }
    // shirt + tie
    poly(g, [[-4, -13], [3, -13], [-0.5, -2]], PAL.white);
    poly(g, [[-1.5, -10], [1.5, -10], [0, 0]], boss ? '#E0B23A' : '#7A2530');
    // spots
    if (!P.frontOnly) { ell(g, -8, -6, 1.8, 1.4, '#E8DCC8'); ell(g, -5, -1, 1.6, 1.3, '#E8DCC8'); ell(g, -9, 0, 1.5, 1.2, '#E8DCC8'); }
    // head
    g.save(); g.translate(1, -26); g.rotate(P.headTilt || 0);
    ell(g, 0, 0, 13, 11, PAL.deer);
    ell(g, 8, 3, 7, 5, PAL.deerHi); // muzzle
    ell(g, 13.4, 2, 1.7, 1.5, '#241A10');
    // ears
    poly(g, [[-10, -6], [-19, -12], [-9, 1]], PAL.deer); poly(g, [[10, -7], [18, -13], [11, 0]], PAL.deer);
    // antlers
    g.strokeStyle = PAL.antler; g.lineWidth = 2.6; g.lineCap = 'round';
    const A = bruiser || boss ? 1.5 : 1;
    g.beginPath(); g.moveTo(-4, -9); g.lineTo(-6, -22); g.moveTo(-6, -18); g.lineTo(-12, -24 * A); g.moveTo(-6, -16); g.lineTo(-1, -21 * A); g.stroke();
    g.beginPath(); g.moveTo(5, -9); g.lineTo(8, -21); g.moveTo(7.6, -17); g.lineTo(2, -23 * A); g.moveTo(7.6, -15); g.lineTo(13, -20 * A); g.stroke();
    // sunglasses or angry eyes
    if (P.stun) {
      g.strokeStyle = '#241A10'; g.lineWidth = 2;
      g.beginPath(); g.arc(-3, 1, 2.6, 0, 5); g.stroke(); g.beginPath(); g.arc(5, 1, 2.6, 2, 7); g.stroke();
    } else {
      rr(g, -8, -3, 17, 5.5, 2); g.fillStyle = '#111'; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.28)'; poly(g, [[-6, -2.4], [-2, -2.4], [-4, 0.4], [-8, 0.4]], 'rgba(255,255,255,0.28)');
    }
    if (boss) { // scar
      g.strokeStyle = '#C4544C'; g.lineWidth = 2; g.beginPath(); g.moveTo(-6, 4); g.lineTo(0, 9); g.stroke();
    }
    g.restore();
    // front arm
    const armA = P.arm === 'raise' ? -2.2 : P.arm === 'fwd' ? -1.4 : sw * 0.5;
    const a2 = chain(g, 6, -10, [armA, armA > 0 ? 0.3 : 0.6], [10, 9], 5.4, PAL.suitHi);
    poly(g, [[a2[0] - 3, a2[1] - 3], [a2[0] + 4, a2[1] - 3], [a2[0] + 3, a2[1] + 2], [a2[0] - 2, a2[1] + 2]], PAL.hoof);
    g.restore();
    g.restore();
  }
  slot('deer.walk0', DF, DH, (g) => drawDeer(g, { f: 0 }));
  slot('deer.walk1', DF, DH, (g) => drawDeer(g, { f: 1 }));
  slot('deer.walk2', DF, DH, (g) => drawDeer(g, { f: 2 }));
  slot('deer.walk3', DF, DH, (g) => drawDeer(g, { f: 3 }));
  slot('deer.lunge', DF, DH, (g) => drawDeer(g, { f: 1, lean: 0.3, arm: 'fwd', headTilt: 0.15 }));
  slot('deer.stun', DF, DH, (g) => drawDeer(g, { f: 0, stun: true, lean: -0.1 }));
  for (let i = 0; i < 4; i++) slot('deerb.walk' + i, DF, DH, (g) => drawDeer(g, { variant: 'bruiser', f: i }));
  slot('deerb.lunge', DF, DH, (g) => drawDeer(g, { variant: 'bruiser', f: 1, lean: 0.35, arm: 'fwd', headTilt: 0.2 }));
  slot('deerb.stun', DF, DH, (g) => drawDeer(g, { variant: 'bruiser', stun: true, lean: -0.1 }));
  for (let i = 0; i < 4; i++) slot('boss.walk' + i, 96, 132, (g) => drawDeer(g, { variant: 'boss', S: 1.35, f: i }));
  slot('boss.lunge', 96, 132, (g) => drawDeer(g, { variant: 'boss', S: 1.35, f: 1, lean: 0.3, arm: 'fwd' }));
  slot('boss.stun', 96, 132, (g) => drawDeer(g, { variant: 'boss', S: 1.35, stun: true, lean: -0.1 }));

  // ---------------- CEO WANIBUCHI (crocodile) ----------------
  const CF = 92, CH = 116;
  function drawCeo(g, P) {
    ell(g, 0, 52, 24, 5, 'rgba(20,12,32,0.3)');
    const f = P.f ?? 0, sw = Math.sin((f / 4) * Math.PI * 2);
    g.save(); g.translate(0, P.bob || 0);
    // legs
    chain(g, -6, 22, [sw * 0.4, 0.2], [14, 14], 8, PAL.suit);
    chain(g, 6, 22, [-sw * 0.4, 0.2], [14, 14], 8, PAL.suit);
    poly(g, [[-11, 46], [-1, 46], [-2, 51], [-11, 51]], '#15120E');
    poly(g, [[1, 46], [11, 46], [10, 51], [2, 51]], '#15120E');
    // torso — grey suit
    rr(g, -15, -14, 31, 38, 8); g.fillStyle = '#4A4A55'; g.fill();
    poly(g, [[-5, -13], [3, -13], [-1, 4]], PAL.white);
    poly(g, [[-2.5, -9], [1.5, -9], [-0.5, 6]], '#B23A3A');
    // arms
    const armA = P.arm === 'fwd' ? -1.6 : sw * 0.5;
    chain(g, -11, -8, [armA, 0.4], [11, 10], 6.4, '#3A3A46');
    chain(g, 11, -8, [-armA, 0.4], [11, 10], 6.4, '#3A3A46');
    // head — croc snout
    g.save(); g.translate(0, -28);
    ell(g, 0, 0, 13, 11, '#5A8F5A');
    rr(g, 4, 1, 17, 9, 4); g.fillStyle = '#6FA26F'; g.fill();
    // teeth
    g.fillStyle = '#FFF';
    for (let i = 0; i < 5; i++) { poly(g, [[5 + i * 3.2, 9.5], [6.6 + i * 3.2, 12.4], [8.2 + i * 3.2, 9.5]], '#FFF'); }
    // glasses
    g.fillStyle = '#1A1410'; ell(g, -3, -1, 4.2, 3.4, '#1A1410'); ell(g, 5, -1, 4.2, 3.4, '#1A1410');
    g.strokeStyle = '#1A1410'; g.lineWidth = 2; g.beginPath(); g.moveTo(1, -1); g.lineTo(2, -1); g.stroke();
    // scales
    ell(g, -6, -8, 2, 1.4, '#4A7A4A'); ell(g, -1, -10, 2, 1.4, '#4A7A4A'); ell(g, 4, -9, 2, 1.4, '#4A7A4A');
    g.restore();
    g.restore();
  }
  slot('ceo.walk0', CF, CH, (g) => drawCeo(g, { f: 0 }));
  slot('ceo.walk1', CF, CH, (g) => drawCeo(g, { f: 1, bob: -1 }));
  slot('ceo.walk2', CF, CH, (g) => drawCeo(g, { f: 2 }));
  slot('ceo.walk3', CF, CH, (g) => drawCeo(g, { f: 3, bob: -1 }));
  slot('ceo.rage', CF, CH, (g) => drawCeo(g, { f: 0, bob: 2, arm: 'fwd' }));
  slot('ceo.throw', CF, CH, (g) => drawCeo(g, { f: 1, bob: 0, arm: 'fwd' }));

  // ---------------- OFFICE PROPS ----------------
  slot('prop.desk', 150, 74, (g) => {
    rr(g, 0, 0, 150, 10, 2); g.fillStyle = '#B98A5A'; g.fill();
    g.fillStyle = '#A5764A'; rr(g, 0, 8, 150, 4, 1); g.fill();
    g.fillStyle = '#5A5A66'; g.fillRect(10, 12, 6, 50); g.fillRect(134, 12, 6, 50);
    g.fillStyle = '#4A4A55'; g.fillRect(10, 12, 6, 4); g.fillRect(134, 12, 6, 4);
    // drawers
    rr(g, 84, 14, 40, 40, 2); g.fillStyle = '#8A8A96'; g.fill();
    g.fillStyle = '#6A6A76'; g.fillRect(88, 20, 32, 10); g.fillRect(88, 34, 32, 10);
    ell(g, 104, 25, 1.5, 1.5, '#3A3A46'); ell(g, 104, 39, 1.5, 1.5, '#3A3A46');
  });
  slot('prop.monitor', 64, 48, (g) => {
    rr(g, 0, 0, 60, 38, 3); g.fillStyle = '#2A2A32'; g.fill();
    rr(g, 3, 3, 54, 30, 2); g.fillStyle = '#7FD4E8'; g.fill();
    g.fillStyle = '#FFFFFF'; g.globalAlpha = 0.7;
    g.fillRect(8, 8, 28, 3); g.fillRect(8, 14, 44, 3); g.fillRect(8, 20, 36, 3); g.fillRect(8, 26, 40, 3);
    g.globalAlpha = 1;
    g.fillStyle = '#3A3A46'; g.fillRect(26, 38, 8, 6); rr(g, 18, 44, 24, 3, 1); g.fill();
  });
  slot('prop.chair', 52, 66, (g) => {
    rr(g, 4, 0, 44, 44, 6); g.fillStyle = '#2E2E38'; g.fill();
    rr(g, 10, 40, 32, 8, 3); g.fillStyle = '#4A4A55'; g.fill();
    g.fillRect(23, 48, 6, 8); ell(g, 26, 58, 12, 3, '#3A3A46');
  });
  slot('prop.cooler', 42, 96, (g) => {
    rr(g, 4, 30, 34, 60, 4); g.fillStyle = '#7A8494'; g.fill();
    rr(g, 8, 0, 26, 34, 4); g.fillStyle = '#A8D8F0'; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(26, 4, 4, 24);
    g.fillStyle = '#4A5564'; g.fillRect(14, 44, 6, 8); g.fillRect(24, 44, 6, 8);
    ell(g, 20, 60, 12, 12, '#B8E0F0');
  });
  slot('prop.plant', 56, 84, (g) => {
    rr(g, 14, 54, 28, 28, 4); g.fillStyle = '#A8562E'; g.fill();
    rr(g, 12, 50, 32, 8, 3); g.fillStyle = '#C4683A'; g.fill();
    for (const [dx, dy, rot] of [[-8, 20, -0.7], [8, 22, 0.7], [0, 12, 0], [-5, 30, -0.4], [5, 32, 0.4]]) {
      g.save(); g.translate(28, 54); g.rotate(rot);
      ell(g, dx, dy - 30, 14, 30, '#4A8A4A'); ell(g, dx, dy - 30, 14, 30, null, '#3A6A3A', 2);
      g.restore();
    }
  });
  slot('prop.pillar', 46, 300, (g) => {
    rr(g, 4, 0, 38, 290, 4); g.fillStyle = '#C9C6BC'; g.fill();
    g.fillStyle = '#B4B0A6'; g.fillRect(10, 0, 6, 290);
    rr(g, 0, 260, 46, 40, 4); g.fillStyle = '#A8A49A'; g.fill();
  });
  slot('prop.box', 64, 56, (g) => {
    rr(g, 0, 4, 64, 52, 3); g.fillStyle = '#C9A06A'; g.fill();
    g.fillStyle = '#B98A5A'; g.fillRect(0, 26, 64, 4);
    g.strokeStyle = '#9A7244'; g.lineWidth = 2; g.strokeRect(6, 8, 52, 44);
  });
  slot('prop.printer', 70, 50, (g) => {
    rr(g, 0, 14, 70, 34, 4); g.fillStyle = '#7A8494'; g.fill();
    rr(g, 12, 0, 46, 18, 3); g.fillStyle = '#5A6474'; g.fill();
    g.fillStyle = '#E8E4DC'; g.fillRect(20, 40, 30, 8);
    ell(g, 58, 24, 3, 3, '#3ACB6A');
  });
  slot('prop.paperstack', 40, 30, (g) => {
    for (let i = 0; i < 4; i++) { g.save(); rr(g, 1, 24 - i * 5, 38, 5, 1); g.fillStyle = i % 2 ? '#E8E4DA' : '#F4F0E6'; g.fill(); g.restore(); }
  });
  slot('prop.phone', 46, 26, (g) => {
    rr(g, 0, 4, 46, 20, 4); g.fillStyle = '#3A3A46'; g.fill();
    rr(g, 2, 0, 42, 8, 4); g.fillStyle = '#4A4A56'; g.fill();
    for (let i = 0; i < 8; i++) ell(g, 8 + i * 4, 18, 1.4, 1.4, '#6A6A76');
  });
  slot('prop.exitdoor', 84, 128, (g) => {
    rr(g, 0, 0, 84, 124, 6); g.fillStyle = '#5A6474'; g.fill();
    rr(g, 6, 6, 72, 112, 4); g.fillStyle = '#7A8494'; g.fill();
    rr(g, 12, 12, 60, 100, 3); g.fillStyle = '#4A5564'; g.fill();
    rr(g, 22, 22, 40, 22, 3); g.fillStyle = '#7CE8A8'; g.fill();
    txt(g, '出口', 42, 34, 14, '#0D3A22');
    ell(g, 66, 66, 3, 3, '#F2E9A8');
  });
  slot('prop.watercoolerB', 42, 96, (g) => { /* alias spare */ rr(g, 4, 30, 34, 60, 4); g.fillStyle = '#7A8494'; g.fill(); });

  // ---------------- STREET PROPS ----------------
  slot('prop.lantern', 44, 72, (g) => {
    g.strokeStyle = '#3A2A20'; g.lineWidth = 2; g.beginPath(); g.moveTo(22, 0); g.lineTo(22, 8); g.stroke();
    ell(g, 22, 32, 20, 24, '#D64545');
    ell(g, 22, 32, 13, 18, 'rgba(255,220,120,0.45)');
    g.strokeStyle = '#B23A3A'; g.lineWidth = 2;
    for (const yy of [18, 30, 44]) { g.beginPath(); g.moveTo(5, yy); g.lineTo(39, yy); g.stroke(); }
    rr(g, 12, 6, 20, 8, 3); g.fillStyle = '#4A3830'; g.fill();
    rr(g, 14, 54, 16, 6, 2); g.fillStyle = '#4A3830'; g.fill();
    g.strokeStyle = '#F2E0B0'; g.lineWidth = 2.4; g.lineCap = 'round';
    txt(g, '酒', 22, 33, 14, '#F2E0B0');
    // tassels
    g.strokeStyle = '#E8C23A'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(14 + i * 8, 60); g.lineTo(14 + i * 8, 68); g.stroke(); }
  });
  slot('prop.izakaya', 96, 150, (g) => {
    rr(g, 4, 0, 88, 130, 6); g.fillStyle = '#7A4E38'; g.fill();
    rr(g, 10, 6, 76, 40, 4); g.fillStyle = '#5A3828'; g.fill();
    txt(g, '居酒屋', 48, 28, 22, '#F2E0B0');
    // noren curtains
    for (let i = 0; i < 3; i++) { rr(g, 14 + i * 24, 52, 20, 40, 2); g.fillStyle = i % 2 ? '#3A5A8A' : '#33527E'; g.fill(); }
    g.fillStyle = '#F2E0B0'; ell(g, 48, 110, 10, 10, '#F2E0B0');
    txt(g, '酒', 48, 110, 14, '#7A2530');
  });
  slot('prop.vending', 78, 136, (g) => {
    rr(g, 0, 0, 78, 130, 5); g.fillStyle = '#C9452E'; g.fill();
    rr(g, 8, 10, 46, 84, 4); g.fillStyle = '#A8E8E0'; g.fill();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      rr(g, 12 + c * 14, 16 + r * 20, 11, 14, 2);
      g.fillStyle = ['#F2E050', '#5ACB6A', '#E87AA8', '#F2E050', '#5AB5E8', '#E87AA8', '#F2A850', '#5ACB6A', '#F2E050', '#E87AA8', '#5AB5E8', '#F2A850'][r * 3 + c];
      g.fill();
    }
    rr(g, 58, 10, 14, 30, 3); g.fillStyle = '#7A2018'; g.fill();
    rr(g, 58, 52, 14, 42, 3); g.fillStyle = '#4A3830'; g.fill();
    txt(g, '自販', 39, 121, 12, '#F2E0B0');
  });
  slot('prop.pole', 40, 320, (g) => {
    rr(g, 16, 0, 8, 320, 2); g.fillStyle = '#7A7A82'; g.fill();
    g.fillStyle = '#8A8A92'; g.fillRect(16, 20, 8, 10);
    // transformer
    rr(g, 4, 60, 32, 20, 3); g.fillStyle = '#5A6470'; g.fill();
    // posters
    rr(g, 17, 120, 7, 50, 1); g.fillStyle = '#E8D8C0'; g.fill();
    rr(g, 17, 190, 7, 40, 1); g.fillStyle = '#C8D8E8'; g.fill();
  });
  slot('prop.crate', 58, 52, (g) => {
    rr(g, 0, 0, 58, 52, 3); g.fillStyle = '#A87848'; g.fill();
    g.strokeStyle = '#7A5433'; g.lineWidth = 3; g.strokeRect(4, 4, 50, 44);
    g.beginPath(); g.moveTo(4, 4); g.lineTo(54, 48); g.moveTo(54, 4); g.lineTo(4, 48); g.stroke();
  });
  slot('prop.awning', 130, 56, (g) => {
    // striped bouncy awning
    for (let i = 0; i < 6; i++) {
      rr(g, i * 22, 0, 22, 40, 10);
      g.fillStyle = i % 2 ? '#D64545' : '#F2E9DC';
      g.fill();
    }
    g.strokeStyle = '#B23A3A'; g.lineWidth = 3; g.beginPath(); g.moveTo(2, 34); g.quadraticCurveTo(65, 56, 128, 34); g.stroke();
  });
  slot('prop.deersign', 60, 170, (g) => {
    rr(g, 26, 40, 8, 130, 2); g.fillStyle = '#8A8A92'; g.fill();
    poly(g, [[4, 0], [56, 0], [56, 44], [4, 44]], '#F2E9C8');
    g.strokeStyle = '#C99A1E'; g.lineWidth = 3; g.strokeRect(4, 2, 52, 40);
    txt(g, '鹿', 30, 20, 22, '#3A2A18', 'center', 'bold');
    txt(g, '注意', 30, 36, 13, '#3A2A18', 'center', 'bold');
  });
  slot('prop.stonel', 48, 110, (g) => {
    rr(g, 16, 30, 16, 76, 4); g.fillStyle = '#8A8578'; g.fill();
    rr(g, 4, 16, 40, 14, 4); g.fillStyle = '#7A7568'; g.fill();
    poly(g, [[24, 0], [44, 22], [4, 22]], '#9A9588');
    rr(g, 19, 44, 10, 14, 4); g.fillStyle = '#4A3828'; g.fill();
    ell(g, 24, 52, 3, 4, '#F2C86A');
  });

  // ---------------- PICKUPS ----------------
  for (let i = 0; i < 4; i++) {
    slot('pickup.coin' + i, 30, 34, (g) => {
      const wq = [1, 0.8, 0.34, 0.12][i];
      ell(g, 15, 18, 12 * wq + (i === 0 || i === 2 ? 0 : 2), 14, PAL.coin, PAL.coinDark, 2.4);
      txt(g, '¥', 15, 18.5, 13, PAL.coinDark, 'center', 'bold');
      if (i === 0) ell(g, 11, 12, 3.5, 2.2, 'rgba(255,255,255,0.65)');
    });
  }
  slot('pickup.senbei', 34, 34, (g) => {
    ell(g, 17, 18, 14, 14, PAL.senbei, '#C9B888', 2);
    ell(g, 17, 18, 8, 8, '#DDD0A0');
    txt(g, '鹿', 17, 18, 12, '#6A5A2A', 'center', 'bold');
  });
  slot('pickup.onigiri', 36, 36, (g) => {
    poly(g, [[18, 4], [32, 30], [4, 30]], '#F7F4EC', '#D8D4C8', 2);
    poly(g, [[18, 18], [26, 32], [10, 32]], '#2F4A2A');
  });
  slot('pickup.form', 30, 40, (g) => {
    g.save(); g.translate(15, 20); g.rotate(-0.12);
    rr(g, -10, -16, 22, 32, 2); g.fillStyle = '#F7F4EC'; g.fill();
    g.fillStyle = '#C99A1E'; g.fillRect(-10, -16, 22, 6);
    txt(g, '辞', 1, 4, 16, '#B23A3A', 'center', 'bold');
    g.restore();
  });

  // ---------------- FX ----------------
  slot('fx.slash0', 56, 56, (g) => {
    g.strokeStyle = 'rgba(255,240,200,0.95)'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 28, 26, -2.6, -0.9); g.stroke();
  });
  slot('fx.slash1', 56, 56, (g) => {
    g.strokeStyle = 'rgba(255,220,140,0.95)'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 28, 26, -2.2, -0.4); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3.4;
    g.beginPath(); g.arc(0, 28, 26, -2.5, -0.7); g.stroke();
  });
  slot('fx.slash2', 56, 56, (g) => {
    g.strokeStyle = 'rgba(255,190,110,0.8)'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 28, 26, -1.4, -0.1); g.stroke();
  });
  slot('fx.impact', 48, 48, (g) => {
    g.fillStyle = '#FFF6DC';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      poly(g, [[24 + Math.cos(a) * 8, 24 + Math.sin(a) * 8], [24 + Math.cos(a + 0.4) * 20, 24 + Math.sin(a + 0.4) * 20], [24 + Math.cos(a + 0.2) * 13, 24 + Math.sin(a + 0.2) * 13]], '#FFF6DC');
    }
  });
  slot('fx.ring', 64, 64, (g) => {
    g.strokeStyle = 'rgba(255,230,180,0.9)'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(32, 32, 26, 10, 0, 0, Math.PI * 2); g.stroke();
  });
  slot('fx.dust', 32, 32, (g) => {
    ell(g, 11, 20, 7, 5, 'rgba(230,220,210,0.6)');
    ell(g, 21, 16, 6, 4.6, 'rgba(230,220,210,0.5)');
  });
  slot('fx.star', 30, 30, (g) => {
    poly(g, [[15, 2], [18.4, 11.6], [28, 15], [18.4, 18.4], [15, 28], [11.6, 18.4], [2, 15], [11.6, 11.6]], '#FFE07A');
  });
  slot('fx.spark', 20, 20, (g) => {
    g.strokeStyle = '#FFF3C0'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(10, 1); g.lineTo(10, 19); g.moveTo(1, 10); g.lineTo(19, 10); g.stroke();
  });
  slot('fx.note', 26, 26, (g) => {
    ell(g, 8, 17, 5, 4, '#D8C8F0');
    g.fillStyle = '#D8C8F0'; g.fillRect(11, 3, 2.6, 15); ell(g, 11, 3, 7, 3.5, '#D8C8F0');
  });
  slot('fx.zzz', 44, 26, (g) => {
    txt(g, 'Z z', 22, 13, 13, '#BFD8F0', 'center', 'bold');
  });
  slot('fx.petaldrop', 24, 20, (g) => {
    ell(g, 8, 10, 6, 4, 'rgba(255,190,210,0.9)');
    ell(g, 15, 12, 5, 3.4, 'rgba(255,205,225,0.75)');
  });

  return { canvas: cv, regions: REG };
}

// multi-segment limb helper (angles relative, cumulative world rotation)
export function chain(g, x, y, angles, lens, w, color, tipColor = null) {
  let px = x, py = y;
  let A = 0;
  const pts = [[px, py]];
  for (let i = 0; i < angles.length; i++) {
    A += angles[i];
    px += Math.sin(A) * lens[i];
    py += Math.cos(A) * lens[i];
    pts.push([px, py]);
  }
  g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
  return pts[pts.length - 1];
}
