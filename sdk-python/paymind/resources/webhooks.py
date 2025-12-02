"""
Webhook handler for PayMind SDK
"""

import hmac
import hashlib
from typing import Dict, Any, Optional


class WebhookHandler:
    """Webhook signature verification and event parsing"""

    def __init__(self, secret: str):
        self.secret = secret

    def verify_signature(self, payload: str, signature: str) -> bool:
        """Verify webhook signature"""
        if not self.secret:
            raise ValueError("Webhook secret is required")

        expected_signature = hmac.new(
            self.secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature)

    def construct_event(
        self, payload: str, signature: str
    ) -> Dict[str, Any]:
        """Construct webhook event from payload"""
        if not self.verify_signature(payload, signature):
            raise ValueError("Invalid webhook signature")

        import json
        data = json.loads(payload)

        return {
            "id": data.get("id"),
            "type": data.get("type"),
            "data": data.get("data"),
            "timestamp": data.get("timestamp"),
        }

