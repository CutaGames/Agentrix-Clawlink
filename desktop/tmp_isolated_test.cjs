/**
 * Isolated test for failing commands — run each with fresh timing
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

      // Test 1: get_context with longer timeout
      console.log('\n--- Test: get_context (15s timeout) ---');
      const r1 = await evalInvoke(ws, 'desktop_bridge_get_context', {}, 15000);
      console.log('  get_context:', r1.substring(0, 200));

      // Test 2: open_chat_panel
      console.log('\n--- Test: open_chat_panel (15s timeout) ---');
      const r2 = await evalInvoke(ws, 'desktop_bridge_open_chat_panel', {}, 15000);
      console.log('  open_chat_panel:', r2.substring(0, 200));

      // Test 3: close_chat_panel
      console.log('\n--- Test: close_chat_panel (15s timeout) ---');
      const r3 = await evalInvoke(ws, 'desktop_bridge_close_chat_panel', {}, 15000);
      console.log('  close_chat_panel:', r3.substring(0, 200));

      // Test 4: set_panel_position_near_ball
      console.log('\n--- Test: set_panel_position_near_ball (15s timeout) ---');
      const r4 = await evalInvoke(ws, 'desktop_bridge_set_panel_position_near_ball', {}, 15000);
      console.log('  set_panel_position:', r4.substring(0, 200));

      // Test 5: plugin:app|version
      console.log('\n--- Test: plugin:app|version (15s timeout) ---');
      const r5 = await evalInvoke(ws, 'plugin:app|version', {}, 15000);
      console.log('  app_version:', r5.substring(0, 200));

      // Test 6: create_pair_session
      console.log('\n--- Test: create_pair_session (15s timeout) ---');
      const r6 = await evalInvoke(ws, 'desktop_bridge_create_pair_session', { session_id: 'test-123' }, 15000);
      console.log('  create_pair_session:', r6.substring(0, 200));

      // Test 7: password_login
      console.log('\n--- Test: password_login (15s timeout) ---');
      const r7 = await evalInvoke(ws, 'desktop_bridge_password_login', { email: 'test@x.com', password: 'not_real' }, 15000);
      console.log('  password_login:', r7.substring(0, 200));

      console.log('\nDONE');
      ws.close();
      process.exit(0);
    });

    setTimeout(() => { console.log('GLOBAL TIMEOUT'); process.exit(1); }, 180000);
  });
});
