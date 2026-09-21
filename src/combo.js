/* TAG CITY — combo math (pure, DOM-free, Node-testable).
   §9 cites: §5.6 combo language (magenta badge, MULTIPLIER 1.5x reference,
   discrete badge pop steps — never continuous scaling), §6 credit display. */
export const COMBO_WINDOW = 4.0;   // seconds to keep the combo alive
export const COMBO_CAP = 8;        // multiplier stops growing here
// Multiplier: 1 + 0.25 × min(combo, 8) — matches hud-ui.png "MULTIPLIER 1.5x" at x2.
export function mult(combo) {
  return 1 + 0.25 * Math.min(combo < 0 ? 0 : combo, COMBO_CAP);
}
// Discrete badge pop tier for §5.6 (0/1/2) — stepped transforms only.
export function comboTier(comboT) {
  return comboT > 3 ? 2 : comboT > 1.2 ? 1 : 0;
}
// Pure combo step: returns {combo, comboT, broken} — no side effects.
export function comboStep(combo, comboT, dt, event) {
  if (event === "tag" || event === "nearmiss") {
    return { combo: event === "tag" ? combo + 1 : combo, comboT: COMBO_WINDOW, broken: false };
  }
  if (event === "break") return { combo: 0, comboT: 0, broken: true };
  const t = comboT - dt;
  if (t <= 0) return { combo: 0, comboT: 0, broken: combo > 0 };
  return { combo, comboT: t, broken: false };
}
