from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
import re
from datetime import datetime
from zoneinfo import ZoneInfo

from app.models.nutrition import NutritionDaily
from app.models.recommendation import Recommendation, RecommendationFeedback
from app.workers.tasks import send_daily_insight
from app.services.telegram import send_telegram_message

router = APIRouter(tags=["telegram"])


@router.post("/telegram/test")
def telegram_test(message: str = "Athletica test message") -> dict:
    result = send_telegram_message(message)
    if result.get("status") != "ok":
        raise HTTPException(status_code=400, detail=result.get("detail"))
    return {"status": "ok"}


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    payload = await request.json()
    callback = payload.get("callback_query") if isinstance(payload, dict) else None
    if not callback:
        message = payload.get("message") if isinstance(payload, dict) else None
        if not message:
            return {"status": "ignored"}

        text = message.get("text") or ""
        numbers = [int(n) for n in re.findall(r"\d+", text)]
        if len(numbers) < 4:
            return {"status": "ignored"}
        calories, protein, fat, carbs = numbers[:4]
        today = datetime.now(ZoneInfo("Europe/Moscow")).date()
        row = db.query(NutritionDaily).filter(NutritionDaily.date == today).first()
        if not row:
            row = NutritionDaily(date=today)
            db.add(row)
        row.calories = calories
        row.protein_g = protein
        row.fat_g = fat
        row.carbs_g = carbs
        db.commit()

        # After nutrition input, send the daily insight message.
        send_daily_insight.delay()
        return {"status": "ok"}

    data = callback.get("data", "")
    if not data.startswith("rec:"):
        return {"status": "ignored"}
    try:
        _, rec_id, feedback = data.split(":", 2)
        rec_id_int = int(rec_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid callback data")

    exists = db.query(Recommendation).filter(Recommendation.id == rec_id_int).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    existing = (
        db.query(RecommendationFeedback)
        .filter(RecommendationFeedback.recommendation_id == rec_id_int)
        .first()
    )
    if existing:
        existing.feedback = feedback
    else:
        row = RecommendationFeedback(recommendation_id=rec_id_int, feedback=feedback)
        db.add(row)
    db.commit()
    return {"status": "ok"}
