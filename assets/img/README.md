# Photography

Drop your four portraits in here using **exactly these filenames**. Nothing else is
needed — the page picks them up automatically, and until a file exists that plate renders
a designed "awaiting plate" state rather than a broken image.

| Filename | Where it appears | The photograph |
|---|---|---|
| `plate-01-clinical.jpg`  | Act III — clinical practice | White coat, stethoscope, against the pale wall |
| `plate-02-studio.jpg`    | Masthead                    | Black-and-white studio portrait, suit and turtleneck |
| `plate-03-altitude.jpg`  | Act I — research            | Leather jacket, Himalayan snowline behind you |
| `plate-04-field.jpg`     | Close                       | With friends in the forest stream |

## Preparation

- **Format** — `.jpg`. If you'd rather ship `.webp` or `.avif`, change the `src` in
  `index.html` to match; nothing else references these paths.
- **Size** — roughly 1400px on the long edge is plenty. The largest slot renders at about
  560 CSS pixels, so anything beyond ~1600px is wasted bytes on a phone.
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
