from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.calendar import CalendarWorkout, CalendarWorkoutExercise
from app.models.exercise import Exercise
from app.models.workout_template import WorkoutTemplate, WorkoutTemplateExercise
from app.schemas.calendar import CalendarWorkoutCreate, CalendarWorkoutDetail, CalendarWorkoutOut

router = APIRouter(tags=["calendar"])


@router.get("/calendar", response_model=list[CalendarWorkoutOut])
def list_calendar(
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[CalendarWorkoutOut]:
    query = db.query(CalendarWorkout)
    if date_from:
        query = query.filter(CalendarWorkout.date >= date_from)
    if date_to:
        query = query.filter(CalendarWorkout.date <= date_to)
    rows = query.order_by(CalendarWorkout.date.desc()).all()
    return [CalendarWorkoutOut.model_validate(r.__dict__) for r in rows]


@router.get("/calendar/{calendar_id}", response_model=CalendarWorkoutDetail)
def get_calendar(calendar_id: int, db: Session = Depends(get_db)) -> CalendarWorkoutDetail:
    row = db.query(CalendarWorkout).filter(CalendarWorkout.id == calendar_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Calendar item not found")
    exercises = db.query(CalendarWorkoutExercise).filter(
        CalendarWorkoutExercise.calendar_workout_id == row.id
    ).all()
    return CalendarWorkoutDetail(
        id=row.id,
        date=row.date,
        workout_template_id=row.workout_template_id,
        name_snapshot=row.name_snapshot,
        exercises=[
            {
                "exercise_id": ex.exercise_id,
                "set_number": ex.set_number,
                "reps": ex.reps,
                "weight_kg": ex.weight_kg,
                "duration_minutes": ex.duration_minutes,
            }
            for ex in exercises
        ],
    )


@router.post("/calendar", response_model=CalendarWorkoutOut)
def create_calendar(payload: CalendarWorkoutCreate, db: Session = Depends(get_db)) -> CalendarWorkoutOut:
    template = db.query(WorkoutTemplate).filter(WorkoutTemplate.id == payload.workout_template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    calendar = CalendarWorkout(
        date=payload.date,
        workout_template_id=template.id,
        name_snapshot=template.name,
    )
    db.add(calendar)
    db.flush()

    for ex in payload.exercises:
        exercise = db.query(Exercise).filter(Exercise.id == ex.exercise_id).first()
        if not exercise:
            raise HTTPException(status_code=404, detail=f"Exercise {ex.exercise_id} not found")
        db.add(
            CalendarWorkoutExercise(
                calendar_workout_id=calendar.id,
                exercise_id=exercise.id,
                exercise_name=exercise.name,
                exercise_type=exercise.exercise_type,
                muscle_group=exercise.muscle_group,
                equipment=exercise.equipment,
                set_number=ex.set_number,
                reps=ex.reps,
                weight_kg=ex.weight_kg,
                duration_minutes=ex.duration_minutes,
            )
        )

    db.commit()
    return CalendarWorkoutOut.model_validate(calendar.__dict__)


@router.put("/calendar/{calendar_id}", response_model=CalendarWorkoutOut)
def update_calendar(
    calendar_id: int, payload: CalendarWorkoutCreate, db: Session = Depends(get_db)
) -> CalendarWorkoutOut:
    calendar = db.query(CalendarWorkout).filter(CalendarWorkout.id == calendar_id).first()
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar item not found")
    template = db.query(WorkoutTemplate).filter(WorkoutTemplate.id == payload.workout_template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    calendar.date = payload.date
    calendar.workout_template_id = template.id
    calendar.name_snapshot = template.name

    db.query(CalendarWorkoutExercise).filter(
        CalendarWorkoutExercise.calendar_workout_id == calendar.id
    ).delete()

    for ex in payload.exercises:
        exercise = db.query(Exercise).filter(Exercise.id == ex.exercise_id).first()
        if not exercise:
            raise HTTPException(status_code=404, detail=f"Exercise {ex.exercise_id} not found")
        db.add(
            CalendarWorkoutExercise(
                calendar_workout_id=calendar.id,
                exercise_id=exercise.id,
                exercise_name=exercise.name,
                exercise_type=exercise.exercise_type,
                muscle_group=exercise.muscle_group,
                equipment=exercise.equipment,
                set_number=ex.set_number,
                reps=ex.reps,
                weight_kg=ex.weight_kg,
                duration_minutes=ex.duration_minutes,
            )
        )

    db.commit()
    return CalendarWorkoutOut.model_validate(calendar.__dict__)


@router.delete("/calendar/{calendar_id}")
def delete_calendar(calendar_id: int, db: Session = Depends(get_db)) -> dict:
    row = db.query(CalendarWorkout).filter(CalendarWorkout.id == calendar_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Calendar item not found")
    db.query(CalendarWorkoutExercise).filter(
        CalendarWorkoutExercise.calendar_workout_id == calendar_id
    ).delete()
    db.delete(row)
    db.commit()
    return {"status": "deleted"}
