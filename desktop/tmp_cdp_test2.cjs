const WS = require('ws');
const fs = require('fs');
const http = require('http');

const OUT = 'cdp_result.txt';
fs.writeFileSync(OUT, '');

http.get('http://127.0.0.1:9222/json/list', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    const targets = JSON.parse(d);
    const t = targets.find((x) => x.url.includes('tauri.localhost')) || targets[0];
    fs.appendFileSync(OUT, 'TARGET: ' + t.url + ' | ' + t.title + '\n');

    const ws = new WS(t.webSocketDebuggerUrl);
    let id = 0;

    ws.on('open', () => {
      fs.appendFileSync(OUT, 'WS_OPEN\n');
      ws.send(JSON.stringify({ id: ++id, method: 'Runtime.enable' }));
    });

    ws.on('message', (m) => {
      const msg = JSON.parse(String(m));
      fs.appendFileSync(OUT, 'MSG id=' + msg.id + ' method=' + (msg.method || '') + '\n');
      
      if (msg.id === 1) {
        // Runtime.enable done, now send our eval
        const tests = [
          'JSON.stringify({label:window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label, windows:window.__TAURI_INTERNALS__?.metadata?.windows?.map(function(w){return w.label})})',
          'new Promise(function(resolve){var t=setTimeout(function(){resolve("TIMEOUT")},5000);window.__TAURI_INTERNALS__.invoke("desktop_bridge_get_clipboard_text",{}).then(function(v){clearTimeout(t);resolve("OK:"+JSON.stringify(v))}).catch(function(e){clearTimeout(t);resolve("ERR:"+String(e))})})',
          'new Promise(function(resolve){var t=setTimeout(function(){resolve("TIMEOUT")},5000);window.__TAURI_INTERNALS__.invoke("desktop_bridge_log_debug_event",{message:"cdp_test"}).then(function(v){clearTimeout(t);resolve("OK:"+JSON.stringify(v))}).catch(function(e){clearTimeout(t);resolve("ERR:"+String(e))})})',
        ];
        
        tests.forEach((expr, i) => {
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 100 + i,
              method: 'Runtime.evaluate',
              params: { expression: expr, awaitPromise: true, returnByValue: true }
            }));
          }, 500 * (i + 1));
        });
      }
      
      if (msg.id >= 100) {
        const val = msg.result?.result?.value;
        const err = msg.result?.exceptionDetails?.exception?.description;
        fs.appendFileSync(OUT, 'TEST_' + (msg.id - 100) + ': ' + (val || err || JSON.stringify(msg.result)) + '\n');
      }
    });

    ws.on('error', (e) => {
      fs.appendFileSync(OUT, 'WS_ERROR: ' + e + '\n');
    });

    setTimeout(() => {
      fs.appendFileSync(OUT, 'DONE\n');
      process.exit(0);
    }, 15000);
  });
});
