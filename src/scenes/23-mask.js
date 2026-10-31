// 23 · 非洲面具 · c. 1850 — a face built from planes, seen head-on.
//
// THE PROBLEM THIS PANEL SOLVES
// -----------------------------
// Every other panel shows the pelican from the SIDE, because it is riding
// across the frame. A mask is carved to be looked at frontally, and its whole
// formal language — symmetry about a vertical axis, planes that catch light at
// different angles, features reduced to volumes — only works head-on.
//
// So the panel does the one thing it can: it turns the rider to face us. The
// bicycle becomes a wheel seen edge-on (a single ellipse), and the pelican
// becomes a mask: two eyes, a beak as a carved ridge, a brow as a raised plane.
//
// TECHNIQUE
// ---------
// Wood is not a texture here, it is the SHADING MODEL: every plane is filled
// with a wood-grain gradient and its brightness is set by its angle to the
// light. The carved look comes from the planes meeting at hard edges with a
// bright lip along one side and a dark cut along the other — that bevel is what
// distinguishes carving from painting.
//
// Gag: it is still pedalling. The bicycle, seen head-on, wobbles left and right
// under it, so the mask appears to be riding a unicycle badly.
import { rng, clamp, lerp, smoothstep } from '../kit/math.js';

const ID = 'mask';
const WOOD_DARK = [58, 34, 22];
const WOOD_MID = [104, 64, 38];
const WOOD_LIGHT = [150, 104, 62];
const WHITE = [232, 220, 196];
const SOOT = [26, 18, 14];
const RED = [140, 44, 34];

const RIDE = { hold: [1.6, 4.0], speed: 0.0, ramp: 0.32 };
const ROAD_Y = 830;

