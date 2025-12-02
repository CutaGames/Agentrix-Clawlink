"""
Webhook handling example with Flask
"""

from flask import Flask, request, jsonify
from agentrix import Agentrix
import os

app = Flask(__name__)

# Initialize Agentrix SDK
agentrix = Agentrix(
    api_key=os.getenv("AGENTRIX_API_KEY", "your-api-key"),
    webhook_secret=os.getenv("AGENTRIX_WEBHOOK_SECRET", "your-webhook-secret"),
)


@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        signature = request.headers.get("Agentrix-Signature", "")

        if not signature:
            return jsonify({"error": "Missing signature"}), 400

        # Verify and parse webhook event
        event = agentrix.webhooks.construct_event(
            request.data.decode("utf-8"),
            signature
        )

        print(f"Webhook event received: {event['type']}")

        # Handle different event types
        if event["type"] == "payment.completed":
            handle_payment_completed(event["data"])
        elif event["type"] == "payment.failed":
            handle_payment_failed(event["data"])
        elif event["type"] == "payment.cancelled":
            handle_payment_cancelled(event["data"])
        elif event["type"] == "commission.settled":
            handle_commission_settled(event["data"])
        else:
            print(f"Unknown event type: {event['type']}")

        return jsonify({"received": True}), 200
    except ValueError as e:
        print(f"Webhook error: {str(e)}")
        return jsonify({"error": str(e)}), 400


def handle_payment_completed(data):
    print(f"Payment completed: {data['id']}")
    print(f"Amount: {data['amount']} {data['currency']}")
    print(f"Transaction Hash: {data.get('transactionHash', 'N/A')}")


def handle_payment_failed(data):
    print(f"Payment failed: {data['id']}")
    print(f"Error: {data.get('error', 'Unknown error')}")


def handle_payment_cancelled(data):
    print(f"Payment cancelled: {data['id']}")


def handle_commission_settled(data):
    print(f"Commission settled: {data['id']}")
    print(f"Amount: {data['amount']}")
    print(f"Agent ID: {data['agentId']}")


if __name__ == "__main__":
    print("Webhook server starting on http://localhost:5000")
    print("Webhook URL: http://localhost:5000/webhook")
    app.run(port=5000, debug=True)

