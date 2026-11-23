// mineru engine — bootstrap
import { Game } from './game/game.js';
import { Audio } from './engine/audio.js';

const glCanvas = document.getElementById('glCanvas');
const uiCanvas = document.getElementById('uiCanvas');

const game = new Game(glCanvas, uiCanvas);
window.__game = game;

const unlock = () => { Audio.ensure(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

async function boot() {
  try { await Promise.all(['400','700','900'].map(w => document.fonts.load(w + ' 26px "Noto Sans JP"', 'スズちゃん'))); } catch (e) {}
  await game.preloadAssets();
  game.toTitle();
  const bootEl = document.getElementById('boot');
  bootEl.style.opacity = '0';
  setTimeout(() => bootEl.remove(), 700);

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot().catch(err => {
  console.error(err);
  const el = document.getElementById('boot');
  if (el) el.textContent = 'LOAD ERROR: ' + err.message;
});
