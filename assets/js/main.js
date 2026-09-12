/* ═══════════════════════════════════════════════════════════════════════
   Orchestration. Native scroll, never hijacked: the scrollbar, trackpad,
   keyboard, and touch all behave exactly as the platform intends, and the
   camera simply reads the position the browser already decided on.
   ═══════════════════════════════════════════════════════════════════════ */

const doc  = document.documentElement;
const body = document.body;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;

const motionQ = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => motionQ.matches;

/* ── the magnitude ladder ────────────────────────────────────────────
   Real values. 2.50e20 m is the distance to Sagittarius A*; 1.27e10 m is
   its Schwarzschild radius; 1.5e-4 m is a PCB trace; 8e-6 m is a capillary
   lumen. The readout interpolates logarithmically, which is the only
   honest way to move between them.

   Crucially the stops are anchored to where the acts actually sit in the
   document, measured after layout — never to guessed scroll fractions.
   That is what keeps the readout, the phase and the render locked to the
   copy at any viewport height or font size.                               */
const MAG   = [20.40, 10.10, -3.82, -5.10];
const PHASE = ['approach', 'infall', 'routing', 'perfusion'];

let anchors = [0, 0.25, 0.5, 0.75];

function measureAnchors(){
  const secs = ['.act--masthead', '.act--i', '.act--ii', '.act--iii']
    .map(sel => document.querySelector(sel));
  if (secs.some(el => !el)) return;
  const max = Math.max(1, doc.scrollHeight - innerHeight);
  const next = secs.map(el => {
    const r = el.getBoundingClientRect();
    const top = r.top + scrollY;
    return clamp((top + r.height * 0.5 - innerHeight * 0.5) / max, 0, 1);
  });
  // keep it strictly ascending so the interpolation can never divide by zero
  for (let i = 1; i < next.length; i++){
    if (next[i] <= next[i - 1]) next[i] = next[i - 1] + 1e-3;
  }
  anchors = next;
}

/* continuous act index: 0 at the masthead, 3 at act III, drifting to 3.6
   through the dossier and the close so the camera keeps closing in       */
function actIndex(p){
  if (p <= anchors[0]) return 0;
  for (let i = 1; i < anchors.length; i++){
    if (p <= anchors[i]) return i - 1 + (p - anchors[i - 1]) / (anchors[i] - anchors[i - 1]);
  }
  const last = anchors[anchors.length - 1];
  return 3 + clamp((p - last) / Math.max(1 - last, 1e-4), 0, 1) * 0.6;
}

function magnitudeAt(q){
  const i = clamp(Math.floor(q), 0, MAG.length - 2);
  if (q >= MAG.length - 1) return MAG[MAG.length - 1];
  return lerp(MAG[i], MAG[i + 1], clamp(q - i, 0, 1));
}
const stopAt = q => clamp(Math.round(q), 0, 3);

/* ── section reveal ──────────────────────────────────────────────────── */
function observeSections(){
  const targets = document.querySelectorAll('.act, .dossier, .close');
  if (!('IntersectionObserver' in window)){
    targets.forEach(t => t.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries){
      if (e.isIntersecting){
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });
  targets.forEach(t => io.observe(t));
}

/* ── photography: a designed pending state, never a broken image ─────── */
function wirePlates(){
  document.querySelectorAll('.plate').forEach(fig => {
    const img = fig.querySelector('img');
    if (!img) return;
    const absent = () => fig.classList.add('is-absent');
    if (img.complete){
      if (!img.naturalWidth) absent();
    } else {
      img.addEventListener('error', absent, { once: true });
    }
  });
}

/* ── email: assembled at runtime, never sitting in the markup ────────── */
function wireMail(){
  const a = document.getElementById('mailLink');
  if (!a) return;
  const addr = `${a.dataset.u}@${a.dataset.d}`;
  a.href = `mailto:${addr}`;
  const t = document.getElementById('mailText');
  if (t) t.textContent = addr;
  delete a.dataset.u; delete a.dataset.d;
}

/* ── pointer & touch parallax ────────────────────────────────────────── */
function wirePointer(target){
  let raf = 0;
  const set = (x, y) => {
    target.px = x; target.py = y;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      doc.style.setProperty('--px', target.pxS.toFixed(4));
      doc.style.setProperty('--py', target.pyS.toFixed(4));
    });
  };
  const fromEvent = e => {
    const w = innerWidth, h = innerHeight;
    set(clamp((e.clientX / w) * 2 - 1, -1, 1), clamp((e.clientY / h) * 2 - 1, -1, 1));
  };
  addEventListener('pointermove', fromEvent, { passive: true });
  addEventListener('pointerdown', fromEvent, { passive: true });
  addEventListener('pointerleave', () => set(0, 0), { passive: true });
  // a touch that lifts should relax rather than stick
  addEventListener('pointerup', () => set(target.px * 0.35, target.py * 0.35), { passive: true });
}

