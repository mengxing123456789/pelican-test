#!/usr/bin/env node
// Build the README preview strip from the current film.
//
// WHY
// ---
// The README had no pictures of v2. A reader had to download 340 MB to find out
// whether the chase reads at all. This samples a few moments that each carry a
// different claim, tiles them with labels, and writes media/preview.jpg.
//
// The frames chosen are not "pretty moments"; each answers a question:
//   the preface      — does the new opening line land?
//   the lunge        — is the pelican visibly reaching for the drawing?
//   a mid chase      — is the drawing present across eras, not just once?
//   Han rubbing      — does an original panel still read?
//   Islamic/mosaic   — do the four new traditions hold up?
//   the ending       — does the reveal close the loop?
//
// USAGE
//   node tools/preview-strip.mjs                     # from out/pelican-test_1080p60.mp4
//   node tools/preview-strip.mjs --film out/x.mp4
//   node tools/preview-strip.mjs --times 2,10,40 --out media/preview.jpg

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './server.mjs';
import { parseArgs } from './lib/args.mjs';
import { sceneStart, DURATION } from '../src/beat/timeline.js';

const a = parseArgs(process.argv.slice(2));
const film = path.resolve(ROOT, a.film || 'out/pelican-test_1080p60.mp4');
const out = path.resolve(ROOT, a.out || 'media/preview.jpg');
const cols = Number(a.cols || 3);
const thumbW = Number(a.w || 720);

if (!fs.existsSync(film)) {
  console.error(`FAIL: ${film} not found — render the film first`);
  process.exit(1);
}

// Each shot: [time, caption]. Times come from the timeline so the strip stays
// correct if the film's length changes again.
//
// The +4.6 offset matters. Sampling at +3.2 s kept catching the moment when the
// camera is still sliding the panel into place, so every tile showed the
// neighbouring panels' edges — the strip looked like a contact sheet of
// three-up frames rather than a picture of one panel. By ~4.6 s into a panel
// the camera has settled; the crop below then trims the remaining slivers.
const shots = a.times
  ? String(a.times).split(',').map((t) => [Number(t), `t=${t}s`])
  : [
      [2.0, '序 · 风把画吹走了'],
      [sceneStart(2) + 4.6, '汉画像石 · 伸翅去够'],
      [sceneStart(10) + 4.7, '浮世绘'],
      [sceneStart(12) + 4.7, '星月夜'],
      [sceneStart(20) + 4.7, '伊斯兰几何 · 新增'],
      [sceneStart(21) + 4.8, '拜占庭马赛克 · 新增'],
      [sceneStart(22) + 4.8, '非洲面具 · 新增'],
      [sceneStart(23) + 4.7, '包豪斯构成 · 新增'],
      [DURATION - 2.2, '尾声 · 画上画的正是它自己'],
    ];

const tmp = path.join(ROOT, 'out', '_preview');
fs.mkdirSync(tmp, { recursive: true });

console.log(`film   ${path.relative(ROOT, film)}`);
console.log(`shots  ${shots.length}`);

// 1. extract each frame
const files = [];
shots.forEach(([t, cap], i) => {
  const f = path.join(tmp, `p${String(i).padStart(2, '0')}.png`);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', film,
    // Crop the outer 14% before scaling: even with the camera settled there are
    // slivers of the neighbouring frames at the edges, and a preview tile should
    // show ONE panel, not the joinery.
    '-frames:v', '1', '-vf', `crop=iw*0.60:ih*0.82:iw*0.20:ih*0.09,scale=${thumbW}:-1`, f], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(f)) {
    console.error(`  FAILED at t=${t}: ${(r.stderr || '').slice(0, 200)}`);
    process.exit(1);
  }
  files.push({ file: f, cap });
  console.log(`  ${String(i + 1).padStart(2)}  t=${t.toFixed(1).padStart(6)}s  ${cap}`);
});

// 2. tile them with captions, using ffmpeg's montage-free approach:
//    drawtext needs a font with CJK support; label with a latin fallback instead
//    and put the Chinese captions in the README under the image.
const rows = Math.ceil(files.length / cols);
const pattern = path.join(tmp, 'p%02d.png');
const strip = path.join(tmp, 'strip.jpg');

const vf = [
  `tile=${cols}x${rows}:padding=8:margin=8:color=0x1a1a1c`,
].join(',');

const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', pattern,
  '-vf', vf, '-frames:v', '1', '-q:v', '3', strip], { encoding: 'utf8' });
if (r.status !== 0) {
  console.error('tile failed:', (r.stderr || '').slice(0, 400));
  process.exit(1);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.copyFileSync(strip, out);
fs.rmSync(tmp, { recursive: true, force: true });

const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`\nwrote ${path.relative(ROOT, out)}  (${kb} kB, ${cols}x${rows})`);
console.log('captions, in order:');
shots.forEach(([, cap], i) => console.log(`  ${i + 1}. ${cap}`));
