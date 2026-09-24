/* TAG CITY 3D — pooled GPU point particles (spray streams, bursts, trails).
   Zero per-frame allocation: fixed Float32 buffers, freelist reuse. */
import * as THREE from "three";

function streakTexture() {
  const c = document.createElement("canvas"); c.width = 16; c.height = 16;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(8, 8, 1, 8, 8, 8);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.4, "rgba(255,255,255,.55)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 16, 16);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class ParticlePool {
  constructor(scene, max = 600) {
    this.max = max; this._cap = max; this.n = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);      // remaining
    this.life0 = new Float32Array(max);     // initial
    this.size = new Float32Array(max);
    this.grav = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.22, map: streakTexture(), transparent: true,
      vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.geo = geo;
    scene.add(this.points);
    this._c = new THREE.Color();
  }
  spawn(x, y, z, vx, vy, vz, life, size, hex, grav = 0) {
    const i = this.n < this.max ? this.n++ : (Math.random() * this.max) | 0;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = life; this.life0[i] = life; this.size[i] = size; this.grav[i] = grav;
    this._c.setHex(hex);
    this.col[i * 3] = this._c.r; this.col[i * 3 + 1] = this._c.g; this.col[i * 3 + 2] = this._c.b;
  }
  burst(x, y, z, count, hex, speed = 4, life = 0.7, size = 1, up = 2) {
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      this.spawn(x, y, z, Math.cos(a) * s, up * Math.random() + 1, Math.sin(a) * s,
        life * (0.6 + Math.random() * 0.6), size, hex, 6);
    }
  }
  update(dt) {
    let w = 0;
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) continue;
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (i !== w) {
        for (let k = 0; k < 3; k++) {
          this.pos[w * 3 + k] = this.pos[i * 3 + k];
          this.vel[w * 3 + k] = this.vel[i * 3 + k];
          this.col[w * 3 + k] = this.col[i * 3 + k];
        }
        this.life[w] = this.life[i]; this.life0[w] = this.life0[i];
        this.size[w] = this.size[i]; this.grav[w] = this.grav[i];
      }
      w++;
    }
    this.n = w;
    this.geo.setDrawRange(0, this.n);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
  setBudget(max) { this.max = Math.min(max, this._cap || 600); this._cap = this._cap || 600; if (this.n > this.max) this.n = this.max; }
}
