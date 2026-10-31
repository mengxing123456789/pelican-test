// 21 · 伊斯兰几何 · c. 1450 — a rule, not a picture.
//
// THE PROBLEM THIS PANEL SOLVES
// -----------------------------
// The other twenty-four panels all have a subject: a person, a landscape, a
// screen, a face. Islamic geometric ornament does not. Its subject is the
// RULE — a tessellation that is drawn by construction and repeats forever.
// So the question here is not "what is in the picture" but "how do you put a
// rider into a picture that has no place for one".
//
// THE ANSWER
// ----------
// The rider is not drawn ON the pattern. It is drawn AS a gap in it: the
// tessellation is the ground, and the pelican is negative space — a hole in the
// tilework that the eye completes. Every frame the pattern is redrawn from the
// same construction (so it is stable), and the hole moves through it.
//
// TECHNIQUE
// ---------
// A real girih construction, not a wallpaper texture: an underlying grid of
// interlaced kites and decagons, drawn from one radial rule, with the strokes
// passing over and under. The "over/under" is what makes it read as tilework
// rather than as a clip-art border.
//
// Gag: the pattern *avoids* the rider — tiles bow around it — so the pelican is
// permanently displacing an immortal ornament. At u≈2 it rides straight through
// a medallion and the whole field ripples outward from the impact.
import { rng, lerp, clamp, smoothstep, noise2 } from '../kit/math.js';

const ID = 'islamic';
const BG_GROUT = '#12384e';     // deep lapis ground
const TILE_A = '#e8dcc0';       // bone
const TILE_B = '#c9a24a';       // gold
const TILE_C = '#3f8fa8';       // turquoise
const INK = '#0d2735';
const RIDE = { hold: [2.0, 3.6], speed: 0.0, ramp: 0.35 };
const ROAD_Y = 800;

/**
 * One girih star, drawn as interlaced strands.
 *
 * The first version connected every n/2 point, which for n=12 is simply
 * opposite-across: that draws a TRIANGLE, not a star, and the panel came out as
 * a field of triangles. A star polygon needs a step that is neither 1 nor n/2 —
 * the classic timings are n/3 for sharp stars (12 -> 4) and n/4 for soft ones.
 *
 * Two passes: the strands, then short bright patches over the crossings, which
 * is what makes it read as woven rather than as separate outlines.
 */
function star(ctx, cx, cy, r, n, rot, stroke, width, alpha) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';

  // star polygons at two timings: a sharp one and a soft one
  for (const step of [Math.round(n / 3), Math.round(n / 4)]) {
    if (step < 2 || step * 2 === n) continue;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = pts[(i * step) % n];
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
  }

  ctx.restore();
}

export default {
  id: ID,
  index: 20,
  color: '#1d4f6b',
  title: { zh: '伊斯兰几何', en: 'Islamic Geometric Pattern' },
  year: { zh: '约 1450 年', en: 'c. 1450' },
  frame: { kind: 'arch' },
  ride: RIDE,

  init(K) {
    // The tessellation is expensive (hundreds of strokes) and completely
    // static, so it is baked once through K.layer and blitted afterwards.
    // K.layer returns a frozen p5.Image, so its texture uploads once instead of
    // on every image() call.
    const S = 2048;
    this.tiles = K.layer('tiles', S, S, (ctx) => {
      ctx.fillStyle = BG_GROUT;
      ctx.fillRect(0, 0, S, S);

      const cell = S / 6;            // six cells across
      const rr = rng('islamic-tiles');

      for (let gy = -1; gy <= 6; gy++) {
        for (let gx = -1; gx <= 6; gx++) {
          const cx = (gx + 0.5) * cell;
          const cy = (gy + 0.5) * cell;

          // the medallion: a 12-point star on a decagon ring
          star(ctx, cx, cy, cell * 0.40, 12, rr() * 0.2, TILE_A, 3.2, 0.92);
          star(ctx, cx, cy, cell * 0.27, 10, rr() * 0.2, TILE_B, 2.4, 0.85);
          star(ctx, cx, cy, cell * 0.14, 8, rr() * 0.2, TILE_C, 2.0, 0.8);

          // the connective tissue: chords from this centre to the cell corners,
          // which is what turns separate medallions into one field
          ctx.save();
          ctx.strokeStyle = TILE_A;
          ctx.globalAlpha = 0.34;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + dx * cell * 0.5, cy + dy * cell * 0.5);
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      // grout noise: the tiles are not vector-clean
      const img = ctx.getImageData(0, 0, S, S);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (rr() - 0.5) * 14;
        d[i] = clamp(d[i] + n, 0, 255);
        d[i + 1] = clamp(d[i + 1] + n, 0, 255);
        d[i + 2] = clamp(d[i + 2] + n, 0, 255);
      }
      ctx.putImageData(img, 0, 0);
    });
  },

  /**
   * Paint the panel. `u` is the panel-local beat (0..6), `rider` carries the
   * shared rig pose and placement.
   */
  render(K, u, ctx) {
    // ---- ground: the baked tessellation, slowly panning -----------------
    const pan = u * 26;
    const S = 2048;
    const scale = 1000 / S;
    push();
    translate(-pan * 0.5, 0);
    image(this.tiles, 0, 0, S * scale * 1.35, S * scale * 1.35);
    pop();

    // ---- the impact ripple: a medallion is struck at u≈2 ----------------
    const hit = Math.exp(-((u - 2.0) ** 2) / 0.18);
    if (hit > 0.02) {
      const cx = 520;
      const cy = 470;
      noFill();
      for (let k = 0; k < 5; k++) {
        const r = 60 + hit * (150 + k * 85);
        stroke(232, 220, 192, 90 * hit * (1 - k / 5));
        strokeWeight(2.4 - k * 0.3);
        circle(cx, cy, r * 2);
      }
    }

    // ---- the rider as negative space -----------------------------------
    // Drawn as a filled silhouette in the GROUT colour, so it reads as a hole
    // punched through the tilework rather than a figure standing on it. Then a
    // thin gold keyline traces the hole, the way a mason would outline a gap.
    if (ctx.rider && ctx.rider.visible) {
      const placed = ctx.rider.placed;
      // Filled with the grout colour, so the figure is a HOLE in the tilework —
      // not a white bird standing on top of it. Weight 0 = fill only; the
      // keyline below is the mason's outline around that hole.
      K.rig.drawPen(placed, { key: 'islamic:rider', color: false, ink: BG_GROUT, fillInk: BG_GROUT, weight: 0 });

      push();
      translate(2.4, 1.6);
      K.rig.drawPen(placed, { key: 'islamic:rider-key', color: false, ink: TILE_B, weight: 0.5, alpha: 170 });
      pop();
    }

    // ---- road: one continuous grout line ---------------------------------
    noStroke();
    fill(232, 220, 192, 40);
    rect(0, ROAD_Y, 1000, 2);
  },

  overlay() { return null; },
};
