# Photography

The four portraits are in place. Each was resized to 1200px on the long edge, stripped of
metadata and encoded as WebP; the page reserves each one's exact intrinsic size so nothing
shifts as they load. If a file is ever missing, that plate falls back to a designed
"awaiting plate" state rather than a broken image.

| Filename | Where it appears | The photograph |
|---|---|---|
| `plate-01-clinical.webp` | Act III — clinical practice | White coat, stethoscope, against the pale wall |
| `plate-02-studio.webp`   | Masthead                    | Black-and-white studio portrait, suit and turtleneck |
| `plate-03-altitude.webp` | Act I — research            | Leather jacket, Himalayan snowline behind you |
| `plate-04-field.webp`    | Close                       | With friends in the forest stream |

## Replacing one

- **Format** — WebP. To use a different format, change the matching `src` in `index.html`;
  nothing else references these paths.
- **Size** — 1200px on the long edge. The largest slot renders at about 545 CSS pixels, so
  that still covers a 2x display with nothing wasted. Update the `width`/`height`
  attributes on the `<img>` to the real pixel size, or the page will reserve the wrong
  space and the layout will jump as it loads.
- **Quality** — q82 suits the portraits. The field photograph is q70: dense foliage is
  expensive to encode and that is where the size/quality curve flattens.
- **Orientation** — all four are portrait or near-square in the layout. Plates 01 and 03
  are framed 3:4; plates 02 and 04 sit in wider wells. Any aspect ratio will work — the
  image is never cropped by the layout, the well adapts.
- **Colour** — the page applies a light desaturation at rest and restores full colour on
  hover, so supply them in normal colour. Plate 02 is already monochrome; that is fine and
  intentional.

## Alt text

Each `<img>` in `index.html` already carries a description of the photograph. If you swap
in a different picture, update the `alt` text and the `<figcaption>` to match what is
actually shown — the caption is treated as content, not decoration.
