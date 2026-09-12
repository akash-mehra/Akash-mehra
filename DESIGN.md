# DESIGN.md — visual world

**Mode:** Experience. **Structure:** the scale ladder (locked with the user).
**World:** observatory / instrument-grade (locked with the user).

One curiosity, applied across twenty-five orders of magnitude. The page is a single
continuous dolly from the event horizon down to the capillary lumen, and a magnitude
readout in the margin measures the descent. The conceit is the vehicle; the person is the
subject. Every act must hand back to a human fact within one screen.

## Ground

Near-black, because the use scene is a phone or laptop in a dark room, late, out of
curiosity. Not a category default.

| Token | Value | Role |
|---|---|---|
| `--void` | `#050507` | Page ground |
| `--void-2` | `#0B0B10` | Raised surface, plate wells |
| `--rule` | `#1C1C24` | Hairlines, 1px only |
| `--fg` | `#EDEDF2` | Primary text |
| `--fg-2` | `#B4B4C2` | Secondary — tinted from the ground's hue, never neutral gray |
| `--fg-3` | `#9296A4` | Tertiary, mono labels at rest |
| `--accretion` | `#FF6B2C` | THE accent. Disc, active state, the one warm thing |
| `--accretion-hot` | `#FFD9A0` | Inner-disc white-hot, Doppler-approaching limb |
| `--clinical` | `#7FD4E8` | Cool counterweight. Act III, focus rings, links |

Two hues only — one hot, one cold — and they are the literal physics: orange is the
accretion disc's blackbody temperature, cyan is clinical instrumentation. The whole page
lives on the tension between them, and they never mix into a gradient.

Contrast verified against `--void`: `--fg` 17.4:1 · `--fg-2` 7.3:1 · `--fg-3` 5.0:1 ·

`--accretion` 7.2:1 · `--clinical` 12.1:1. All pass AA at body size.

## Type

Real faces, self-hosted-equivalent via Google Fonts with `display=swap`. No system face
carries the display voice.

- **Display — Instrument Serif.** High contrast, vertical stress, hairline serifs, tight
  spacing. Editorial authority without ornament. Regular + italic; the italic is the only
  emphasis mechanism in display sizes.
- **Text — Archivo.** Variable grotesk. Precise, slightly engineered, not the default sans.
  Body measure held to 62–70ch.
- **Data — IBM Plex Mono.** Only for things that are actually measured: magnitudes, phase
  markers, coordinates, plate numbers, the tick ladder. Never as a costume for "technical."

Display ceiling 6rem. Tracking floor −0.035em. Headings balanced via `text-wrap: balance`.

## Depth

Depth is real parallax on a real camera, not shadow stacking. Four planes:

1. Lensed background (starfield, distorted by the mass)
2. The morphing matter — one particle buffer, three configurations
3. Connective structure — two index buffers over the same vertices
4. Type, on the DOM, offset by pointer and scroll velocity

Where a shadow is needed it carries an offset and a soft blur. No zero-offset halos.

## Motion

**The one authored moment is the morph.** Thirty thousand points hold a Keplerian
accretion disc, then snap onto an orthogonal lattice, then relax into a vascular tree. The
same vertices throughout — only the connectivity and the attractor change. That is the
argument the page is making, stated in geometry: the same matter, reorganised.

Everything else is restraint. Section text uses one exponential ease-out from an
already-visible default, with a per-act signature rather than one identical entrance:
Act I rises and settles (orbital), Act II arrives on a hard cubic step (engineered),
Act III eases on the cardiac curve (systolic). Easing `cubic-bezier(.16,1,.3,1)`, 620ms.

Scroll is never hijacked. Native scroll, sticky canvas, rAF-lerped camera. Keyboard,
scrollbar, trackpad and touch all behave exactly as the platform intends.

## Browser surfaces

Themed, not defaulted: selection (`--accretion` at 22% on `--fg`), caret, custom scrollbar
(2px `--rule` track, `--accretion` thumb), focus ring (2px `--clinical`, 3px offset),
`text-underline-offset`, and `font-variant-numeric: tabular-nums` on every readout so the
magnitude counter does not jitter as it counts.

## Degradation is a design state, not a failure

- **No WebGL** → a CSS-composed Act I still renders: a real conic-gradient accretion ring
  over a radial void, with the full narrative intact. Designed, not stripped.
- **`prefers-reduced-motion`** → camera parks at each act's rest pose, morph is stepped at
  act boundaries rather than scrubbed, particle drift stops. No parallax.
- **Low DPR / low core count** → particle count and pixel ratio scale down; the composition
  does not change.
- **Photography absent** → plates render a designed pending state with the real caption.
  Never a broken image, never a circle-masked stand-in for a person.

## Refusals

No cards as page structure. No eyebrow above any heading. No gradient text. No glass as
decoration. No stock photography of other doctors standing in for him. No invented metric,
date, or institution. 3D is never wallpaper: each configuration is the thing it depicts,
behaving as that thing behaves — Keplerian shear, orthogonal snap, systolic pulse.
