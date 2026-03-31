const WS = require('ws');
const fs = require('fs');
const http = require('http');

const OUT = 'cdp_diag2.txt';
fs.writeFileSync(OUT, '');
function log(msg) { fs.appendFileSync(OUT, msg + '\n'); console.log(msg); }

http.get('http://127.0.0.1:9222/json/list', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    const targets = JSON.parse(d);
    const t = targets.find((x) => x.url.includes('tauri.localhost')) || targets[0];
    log('TARGET: ' + t.url + ' | ' + t.title);
    const ws = new WS(t.webSocketDebuggerUrl);
    let nextId = 0;
    function send(method, params) { const id = ++nextId; ws.send(JSON.stringify({ id, method, params })); return id; }
    const pending = new Map();

    ws.on('open', () => {
      log('CONNECTED');
      const id0 = send('Runtime.enable');
    });

    ws.on('message', (m) => {
      const msg = JSON.parse(String(m));
      if (msg.id === 1) {
        // Check all TAURI_INTERNALS properties
        const checks = [
          ['HAS_IPC', '"ipc" in window.__TAURI_INTERNALS__ ? "YES" : "NO"'],
          ['HAS_POSTMESSAGE', '"postMessage" in window.__TAURI_INTERNALS__ ? "YES" : "NO"'],
          ['HAS_PATTERN', '"__TAURI_PATTERN__" in window.__TAURI_INTERNALS__ ? "YES_" + JSON.stringify(window.__TAURI_INTERNALS__.__TAURI_PATTERN__) : "NO"'],
          ['HAS_METADATA', '"metadata" in window.__TAURI_INTERNALS__ ? "YES" : "NO"'],
          ['METADATA_LABEL', 'window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label || "none"'],
          ['INTERNALS_KEYS', 'Object.getOwnPropertyNames(window.__TAURI_INTERNALS__).join(",")'],
          ['IS_TAURI', 'String(!!window.isTauri)'],
          ['WINDOW_CUSTOM_PROTO', 'window.__TAURI_INTERNALS__?.convertFileSrc ? window.__TAURI_INTERNALS__.convertFileSrc("test", "ipc") : "no_convertFileSrc"'],
        ];
        
        checks.forEach(([label, expr], i) => {
          setTimeout(() => {
            const id = send('Runtime.evaluate', { expression: expr, returnByValue: true });
            pending.set(id, label);
          }, 200 * (i + 1));
        });
      }

      if (msg.id > 1 && pending.has(msg.id)) {
        const label = pending.get(msg.id);
        const val = msg.result?.result?.value;
        const err = msg.result?.exceptionDetails?.exception?.description;
        log(label + ': ' + (val !== undefined ? String(val) : 'ERR:' + err));
        pending.delete(msg.id);
      }
    });

    setTimeout(() => { log('DONE'); process.exit(0); }, 8000);
  });
});
