from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from os import getenv

import httpx

from app.db.session import SessionLocal
from app.integrations.whoop_client import WhoopClient
from app.ml.pipeline import train_all_models
from app.models.goal import UserGoal
from app.models.recommendation import Recommendation, RecommendationFeedback
from app.models.whoop import WhoopDaily
from app.services.telegram import send_telegram_message
from app.services.whoop_oauth import force_refresh_token, get_valid_token
from app.workers.celery_app import celery_app


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def _date_range(start: date, end: date) -> list[date]:
    days = []
    current = start
    while current <= end:
        days.append(current)
        current += timedelta(days=1)
    return days


@celery_app.task
def sync_whoop() -> dict:
    db = SessionLocal()
    try:
        token_row = get_valid_token(db)
        if not token_row:
            return {"status": "unauthorized"}

        client = WhoopClient(token_row.access_token)

        def _fetch_all() -> dict:
            end_dt = datetime.now(timezone.utc)
            default_days = int(getenv("ATHLETICA_WHOOP_SYNC_DAYS", "7"))
            lookback_days = max(1, min(default_days, 30))
            last = db.query(WhoopDaily).order_by(WhoopDaily.date.desc()).first()
            if last:
                start_dt = datetime.combine(
                    last.date - timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc
                )
            else:
                start_dt = end_dt - timedelta(days=180)
            start_dt = min(start_dt, end_dt - timedelta(days=lookback_days))
            start = start_dt.isoformat().replace("+00:00", "Z")
            end = end_dt.isoformat().replace("+00:00", "Z")
            cycles = client.get_cycles(start=start, end=end)["records"]
            recoveries = client.get_recoveries(start=start, end=end)["records"]
            sleeps = client.get_sleeps(start=start, end=end)["records"]
            workouts = client.get_workouts(start=start, end=end)["records"]
            body = client.get_body_measurement()
            return {
                "cycles": cycles,
                "recoveries": recoveries,
                "sleeps": sleeps,
                "workouts": workouts,
                "body": body,
                "start_date": start_dt.date(),
                "end_date": end_dt.date(),
            }

        try:
            payload = _fetch_all()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 401:
                refreshed = force_refresh_token(db)
                if not refreshed:
                    return {"status": "unauthorized"}
                client = WhoopClient(refreshed.access_token)
                payload = _fetch_all()
                return _ingest_whoop(db, payload)
            raise
        return _ingest_whoop(db, payload)
    except httpx.RequestError as exc:
        raise sync_whoop.retry(exc=exc, countdown=30, max_retries=5)
    except httpx.HTTPStatusError as exc:
        raise sync_whoop.retry(exc=exc, countdown=60, max_retries=3)
    finally:
        db.close()


@celery_app.task
def train_models() -> dict:
    return train_all_models()


def _format_goal_progress(goal: UserGoal | None) -> str:
    if not goal:
        return "No active goal"
    return goal.goal_type.capitalize()


def _format_reason(explanation: dict | None) -> str:
    if not explanation:
        return ""
    reasons = explanation.get("reasons") if isinstance(explanation, dict) else None
    if not reasons:
        return ""
    lines = "\n".join([f"• {r}" for r in reasons[:3]])
    return f"\nReason:\n{lines}"


@celery_app.task
def send_daily_insight() -> dict:
    db = SessionLocal()
    try:
        today = datetime.now(timezone.utc).date()
        whoop = (
            db.query(WhoopDaily)
            .filter(
                WhoopDaily.missing_flag.is_(False),
                WhoopDaily.recovery_score.isnot(None),
            )
            .order_by(WhoopDaily.date.desc())
            .first()
        )
        goal = db.query(UserGoal).filter(UserGoal.is_active.is_(True)).first()
        rec = (
            db.query(Recommendation)
            .order_by(Recommendation.date.desc(), Recommendation.id.desc())
            .first()
        )

        sleep_hours = (
            round((whoop.sleep_duration_minutes or 0) / 60, 1) if whoop else None
        )
        recovery = int(whoop.recovery_score) if whoop and whoop.recovery_score else None
        strain = round(whoop.strain, 1) if whoop and whoop.strain else None
        hrv = int(whoop.hrv) if whoop and whoop.hrv else None
        resting_hr = (
            int(whoop.resting_heart_rate)
            if whoop and whoop.resting_heart_rate
            else None
        )

        message = "📊 Daily Insight\n\n"
        message += f"Goal Progress: {_format_goal_progress(goal)}\n"
        if whoop:
            message += f"Last Whoop Day: {whoop.date}\n"
        message += (
            f"Recovery Score: {recovery} / 100\n" if recovery is not None else ""
        )
        if sleep_hours is not None:
            message += f"Sleep: {sleep_hours}h\n"
        if strain is not None:
            message += f"Strain: {strain}\n"
        if hrv is not None:
            message += f"HRV: {hrv} ms\n"
        if resting_hr is not None:
            message += f"Resting HR: {resting_hr} bpm\n"

        if rec:
            message += "\n⚠ Recommendation:\n"
            message += f"{rec.message}\n"
            message += _format_reason(rec.explanation_json)
        else:
            message += "\n✅ Recommendation:\nKeep current plan today."

        reply_markup = None
        if rec:
            reply_markup = {
                "inline_keyboard": [
                    [
                        {"text": "👍 Accept", "callback_data": f"rec:{rec.id}:accepted"},
                        {"text": "👎 Ignore", "callback_data": f"rec:{rec.id}:ignored"},
                    ]
                ]
            }

        result = send_telegram_message(message, reply_markup=reply_markup)
        return {"status": "ok", "date": str(today), "telegram": result.get("status")}
    finally:
        db.close()

