// mineru gl — WebGL2 sprite batch renderer
const VS = `#version 300 es
in vec2 aPos; in vec2 aUV; in vec4 aCol;
uniform mat3 uCam;
out vec2 vUV; out vec4 vCol;
void main(){ vec3 p = uCam * vec3(aPos,1.0); gl_Position = vec4(p.xy,0.0,1.0); vUV=aUV; vCol=aCol; }`;
const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
in vec2 vUV; in vec4 vCol;
out vec4 outColor;
void main(){ vec4 t = texture(uTex, vUV); outColor = t * vCol; }`;

const MAX_QUADS = 16384;
const FLOATS_PER_VERT = 8, VERTS_PER_QUAD = 6, FLOATS_PER_QUAD = FLOATS_PER_VERT * VERTS_PER_QUAD;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance', desynchronized: true });
    const gl = this.gl;
    if (!gl) throw new Error('WebGL2 not available');
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog); this.prog = prog;
    this.uCam = gl.getUniformLocation(prog, 'uCam');
    this.aPos = gl.getAttribLocation(prog, 'aPos');
    this.aUV = gl.getAttribLocation(prog, 'aUV');
    this.aCol = gl.getAttribLocation(prog, 'aCol');
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_QUADS * FLOATS_PER_QUAD * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aPos); gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(this.aUV); gl.vertexAttribPointer(this.aUV, 2, gl.FLOAT, false, 32, 8);
    gl.enableVertexAttribArray(this.aCol); gl.vertexAttribPointer(this.aCol, 4, gl.FLOAT, false, 32, 16);
    gl.enable(gl.BLEND);
    this.data = new Float32Array(MAX_QUADS * FLOATS_PER_QUAD);
    this.head = 0; this.curTex = null; this.curAdd = false;
    this.queue = []; // pending additive draws after normal ones
    this.stats = { quads: 0 };
  }

  resizeCssToWindow() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) { this.canvas.width = pw; this.canvas.height = ph; }
    return { w: pw, h: ph, dpr };
  }

  begin(cam) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // identity camera -> clip space [-1,1], y down
    gl.clearColor(0.027, 0.027, 0.05, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.head = 0; this.queue.length = 0; this.curTex = null; this.stats.quads = 0;
    this.setCam(cam);
  }

  setCam(cam) {
    const { cx, cy, vw, vh } = cam;
    const sx = 2 / vw, sy = 2 / vh;
    const tx = -(cx * sx), ty = -(cy * sy);
    const m = [sx, 0, 0, 0, sy, 0, tx, ty, 1];
    this.gl.uniformMatrix3fv(this.uCam, false, m);
    this.cam = { cx, cy, vw, vh };
  }

  texture(source) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    t.width = source.width; t.height = source.height;
    return t;
  }

  textureMipped(source) {
    const t = this.texture(source); const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    return t;
  }

  _vert(x, y, u, v, r, g, b, a) {
    const d = this.data, o = this.head;
    d[o] = x; d[o + 1] = y; d[o + 2] = u; d[o + 3] = v; d[o + 4] = r; d[o + 5] = g; d[o + 6] = b; d[o + 7] = a;
    this.head += 8;
  }

  // layer <0 -> behind everything previously issued (deferred into front of list is hard; caller orders draws)
  push(tex, x, y, w, h, u0, v0, u1, v1, cr, cg, cb, ca, rot = 0, additive = false) {
    const entry = { tex, x, y, w, h, u0, v0, u1, v1, cr, cg, cb, ca, rot };
    if (additive) this.queue.push(entry); else this._emit(entry, false);
  }

  _emit(e, additive) {
    if (this.curTex !== e.tex || this.curAdd !== additive || this.head + FLOATS_PER_QUAD > this.data.length) this.flush();
    this.curTex = e.tex; this.curAdd = additive;
    const { x, y, w, h, u0, v0, u1, v1, cr, cg, cb, ca, rot } = e;
    let hw = w / 2, hh = h / 2;
    let cA, sA, p;
    if (rot) { cA = Math.cos(rot); sA = Math.sin(rot); }
    const px = [
      [-hw, -hh], [hw, -hh], [hw, hh], [-hw, -hh], [hw, hh], [-hw, hh]
    ];
    const uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v0], [u1, v1], [u0, v1]];
    for (let i = 0; i < 6; i++) {
      const dx = px[i][0], dy = px[i][1];
      const wx = rot ? x + dx * cA - dy * sA : x + dx;
      const wy = rot ? y + dx * sA + dy * cA : y + dy;
      this._vert(wx, wy, uv[i][0], uv[i][1], cr, cg, cb, ca);
    }
    this.stats.quads++;
  }

  drawSprite(tex, x, y, scale = 1, rot = 0, alphaTint = 1, additive = false) {
    const u0 = 0, v0 = 0, u1 = 1, v1 = 1;
    this._emit({ tex, x, y, w: tex.width * scale, h: tex.height * scale, u0, v0, u1, v1, cr: 1, cg: 1, cb: 1, ca: alphaTint, rot }, additive);
  }

  // draw region of atlas: region {x,y,w,h} in atlas px, sx,sy = world center, scale multiplier
  atlas(tex, region, x, y, scale = 1, rot = 0, tint = [1, 1, 1, 1], additive = false, flip = false) {
    const u0 = (region.x + (flip ? region.w : 0)) / tex.width;
    const u1 = (region.x + (flip ? 0 : region.w)) / tex.width;
    const v0 = region.y / tex.height, v1 = (region.y + region.h) / tex.height;
    this._emit({ tex, x, y, w: region.w * scale, h: region.h * scale, u0, v0, u1, v1, cr: tint[0], cg: tint[1], cb: tint[2], ca: tint[3], rot }, additive);
  }

  flush() {
    if (this.head === 0) { this.curAdd = false; return; }
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, this.head));
    gl.bindTexture(gl.TEXTURE_2D, this.curTex);
    if (this.curAdd) gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.drawArrays(gl.TRIANGLES, 0, this.head / 8);
    this.head = 0;
  }

  endFrame() {
    this.flush();
    for (const e of this.queue) this._emit(e, true);
    this.queue.length = 0;
    this.flush();
  }
}
