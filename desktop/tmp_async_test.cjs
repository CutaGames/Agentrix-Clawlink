/**
 * Test ONLY the non-window-creating commands, including async network ones
 */
const WS = require('ws');
const http = require('http');

function send(ws, method, params) {
  const id = send._nextId = (send._nextId || 0) + 1;
  ws.send(JSON.stringify({ id, method, params }));
  return id;
}

async function evalInvoke(ws, cmd, args, timeout = 15000) {
  return new Promise((resolve) => {
    const expr = `new Promise(function(resolve) {
      var t = setTimeout(function() { resolve("TIMEOUT_${timeout/1000}s"); }, ${timeout});
      window.__TAURI_INTERNALS__.invoke("${cmd}", ${JSON.stringify(args)}).then(
        function(v) { clearTimeout(t); resolve("OK:" + JSON.stringify(v)); },
        function(e) { clearTimeout(t); resolve("ERR:" + String(e)); }
      );
    })`;
    const id = send(ws, 'Runtime.evaluate', {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
    });
    const handler = (m) => {
      const msg = JSON.parse(String(m));
      if (msg.id === id) {
        ws.removeListener('message', handler);
        const val = msg.result?.result?.value;
        resolve(val !== undefined ? String(val) : 'EVAL_ERR');
      }
    };
    ws.on('message', handler);
  });
}

http.get('http://127.0.0.1:9222/json/list', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', async () => {
    const targets = JSON.parse(d);
    const t = targets.find((x) => x.url.includes('tauri.localhost')) || targets[0];
    console.log('TARGET:', t.url);

    const ws = new WS(t.webSocketDebuggerUrl);
    ws.on('open', async () => {
      send(ws, 'Runtime.enable');
      await new Promise((r) => setTimeout(r, 1000));

      // Async network commands (no AppHandle)
      console.log('\n--- Async: create_pair_session ---');
      const r1 = await evalInvoke(ws, 'desktop_bridge_create_pair_session', { session_id: 'test-123' }, 15000);
      console.log('  result:', r1.substring(0, 200));

      console.log('\n--- Async: password_login ---');
      const r2 = await evalInvoke(ws, 'desktop_bridge_password_login', { email: 'test@x.com', password: 'not_real' }, 15000);
      console.log('  result:', r2.substring(0, 200));

      // Plugin commands
      console.log('\n--- Plugin: app|version ---');
      const r3 = await evalInvoke(ws, 'plugin:app|version', {}, 15000);
      console.log('  result:', r3.substring(0, 200));

      console.log('\n--- Plugin: app|name ---');
      const r4 = await evalInvoke(ws, 'plugin:app|name', {}, 15000);
      console.log('  result:', r4.substring(0, 200));

      console.log('\n--- Plugin: app|tauri_version ---');
      const r5 = await evalInvoke(ws, 'plugin:app|tauri_version', {}, 15000);
      console.log('  result:', r5.substring(0, 200));

      // Simple sync command to verify WS still works
      console.log('\n--- Sync: get_ball_position ---');
      const r6 = await evalInvoke(ws, 'desktop_bridge_get_ball_position', {}, 15000);
      console.log('  result:', r6.substring(0, 200));

      console.log('\nDONE');
      ws.close();
      process.exit(0);
    });

    setTimeout(() => { console.log('GLOBAL TIMEOUT'); process.exit(1); }, 120000);
  });
});
