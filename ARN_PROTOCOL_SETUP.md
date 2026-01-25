# ARN Protocol Setup & Integration Guide

## 1. Project Overview
The **ARN (Alliance Rewards Network)** protocol has been initialized as an independent project within the repository to ensure neutrality and modularity.

**Location**: `arn-protocol/`

### Core Contracts
1. **ArnFeeSplitter.sol**
   - **Purpose**: Main entry point for X402 payments.
   - **Logic**: Splits incoming payments (Native/ERC20) into:
     - **Merchant Amount**: 99.7% (sent to merchant).
     - **Protocol Fee**: 0.3% (sent to Treasury).
   - **Events**: Emits `PaymentSplit` with `routeRefHash` for off-chain attribution.

2. **ArnTreasury.sol**
   - **Purpose**: Secure vault for protocol fees.
   - **Features**: Role-based access control (Admin, Timelock, Distributor).

## 2. Setup & Verification
The project is set up with Hardhat and TypeScript.

### Prerequisites
- Node.js & npm
- WSL (recommended for Windows users)

### Commands (Run in `arn-protocol/` directory)
```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

**Current Status**: 
- Contracts compiled successfully.
- Unit tests passed (Fee calculation and Event emission verified).

## 3. Backend Integration
The backend `SmartRouterService` has been updated to prioritize the ARN protocol.

**File**: `backend/src/modules/payment/smart-router.service.ts`

**Changes**:
- **Priority**: Increased to `90` (Highest).
- **Cost**: Updated to `0.003` (0.3%) to match the protocol fee.
- **Speed**: Rated `9/10`.

## 4. Next Steps

### Phase 1: Deployment (Immediate)
1. Configure `hardhat.config.ts` with network details (Sepolia/BSC Testnet).
2. Add `.env` file with `PRIVATE_KEY` and `RPC_URL`.
3. Run deployment script:
   ```bash
   npx hardhat run scripts/deploy.ts --network <network_name>
   ```

### Phase 2: Frontend Integration
1. Update `X402_ADAPTER_ADDRESS` in `frontend/.env.local` with the deployed `ArnFeeSplitter` address.
2. Ensure the frontend payment component calls `splitPaymentNative` or `splitPaymentERC20` on the `ArnFeeSplitter` contract instead of direct transfer.

### Phase 3: Service Discovery
1. Update `service-discovery.tsx` to verify the `x402` metadata against the deployed protocol.
