# Agentrix Payment & Commission Skill Scenarios V5

This document details the standardized usage scenarios for the **Agentrix Global Payment Gateway** and **Smart Split Workflow** skills. By following the V5 protocol, any Agent in the ecosystem can invoke these skills to enable complex financial capabilities.

---

## 1. Social Referral & Live Commerce (Referrer Mode)

**Scenario**: An Influencer Agent (e.g., on Twitter/X) recommends a product and earns a commission.
**Key Value**: "Click-to-Buy" link generation with automatic attribution.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant RefAgent as Influencer Agent (Referrer)
    participant Platform as Agentrix Gateway
    participant PaySkill as Payment Skill (Executor)
    participant Contract as Settlement Contract (V5)

    Note over RefAgent: Identifies trending product

    User->>RefAgent: "Where can I buy this hoodie?"
    
    RefAgent->>RefAgent: Get own AgentID/Wallet
    
    RefAgent->>Platform: POST /api/payments/create-intent
    Note right of RefAgent: payload: {<br/> amount: 100,<br/> metadata: { referrerId: "agent_x" }<br/>}

    Platform->>PaySkill: Route Request -> Generate Link
    PaySkill-->>RefAgent: Return: https://agentrix.io/pay/pi_123?ref=agent_x

    RefAgent->>User: "Buy here: [Link]"
    
    User->>Platform: Pays $100 via Stripe/USDC
    
    Platform->>Contract: Trigger Settlement (Atomic)
    
    par Fund Distribution
        Contract->>Merchant: $97.00 (Merchant Net)
        Contract->>Platform: $0.50 (Platform Fee)
        Contract->>RefAgent: $0.75 (30% of Pool)
        Contract->>PaySkill: $1.75 (70% of Pool)
    end
    
    Contract-->>User: Receipt NFT
```

---

## 2. Multi-Agent Collaboration (Executor Cluster)

**Scenario**: A user requests a complex task: "Write a blog post and generate a cover image."
**Key Value**: Automatic revenue splitting among collaborating agents (Writer + Designer).

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant MainAgent as Project Manager
    participant Writer as Writer Agent
    participant Designer as Designer Agent
    participant SplitSkill as Commission Skill

    User->>MainAgent: "Create blog post + image ($50)"
    
    MainAgent->>Writer: Task: Write Article
    Writer-->>MainAgent: Article Content
    
    MainAgent->>Designer: Task: Gen Image
    Designer-->>MainAgent: Image URL
    
    MainAgent->>User: Delivers Result
    User->>MainAgent: Pays $50
    
    Note over MainAgent: Needs to split funds

    MainAgent->>SplitSkill: POST /api/commissions/settle
    Note right of MainAgent: payload: {<br/> total: 50,<br/> participants: [<br/>  {id: "writer", weight: 0.4},<br/>  {id: "designer", weight: 0.4},<br/>  {id: "manager", weight: 0.2}<br/> ]<br/>}

    SplitSkill->>SplitSkill: Calculate Shares based on V5
    
    SplitSkill->>Writer: Transfer $20
    SplitSkill->>Designer: Transfer $20
    SplitSkill->>MainAgent: Transfer $10
    
    SplitSkill-->>MainAgent: Settlement Report
```

---

## 3. "No-Code" Expert Consultation (Pay-Per-Value)

**Scenario**: A Tax Expert Agent provides free initial advice but charges for the final filing document.
**Key Value**: Seamless transition from generic chat to paid service.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant TaxAgent as Expert Agent
    participant PaySkill as Payment Skill

    User->>TaxAgent: "How do I file tax for crypto?"
    TaxAgent-->>User: (Free Generic Advice) "You need form 8949..."

    User->>TaxAgent: "Can you generate it for me?"
    
    TaxAgent->>PaySkill: POST /api/payments/create-intent
    Note right of TaxAgent: amount: $20, desc: "Form 8949 Gen"
    
    PaySkill-->>TaxAgent: Payment Link
    
    TaxAgent->>User: "Please pay $20 to unlock the PDF"
    
    User->>PaySkill: Completes Payment
    PaySkill-->>TaxAgent: Webhook: Payment Success
    
    TaxAgent->>User: Sends PDF Document
```

---

## 4. Global API Aggregation (Channel Routing)

**Scenario**: A "Universal Chat" Agent wraps OpenAI, Anthropic, and DeepSeek, charging users per message.
**Key Value**: The Payment Skill handles the complexity of accepting payments from anywhere in the world (Crypto or Fiat).

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant ChatAgent
    participant PaySkill as Payment Skill
    participant Router as Smart Router

    User->>ChatAgent: "Subscribe to Pro Plan ($29/mo)"
    
    ChatAgent->>PaySkill: POST /api/payments/subscribe
    
    PaySkill->>Router: getRouting(UserCountry="CN")
    Router-->>PaySkill: Suggest: Alipay or TRC20 USDT
    
    PaySkill-->>User: Show Payment Options (Alipay / USDT)
    
    User->>PaySkill: Pays via Alipay
    
    PaySkill->>ChatAgent: Grant Subscription Token
```

---

## 5. Cross-Platform Distribution (Promoter Mode)

**Scenario**: An e-commerce platform wants to drive traffic from Discord and Telegram communities.
**Key Value**: Distributing the "Shop Skill" to community managers (Promoters) who earn from Platform Fees.

### Implementation Logic
1.  **Merchant** creates a "Official Shop Skill".
2.  **Promoter (Community Admin)** installs this skill into their Discord Bot.
3.  **Binding**: The installation links the Promoter's ID to the Shop Skill instance.
4.  **Revenue**: When a Discord user buys, the **Promoter** earns 20% of the Platform Fee (as defined in `Agentrix V5 Protocol`), NOT from the Agent's incentive pool, ensuring the original Creator's income is protected.

```mermaid
graph LR
    User((Discord User)) -->|Buys Item| Bot[Discord Bot]
    Bot -->|Invokes| ShopSkill
    ShopSkill -->|Settles| Contract
    Contract -->|20% of PlatFee| Promoter[Community Admin]
    Contract -->|Pool Share| Creator[Skill Creator]
```
