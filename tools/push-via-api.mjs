/**
 * push-via-api.mjs — publish this working tree to GitHub without git-over-HTTPS.
 *
 * WHY THIS EXISTS
 * ---------------
 * `git push` fails here: github.com:443 resets the connection
 * ("RPC failed; curl 56 Recv failure"). The GitHub REST API is reachable
 * through the `gh` CLI, so this walks the tree and drives the Git Data API
 * instead: blobs -> tree -> commit -> ref update. The resulting history is
 * real commits, not a tarball upload.
 *
 * USAGE
 *   node tools/push-via-api.mjs                 # push current HEAD as one commit
 *   node tools/push-via-api.mjs --dry-run       # show what would be sent
 *
 * The commit message and author are taken from the local HEAD commit so the
 * published history keeps the same intent. Files are taken from the working
 * tree, restricted to what `git ls-files` tracks (so ignored artifacts such as
 * out/ and audio/*.wav never leave the machine).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const REPO = process.env.PUSH_REPO || 'mengxing123456789/pelican-test';
const BRANCH = process.env.PUSH_BRANCH || 'main';
const dryRun = process.argv.includes('--dry-run');

const git = (...args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

const api = (args, input) => {
  const opts = { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };
  if (input !== undefined) opts.input = JSON.stringify(input);
  const out = execFileSync('gh', ['api', ...args], opts);
  return out.trim() ? JSON.parse(out) : null;
};

// `--jq` already emits a bare scalar, so return it as text.
const apiText = (args) =>
  execFileSync('gh', ['api', ...args], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  }).trim();

const apiPost = (endpoint, body) =>
  api(['-X', 'POST', endpoint, '--input', '-'], body);

// ---------------------------------------------------------------- the commit
const message = git('log', '-1', '--pretty=%B');
const authorName = git('log', '-1', '--pretty=%an');
const authorEmail = git('log', '-1', '--pretty=%ae');
const subject = message.split('\n')[0];

console.log(`repo    ${REPO} (${BRANCH})`);
console.log(`commit  ${subject}`);

// ---------------------------------------------------------------- the files
const files = git('ls-files').split('\n').filter(Boolean);
const blobs = [];
let bytes = 0;

for (const rel of files) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.warn(`  skip (missing) ${rel}`);
    continue;
  }
  const buf = fs.readFileSync(abs);
  bytes += buf.length;
  blobs.push({ rel, buf });
}

console.log(`files   ${blobs.length}  (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
if (dryRun) {
  blobs.slice(0, 10).forEach((b) => console.log(`  would send ${b.rel} (${b.buf.length} B)`));
  console.log(`  ... and ${Math.max(0, blobs.length - 10)} more`);
  process.exit(0);
}

// Base the new commit on whatever the branch currently points at, so pushing
// twice does not discard history.
// Read the current branch head. A 404 means the branch does not exist yet
// (an empty repo), which is different from "exists but no commits".
let parentSha = null;
try {
  parentSha = apiText([`repos/${REPO}/git/ref/heads/${BRANCH}`, '--jq', '.object.sha']);
} catch (e) {
  const msg = String(e.stderr || '');
  if (!/Not Found|404/.test(msg)) throw e;
  parentSha = null;
}

// ---------------------------------------------------------------- the tree entries
// path -> blob sha, posted in batches to stay well under API limits.
const entries = [];
let n = 0;
for (const { rel, buf } of blobs) {
  const sha = apiPost(`repos/${REPO}/git/blobs`, {
    content: buf.toString('base64'),
    encoding: 'base64',
  }).sha;
  entries.push({ path: rel, mode: '100644', type: 'blob', sha });
  if (++n % 25 === 0) console.log(`  blobs ${n}/${blobs.length}`);
}
console.log(`  blobs ${entries.length}/${blobs.length} done`);

const tree = apiPost(`repos/${REPO}/git/trees`, { tree: entries }).sha;
console.log(`tree    ${tree}`);

const commit = apiPost(`repos/${REPO}/git/commits`, {
  message,
  tree,
  parents: parentSha ? [parentSha] : [],
  author: { name: authorName, email: authorEmail },
}).sha;
console.log(`commit  ${commit}`);

if (parentSha) {
  api(['-X', 'PATCH', `repos/${REPO}/git/refs/heads/${BRANCH}`, '--input', '-'], {
    sha: commit,
    force: false,
  });
} else {
  apiPost(`repos/${REPO}/git/refs`, {
    ref: `refs/heads/${BRANCH}`,
    sha: commit,
  });
}

console.log(`\npushed -> https://github.com/${REPO}/commit/${commit}`);
