/* TAG CITY — Sentinel-7 drone AI (pure, DOM-free, Node-testable).
   §9 cites: §3 threat-readability rules — 3-stage escalation readable at
   100px (patrol / suspicious / lock-on), rubber-band chase, near-miss
   (<85px gap), lunge strike (dodgeable by jump/dash), beam/eye interpolation.
   States: 0 patrol (eye dim, no beam), 1 suspicious (eye bright, beam sweeps),
   2 lock-on (eye white-hot, beam narrows, alert fires). */
// Pure threat-stage transition. Returns the new state (0/1/2).
// lockT accumulates while suspicious and close; decays when the gap opens.
export function threatStep(state, gap, lockT, dt) {
  if (state === 2) {
    // Lock breaks only when the hero opens real distance (earned escape).
    if (gap > 80) return { state: 0, lockT: 0, justLocked: false, justLost: true };
    return { state: 2, lockT, justLocked: false, justLost: false };
  }
  const s = gap > 100 ? 0 : 1;
  if (s === 1) {
    if (gap < 78) {
      const t = lockT + dt;
      if (t > 1.4) return { state: 2, lockT: t, justLocked: true, justLost: false };
      return { state: 1, lockT: t, justLocked: false, justLost: false };
    }
    return { state: 1, lockT: Math.max(0, lockT - dt * 3), justLocked: false, justLost: false };
  }
  return { state: 0, lockT: 0, justLocked: false, justLost: false };
}
// Rubber-band gap target: the drone breathes 42..150px behind the hero.
export function wantGap(tags, stumbling, dashing) {
  const w = 105 + tags * 5 - (stumbling ? 50 : 0) - (dashing ? 55 : 0);
  return w < 42 ? 42 : w > 150 ? 150 : w;
}
// Strike geometry (§3: lunge is dodgeable — jump or dash beats it).
export function canStrike(state, distX, heroAirY, mercy, dashing) {
  return state > 0 && distX < 48 && heroAirY > -70 && mercy <= 0 && dashing <= 0;
}
export function isNearMiss(state, distX, cooldown) {
  return state === 0 && distX < 85 && cooldown <= 0;
}
// Beam/eye display interpolation targets per threat stage (§3.2).
export function stageTargets(state) {
  return state === 0 ? { beam: 0, eye: 0.25 }
       : state === 1 ? { beam: 0.55, eye: 0.7 }
       :               { beam: 0.95, eye: 1.0 };
}
