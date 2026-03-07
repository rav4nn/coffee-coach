from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class BeanCatalogResponse(BaseModel):
    coffee_id: UUID
    name: str
    roaster: str
    roast_level: str | None = None
    process: str | None = None
    flavor_notes: list[str] | None = None
    is_blend: bool | None = None
    display_name: str | None = None

    model_config = {"from_attributes": True}


class UserBeanCreate(BaseModel):
    coffee_id: UUID
    roast_date: date | None = None
    is_pre_ground: bool = False


class UserBeanResponse(BaseModel):
    id: UUID
    coffee_id: UUID
    name: str
    roaster: str
    roast_level: str | None = None
    roast_date: date | None = None
    is_pre_ground: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPreferencesResponse(BaseModel):
    last_used_bean_id: UUID | None = None
    last_used_brew_method: str | None = None

    model_config = {"from_attributes": True}


class UserPreferencesUpdate(BaseModel):
    last_used_bean_id: UUID | None = None
    last_used_brew_method: str | None = None
