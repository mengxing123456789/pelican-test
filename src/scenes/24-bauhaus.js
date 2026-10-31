// 24 · 包豪斯构成 · 1923 — the figure is assembled, not drawn.
//
// THE PROBLEM THIS PANEL SOLVES
// -----------------------------
// The other panels draw the pelican. This one CONSTRUCTS it: a circle, two
// rectangles and a triangle are placed on a grid according to a rule, and the
// pelican appears as a consequence. That is the Bauhaus proposition — form
// follows construction — and it only works if nothing is hand-drawn.
//
// So there are no curves here that are not arcs of circles, no colours that are
// not one of three, and no position that is not on the 8-unit grid.
//
// TECHNIQUE
// ---------
// Primary palette (red / yellow / blue) plus black and off-white, as Bauhaus
// printing actually used. The composition is built from three rotated squares,
// a set of bars of graduated thickness, and the rider re-expressed as
// primitives: the body a circle, the beak a triangle, the wheels two circles
// and the frame two bars.
//
// Gag: the construction is exposed. The bars that "hold" the pelican slide in
// at u≈1.5 like a diagram being assembled, and at the end the whole thing
// rotates a quarter turn as if going back to the drawing board.
import { rng, clamp, lerp } from '../kit/math.js';

const ID = 'bauhaus';
const RED = [200, 51, 43];
const YELLOW = [232, 178, 42];
const BLUE = [38, 86, 150];
const BLACK = [26, 24, 22];
const PAPER = [238, 232, 216];

const RIDE = { hold: [2.0, 3.2], speed: 0.0, ramp: 0.3 };
const ROAD_Y = 812;
const GRID = 1000 / 8;           // 8-unit grid

export default {
  id: ID,
  index: 23,
  color: '#c8332b',
  title: { zh: '包豪斯构成', en: 'Bauhaus Construction' },
  year: { zh: '1923 年', en: '1923' },
  frame: { kind: 'square' },
  ride: RIDE,

  init(K) {
    const S = 1400;
    this.base = K.layer('grid', S, S, (ctx) => {
    const s = S / 1000;

    // paper
    ctx.fillStyle = `rgb(${PAPER[0]},${PAPER[1]},${PAPER[2]})`;
    ctx.fillRect(0, 0, S, S);

    // the grid, printed faintly: the construction is the subject, so its
    // scaffolding is left visible rather than hidden
    ctx.strokeStyle = 'rgba(26,24,22,0.10)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * GRID * s, 0); ctx.lineTo(i * GRID * s, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * GRID * s); ctx.lineTo(S, i * GRID * s); ctx.stroke();
    }

    // three rotated squares, the canonical Bauhaus opening
    const squares = [
      { x: 240, y: 300, n: 250, rot: -0.18, c: RED },
      { x: 700, y: 240, n: 190, rot: 0.42, c: BLUE },
      { x: 640, y: 560, n: 300, rot: 0.10, c: YELLOW },
    ];
    for (const q of squares) {
      ctx.save();
      ctx.translate(q.x * s, q.y * s);
      ctx.rotate(q.rot);
      ctx.fillStyle = `rgb(${q.c[0]},${q.c[1]},${q.c[2]})`;
      ctx.fillRect((-q.n / 2) * s, (-q.n / 2) * s, q.n * s, q.n * s);
      ctx.restore();
    }

    // a band of graduated bars: pure rhythm, no function
    ctx.fillStyle = `rgb(${BLACK[0]},${BLACK[1]},${BLACK[2]})`;
    for (let i = 0; i < 7; i++) {
      const w = 8 + i * 5;
      ctx.fillRect((60 + i * 26) * s, 700 * s, w * s, 150 * s);
    }
    });
  },

  render(K, u, ctx) {
    image(this.base, 0, 0, 1000, 1000);

    // ---- the rider, constructed ---------------------------------------
    // Everything below is a circle, a bar or a triangle. No freehand curve.
    const cx = 500;
    const cy = ROAD_Y - 130;
    const bob = Math.sin(u * 4.8) * 4;

    // wheels: two circles, plus a spoke cross
    noFill();
    stroke(BLACK[0], BLACK[1], BLACK[2], 235);
    strokeWeight(9);
    circle(cx - 66, ROAD_Y - 44 + bob, 128);
    circle(cx + 66, ROAD_Y - 44 + bob, 128);
    strokeWeight(3);
    for (const dx of [-66, 66]) {
      line(cx + dx - 50, ROAD_Y - 44 + bob, cx + dx + 50, ROAD_Y - 44 + bob);
      line(cx + dx, ROAD_Y - 44 + bob - 50, cx + dx, ROAD_Y - 44 + bob + 50);
    }

    // frame: two bars, drawn in as the construction assembles
    const built = clamp((u - 1.2) / 0.7, 0, 1);
    strokeWeight(10);
    stroke(RED[0], RED[1], RED[2], 240);
    line(cx - 66, ROAD_Y - 44 + bob, cx, cy + bob);
    stroke(BLUE[0], BLUE[1], BLUE[2], 240);
    line(cx, cy + bob, cx + 66, ROAD_Y - 44 + bob);

    // body: a circle (the pelican reduced to its primitive)
    noStroke();
    fill(PAPER[0] - 12, PAPER[1] - 12, PAPER[2] - 12, 255);
    circle(cx + 4, cy - 26 + bob, 108);

    // the beak: a triangle, the only place a diagonal is allowed
    fill(YELLOW[0], YELLOW[1], YELLOW[2], 255);
    push();
    translate(cx + 56, cy - 40 + bob);
    rotate(-0.12 + Math.sin(u * 2) * 0.03);
    triangle(0, -16, 104, -2, 0, 16);
    pop();

    // the eye: a solid dot, no expression beyond its position
    fill(BLACK[0], BLACK[1], BLACK[2], 255);
    circle(cx + 40, cy - 52 + bob, 12);

    // neck: a bar, not a curve
    stroke(PAPER[0] - 12, PAPER[1] - 12, PAPER[2] - 12, 255);
    strokeWeight(26);
    line(cx + 14, cy - 60 + bob, cx + 28, cy - 108 + bob);

    // ---- the assembly diagram: thin rules that appear while building ---
    if (built < 1) {
      stroke(26, 24, 22, 90 * (1 - built));
      strokeWeight(1.2);
      line(cx - 200, cy + bob, cx + 200, cy + bob);
      line(cx, cy + bob - 160, cx, cy + bob + 160);
      noFill();
      circle(cx, cy + bob, 320);
    }

    // ---- the quarter turn at the end: back to the drawing board -------
    const turn = clamp((u - 5.0) / 0.9, 0, 1);
    if (turn > 0.01) {
      push();
      translate(500, 500);
      rotate(turn * Math.PI * 0.5);
      translate(-500, -500);
      noStroke();
      fill(PAPER[0], PAPER[1], PAPER[2], 255 * turn * 0.92);
      rect(-200, -200, 1400, 1400);
      pop();
    }

    // road: one black bar
    noStroke();
    fill(26, 24, 22, 220);
    rect(0, ROAD_Y, 1000, 6);
  },

  overlay() { return null; },
};
