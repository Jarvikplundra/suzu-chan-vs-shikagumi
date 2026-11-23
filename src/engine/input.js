// Input: keyboard + Gamepad (standard mapping / XBOX360 layout — Thrustmaster GPX in XInput mode)

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.padPrev = new Array(20).fill(false);
    this.padDownEdge = new Set();
    this.padReleaseEdge = new Set();
    this.gamepadConnected = false;
    this.mouseDown = false; this.mousePressed = false;
    this.mouseX = 0; this.mouseY = 0;
    this.axisX = 0; this.dpadX = 0;
    this.anyConfirmPressed = false;
    window.addEventListener('keydown', e => {
      if (!e.repeat) {
        this.down.add(e.code); this.pressed.add(e.code);
        this.anyConfirmPressed = true;
      }
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.down.delete(e.code); this.released.add(e.code); });
    window.addEventListener('mousedown', e => {
      this.canvas = e.target;
      this.mouseDown = true; this.mousePressed = true; this.anyConfirmPressed = true;
      const rect = e.target.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) / rect.width;
      this.mouseY = (e.clientY - rect.top) / rect.height;
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    window.addEventListener('gamepadconnected', e => { this.gamepadConnected = true; console.log('Gamepad:', e.gamepad.id); });
  }

  poll() {
    this.pressed.clear(); this.released.clear();
    this.padDownEdge.clear(); this.padReleaseEdge.clear();
    this.mousePressed = false; this.anyConfirmPressed = false;
    this.axisX = 0; this.dpadX = 0; this.anyPadPressed = false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.gamepadConnected = false;
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      this.gamepadConnected = true;
      const b = pad.buttons.map(btn => btn.pressed);
      const ax = pad.axes[0] || 0;
      if (Math.abs(ax) > 0.25) this.axisX = ax;
      const dpadL = b[14], dpadR = b[15], dpadU = b[12], dpadD = b[13];
      if (dpadL) this.dpadX = -1; if (dpadR) this.dpadX = 1;
      const map = { jump: b[0], back: b[1], attack: b[2], dash: b[3], scout: b[4], swarm: b[5], lt: (pad.buttons[6]&&pad.buttons[6].value)||0, rt:(pad.buttons[7]&&pad.buttons[7].value)||0, back_btn: b[8], start: b[9] };
      for (const k in map) {
        const now = !!map[k];
        if (now && !this.padPrev[k]) { this.padDownEdge.add(k); this.anyPadPressed = true; this.anyConfirmPressed = true; }
        if (!now && this.padPrev[k]) this.padReleaseEdge.add(k);
        this.padPrev[k] = now;
      }
      break; // first connected pad only
    }
  }

  key(code) { return this.down.has(code); }
  hitKey(code) { return this.pressed.has(code); }

  // unified actions
  action(name) {
    const t = this;
    switch (name) {
      case 'left': return t.key('ArrowLeft') || t.key('KeyA') || (navigator.getGamepads && t.gamepadConnected && (t.axisX < -0.25 || t.dpadX < 0));
      case 'right': return t.key('ArrowRight') || t.key('KeyD') || (navigator.getGamepads && t.gamepadConnected && (t.axisX > 0.25 || t.dpadX > 0));
      case 'jump': return t.key('Space') || t.key('KeyW') || t.key('ArrowUp') || t.key('KeyZ') || t.key('KeyK') || (t.gamepadConnected && (t.padPrev['jump']));
      case 'jumpHit': return t.hitKey('Space') || t.hitKey('KeyW') || t.hitKey('ArrowUp') || t.hitKey('KeyZ') || t.hitKey('KeyK') || (t.gamepadConnected && t.padDownEdge.has('jump'));
      case 'attack': return t.key('KeyJ') || t.key('KeyX') || (t.gamepadConnected && t.padPrev['attack']);
      case 'attackHit': return t.hitKey('KeyJ') || t.hitKey('KeyX') || (t.gamepadConnected && t.padDownEdge.has('attack'));
      case 'dash': return t.key('KeyL') || t.key('KeyC') || t.key('ShiftLeft') || (t.gamepadConnected && t.padPrev['dash']);
      case 'dashHit': return t.hitKey('KeyL') || t.hitKey('KeyC') || t.hitKey('ShiftLeft') || (t.gamepadConnected && t.padDownEdge.has('dash'));
      case 'scout': return t.key('KeyU') || t.key('KeyQ') || (t.gamepadConnected && t.padPrev['scout']);
      case 'scoutHit': return t.hitKey('KeyU') || t.hitKey('KeyQ') || (t.gamepadConnected && t.padDownEdge.has('scout'));
      case 'swarm': return t.key('KeyI') || t.key('KeyE') || (t.gamepadConnected && t.padPrev['swarm']);
      case 'swarmHit': return t.hitKey('KeyI') || t.hitKey('KeyE') || (t.gamepadConnected && t.padDownEdge.has('swarm'));
      case 'pause': return t.hitKey('Escape') || t.hitKey('Enter') || (t.gamepadConnected && t.padDownEdge.has('start'));
      case 'confirmHit': return t.hitKey('Enter') || t.hitKey('Space') || t.mousePressed || (t.gamepadConnected && (t.padDownEdge.has('jump') || t.padDownEdge.has('start')));
      case 'skipHit': return t.hitKey('KeyY') || (t.gamepadConnected && t.padDownEdge.has('back'));
      default: return false;
    }
  }

  endFrame() {
    // keep jumpHold semantics: pad jump held
    this.pressed.clear(); this.released.clear();
    this.padDownEdge.clear(); this.padReleaseEdge.clear();
    this.mousePressed = false;
  }
}
