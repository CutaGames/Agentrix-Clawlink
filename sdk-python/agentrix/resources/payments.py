"""
Payment resource for Agentrix SDK
"""

from typing import Dict, Any, Optional
from ..http_client import AgentrixClient
from ..utils.validation import validate_payment_request


class PaymentResource:
    """Payment operations"""

    def __init__(self, client: AgentrixClient):
        self.client = client

    def create(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new payment"""
        validate_payment_request(request)
        return self.client.post("/payments", request)

    def get(self, payment_id: str) -> Dict[str, Any]:
        """Get payment by ID"""
        if not payment_id:
            raise ValueError("Payment ID is required")
        return self.client.get(f"/payments/{payment_id}")

    def cancel(self, payment_id: str) -> Dict[str, Any]:
        """Cancel a payment"""
        if not payment_id:
            raise ValueError("Payment ID is required")
        return self.client.post(f"/payments/{payment_id}/cancel")

    def get_routing(
        self,
        amount: float,
        currency: str,
        is_on_chain: Optional[bool] = None,
        user_country: Optional[str] = None,
        merchant_country: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get payment routing recommendation"""
        params = {
            "amount": amount,
            "currency": currency,
        }
        if is_on_chain is not None:
            params["isOnChain"] = is_on_chain
        if user_country:
            params["userCountry"] = user_country
        if merchant_country:
            params["merchantCountry"] = merchant_country

        return self.client.get("/payments/routing", params=params)

    def create_intent(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Create a payment intent"""
        return self.client.post("/payments/intent", request)

    def process(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Process a payment"""
        return self.client.post("/payments/process", request)

    def list(
        self,
        page: Optional[int] = None,
        limit: Optional[int] = None,
        status: Optional[str] = None,
        payment_method: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List payments"""
        params = {}
        if page is not None:
            params["page"] = page
        if limit is not None:
            params["limit"] = limit
        if status:
            params["status"] = status
        if payment_method:
            params["paymentMethod"] = payment_method

        return self.client.get("/payments", params=params if params else None)

