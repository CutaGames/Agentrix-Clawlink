const WS = require('ws');
const fs = require('fs');
const http = require('http');

const OUT = 'cdp_cmd_test.txt';
fs.writeFileSync(OUT, '');
function log(msg) { fs.appendFileSync(OUT, msg + '\n'); console.log(msg); }

http.get('http://127.0.0.1:9222/json/list', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    const targets = JSON.parse(d);
    const t = targets.find((x) => x.url.includes('tauri.localhost')) || targets[0];
    log('TARGET: ' + t.url);
    const ws = new WS(t.webSocketDebuggerUrl);
    let nextId = 0;
    function send(method, params) { const id = ++nextId; ws.send(JSON.stringify({ id, method, params })); return id; }
    const pending = new Map();

    ws.on('open', () => {
      send('Runtime.enable');
    });

    ws.on('message', (m) => {
      const msg = JSON.parse(String(m));
      
      // Log console API calls (to catch Rust-side error messages)
      if (msg.method === 'Runtime.consoleAPICalled') {
        const args = msg.params?.args?.map(a => a.value || a.description || a.type).join(' ');
        log('CONSOLE[' + msg.params?.type + ']: ' + args);
      }

      if (msg.id === 1) {
        // Test each command type with a 6s timeout wrapper
        const cmds = [
          // Simple sync commands
          ['desktop_bridge_get_clipboard_text', '{}'],
          ['desktop_bridge_get_auth_token', '{}'],
          ['desktop_bridge_log_debug_event', '{"message":"cdp_diag_test"}'],
          ['desktop_bridge_get_ball_position', '{}'],
          // Plugin command for comparison
          ['plugin:app|version', '{}'],
        ];

        cmds.forEach(([cmd, args], i) => {
          setTimeout(() => {
            const expr = `new Promise(function(resolve) {
              var t = setTimeout(function() { resolve("TIMEOUT_6s"); }, 6000);
              window.__TAURI_INTERNALS__.invoke("${cmd}", ${args}).then(
                function(v) { clearTimeout(t); resolve("OK:" + JSON.stringify(v)); },
                function(e) { clearTimeout(t); resolve("ERR:" + String(e)); }
              );
            })`;
            const id = send('Runtime.evaluate', { 
              expression: expr, 
              awaitPromise: true, 
              returnByValue: true 
            });
            pending.set(id, cmd);
          }, 1000 * (i + 1));
        });
      }

      if (msg.id > 1 && pending.has(msg.id)) {
        const label = pending.get(msg.id);
        const val = msg.result?.result?.value;
        const err = msg.result?.exceptionDetails?.exception?.description;
        log('CMD[' + label + ']: ' + (val !== undefined ? String(val) : 'EVAL_ERR:' + err));
        pending.delete(msg.id);
      }
    });

    setTimeout(() => { log('DONE'); process.exit(0); }, 40000);
  });
});
