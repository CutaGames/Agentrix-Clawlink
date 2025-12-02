/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { JsonRpcProvider, Contract, formatUnits } = require('ethers');

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(__dirname, '../backend/.env'));
loadEnvFile(path.resolve(__dirname, '../.env'));

const ABI = [
  'function getSession(bytes32) view returns (tuple(address signer, address owner, uint256 singleLimit, uint256 dailyLimit, uint256 usedToday, uint256 expiry, uint256 lastResetDate, bool isActive))',
];

async function main() {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error('用法: node scripts/check-session.js <sessionId>');
    process.exit(1);
  }

  const rpcUrl =
    process.env.RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545';
  const contractAddress = process.env.ERC8004_CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error('请在 .env 中配置 ERC8004_CONTRACT_ADDRESS');
    process.exit(1);
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const contract = new Contract(contractAddress, ABI, provider);

  try {
    const session = await contract.getSession(sessionId);
    const result = {
      signer: session.signer,
      owner: session.owner,
      singleLimit: formatUnits(session.singleLimit, 6),
      dailyLimit: formatUnits(session.dailyLimit, 6),
      usedToday: formatUnits(session.usedToday, 6),
      expiry: new Date(Number(session.expiry) * 1000).toISOString(),
      lastReset: new Date(Number(session.lastResetDate) * 1000).toISOString(),
      isActive: session.isActive,
    };
    const outPath = path.resolve(__dirname, 'session-output.json');
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.log(`✅ Session 详情已写入 ${outPath}`);
  } catch (error) {
    const outPath = path.resolve(__dirname, 'session-output.json');
    fs.writeFileSync(
      outPath,
      JSON.stringify({ error: error?.message || String(error) }, null, 2),
    );
    console.error('查询失败：', error);
    process.exit(1);
  }
}

main();

