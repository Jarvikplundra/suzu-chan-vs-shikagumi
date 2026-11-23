// Art: parallax backgrounds (office interior / shitamachi dusk street / Nara teaser)
import { rr, ell, poly, txt } from './gfx.js';

const S = 2; // supersample

function canvas(worldW, worldH) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(worldW * S); cv.height = Math.round(worldH * S);
  const g = cv.getContext('2d');
  g.scale(S, S);
  cv._worldW = worldW; cv._worldH = worldH;
  return cv;
}

// ---------------- OFFICE ----------------
export function buildOfficeBG() {
  const H = 620; // world height of scene columns
  // L0: wall + huge windows w/ sunset skyline
  const l0 = canvas(1600, H);
  let g = l0.getContext('2d');
  const wallGrad = g.createLinearGradient(0, 0, 0, H);
  wallGrad.addColorStop(0, '#2E2A3E'); wallGrad.addColorStop(0.55, '#4A4058'); wallGrad.addColorStop(1, '#332C44');
  g.fillStyle = wallGrad; g.fillRect(0, 0, 1600, H);
  // wainscot
  g.fillStyle = '#3A3348'; g.fillRect(0, 470, 1600, 150);
  g.fillStyle = '#4C4360'; g.fillRect(0, 466, 1600, 8);
  // windows (two big ones inset with warm sunset + skyline)
  for (const wx of [240, 960]) {
    const ww = 420, wh = 330, wy = 70;
    // sunset gradient
    const sg = g.createLinearGradient(0, wy, 0, wy + wh);
    sg.addColorStop(0, '#3A2C50'); sg.addColorStop(0.4, '#8A4A5C'); sg.addColorStop(0.7, '#D87A50'); sg.addColorStop(1, '#F2B872');
    g.fillStyle = sg; g.fillRect(wx, wy, ww, wh);
    // sun
    g.save(); g.globalAlpha = 0.9; ell(g, wx + ww * 0.62, wy + wh * 0.72, 34, 34, '#FFDFA0'); g.restore();
    // Fuji
    poly(g, [[wx + 30, wy + wh], [wx + 120, wy + wh - 108], [wx + 186, wy + wh]], '#5E3A54');
    poly(g, [[wx + 102, wy + wh - 92], [wx + 138, wy + wh - 92], [wx + 132, wy + wh - 108], [wx + 108, wy + wh - 108]], '#F5E8E0');
    // skyline
    g.fillStyle = '#43304E';
    const bl = [[210, 120], [250, 74], [292, 150], [330, 96], [372, 164], [410, 66], [452, 128]];
    for (const [bx, bh] of bl) g.fillRect(wx + bx % 420, wy + wh - bh - 10, 34, bh + 10);
    // Tokyo Tower
    g.strokeStyle = '#5E3A54'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(wx + 150, wy + wh); g.lineTo(wx + 164, wy + wh - 130); g.lineTo(wx + 176, wy + wh - 168); g.lineTo(wx + 182, wy + wh - 130); g.lineTo(wx + 196, wy + wh); g.stroke();
    g.beginPath(); g.moveTo(wx + 158, wy + wh - 60); g.lineTo(wx + 190, wy + wh - 60); g.stroke();
    // lit windows in buildings
    g.fillStyle = '#F2B872';
    for (let i = 0; i < 26; i++) g.fillRect(wx + 212 + (i % 13) * 34, wy + wh - 100 + (i * 13) % 88, 5, 6);
    // frame
    g.strokeStyle = '#241F30'; g.lineWidth = 10; g.strokeRect(wx, wy, ww, wh);
    g.fillStyle = '#241F30'; g.fillRect(wx + ww / 2 - 5, wy, 10, wh);
    // light spill on floor
    g.save(); g.globalAlpha = 0.14; g.fillStyle = '#F2B872';
    poly(g, [[wx - 40, H], [wx + ww + 40, H], [wx + ww - 60, wy + wh], [wx + 60, wy + wh]], '#F2B872'); g.restore();
  }
  // ceiling
  g.fillStyle = '#262234'; g.fillRect(0, 0, 1600, 54);
  for (let i = 0; i < 10; i++) { rr(g, 60 + i * 156, 20, 60, 12, 3); g.fillStyle = '#F5EBD0'; g.fill(); }
  const t0 = l0;
  return { height: H, layers: [t0] };
}

