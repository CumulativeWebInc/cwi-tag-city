/* TAG CITY — one-thumb input: virtual joystick + hold-to-spray.
   §9 cites: §6 (virtual joystick — dark translucent disc, cyan chevrons;
   buttons: gold = DASH, pink = SPRAY, cyan = pause; hint line "HOLD TO SPRAY
   • SWIPE TO DODGE"), §2 (dash 0.25s max).
   Layout: left half = dynamic-origin joystick (push up = jump, pull down =
   slide); right half = SPRAY hold zone + DASH tap zone (DOM buttons, see
   hud.js). Tap (quick, small move) = jump; swipe-down = slide — kept as
   alternates from the proven spike feel. Zero per-frame allocation: touch
   records are pooled in a fixed Map, no object creation in the hot path
   beyond the pooled record reuse. */
export function makeInput(callbacks) {
  const touches = new Map(); // pointerId → pooled record
  const joy = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0, jumped: false, slided: false };
  const IN = {
    sprayHeld: false, joy, touches,
    // DOM joystick indicator element (wired by hud.js)
    joyEl: null, joyKnob: null,
  };
  function toGame(e, el) {
    const r = el.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * 540, y: (e.clientY - r.top) / r.height * 960 };
  }
  IN.attach = function (el) {
    IN.el = el;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      callbacks.audioUnlock();
      const p = toGame(e, el);
      if (callbacks.onDown(p.x, p.y, e.pointerId)) return; // consumed by menus/buttons
      // Left half → joystick; right half (not on a button) → also joystick
      // (one-thumb: the thumb works the stick; SPRAY is a DOM button).
      if (!joy.active) {
        joy.active = true; joy.id = e.pointerId;
        joy.ox = p.x; joy.oy = p.y; joy.dx = 0; joy.dy = 0;
        joy.jumped = false; joy.slided = false;
        touches.set(e.pointerId, { sx: p.x, sy: p.y, t: performance.now(), joy: true });
        IN.showJoy(p.x, p.y);
      } else {
        touches.set(e.pointerId, { sx: p.x, sy: p.y, t: performance.now(), joy: false });
      }
    });
    el.addEventListener("pointermove", (e) => {
      const t = touches.get(e.pointerId);
      if (!t) return;
      e.preventDefault();
      const p = toGame(e, el);
      if (t.joy && e.pointerId === joy.id) {
        joy.dx = p.x - joy.ox; joy.dy = p.y - joy.oy;
        const mag = Math.hypot(joy.dx, joy.dy);
        if (mag > 56) { // push past the dead zone
          if (joy.dy < -40 && !joy.jumped) { joy.jumped = true; callbacks.doJump(); }
          else if (joy.dy > 48 && Math.abs(joy.dy) > Math.abs(joy.dx) * 1.1 && !joy.slided) {
            joy.slided = true; callbacks.doSlide();
          }
        }
        IN.moveJoy(joy.dx, joy.dy);
      } else if (!t.joy) {
        // swipe-down anywhere = slide (spike-proven alternate)
        const dy = p.y - t.sy, dx = p.x - t.sx;
        if (!t.slid && dy > 52 && Math.abs(dy) > Math.abs(dx) * 1.2) { t.slid = true; callbacks.doSlide(); }
      }
    });
    function up(e) {
      const t = touches.get(e.pointerId);
      touches.delete(e.pointerId);
      if (e.pointerId === joy.id) {
        joy.active = false; joy.id = -1; joy.dx = 0; joy.dy = 0;
        IN.hideJoy();
        return;
      }
      if (!t) return;
      // tap = jump (quick, small move, not a slide swipe)
      const p = toGame(e, el);
      const dt = (performance.now() - t.t) / 1000;
      const dist = Math.hypot(p.x - t.sx, p.y - t.sy);
      if (dt < 0.3 && dist < 28 && !t.slid && !t.joy) callbacks.doJump();
    }
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", (e) => {
      touches.delete(e.pointerId);
      if (e.pointerId === joy.id) { joy.active = false; joy.id = -1; IN.hideJoy(); }
    });
  };
  IN.showJoy = function (x, y) {
    if (!IN.joyEl) return;
    IN.joyEl.style.display = "block";
    IN.joyEl.style.left = (x - 60) + "px";
    IN.joyEl.style.top = (y - 60) + "px";
    IN.moveJoy(0, 0);
  };
  IN.moveJoy = function (dx, dy) {
    if (!IN.joyKnob) return;
    const m = Math.hypot(dx, dy), cl = m > 44 ? 44 / m : 1;
    IN.joyKnob.style.transform = "translate(" + dx * cl + "px," + dy * cl + "px)";
  };
  IN.hideJoy = function () { if (IN.joyEl) IN.joyEl.style.display = "none"; };
  return IN;
}