def _ingest_whoop(db: SessionLocal, payload: dict) -> dict:
    cycles = payload["cycles"]
    recoveries = payload["recoveries"]
    sleeps = payload["sleeps"]
    workouts = payload["workouts"]
    body = payload["body"]
    start_date = payload["start_date"]
    end_date = payload["end_date"]

    by_date: dict[date, dict] = {}

    for cycle in cycles:
        day = _parse_date(cycle.get("start"))
        if not day:
            continue
        score = cycle.get("score") or {}
        by_date.setdefault(day, {})
        by_date[day]["strain"] = score.get("strain")
        by_date[day]["cycle_json"] = cycle

    for rec in recoveries:
        day = _parse_date(rec.get("created_at")) or _parse_date(rec.get("updated_at"))
        if not day:
            continue
        score = rec.get("score") or {}
        by_date.setdefault(day, {})
        by_date[day]["hrv"] = score.get("hrv_rmssd_milli")
        by_date[day]["resting_heart_rate"] = score.get("resting_heart_rate")
        by_date[day]["recovery_score"] = score.get("recovery_score")
        by_date[day]["recovery_json"] = rec

    for sleep in sleeps:
        day = _parse_date(sleep.get("start")) or _parse_date(sleep.get("created_at"))
        if not day:
            continue
        score = sleep.get("score") or {}
        stage_summary = (score.get("stage_summary") or {})
        duration_milli = stage_summary.get("total_in_bed_time_milli")
        by_date.setdefault(day, {})
        by_date[day]["sleep_duration_minutes"] = (
            int(duration_milli / 60000) if duration_milli else None
        )
        by_date[day]["sleep_efficiency"] = score.get("sleep_efficiency_percentage")
        by_date[day]["sleep_stages_json"] = stage_summary or None
        by_date[day]["sleep_json"] = sleep

    for workout in workouts:
        day = _parse_date(workout.get("start")) or _parse_date(workout.get("created_at"))
        if not day:
            continue
        by_date.setdefault(day, {})
        items = by_date[day].setdefault("workout_json", [])
        items.append(workout)

    body_weight = body.get("weight_kilogram") if isinstance(body, dict) else None
    if body_weight is not None:
        by_date.setdefault(end_date, {})
        by_date[end_date]["body_weight_kg"] = body_weight

    for day in _date_range(start_date, end_date):
        row = db.query(WhoopDaily).filter(WhoopDaily.date == day).first()
        data = by_date.get(day)
        if not row:
            row = WhoopDaily(date=day)
            db.add(row)
        if data:
            row.hrv = data.get("hrv")
            row.resting_heart_rate = data.get("resting_heart_rate")
            row.recovery_score = data.get("recovery_score")
            row.strain = data.get("strain")
            row.sleep_duration_minutes = data.get("sleep_duration_minutes")
            row.sleep_efficiency = data.get("sleep_efficiency")
            row.sleep_stages_json = data.get("sleep_stages_json")
            row.sleep_json = data.get("sleep_json")
            row.recovery_json = data.get("recovery_json")
            row.cycle_json = data.get("cycle_json")
            row.workout_json = data.get("workout_json")
            row.body_weight_kg = data.get("body_weight_kg")
            row.missing_flag = False
        else:
            row.missing_flag = True

    db.commit()
    return {"status": "ok", "days": (end_date - start_date).days + 1}
