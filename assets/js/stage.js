/* ═══════════════════════════════════════════════════════════════════════
   The stage. One particle buffer, three configurations, two index buffers.
   Points and structure share the same vertex program, so they morph as one.
   ═══════════════════════════════════════════════════════════════════════ */

import * as THREE from './vendor/three.module.js';
import { lensVert, lensFrag, pointVert, pointFrag, lineVert, lineFrag, compVert, compFrag } from './shaders.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

/* Piecewise-linear keyframe track: ramp(p, [[at,val],…]) */
function track(p, keys){
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++){
    if (p <= keys[i][0]){
      const [a, va] = keys[i - 1], [b, vb] = keys[i];
      return lerp(va, vb, smoothstep(0, 1, (p - a) / (b - a)));
    }
  }
  return keys[keys.length - 1][1];
}

/* deterministic PRNG so the composition is identical on every load */
function rng(seed){
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/* ── background: a real starfield, generated once, never fetched ─────── */
function starfieldTexture(rand, hi){
  const W = hi ? 4096 : 2048, H = hi ? 2048 : 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');

  g.fillStyle = '#000005';
  g.fillRect(0, 0, W, H);

  // galactic band — a diffuse ridge of unresolved stars
  for (let i = 0; i < 300; i++){
    const x = rand() * W;
    const bandY = H * 0.5 + Math.sin(x / W * Math.PI * 2) * H * 0.10;
    const y = bandY + (rand() - 0.5) * H * 0.20;
    const r = 40 + rand() * 230;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const warm = rand() < 0.34;
    grd.addColorStop(0, warm ? 'rgba(58,36,24,0.11)' : 'rgba(24,36,56,0.11)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }

  // stars, with a plausible magnitude distribution
  for (let i = 0; i < (hi ? 30000 : 15000); i++){
    const x = rand() * W;
    const bandBias = rand() < 0.42;
    const y = bandBias
      ? H * 0.5 + Math.sin(x / W * Math.PI * 2) * H * 0.10 + (rand() - 0.5) * H * 0.16
      : rand() * H;
    if (y < 0 || y > H) continue;

    const m = Math.pow(rand(), 5.2);           // few bright, many faint
    const sc = hi ? 1.0 : 0.62;
    const r = (0.34 + m * 1.05) * sc;
    const a = 0.14 + m * 0.80;
    const t = rand();
    const col = t < 0.12 ? [176, 198, 255]     // hot blue
              : t < 0.26 ? [255, 208, 168]     // cool orange
              : [236, 238, 246];

    g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();

    if (m > 0.86){                              // a restrained halo, brightest only
      const grd = g.createRadialGradient(x, y, 0, x, y, r * 4.5);
      grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a * 0.20})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, r * 4.5, 0, TAU); g.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  return tex;
}

/* ── configuration 3: the vascular tree (built first, it sets N) ─────── */
function buildVessel(target, rand){
  const pos = [], parent = [], arc = [];
  const V = THREE.Vector3;

  function node(p, par, a){ pos.push(p.x, p.y, p.z); parent.push(par); arc.push(a); return parent.length - 1; }

  const STEPS = 5;
  function grow(origin, dir, len, depth, par, a0){
    if (pos.length / 3 >= target) return;
    let p = origin.clone();
    let prev = par;
    const d = dir.clone().normalize();
    for (let s = 1; s <= STEPS; s++){
      d.x += (rand() - 0.5) * 0.14;
      d.y += (rand() - 0.5) * 0.14;
      d.z += (rand() - 0.5) * 0.14;
      d.normalize();
      p.addScaledVector(d, len / STEPS);
      prev = node(p, prev, a0 + (s / STEPS) * 0.055);
      if (pos.length / 3 >= target) return;
    }
    if (depth <= 0) return;

    // bifurcation — Murray's law keeps the daughters thinner than the parent
    const axis = new V(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    const spread = 0.46 + rand() * 0.30;
    for (let k = 0; k < 2; k++){
      const nd = d.clone().applyAxisAngle(axis, k === 0 ? spread : -spread);
      grow(p, nd, len * (0.70 + rand() * 0.10), depth - 1, prev, a0 + 0.055);
    }
  }

  // a trunk that enters from below, then fans out — an arterial tree
  const root = new V(0, -3.4, 0);
  node(root, -1, 0);
  grow(root, new V(0, 1, 0), 1.5, 12, 0, 0);

  const n = pos.length / 3;
  const maxArc = arc.reduce((m, v) => Math.max(m, v), 0.0001);

  // normalise into a body that reads at the final camera distance
  let maxR = 0;
  for (let i = 0; i < n; i++){
    const r = Math.hypot(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    if (r > maxR) maxR = r;
  }
  const k = 4.4 / maxR;
  for (let i = 0; i < n * 3; i++) pos[i] *= k;

  const edges = [];
  for (let i = 0; i < n; i++) if (parent[i] >= 0) edges.push(parent[i], i);

  return { pos: new Float32Array(pos), edges, n, arc: arc.map(v => v / maxArc) };
}

/* ── configuration 2: orthogonally routed traces on a layered board ────
   Points are subdivided ALONG each run, so a trace reads as one continuous
   conductor rather than a scatter of nodes. That is the difference between
   a circuit board and noise.                                              */
function buildLattice(n, rand){
  const pos = new Float32Array(n * 3);
  const edges = [];
  const S = 0.62;                      // grid pitch
  const LAYERS = [-0.9, -0.3, 0.3, 0.9];
  const EXT = 10;                      // cells from centre
  const SUB = 5;                       // points per grid step

  let i = 0;
  while (i < n){
    let gx = Math.round((rand() * 2 - 1) * EXT);
    let gy = Math.round((rand() * 2 - 1) * EXT);
    let lz = (rand() * LAYERS.length) | 0;
    let axis = rand() < 0.5 ? 0 : 1;
    let dir  = rand() < 0.5 ? 1 : -1;
    let leg  = 2 + ((rand() * 6) | 0);
    const steps = 18 + ((rand() * 22) | 0);

    for (let st = 0; st < steps && i < n; st++){
      let nx = gx, ny = gy;
      if (axis === 0) nx += dir; else ny += dir;
      if (Math.abs(nx) > EXT){ nx = gx; axis = 1; dir = rand() < 0.5 ? 1 : -1; ny = gy + dir; }
      if (Math.abs(ny) > EXT){ ny = gy; axis = 0; dir = rand() < 0.5 ? 1 : -1; nx = gx + dir; }

      for (let k = 0; k < SUB && i < n; k++, i++){
        const t = k / SUB;
        pos[i * 3]     = (gx + (nx - gx) * t) * S;
        pos[i * 3 + 1] = (gy + (ny - gy) * t) * S;
        pos[i * 3 + 2] = LAYERS[lz];
        if (k > 0 || st > 0) edges.push(i - 1, i);   // never bridge two traces
      }
      gx = nx; gy = ny;

      if (--leg <= 0){
        if (rand() < 0.16) lz = (rand() * LAYERS.length) | 0;   // a via to another layer
        else { axis ^= 1; dir = rand() < 0.5 ? 1 : -1; }        // a right-angle corner
        leg = 2 + ((rand() * 6) | 0);
      }
    }
  }
  return { pos, edges };
}

/* ═══════════════════════════════════════════════════════════════════ */

export function createStage(canvas, opts){
  const { reduced } = opts;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false,
      powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false
    });
  } catch (e){ return null; }
  if (!renderer.getContext()) return null;

  const dprCap = window.devicePixelRatio > 2 ? 1.75 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setClearColor(0x050507, 1);
  renderer.autoClear = false;

  const small  = Math.min(window.innerWidth, window.innerHeight) < 760;
  const weak   = (navigator.hardwareConcurrency || 4) <= 4;
  const TARGET = small || weak ? 11000 : 26000;

  const rand = rng(0x9E3779B9);

  /* geometry ------------------------------------------------------- */
  const ves = buildVessel(TARGET, rand);
  const N   = ves.n;
  const lat = buildLattice(N, rand);

  const aDisc = new Float32Array(N * 3);
  const aSeed = new Float32Array(N * 2);
  const base  = new Float32Array(N * 3);
  const R_IN = 3.0, R_OUT = 11.0;
  for (let i = 0; i < N; i++){
    const r = R_IN + (R_OUT - R_IN) * Math.pow(rand(), 0.62);
    const th = rand() * TAU;
    aDisc[i * 3]     = r;
    aDisc[i * 3 + 1] = th;
    aDisc[i * 3 + 2] = (rand() * 2 - 1);
    aSeed[i * 2]     = rand();
    aSeed[i * 2 + 1] = ves.arc[i] || 0;
    base[i * 3] = Math.cos(th) * r; base[i * 3 + 2] = Math.sin(th) * r;
  }

  // one set of attributes, shared by the points and both index buffers
  const attrPos = new THREE.BufferAttribute(base, 3);
  const attrDsc = new THREE.BufferAttribute(aDisc, 3);
  const attrLat = new THREE.BufferAttribute(lat.pos, 3);
  const attrVes = new THREE.BufferAttribute(ves.pos.subarray(0, N * 3), 3);
  const attrSed = new THREE.BufferAttribute(aSeed, 2);

  const attach = geo => {
    geo.setAttribute('position', attrPos);
    geo.setAttribute('aDisc',    attrDsc);
    geo.setAttribute('aLattice', attrLat);
    geo.setAttribute('aVessel',  attrVes);
    geo.setAttribute('aSeed',    attrSed);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 24);
    return geo;
  };

  const pointsGeo  = attach(new THREE.BufferGeometry());
  const latticeGeo = attach(new THREE.BufferGeometry());
  latticeGeo.setIndex(lat.edges);
  const vesselGeo  = attach(new THREE.BufferGeometry());
  vesselGeo.setIndex(ves.edges.filter((_, k, a) => a[k & ~1] < N && a[(k & ~1) + 1] < N));

  /* shared uniforms ------------------------------------------------ */
  const HOT  = new THREE.Color(0xFFD9A0);
  const WARM = new THREE.Color(0xFF6B2C);
  const COOL = new THREE.Color(0x7FD4E8);

  const U = {
    uTime:   { value: 0 },
    uPhase:  { value: 0 },
    uPulse:  { value: 0 },
    uSpin:   { value: 0 }
  };
  const share = extra => Object.assign({}, U, extra);

  const pointMat = new THREE.ShaderMaterial({
    uniforms: share({
      uSize:    { value: small ? 0.85 : 0.75 },
      uDpr:     { value: renderer.getPixelRatio() },
      uHot:     { value: HOT }, uWarm: { value: WARM }, uCool: { value: COOL },
      uOpacity: { value: 0.34 }
    }),
    vertexShader: pointVert, fragmentShader: pointFrag,
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending
  });

  const mkLine = (colour, opacity) => new THREE.ShaderMaterial({
    uniforms: share({ uColour: { value: colour }, uOpacity: { value: opacity } }),
    vertexShader: lineVert, fragmentShader: lineFrag,
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending
  });
  const latticeMat = mkLine(new THREE.Color(0x3F7488), 0);
  const vesselMat  = mkLine(new THREE.Color(0x7A3520), 0);

  const scene = new THREE.Scene();
  scene.add(new THREE.Points(pointsGeo, pointMat));
  scene.add(new THREE.LineSegments(latticeGeo, latticeMat));
  scene.add(new THREE.LineSegments(vesselGeo, vesselMat));

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);

  /* lensing pass --------------------------------------------------- */
  const stars = starfieldTexture(rand, !(small || weak));
  const lensMat = new THREE.ShaderMaterial({
    uniforms: {
      uStars:    { value: stars },
      uRes:      { value: new THREE.Vector2(1, 1) },
      uCamPos:   { value: new THREE.Vector3() },
      uCamWorld: { value: new THREE.Matrix4() },
      uProjInv:  { value: new THREE.Matrix4() },
      uBH:       { value: new THREE.Vector3(0, 0, 0) },
      uRs:       { value: 1.0 },
      uFade:     { value: 1 },
      uDiscFade: { value: 1 },
      uTime:     { value: 0 },
      uSpin:     { value: 0 },
      uHot:      { value: HOT },
      uCool:     { value: WARM }
    },
    vertexShader: lensVert, fragmentShader: lensFrag,
    depthTest: false, depthWrite: false
  });
  const lensScene = new THREE.Scene();
  lensScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMat));
  const lensCam = new THREE.Camera();

  /* HDR buffer + composite ------------------------------------------- */
  const isWebGL2 = renderer.capabilities.isWebGL2;
  const rt = new THREE.WebGLRenderTarget(1, 1, {
    type: isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: false, stencilBuffer: false
  });
  const compMat = new THREE.ShaderMaterial({
    uniforms: {
      uScene:    { value: rt.texture },
      uCeil:     { value: small ? 0.55 : 0.74 },
      uExposure: { value: 1.0 }
    },
    vertexShader: compVert, fragmentShader: compFrag,
    depthTest: false, depthWrite: false
  });
  const compScene = new THREE.Scene();
  compScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat));

  /* camera track — keyed to the act index, not to scroll ------------- */
  const Z  = [[0, 29], [1, 20], [2, 15.0], [3, 6.8], [3.6, 5.2]];
  const Y  = [[0, 2.9], [1, 1.75], [2, 0.85], [3, 0.18], [3.6, 0.05]];
  const TY = [[0, 0], [2, 0], [3, 0.45], [3.6, 0.6]];

  const off = new THREE.Vector3();
  let offFrac = 0;          // fraction of half-width to push the subject right
  let halfPerUnit = 0.384;  // tan(fov/2) * aspect — screen half-width per unit of depth
  const camPos = new THREE.Vector3(0, 2.75, 27);
  const camTgt = new THREE.Vector3();
  let wide = false;

  function layout(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    wide = w >= 1080;
    // on wide screens the type occupies the left, so the mass sits right of centre
    offFrac = w >= 1440 ? 0.34 : w >= 1080 ? 0.26 : 0;
    camera.fov = w < 620 ? 56 : 42;
    camera.updateProjectionMatrix();
    halfPerUnit = Math.tan(camera.fov * Math.PI / 360) * camera.aspect;
    const pr = renderer.getPixelRatio();
    lensMat.uniforms.uRes.value.set(w * pr, h * pr);
    rt.setSize(Math.max(1, Math.round(w * pr)), Math.max(1, Math.round(h * pr)));
    lensMat.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
    pointMat.uniforms.uDpr.value = renderer.getPixelRatio();
  }

  /* frame ---------------------------------------------------------- */
  const state = { p: 0, q: 0, px: 0, py: 0, vel: 0, dt: 1 / 60 };
  let t0 = performance.now(), time = 0;

  function frame(now){
    const dt = Math.min((now - t0) / 1000, 0.05);
    t0 = now;
    if (!reduced()) time += dt;

    const p = state.p;
    const q = state.q;

    // phase: disc at act I, lattice at act II, vessel at act III
    const phase = clamp(q - 1, 0, 2);
    // cardiac waveform: sharp systole, long diastole, ~66 bpm
    const beat = Math.pow(Math.max(0, Math.sin(time * 1.1 * Math.PI)), 6);

    U.uTime.value  = time;
    U.uPhase.value = phase;
    U.uPulse.value = beat * smoothstep(1.25, 1.9, phase);
    U.uSpin.value  = time * 0.20;

    pointMat.uniforms.uOpacity.value = track(q, [[0, 0.40], [1, 0.36], [2, 0.26], [3.6, 0.20]]);
    latticeMat.uniforms.uOpacity.value = track(phase, [[0.5, 0], [0.95, 0.34], [1.3, 0.30], [1.8, 0]]);
    vesselMat.uniforms.uOpacity.value  = track(phase, [[1.3, 0], [1.9, 0.34], [2, 0.38]]);

    lensMat.uniforms.uFade.value     = track(q, [[0, 1], [1.05, 1], [1.85, 0]]);
    lensMat.uniforms.uDiscFade.value = track(q, [[0, 1], [1.0, 1], [1.7, 0]]);
    lensMat.uniforms.uTime.value = time;
    lensMat.uniforms.uSpin.value = U.uSpin.value;

    // dolly, with pointer parallax layered on top
    const px = state.px, py = state.py;
    const z = track(q, Z);
    off.x = -offFrac * halfPerUnit * z;   // constant on screen through the whole dolly
    camPos.set(
      off.x + px * 1.5,
      track(q, Y) - py * 0.95,
      z + state.vel * 1.2
    );
    camTgt.set(off.x, track(q, TY), 0);
    camera.position.lerp(camPos, reduced() ? 1 : 1 - Math.exp(-dt / 0.13));
    camera.lookAt(camTgt);
    camera.updateMatrixWorld();

    lensMat.uniforms.uCamPos.value.copy(camera.position);
    lensMat.uniforms.uCamWorld.value.copy(camera.matrixWorld);
    lensMat.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);

    renderer.setRenderTarget(rt);
    renderer.clear();
    if (lensMat.uniforms.uFade.value > 0.002) renderer.render(lensScene, lensCam);
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(compScene, lensCam);
  }

  layout();

  return {
    frame, layout, state,
    dispose(){
      pointsGeo.dispose(); latticeGeo.dispose(); vesselGeo.dispose();
      pointMat.dispose(); latticeMat.dispose(); vesselMat.dispose(); lensMat.dispose();
      stars.dispose(); rt.dispose(); compMat.dispose(); renderer.dispose();
    },
    get particles(){ return N; }
  };
}
