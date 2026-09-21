/* ============================================================================
   TAG CITY — production build game.js (concatenated from game/src/)
   art-bible v1.0 traceability (§9) — every section below cites its bible
   sections; off-bible code is killed in review, no exceptions.
   PRODUCTION-RULES.md #1 "No downgrades ever" + #2 "Nothing dies — the team
   makes it live": the look ships exactly; the perf doctrine is the
   OPTIMIZATION LADDER (re-engineer, never delete, never kill the lane).
   §7 kill list honored throughout: zero ctx.shadowBlur (all glow is
   pre-rendered sprites), ≤150 pooled sprites, zero per-frame allocations,
   4-canvas layer split + DOM HUD, procedural-first VFX, no per-frame
   gradient/blur/filter passes, no render-target reflections, no per-frame
   noise, ≤3 fullscreen semi-transparent layers (vignette baked into the
   static sky; fog fades out under the red lock-on pulse), no continuous
   per-frame UI scaling (discrete combo-pop steps), no screen shake (red
   vignette pulse instead), hero anonymous + key-art locked, no real brands.
   ========================================================================== */
"use strict";
