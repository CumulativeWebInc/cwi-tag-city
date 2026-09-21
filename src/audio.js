/* TAG CITY — audio: lookahead scheduler + procedural SFX (zero assets).
   §9 cites: perf-spike §5 (25ms timer / 120ms horizon lookahead scheduler;
   AudioContext created/resumed inside a user gesture — unlock on first touch;
   hiss buffer pre-generated at boot: procedural, 0 decode, 0 bytes).
   The spray-hiss is NEVER triggered directly on the touch event — it is
   scheduled ahead of the spray visual frame so they land in sync. */
export function makeAudio() {
  const A = {
    ctx: null, master: null, hissBuf: null, sprayNode: null,
    timer: null, muted: false, nextNote: 0,
  };
  // Unlock on first touch — iOS requires gesture context (perf-spike §5).
  A.unlock = function () {
    if (A.ctx) { if (A.ctx.state === "suspended") A.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.35;
      A.master.connect(A.ctx.destination);
      // Pre-generate the hiss buffer at boot (procedural, 0 bytes shipped).
      const len = A.ctx.sampleRate;
      A.hissBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const ch = A.hissBuf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      // Lookahead scheduler: 25ms timer, 120ms horizon.
      A.nextNote = A.ctx.currentTime + 0.1;
      A.timer = setInterval(() => A.schedule(), 25);
    } catch (e) { /* audio unavailable — game plays silent */ }
  };
  A.schedule = function () {
    if (!A.ctx || A.muted) return;
    // Horizon pump: keep the clock warm; one-shot SFX schedule immediately.
    while (A.nextNote < A.ctx.currentTime + 0.12) A.nextNote += 0.12;
  };
  A.tone = function (f, d, type, vol, slide) {
    if (!A.ctx || A.muted) return;
    try {
      const t = A.ctx.currentTime;
      const o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = type || "triangle"; o.frequency.value = f;
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(A.master); o.start(t); o.stop(t + d);
    } catch (e) {}
  };
  A.noise = function (d, vol, fc, type) {
    if (!A.ctx || A.muted) return;
    try {
      const t = A.ctx.currentTime;
      const s = A.ctx.createBufferSource(); s.buffer = A.hissBuf; s.loop = true;
      const f = A.ctx.createBiquadFilter();
      f.type = type || "lowpass"; f.frequency.value = fc || 1200;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      s.connect(f); f.connect(g); g.connect(A.master);
      s.start(t); s.stop(t + d + 0.05);
    } catch (e) {}
  };
  // Spray hiss — scheduled slightly AHEAD of the visual so they land in sync.
  A.spray = function (on) {
    if (!A.ctx || A.muted) return;
    if (on && !A.sprayNode) {
      try {
        const t = A.ctx.currentTime + 0.03; // lookahead nudge
        const s = A.ctx.createBufferSource(); s.buffer = A.hissBuf; s.loop = true;
        const f = A.ctx.createBiquadFilter();
        f.type = "bandpass"; f.frequency.value = 5200; f.Q.value = 0.8;
        const g = A.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.10, t + 0.06);
        s.connect(f); f.connect(g); g.connect(A.master);
        s.start(t);
        A.sprayNode = { s, g };
      } catch (e) {}
    } else if (!on && A.sprayNode) {
      try {
        const t = A.ctx.currentTime;
        A.sprayNode.g.gain.cancelScheduledValues(t);
        A.sprayNode.g.gain.setValueAtTime(A.sprayNode.g.gain.value, t);
        A.sprayNode.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        const n = A.sprayNode; A.sprayNode = null;
        setTimeout(() => { try { n.s.stop(); } catch (e) {} }, 200);
      } catch (e) { A.sprayNode = null; }
    }
  };
  A.tap = () => A.tone(660, 0.07, "square", 0.08);
  A.jump = () => A.tone(300, 0.18, "sine", 0.12, 620);
  A.slide = () => A.noise(0.22, 0.10, 900);
  A.dash = () => A.noise(0.3, 0.16, 2400);
  A.tag = () => { A.tone(660, 0.12, "triangle", 0.16); setTimeout(() => A.tone(990, 0.2, "triangle", 0.16), 90); };
  A.near = () => { A.noise(0.35, 0.2, 3000); A.tone(880, 0.15, "sine", 0.1, 1400); };
  A.hit = () => A.tone(140, 0.3, "sine", 0.25, 60);
  A.coin = () => { A.tone(880, 0.09, "square", 0.10); setTimeout(() => A.tone(1320, 0.14, "square", 0.10), 70); };
  A.fanfare = () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => A.tone(f, 0.22, "triangle", 0.14), i * 90)); };
  return A;
}
