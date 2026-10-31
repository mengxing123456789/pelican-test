// Puppeteer helpers: every launch is fully isolated (own temp profile, pipe
// transport), so several tools / agents can run Chrome at the same time.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Windows / Linux port: the upstream project targets macOS and hard-codes the
// macOS Chrome path and the Metal ANGLE backend. Both are wrong here, so detect
// per platform and fall back to the original values when nothing is found.
// CHROME_PATH still wins, exactly as before.
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return candidates[0];
}

export const CHROME = findChrome();

// ANGLE backend: Metal exists only on macOS. On Windows the equivalent is
// D3D11; the SwiftShader fallback needs BOTH --use-angle and
// --enable-unsafe-swiftshader, or p5.brush's shader fails to compile with a
// literal "compiling the vertex shader: null".
const ANGLE_ARGS =
  process.platform === 'darwin'
    ? ['--use-angle=metal']
    : process.env.PT_SOFTWARE_GL === '1'
      ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
      : ['--use-angle=d3d11', '--force_high_performance_gpu'];

export async function launch({ width = 1920, height = 1080 } = {}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pelican-chrome-'));
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    pipe: true,
    // The score renders in one long evaluate() call and the heavy scenes need
    // minutes for a single still; puppeteer's default 180 s protocolTimeout
    // aborts those with "Runtime.callFunctionOn timed out".
    protocolTimeout: 0,
    userDataDir: profile,
    defaultViewport: { width, height, deviceScaleFactor: 1 },
    args: [
      ...ANGLE_ARGS,
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--autoplay-policy=no-user-gesture-required',
      `--window-size=${width},${height}`,
    ],
  });
  const close = async () => {
    try { await browser.close(); } catch {}
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  };
  return { browser, close };
}

// Open a page, forward console errors, and wait for window.__ready.
export async function openPage(browser, url, { timeout = 300000, verbose = false } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => {
    const type = m.type();
    if (type === 'error' || verbose) {
      const text = m.text();
      if (type === 'error') errors.push(text);
      console.log(`[page ${type}] ${text}`);
    }
  });
  page.on('pageerror', (e) => {
    errors.push(String(e));
    console.log('[pageerror]', e.message);
  });
  await page.goto(url, { waitUntil: 'load', timeout });
  await page.waitForFunction('window.__ready === true || !!window.__fatal', { timeout, polling: 100 });
  const fatal = await page.evaluate(() => window.__fatal || null);
  if (fatal) throw new Error('page failed to initialise: ' + fatal);
  return { page, errors };
}
