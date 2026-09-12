# PRODUCT.md — Dr. Akash Mehra, personal site

## What this is

A single-page personal site for Dr. Akash Mehra: a physician who codes, researches,
and leads. Not a CV. Not a portfolio of deliverables. It is a piece of work in its own
right — the artifact *is* the argument that this person operates at the intersection of
clinical medicine, engineering, and research.

Source of truth for every factual claim below: the subject's own brief, supplied
verbatim by the user on 2026-09-12. Nothing here is inferred or embellished.

## The subject

**Name:** Dr. Akash Mehra
**Email:** singh.akash0717@gmail.com
**GitHub:** akash-mehra
**LinkedIn:** https://www.linkedin.com/in/akash-mehra-a54a2319a

**Positioning (his words, condensed):** A dedicated medical professional driven by a dual
passion for robust clinical practice, research innovation, and healthcare leadership.
Thrives at the intersection of clinical excellence, data-driven research, and operational
execution. Bridges frontline medicine with technical literacy.

**Verified facts — the five pillars:**

1. **Clinical versatility.** House Surgeon. High-volume experience including intensive
   rotations in Orthopaedics, and dedicated primary-care delivery during rural postings —
   critical rural health infrastructure.
2. **Advanced research / space medicine.** Completed a competitive summer internship at the
   Indian Space Lab, focused on high-level scientific inquiry and complex research
   methodologies.
3. **Technical adaptability.** An avid programmer who blends clinical insight with technical
   logic. Interested in the intersection of software and hardware; actively exploring the
   emerging capabilities and applications of drone technology.
4. **Healthcare leadership.** Co-Convenor, Indian Medical Association Student Network
   (IMA MSN), 2021–2022. Drove student advocacy, professional development, and network
   coordination across the region.
5. **Project & event management.** Batch Representative and Student Union Executive
   Committee Member. Led the organisation of major institutional milestones — managing
   cross-functional teams, logistics, and large-scale budgets.

**Open to:** connecting with fellow clinicians, tech innovators, and global professionals.

## Mode

**Experience.** The visitor is inside the work itself. The artifact leads from the first
viewport; the interface recedes. Success is not a click — it is that a stranger scrolls to
the end and comes away with an unmistakable impression of who this person is.

## The audience and the scene

Three readers, in order of weight:

1. **Fellow clinicians and programme directors** — evaluating credibility. They need the
   facts to be findable in seconds, unembellished, and correctly weighted.
2. **Tech innovators and research collaborators** — evaluating whether he is a real
   technical peer or a doctor who dabbles. The site itself answers this: it is the proof.
3. **Global professionals / recruiters** — skimming on a phone, at night, probably in bed.

**Use scene decides the palette:** this is a portfolio opened in a dark room, on a phone or
a laptop, out of curiosity rather than obligation. Near-black is the correct ground — not a
category default, a read of the scene.

## The spine

Three acts, descending in scale from the cosmic to the cellular. The sequence carries real
information: it is the arc of his own attention, and each act hands off to the next through
a shared visual grammar rather than a cut.

**I — Origin / Space.** Black holes, accretion, gravitational lensing. His space-lab
research and the scale of scientific inquiry.

**II — Structure / Code.** The same particle field resolves into lattice, circuitry, flight
path. Programming, software–hardware, drones.

**III — Life / Medicine.** The lattice becomes vasculature and a beating heart. Clinical
practice, orthopaedics, rural primary care, leadership.

The through-line stated plainly: **the same curiosity, at three scales.**

## Constraints and non-negotiables

- **Zero build step.** Static files at repo root, GitHub Pages, publishing to
  https://akash-mehra.github.io/Akash-mehra/ — a subpath, because the repo is named `Akash-mehra`
  rather than `akash-mehra.github.io`, so every asset path must stay relative.
  A single workflow publishes it; it compiles nothing, it only copies.
- **One runtime dependency:** three.js from CDN, pinned, with SRI. Everything else is
  native platform — no GSAP, no scroll library, no animation framework.
- **Photography is real or absent.** Four portraits exist (white coat / stethoscope;
  black-and-white studio in suit; leather jacket against Himalayan snowline; friends at a
  forest waterfall) but are not on disk in this environment. Drop-in slots ship with a
  designed absent-state, never a broken image.
- **Must degrade honestly.** No WebGL, reduced motion, or a weak GPU must yield a site that
  is still complete and still beautiful — not a stripped apology.
- **Accessible.** Keyboard-navigable, screen-reader-legible, contrast-compliant. The whole
  narrative must be readable with WebGL entirely off.
- **Never claim what he did not claim.** No invented dates, institutions, publication
  counts, or metrics. Where a number would be expected and none exists, use none.

## What would make a polished result feel wrong

- A template that happens to be dark. If it could be reskinned for a SaaS startup, it failed.
- 3D as wallpaper. Every object must be the thing it depicts, behaving as that thing behaves.
- Effects that stutter. A dropped frame costs more than a missing feature.
- Reverent, inflated copy. He is early-career and precise; the writing must be too.
