from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.workout import Workout, WorkoutExercise
from app.schemas.workout import WorkoutCreate

router = APIRouter(tags=["workouts"])


@router.post("/workouts")
def create_workout(payload: WorkoutCreate, db: Session = Depends(get_db)) -> dict:
    workout = Workout(
        date=payload.date,
        duration_minutes=payload.duration_minutes,
        subjective_fatigue=payload.subjective_fatigue,
        workout_quality=payload.workout_quality,
        program_day_id=payload.program_day_id,
    )
    db.add(workout)
    db.flush()

    for ex in payload.exercises:
        if ex.exercise_type == "cardio" and not ex.duration_minutes:
            raise HTTPException(status_code=400, detail="Cardio requires duration_minutes")
        db.add(
            WorkoutExercise(
                workout_id=workout.id,
                exercise_name=ex.exercise_name,
                set_number=ex.set_number,
                exercise_type=ex.exercise_type,
                muscle_group=ex.muscle_group,
                reps=ex.reps or 0,
                weight_kg=ex.weight_kg or 0.0,
                rpe=ex.rpe or 0.0,
                duration_minutes=ex.duration_minutes,
            )
        )

    db.commit()
    return {"id": workout.id}


@router.get("/workouts/last")
def last_workout(
    program_day_id: int | None = Query(default=None),
    exercise_name: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    if not program_day_id and not exercise_name:
        raise HTTPException(status_code=400, detail="program_day_id or exercise_name required")
    query = db.query(Workout).order_by(Workout.date.desc())
    if program_day_id:
        query = query.filter(Workout.program_day_id == program_day_id)
    workout = query.first()
    if not workout:
        return {"workout": None, "exercises": []}
    exercises_q = db.query(WorkoutExercise).filter(WorkoutExercise.workout_id == workout.id)
    if exercise_name:
        exercises_q = exercises_q.filter(WorkoutExercise.exercise_name == exercise_name)
    exercises = [e.__dict__ for e in exercises_q.all()]
    return {"workout": workout.__dict__, "exercises": exercises}
