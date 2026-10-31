// 22 · 拜占庭马赛克 · c. 550 — the image is made of square tiles.
//
// THE PROBLEM THIS PANEL SOLVES
// -----------------------------
// Twenty other panels approximate a continuous surface (paper, canvas, screen).
// A mosaic does the opposite: it REFUSES continuity. The image only appears
// when you stand back, so the same picture has to work at two distances at
// once. Drawing it as "a picture with a tile texture on top" would kill the
// whole point, so this panel draws nothing but tiles — there is no
// intermediate continuous layer to fall back on.
//
// TECHNIQUE
// ---------
// A tesserae grid in which every cell samples a FUNCTION (sky gradient, robe
// shape, halo ring, ground band) and picks its own colour. Cells are jittered
// in size and angle the way real setts are, and gold tesserae catch the light
// differently depending on their angle, which is what makes Byzantine gold read
// as gold rather than as yellow.
//
// Gag: the pelican is rendered in gold tesserae like an imperial figure, and it
// keeps turning to face the viewer — the frontal, hieratic pose of Byzantine
// art — while still pedalling.
import { rng, clamp, lerp, smoothstep } from '../kit/math.js';

const ID = 'byzantine';
const GOLD = [212, 172, 74];
const ROBE = [126, 40, 46];
const SKY_A = [40, 44, 96];
const SKY_B = [86, 96, 156];
const GROUND = [96, 78, 52];
const HALO = [246, 226, 150];

const RIDE = { hold: [1.8, 3.8], speed: 0.0, ramp: 0.34 };
const ROAD_Y = 812;
const TESS = 18;                 // px per tessera at 1000-unit scale

/**
 * Pick the colour a tesseract should be, given where it sits.
 *
 * This is the panel's "picture": a function of position, not a bitmap. Keeping
 * it as a function is what lets the halo and the robe keep their edges as
 * they move, without ever being drawn as vector shapes.
 */
function sample(x, y, u, rider) {
  // sky: vertical gradient with a slight drift, so the mosaic shimmers
  if (y < ROAD_Y - 40) {
    const t = clamp(y / (ROAD_Y - 40), 0, 1);
    let c = [lerp(SKY_A[0], SKY_B[0], t), lerp(SKY_A[1], SKY_B[1], t), lerp(SKY_A[2], SKY_B[2], t)];

    // halo: a disc behind the rider's head, riding along with it
    if (rider) {
      const hx = rider.x + 12;
      const hy = rider.y - 150;
      const d = Math.hypot(x - hx, y - hy);
      if (d < 92) {
        const ring = smoothstep(92, 74, d);
        c = [lerp(c[0], HALO[0], ring), lerp(c[1], HALO[1], ring), lerp(c[2], HALO[2], ring)];
      }
    }
    return c;
  }

  // ground band
  if (y > ROAD_Y + 10) {
    const t = clamp((y - ROAD_Y) / 200, 0, 1);
    return [lerp(GROUND[0], GROUND[0] * 0.7, t), lerp(GROUND[1], GROUND[1] * 0.7, t), lerp(GROUND[2], GROUND[2] * 0.7, t)];
  }

  // the rider: a gold figure, drawn frontally
  if (rider) {
    const dx = (x - rider.x) / 62;
    const dy = (y - (rider.y - 96)) / 108;
    if (dx * dx + dy * dy < 1) return [GOLD[0] * 0.92, GOLD[1] * 0.86, GOLD[2] * 0.7];
    // robe: a trapezoid below the body
    const robeTop = rider.y - 96;
    if (y > robeTop && y < ROAD_Y + 8 && Math.abs(x - rider.x) < 46 - (y - robeTop) * 0.12) {
      return ROBE;
    }
  }

  return GROUND;
}

