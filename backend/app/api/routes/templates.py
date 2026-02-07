from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.exercise import Exercise
from app.models.workout_template import WorkoutTemplate, WorkoutTemplateExercise
from app.schemas.template import (
    WorkoutTemplateCreate,
    WorkoutTemplateExerciseCreate,
    WorkoutTemplateExercisesSave,
    WorkoutTemplateOut,
)

router = APIRouter(tags=["workout-templates"])


@router.get("/workouts/templates", response_model=list[WorkoutTemplateOut])
def list_templates(db: Session = Depends(get_db)) -> list[WorkoutTemplateOut]:
    rows = db.query(WorkoutTemplate).order_by(WorkoutTemplate.id.desc()).all()
    return [WorkoutTemplateOut.model_validate(r.__dict__) for r in rows]


@router.get("/workouts/templates/{template_id}/exercises")
def list_template_exercises(template_id: int, db: Session = Depends(get_db)) -> list[dict]:
    rows = (
        db.query(WorkoutTemplateExercise, Exercise)
        .join(Exercise, Exercise.id == WorkoutTemplateExercise.exercise_id)
        .filter(WorkoutTemplateExercise.workout_template_id == template_id)
        .order_by(WorkoutTemplateExercise.order_index.asc())
        .all()
    )
    return [
        {
            "exercise_id": ex.id,
            "name": ex.name,
            "exercise_type": ex.exercise_type,
            "muscle_group": ex.muscle_group,
            "equipment": ex.equipment,
            "target_sets": row.target_sets,
        }
        for row, ex in rows
    ]


@router.post("/workouts/templates", response_model=WorkoutTemplateOut)
def create_template(
    payload: WorkoutTemplateCreate, db: Session = Depends(get_db)
) -> WorkoutTemplateOut:
    row = WorkoutTemplate(name=payload.name)
    db.add(row)
    db.commit()
    db.refresh(row)
    return WorkoutTemplateOut.model_validate(row.__dict__)


@router.post("/workouts/templates/{template_id}/exercises")
def add_template_exercise(
    template_id: int, payload: WorkoutTemplateExerciseCreate, db: Session = Depends(get_db)
) -> dict:
    template = db.query(WorkoutTemplate).filter(WorkoutTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    exercise = db.query(Exercise).filter(Exercise.id == payload.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    row = WorkoutTemplateExercise(
        workout_template_id=template_id,
        exercise_id=payload.exercise_id,
        order_index=payload.order_index,
        target_sets=payload.target_sets,
    )
    db.add(row)
    db.commit()
    return {"status": "ok"}


@router.put("/workouts/templates/{template_id}/exercises")
def save_template_exercises(
    template_id: int, payload: WorkoutTemplateExercisesSave, db: Session = Depends(get_db)
) -> dict:
    template = db.query(WorkoutTemplate).filter(WorkoutTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.query(WorkoutTemplateExercise).filter(
        WorkoutTemplateExercise.workout_template_id == template_id
    ).delete()
    for item in payload.exercises:
        exercise = db.query(Exercise).filter(Exercise.id == item.exercise_id).first()
        if not exercise:
            raise HTTPException(
                status_code=404, detail=f"Exercise {item.exercise_id} not found"
            )
        db.add(
            WorkoutTemplateExercise(
                workout_template_id=template_id,
                exercise_id=item.exercise_id,
                order_index=item.order_index,
                target_sets=item.target_sets,
            )
        )
    db.commit()
    return {"status": "saved"}


@router.delete("/workouts/templates/{template_id}/exercises/{exercise_id}")
def delete_template_exercise(
    template_id: int, exercise_id: int, db: Session = Depends(get_db)
) -> dict:
    deleted = (
        db.query(WorkoutTemplateExercise)
        .filter(
            WorkoutTemplateExercise.workout_template_id == template_id,
            WorkoutTemplateExercise.exercise_id == exercise_id,
        )
        .delete()
    )
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Exercise not found in template")
    return {"status": "deleted"}
