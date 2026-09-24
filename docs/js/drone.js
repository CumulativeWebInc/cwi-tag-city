/* TAG CITY 3D — Sentinel-7 surveillance drone, 3D-first.
   Threat behavior carries the 2D design (src/droneAI.js — pure logic):
   3-stage escalation (patrol / suspicious / lock-on), rubber-band chase,
   near-miss, dodgeable lunge strikes, beam/eye interpolation. §1 rule 4:
   red is threat-only. */
import * as THREE from "three";
import { PAL, TUNE } from "./config.js";

/* --- threat AI: design carried from src/droneAI.js (units: meters) --- */
const M = TUNE.px2m;
export function threatStep(state, gap, lockT, dt) {
  if (state === 2) {
    if (gap > 80 * M) return { state: 0, lockT: 0, justLocked: false, justLost: true };
    return { state: 2, lockT, justLocked: false, justLost: false };
  }
  const s = gap > 100 * M ? 0 : 1;
  if (s === 1) {
    if (gap < 78 * M) {
      const t = lockT + dt;
      if (t > 1.4) return { state: 2, lockT: t, justLocked: true, justLost: false };
      return { state: 1, lockT: t, justLocked: false, justLost: false };
    }
    return { state: 1, lockT: Math.max(0, lockT - dt * 3), justLocked: false, justLost: false };
  }
  return { state: 0, lockT: 0, justLocked: false, justLost: false };
}
export function wantGap(tags, stumbling, dashing) {
  const w = (105 + tags * 5 - (stumbling ? 50 : 0) - (dashing ? 55 : 0)) * M;
  return Math.min(8.4, Math.max(2.4, w));
}
export function canStrike(state, distX, heroAirY, mercy, dashing) {
  // 3D-tuned: dodge by lane change (2.4m lanes vs 2.0m reach), jump (>0.7m),
  // or dash. heroAirY arrives as -hero.y (negative when airborne).
  return state > 0 && distX < 36 * M && heroAirY > -0.7 && mercy <= 0 && dashing <= 0;
}
export function isNearMiss(state, distX, cooldown) {
  return state === 0 && distX < 85 * M && cooldown <= 0;
}
export function stageTargets(state) {
  return state === 0 ? { beam: 0, eye: 0.25 } : state === 1 ? { beam: 0.55, eye: 0.7 } : { beam: 0.95, eye: 1.0 };
}

