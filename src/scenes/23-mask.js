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

const RIDE = { hold: [2.1, 3.3], speed: 0.0, ramp: 0.32 };
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

    // The whole rider is built at 1.5x and hung off one anchor. At 1x the
    // figure read as a small brown stick in the middle of a lot of black; a
    // mask is a head, and a head has to be a substantial part of the frame.
    const SC = 1.5;
    const lean = Math.sin(u * 2.4) * 0.11;
    const bobY = Math.sin(u * 4.8) * 5;
    const wheelBottom = ROAD_Y;
    const hubY = wheelBottom - 84 * SC;

    push();
    // One scale wraps the entire rider, so every part grows together and the
    // proportions stay as designed. Scaling each piece separately is what made
    // the earlier attempts drift apart.
    translate(500, wheelBottom);
    scale(SC);
    translate(-500, -wheelBottom);

    push();
    translate(500, hubY + bobY);
    rotate(lean);

    // tyre and rim
    noFill();
    stroke(232, 220, 196, 210);
    strokeWeight(13);
    ellipse(0, 0, 34, 168);
    stroke(255, 246, 224, 120);
    strokeWeight(3);
    ellipse(0, 0, 34, 168);

    // the fork: rises from the hub to the bars, closing the gap that used to
    // leave the body floating above the wheel
    stroke(214, 198, 170, 190);
    strokeWeight(9);
    line(0, -8, 0, -74);
    line(-30, -80, 30, -80);
    pop();

    // ---- the body: continuous from the wheel to the mask --------------
    // The first version placed the wheel at hubY+96, the body at hubY-96 and
    // the mask at hubY-148: three pieces 190 units apart, which read as three
    // separate objects. Everything now hangs off one anchor and overlaps.
    push();
    translate(500, hubY + bobY - 74);
    rotate(lean * 0.55);
    noStroke();
    // shoulders: a trapezoid, wide at the bottom, sitting on the fork
    fill(WOOD_MID[0], WOOD_MID[1], WOOD_MID[2]);
    beginShape();
    vertex(-52, -6);
    vertex(52, -6);
    vertex(40, 58);
    vertex(-40, 58);
    endShape(CLOSE);
    // a darker cut down the middle, so the shoulders are two planes
    fill(WOOD_DARK[0], WOOD_DARK[1], WOOD_DARK[2], 200);
    rect(-3, -6, 6, 64);
    // neck, rising out of the shoulders
    fill(WOOD_LIGHT[0], WOOD_LIGHT[1], WOOD_LIGHT[2]);
    rect(-16, -74, 32, 72);
    pop();

    // ---- the mask, on top of it ---------------------------------------
    // The carved layer is a full 1200x1200 square and the face occupies the
    // middle ~440 of it. Scaling by maskBox.w (440) therefore blew the face up
    // past the frame; the scale has to be relative to the LAYER, with the face
    // kept in proportion by the factor 440/1200.
    const MASK_W = 96;                        // drawn face width, panel units
    const LAYER = 1200;                       // the carved layer's pixel size
    const faceW = 440;                        // how much of it the face fills
    const spriteW = MASK_W * (LAYER / faceW);
    const spriteH = spriteW;                  // the layer is square
    push();
    translate(500, hubY + bobY - 74 - 60);
    rotate(lean * 0.75);
    image(this.mask, -spriteW / 2, -spriteH * 0.60, spriteW, spriteH);
    pop();

    pop();   // the rider's overall scale

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
