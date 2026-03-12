const WS = require('ws');
const http = require('http');

http.get('http://localhost:9222/json', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    const targets = JSON.parse(d);
    const t = targets.find((x) => x.url.includes('tauri.localhost')) || targets[0];
    console.log('Target:', t.url, t.title);
    const ws = new WS(t.webSocketDebuggerUrl);
    let id = 0;

    function evalAsync(expr) {
      const myId = ++id;
      ws.send(JSON.stringify({ id: myId, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } }));
      return myId;
    }

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: ++id, method: 'Runtime.enable' }));

      setTimeout(() => {
        console.log('\n--- Test 1: IPC get_ball_position ---');
        evalAsync('window.__TAURI_INTERNALS__.invoke("desktop_bridge_get_ball_position", {}).then(function(v){ return "OK:" + JSON.stringify(v); }).catch(function(e){ return "ERR:" + String(e); })');
      }, 500);

      setTimeout(() => {
        console.log('\n--- Test 2: Auth store state ---');
        evalAsync('JSON.stringify({token: localStorage.getItem("agentrix_token") ? "present" : null, url: window.location.href})');
      }, 1000);

      setTimeout(() => {
        console.log('\n--- Test 3: MediaDevices available ---');
        evalAsync('JSON.stringify({getUserMedia: typeof navigator?.mediaDevices?.getUserMedia, mediaDevices: !!navigator.mediaDevices})');
      }, 1500);

      setTimeout(() => {
        console.log('\n--- Test 4: tauriFetch (CSP check) ---');
        evalAsync('(async()=>{try{const m=await import("/assets/index-CxvZ3q8W.js");return "module loaded";}catch(e){return "import err: "+e.message;}})()');
      }, 2000);

      setTimeout(() => {
        console.log('\n--- Test 5: apiFetch to health endpoint ---');
        evalAsync('(async()=>{try{const r=await fetch("https://api.agentrix.top/api/health");return "fetch OK: "+r.status;}catch(e){return "fetch ERR: "+e.message;}})()');
      }, 2500);
    });

    ws.on('message', (m) => {
      const msg = JSON.parse(String(m));
      if (msg.id > 1) {
        const val = msg.result?.result?.value;
        console.log(`  [id=${msg.id}] ${val || JSON.stringify(msg.result || msg.error)}`);
      }
    });

    setTimeout(() => { console.log('\nDone.'); process.exit(0); }, 6000);
  });
});
