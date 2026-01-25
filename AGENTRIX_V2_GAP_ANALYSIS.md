# Agentrix V2 Workspace Gap Analysis & Restoration Plan

This document identifies the functional gaps between the 2025.12.29 version (V1) and the 2026.01.05 version (V2) of the Agentrix Workspace.

## 1. User Module (UserModuleV2.tsx)

| Feature | Status | Description | Restoration Plan |
| :--- | :--- | :--- | :--- |
| **Auth Guide (Checklist)** | ❌ Missing | Step-by-step guide for agent authorization. | Add to Overview or as a separate tab. |
| **Agent Management & Sharing** | ❌ Missing | Advanced management and sharing of agents. | Integrate `MyAgentsPanel`. |
| **Skill Management** | ❌ Missing | Installing and configuring agent skills. | Integrate `SkillManagementPanel`. |
| **Policy Engine** | ❌ Missing | ERC8004 mandate and limit management. | Integrate `PolicyEngine` component. |
| **Subscriptions** | ❌ Missing | Recurring billing management. | Add "Subscriptions" tab. |
| **Airdrop Discovery** | ❌ Missing | Ecosystem reward discovery. | Integrate `AirdropDiscovery`. |
| **Auto-Earn** | ❌ Missing | Automated AI-driven earning. | Integrate `AutoEarnPanel`. |
| **Promotion Center** | ❌ Missing | Referral and promotion tools. | Integrate `PromotionPanel`. |
| **Marketplace** | ❌ Missing | Agent, Skill, and Pack marketplaces. | Add "Marketplace" tab or L1 navigation. |
| **KYC Verification** | ❌ Missing | Identity verification flow. | Add "KYC" tab. |
| **Security Center** | ⚠️ Partial | V2 has sessions, but lacks full V1 security UI. | Enhance "Security" tab with `SessionManager`. |

## 2. Merchant Module (MerchantModuleV2.tsx)

| Feature | Status | Description | Restoration Plan |
| :--- | :--- | :--- | :--- |
| **Merchant Wizard** | ❌ Missing | Onboarding and payment testing guide. | Add to Overview. |
| **Ecommerce Sync** | ❌ Missing | Shopify/WooCommerce integration. | Add "Integrations" tab. |
| **Batch Import** | ❌ Missing | CSV/Excel product import. | Add "Import" button to Products. |
| **MPC Wallet** | ❌ Missing | Secure multi-sig fund management. | Add to Finance or as a separate tab. |
| **Off-ramp** | ❌ Missing | Fiat withdrawal (Transak/Stripe). | Integrate into Finance. |
| **Webhooks** | ❌ Missing | Real-time event notifications. | Add to Settings or as a separate tab. |
| **Checkout Config** | ❌ Missing | Branding and UI customization. | Add to Settings. |
| **Detailed Analytics** | ⚠️ Partial | V2 has basic stats, lacks V1 charts. | Add "Analytics" tab with charts. |
| **Audit Logs** | ❌ Missing | Transaction and action auditing. | Add "Audit" tab. |

## 3. Developer Module (DeveloperModuleV2.tsx)

| Feature | Status | Description | Restoration Plan |
| :--- | :--- | :--- | :--- |
| **Skill Lifecycle** | ❌ Missing | Build -> Test -> Publish workflow. | Add to Overview. |
| **Skill Registry** | ❌ Missing | Management of developed skills. | Integrate `SkillRegistry`. |
| **Pack Center** | ❌ Missing | Packaging for OpenAI/Claude/MCP. | Integrate `PackCenter`. |
| **Test Harness** | ❌ Missing | API and Webhook simulator. | Integrate `TestHarness`. |
| **Webhooks** | ❌ Missing | Developer webhook management. | Add "Webhooks" tab. |
| **Call Logs** | ❌ Missing | Detailed API execution logs. | Add "Logs" tab. |
| **Marketplace Publish** | ❌ Missing | Publishing flow for the ecosystem. | Add "Publish" flow to Agents. |
| **Code Generation** | ❌ Missing | SDK and boilerplate generation. | Add "Code" tab. |

---

## Implementation Strategy

### Phase 1: User Center Restoration (Priority)
1.  **Navigation**: Update `UserModuleV2` to include missing tabs (Skills, Subscriptions, Promotion, Policies, Security).
2.  **Components**: Re-import and wire up `SkillManagementPanel`, `PolicyEngine`, `MyAgentsPanel`, `PromotionPanel`, `AirdropDiscovery`, `AutoEarnPanel`.
3.  **Logic**: Restore session management and agent authorization logic.

### Phase 2: Merchant & Developer Restoration
1.  **Merchant**: Add Integrations (Ecommerce), MPC Wallet, and Webhooks.
2.  **Developer**: Add Skill Registry, Pack Center, and Test Harness.

### Phase 3: Global Marketplace
1.  Implement a unified Marketplace view accessible from all modules or the main sidebar.

---

## Next Steps
1.  Modify `UserModuleV2.tsx` to add the missing tabs and components.
2.  Modify `MerchantModuleV2.tsx` to add the missing tabs and components.
3.  Modify `DeveloperModuleV2.tsx` to add the missing tabs and components.
4.  Verify build and functionality.