// ---------------- STREET (shitamachi dusk) ----------------
export function buildStreetBG() {
  const H = 620;
  // L1: far silhouettes
  const l1 = canvas(1600, H);
  let g = l1.getContext('2d');
  const fg = g.createLinearGradient(0, 0, 0, H);
  fg.addColorStop(0, 'rgba(50,36,74,0.85)'); fg.addColorStop(1, 'rgba(50,36,74,0)');
  g.fillStyle = fg; g.fillRect(0, 0, 1600, H);
  g.fillStyle = '#37284E';
  for (let i = 0; i < 26; i++) {
    const bw = 90 + (i * 53) % 130, bh = 150 + (i * 97) % 200, bx = (i * 71) % 1600;
    g.fillRect(bx, 300 - bh * 0.25, bw, bh);
  }
  g.fillStyle = '#43305E';
  for (let i = 0; i < 14; i++) {
    const bw = 120 + (i * 41) % 90, bh = 220 + (i * 83) % 130, bx = (i * 137) % 1600;
    g.fillRect(bx, 620 - bh - 180, bw, bh);
    // lit windows
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      if ((i * 7 + r + c) % 3 === 0) { g.fillStyle = '#F2B24A'; g.fillRect(bx + 12 + c * 26, 620 - bh - 150 + r * 30, 10, 14); g.fillStyle = '#43305E'; }
    }
  }
  const t1 = l1;

  // L2: mid row — machiya + izakaya fronts + lanterns
  const l2 = canvas(1600, H);
  g = l2.getContext('2d');
  g.fillStyle = '#4E3550'; g.fillRect(0, 0, 1600, H);
  for (let b = 0; b < 4; b++) {
    const bx = b * 400, bw = 360, bh = 330;
    g.fillStyle = b % 2 ? '#5C3E52' : '#55394C';
    g.fillRect(bx, 620 - bh, bw, bh);
    // roof
    poly(g, [[bx - 18, 620 - bh], [bx + bw + 18, 620 - bh], [bx + bw - 20, 620 - bh - 34], [bx + 20, 620 - bh - 34]], '#332440');
    // shop front
    g.fillStyle = '#2C2038'; g.fillRect(bx + 20, 620 - bh + 60, bw - 40, bh - 60);
    // noren
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#3A5A8A' : '#33527E'; g.fillRect(bx + 30 + i * 78, 620 - 260, 66, 90); }
    // paper windows glow
    g.fillStyle = '#F2C86A'; g.globalAlpha = 0.85;
    g.fillRect(bx + 30, 620 - 140, 70, 60); g.fillRect(bx + bw - 100, 620 - 140, 70, 60);
    g.globalAlpha = 1;
    // sign board
    rr(g, bx + bw / 2 - 40, 620 - bh + 10, 80, 36, 4); g.fillStyle = '#7A2530'; g.fill();
    txt(g, '昼寝', bx + bw / 2, 620 - bh + 29, 22, '#F2E0B0');
    // hanging lanterns
    for (let i = 0; i < 3; i++) {
      const lx = bx + 60 + i * 140, ly = 620 - bh + 55;
      g.strokeStyle = '#2C2038'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, ly - 12); g.lineTo(lx, ly); g.stroke();
      ell(g, lx, ly + 16, 12, 15, '#D64545');
      // glow (baked)
      const glow = g.createRadialGradient(lx, ly + 16, 2, lx, ly + 16, 44);
      glow.addColorStop(0, 'rgba(255,190,110,0.5)'); glow.addColorStop(1, 'rgba(255,190,110,0)');
      g.fillStyle = glow; g.beginPath(); g.arc(lx, ly + 16, 44, 0, Math.PI * 2); g.fill();
    }
  }
  const t2 = l2;

  // L3: near foreground — poles, wires, eaves
  const l3 = canvas(1600, H);
  g = l3.getContext('2d');
  g.strokeStyle = '#1E1830'; g.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const px = 200 + i * 600;
    g.fillStyle = '#241C34'; g.fillRect(px - 5, 40, 10, 560);
    g.fillStyle = '#2C2440'; g.fillRect(px - 26, 60, 52, 14);
    // wires
    g.strokeStyle = '#1A1428'; g.lineWidth = 2.4;
    for (let w = 0; w < 3; w++) {
      g.beginPath(); g.moveTo(px - 400 + w * 10, 70 + w * 8);
      g.quadraticCurveTo(px + 200, 130 + w * 10, px + 400, 70 + w * 8);
      g.stroke();
    }
  }
  // eaves (top)
  poly(g, [[0, 0], [520, 0], [480, 66], [0, 66]], '#241C34');
  poly(g, [[1080, 0], [1600, 0], [1600, 66], [1120, 66]], '#241C34');
  const t3 = l3;

  return { height: H, layers: [t1, t2, t3] };
}

