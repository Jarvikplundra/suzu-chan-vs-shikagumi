// Art: shared palette + canvas helpers for procedural anime vector art

export const PAL = {
  skin: '#FFE0CC', skinShade: '#F5C6A8', blush: 'rgba(255,120,110,0.45)',
  hairBase: '#E8923F', hairDark: '#C8762B', hairLight: '#FFCE8A', hairDeep: '#A85E1E',
  eye: '#57C785', eyeDark: '#1F7A4A', eyeHi: '#EFFFF5', outline: '#2A1E14',
  tee: '#1C1820', teeHi: '#2E2838', white: '#F7F4EC',
  denim: '#46618F', denimHi: '#7A93BD', denimDark: '#33486B',
  thigh: '#141318', thighStripe: '#EFECE4',
  shoe: '#D64545', shoeDark: '#A82F2F', sole: '#F2EEE6',
  brown: '#8A5A34', fur: '#C69A6D', furDark: '#A87A4E', furHi: '#E2C29A',
  capy: '#9A7048', capyDark: '#7A5433', capyHi: '#C89B6E',
  yukata: '#5B7FA6', yukataDark: '#46608A', yukataPat: '#E8EEF2',
  deer: '#C69A6D', deerDark: '#A87A4E', antler: '#8A5A34', hoof: '#3A2C20',
  suit: '#22222B', suitHi: '#33333F', shadow: 'rgba(30,20,40,0.25)',
  coin: '#F5C542', coinDark: '#C99A1E', senbei: '#E8D9A8', nori: '#2F4A2A',
  hazard: '#E8B22A', hazardDark: '#C99A1E',
};

export function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function limb(g, x, y, a, len, w, color, cap = true) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.strokeStyle = color; g.lineWidth = w; g.lineCap = cap ? 'round' : 'butt';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, len); g.stroke();
  g.restore();
  return [x + Math.sin(a) * len, y + Math.cos(a) * len];
}

export function ell(g, x, y, rx, ry, fill, stroke = null, lw = 2) {
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}

export function poly(g, pts, fill, stroke = null, lw = 2) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}

export function txt(g, s, x, y, size, color, align = 'center', weight = '') {
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
  g.font = `${weight} ${size}px "Hiragino Sans","Yu Gothic","Noto Sans JP",sans-serif`;
  g.fillText(s, x, y);
}

// two-tone anime eye (big iris, glint, dark pupil core)
export function eye2(g, x, y, r, iris, irisDark) {
  ell(g, x, y, r, r * 1.25, '#FFF');
  ell(g, x, y + r * 0.1, r * 0.82, r * 1.05, irisDark);
  ell(g, x, y + r * 0.05, r * 0.7, r * 0.9, iris);
  ell(g, x - r * 0.25, y - r * 0.35, r * 0.28, r * 0.3, '#FFFFFF');
  ell(g, x + r * 0.2, y + r * 0.25, r * 0.12, r * 0.25, irisDark);
}

// soft shadow ellipse under characters
export function groundShadow(g, x, y, rx, ry) {
  g.save(); g.globalAlpha = 0.28; g.fillStyle = '#1A1026';
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore();
}
