"""
HTTP Client for Agentrix API
"""

import requests
from typing import Optional, Dict, Any
from .utils.errors import AgentrixError, handle_error
from .utils.validation import validate_api_key


class AgentrixClient:
    """HTTP client for Agentrix API"""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.agentrix.com/api",
        timeout: int = 30,
        retries: int = 3,
    ):
        validate_api_key(api_key)

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.retries = retries

        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        })

    def _request(
        self,
        method: str,
        path: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make HTTP request with retry logic"""
        url = f"{self.base_url}{path}"

        for attempt in range(self.retries):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    json=data,
                    params=params,
                    timeout=self.timeout,
                )
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as e:
                if attempt == self.retries - 1:
                    raise handle_error(e, response.status_code if hasattr(e, 'response') and e.response else None)
                # Exponential backoff
                import time
                time.sleep(2 ** attempt)

    def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """GET request"""
        return self._request("GET", path, params=params)

    def post(self, path: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """POST request"""
        return self._request("POST", path, data=data)

    def put(self, path: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """PUT request"""
        return self._request("PUT", path, data=data)

    def delete(self, path: str) -> Dict[str, Any]:
        """DELETE request"""
        return self._request("DELETE", path)

    def set_api_key(self, api_key: str) -> None:
        """Update API key"""
        validate_api_key(api_key)
        self.api_key = api_key
        self.session.headers["Authorization"] = f"Bearer {api_key}"

    def set_base_url(self, base_url: str) -> None:
        """Update base URL"""
        self.base_url = base_url.rstrip("/")

