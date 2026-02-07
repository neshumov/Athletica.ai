from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.training import ProgramDay, ProgramExercise, TrainingProgram
from app.schemas.training import (
    ProgramCreate,
    ProgramDayCreate,
    ProgramDayOut,
    ProgramExerciseCreate,
    ProgramExerciseOut,
    ProgramOut,
)

router = APIRouter(tags=["training"])


@router.get("/programs", response_model=list[ProgramOut])
def list_programs(db: Session = Depends(get_db)) -> list[ProgramOut]:
    rows = db.query(TrainingProgram).order_by(TrainingProgram.id.desc()).all()
    return [ProgramOut.model_validate(r.__dict__) for r in rows]


@router.post("/programs", response_model=ProgramOut)
def create_program(payload: ProgramCreate, db: Session = Depends(get_db)) -> ProgramOut:
    program = TrainingProgram(name=payload.name, is_active=True)
    db.add(program)
    db.commit()
    db.refresh(program)
    return ProgramOut.model_validate(program.__dict__)


@router.post("/programs/{program_id}/days", response_model=ProgramDayOut)
def create_program_day(
    program_id: int, payload: ProgramDayCreate, db: Session = Depends(get_db)
) -> ProgramDayOut:
    program = db.query(TrainingProgram).filter(TrainingProgram.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    day = ProgramDay(program_id=program_id, day_name=payload.day_name)
    db.add(day)
    db.commit()
    db.refresh(day)
    return ProgramDayOut.model_validate(day.__dict__)


@router.post("/program-days/{day_id}/exercises", response_model=ProgramExerciseOut)
def create_program_exercise(
    day_id: int, payload: ProgramExerciseCreate, db: Session = Depends(get_db)
) -> ProgramExerciseOut:
    day = db.query(ProgramDay).filter(ProgramDay.id == day_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Program day not found")
    exercise = ProgramExercise(
        program_day_id=day_id,
        exercise_type=payload.exercise_type,
        exercise_name=payload.exercise_name,
        muscle_group=payload.muscle_group,
        equipment=payload.equipment,
        target_sets=payload.target_sets,
        target_reps=payload.target_reps,
        target_weight_kg=payload.target_weight_kg,
        target_duration_minutes=payload.target_duration_minutes,
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return ProgramExerciseOut.model_validate(exercise.__dict__)
