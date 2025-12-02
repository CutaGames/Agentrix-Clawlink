"""
Merchant resource for Agentrix SDK
"""

from typing import Dict, Any, Optional
from ..http_client import AgentrixClient


class MerchantResource:
    """Merchant operations"""

    def __init__(self, client: AgentrixClient):
        self.client = client

    def create_product(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Create a product"""
        if not request.get("name"):
            raise ValueError("Product name is required")
        if not request.get("price") or request["price"] <= 0:
            raise ValueError("Product price must be a positive number")
        return self.client.post("/products", request)

    def get_product(self, product_id: str) -> Dict[str, Any]:
        """Get product by ID"""
        if not product_id:
            raise ValueError("Product ID is required")
        return self.client.get(f"/products/{product_id}")

    def list_products(
        self,
        page: Optional[int] = None,
        limit: Optional[int] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List products"""
        params = {}
        if page is not None:
            params["page"] = page
        if limit is not None:
            params["limit"] = limit
        if category:
            params["category"] = category
        if search:
            params["search"] = search

        return self.client.get("/products", params=params if params else None)

    def update_product(self, product_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a product"""
        if not product_id:
            raise ValueError("Product ID is required")
        return self.client.put(f"/products/{product_id}", updates)

    def delete_product(self, product_id: str) -> None:
        """Delete a product"""
        if not product_id:
            raise ValueError("Product ID is required")
        self.client.delete(f"/products/{product_id}")

    def get_order(self, order_id: str) -> Dict[str, Any]:
        """Get order by ID"""
        if not order_id:
            raise ValueError("Order ID is required")
        return self.client.get(f"/orders/{order_id}")

    def list_orders(
        self,
        page: Optional[int] = None,
        limit: Optional[int] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List orders"""
        params = {}
        if page is not None:
            params["page"] = page
        if limit is not None:
            params["limit"] = limit
        if status:
            params["status"] = status

        return self.client.get("/orders", params=params if params else None)

