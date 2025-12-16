
import { ethers } from 'ethers';

const COMMISSION_ADDRESS = '0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C';
const RPC_URL = 'https://bsc-testnet.publicnode.com';

const COMMISSION_ABI = [
  'function settlementToken() view returns (address)',
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const commission = new ethers.Contract(COMMISSION_ADDRESS, COMMISSION_ABI, provider);

  try {
    const tokenAddress = await commission.settlementToken();
    console.log('Settlement Token Address:', tokenAddress);

    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const decimals = await token.decimals();
    const symbol = await token.symbol();
    console.log('Token Symbol:', symbol);
    console.log('Token Decimals:', decimals);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
