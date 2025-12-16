
const { JsonRpcProvider, Contract } = require('ethers');

const RPC_URL = 'https://bsc-testnet.nodereal.io/v1/1eefed273dc64160afd5e328e6c518d6';
const CONTRACT_ADDRESS = '0xFfEf72198A71B288EfE403AC07f9c60A1a99f29e';
const SESSION_ID = '0x602c740a4ba6602272320bb4536da64a0485894211276772ca6edbd9397aad9c';

const ABI = [
  'function getSession(bytes32) view returns (tuple(address signer, address owner, uint256 singleLimit, uint256 dailyLimit, uint256 usedToday, uint256 expiry, uint256 lastResetDate, bool isActive))',
];

async function main() {
  console.log(`Connecting to RPC: ${RPC_URL}`);
  const provider = new JsonRpcProvider(RPC_URL);

  console.log(`Checking code at address: ${CONTRACT_ADDRESS}`);
  const code = await provider.getCode(CONTRACT_ADDRESS);
  console.log(`Code length: ${code.length}`);

  if (code === '0x') {
    console.error('❌ No code found at this address! It is not a contract.');
    return;
  }
  console.log('✅ Contract code found.');

  const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);
  console.log(`Calling getSession(${SESSION_ID})...`);

  try {
    const session = await contract.getSession(SESSION_ID);
    // Convert BigInts to strings for JSON.stringify
    const sessionObj = {
        signer: session.signer,
        owner: session.owner,
        singleLimit: session.singleLimit.toString(),
        dailyLimit: session.dailyLimit.toString(),
        isActive: session.isActive
    };
    console.log('✅ Session found:', sessionObj);
  } catch (error) {
    console.error('❌ getSession failed:', error);
  }
}

main().catch(console.error);
