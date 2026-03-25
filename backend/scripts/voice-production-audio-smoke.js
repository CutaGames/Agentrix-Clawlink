const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { Readable } = require('stream');

function requireFromWorkspace(moduleName) {
  try {
    return require(moduleName);
  } catch {
    return require(path.join(__dirname, '..', '..', 'node_modules', moduleName));
  }
}

const { Client } = requireFromWorkspace('pg');
const { io } = requireFromWorkspace('socket.io-client');
const { PollyClient, SynthesizeSpeechCommand } = requireFromWorkspace('@aws-sdk/client-polly');

const backendDir = path.resolve(__dirname, '..');

const baseUrl = process.env.VOICE_SMOKE_BASE_URL || 'https://api.agentrix.top';
const smokeText = process.env.VOICE_SMOKE_TEXT || 'hello agentrix this is a production voice audio smoke test';
const smokeAudioFile = process.env.VOICE_SMOKE_AUDIO_FILE || '';
const chunkSize = Number(process.env.VOICE_SMOKE_CHUNK_SIZE || 3200);
const timeoutMs = Number(process.env.VOICE_SMOKE_TIMEOUT_MS || 45000);

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const text = fs.readFileSync(filePath, 'utf8').replace(/\r/g, '');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(userId, jwtSecret) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ sub: String(userId), iat: now, exp: now + 3600 }));
  const message = `${header}.${body}`;
  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(message)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${message}.${signature}`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, text, json };
}

async function findEligibleUser(env) {
  const client = new Client({
    host: process.env.DB_HOST || env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || process.env.DB_USER || env.DB_USERNAME || env.DB_USER,
    password: process.env.DB_PASSWORD || env.DB_PASSWORD,
    database: process.env.DB_DATABASE || env.DB_DATABASE || 'paymind',
    ssl: String(process.env.DB_SSL || env.DB_SSL || '').toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();
  try {
    let result;
    try {
      result = await client.query(`
        select u.id, u.email
        from users u
        where not exists (
          select 1
          from openclaw_instances o
          where o."userId" = u.id
            and o."instanceType" = 'cloud'
            and o.status in ('active', 'provisioning')
        )
        order by u.id asc
        limit 1
      `);
    } catch (error) {
      if (!/column o\.userId does not exist/i.test(error.message || '')) {
        throw error;
      }

      result = await client.query(`
        select u.id, u.email
        from users u
        where not exists (
          select 1
          from openclaw_instances o
          where o.user_id = u.id
            and o.instance_type = 'cloud'
            and o.status in ('active', 'provisioning')
        )
        order by u.id asc
        limit 1
      `);
    }

    if (!result.rows.length) {
      throw new Error('NO_ELIGIBLE_USER');
    }

    return result.rows[0];
  } finally {
    await client.end();
  }
}

async function provisionInstance(token) {
  const provisionResult = await fetchJson(`${baseUrl}/api/openclaw/cloud/provision`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Production Voice Audio Smoke',
      llmProvider: 'default',
    }),
  });

  if (!provisionResult.response.ok) {
    throw new Error(`PROVISION_FAILED ${provisionResult.response.status}: ${provisionResult.text}`);
  }

  const instanceId = provisionResult.json?.id || provisionResult.json?.instance?.id || provisionResult.json?.instanceId;
  if (!instanceId) {
    throw new Error('PROVISION_DID_NOT_RETURN_INSTANCE_ID');
  }

  return {
    instanceId,
    provisionResult,
  };
}

async function synthesizePcm(envFile) {
  if (smokeAudioFile) {
    return convertAudioFileToPcm(smokeAudioFile);
  }

  const tempDir = fs.mkdtempSync('/tmp/voice-audio-smoke-');
  const mp3Path = path.join(tempDir, 'smoke.mp3');
  const pcmPath = path.join(tempDir, 'smoke.pcm');

  try {
    const mp3Buffer = await synthesizeSpeechMp3(smokeText, envFile);
    fs.writeFileSync(mp3Path, mp3Buffer);
    execFileSync('ffmpeg', ['-y', '-i', mp3Path, '-ar', '16000', '-ac', '1', '-f', 's16le', pcmPath], {
      stdio: 'ignore',
    });
    return fs.readFileSync(pcmPath);
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

function convertAudioFileToPcm(audioFilePath) {
  const resolvedPath = path.resolve(audioFilePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`VOICE_SMOKE_AUDIO_FILE not found: ${resolvedPath}`);
  }

  if (path.extname(resolvedPath).toLowerCase() === '.pcm') {
    return fs.readFileSync(resolvedPath);
  }

  const tempDir = fs.mkdtempSync('/tmp/voice-audio-file-');
  const pcmPath = path.join(tempDir, 'smoke.pcm');
  try {
    execFileSync('ffmpeg', ['-y', '-i', resolvedPath, '-ar', '16000', '-ac', '1', '-f', 's16le', pcmPath], {
      stdio: 'ignore',
    });
    return fs.readFileSync(pcmPath);
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

async function streamToBuffer(streamLike) {
  if (!streamLike) {
    throw new Error('Speech synthesis returned no audio stream');
  }

  if (Buffer.isBuffer(streamLike)) {
    return streamLike;
  }

  if (streamLike instanceof Uint8Array) {
    return Buffer.from(streamLike);
  }

  if (typeof streamLike.transformToByteArray === 'function') {
    return Buffer.from(await streamLike.transformToByteArray());
  }

  if (typeof streamLike.arrayBuffer === 'function') {
    return Buffer.from(await streamLike.arrayBuffer());
  }

  if (streamLike instanceof Readable || typeof streamLike.on === 'function') {
    return await new Promise((resolve, reject) => {
      const chunks = [];
      streamLike.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      streamLike.on('end', () => resolve(Buffer.concat(chunks)));
      streamLike.on('error', reject);
    });
  }

  throw new Error('Unsupported Polly audio stream type');
}

async function synthesizeSpeechMp3(text, envFile) {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || envFile.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || envFile.AWS_SECRET_ACCESS_KEY;

  const polly = new PollyClient({
    region: process.env.AWS_REGION || envFile.AWS_REGION || 'us-east-1',
    credentials: accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
        }
      : undefined,
  });

  for (const engine of ['neural', 'standard']) {
    try {
      const response = await polly.send(new SynthesizeSpeechCommand({
        Engine: engine,
        VoiceId: 'Matthew',
        LanguageCode: 'en-US',
        OutputFormat: 'mp3',
        Text: text,
      }));
      return await streamToBuffer(response.AudioStream);
    } catch (error) {
      if (engine === 'standard') {
        throw error;
      }
    }
  }

  throw new Error('Polly synthesis failed');
}

async function runSocketAudioTest(token, instanceId, pcmBuffer) {
  return await new Promise((resolve) => {
    const sessionId = `prod-audio-smoke-${Date.now()}`;
    const events = [];
    const socket = io(`${baseUrl}/voice`, {
      auth: { token },
      transports: ['websocket'],
      timeout: 8000,
      reconnection: false,
    });

    let finished = false;

    const finish = (reason, payload) => {
      if (finished) return;
      finished = true;
      try {
        socket.emit('voice:session:end', { sessionId });
      } catch {}
      setTimeout(() => {
        socket.disconnect();
        resolve({ reason, payload: payload ?? null, events });
      }, 800);
    };

    socket.on('connect', () => {
      events.push({ event: 'connect', payload: { id: socket.id } });
      socket.emit('voice:session:start', {
        sessionId,
        instanceId,
        lang: 'en',
        duplexMode: false,
      });
    });

    socket.on('connect_error', (error) => {
      events.push({ event: 'connect_error', payload: { message: error.message } });
      finish('connect_error', { message: error.message });
    });

    socket.on('voice:session:ready', (payload) => {
      events.push({ event: 'voice:session:ready', payload });
      for (let offset = 0; offset < pcmBuffer.length; offset += chunkSize) {
        socket.emit('voice:audio:chunk', {
          sessionId,
          audio: pcmBuffer.subarray(offset, offset + chunkSize),
        });
      }
      socket.emit('voice:audio:end', { sessionId });
    });

    socket.on('voice:stt:interim', (payload) => {
      events.push({ event: 'voice:stt:interim', payload });
    });

    socket.on('voice:stt:final', (payload) => {
      events.push({ event: 'voice:stt:final', payload });
    });

    socket.on('voice:agent:text', (payload) => {
      events.push({ event: 'voice:agent:text', payload });
      finish('voice:agent:text', payload);
    });

    socket.on('voice:agent:end', (payload) => {
      events.push({ event: 'voice:agent:end', payload });
      finish('voice:agent:end', payload);
    });

    socket.on('voice:error', (payload) => {
      events.push({ event: 'voice:error', payload });
      finish('voice:error', payload);
    });

    setTimeout(() => finish('timeout'), timeoutMs);
  });
}

async function main() {
  const envFile = parseEnvFile(path.join(backendDir, '.env'));
  const user = await findEligibleUser(envFile);
  const jwtSecret = process.env.JWT_SECRET || envFile.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required to run the production audio smoke test');
  }

  const token = signJwt(user.id, jwtSecret);
  const { instanceId, provisionResult } = await provisionInstance(token);
  const pcmBuffer = await synthesizePcm(envFile);
  const socketResult = await runSocketAudioTest(token, instanceId, pcmBuffer);

  console.log(`BASE_URL=${baseUrl}`);
  console.log(`USER_JSON=${JSON.stringify(user)}`);
  console.log(`PROVISION_STATUS=${provisionResult.response.status}`);
  console.log(`INSTANCE_ID=${instanceId}`);
  console.log(`PCM_BYTES=${pcmBuffer.length}`);
  console.log(`AUDIO_SMOKE_RESULT=${JSON.stringify(socketResult)}`);

  if (!['voice:agent:text', 'voice:agent:end'].includes(socketResult.reason)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});