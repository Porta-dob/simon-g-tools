// Opens the offline file from disk in a headless browser, runs its self-test and reports what the browser logged.
//   node selftest.mjs <file> [chrome path]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(process.argv[2]);
const chrome = process.argv[3] || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 300);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-selftest-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let code = 1;
try {
  let targets = null;
  for (let i = 0; i < 50 && !targets; i++) { await sleep(300); try { targets = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); } catch (e) { /* not up yet */ } }
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let id = 0; const pending = new Map(); const log = []; const requests = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    if (m.method === 'Log.entryAdded') log.push(m.params.entry.level + ': ' + m.params.entry.text);
    if (m.method === 'Runtime.exceptionThrown') log.push('exception: ' + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') log.push('console.error: ' + m.params.args.map(a => a.value || a.description).join(' '));
    if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url.slice(0, 80));
  };
  const send = (method, params) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params: params || {} })); });
  await send('Log.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable');
  await send('Page.navigate', { url: pathToFileURL(file).href + '#selftest' });
  let state = '';
  for (let i = 0; i < 300; i++) {
    await sleep(500);
    const r = await send('Runtime.evaluate', { expression: "document.documentElement.getAttribute('data-selftest') || ''", returnByValue: true });
    state = r && r.result ? r.result.value : '';
    if (/^(PASS|FAIL)/.test(state)) break;
  }
  console.log(state || 'no result');
  const outside = requests.filter(u => !/^(file:|data:|blob:|about:)/.test(u));
  console.log('requests to a network address:', outside.length, outside.slice(0, 5).join(' '));
  console.log('browser log entries:', log.length); log.slice(0, 12).forEach(l => console.log('  ' + l.slice(0, 300)));
  code = /^PASS/.test(state) && outside.length === 0 && log.length === 0 ? 0 : 1;
  ws.close();
} finally {
  proc.kill();
  await sleep(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* the browser may still hold it */ }
}
process.exit(code);
