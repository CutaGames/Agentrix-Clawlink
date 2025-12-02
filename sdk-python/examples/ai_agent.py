"""
AI Agent integration example
"""

import os
from paymind import PayMind

def ai_agent_example():
    paymind = PayMind(
        api_key=os.getenv("PAYMIND_API_KEY", "your-api-key"),
        base_url=os.getenv("PAYMIND_API_URL", "http://localhost:3001/api"),
    )

    agent_id = "agent_123"

    try:
        # 1. Create auto-pay grant for the agent
        print("Creating auto-pay grant...")
        grant = paymind.agents.create_auto_pay_grant(
            agent_id=agent_id,
            single_limit=50,  # $50 per transaction
            daily_limit=500,  # $500 per day
            currency="USD",
            expires_in_days=30,
        )
        print(f"Auto-pay grant created: {grant['id']}")
        print(f"Limits: single={grant['singleLimit']}, daily={grant['dailyLimit']}")

        # 2. Check existing grant
        print("\nChecking existing grant...")
        existing_grant = paymind.agents.get_auto_pay_grant()
        if existing_grant:
            print(f"Grant found: {existing_grant['id']}")
            print(f"Used today: {existing_grant['usedToday']}")

        # 3. Create a payment
        print("\nCreating payment...")
        payment = paymind.payments.create({
            "amount": 25,
            "currency": "USD",
            "description": "AI service payment",
            "agentId": agent_id,
            "metadata": {
                "service": "image-generation",
            },
        })
        print(f"Payment created: {payment['id']}")

        # 4. Get agent earnings
        print("\nGetting agent earnings...")
        earnings = paymind.agents.get_earnings(agent_id)
        print(f"Total earnings: {earnings['totalEarnings']}")
        print(f"Total commissions: {earnings['totalCommissions']}")

        # 5. Get agent commissions
        print("\nGetting agent commissions...")
        commissions = paymind.agents.get_commissions(agent_id, page=1, limit=10)
        print(f"Commissions: {len(commissions['data'])}")

    except Exception as error:
        print(f"Error: {error}")

if __name__ == "__main__":
    ai_agent_example()