/** Wood grain as a fill: streaks along x, denser at the edges. */
function woodFill(ctx, x, y, w, h, seed, base) {
  const rr = rng(seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 26; i++) {
    const yy = y + rr() * h;
    const th = 0.6 + rr() * 2.2;
    const dark = rr() > 0.5;
    ctx.fillStyle = dark ? 'rgba(30,16,8,0.30)' : 'rgba(200,150,100,0.16)';
    ctx.beginPath();
    ctx.moveTo(x, yy);
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      ctx.lineTo(x + t * w, yy + Math.sin(t * 6 + i) * (2 + rr() * 3));
    }
    ctx.lineTo(x + w, yy + th);
    for (let k = 10; k >= 0; k--) {
      const t = k / 10;
      ctx.lineTo(x + t * w, yy + Math.sin(t * 6 + i) * (2 + rr() * 3) + th);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export default {
  id: ID,
  index: 22,
  color: '#4a2c1d',
  title: { zh: '非洲面具', en: 'African Mask' },
  year: { zh: '约 1850 年', en: 'c. 1850' },
  frame: { kind: 'square' },
  ride: RIDE,

  init(K) {
    // The mask itself never changes: it is carved once. Only the bicycle and
    // the tilt are animated, which is the joke — an unchanging face on a
    // wobbling vehicle.
    const S = 1200;
    const mw = 220;            // half width, in mask units
    const mh = 300;            // half height
    const top = 150;

    // K.layer returns a frozen p5.Image: one texture upload, not one per frame.
    this.mask = K.layer('carved', S, S, (ctx) => {
    const cx = S / 2;
    const sc = S / 1000;
    // ---- the mask: built from planes --------------------------------

    // brow plane, tilted up to the light
    woodFill(ctx, cx - mw * sc, top * sc, mw * 2 * sc, 96 * sc, 'brow', WOOD_LIGHT);

    // forehead plane, darker
    woodFill(ctx, cx - mw * 0.94 * sc, (top + 96) * sc, mw * 1.88 * sc, 90 * sc, 'fore', WOOD_MID);

    // eye sockets: deep cuts
    ctx.fillStyle = `rgb(${SOOT[0]},${SOOT[1]},${SOOT[2]})`;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + s * 78 * sc, (top + 150) * sc, 62 * sc, 30 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // the eyes themselves: white shells with a dark pupil
    for (const s of [-1, 1]) {
      const ex = cx + s * 78 * sc;
      const ey = (top + 150) * sc;
      ctx.fillStyle = `rgb(${WHITE[0]},${WHITE[1]},${WHITE[2]})`;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 44 * sc, 21 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgb(${SOOT[0]},${SOOT[1]},${SOOT[2]})`;
      ctx.beginPath();
      ctx.arc(ex, ey, 13 * sc, 0, Math.PI * 2);
      ctx.fill();
    }

    // cheek planes, angled in
    woodFill(ctx, cx - mw * 0.88 * sc, (top + 190) * sc, mw * 0.62 * sc, 150 * sc, 'cheekL', WOOD_MID);
    woodFill(ctx, cx + mw * 0.26 * sc, (top + 190) * sc, mw * 0.62 * sc, 150 * sc, 'cheekR', WOOD_DARK);

    // the beak: a carved ridge running down the centre, bright on one side
    woodFill(ctx, cx - 46 * sc, (top + 190) * sc, 46 * sc, 300 * sc, 'beakL', WOOD_LIGHT);
    woodFill(ctx, cx, (top + 190) * sc, 46 * sc, 300 * sc, 'beakR', WOOD_DARK);
    // its cut edge
    ctx.fillStyle = 'rgba(20,10,6,0.7)';
    ctx.fillRect(cx - 1.4 * sc, (top + 190) * sc, 2.8 * sc, 300 * sc);

    // mouth: a red-smeared slot
    ctx.fillStyle = `rgb(${RED[0]},${RED[1]},${RED[2]})`;
    ctx.beginPath();
    ctx.ellipse(cx, (top + 512) * sc, 54 * sc, 22 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    // the bright lip along the top of the brow: this single highlight is what
    // makes the whole thing read as carved rather than flat
    ctx.fillStyle = 'rgba(240,214,170,0.55)';
    ctx.fillRect(cx - mw * sc, top * sc, mw * 2 * sc, 5 * sc);
    });

    this.maskBox = { w: mw * 2, h: mh * 2 + 300 };
  },

  render(K, u, ctx) {
    // ---- ground: dark, so the mask's planes carry the light -----------
    background(22, 16, 12);
    noStroke();
    for (let k = 0; k < 14; k++) {
      fill(40, 26, 18, 10);
      rect(0, k * 72, 1000, 72);
    }

    // ---- the bicycle, seen head on, wobbling --------------------------
    // One ellipse (the wheel edge-on) and a fork, tilting with a slow sine.
    const lean = Math.sin(u * 2.4) * 0.11;
    const bobY = Math.sin(u * 4.8) * 5;
    const hubY = ROAD_Y - 96;

    push();
    translate(500, hubY + bobY);
    rotate(lean);

    // the wheel, edge-on: one narrow ellipse
    noFill();
    stroke(232, 220, 196, 210);
    strokeWeight(13);
    ellipse(0, 96, 34, 168);
    stroke(255, 246, 224, 120);
    strokeWeight(3);
    ellipse(0, 96, 34, 168);

    // fork and bars
    stroke(214, 198, 170, 190);
    strokeWeight(9);
    line(0, 10, 0, -58);
    line(-30, -66, 30, -66);
    pop();

    // ---- the body between the mask and the bars ----------------------
    // Without this the mask floats. A short carved neck and shoulders tie the
    // face to the vehicle, so the panel reads as one rider rather than a mask
    // hovering over a wheel.
    push();
    translate(500, hubY + bobY);
    rotate(lean * 0.55);
    noStroke();
    // shoulders: a trapezoid, wide at the bottom
    fill(WOOD_MID[0], WOOD_MID[1], WOOD_MID[2]);
    beginShape();
    vertex(-58, -96);
    vertex(58, -96);
    vertex(44, -34);
    vertex(-44, -34);
    endShape(CLOSE);
    // a darker cut down the middle, so the shoulders are two planes
    fill(WOOD_DARK[0], WOOD_DARK[1], WOOD_DARK[2], 200);
    rect(-3, -96, 6, 62);
    // neck
    fill(WOOD_LIGHT[0], WOOD_LIGHT[1], WOOD_LIGHT[2]);
    rect(-17, -150, 34, 60);
    pop();

    // ---- the mask, on top of it ---------------------------------------
    // Proportions matter here: at first the mask was 150 wide against a 116-wide
    // body and the three pieces read as separate objects. The head is now
    // slightly WIDER than the shoulders (a mask is the whole head) and overlaps
    // the neck, so the silhouette is continuous.
    const MASK_W = 132;
    const maskScale = MASK_W / this.maskBox.w;
    const maskH = this.maskBox.w * maskScale;
    push();
    translate(500, hubY + bobY - 148);
    rotate(lean * 0.75);
    image(this.mask, -MASK_W / 2, -maskH, MASK_W, maskH);
    pop();

    // ---- dust, kicked up by the wobble --------------------------------
    const rr = rng(`mask-dust-${Math.floor(u * 10)}`);
    noStroke();
    for (let k = 0; k < 18; k++) {
      const x = 460 + rr() * 120;
      const y = ROAD_Y + 4 + rr() * 30;
      fill(150, 120, 88, 20 + rr() * 40);
      circle(x, y, 6 + rr() * 22);
    }

    // road
    noStroke();
    fill(70, 48, 32, 160);
    rect(0, ROAD_Y, 1000, 3);
  },

  overlay() { return null; },
};
