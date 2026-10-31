// The drawing the pelican is chasing.
//
// WHY THIS EXISTS
// ---------------
// v1 of the film had no object of desire: the pelican rode, the styles
// changed, the film ended. v2's premise is that the wind took a drawing, so
// the drawing has to be *visible*, and it has to be visibly the thing being
// pursued — always a little ahead of the rider, always at the frame's leading
// edge, never quite caught.
//
// It is deliberately drawn in the CURRENT panel's idiom: in the Sahara panel it
// is ochre pigment on rock, in the ukiyo-e panel it is a woodblock print. That
// way the chase reads as one drawing being re-drawn by every era it passes
// through, rather than a static prop sliding across twenty backgrounds.
//
// CONTRACT
// --------
//   paperAt(t, scenes) -> { x, y, rot, scale, alpha, edge } in SCREEN pixels
//     x/y are the sheet's centre, rot in radians, scale relative to the base
//     size, alpha 0..1, edge 0..1 is how close it is to leaving the frame
//
// Pure function of t. No randomness, no Date — the project's determinism rule.

import * as TL from '../beat/timeline.js';

/** Base sheet size in screen pixels at 1920x1080. */
// Kept small on purpose. The first pass used 150x196 and it read as a sticky
// note pasted over the panel: too bright, too large, and it competed with the
// pelican for attention. The sheet is a lure, not a prop — at roughly the size
// of the rider's head it registers without stealing the frame.
const BASE_W = 92;
const BASE_H = 120;

/**
 * Where the sheet is at time t.
 *
 * The motion is one slow sine of period 2 bars, phased so the sheet is at its
 * highest and most tilted exactly on each cut: the cut is when the wind takes
 * it again, so the sheet should look like it has just been snatched at that
 * instant, not like it is gliding calmly through the boundary.
 */
export function paperAt(t) {
  if (t < TL.INTRO_END || t >= TL.OUTRO_START) return null;

  const i = TL.sceneIndexAt(t);
  const u = (t - TL.sceneStart(i)) / TL.SCENE_DUR;   // 0..1 within the panel

  // Leading edge: ahead of the rider and drifting right with the panel.
  const x = TL.VIEW_W * (0.62 + 0.20 * u);

  // A slow bob, one full cycle over the panel, plus a small secondary wobble so
  // it never looks metronomic.
  const bob = Math.sin(u * Math.PI * 2) * 54;
  const y = TL.VIEW_H * 0.30 + bob + Math.sin(u * Math.PI * 6) * 9;

  // Tilt: the wind catches it hardest at the start and end of the panel.
  const rot = -0.16 + Math.sin(u * Math.PI * 2 - 0.6) * 0.22;

  // Slight scale breathing, so it reads as paper and not a sticker.
  const scale = 1 + Math.sin(u * Math.PI * 2 + 1.1) * 0.05;

  // It fades in after the cut and out just before the next one: the wind takes
  // it out of frame exactly when the world changes.
  const fadeIn = Math.min(1, u / 0.10);
  const fadeOut = Math.min(1, (1 - u) / 0.12);
  const alpha = Math.max(0, Math.min(fadeIn, fadeOut));

  // 1 at the very edge of the panel, 0 in the middle — used to decide whether
  // the sheet is about to be snatched.
  const edge = Math.min(1, Math.abs(u - 0.5) * 2 * 0.5 + 0.5);

  return { x, y, rot, scale, alpha, edge, w: BASE_W * scale, h: BASE_H * scale, u, i };
}

/**
 * Draw the sheet. Kept separate from paperAt so the caller controls ordering
 * (it must go UNDER the rider, so the pelican can reach toward it).
 *
 * `ctx.tint` is the panel's accent colour; the sheet is drawn in it so the
 * drawing belongs to the era it is passing through.
 */
export function drawPaper(K, p, tint) {
  if (!p || p.alpha <= 0.001) return;
  const a = p.alpha;

  push();
  translate(p.x, p.y);
  rotate(p.rot);

  // drop shadow, so the paper separates from the panel behind it
  noStroke();
  fill(0, 0, 0, 46 * a);
  rect(-p.w / 2 + 5, -p.h / 2 + 6, p.w, p.h, 2);

  // The sheet is not pure white: at this size a full-brightness rectangle
  // lights up like a UI element. A warm off-white, and never fully opaque,
  // lets the era's own background show through so it sits in the picture.
  fill(243, 234, 214, 214 * a);
  rect(-p.w / 2, -p.h / 2, p.w, p.h, 2);

  // a hairline border, the way a mounted drawing is ruled
  noFill();
  stroke(tint[0], tint[1], tint[2], 150 * a);
  strokeWeight(1.2);
  rect(-p.w / 2 + 7, -p.h / 2 + 7, p.w - 14, p.h - 14);

  // the drawing on the sheet: a small pelican-on-a-bicycle, in the panel's ink.
  // Drawn as a few strokes rather than the full rig — at this size the rig's
  // detail turns to mud, and it has to read as a sketch of the subject.
  const ink = tint;
  stroke(ink[0], ink[1], ink[2], 210 * a);
  strokeWeight(1.7);
  noFill();

  const cx = 0;
  const cy = 6;
  // The sketch below is authored against a 92-wide sheet; scaling by the
  // actual width keeps the drawing in proportion if BASE_W changes again.
  const s = p.w / 92;

  // wheels
  circle(cx - 26 * s, cy + 26 * s, 40 * s);
  circle(cx + 26 * s, cy + 26 * s, 40 * s);
  // frame
  line(cx - 26 * s, cy + 26 * s, cx, cy + 2 * s);
  line(cx, cy + 2 * s, cx + 26 * s, cy + 26 * s);
  line(cx - 26 * s, cy + 26 * s, cx + 10 * s, cy + 22 * s);
  line(cx + 10 * s, cy + 22 * s, cx + 26 * s, cy + 26 * s);
  // body
  ellipse(cx + 2 * s, cy - 22 * s, 46 * s, 26 * s);
  // neck and head
  line(cx + 18 * s, cy - 28 * s, cx + 26 * s, cy - 46 * s);
  circle(cx + 29 * s, cy - 50 * s, 15 * s);
  // the beak — the one feature that makes it unmistakably a pelican
  line(cx + 35 * s, cy - 52 * s, cx + 54 * s, cy - 46 * s);
  line(cx + 54 * s, cy - 46 * s, cx + 36 * s, cy - 42 * s);

  pop();
}
