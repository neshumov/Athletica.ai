from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.goal import UserGoal
from app.schemas.goal import GoalCreate, GoalOut

router = APIRouter(tags=["goals"])


@router.get("/goals", response_model=list[GoalOut])
def list_goals(db: Session = Depends(get_db)) -> list[GoalOut]:
    rows = db.query(UserGoal).order_by(UserGoal.id.desc()).all()
    return [GoalOut.model_validate(r.__dict__) for r in rows]


@router.post("/goals", response_model=GoalOut)
def create_goal(payload: GoalCreate, db: Session = Depends(get_db)) -> GoalOut:
    db.query(UserGoal).update({UserGoal.is_active: False})
    goal = UserGoal(
        goal_type=payload.goal_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        priority_muscle_groups=payload.priority_muscle_groups,
        is_active=True,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return GoalOut.model_validate(goal.__dict__)


@router.post("/goals/{goal_id}/activate")
def activate_goal(goal_id: int, db: Session = Depends(get_db)) -> dict:
    goal = db.query(UserGoal).filter(UserGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.query(UserGoal).update({UserGoal.is_active: False})
    goal.is_active = True
    db.commit()
    return {"status": "ok"}
