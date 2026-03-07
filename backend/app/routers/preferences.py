from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user_preferences import UserPreferences
from app.schemas.beans import UserPreferencesResponse, UserPreferencesUpdate

router = APIRouter(prefix="/api/user/preferences", tags=["user-preferences"])


def _get_user_id(x_user_id: str = Header(...)) -> str:
    return x_user_id


@router.get("", response_model=UserPreferencesResponse)
def get_preferences(
    user_id: str = Depends(_get_user_id),
    db: Session = Depends(get_db),
):
    prefs = db.get(UserPreferences, user_id)
    if not prefs:
        return UserPreferencesResponse()
    return prefs


@router.put("", response_model=UserPreferencesResponse)
def update_preferences(
    payload: UserPreferencesUpdate,
    user_id: str = Depends(_get_user_id),
    db: Session = Depends(get_db),
):
    prefs = db.get(UserPreferences, user_id)
    if not prefs:
        prefs = UserPreferences(user_id=user_id)
        db.add(prefs)

    if payload.last_used_bean_id is not None:
        prefs.last_used_bean_id = payload.last_used_bean_id
    if payload.last_used_brew_method is not None:
        prefs.last_used_brew_method = payload.last_used_brew_method

    db.commit()
    db.refresh(prefs)
    return prefs
