import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
    },
    bsc_testnet: {
      url: process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet.nodereal.io/v1/1eefed273dc64160afd5e328e6c518d6",
      chainId: 97,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
