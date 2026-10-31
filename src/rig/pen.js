// Default "pen line" rendering of the placed rig (book-plate / neutral style).
// It is also the reference for scene styles: walk rigParts(P) back → front and
// map each part's ROLE to your era's palette and technique.
import { brush, flush } from '../kit/brush.js';
import { seed } from '../kit/seed.js';
import { rigParts } from './parts.js';

// role → [fill, outline weight factor, outline colour override]
const COLOR_STYLE = {
  legFar: ['#d38a63', 0.6, 'far'], footFar: ['#d98b62', 0.6, 'far'], crankFar: [null, 1.3, 'far'],
  tire: [null, 2.2, '#2a2624'], rim: [null, 0.7], spoke: [null, 0.35], hub: ['ink', 0.5],
  chain: [null, 0.5], frame: [null, 1.6, '#b3352b'], fork: [null, 1.5, '#b3352b'], stem: [null, 1.3], bars: [null, 1.3],
  seatpost: [null, 1.2], saddle: [null, 2.2], ring: [null, 0.8],
  tail: ['#fbfaf4', 1], body: ['#fbfaf4', 1], wing: ['#fbfaf4', 0.9], secondaries: [null, 1.8, '#24201d'], primary: [null, 1.5, '#24201d'],
  neck: ['#fbfaf4', 0.9], head: ['#fbfaf4', 0.9], crest: [null, 0.6], pouch: ['#f2a640', 0.8], bill: ['#efcf98', 0.8],
  nail: ['#d4693a', 0], face: ['#f4c7a6', 0], eye: ['#ffffff', 0.5], pupil: ['ink', 0], eyeShut: [null, 0.8],
  leg: ['#ef9a6e', 0.8], foot: ['#ef9a6e', 0.7], crank: [null, 1.6], pedal: [null, 2.4],
};

/**
 * Draw a placed pose P (from rig.placed) with pen strokes and flat washes.
 * opts: { ink, weight, brushName, color (false = monochrome engraving), key, far }
 */
export function drawPen(P, opts = {}) {
  const ink = opts.ink ?? '#1e1a17';
  const W = opts.weight ?? 1;
  const bn = opts.brushName ?? 'HB';
  const key = opts.key ?? 'pen';
  const col = opts.color !== false;
  // v2: when set, every filled part is filled with this colour instead of the
  // built-in palette — and instead of the forced '#ffffff' that `color: false`
  // otherwise produces. The Byzantine panel uses it to gild the figure; the
  // Islamic panel uses it to punch the figure out of the tilework as a hole.
  const fillInk = opts.fillInk ?? null;
  // v2: outline only, no fills at all. `color: false` normally forces every
  // filled part to white, which silently painted over a figure that had already
  // been drawn underneath. Scenes that draw their own silhouette pass this so
  // drawPen contributes the keyline and nothing else.
  const strokeOnly = opts.strokeOnly === true;
  const farInk = '#7d736a';

  for (const part of rigParts(P)) {
    if (part.layer === 'far' && opts.far === false) continue;
    const [fillC0, wf, inkC0] = COLOR_STYLE[part.role] || [null, 1];
    let fillC = strokeOnly ? null : (fillC0 === 'ink' ? ink : fillC0);

    // ---- v2: the fillInk path -------------------------------------------
    // Deliberately does NOT go through brush at all. p5.brush composites its
    // strokes through a shader at flush time, and that pass replaced the flat
    // colour underneath — which is why four attempts at "fill, then stroke"
    // all came out as an outline. Here the silhouette is drawn with p5's own
    // fill and the part is then stroked with a plain p5 line, so no brush
    // compositing can overwrite it.
    if (fillInk) {
      const inkC = ink;
      push();
      noStroke();
      fill(fillInk);
      if (part.kind === 'circle') circle(part.c[0], part.c[1], part.r * 2);
      else if (part.kind === 'poly') {
        beginShape();
        for (const [px, py] of part.pts) vertex(px, py);
        endShape(CLOSE);
      }
      if (W > 0) {
        noFill();
        stroke(inkC);
        strokeWeight(wf * W);
        if (part.kind === 'circle') circle(part.c[0], part.c[1], part.r * 2);
        else if (part.kind === 'poly') {
          beginShape();
          for (const [px, py] of part.pts) vertex(px, py);
          endShape(CLOSE);
        }
      }
      pop();
      continue;
    }

    if (!col && fillC && fillC !== ink) fillC = part.layer === 'far' ? '#e9e4dc' : '#ffffff';
    if (!col && (part.role === 'nail' || part.role === 'face')) continue;
    const inkC = inkC0 === 'far' ? farInk : col && inkC0 ? inkC0 : ink;
    const w = wf * W;

    seed(key, part.name, 'f');
    if (part.kind === 'circle') {
      if (fillC) { brush.noStroke(); brush.wash(fillC, 255); brush.circle(part.c[0], part.c[1], part.r); brush.noWash(); }
      if (w > 0) { seed(key, part.name, 'o'); brush.noFill(); brush.set(bn, inkC, w); brush.circle(part.c[0], part.c[1], part.r); }
    } else if (part.kind === 'poly') {
      if (fillC) { brush.noStroke(); brush.wash(fillC, 255); brush.polygon(part.pts); brush.noWash(); }
      if (w > 0) { seed(key, part.name, 'o'); brush.set(bn, inkC, w); brush.spline(part.pts.concat([part.pts[0]]), 0); }
    } else {
      brush.noFill(); brush.noWash(); brush.set(bn, inkC, w);
      if (part.pts.length === 2) brush.line(part.pts[0][0], part.pts[0][1], part.pts[1][0], part.pts[1][1]);
      else brush.spline(part.pts, 0);
    }
  }
}
