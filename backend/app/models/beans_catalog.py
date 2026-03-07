import uuid

from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BeansCatalog(Base):
    __tablename__ = "beans_catalog"

    coffee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    roaster: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    origin_country: Mapped[str | None] = mapped_column(String(100))
    roaster_location: Mapped[str | None] = mapped_column(String(255))
    roast_level: Mapped[str | None] = mapped_column(String(50))
    process: Mapped[str | None] = mapped_column(String(100))
    flavor_notes: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    body: Mapped[int | None] = mapped_column(Integer)
    brew_methods: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    is_blend: Mapped[bool | None] = mapped_column(Boolean)
    price_min: Mapped[float | None] = mapped_column(Float)
    image_url: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(Text)
    flavor_categories: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    display_name: Mapped[str | None] = mapped_column(String(255))
    roast_profile: Mapped[str | None] = mapped_column(String(50))
