/* TAG CITY — Neon Credits economy (pure, DOM-free, Node-testable).
   §9 cites: §1 rule 3 (gold is earned, not decor — credits are earned only,
   never purchasable), §6 (gold coin + gold digits credit display, PRIZE
   banner, +30 REFILL events), Twenty Minds #2 synthesis (credit-threshold
   unlocks; feats pay one-time injections, never gates; zero paywall code).
   Truth rules: no invented revenue — this wallet is in-game credits only.
   Nothing here touches money, wallets, or purchases. Ever. */
export const WALLET_KEY = "tagcity_wallet_v1";
// Fixed unlock prices — one auditable table (Twenty Minds #2).
export const PRICES = { ghost: 2500, heir: 6000, pixel: 12000 };
export const ROSTER_ORDER = ["artist", "prism", "ghost", "heir", "pixel"];
// Earn table: credits per event (tuning model documented below).
export const EARN = {
  tag: 150,            // clean wall tag
  nearMiss: 60,        // drone near-miss evasion
  runComplete: 50,     // per tag on run end (bust or quit)
  combo5: 200,         // one-time per run at combo milestones
  combo10: 500,
  combo15: 1000,
};
// Feat injections: one-time, celebrated, NEVER gates (Twenty Minds #2 dissent:
// the stories survive inside the credit economy).
export const FEATS = {
  ghost_protocol: { name: "GHOST PROTOCOL", desc: "Evade 10 drone lunges in one run", credits: 1500 },
  crown_jewel:    { name: "CROWN JEWEL",     desc: "Tag 25 walls (lifetime)",          credits: 2000 },
  marquee_lights: { name: "MARQUEE LIGHTS",  desc: "Tag a wall in all 4 locations",    credits: 2500 },
  clean_getaway:  { name: "CLEAN GETAWAY",    desc: "Finish a run with 0 strikes",      credits: 1000 },
};
/* Tuning model (Twenty Minds #2 tuning gate): a 3-min run tags ~8 walls
   (8×150=1200) + ~4 near-misses (240) + completion (400) ≈ 1800–2000 credits.
   GHOST (2500) ≈ 2 runs (~10 min); HEIR (6000) ≈ 4 runs; PIXEL (12000) ≈ 8
   runs (~30 min). Full roster ≈ 45 min of play. If playtest median
   time-to-GHOST exceeds ~90 min, prices drop before lock. */
export function createWallet() {
  return {
    v: 1, credits: 0,
    unlocked: { artist: true, prism: true, ghost: false, heir: false, pixel: false },
    featsPaid: {},                       // featId → true (one-time enforcement)
    totals: { tags: 0, runs: 0, nearMisses: 0, evasions: 0, locationsTagged: {} },
  };
}
export function loadWallet(storage) {
  try {
    const raw = storage.getItem(WALLET_KEY);
    if (!raw) return createWallet();
    const w = JSON.parse(raw);
    if (!w || w.v !== 1 || typeof w.credits !== "number") return createWallet();
    const base = createWallet();
    return Object.assign(base, w, {
      unlocked: Object.assign(base.unlocked, w.unlocked || {}),
      featsPaid: w.featsPaid || {},
      totals: Object.assign(base.totals, w.totals || {}),
    });
  } catch (e) { return createWallet(); }
}
export function saveWallet(storage, w) {
  try { storage.setItem(WALLET_KEY, JSON.stringify(w)); } catch (e) {}
}
export function canAfford(w, id) {
  return !w.unlocked[id] && PRICES[id] !== undefined && w.credits >= PRICES[id];
}
// Spend unlock. Returns true on success. No paywall path exists — this is the
// ONLY unlock function and it takes credits, never money.
export function unlock(w, id) {
  if (w.unlocked[id] || PRICES[id] === undefined || w.credits < PRICES[id]) return false;
  w.credits -= PRICES[id];
  w.unlocked[id] = true;
  return true;
}
export function earn(w, n) {
  if (n > 0) w.credits += Math.round(n);
  return w.credits;
}
// Feat injection: pays once, then marks paid. Returns credits paid (0 if dup).
export function payFeat(w, featId) {
  const f = FEATS[featId];
  if (!f || w.featsPaid[featId]) return 0;
  w.featsPaid[featId] = true;
  w.credits += f.credits;
  return f.credits;
}
// Track hook per location — artist catalog integration POINT (data structure).
// trackId values below are VERIFIED (Spotify, 2026-09-16 — never swap them):
//   Zooted Zone = 0emH8ktA8x4DkOFLsG5xkW · Diabolique = 2eSyWmIdPzEMyWejLb2LBj
// null = slot reserved; wire a VERIFIED catalog ID only — never invent one.
// This hook makes no claim of placement, streams, or revenue.
export const TRACK_SLOTS = {
  neon_row:   { trackId: "2eSyWmIdPzEMyWejLb2LBj", title: "Diabolique" },
  the_alleys: { trackId: "0emH8ktA8x4DkOFLsG5xkW", title: "Zooted Zone" },
  elevated:   { trackId: null, title: null },  // reserved — verified ID only
  murals:     { trackId: null, title: null },  // reserved — verified ID only
};
