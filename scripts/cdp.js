'use strict';
// Minimal Chrome DevTools Protocol driver for headless audits.
// Usage: const { openPage } = require('./cdp.js');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = path.resolve(__dirname, '..');

// Resolve the `ws` module from the project's own node_modules first (so a
// fresh `git clone` + `npm install` works anywhere), then fall back to a few
// well-known locations. Throws a clear, actionable error if not installed.
function resolveWS() {
  const candidates = [
    path.join(PROJECT, 'node_modules', 'ws'),
    '/tmp/node_modules/ws',                     // this mobile workspace
  ];
  for (const c of candidates) {
    try { fs.accessSync(path.join(c, 'package.json')); return c; } catch (e) {}
  }
  throw new Error(
    'The "ws" package is required for the browser audits but is not installed.\n' +
    'Run `npm install` in the project root (it is listed under devDependencies).\n' +
    'The Python validators (npm test) do NOT need it.');
}

const WebSocket = require(resolveWS());

// Resolve a Chromium/Chrome binary. Priority: CHROME_BIN env var, then a list
// of common install locations (Linux/macOS/Windows), then this workspace's
// Playwright cache. Exported so other audit scripts share one resolution.
const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  '/tmp/pw-chromium/chrome-linux/chrome',       // this mobile workspace
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/usr/local/bin/chromium', '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

function resolveChrome() {
  for (const c of CHROME_CANDIDATES) {
    try { fs.accessSync(c); return c; } catch (e) {}
  }
  throw new Error(
    'No Chromium/Chrome binary found for the browser audits.\n' +
    'Install Chromium, or set CHROME_BIN=/path/to/chrome.\n' +
    'The Python validators (npm test) do NOT need a browser.');
}

const CHROME = resolveChrome();

function launch(port = 9333) {
  const proc = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${port}`, 'about:blank'
  ], { stdio: 'ignore' });
  return proc;
}

async function waitForEndpoint(port, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const page = list.find(t => t.type === 'page');
      if (page) return page;
    } catch (e) { /* not up yet */ }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`Chrome endpoint on :${port} never came up`);
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [];
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) { this.events.push(msg); }
    });
  }
  static async connect(url) {
    const ws = new WebSocket(url, { perMessageDeflate: false, maxPayload: 200 * 1024 * 1024 });
    await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
    return new CDP(ws);
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { resolve: res, reject: rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}

async function openPage(port = 9333) {
  const proc = launch(port);
  const page = await waitForEndpoint(port);
  const cdp = await CDP.connect(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  return { proc, cdp, target: page };
}

module.exports = { launch, waitForEndpoint, CDP, openPage, resolveWS, resolveChrome, CHROME };
