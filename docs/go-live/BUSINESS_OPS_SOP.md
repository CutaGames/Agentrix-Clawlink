# Agentrix Business & Operations SOP (Internal)

This document outlines the standard operating procedures for managing the Agentrix Merchant platform.

## 1. Merchant Onboarding & KYC

1.  **Application Review**: All new merchant applications must be reviewed within 24 hours.
2.  **KYC Verification**:
    *   Verify business registration documents.
    *   Check against global AML/Sanctions lists.
    *   Status: `PENDING` -> `ACTIVE` or `REJECTED`.
3.  **Risk Assessment**: Assign a risk score (1-100) based on industry and transaction volume.

## 2. Settlement & Refund Management

### Settlement Flow
- **T+1 Settlement**: Default for low-risk merchants.
- **T+7 Settlement**: For high-risk or new merchants.
- **Manual Review**: Any settlement over $10,000 requires manual approval by the Finance Team.

### Refund Handling
- **Merchant-Initiated**: Merchants can process refunds directly from their dashboard.
- **Dispute Resolution**: If a customer disputes a charge, the Ops team will mediate between the merchant and customer.

## 3. Support SLA (Service Level Agreement)

| Priority | Response Time | Resolution Time |
| :--- | :--- | :--- |
| **P0 (System Down)** | 15 Minutes | 2 Hours |
| **P1 (Payment Failure)** | 1 Hour | 4 Hours |
| **P2 (General Inquiry)** | 4 Hours | 24 Hours |
| **P3 (Feature Request)** | 24 Hours | N/A |

## 4. Monitoring & Incident Response

### Key Metrics to Monitor
- **Success Rate**: Percentage of successful vs. failed payments (Alert if < 95%).
- **Latency**: API response time (Alert if > 500ms).
- **Webhook Delivery**: Success rate of webhook deliveries (Alert if < 99%).

### Incident Response Steps
1.  **Detection**: Automated alert via Slack/PagerDuty.
2.  **Triage**: Identify if it's a frontend, backend, or third-party (Stripe/Transak) issue.
3.  **Communication**: Update the [Status Page](https://status.agentrix.io).
4.  **Resolution**: Deploy fix or implement workaround.
5.  **Post-Mortem**: Document the root cause and prevention steps.

## 5. Compliance & Reporting

- **Monthly Audit**: Conduct a monthly audit of all transactions and settlements.
- **Tax Reporting**: Generate 1099-K forms for US-based merchants annually.

---
*Confidential - Internal Use Only*
