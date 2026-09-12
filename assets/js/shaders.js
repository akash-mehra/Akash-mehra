/* ═══════════════════════════════════════════════════════════════════════
   GLSL. Two programs:
     1. lensing  — Schwarzschild deflection of a background starfield,
                   plus the direct and lensed images of the accretion disc.
     2. matter   — one vertex program shared by the point cloud and both
                   index buffers, so points and structure morph identically.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── shared morph: the whole argument of the page, in 20 lines ───────── */
const MORPH = /* glsl */`
  uniform float uTime;
  uniform float uPhase;     // 0 = disc, 1 = lattice, 2 = vessel
  uniform float uPulse;     // systolic 0..1
  uniform float uSpin;      // disc angular offset

  attribute vec3  aDisc;    // x = radius, y = theta0, z = vertical jitter
  attribute vec3  aLattice;
  attribute vec3  aVessel;
  attribute vec2  aSeed;    // x = generic random, y = normalised arc-length along vessel

  varying float vHeat;      // 0..1 thermal / activity
  varying float vDop;       // relativistic beaming
  varying float vAct;

  vec3 discPos(out float dop){
    float r  = aDisc.x;
    // Keplerian shear: omega goes as r^-3/2
    float th = aDisc.y + uSpin * pow(r, -1.5) * 42.0;
    vec3 p = vec3(cos(th) * r, aDisc.z * (0.035 + 0.012 * r), sin(th) * r);
    // orbital velocity direction, projected on the view axis, gives beaming
    vec2 vel = vec2(-sin(th), cos(th));
    float beta = clamp(0.62 / sqrt(max(r, 0.35)), 0.0, 0.82);
    dop = clamp(0.5 + 1.25 * beta * vel.x, 0.0, 1.6);
    return p;
  }

  vec3 latticePos(){
    // engineered: almost no drift, a faint quantised tick
    float t = floor(uTime * 3.0) / 3.0;
    return aLattice + vec3(
      sin(t * 1.7 + aSeed.x * 41.0),
      cos(t * 1.3 + aSeed.x * 27.0),
      sin(t * 2.1 + aSeed.x * 13.0)) * 0.012;
  }

  vec3 vesselPos(float pulse){
    // systolic wave travelling outward along the tree
    float wave = smoothstep(0.14, 0.0, abs(fract(aSeed.y - uTime * 0.22) - 0.5) - 0.36);
    float d = 1.0 + wave * pulse * 0.09;
    return aVessel * d + vec3(0.0, sin(uTime * 0.5 + aSeed.x * 19.0) * 0.008, 0.0);
  }

  vec3 morphed(out float heat, out float dop, out float act){
    float t01 = smoothstep(0.0, 1.0, clamp(uPhase, 0.0, 1.0));
    float t12 = smoothstep(0.0, 1.0, clamp(uPhase - 1.0, 0.0, 1.0));
    float d;
    vec3 pd = discPos(d);
    vec3 pl = latticePos();
    vec3 pv = vesselPos(uPulse);

    // the snap: points overshoot slightly on the way into the lattice,
    // the way matter does when it finds an ordered state
    float snap = sin(t01 * 3.14159) * (1.0 - t12);
    vec3 p = mix(mix(pd, pl, t01), pv, t12);
    p += normalize(p + 1e-5) * snap * 0.10 * sin(aSeed.x * 57.0);

    heat = mix(clamp(1.35 / max(aDisc.x, 0.4), 0.0, 1.0), 0.0, t01);
    dop  = mix(d, 1.0, t01);
    act  = uPhase;
    return p;
  }
`;