export class Drone {
  constructor(scene) {
    this.group = new THREE.Group();
    this.state = 0; this.lockT = 0; this.mercy = 2; this.nearCd = 0;
    this.strikeT = 0; // lunge animation timer
    this.beamI = 0; this.eyeI = 0.25;
    const gun = new THREE.MeshStandardMaterial({ color: PAL.gunmetal, roughness: 0.55, metalness: 0.5 });
    const darkPlate = new THREE.MeshStandardMaterial({ color: 0x1B1B24, roughness: 0.7 });
    // faceted hull
    this.hull = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 0.5, 6), gun);
    this.hull.rotation.x = Math.PI / 2;
    // 4 arms + rotor blur discs (pre-rendered look — never animated blades, §3)
    this.rotors = [];
    const armGeo = new THREE.BoxGeometry(1.7, 0.09, 0.14);
    const discGeo = new THREE.CircleGeometry(0.42, 20);
    const discMat = new THREE.MeshBasicMaterial({ color: 0xA0AABe, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const arm = new THREE.Mesh(armGeo, darkPlate);
      arm.position.set(sx * 0.75, 0.1, sz * 0.55); arm.rotation.y = sx * sz * 0.5;
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2; disc.position.set(sx * 1.35, 0.18, sz * 0.95);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.1),
        new THREE.MeshBasicMaterial({ color: PAL.cyan }));
      tip.position.set(sx * 1.35, 0.1, sz * 0.95);
      this.group.add(arm, disc, tip); this.rotors.push(disc);
    }
    // antenna fins
    for (const sx of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 4), darkPlate);
      fin.position.set(sx * 0.3, 0.45, -0.2);
      this.group.add(fin);
    }
    // red scan eye — the ONLY danger hue (§1 rule 4)
    this.eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12),
      new THREE.MeshBasicMaterial({ color: PAL.red }));
    this.eye.position.set(0, -0.05, 0.62);
    this.eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      color: PAL.red, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.eyeGlow.scale.set(1.4, 1.4, 1); this.eyeGlow.position.copy(this.eye.position);
    // searchlight cone + beam pool on the ground
    this.cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 7, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: PAL.red, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.cone.position.set(0, -3.4, 0.4); this.cone.rotation.x = 0.12;
    this.pool = new THREE.Mesh(new THREE.CircleGeometry(1.9, 24),
      new THREE.MeshBasicMaterial({ color: PAL.red, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.pool.rotation.x = -Math.PI / 2;
    this.group.add(this.hull, this.eye, this.eyeGlow, this.cone);
    scene.add(this.group); scene.add(this.pool);
    this.group.position.set(0, 6.5, 9);
    this.t = 0;
  }

  update(dt, hero, tags, speed) {
    this.t += dt;
    if (this.mercy > 0) this.mercy -= dt;
    if (this.nearCd > 0) this.nearCd -= dt;
    // rubber-band: breathe behind the hero
    const targetGap = wantGap(tags, false, hero.dash > 0);
    const p = this.group.position;
    const wantZ = targetGap, wantY = this.state === 2 ? 3.4 : 5.6 + Math.sin(this.t * 1.3) * 0.5;
    p.z += (wantZ - p.z) * Math.min(1, dt * 2.2);
    p.y += (wantY - p.y) * Math.min(1, dt * 2.5);
    p.x += (hero.x * 0.7 - p.x) * Math.min(1, dt * 3);
    // threat stage
    const gap = p.z; // hero at z=0
    const r = threatStep(this.state, gap, this.lockT, dt);
    if (r.justLocked) this.strikeT = 0.55; // lunge telegraph
    this.state = r.state; this.lockT = r.lockT;
    // beam/eye interpolation
    const tg = stageTargets(this.state);
    this.beamI += (tg.beam - this.beamI) * Math.min(1, dt * 5);
    this.eyeI += (tg.eye - this.eyeI) * Math.min(1, dt * 5);
    this.cone.material.opacity = this.beamI * 0.4;
    this.pool.material.opacity = this.beamI * 0.5;
    this.eyeGlow.material.opacity = 0.25 + this.eyeI * 0.6;
    this.eyeGlow.scale.setScalar(1 + this.eyeI * 1.2);
    // beam pool tracks the ground under the drone, stretched toward the hero
    this.pool.position.set(p.x * 0.8, 0.04, p.z - 2.2);
    this.pool.scale.set(1, 1.6, 1);
    // lunge strike visual: quick dip toward the hero
    if (this.strikeT > 0) {
      this.strikeT -= dt;
      const k = Math.sin((0.55 - this.strikeT) / 0.55 * Math.PI);
      p.y -= k * 1.6; p.z -= k * 2.2;
    }
    // rotor shimmer (opacity pulse only — blades never animated, §3)
    const shimmer = 0.18 + 0.08 * Math.sin(this.t * 31);
    for (const d of this.rotors) d.material.opacity = shimmer;
    // bank into turns
    this.group.rotation.z = (hero.x * 0.7 - p.x) * -0.1;
    this.group.rotation.y = (hero.x - p.x) * 0.06;
    return { state: this.state, gap, justLost: r.justLost };
  }

  tryStrike(hero) {
    // returns "strike" | "nearmiss" | null — game.js resolves consequences
    const dx = Math.abs(this.group.position.x - hero.x);
    const airY = hero.y; // 0 = grounded
    if (canStrike(this.state, dx, -airY, this.mercy, hero.dash)) return "strike";
    if (isNearMiss(this.state, dx, this.nearCd)) { this.nearCd = 3; return "nearmiss"; }
    return null;
  }
}
