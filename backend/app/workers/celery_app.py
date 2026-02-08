from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "athletica",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)
celery_app.conf.task_routes = {
    "app.workers.tasks.sync_whoop": {"queue": "whoop"},
    "app.workers.tasks.train_models": {"queue": "ml"},
    "app.workers.tasks.send_daily_insight": {"queue": "ml"},
}
celery_app.conf.timezone = "Europe/Moscow"
celery_app.conf.enable_utc = False
celery_app.conf.beat_schedule = {
    "hourly-whoop-sync": {
        "task": "app.workers.tasks.sync_whoop",
        "schedule": crontab(minute=0),
    },
    "daily-telegram-nutrition-prompt": {
        "task": "app.workers.tasks.send_nutrition_prompt",
        "schedule": crontab(hour=11, minute=0),
    },
}