/* ═══════════════════════════════════════════════════════════════════ */

async function boot(){
  observeSections();
  wirePlates();
  wireMail();

  const rail       = document.querySelector('.rail');
  const mantissaEl = document.getElementById('mantissa');
  const exponentEl = document.getElementById('exponent');
  const fillEl     = document.getElementById('railFill');
  const phaseEl    = document.getElementById('phaseName');
  const stops      = [...document.querySelectorAll('.rail__stop')];
  const canvas     = document.getElementById('gl');

  if (rail) requestAnimationFrame(() => rail.classList.add('is-ready'));

  /* scroll state, smoothed — the document scrolls natively, the camera
     just follows it with a little inertia                                */
  const S = { p: 0, pS: 0, vel: 0, velS: 0, px: 0, py: 0, pxS: 0, pyS: 0, last: 0, dt: 1 / 60 };

  function readScroll(){
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    const y = clamp(scrollY, 0, max);
    S.p = y / max;
    S.vel = clamp((y - S.last) / Math.max(innerHeight * 0.5, 1), -1, 1);
    S.last = y;
  }
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', readScroll, { passive: true });
  readScroll();
  S.pS = S.p;

  measureAnchors();
  addEventListener('resize', () => { readScroll(); measureAnchors(); }, { passive: true });
  addEventListener('load', measureAnchors, { once: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAnchors);
  if ('ResizeObserver' in window){
    const ro = new ResizeObserver(() => measureAnchors());
    ro.observe(document.getElementById('main'));
  }

  wirePointer(S);

  /* ── WebGL, if this machine can give it to us ─────────────────────── */
  let stage = null;
  const canWebGL = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e){ return false; }
  })();

  if (canWebGL && canvas){
    try {
      const { createStage } = await import('./stage.js');
      stage = createStage(canvas, { reduced });
      if (stage){
        document.querySelector('.stage').classList.add('is-live');
        addEventListener('resize', () => stage.layout(), { passive: true });
        canvas.addEventListener('webglcontextlost', e => {
          e.preventDefault();
          doc.classList.add('no-webgl');
          document.querySelector('.stage').classList.remove('is-live');
          stage = null;
        });
      } else {
        doc.classList.add('no-webgl');
      }
    } catch (err){
      doc.classList.add('no-webgl');
    }
  } else {
    doc.classList.add('no-webgl');
  }

  /* ── one loop, one source of truth ────────────────────────────────── */
  let running = true;
  let lastStop = -1, lastMantissa = '', lastExponent = '';
  let prev = performance.now();

  /* time-based smoothing. A per-frame lerp constant is frame-rate
     dependent: at 20fps it lags a third of a second behind the scrollbar,
     and the readout visibly trails the copy. This converges in the same
     wall-clock time on any device.                                        */
  const TAU_SCROLL = 0.10, TAU_POINT = 0.14, TAU_VEL = 0.13;
  const decay = (tau, dt) => 1 - Math.exp(-dt / tau);

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running){ prev = performance.now(); requestAnimationFrame(tick); }
  });

  function tick(now){
    if (!running) return;

    const dt = Math.min((now - prev) / 1000, 0.1);
    prev = now;
    S.dt = dt;

    const kS = reduced() ? 1 : decay(TAU_SCROLL, dt);
    const kP = reduced() ? 1 : decay(TAU_POINT,  dt);
    S.pS   = lerp(S.pS,   S.p,   kS);
    S.velS = lerp(S.velS, S.vel, decay(TAU_VEL, dt));
    S.vel *= Math.exp(-dt / 0.22);
    S.pxS  = lerp(S.pxS,  S.px,  kP);
    S.pyS  = lerp(S.pyS,  S.py,  kP);

    if (!reduced()) doc.style.setProperty('--vel', S.velS.toFixed(4));

    /* rail readout */
    const q   = actIndex(S.pS);
    const L   = magnitudeAt(q);
    const exp = Math.floor(L);
    const man = Math.pow(10, L - exp).toFixed(2);
    if (man !== lastMantissa){ mantissaEl.textContent = man; lastMantissa = man; }
    const expTxt = exp < 0 ? `−${-exp}` : `${exp}`;
    if (expTxt !== lastExponent){ exponentEl.textContent = expTxt; lastExponent = expTxt; }

    if (fillEl){
      const k = S.pS.toFixed(4);
      fillEl.style.transform = innerWidth > 900 ? `scaleY(${k})` : `scaleX(${k})`;
    }

    const s = stopAt(q);
    if (s !== lastStop){
      stops.forEach((el, i) => el.classList.toggle('is-active', i === s));
      phaseEl.textContent = PHASE[s];
      lastStop = s;
    }

    if (stage){
      stage.state.q   = q;
      stage.state.p   = S.pS;
      stage.state.px  = S.pxS;
      stage.state.py  = S.pyS;
      stage.state.vel = S.velS;
      stage.state.dt  = dt;
      stage.frame(now);
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