export default {
  id: ID,
  index: 21,
  color: '#8a6a1f',
  title: { zh: '拜占庭马赛克', en: 'Byzantine Mosaic' },
  year: { zh: '约 550 年', en: 'c. 550' },
  frame: { kind: 'arch' },
  ride: RIDE,

  init(K) {
    // Static tesserae are baked through K.layer; the dynamic part (halo + gold
    // figure) is drawn per frame on top, because it has to follow the rider.
    const S = 1400;
    this.base = K.layer('tesserae', S, S, (ctx) => {
      const rr = rng('byzantine');

      ctx.fillStyle = '#2a2640';
      ctx.fillRect(0, 0, S, S);

      const step = TESS;
      for (let y = 0; y < S; y += step) {
        for (let x = 0; x < S; x += step) {
          const px = (x / S) * 1000;
          const py = (y / S) * 1000;
          const c = sample(px, py, 0, null);
          // each sett is a slightly irregular quadrilateral, not a square:
          // real tesserae are cut by hand and never line up
          const w = step * (0.78 + rr() * 0.2);
          const h = step * (0.78 + rr() * 0.2);
          const ox = x + (step - w) * rr();
          const oy = y + (step - h) * rr();
          const shade = 0.88 + rr() * 0.24;
          ctx.fillStyle = `rgb(${Math.round(c[0] * shade)},${Math.round(c[1] * shade)},${Math.round(c[2] * shade)})`;
          ctx.fillRect(ox, oy, w, h);
        }
      }
      // grout: darken the gaps after the fact
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(30,26,44,0.55)';
      for (let y = 0; y < S; y += step) ctx.fillRect(0, y, S, 1.6);
      for (let x = 0; x < S; x += step) ctx.fillRect(x, 0, 1.6, S);
      ctx.globalCompositeOperation = 'source-over';
    });
  },

  render(K, u, ctx) {
    // the baked field
    image(this.base, 0, 0, 1000, 1000);

    // ---- the imperial pelican, in gold --------------------------------
    if (ctx.rider && ctx.rider.visible) {
      const placed = ctx.rider.placed;

      // Drawn WITHOUT drawPen. Five attempts at routing a flat colour through
      // drawPen all failed — the brush pipeline composites through a shader at
      // flush and the flat fill simply was not on the canvas (measured: the
      // body pixel came back as the background colour). Drawing the silhouette
      // here, with p5's own path API and the same rig parts, is the version
      // that actually puts gold on screen.
      push();
      noStroke();
      fill('#d8ac4a');
      for (const part of K.rig.parts(placed)) {
        if (part.layer === 'far') continue;
        if (part.kind === 'poly') {
          beginShape();
          for (const [px, py] of part.pts) vertex(px, py);
          endShape(CLOSE);
        } else if (part.kind === 'circle') {
          circle(part.c[0], part.c[1], part.r * 2);
        }
      }
      pop();

      // The keyline. `strokeOnly` is essential here: drawPen's `color: false`
      // path fills every part with white, which is what kept painting over the
      // gold in the five earlier attempts.
      K.rig.drawPen(placed, { key: 'byz:rider-ink', color: false, ink: '#3a2418', weight: 0.9, alpha: 215, strokeOnly: true });

      // nimbus: a gold ring, drawn in short radial ticks so it reads as tesserae
      push();
      translate(placed.x ?? 0, placed.y ?? 0);
      noFill();
      const pulse = 1 + Math.sin(u * Math.PI) * 0.02;
      stroke(246, 226, 150, 220);
      strokeWeight(3);
      const R = 118 * pulse;
      const cx = 12;
      const cy = -206;
      for (let k = 0; k < 40; k++) {
        const a0 = (k / 40) * Math.PI * 2;
        const a1 = ((k + 0.7) / 40) * Math.PI * 2;
        line(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
      }
      pop();
    }

    // ---- gold flicker: a few tesserae catch the light -------------------
    const rr = rng(`byz-flicker-${Math.floor(u * 12)}`);
    noStroke();
    for (let k = 0; k < 26; k++) {
      const x = rr() * 1000;
      const y = rr() * (ROAD_Y - 60);
      fill(255, 240, 190, 30 + rr() * 50);
      rect(x, y, TESS * 0.7, TESS * 0.7);
    }

    // road
    noStroke();
    fill(60, 48, 32, 120);
    rect(0, ROAD_Y, 1000, 3);
  },

  overlay() { return null; },
};
