"""
PayMind SDK - Main client
"""

from typing import Optional
from .http_client import PayMindClient
from .resources.payments import PaymentResource
from .resources.agents import AgentResource
from .resources.merchants import MerchantResource
from .resources.webhooks import WebhookHandler
from .utils.validation import validate_api_key


class PayMind:
    """Main PayMind SDK client"""

    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        timeout: int = 30,
        retries: int = 3,
        webhook_secret: Optional[str] = None,
    ):
        validate_api_key(api_key)

        self._client = PayMindClient(
            api_key=api_key,
            base_url=base_url or "https://api.paymind.com/api",
            timeout=timeout,
            retries=retries,
        )

        self.payments = PaymentResource(self._client)
        self.agents = AgentResource(self._client)
        self.merchants = MerchantResource(self._client)
        self.webhooks = WebhookHandler(webhook_secret or "")

    def set_api_key(self, api_key: str) -> None:
        """Update API key"""
        validate_api_key(api_key)
        self._client.set_api_key(api_key)

    def set_base_url(self, base_url: str) -> None:
        """Update base URL"""
        self._client.set_base_url(base_url)
