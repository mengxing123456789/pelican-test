#!/usr/bin/env node
// Render the whole film in segments, encoding each one before the next starts.
//
// WHY THIS EXISTS
// ---------------
// The full PNG sequence for a 9660-frame film at ~3.1 MB/frame is ~29 GB. On a
// disk with 28 GB free that fails partway through — and render.mjs reports a
// disk-full run as "0 failed" because it counts frames it *attempted*, so the
// failure is silent (that is how an earlier run produced 1359 empty frames and
// still exited 0).
//
// This tool sidesteps the problem instead of racing it: render N frames, encode
// those N frames to a segment MP4, delete the PNGs, repeat, then concatenate.
// Peak disk use is one segment, not the whole film.
//
// USAGE
//   node tools/render-segmented.mjs                    # whole film, audio muxed at the end
//   node tools/render-segmented.mjs --seg 1500         # smaller segments
//   node tools/render-segmented.mjs --from 0 --to 3000 # a range only
//   node tools/render-segmented.mjs --keep             # keep the PNG segments
//
// The concatenated result is written to out/pelican-test_1080p60.mp4.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './server.mjs';
import { parseArgs } from './lib/args.mjs';
import { FPS, FRAMES, DURATION } from '../src/beat/timeline.js';

const a = parseArgs(process.argv.slice(2));
const SEG = Number(a.seg || 1600);
const from = Number(a.from || 0);
const to = Math.min(FRAMES - 1, Number(a.to ?? FRAMES - 1));
const keep = !!a.keep;
const wav = path.resolve(ROOT, a.audio || 'audio/mix.wav');
const outFile = path.resolve(ROOT, a.out || `out/pelican-test_1080p${FPS}.mp4`);

const framesDir = path.join(ROOT, 'frames');
const segDir = path.join(ROOT, 'out', '_segs');
const tmpDir = path.join(ROOT, 'out', '_tmp');

for (const d of [segDir, tmpDir, path.dirname(outFile)]) fs.mkdirSync(d, { recursive: true });

const run = (cmd, args, label) => {
  process.stdout.write(`  ${label} … `);
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) {
    console.log('FAILED');
    console.error((r.stderr || '').slice(-2000));
    process.exit(1);
  }
  console.log('ok');
};

console.log(`segmented render: frames ${from}..${to} in blocks of ${SEG}`);
console.log(`film: ${FRAMES} frames, ${DURATION} s @ ${FPS} fps\n`);

const segments = [];

for (let start = from; start <= to; start += SEG) {
  const end = Math.min(to, start + SEG - 1);
  // Segment files are named by their FIRST FRAME, not by a running index.
  // Naming them 000, 001, ... meant that a second run starting at frame 4010
  // also called its first block "seg_000" and silently overwrote the finished
  // 0..2409 block. The frame number cannot collide.
  const segFile = path.join(segDir, `seg_${String(start).padStart(5, '0')}.mp4`);
  segments.push(segFile);

  // Skip a block that a previous run already finished. Only the encode is
  // skipped, and only when the file is real (non-zero); the segment still goes
  // into `segments`, so the concatenation at the end covers the whole film.
  // Without this, resuming an interrupted run with --from 6400 would concatenate
  // just the tail and quietly produce a two-minute film.
  if (a['skip-existing'] && fs.existsSync(segFile) && fs.statSync(segFile).size > 0) {
    console.log(`[frames ${start}] blocks ${start}..${end} — already done, skipping`);
    continue;
  }

  console.log(`[frames ${start}] blocks ${start}..${end} (${end - start + 1})`);

  // 1. render this block
  //
  // --resume is always on: frames are deleted after each block, so for a normal
  // run it costs nothing, but after an interrupted run it re-renders only the
  // frames that never landed instead of the whole block.
  run('node', ['tools/render.mjs', '--from', String(start), '--to', String(end),
    '--workers', String(a.workers || 6), '--resume', '--out', 'frames'], 'render');

  // 2. verify what actually landed before trusting it
  const expected = end - start + 1;
  const got = fs.readdirSync(framesDir).filter((f) => f.endsWith('.png'));
  const empty = got.filter((f) => fs.statSync(path.join(framesDir, f)).size === 0);
  if (got.length !== expected || empty.length) {
    console.error(`  VERIFY FAILED: expected ${expected}, found ${got.length}, empty ${empty.length}`);
    console.error('  refusing to encode a partial block');
    process.exit(1);
  }
  console.log(`  verify: ${got.length} frames, 0 empty`);

  // 3. encode this block, silent (audio is muxed once at the end).
  //    --start is essential: this block's first file is f02410.png, and without
  //    it ffmpeg's image2 demuxer looks for f00000.png and reports
  //    "could find no file or sequence" — which is exactly how the first
  //    segmented run failed.
  run('node', ['tools/encode.mjs', '--no-audio', '--frames', 'frames',
    '--start', String(start),
    '--out', path.relative(ROOT, segFile)], 'encode');

  // 4. free the space immediately — this is the whole point
  if (!keep) {
    for (const f of got) fs.unlinkSync(path.join(framesDir, f));
    console.log('  freed segment PNGs');
  }

  const free = (() => {
    try {
      const s = spawnSync('df', ['-h', ROOT.replace(/^([A-Za-z]):.*/, '/$1').toLowerCase()], { encoding: 'utf8' });
      return (s.stdout || '').trim().split('\n').pop();
    } catch { return '?'; }
  })();
  console.log(`  disk: ${free}\n`);

}

// 5. concatenate the segments
console.log('concatenating…');
const listFile = path.join(tmpDir, 'segs.txt');
fs.writeFileSync(listFile, segments.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'));

const silent = path.join(tmpDir, 'film_silent.mp4');
run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silent], 'concat');

// 6. mux the score
//
// No -shortest. With a concatenated video input it truncated the audio: the
// delivered file declared 161 s but carried 134 s of samples, losing exactly
// one segment's worth. Explicit -map and no -shortest keeps both streams whole;
// if their lengths ever disagree, check-sync reports it instead of silently
// dropping the tail.
if (fs.existsSync(wav)) {
  run('ffmpeg', ['-y', '-i', silent, '-i', wav,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart', outFile], 'mux audio');

  // verify the mux kept the whole score
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0',
    '-show_entries', 'stream=duration', '-of', 'csv=p=0', outFile], { encoding: 'utf8' });
  const aDur = parseFloat((probe.stdout || '0').trim());
  if (Math.abs(aDur - DURATION) > 0.5) {
    console.error(`  WARNING: audio is ${aDur.toFixed(2)} s but the film is ${DURATION} s`);
    console.error('  run `node tools/check-sync.mjs` before publishing');
  } else {
    console.log(`  audio: ${aDur.toFixed(2)} s (film ${DURATION} s)`);
  }
} else {
  fs.copyFileSync(silent, outFile);
  console.log('  no audio/mix.wav found — wrote a silent film');
}

const mb = (fs.statSync(outFile).size / 1048576).toFixed(0);
console.log(`\nwrote ${path.relative(ROOT, outFile)}  (${mb} MB, ${segments.length} segment(s))`);

// clean the scratch concatenation file but keep the segments unless asked
try { fs.unlinkSync(listFile); fs.unlinkSync(silent); } catch {}
