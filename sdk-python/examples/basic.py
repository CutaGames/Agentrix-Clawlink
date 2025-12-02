"""
Basic Python example
"""

import os
from agentrix import Agentrix

def main():
    # Initialize SDK
    agentrix = Agentrix(
        api_key=os.getenv("AGENTRIX_API_KEY", "your-api-key"),
        base_url=os.getenv("AGENTRIX_API_URL", "http://localhost:3001/api"),
    )

    try:
        # Get payment routing recommendation
        print("Getting payment routing...")
        routing = agentrix.payments.get_routing(
            amount=100,
            currency="USD",
            user_country="US",
            merchant_country="CN",
        )
        print(f"Recommended method: {routing['recommendedMethod']}")
        print(f"Reason: {routing['reason']}")

        # Create a payment
        print("\nCreating payment...")
        payment = agentrix.payments.create({
            "amount": 100,
            "currency": "USD",
            "description": "Test payment",
            "metadata": {
                "orderId": "test-order-123",
            },
        })
        print(f"Payment created: {payment['id']}")
        print(f"Status: {payment['status']}")

        # Get payment status
        print("\nGetting payment status...")
        status = agentrix.payments.get(payment["id"])
        print(f"Payment status: {status['status']}")

    except Exception as error:
        print(f"Error: {error}")

if __name__ == "__main__":
    main()

