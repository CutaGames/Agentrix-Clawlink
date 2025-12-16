import * as dotenv from "dotenv";
dotenv.config();
console.log("RPC URL:", process.env.BSC_TESTNET_RPC_URL);
console.log("Private Key Length:", process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.length : "undefined");
