/* TAG CITY 3D — synth SFX: zero-asset WebAudio (design carried from src/audio.js).
   jump blip, dash whoosh, spray hiss (hold), tag chime, drone alert, strike thud. */
export function makeAudio() {
  let ctx = null, sprayNode = null, sprayGain = null;
  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function env(g, t0, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  const AU = {
    unlock() { try { ac(); } catch (e) { /* audio unavailable — game continues silent */ } },
    jump() {
      try {
        const c = ac(), t = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.type = "square"; o.frequency.setValueAtTime(280, t); o.frequency.exponentialRampToValueAtTime(640, t + 0.12);
        env(g, t, 0.01, 0.16, 0.14); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.2);
      } catch (e) {}
    },
    dash() {
      try {
        const c = ac(), t = c.currentTime, len = 0.25, buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const s = c.createBufferSource(); s.buffer = buf;
        const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(900, t);
        f.frequency.exponentialRampToValueAtTime(3200, t + len); f.Q.value = 1.4;
        const g = c.createGain(); env(g, t, 0.02, 0.22, len);
        s.connect(f).connect(g).connect(c.destination); s.start(t);
      } catch (e) {}
    },
    spray(on) {
      try {
        const c = ac();
        if (on && !sprayNode) {
          const len = 1, buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          sprayNode = c.createBufferSource(); sprayNode.buffer = buf; sprayNode.loop = true;
          const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 3800;
          sprayGain = c.createGain(); sprayGain.gain.value = 0.05;
          sprayNode.connect(f).connect(sprayGain).connect(c.destination); sprayNode.start();
        } else if (!on && sprayNode) {
          sprayNode.stop(); sprayNode.disconnect(); sprayNode = null; sprayGain = null;
        }
      } catch (e) {}
    },
    tag() {
      try {
        const c = ac(), t = c.currentTime;
        [523, 659, 784, 1046].forEach((fr, i) => {
          const o = c.createOscillator(), g = c.createGain();
          o.type = "triangle"; o.frequency.value = fr;
          env(g, t + i * 0.07, 0.01, 0.2, 0.22);
          o.connect(g).connect(c.destination); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.3);
        });
      } catch (e) {}
    },
    alert() {
      try {
        const c = ac(), t = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(620, t); o.frequency.linearRampToValueAtTime(880, t + 0.16);
        o.frequency.linearRampToValueAtTime(620, t + 0.32);
        env(g, t, 0.02, 0.12, 0.34); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.4);
      } catch (e) {}
    },
    strike() {
      try {
        const c = ac(), t = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.3);
        env(g, t, 0.005, 0.4, 0.35); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.4);
      } catch (e) {}
    },
    coin() {
      try {
        const c = ac(), t = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(1320, t); o.frequency.setValueAtTime(1760, t + 0.07);
        env(g, t, 0.005, 0.1, 0.12); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.2);
      } catch (e) {}
    },
  };
  return AU;
}
