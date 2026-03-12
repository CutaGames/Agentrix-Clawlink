const WS = require('ws');
const fs = require('fs');
const http = require('http');

const OUT = 'cdp_diag.txt';
fs.writeFileSync(OUT, '');

function log(msg) {
  fs.appendFileSync(OUT, msg + '\n');
  console.log(msg);
}

http.get('http://127.0.0.1:9222/json/list', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    const targets = JSON.parse(d);
    const t = targets.find((x) => x.url.includes('tauri.localhost')) || targets[0];
    log('TARGET: ' + t.url + ' | ' + t.title);

    const ws = new WS(t.webSocketDebuggerUrl);
    let nextId = 0;

    function send(method, params) {
      const id = ++nextId;
      ws.send(JSON.stringify({ id, method, params }));
      return id;
    }

    ws.on('open', () => {
      log('CONNECTED');
      send('Runtime.enable');
    });

    const pending = new Map();

    ws.on('message', (m) => {
      const msg = JSON.parse(String(m));
      
      if (msg.id === 1) {
        // Runtime.enable done, start diagnostics
        
        // 1. Check invoke key
        const id1 = send('Runtime.evaluate', { 
          expression: 'String(typeof window.__TAURI_INVOKE_KEY__ !== "undefined" ? window.__TAURI_INVOKE_KEY__ : "UNDEFINED")',
          returnByValue: true 
        });
        pending.set(id1, 'INVOKE_KEY_TYPE');

        // 2. Check the IPC transport
        const id2 = send('Runtime.evaluate', {
          expression: 'String(window.__TAURI_INTERNALS__?.transformCallback?.toString().substring(0,100) || "no_transformCallback")',
          returnByValue: true
        });
        pending.set(id2, 'TRANSFORM_CALLBACK');

        // 3. Check the ipc handler
        const id3 = send('Runtime.evaluate', {
          expression: 'String(typeof window.__TAURI_IPC__)',
          returnByValue: true
        });
        pending.set(id3, 'IPC_HANDLER_TYPE');

        // 4. Intercept console to catch ACL errors
        const id4 = send('Runtime.evaluate', {
          expression: 'window.__cdp_errors = []; const _origErr = console.error; console.error = function() { window.__cdp_errors.push(Array.from(arguments).join(" ")); _origErr.apply(console, arguments); }; "intercepted"',
          returnByValue: true
        });
        pending.set(id4, 'INTERCEPT_CONSOLE');

        // 5. After intercepting console, invoke a command
        setTimeout(() => {
          const id5 = send('Runtime.evaluate', {
            expression: 'window.__TAURI_INTERNALS__.invoke("desktop_bridge_log_debug_event", {message: "diag_test"}); "invoked"',
            returnByValue: true
          });
          pending.set(id5, 'INVOKE_FIRE');
        }, 1000);

        // 6. After a delay, check for errors
        setTimeout(() => {
          const id6 = send('Runtime.evaluate', {
            expression: 'JSON.stringify(window.__cdp_errors || [])',
            returnByValue: true
          });
          pending.set(id6, 'ERRORS_AFTER_INVOKE');
        }, 3000);

        // 7. Try calling invoke with explicit callback tracking
        setTimeout(() => {
          const id7 = send('Runtime.evaluate', {
            expression: 'var result = "pending"; window.__TAURI_INTERNALS__.invoke("desktop_bridge_get_clipboard_text", {}).then(function(v){result = "RESOLVED:" + JSON.stringify(v)}).catch(function(e){result = "REJECTED:" + String(e)}); setTimeout(function(){ }, 0); "fired"',
            returnByValue: true
          });
          pending.set(id7, 'INVOKE_CLIPBOARD_FIRE');
        }, 3500);

        setTimeout(() => {
          const id8 = send('Runtime.evaluate', {
            expression: 'result',
            returnByValue: true
          });
          pending.set(id8, 'INVOKE_CLIPBOARD_RESULT');
        }, 6000);
      }

      if (msg.id > 1 && pending.has(msg.id)) {
        const label = pending.get(msg.id);
        const val = msg.result?.result?.value;
        const err = msg.result?.exceptionDetails?.exception?.description || msg.error?.message;
        log(label + ': ' + (val !== undefined ? val : 'ERR:' + err));
        pending.delete(msg.id);
      }
    });

    ws.on('error', (e) => log('WS_ERROR: ' + e));

    setTimeout(() => {
      log('DONE');
      process.exit(0);
    }, 10000);
  });
});
