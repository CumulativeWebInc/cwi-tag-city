/* TAG CITY 3D — world: neon-noir art-deco street canyon, 3D-first.
   Bible: dark slab towers, gold-trimmed deco frames, fire escapes, pink-lit
   storefronts; bg luminance ceiling #2A2A3A; gold earned-only; cyan cable
   ribbons = elevated set dressing ONLY; voxel-decay KILLED (never built).
   Perf: instanced towers, one scrolling street, pooled rain lines, no shadows,
   no bloom, no planar reflections (fake streaks, gear-ledger pattern). */
import * as THREE from "three";
import { PAL, SIGNS, MURAL_WORDS, DISTRICTS, TUNE, mulberry32 } from "./config.js";

const SEG_LEN = TUNE.segLen, SEG_COUNT = TUNE.segCount;
const STREET_W = 15; // half-width of street canyon floor

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/* ---------- facade textures: {map, emissive} per district ---------- */
function facadeTextures(districtId) {
  const map = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = PAL.towerCss; g.fillRect(0, 0, w, h);
    // tonal variation
    const rnd = mulberry32(districtId.length * 977 + 13);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.06)";
      g.fillRect(rnd() * w, rnd() * h, 20 + rnd() * 60, 20 + rnd() * 80);
    }
    // gold-trimmed deco frames (neon_row + heir flavor)
    if (districtId === "neon_row" || districtId === "murals") {
      g.strokeStyle = "rgba(255,201,60,0.5)"; g.lineWidth = 3;
      for (let y = 40; y < h; y += 128) { g.strokeRect(14, y, w - 28, 96); }
    }
    // fire-escape silhouettes (alleys)
    if (districtId === "alleys") {
      g.strokeStyle = "rgba(0,0,0,0.85)"; g.lineWidth = 5;
      for (let y = 60; y < h - 40; y += 110) {
        g.strokeRect(w * 0.2, y, w * 0.6, 34);
        g.beginPath(); g.moveTo(w * 0.2, y + 34); g.lineTo(w * 0.8, y + 34); g.stroke();
      }
    }
    // window grid
    const cols = 6, rows = 14;
    for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
      if (cy > 11) continue; // storefront band handled below
      const r = rnd();
      if (r < 0.28) {
        const warm = rnd();
        g.fillStyle = warm < 0.45 ? "rgba(0,229,255,0.85)" : warm < 0.75 ? "rgba(255,47,179,0.8)" : "rgba(255,243,214,0.75)";
        g.fillRect(14 + cx * 38, 16 + cy * 32, 24, 18);
      } else {
        g.fillStyle = "rgba(20,24,36,0.9)";
        g.fillRect(14 + cx * 38, 16 + cy * 32, 24, 18);
      }
    }
    // pink-lit storefront band (street level)
    const sg = g.createLinearGradient(0, h - 90, 0, h);
    sg.addColorStop(0, "rgba(255,122,217,0)"); sg.addColorStop(1, "rgba(255,122,217,0.55)");
    g.fillStyle = sg; g.fillRect(0, h - 90, w, 90);
    g.fillStyle = "rgba(255,122,217,0.9)";
    for (let cx = 0; cx < 4; cx++) g.fillRect(16 + cx * 60, h - 70, 44, 52);
  });
  const emissive = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    const rnd = mulberry32(districtId.length * 977 + 13);
    for (let cx = 0; cx < 6; cx++) for (let cy = 0; cy < 12; cy++) {
      const r = rnd();
      if (r < 0.28) {
        const warm = rnd();
        g.fillStyle = warm < 0.45 ? "#00E5FF" : warm < 0.75 ? "#FF2FB3" : "#FFF3D6";
        g.fillRect(14 + cx * 38, 16 + cy * 32, 24, 18);
      }
    }
    if (districtId === "neon_row" || districtId === "murals") {
      g.strokeStyle = "#FFC93C"; g.lineWidth = 3;
      for (let y = 40; y < h; y += 128) g.strokeRect(14, y, w - 28, 96);
    }
    g.fillStyle = "#FF7AD9";
    for (let cx = 0; cx < 4; cx++) g.fillRect(16 + cx * 60, h - 70, 44, 52);
  });
  return { map, emissive };
}

function signTexture(text, css) {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = "rgba(8,8,16,0.92)"; g.fillRect(0, 0, w, h);
    g.strokeStyle = css; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.font = "900 64px 'Arial Black', Arial, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = css; g.shadowBlur = 26; g.fillStyle = css;
    g.fillText(text, w / 2, h / 2 + 2);
    g.shadowBlur = 0; g.fillStyle = "#fff";
    g.font = "900 60px 'Arial Black', Arial, sans-serif";
    g.globalAlpha = 0.85; g.fillText(text, w / 2, h / 2 + 2);
  });
}

