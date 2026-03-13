from rest_framework.views import exception_handler as drf_exception_handler


def custom_exception_handler(exc, context):
    """Ensure every error response includes ``detail`` and ``code``."""
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    data = response.data

    if isinstance(data, dict):
        detail = data.get("detail")
        if detail is not None:
            code = getattr(detail, "code", None) or data.get("code") or _default_code(response.status_code)
            response.data = {"detail": str(detail), "code": str(code)}

    return response


def _default_code(status_code: int) -> str:
    return {
        400: "bad_request",
        401: "not_authenticated",
        403: "permission_denied",
        404: "not_found",
        405: "method_not_allowed",
        429: "throttled",
        502: "bad_gateway",
        503: "service_unavailable",
    }.get(status_code, "error")
