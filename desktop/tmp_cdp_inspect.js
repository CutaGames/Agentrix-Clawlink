const WS = require('ws');

async function send(ws, state, method, params = {}) {
  const id = ++state.id;
  return new Promise((resolve, reject) => {
    state.pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }), (error) => {
      if (error) {
        state.pending.delete(id);
        reject(error);
      }
    });
    setTimeout(() => {
      if (state.pending.has(id)) {
        state.pending.delete(id);
        reject(new Error(`timeout ${method}`));
      }
    }, 5000);
  });
}

async function main() {
  const targets = await fetch('http://127.0.0.1:9222/json/list').then((response) => response.json());
  const target = targets[0];
  if (!target) {
    throw new Error('No CDP target found');
  }

  const ws = new WS(target.webSocketDebuggerUrl);
  const state = { id: 0, pending: new Map() };

  ws.on('message', (raw) => {
    const data = JSON.parse(String(raw));
    if (data.id && state.pending.has(data.id)) {
      state.pending.get(data.id)(data);
      state.pending.delete(data.id);
    }
  });

  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  await send(ws, state, 'Runtime.enable');

  const expression = [
    'Promise.all([',
    "fetch('/qa-login.json',{cache:'no-store'}).then(async r => ({status:r.status, text: await r.text()})).catch(e => ({error:String(e)})),",
    'Promise.resolve(window.__AGENTRIX_LOGIN_STATUS__ || null),',
    'Promise.resolve(document.title),',
    'Promise.resolve(location.href),',
    'Promise.resolve(document.body ? document.body.innerText.slice(0, 1000) : null)',
    '])',
  ].join(' ');

  const result = await send(ws, state, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  console.log(JSON.stringify(result.result.result.value, null, 2));
  ws.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