function asphaltTexture() {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = PAL.groundBaseCss; g.fillRect(0, 0, w, h);
    const rnd = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.022)" : "rgba(0,0,0,0.06)";
      g.beginPath(); g.arc(rnd() * w, rnd() * h, 6 + rnd() * 30, 0, 7); g.fill();
    }
    // puddle speckles — wet highlights
    for (let i =  0; i < 700; i++) {
      const a = 0.03 + rnd() * 0.1;
      g.fillStyle = `rgba(150,210,235,${a.toFixed(3)})`;
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2);
    }
    // faded lane dashes
    g.fillStyle = "rgba(255,201,60,0.28)";
    for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 3, y, 6, 30);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 16);
  return t;
}

function streakTexture() {
  const t = canvasTex(256, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const rnd = mulberry32(7);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w, ww = 4 + rnd() * 14, hh = 120 + rnd() * 300;
      const css = rnd() < 0.5 ? "0,229,255" : "255,47,179";
      const gr = g.createLinearGradient(0, 0, 0, hh);
      gr.addColorStop(0, `rgba(${css},0)`); gr.addColorStop(0.5, `rgba(${css},0.35)`); gr.addColorStop(1, `rgba(${css},0)`);
      g.fillStyle = gr; g.fillRect(x, rnd() * h * 0.3, ww, hh);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 6);
  return t;
}

