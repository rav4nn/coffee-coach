from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.beans_catalog import BeansCatalog
from app.models.user_beans import UserBean
from app.schemas.beans import UserBeanCreate, UserBeanResponse

router = APIRouter(prefix="/api/user/beans", tags=["user-beans"])


def _get_user_id(x_user_id: str = Header(...)) -> str:
    return x_user_id


@router.get("", response_model=list[UserBeanResponse])
def get_user_beans(
    user_id: str = Depends(_get_user_id),
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(UserBean)
        .where(UserBean.user_id == user_id)
        .order_by(UserBean.created_at.desc())
    )
    beans = result.scalars().all()
    return [
        UserBeanResponse(
            id=b.id,
            coffee_id=b.coffee_id,
            name=b.bean.name,
            roaster=b.bean.roaster,
            roast_level=b.bean.roast_level,
            roast_date=b.roast_date,
            is_pre_ground=b.is_pre_ground,
            created_at=b.created_at,
        )
        for b in beans
    ]


@router.post("", response_model=UserBeanResponse, status_code=201)
def add_user_bean(
    payload: UserBeanCreate,
    user_id: str = Depends(_get_user_id),
    db: Session = Depends(get_db),
):
    catalog_bean = db.get(BeansCatalog, payload.coffee_id)
    if not catalog_bean:
        raise HTTPException(status_code=404, detail="Bean not found in catalog")

    user_bean = UserBean(
        user_id=user_id,
        coffee_id=payload.coffee_id,
        roast_date=payload.roast_date,
        is_pre_ground=payload.is_pre_ground,
    )
    db.add(user_bean)
    db.commit()
    db.refresh(user_bean)

    return UserBeanResponse(
        id=user_bean.id,
        coffee_id=user_bean.coffee_id,
        name=catalog_bean.name,
        roaster=catalog_bean.roaster,
        roast_level=catalog_bean.roast_level,
        roast_date=user_bean.roast_date,
        is_pre_ground=user_bean.is_pre_ground,
        created_at=user_bean.created_at,
    )


@router.delete("/{bean_id}", status_code=204)
def delete_user_bean(
    bean_id: UUID,
    user_id: str = Depends(_get_user_id),
    db: Session = Depends(get_db),
):
    user_bean = db.execute(
        select(UserBean).where(UserBean.id == bean_id, UserBean.user_id == user_id)
    ).scalar_one_or_none()

    if not user_bean:
        raise HTTPException(status_code=404, detail="Bean not found")

    db.delete(user_bean)
    db.commit()
