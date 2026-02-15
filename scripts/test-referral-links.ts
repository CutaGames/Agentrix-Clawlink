/**
 * Social Referral Link API Test Script
 * 
 * Tests the full lifecycle: create → list → stats → pause → resume → archive → redirect
 * 
 * Usage: npx ts-node scripts/test-referral-links.ts [BASE_URL] [TOKEN]
 * Example: npx ts-node scripts/test-referral-links.ts http://localhost:3001 eyJhbGciOi...
 */

const BASE_URL = process.argv[2] || process.env.API_URL || 'http://localhost:3001';
const TOKEN = process.argv[3] || process.env.AUTH_TOKEN || '';

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

let createdLinkId = '';
let createdShortCode = '';
let passed = 0;
let failed = 0;

function log(label: string, ok: boolean, detail?: string) {
  const icon = ok ? '✅' : '❌';
  console.log(`  ${icon} ${label}${detail ? ` — ${detail}` : ''}`);
  if (ok) passed++;
  else failed++;
}

async function testCreateGeneralLink() {
  console.log('\n1️⃣  Create General Referral Link');
  try {
    const res = await fetch(`${BASE_URL}/api/referral/links`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Test General Link',
        type: 'general',
        channel: 'twitter',
        metadata: { campaign: 'test-run' },
      }),
    });
    const data = await res.json();
    log('Status 201', res.status === 201, `got ${res.status}`);
    log('Has id', !!data.id, data.id);
    log('Has shortCode', !!data.shortCode && data.shortCode.length === 8, data.shortCode);
    log('Has shortUrl', !!data.shortUrl && data.shortUrl.includes('/r/'), data.shortUrl);
    log('Type is general', data.type === 'general', data.type);
    log('Status is active', data.status === 'active', data.status);
    log('Clicks init 0', data.clicks === 0);
    createdLinkId = data.id;
    createdShortCode = data.shortCode;
  } catch (err: any) {
    log('Request succeeded', false, err.message);
  }
}

async function testCreateProductLink() {
  console.log('\n2️⃣  Create Product-Level Referral Link');
  try {
    const res = await fetch(`${BASE_URL}/api/referral/links`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Premium AI Agent Skill',
        type: 'product',
        targetId: 'skill-001',
        targetType: 'skill',
        targetName: 'GPT-4 Data Analyzer',
        channel: 'telegram',
      }),
    });
    const data = await res.json();
    log('Status 201', res.status === 201, `got ${res.status}`);
    log('Type is product', data.type === 'product', data.type);
    log('TargetId matches', data.targetId === 'skill-001', data.targetId);
    log('TargetName matches', data.targetName === 'GPT-4 Data Analyzer');
    log('FullUrl has target params', data.fullUrl?.includes('t=skill'), data.fullUrl);
  } catch (err: any) {
    log('Request succeeded', false, err.message);
  }
}

async function testListLinks() {
  console.log('\n3️⃣  List My Referral Links');
  try {
    const res = await fetch(`${BASE_URL}/api/referral/links`, { headers });
    const data = await res.json();
    log('Status 200', res.status === 200, `got ${res.status}`);
    log('Returns array', Array.isArray(data), `length=${data?.length}`);
    log('Has >= 2 links', data?.length >= 2, `count=${data?.length}`);
  } catch (err: any) {
    log('Request succeeded', false, err.message);
  }
}

async function testListByType() {
  console.log('\n4️⃣  List Links Filtered by Type');
  try {
    const res = await fetch(`${BASE_URL}/api/referral/links?type=product`, { headers });
    const data = await res.json();
    log('Status 200', res.status === 200);
    log('All items are product type', Array.isArray(data) && data.every((l: any) => l.type === 'product'));
  } catch (err: any) {
    log('Request succeeded', false, err.message);
  }
}

async function testGetStats() {
  console.log('\n5️⃣  Get Link Statistics');
  try {
    const res = await fetch(`${BASE_URL}/api/referral/links/stats`, { headers });
    const data = await res.json();
    log('Status 200', res.status === 200);
    log('Has totalLinks', typeof data.totalLinks === 'number', `totalLinks=${data.totalLinks}`);
    log('Has totalClicks', typeof data.totalClicks === 'number');
    log('Has conversionRate', typeof data.conversionRate === 'number');
    log('totalLinks >= 2', data.totalLinks >= 2, `${data.totalLinks}`);
  } catch (err: any) {
    log('Request succeeded', false, err.message);
  }
}

async function testPauseLink() {
  console.log('\n6️⃣  Pause Link');
  if (!createdLinkId) { log('Has link to pause', false, 'no link created'); return; }
  try {
    const res = await fetch(`${BASE_URL}/api/referral/links/${createdLinkId}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: 'paused' }),
    });
    const data = await res.json();
    log('Status 200', res.status === 200, `got ${res.status}`);
    log('Status is paused', data.status === 'paused', data.status);
  } catch (err: any) {
    log('Request succeeded', false, err.message);
  }
}

async function testResumeLink() {
  console.log('\n7️⃣  Resume Link');
  if (!createdLinkId) { log('Has link to resume', false); return; }
  try {
    const res = await fetch(`${BASE_URL}/api/referral/links/${createdLinkId}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status: 'active' }),
    });
    const data = await res.json();
    log('Status 200', res.status === 200);
    log('Status is active', data.status === 'active', data.status);
  } catch (err: any) {
    log('Request succeeded', false, err.message);
  }
}

async function testShortLinkRedirect() {
  console.log('\n8️⃣  Short Link Redirect (Public)');
  if (!createdShortCode) { log('Has shortCode', false); return; }
  try {
    const res = await fetch(`${BASE_URL}/api/referral/r/${createdShortCode}`, {
      redirect: 'manual',
    });
    log('Status 302', res.status === 302, `got ${res.status}`);
    const location = res.headers.get('location');
    log('Has Location header', !!location, location || 'none');
  } catch (err: any) {
    log('Request succeeded', false, err.message);
  }
}

async function testArchiveLink() {
  console.log('\n9️⃣  Archive Link');
  if (!createdLinkId) { log('Has link to archive', false); return; }
  try {
    const res = await fetch(`${BASE_URL}/api/referral/links/${createdLinkId}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    log('Status 200', res.status === 200, `got ${res.status}`);
    log('Success true', data.success === true);
  } catch (err: any) {
    log('Request succeeded', false, err.message);
  }
}

async function testArchivedLinkNotRedirect() {
  console.log('\n🔟  Archived Link Should Not Redirect to Target');
  if (!createdShortCode) { log('Has shortCode', false); return; }
  try {
    const res = await fetch(`${BASE_URL}/api/referral/r/${createdShortCode}`, {
      redirect: 'manual',
    });
    log('Status 302', res.status === 302, `got ${res.status}`);
    const location = res.headers.get('location');
    // Archived link should redirect to base URL, not the original target
    const isBaseRedirect = location && !location.includes(`/r/${createdShortCode}`);
    log('Redirects to base (not target)', !!isBaseRedirect, location || 'none');
  } catch (err: any) {
    log('Request succeeded', false, err.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔗 Social Referral Link API Test Suite');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Auth: ${TOKEN ? 'Bearer token provided' : '⚠️  No token (some tests may fail)'}`);
  console.log('='.repeat(60));

  await testCreateGeneralLink();
  await testCreateProductLink();
  await testListLinks();
  await testListByType();
  await testGetStats();
  await testPauseLink();
  await testResumeLink();
  await testShortLinkRedirect();
  await testArchiveLink();
  await testArchivedLinkNotRedirect();

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
