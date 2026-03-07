from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.beans_catalog import BeansCatalog
from app.schemas.beans import BeanCatalogResponse

router = APIRouter(prefix="/api/beans", tags=["beans-catalog"])


@router.get("/catalog", response_model=list[BeanCatalogResponse])
def get_catalog(db: Session = Depends(get_db)):
    result = db.execute(select(BeansCatalog).order_by(BeansCatalog.roaster, BeansCatalog.name))
    return result.scalars().all()


@router.get("/catalog/roasters", response_model=list[str])
def get_roasters(db: Session = Depends(get_db)):
    result = db.execute(
        select(BeansCatalog.roaster).distinct().order_by(BeansCatalog.roaster)
    )
    return result.scalars().all()
