# Agentrix Audit Evidence Chain - Quick Start Guide

The Agentrix Audit Evidence Chain provides a high-trust, non-repudiation mechanism for AI Agent payments. It combines on-chain attestations with off-chain hash chaining to ensure every action is verifiable and tamper-proof.

## 1. For Developers: Signing Agent Actions

To ensure non-repudiation, your Agent should sign its decision log before executing a payment.

### Step 1: Register Agent Public Key
When registering your Agent via the API, provide a public key (Ethereum-compatible address).

```json
POST /api/agent/register
{
  "name": "My AI Agent",
  "publicKey": "0x1234...abcd"
}
```

### Step 2: Sign the Decision Log
Before calling `execute-payment`, sign the `decisionLog` object using the Agent's private key.

```javascript
const decisionLog = {
  reason: "User requested premium subscription",
  timestamp: Date.now(),
  context: { orderId: "ord_123" }
};

// Sign using ethers.js (EIP-191)
const signature = await wallet.signMessage(JSON.stringify(decisionLog));

// Execute payment with signature
await fetch('/api/agent/execute-payment', {
  method: 'POST',
  headers: { 'x-api-key': 'agx_live_...' },
  body: JSON.stringify({
    ...,
    decisionLog,
    agentSignature: signature
  })
});
```

## 2. For Merchants: Verifying the Chain

Merchants can verify the integrity of Agent actions through the **Audit Chain Browser**.

1. Go to the **Merchant Dashboard**.
2. Click on **Audit Chain** in the navigation or **View Audit** next to a transaction.
3. Click **Verify Integrity** to:
   - Validate the **Hash Chain** (ensuring no history was tampered with).
   - Verify the **Agent Signature** against the registered public key.
   - Check the **EAS On-chain Attestation** for the daily Merkle Root.

## 3. Architecture Overview

- **Layer 1: Hash Chaining**: Every `AuditProof` contains the hash of the previous proof, forming an immutable sequence.
- **Layer 2: Digital Signatures**: Agents sign their decisions, providing cryptographic proof of intent.
- **Layer 3: EAS Attestation**: Daily Merkle Roots of all audit proofs are anchored to the Ethereum Attestation Service for global verifiability.

---
*Agentrix - Empowering the AI Economy with Trust.*
