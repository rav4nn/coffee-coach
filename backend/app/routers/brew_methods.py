import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Query

_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "brew_methods.json"
_METHODS: list[dict] = json.loads(_DATA_PATH.read_text(encoding="utf-8"))

router = APIRouter(prefix="/api/brew-methods", tags=["brew-methods"])


@router.get("")
def get_brew_methods(parent: Optional[str] = Query(None)):
    if parent:
        return [m for m in _METHODS if m.get("parent_method") == parent]
    return _METHODS
