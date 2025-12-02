"""
Error handling for PayMind SDK
"""

from typing import Optional, Any
import requests


class PayMindError(Exception):
    """Base error class for PayMind SDK"""

    def __init__(self, code: str, message: str, details: Optional[Any] = None):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(self.message)


class PayMindAPIError(PayMindError):
    """API error with status code"""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: Optional[int] = None,
        details: Optional[Any] = None,
    ):
        self.status_code = status_code
        super().__init__(code, message, details)


class PayMindValidationError(PayMindError):
    """Validation error"""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__("VALIDATION_ERROR", message, details)


def handle_error(error: Exception, status_code: Optional[int] = None) -> PayMindError:
    """Convert exception to PayMindError"""
    if isinstance(error, PayMindError):
        return error

    if isinstance(error, requests.exceptions.HTTPError):
        try:
            error_data = error.response.json()
            if "error" in error_data:
                return PayMindAPIError(
                    error_data["error"].get("code", "API_ERROR"),
                    error_data["error"].get("message", str(error)),
                    status_code or error.response.status_code,
                    error_data["error"].get("details"),
                )
        except (ValueError, KeyError):
            pass

        return PayMindAPIError(
            "API_ERROR",
            str(error),
            status_code or (error.response.status_code if hasattr(error, 'response') else None),
        )

    return PayMindError("UNKNOWN_ERROR", str(error))

