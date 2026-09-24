/* TAG CITY 3D — one-thumb input: dynamic joystick + SPRAY/DASH buttons.
   Grammar carried from the 2D design (src/input.js): left = dynamic-origin
   joystick (push up = jump, pull down = slide), right = SPRAY hold + DASH tap
   DOM buttons; tap = jump; swipe-down = slide. */
export function makeInput(callbacks) {
  const joy = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0, jumped: false, slided: false };
  const IN = { sprayHeld: false, joy, joyEl: null, joyKnob: null, el: null };

  function toGame(e, el) {
    const r = el.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }

  IN.attach = function (el) {
    IN.el = el;
    el.addEventListener("pointerdown", (e) => {
      callbacks.audioUnlock();
      if (callbacks.onDown && callbacks.onDown(e)) return;
      const p = toGame(e, el);
      if (p.x < 0.45 && !joy.active) {
        joy.active = true; joy.id = e.pointerId;
        joy.ox = p.x; joy.oy = p.y; joy.dx = 0; joy.dy = 0;
        joy.jumped = false; joy.slided = false; joy.moved = false;
        joy.t = performance.now();
        IN.showJoy(p.x, p.y, el);
      } else if (!joy.active) {
        // right side tap (not on a button) = jump
        joy.tapId = e.pointerId; joy.tapT = performance.now();
        joy.tapX = p.x; joy.tapY = p.y;
      }
    });
    el.addEventListener("pointermove", (e) => {
      if (!joy.active || e.pointerId !== joy.id) return;
      e.preventDefault();
      const p = toGame(e, el);
      joy.dx = p.x - joy.ox; joy.dy = p.y - joy.oy;
      const adx = Math.abs(joy.dx), ady = Math.abs(joy.dy);
      if (adx > 0.035) { // lane change
        if (joy.dx > 0.035 && !joy.right) { joy.right = true; joy.left = false; callbacks.doLane(1); }
        else if (joy.dx < -0.035 && !joy.left) { joy.left = true; joy.right = false; callbacks.doLane(-1); }
      } else { joy.left = joy.right = false; }
      if (joy.dy < -0.09 && !joy.jumped) { joy.jumped = true; callbacks.doJump(); }
      else if (joy.dy > 0.1 && ady > adx * 1.1 && !joy.slided) { joy.slided = true; callbacks.doSlide(); }
      IN.moveJoy(joy.dx, joy.dy, el);
    });
    function up(e) {
      if (e.pointerId === joy.id) {
        const dt = (performance.now() - joy.t) / 1000;
        const dist = Math.hypot(joy.dx, joy.dy);
        if (dt < 0.28 && dist < 0.05 && !joy.jumped && !joy.slided) callbacks.doJump(); // tap = jump
        joy.active = false; joy.id = -1; joy.dx = joy.dy = 0;
        IN.hideJoy();
        return;
      }
      if (e.pointerId === joy.tapId) {
        const dt = (performance.now() - joy.tapT) / 1000;
        if (dt < 0.3) callbacks.doJump();
        joy.tapId = -1;
      }
    }
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", (e) => {
      if (e.pointerId === joy.id) { joy.active = false; joy.id = -1; IN.hideJoy(); }
    });
  };

  IN.showJoy = function (x, y, el) {
    if (!IN.joyEl || !el) return;
    const r = el.getBoundingClientRect();
    IN.joyEl.style.display = "block";
    IN.joyEl.style.left = (x * r.width - 60) + "px";
    IN.joyEl.style.top = (y * r.height - 60) + "px";
    IN.moveJoy(0, 0);
  };
  IN.moveJoy = function (dx, dy) {
    if (!IN.joyKnob) return;
    const px = dx * 900, py = dy * 900;
    const m = Math.hypot(px, py), cl = m > 44 ? 44 / m : 1;
    IN.joyKnob.style.transform = `translate(${px * cl}px,${py * cl}px)`;
  };
  IN.hideJoy = function () { if (IN.joyEl) IN.joyEl.style.display = "none"; };
  IN.setSpray = function (v, el) {
    IN.sprayHeld = v;
    if (el) el.classList.toggle("held", v);
  };
  return IN;
}
