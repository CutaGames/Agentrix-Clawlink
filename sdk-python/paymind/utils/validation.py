"""
Validation utilities
"""

from .errors import PayMindValidationError


def validate_api_key(api_key: str) -> None:
    """Validate API key"""
    if not api_key or not isinstance(api_key, str) or not api_key.strip():
        raise PayMindValidationError("API key is required")


def validate_amount(amount: float) -> None:
    """Validate amount"""
    if not isinstance(amount, (int, float)) or amount <= 0:
        raise PayMindValidationError("Amount must be a positive number")


def validate_currency(currency: str) -> None:
    """Validate currency code"""
    if not currency or not isinstance(currency, str) or len(currency) != 3:
        raise PayMindValidationError("Currency must be a 3-letter code (e.g., USD, CNY)")


def validate_payment_request(request: dict) -> None:
    """Validate payment request"""
    if "amount" not in request:
        raise PayMindValidationError("Amount is required")
    validate_amount(request["amount"])

    if "currency" not in request:
        raise PayMindValidationError("Currency is required")
    validate_currency(request["currency"])

    if "description" not in request:
        raise PayMindValidationError("Description is required")