// ---------------- SKIES ----------------
export function buildSky(kind) {
  const cv = canvas(1024, 620);
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 620);
  if (kind === 'sunset') {
    grad.addColorStop(0, '#1B1533'); grad.addColorStop(0.45, '#5A3060'); grad.addColorStop(0.75, '#C86850'); grad.addColorStop(1, '#F2A868');
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 620);
    ell(g, 760, 300, 150, 150, 'rgba(255,228,160,0.25)');
    ell(g, 760, 300, 90, 90, '#FFE4A0');
    // clouds
    for (const [x, y, w] of [[180, 120, 260], [560, 200, 340], [820, 90, 300], [320, 60, 240]]) {
      g.fillStyle = 'rgba(240,180,150,0.35)';
      ell(g, x, y, w / 2, 26, 'rgba(240,180,150,0.35)');
      ell(g, x + w / 4, y - 14, w / 3.4, 22, 'rgba(240,180,150,0.35)');
    }
    // Fuji + pagoda silhouettes
    poly(g, [[40, 620], [210, 380], [420, 620]], '#45305A');
    poly(g, [[182, 396], [238, 396], [230, 380], [190, 380]], '#F0E4E8');
    for (let i = 0; i < 3; i++) {
      const px = 700 + i * 46, pw = 120 - i * 30, py = 620 - i * 34;
      poly(g, [[px - pw / 2 - 16, py + 10], [px + pw / 2 + 16, py + 10], [px + pw / 2 - 8, py - 14], [px - pw / 2 + 8, py - 14]], '#3E2C50');
      g.fillStyle = '#3E2C50'; g.fillRect(px - pw / 2 + 8, py - 14, pw - 16, 34);
    }
  } else if (kind === 'nara') {
    grad.addColorStop(0, '#1E2B4A'); grad.addColorStop(0.5, '#3E5A80'); grad.addColorStop(1, '#7A98B0');
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 620);
    ell(g, 800, 140, 60, 60, '#F5F0E0');
    ell(g, 800, 140, 100, 100, 'rgba(245,240,220,0.28)');
    for (const [x, y, w] of [[220, 100, 300], [600, 60, 260]]) {
      ell(g, x, y, w / 2, 24, 'rgba(255,255,255,0.3)');
      ell(g, x + w / 4, y - 12, w / 3.2, 20, 'rgba(255,255,255,0.3)');
    }
    // hills
    ell(g, 300, 640, 500, 200, '#4E7A4E'); ell(g, 820, 660, 500, 220, '#446E44');
  } else {
    grad.addColorStop(0, '#0D0B1A'); grad.addColorStop(1, '#1A1430');
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 620);
  }
  return cv;
}