export class World {
  constructor(scene, logoTex) {
    this.scene = scene;
    this.distance = 0;
    this.segCounter = 0;
    this.unlockedDistricts = ["neon_row"];
    // --- street: one long plane, texture scrolls ---
    this.asphaltTex = asphaltTexture();
    const streetMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.32, metalness: 0.55, map: this.asphaltTex,
    });
    this.street = new THREE.Mesh(new THREE.PlaneGeometry(STREET_W * 2, SEG_LEN * SEG_COUNT + 80), streetMat);
    this.street.rotation.x = -Math.PI / 2;
    this.street.position.set(0, 0, -SEG_LEN * SEG_COUNT / 2 + 30);
    scene.add(this.street);
    // --- wet reflection streaks ---
    this.streakTex = streakTexture();
    const streakMat = new THREE.MeshBasicMaterial({
      map: this.streakTex, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.streaks = new THREE.Mesh(new THREE.PlaneGeometry(STREET_W * 2, SEG_LEN * SEG_COUNT + 80), streakMat);
    this.streaks.rotation.x = -Math.PI / 2; this.streaks.position.set(0, 0.03, this.street.position.z);
    scene.add(this.streaks);
    // --- towers: one InstancedMesh per district ---
    this.towerGeo = new THREE.BoxGeometry(1, 1, 1);
    this.towerMeshes = {};
    this.facades = {};
    for (const d of DISTRICTS) {
      const { map, emissive } = facadeTextures(d.id);
      this.facades[d.id] = { map, emissive };
      const mat = new THREE.MeshStandardMaterial({
        map, emissiveMap: emissive, emissive: 0xffffff, emissiveIntensity: 0.9,
        roughness: 0.92, metalness: 0.05,
      });
      const im = new THREE.InstancedMesh(this.towerGeo, mat, SEG_COUNT * 12);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false;
      scene.add(im);
      this.towerMeshes[d.id] = im;
    }
    // --- signs (shared textures) ---
    this.signTexs = SIGNS.map(s => signTexture(s.text, s.css));
    // --- segments ---
    this.segments = [];
    this.tagWalls = [];
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
    for (let i = 0; i < SEG_COUNT; i++) this._addSegment(-i * SEG_LEN + SEG_LEN);
    // --- CWI billboard ---
    if (logoTex) {
      const bb = new THREE.Mesh(
        new THREE.PlaneGeometry(9, 9),
        new THREE.MeshBasicMaterial({ map: logoTex, transparent: false })
      );
      bb.position.set(-8.2, 16, -70); bb.rotation.y = Math.PI / 2.6;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(9.6, 9.6, 0.3),
        new THREE.MeshStandardMaterial({ color: PAL.gold, emissive: PAL.gold, emissiveIntensity: 0.35 }));
      frame.position.copy(bb.position); frame.rotation.copy(bb.rotation); frame.translateZ(-0.2);
      scene.add(bb); scene.add(frame);
      this.billboard = bb;
    }
    // --- rain: line streaks ---
    this._buildRain(scene);
  }

  _buildRain(scene) {
    const N = 650;
    this.rainN = N;
    const pos = new Float32Array(N * 6);
    this.rainVel = new Float32Array(N);
    this.rainPos = new Float32Array(N * 3);
    const rnd = mulberry32(99);
    for (let i = 0; i < N; i++) {
      this.rainPos[i * 3] = (rnd() - 0.5) * 36;
      this.rainPos[i * 3 + 1] = rnd() * 26;
      this.rainPos[i * 3 + 2] = -60 + rnd() * 80;
      this.rainVel[i] = 20 + rnd() * 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x9fc8e8, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.rain = new THREE.LineSegments(geo, mat);
    this.rain.frustumCulled = false;
    scene.add(this.rain);
  }

  setUnlocked(districtIds) { this.unlockedDistricts = districtIds; }

  _districtFor(counter) {
    const list = this.unlockedDistricts.length ? this.unlockedDistricts : ["neon_row"];
    return list[counter % list.length];
  }

  _addSegment(zFar) {
    const idx = this.segments.length;
    const districtId = this._districtFor(this.segCounter);
    const rnd = mulberry32(DISTRICTS.find(d => d.id === districtId).seed * 100003 + this.segCounter * 7919);
    const group = new THREE.Group();
    this.scene.add(group);
    const seg = { group, zFar, districtId, idx, counter: this.segCounter, rnd, towers: [], signs: [], cables: null, walls: [] };
    this._bakeSegment(seg);
    this.segments.push(seg);
    this.segCounter++;
    return seg;
  }

  _bakeSegment(seg) {
    const { rnd, group } = seg;
    const im = this.towerMeshes[seg.districtId];
    // towers: 6 per side — params stored; matrices laid out per-frame (world scrolls)
    seg.towers = [];
    for (let k = 0; k < 12; k++) {
      const side = k < 6 ? -1 : 1;
      seg.towers.push({
        x: side * (STREET_W + 3.5 + rnd() * 9),
        w: 6 + rnd() * 7, ht: 13 + rnd() * 26, dp: 6 + rnd() * 8,
        zc: -SEG_LEN / 2 + (rnd() - 0.5) * 8,
        slot: seg.idx * 12 + k, mesh: im,
      });
    }
    // signs: 2 per segment from Black's six
    for (let s = 0; s < 2; s++) {
      const si = (seg.counter * 2 + s) % this.signTexs.length;
      const side = (s % 2 === 0) ? -1 : 1;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 1.75),
        new THREE.MeshBasicMaterial({ map: this.signTexs[si], transparent: true })
      );
      mesh.position.set(side * (STREET_W + 0.6), 9 + rnd() * 6, seg.zFar - 8 - s * 14);
      mesh.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(mesh); seg.signs.push(mesh);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.signTexs[si], transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      glow.scale.set(10, 2.5, 1); glow.position.copy(mesh.position);
      group.add(glow); seg.signs.push(glow);
    }
    // cyan cable ribbons — ELEVATED set dressing ONLY (§4)
    if (seg.districtId === "elevated") {
      seg.cables = new THREE.Group();
      for (let c = 0; c < 3; c++) {
        const y = 15 + c * 2.2, zc = seg.zFar - 6 - c * 11;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-STREET_W - 2, y, zc),
          new THREE.Vector3(0, y - 3.2, zc),
          new THREE.Vector3(STREET_W + 2, y, zc));
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 20, 0.09, 6, false),
          new THREE.MeshBasicMaterial({ color: PAL.cyan }));
        seg.cables.add(tube);
      }
      group.add(seg.cables);
    }
    // tag walls: one per side, dynamic paint canvas
    for (const side of [-1, 1]) {
      const c = document.createElement("canvas"); c.width = 256; c.height = 160;
      const g = c.getContext("2d");
      this._paintWallBase(g, seg.districtId);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(6.4, 4),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      mesh.position.set(side * (STREET_W - 0.4), 2.4, seg.zFar - 20);
      mesh.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.5, 7),
        new THREE.MeshStandardMaterial({ color: 0x2A2A3A, emissive: PAL.cyan, emissiveIntensity: 0.25 }));
      frame.position.set(side * (STREET_W - 0.15), 2.4, seg.zFar - 20);
      group.add(mesh); group.add(frame);
      const wall = {
        mesh, canvas: c, ctx: g, tex, side, seg,
        progress: 0, done: false, painted: false,
        word: MURAL_WORDS[(seg.counter + (side < 0 ? 0 : 1)) % MURAL_WORDS.length],
        z: seg.zFar - 20,
      };
      seg.walls.push(wall); this.tagWalls.push(wall);
    }
  }

  _paintWallBase(g, districtId) {
    g.fillStyle = "#101016"; g.fillRect(0, 0, 256, 160);
    const rnd = mulberry32(districtId.length * 31 + 5);
    for (let i = 0; i < 26; i++) { // old tag scars
      g.fillStyle = `rgba(${rnd() < 0.5 ? "255,47,179" : "0,229,255"},${(0.04 + rnd() * 0.06).toFixed(2)})`;
      g.fillRect(rnd() * 220, rnd() * 130, 20 + rnd() * 40, 6 + rnd() * 14);
    }
    g.strokeStyle = "rgba(0,229,255,0.5)"; g.lineWidth = 4;
    g.strokeRect(6, 6, 244, 148);
    g.fillStyle = "rgba(244,246,255,0.55)"; g.font = "700 20px Arial";
    g.textAlign = "center"; g.fillText("FRESH WALL", 128, 34);
  }

  paintWall(wall, dt, magAmt, cyanAmt) {
    if (wall.done) return;
    const g = wall.ctx;
    for (let i = 0; i < 14; i++) {
      const mag = Math.random() < magAmt / (magAmt + cyanAmt + 0.001);
      g.fillStyle = mag ? "rgba(255,47,179,0.5)" : "rgba(0,229,255,0.5)";
      const x = 20 + Math.random() * 216, y = 44 + Math.random() * 100;
      g.beginPath(); g.arc(x, y, 3 + Math.random() * 9, 0, 7); g.fill();
    }
    wall.progress += dt / TUNE.tagTime;
    wall.tex.needsUpdate = true;
    if (wall.progress >= 1 && !wall.done) {
      wall.done = true;
      g.font = "900 44px 'Arial Black', Arial";
      g.textAlign = "center";
      g.shadowColor = "#FF2FB3"; g.shadowBlur = 18;
      g.fillStyle = "#FFF3D6";
      g.fillText(wall.word, 128, 108);
      g.shadowBlur = 0;
      wall.tex.needsUpdate = true;
    }
  }

  resetWall(wall, districtId, counter) {
    wall.progress = 0; wall.done = false; wall.painted = false;
    wall.word = MURAL_WORDS[(counter + (wall.side < 0 ? 0 : 1)) % MURAL_WORDS.length];
    this._paintWallBase(wall.ctx, districtId);
    wall.tex.needsUpdate = true;
  }

  _layoutTowers() {
    // world scrolls +Z past the hero: lay out every tower instance each frame
    const touched = new Set();
    for (const seg of this.segments) {
      for (const t of seg.towers) {
        this._p.set(t.x, t.ht / 2, t.zc + seg.zFar); this._q.identity(); this._s.set(t.w, t.ht, t.dp);
        this._m.compose(this._p, this._q, this._s);
        t.mesh.setMatrixAt(t.slot, this._m);
        touched.add(t.mesh);
      }
    }
    for (const m of touched) m.instanceMatrix.needsUpdate = true;
  }

  update(dt, speed) {
    const dz = speed * dt;
    this.distance += dz;
    this.asphaltTex.offset.y -= dz / (SEG_LEN * 8);
    this.streakTex.offset.y -= dz / (SEG_LEN * 8);
    // recycle segments
    for (const seg of this.segments) {
      seg.zFar += dz;
      seg.group.position.z += dz;
      if (seg.zFar > 34) {
        // move to front
        const shift = -SEG_COUNT * SEG_LEN;
        seg.zFar += shift; seg.group.position.z += shift;
        seg.counter = this.segCounter++;
        seg.districtId = this._districtFor(seg.counter);
        seg.rnd = mulberry32(DISTRICTS.find(d => d.id === seg.districtId).seed * 100003 + seg.counter * 7919);
        // clear old tag walls from registry (re-registered in _bakeSegment)
        for (const w of seg.walls) { const i = this.tagWalls.indexOf(w); if (i >= 0) this.tagWalls.splice(i, 1); }
        seg.group.clear();
        seg.signs = []; seg.walls = []; seg.cables = null;
        this._bakeSegment(seg);
      }
    }
    this._layoutTowers();
    // update wall world z (group offset + local)
    for (const w of this.tagWalls) {
      w.worldZ = w.mesh.position.z + w.seg.group.position.z;
      w.worldX = w.mesh.position.x;
    }
    // rain fall
    const pos = this.rain.geometry.attributes.position.array;
    const n = this.rainN;
    for (let i = 0; i < n; i++) {
      let y = this.rainPos[i * 3 + 1] - this.rainVel[i] * dt;
      if (y < 0) { y = 24 + Math.random() * 3; this.rainPos[i * 3 + 2] = -60 + Math.random() * 80; }
      this.rainPos[i * 3 + 1] = y;
      const x = this.rainPos[i * 3], z = this.rainPos[i * 3 + 2] + dz * 0.9;
      this.rainPos[i * 3 + 2] = z > 18 ? z - 80 : z;
      pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = this.rainPos[i * 3 + 2];
      pos[i * 6 + 3] = x + 0.06; pos[i * 6 + 4] = y + 0.85; pos[i * 6 + 5] = this.rainPos[i * 3 + 2];
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  setRainDensity(frac) {
    this.rainN = Math.floor(650 * frac);
    this.rain.geometry.setDrawRange(0, this.rainN * 2);
  }
}
