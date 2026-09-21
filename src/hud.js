/* TAG CITY — DOM HUD (the locked layer split: HUD as DOM, not canvas).
   §9 cites: §6 (panel language — gold frame = score/credits earned, cyan =
   system, pink = combo, red dashed = alerts; score digits tabular, no layout
   jitter; gold coin + gold digits credit display; paint meter pink→cyan w/
   drip edge; minimap — red dots ONLY, cyan streets, white hero arrow; combo
   badge discrete pop steps; hint line; circular buttons gold=DASH pink=SPRAY
   cyan=pause; PRIZE banner gold frame; refill +30 pink text), perf-spike §3
   (HUD as DOM — score/timer/objective are text; canvas text re-raster is
   pure waste), §7.8 (no continuous per-frame UI scaling).
   Update discipline: text writes only when the value CHANGES (cached), so
   the DOM costs ~zero per frame. */
export function makeHUD(PAL) {
  const H = { els: {}, cache: {} };
  function el(tag, cls, parent, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    parent.appendChild(e);
    return e;
  }
  H.build = function (root, SPR, callbacks) {
    H.cb = callbacks;
    const hud = el("div", "tc-hud", root);
    H.els.hud = hud;
    // logo — baked art, never typeset (§6)
    const logo = el("canvas", "tc-logo", hud);
    logo.width = 196; logo.height = 85;
    logo.getContext("2d").drawImage(SPR.logo, 8, 4, 196, 85, 0, 0, 196, 85);
    // score — gold frame = earned
    const score = el("div", "tc-panel tc-gold", hud);
    el("div", "tc-label", score, "SCORE");
    H.els.score = el("div", "tc-score", score, "000000");
    H.els.time = el("div", "tc-time", score, "00:00");
    // credits wallet — gold coin + gold digits (§6)
    const cred = el("div", "tc-panel tc-gold tc-credits", hud);
    el("div", "tc-label", cred, "NEON CREDITS");
    H.els.credits = el("div", "tc-credits-num", cred, "◉ 0");
    // objective — cyan frame = system
    const obj = el("div", "tc-panel tc-cyan tc-obj", hud);
    el("div", "tc-label", obj, "OBJECTIVE");
    H.els.objTags = el("div", "tc-obj-tags", obj, "TAG THE WALLS 0/5");
    H.els.wanted = el("div", "tc-wanted", obj, "");
    // combo — pink frame, discrete pop steps (§5.6, §7.8)
    const combo = el("div", "tc-combo", hud);
    H.els.comboBadge = el("canvas", "", combo);
    H.els.comboBadge.width = 150; H.els.comboBadge.height = 84;
    H.els.comboBadge.getContext("2d").drawImage(SPR.combo, 0, 0);
    H.els.comboNum = el("div", "tc-combo-num", combo, "");
    H.els.comboMult = el("div", "tc-combo-mult", combo, "");
    H.els.combo = combo;
    // paint meter — cyan frame = system
    const paint = el("div", "tc-panel tc-cyan tc-paint", hud);
    el("div", "tc-label", paint, "PAINT");
    const pwrap = el("div", "tc-paint-wrap", paint);
    H.els.paintFill = el("div", "tc-paint-fill", pwrap);
    H.els.paintPct = el("div", "tc-paint-pct", paint, "100%");
    // minimap — red dots = drones only
    const mapw = el("div", "tc-panel tc-mapw", hud);
    H.els.map = el("canvas", "tc-map", mapw);
    H.els.map.width = 116; H.els.map.height = 116;
    // buttons — gold DASH, pink SPRAY, cyan pause
    H.els.btnDash = el("button", "tc-btn tc-dash", hud, "DASH");
    H.els.btnSpray = el("button", "tc-btn tc-spray", hud, "SPRAY");
    H.els.btnPause = el("button", "tc-btn tc-pause", hud, "II");
    H.els.btnSpray.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); callbacks.setSpray(true); });
    H.els.btnSpray.addEventListener("pointerup", (e) => { e.preventDefault(); callbacks.setSpray(false); });
    H.els.btnSpray.addEventListener("pointercancel", () => callbacks.setSpray(false));
    H.els.btnSpray.addEventListener("pointerleave", () => callbacks.setSpray(false));
    H.els.btnDash.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); callbacks.doDash(); });
    H.els.btnPause.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); callbacks.togglePause(); });
    // joystick visual — dark disc, cyan chevrons (§6)
    const joy = el("div", "tc-joy", root);
    H.els.joyBase = joy;
    H.els.joyKnob = el("div", "tc-joy-knob", joy, "▲");
    // banners
    H.els.alert = el("div", "tc-banner tc-alert", root, "DRONE LOCK-ON — EVADE!");
    H.els.prize = el("div", "tc-banner tc-prize", root, "");
    H.els.hint = el("div", "tc-hint", root, "HOLD TO SPRAY • SWIPE TO DODGE");
    H.els.fps = el("div", "tc-fps", root, "");
    // overlays
    H.buildTitle(root, SPR);
    H.buildBusted(root);
    H.buildPaused(root);
    return H;
  };
  H.set = function (e, v) { // cached text write — DOM costs ~zero per frame
    if (H.cache[e] !== v) { H.cache[e] = v; H.els[e].textContent = v; }
  };
  H.update = function (S, wallet, fpsTxt) {
    if (H.els.hud.style.display === "none") return;
    H.set("score", String(Math.floor(S.score)).padStart(6, "0"));
    H.set("time", fmtT(S.runT));
    H.set("credits", "◉ " + wallet.credits.toLocaleString("en-US"));
    H.set("objTags", "TAG THE WALLS  " + S.tags + "/" + S.tagsGoal);
    let wd = "";
    for (let i = 0; i < 3; i++) wd += i < S.wanted ? "●" : "○";
    H.set("wanted", wd);
    H.els.wanted.style.color = PAL.red;
    // combo — discrete steps only (§7.8)
    if (S.combo >= 2) {
      H.els.combo.style.display = "block";
      const tier = S.comboT > 3 ? 2 : S.comboT > 1.2 ? 1 : 0;
      H.els.combo.className = "tc-combo tc-pop" + tier;
      H.set("comboNum", "x" + S.combo);
      H.set("comboMult", "MULT " + (1 + 0.25 * Math.min(S.combo, 8)).toFixed(2) + "x");
    } else H.els.combo.style.display = "none";
    // paint meter
    const pc = Math.round(S.paint);
    H.set("paintPct", pc + "%");
    H.els.paintFill.style.height = Math.max(1, pc * 2) + "px";
    // alert / prize / hint / fps
    H.els.alert.style.display = (S.drone.state === 2 && !S.paused) ? "block" : "none";
    H.els.hint.style.display = (S.runT < 9 && !S.paused) ? "block" : "none";
    if (fpsTxt) H.set("fps", fpsTxt);
    // dash cooldown dim
    H.els.btnDash.style.opacity = S.hero.dashCd > 0 ? 0.45 : 1;
    H.els.btnSpray.classList.toggle("held", S.sprayHeld);
  };
  H.drawMinimap = function (S, HERO_X, FEET_Y) {
    const g = H.els.map.getContext("2d");
    g.clearRect(0, 0, 116, 116);
    g.drawImage(H.cb.SPR.map, 0, 0);
    // hero arrow — paint-white (§6)
    g.fillStyle = PAL.paintWhite;
    g.beginPath(); g.moveTo(58, 44); g.lineTo(50, 60); g.lineTo(66, 60); g.closePath(); g.fill();
    // drones — RED DOTS ONLY (§6)
    const dot = (wx, wy, r, a) => {
      const dx = Math.max(-46, Math.min(46, (wx - HERO_X) / 5));
      const dy = Math.max(-46, Math.min(46, (wy - (FEET_Y - 160)) / 5));
      g.globalAlpha = a; g.fillStyle = PAL.red;
      g.beginPath(); g.arc(58 + dx, 58 + dy, r, 0, 6.2832); g.fill();
      g.globalAlpha = 1;
    };
    dot(S.drone.x, S.drone.y, 6, 0.95);
    for (const p of S.patrols) if (p.on) dot(p.x, p.y, 3.5, 0.8);
    if (S.drone.state === 2) {
      g.strokeStyle = PAL.red; g.lineWidth = 3;
      g.beginPath(); g.arc(58, 58, 50 + 4 * Math.sin(S.t * 10), 0, 6.2832); g.stroke();
    }
  };
  H.banner = function (kind, text, ms) { // PRIZE banner — gold frame (§6)
    const e = kind === "prize" ? H.els.prize : H.els.alert;
    e.textContent = text;
    e.style.display = "block";
    clearTimeout(H._bt);
    H._bt = setTimeout(() => { e.style.display = "none"; }, ms || 2200);
  };
  /* ---- title screen: roster cards + location select + wallet + shop ---- */
  H.buildTitle = function (root, SPR) {
    const t = el("div", "tc-title", root);
    H.els.title = t;
    const logo = el("canvas", "tc-title-logo", t);
    logo.width = 350; logo.height = 152;
    logo.getContext("2d").drawImage(SPR.logo, 0, 0);
    el("div", "tc-tagline", t, "RUN • SPRAY • ESCAPE");
    el("div", "tc-sect", t, "CHOOSE YOUR ARTIST");
    const rc = el("div", "tc-roster", t);
    H.els.rosterCards = [];
    SPR.rosterOrder.forEach((id) => {
      const spec = SPR.fighterSpecs[id];
      const card = el("div", "tc-card", rc);
      const cv = el("canvas", "tc-card-art", card);
      cv.width = 124; cv.height = 186;
      cv.getContext("2d").drawImage(SPR.fighters[id].idle[0], 38, 86, 124, 186);
      el("div", "tc-card-name", card, spec.name);
      el("div", "tc-card-desc", card, spec.desc);
      const lock = el("div", "tc-card-lock", card, "");
      card.addEventListener("pointerdown", (e) => { e.preventDefault(); H.cb.pickRoster(id); });
      H.els.rosterCards.push({ id, card, lock });
    });
    el("div", "tc-sect", t, "LOCATION");
    const lc = el("div", "tc-locs", t);
    H.els.locCards = [];
    SPR.locOrder.forEach((lid) => {
      const loc = SPR.locDefs[lid];
      const card = el("div", "tc-card tc-loc", lc);
      el("div", "tc-card-name", card, loc.name);
      el("div", "tc-card-desc", card, loc.desc);
      const lock = el("div", "tc-card-lock", card, "");
      card.addEventListener("pointerdown", (e) => { e.preventDefault(); H.cb.pickLocation(lid); });
      H.els.locCards.push({ id: lid, card, lock });
    });
    const track = el("div", "tc-track", t, "");
    H.els.trackSlot = track;
    H.els.start = el("button", "tc-start", t, "TAP TO START");
    H.els.start.addEventListener("pointerdown", (e) => { e.preventDefault(); H.cb.startRun(); });
    el("div", "tc-controls", t, "TAP = JUMP • SWIPE ↓ = SLIDE • HOLD SPRAY AT FRESH WALLS");
  };
  H.refreshTitle = function (wallet, charId, locId, totalTags) {
    for (const c of H.els.rosterCards) {
      const spec = H.cb.SPR.fighterSpecs[c.id];
      const unlocked = wallet.unlocked[c.id];
      c.card.classList.toggle("sel", c.id === charId);
      c.card.classList.toggle("locked", !unlocked);
      c.lock.textContent = unlocked ? "◉ READY" : "◉ " + spec.price.toLocaleString("en-US") + " — TAP TO UNLOCK";
    }
    for (const c of H.els.locCards) {
      const loc = H.cb.SPR.locDefs[c.id];
      const unlocked = totalTags >= loc.unlockTags;
      c.card.classList.toggle("sel", c.id === locId);
      c.card.classList.toggle("locked", !unlocked);
      c.lock.textContent = unlocked ? "OPEN" : "🔒 " + loc.unlockTags + " TAGS";
    }
    const slot = H.cb.SPR.trackSlots[locId];
    H.els.trackSlot.textContent = slot && slot.trackId
      ? "♪ NOW SPINNING: " + slot.title + " — That Boy Hi Hat"
      : "♪ TRACK SLOT — catalog hook ready";
  };
  H.buildBusted = function (root) {
    const b = el("div", "tc-busted", root);
    H.els.busted = b;
    el("div", "tc-busted-title", b, "BUSTED");
    el("div", "tc-busted-sub", b, "THE DRONES GOT YOU");
    H.els.bustedScore = el("div", "tc-busted-score", b, "");
    H.els.bustedTags = el("div", "tc-busted-tags", b, "");
    H.els.bustedEarn = el("div", "tc-busted-earn", b, "");
    const again = el("button", "tc-start", b, "TAP TO RUN AGAIN");
    again.addEventListener("pointerdown", (e) => { e.preventDefault(); H.cb.startRun(); });
  };
  H.showBusted = function (S, earned) {
    H.set("bustedScore", String(Math.floor(S.score)).padStart(6, "0"));
    H.set("bustedTags", S.tags + " WALLS TAGGED");
    H.set("bustedEarn", "◉ +" + earned + " NEON CREDITS EARNED");
    H.els.busted.style.display = "flex";
  };
  H.buildPaused = function (root) {
    const p = el("div", "tc-paused", root);
    H.els.paused = p;
    el("div", "tc-paused-title", p, "PAUSED");
    const resume = el("button", "tc-start", p, "RESUME");
    resume.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); H.cb.togglePause(); });
    const mute = el("button", "tc-start tc-mute", p, "SOUND: ON");
    H.els.muteBtn = mute;
    mute.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation();
      const m = H.cb.toggleMute();
      mute.textContent = "SOUND: " + (m ? "OFF" : "ON");
    });
  };
  H.show = function (which) {
    H.els.title.style.display = which === "title" ? "flex" : "none";
    H.els.hud.style.display = which === "run" ? "block" : "none";
    H.els.busted.style.display = "none";
    H.els.paused.style.display = "none";
    H.els.joyBase.style.display = "none";
  };
  function fmtT(s) {
    s = Math.floor(s);
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  return H;
}
