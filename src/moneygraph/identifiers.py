"""Lossless browser transport for int64 account identifiers.

The engine and CSV contracts retain integers. JSON account identifiers use
canonical decimal strings because JavaScript numbers cannot represent int64.
Only named account fields are transformed; metrics and community IDs stay numeric.
"""

import re
from typing import Any

from fastapi.responses import JSONResponse

ACCOUNT_ID_FIELDS = frozenset({"gid", "src", "dst", "root_gid", "source_gid", "route_center_gid", "selected_gid"})
ACCOUNT_ID_LIST_FIELDS = frozenset({"gids", "top_gids", "removed_gids", "payers", "path", "counterparties", "selected_cohort"})
MAX_ACCOUNT_ID = 2**63 - 1


def parse_account_id(value: Any) -> int:
    """Accept exact integer clients or canonical unsigned decimal-string clients."""
    if type(value) is int and 0 <= value <= MAX_ACCOUNT_ID:
        return value
    if isinstance(value, str) and re.fullmatch(r"0|[1-9][0-9]{0,18}", value):
        parsed = int(value)
        if parsed <= MAX_ACCOUNT_ID:
            return parsed
    raise ValueError("Account IDs must be nonnegative int64 integers or canonical decimal strings.")


def account_ids_for_json(value: Any) -> Any:
    """Copy evidence with exact account strings, including nested paths/citations."""
    if isinstance(value, dict):
        result = {}
        for key, item in value.items():
            if key in ACCOUNT_ID_FIELDS and type(item) is int:
                result[key] = str(item)
            elif key in ACCOUNT_ID_LIST_FIELDS and isinstance(item, (list, tuple)):
                result[key] = [str(part) if type(part) is int else account_ids_for_json(part) for part in item]
            else:
                result[key] = account_ids_for_json(item)
        return result
    if isinstance(value, (list, tuple)):
        return [account_ids_for_json(item) for item in value]
    return value


class AccountJSONResponse(JSONResponse):
    def render(self, content: Any) -> bytes:
        return super().render(account_ids_for_json(content))