/* ── 1. lensing background ───────────────────────────────────────────── */
export const lensVert = /* glsl */`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

export const lensFrag = /* glsl */`
  precision highp float;

  uniform sampler2D uStars;
  uniform vec2  uRes;
  uniform vec3  uCamPos;
  uniform mat4  uCamWorld;
  uniform mat4  uProjInv;
  uniform vec3  uBH;
  uniform float uRs;
  uniform float uFade;      // 1 in act I, 0 by act III
  uniform float uDiscFade;
  uniform float uTime;
  uniform float uSpin;
  uniform vec3  uHot;
  uniform vec3  uCool;

  varying vec2 vUv;

  const float PI  = 3.14159265359;
  const float TAU = 6.28318530718;

  vec3 sampleSky(vec3 d){
    vec2 uv = vec2(atan(d.z, d.x) / TAU + 0.5, acos(clamp(d.y, -1.0, 1.0)) / PI);
    return texture2D(uStars, uv).rgb;
  }

  // blackbody-ish ramp for the disc, hot core to cool rim
  vec3 discColour(float r, float rIn, float rOut){
    float t = clamp((r - rIn) / max(rOut - rIn, 1e-3), 0.0, 1.0);
    vec3 c = mix(uHot, uCool, smoothstep(0.0, 0.62, t));
    return c * (1.0 - t * 0.72);
  }

  // radial banding so the disc reads as orbiting matter, not a gradient
  float discTexture(float r, float th){
    float shear = th + uSpin * pow(max(r, 0.4), -1.5) * 42.0;
    float bands = 0.62 + 0.38 * sin(shear * 7.0 + r * 5.5);
    bands *= 0.72 + 0.28 * sin(shear * 19.0 - r * 11.0);
    return bands;
  }

  // one crossing of the equatorial plane
  vec3 discHit(vec3 ro, vec3 rd, float rIn, float rOut, float gain){
    float t = -ro.y / (abs(rd.y) < 1e-5 ? 1e-5 : rd.y);
    if (t <= 0.0) return vec3(0.0);
    vec3 p = ro + rd * t;
    float r = length(p.xz);
    if (r < rIn || r > rOut) return vec3(0.0);
    float edge = smoothstep(rIn, rIn * 1.22, r) * (1.0 - smoothstep(rOut * 0.66, rOut, r));
    float th = atan(p.z, p.x);
    return discColour(r, rIn, rOut) * edge * discTexture(r, th) * gain;
  }

  void main(){
    vec2 ndc = (gl_FragCoord.xy / uRes) * 2.0 - 1.0;

    vec4 eye = uProjInv * vec4(ndc, -1.0, 1.0);
    vec3 rd  = normalize((uCamWorld * vec4(eye.xy, -1.0, 0.0)).xyz);
    vec3 ro  = uCamPos;

    vec3 toBH = uBH - ro;
    float dist = length(toBH);
    vec3 nBH = toBH / dist;
    float ct = dot(rd, nBH);

    float rIn  = uRs * 3.0;
    float rOut = uRs * 11.0;

    vec3 col;

    if (ct <= 0.0){
      col = sampleSky(rd);
      col += discHit(ro - uBH, rd, rIn, rOut, 1.05) * uDiscFade;
    } else {
      float b  = dist * sqrt(max(0.0, 1.0 - ct * ct));
      float bc = 2.598 * uRs;                       // sqrt(27)/2 — photon capture

      if (b < bc){
        // the shadow. Nothing comes back out.
        col = vec3(0.0);
        // but the disc in front of it is still visible
        col += discHit(ro - uBH, rd, rIn, rOut, 1.05) * uDiscFade
             * step(0.0, dot(rd, nBH) * 0.0 + 1.0) * smoothstep(bc * 0.55, bc, b);
      } else {
        // Schwarzschild deflection, weak-field, clamped near the photon sphere
        float alpha = min(2.0 * uRs / b, 1.35);
        vec3 perp = normalize(nBH - ct * rd);
        vec3 bent = normalize(rd + perp * alpha);

        col = sampleSky(bent);

        // direct image of the disc
        col += discHit(ro - uBH, rd, rIn, rOut, 1.05) * uDiscFade;
        // lensed image — the arc that climbs over the top of the shadow
        col += discHit(ro - uBH, bent, rIn, rOut, 0.68) * uDiscFade;

        // Einstein ring: light piling up at the capture radius
        float ring = smoothstep(bc * 2.4, bc * 1.02, b);
        col += uHot * pow(ring, 3.2) * 0.50 * uDiscFade;
      }
    }

    gl_FragColor = vec4(col * uFade, 1.0);
  }
`;

/* ── 2. matter: points ───────────────────────────────────────────────── */
export const pointVert = /* glsl */`
  ${MORPH}
  uniform float uSize;
  uniform float uDpr;
  void main(){
    float heat, dop, act;
    vec3 p = morphed(heat, dop, act);
    vHeat = heat; vDop = dop; vAct = act;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float atten = 300.0 / max(-mv.z, 2.0);
    float size = uSize * uDpr * atten * (0.55 + 0.9 * aSeed.x) * (0.7 + 0.6 * dop);
    gl_PointSize = clamp(size, 0.55, 5.0 * uDpr);
    gl_Position = projectionMatrix * mv;
  }
`;

export const pointFrag = /* glsl */`
  precision highp float;
  uniform vec3  uHot;
  uniform vec3  uWarm;
  uniform vec3  uCool;
  uniform float uOpacity;
  uniform float uPulse;
  varying float vHeat;
  varying float vDop;
  varying float vAct;

  void main(){
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    if (r2 > 0.25) discard;
    float a = exp(-r2 * 11.0);

    // act I: thermal disc, beamed. act II: cool engineered nodes.
    // act III: oxygenation — warm at the pulse, cool at rest.
    vec3 discC = mix(uWarm, uHot, vHeat) * vDop;
    vec3 latC  = mix(uCool * 0.55, vec3(0.92, 0.96, 1.0), 0.35);
    vec3 vesC  = mix(uCool * 0.88, uWarm, 0.26 + uPulse * 0.58);

    float t01 = smoothstep(0.0, 1.0, clamp(vAct, 0.0, 1.0));
    float t12 = smoothstep(0.0, 1.0, clamp(vAct - 1.0, 0.0, 1.0));
    vec3 c = mix(mix(discC, latC, t01), vesC, t12);

    gl_FragColor = vec4(c, a * uOpacity);
  }
`;

/* ── 3. matter: connective structure ─────────────────────────────────── */
export const lineVert = /* glsl */`
  ${MORPH}
  void main(){
    float heat, dop, act;
    vec3 p = morphed(heat, dop, act);
    vHeat = heat; vDop = dop; vAct = act;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const lineFrag = /* glsl */`
  precision highp float;
  uniform vec3  uColour;
  uniform float uOpacity;
  varying float vHeat;
  varying float vDop;
  varying float vAct;
  void main(){
    gl_FragColor = vec4(uColour, uOpacity);
  }
`;

/* ── 4. composite: one tone-map over the accumulated frame ────────────
   Additive blending has no upper bound, so overlapping particles clip to
   flat white — ugly, and it destroys the contrast the copy depends on.
   Tone-mapping the accumulated buffer once bounds every highlight to
   uCeil while keeping detail inside it.                                  */
export const compVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const compFrag = /* glsl */`
  precision highp float;
  uniform sampler2D uScene;
  uniform float uCeil;
  uniform float uExposure;
  varying vec2 vUv;
  void main(){
    vec3 c = texture2D(uScene, vUv).rgb * uExposure;
    c = max(c, 0.0);
    c = c / (1.0 + c / uCeil);      // asymptotes to uCeil — never clips to white
    gl_FragColor = vec4(c, 1.0);
  }
`;
