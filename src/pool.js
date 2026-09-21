/* TAG CITY — fixed sprite pools (browser module; logic is DOM-free).
   §9 cites: §7.3 (un-pooled particle spawning is a fail — every particle from
   a fixed pool), §7.10 (zero per-frame allocation — pools preallocated,
   recycled by index), perf-spike §1 (150 live pooled sprites locked). */
export const PMAX = 150; // locked ceiling — perf-spike §1
export function makePools() {
  const parts = [];
  for (let i = 0; i < PMAX; i++)
    parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 8, spr: null, grav: 0, add: true });
  const popups = [];
  for (let i = 0; i < 14; i++)
    popups.push({ on: false, x: 0, y: 0, vy: 0, life: 0, max: 1, text: "", color: "#fff", size: 24 });
  const rings = [];
  for (let i = 0; i < 8; i++)
    rings.push({ on: false, x: 0, y: 0, r: 10, vr: 0, life: 0, max: 1, spr: null });
  const pools = {
    parts, popups, rings, pcur: 0, popcur: 0, ringcur: 0, live: 0, maxLive: 0,
    spawnP(x, y, vx, vy, life, size, spr, grav, add) {
      const p = parts[pools.pcur]; pools.pcur = (pools.pcur + 1) % PMAX;
      p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.max = life; p.size = size; p.spr = spr;
      p.grav = grav || 0; p.add = add !== false;
      return p;
    },
    popup(x, y, text, color, size) {
      const p = popups[pools.popcur]; pools.popcur = (pools.popcur + 1) % 14;
      p.on = true; p.x = x; p.y = y; p.vy = -56; p.life = 1.4; p.max = 1.4;
      p.text = text; p.color = color || "#EEF0FF"; p.size = size || 24;
    },
    ring(x, y, spr, vr, life) {
      const r = rings[pools.ringcur]; pools.ringcur = (pools.ringcur + 1) % 8;
      r.on = true; r.x = x; r.y = y; r.r = 12; r.vr = vr; r.life = life; r.max = life; r.spr = spr;
    },
    // Per-frame pool step — zero allocation, fixed iteration.
    step(dt) {
      let live = 0;
      for (let i = 0; i < PMAX; i++) {
        const p = parts[i];
        if (!p.on) continue;
        live++;
        p.life -= dt;
        if (p.life <= 0) { p.on = false; continue; }
        p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      }
      pools.live = live;
      if (live > pools.maxLive) pools.maxLive = live;
      for (let i = 0; i < 14; i++) {
        const p = popups[i];
        if (!p.on) continue;
        p.life -= dt;
        if (p.life <= 0) { p.on = false; continue; }
        p.y += p.vy * dt; p.vy *= (1 - dt * 2);
      }
      for (let i = 0; i < 8; i++) {
        const r = rings[i];
        if (!r.on) continue;
        r.life -= dt;
        if (r.life <= 0) { r.on = false; continue; }
        r.r += r.vr * dt;
      }
    },
    clear() {
      for (const p of parts) p.on = false;
      for (const p of popups) p.on = false;
      for (const r of rings) r.on = false;
      pools.live = 0;
    }
  };
  return pools;
}
