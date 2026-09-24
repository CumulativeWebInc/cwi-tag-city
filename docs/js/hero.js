/* TAG CITY 3D — hero: procedural hooded runner, 3D-first.
   Spec: hooded hero, vest with the crown emblem, magenta can LEFT,
   cyan can RIGHT. Zero external assets — all geometry + canvas textures. */
import * as THREE from "three";
import { PAL } from "./config.js";

function crownTexture() {
  const c = document.createElement("canvas"); c.width = 128; c.height = 128;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 128, 128);
  // crown emblem — gold, earned-only color telling the hero's rank
  g.fillStyle = "#FFC93C"; g.strokeStyle = "#E09E1F"; g.lineWidth = 4;
  g.beginPath();
  g.moveTo(24, 96); g.lineTo(24, 52); g.lineTo(44, 70); g.lineTo(64, 34);
  g.lineTo(84, 70); g.lineTo(104, 52); g.lineTo(104, 96); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = "#E09E1F";
  g.beginPath(); g.arc(24, 48, 7, 0, 7); g.arc(64, 30, 7, 0, 7); g.arc(104, 48, 7, 0, 7); g.fill();
  g.fillStyle = "#FF2FB3"; g.beginPath(); g.arc(64, 66, 7, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Hero {
  constructor(scene, scheme) {
    this.scheme = scheme;
    this.group = new THREE.Group();
    this.lane = 0; this.x = 0; this.y = 0; this.vy = 0;
    this.grounded = true; this.slide = 0; this.dash = 0;
    this.runT = 0; this.spraying = false;
    const hoodie = new THREE.MeshStandardMaterial({ color: scheme.hoodie, roughness: 0.85 });
    const trim = new THREE.MeshStandardMaterial({ color: scheme.trim, emissive: scheme.trim, emissiveIntensity: 0.55 });
    const skin = new THREE.MeshStandardMaterial({ color: 0x2A1E16, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0E0E14, roughness: 0.9 });

    // legs
    this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.85, 0.24), dark);
    this.legR = this.legL.clone();
    this.legL.position.set(-0.16, 0.43, 0); this.legR.position.set(0.16, 0.43, 0);
    // torso (hoodie)
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.36), hoodie);
    this.torso.position.y = 1.24;
    // vest with crown emblem (front + back planes)
    const crownTex = crownTexture();
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x14141C, roughness: 0.7 });
    this.vest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.6, 0.42), vestMat);
    this.vest.position.y = 1.26;
    const emblemMat = new THREE.MeshBasicMaterial({ map: crownTex, transparent: true });
    const embBack = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), emblemMat);
    embBack.position.set(0, 1.32, 0.215); // faces the rear camera — the mark reads
    const embFront = embBack.clone(); embFront.position.z = -0.215; embFront.rotation.y = Math.PI;
    this.vestTrim = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.44), trim);
    this.vestTrim.position.y = 1.0;
    // arms
    this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.2), hoodie);
    this.armR = this.armL.clone();
    this.armL.position.set(-0.42, 1.28, 0); this.armR.position.set(0.42, 1.28, 0);
    // hands hold the cans: MAGENTA left, CYAN right (spec)
    const canGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.26, 10);
    this.canL = new THREE.Mesh(canGeo, new THREE.MeshStandardMaterial({
      color: PAL.mag, emissive: PAL.mag, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.4 }));
    this.canR = new THREE.Mesh(canGeo, new THREE.MeshStandardMaterial({
      color: PAL.cyan, emissive: PAL.cyan, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.4 }));
    this.canL.position.set(-0.42, 0.86, 0.12); this.canR.position.set(0.42, 0.86, 0.12);
    // head + hood
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skin);
    this.head.position.y = 1.86;
    this.hood = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hoodie);
    this.hood.position.y = 1.88; this.hood.rotation.x = -0.5;
    this.hoodPeak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), hoodie);
    this.hoodPeak.position.set(0, 2.1, 0.1); this.hoodPeak.rotation.x = 0.5;

    this.group.add(this.legL, this.legR, this.torso, this.vest, embBack, embFront,
      this.vestTrim, this.armL, this.armR, this.canL, this.canR, this.head, this.hood, this.hoodPeak);
    // hero runs toward -Z; face away from the rear camera
    this.group.rotation.y = Math.PI;
    scene.add(this.group);
  }

  setScheme(scheme) {
    this.scheme = scheme;
    this.torso.material.color.setHex(scheme.hoodie);
    this.hood.material.color.setHex(scheme.hoodie);
    this.hoodPeak.material.color.setHex(scheme.hoodie);
    this.armL.material.color.setHex(scheme.hoodie);
    this.armR.material.color.setHex(scheme.hoodie);
    this.vestTrim.material.color.setHex(scheme.trim);
    this.vestTrim.material.emissive.setHex(scheme.trim);
  }

  update(dt, speed) {
    this.runT += dt * (4 + speed * 0.35);
    const s = Math.sin(this.runT), c = Math.cos(this.runT);
    const sliding = this.slide > 0, dashing = this.dash > 0;
    if (this.grounded && !sliding) {
      this.legL.rotation.x = s * 0.95; this.legR.rotation.x = -s * 0.95;
      this.armL.rotation.x = -s * 0.8; this.armR.rotation.x = s * 0.8;
      this.group.position.y = this.y + Math.abs(c) * 0.07;
      this.torso.rotation.x = dashing ? 0.42 : 0.14;
    } else if (sliding) {
      this.legL.rotation.x = -1.2; this.legR.rotation.x = -1.35;
      this.armL.rotation.x = 0.6; this.armR.rotation.x = 0.6;
      this.group.position.y = this.y + 0.15;
      this.torso.rotation.x = -0.5;
    } else {
      this.legL.rotation.x = 0.5; this.legR.rotation.x = -0.35;
      this.group.position.y = this.y;
      this.torso.rotation.x = 0.05;
    }
    // cans pump while spraying
    const pump = this.spraying ? Math.sin(this.runT * 3.2) * 0.06 : 0;
    this.canL.position.y = 0.86 + pump; this.canR.position.y = 0.86 - pump;
    // lane glide
    const targetX = [-2.4, 0, 2.4][this.lane + 1];
    this.x += (targetX - this.x) * Math.min(1, dt * 10);
    this.group.position.x = this.x;
    this.group.rotation.z = (targetX - this.x) * -0.12; // lean into the lane change
  }

  canTip(side) {
    // world-space tip of the left(-1)/right(+1) can — spray emits here
    const can = side < 0 ? this.canL : this.canR;
    const v = new THREE.Vector3();
    can.getWorldPosition(v); v.y += 0.16;
    return v;
  }
}