// ---------------- PLATFORM TEXTURES ----------------
const platCache = new Map();
export function platformTex(renderer, type, w, h) {
  const key = `${type}|${Math.round(w)}|${Math.round(h)}`;
  if (platCache.has(key)) return platCache.get(key);
  const cv = document.createElement('canvas');
  const S = 2;
  cv.width = Math.min(w * S, 2048); cv.height = Math.min(h * S, 512);
  const g = cv.getContext('2d');
  g.scale(cv.width / w, cv.height / h);
  if (type === 'office') {
    // desk surface
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#C99B66'); grad.addColorStop(0.14, '#B98A5A');
    grad.addColorStop(0.16, '#A5764A'); grad.addColorStop(1, '#8A5A3A');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7A5433'; g.fillRect(0, 0, w, 2.4);
    for (let x = 6; x < w; x += 26) { g.strokeStyle = 'rgba(122,84,51,0.5)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, 4); g.bezierCurveTo(x + 6, h * 0.4, x - 4, h * 0.7, x + 3, h); g.stroke(); }
  } else if (type === 'beam') {
    g.fillStyle = '#4E4658'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5E5670'; g.fillRect(0, 0, w, h * 0.3);
    g.fillStyle = '#3A3344'; g.fillRect(0, h - 3, w, 3);
  } else if (type === 'roof') {
    g.fillStyle = '#5E5670'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4E4658'; g.fillRect(0, h * 0.55, w, h * 0.45);
    g.fillStyle = '#6E6680'; g.fillRect(0, 0, w, 4);
    for (let x = 20; x < w; x += 46) { g.strokeStyle = 'rgba(40,32,56,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 6); g.lineTo(x, h * 0.5); g.stroke(); }
  } else if (type === 'ground') {
    g.fillStyle = '#4E4A5E'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5E5A6E'; g.fillRect(0, 0, w, 6);
    for (let x = 12; x < w; x += 36) { ell(g, x, 14 + (x % 36), 8, 3, '#44405A'); }
  } else if (type === 'grass') {
    g.fillStyle = '#4E7A52'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5E8A5E'; g.fillRect(0, 0, w, 7);
    for (let x = 6; x < w; x += 14) { g.strokeStyle = '#3E6A44'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 8); g.quadraticCurveTo(x + 2, 3, x + 5, 6); g.stroke(); }
  }
  const tex = renderer.texture(cv);
  platCache.set(key, tex);
  return tex;
}

// Nara teaser scene (cutscene backdrop)
export function buildNaraScene() {
  const cv = canvas(1920, 620);
  const g = cv.getContext('2d');
  // distant park
  ell(g, 500, 700, 700, 260, '#4E7A4E');
  ell(g, 1500, 720, 700, 260, '#446E44');
  // pond
  ell(g, 980, 560, 300, 60, '#6A9AC0');
  ell(g, 980, 556, 220, 40, '#7AAACE');
  // big torii
  g.fillStyle = '#C9452E';
  g.fillRect(220, 120, 28, 440); g.fillRect(560, 120, 28, 440);
  poly(g, [[160, 130], [650, 130], [640, 96], [170, 96]], '#B23A2E');
  g.fillRect(180, 200, 448, 22);
  // stone lanterns
  for (const [x, y] of [[880, 420], [1320, 440]]) {
    rr(g, x - 8, y, 16, 90, 4); g.fillStyle = '#8A8578'; g.fill();
    rr(g, x - 20, y - 14, 40, 15, 4); g.fillStyle = '#7A7568'; g.fill();
    poly(g, [[x, y - 40], [x + 24, y - 12], [x - 24, y - 12]], '#9A9588');
    ell(g, x, y + 6, 5, 6, '#F2C86A');
  }
  // deer silhouettes group
  for (const [x, y, s] of [[760, 480, 0.8], [860, 520, 0.6], [1180, 500, 0.7], [1260, 530, 0.5], [1520, 470, 0.9]]) {
    g.save(); g.translate(x, y); g.scale(s, s);
    ell(g, 0, 0, 42, 24, '#6A5030');
    ell(g, 38, -22, 14, 12, '#6A5030');
    g.strokeStyle = '#5A4428'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(34, -32); g.lineTo(28, -52); g.moveTo(42, -32); g.lineTo(48, -54); g.stroke();
    for (const lx of [-24, -8, 12, 28]) { g.lineWidth = 5; g.beginPath(); g.moveTo(lx, 16); g.lineTo(lx + (lx > 0 ? 6 : -6), 46); g.stroke(); }
    g.restore();
  }
  return cv;
}
