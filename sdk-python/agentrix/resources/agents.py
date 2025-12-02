"""
Agent resource for PayMind SDK
"""

from typing import Dict, Any, Optional
from ..http_client import PayMindClient


class AgentResource:
    """Agent operations"""

    def __init__(self, client: PayMindClient):
        self.client = client

    def create_auto_pay_grant(
        self,
        agent_id: str,
        single_limit: float,
        daily_limit: float,
        currency: str = "CNY",
        expires_in_days: int = 30,
    ) -> Dict[str, Any]:
        """Create an auto-pay grant for an agent"""
        if not agent_id:
            raise ValueError("Agent ID is required")
        if single_limit <= 0:
            raise ValueError("Single limit must be a positive number")
        if daily_limit <= 0:
            raise ValueError("Daily limit must be a positive number")

        return self.client.post(
            "/payments/x402/authorization",
            {
                "agentId": agent_id,
                "singleLimit": single_limit,
                "dailyLimit": daily_limit,
                "currency": currency,
                "expiresInDays": expires_in_days,
            },
        )

    def get_auto_pay_grant(self) -> Optional[Dict[str, Any]]:
        """Get auto-pay grant status"""
        return self.client.get("/payments/x402/authorization")

    def get_earnings(
        self,
        agent_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get agent earnings"""
        if not agent_id:
            raise ValueError("Agent ID is required")

        params = {}
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date

        return self.client.get(f"/agents/{agent_id}/earnings", params=params if params else None)

    def get_commissions(
        self,
        agent_id: str,
        page: Optional[int] = None,
        limit: Optional[int] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get agent commissions"""
        if not agent_id:
            raise ValueError("Agent ID is required")

        params = {}
        if page is not None:
            params["page"] = page
        if limit is not None:
            params["limit"] = limit
        if status:
            params["status"] = status

        return self.client.get(f"/agents/{agent_id}/commissions", params=params if params else None)

    def create_agent_payment(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Create an agent payment"""
        return self.client.post("/payments/agent/create", request)

    def confirm_agent_payment(self, payment_id: str) -> Dict[str, Any]:
        """Confirm an agent payment"""
        if not payment_id:
            raise ValueError("Payment ID is required")
        return self.client.post(f"/payments/agent/{payment_id}/confirm")

