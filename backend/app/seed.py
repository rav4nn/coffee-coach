"""Seed the beans_catalog table from beans_AI.json."""

import json
import uuid
from pathlib import Path

from sqlalchemy import select

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.beans_catalog import BeansCatalog

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "beans_AI.json"


def seed_catalog():
    Base.metadata.create_all(bind=engine)

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        beans = json.load(f)

    db = SessionLocal()
    try:
        existing_count = db.execute(
            select(BeansCatalog.coffee_id).limit(1)
        ).first()

        if existing_count:
            print(f"Catalog already seeded. Skipping.")
            return

        for bean in beans:
            db.add(
                BeansCatalog(
                    coffee_id=uuid.UUID(bean["coffee_id"]),
                    name=bean.get("name", ""),
                    roaster=bean.get("roaster", ""),
                    origin_country=bean.get("origin_country"),
                    roaster_location=bean.get("roaster_location"),
                    roast_level=bean.get("roast_level"),
                    process=bean.get("process"),
                    flavor_notes=bean.get("flavor_notes"),
                    body=bean.get("body"),
                    brew_methods=bean.get("brew_methods"),
                    is_blend=bean.get("is_blend"),
                    price_min=bean.get("price_min"),
                    image_url=bean.get("image_url"),
                    source_url=bean.get("source_url"),
                    flavor_categories=bean.get("flavor_categories"),
                    display_name=bean.get("display_name"),
                    roast_profile=bean.get("roast_profile"),
                )
            )

        db.commit()
        print(f"Seeded {len(beans)} beans into catalog.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_catalog()
