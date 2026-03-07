import uuid

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    user_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    last_used_bean_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    last_used_brew_method: Mapped[str | None] = mapped_column(String(50))
