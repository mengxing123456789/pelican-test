#!/usr/bin/env node
// Verify the rendered frame sequence before encoding.
//
// WHY THIS EXISTS
// ---------------
// tools/render.mjs reports "0 failed" by counting frames it *attempted*. When
// the disk fills up mid-render it writes zero-byte files, logs each as
// "frame N failed: ENOSPC", and still exits 0. That happened once here: 1359
// frames were empty and nothing in the exit code said so.
//
// This checks what actually landed on disk:
//   1. the expected count for the film length
//   2. no zero-byte files
//   3. no missing indices
//   4. every file decodes as a PNG (catches truncated writes)
//
// Exit code 1 on any failure, so it can gate an encode.
//
//   node tools/check-frames.mjs                 # frames/
//   node tools/check-frames.mjs --dir work/probe
//   node tools/check-frames.mjs --quick         # skip the PNG decode pass

import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './server.mjs';
import { parseArgs } from './lib/args.mjs';
import { FRAMES } from '../src/beat/timeline.js';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const a = parseArgs(process.argv.slice(2));
const dir = path.resolve(ROOT, a.dir || 'frames');
const expected = a.expect ? Number(a.expect) : FRAMES;

console.log(`checking ${path.relative(ROOT, dir)}  (expect ${expected} frames)`);

if (!fs.existsSync(dir)) {
  console.error(`FAIL: ${dir} does not exist — render first`);
  process.exit(1);
}

const names = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
const entries = names.map((f) => {
  const full = path.join(dir, f);
  return { f, full, size: fs.statSync(full).size, idx: Number(f.slice(1, -4)) };
});

let failed = false;
const fail = (m) => { failed = true; console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

// 1. count
if (entries.length === expected) ok(`${expected} frames present`);
else fail(`expected ${expected} frames, found ${entries.length}`);

// 2. zero-byte (the ENOSPC signature)
const empty = entries.filter((e) => e.size === 0);
if (empty.length) fail(`${empty.length} zero-byte frames (disk full?) first: ${empty.slice(0, 3).map((e) => e.f).join(', ')}`);
else ok('no zero-byte frames');

// 3. gaps
const have = new Set(entries.map((e) => e.idx));
const missing = [];
for (let i = 0; i < expected; i++) if (!have.has(i)) missing.push(i);
if (missing.length) fail(`${missing.length} missing indices, first: ${missing.slice(0, 5).join(', ')}`);
else ok('indices contiguous 0..' + (expected - 1));

// 4. decodable PNGs (catches writes truncated by a full disk)
if (!a.quick && !empty.length) {
  let bad = 0;
  for (const e of entries) {
    const fd = fs.openSync(e.full, 'r');
    const head = Buffer.alloc(8);
    fs.readSync(fd, head, 0, 8, 0);
    fs.closeSync(fd);
    if (!head.equals(PNG_MAGIC)) { bad++; if (bad <= 3) console.log(`  ✗ not a PNG: ${e.f}`); }
  }
  if (bad) fail(`${bad} files are not valid PNGs`);
  else ok('all files have a valid PNG header');
}

const totalGB = entries.reduce((s, e) => s + e.size, 0) / 1e9;
console.log(`\n${failed ? 'FRAMES FAILED' : 'FRAMES OK'} — ${entries.length} files, ${totalGB.toFixed(1)} GB`);
process.exit(failed ? 1 : 0);
