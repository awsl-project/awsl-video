from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, delete
from datetime import datetime, timedelta
from fastapi import HTTPException
from . import models


async def check_daily_rate_limit(
    db: AsyncSession,
    user_id: int,
    model: type,
    limit: int = 100,
    action_name: str = "操作"
) -> None:
    """
    Check if user has exceeded daily rate limit for a specific action.

    Args:
        db: Database session
        user_id: User ID
        model: SQLAlchemy model to check (Comment, VideoLike, VideoFavorite)
        limit: Maximum actions per day (default: 100)
        action_name: Action name for error message

    Raises:
        HTTPException: If rate limit is exceeded
    """
    # Get start of today (UTC)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Count actions today
    result = await db.execute(
        select(func.count(model.id)).where(
            and_(
                model.user_id == user_id,
                model.created_at >= today_start
            )
        )
    )
    count = result.scalar()

    if count >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"已达到每日{action_name}限制（{limit}次），请明天再试"
        )


async def cleanup_old_watch_history(
    db: AsyncSession,
    user_id: int,
    keep_count: int = 100
) -> None:
    """
    Keep only the most recent watch history records for a user.

    Args:
        db: Database session
        user_id: User ID
        keep_count: Number of records to keep (default: 100)
    """
    # Get total count
    count_result = await db.execute(
        select(func.count(models.WatchHistory.id)).where(
            models.WatchHistory.user_id == user_id
        )
    )
    total_count = count_result.scalar()

    # If we have more than keep_count records, delete the oldest ones
    if total_count > keep_count:
        # Get the last_watched timestamp of the keep_count-th most recent record
        subquery_result = await db.execute(
            select(models.WatchHistory.last_watched)
            .where(models.WatchHistory.user_id == user_id)
            .order_by(models.WatchHistory.last_watched.desc())
            .limit(1)
            .offset(keep_count - 1)
        )
        cutoff_time = subquery_result.scalar()

        if cutoff_time:
            # Delete records older than the cutoff
            await db.execute(
                delete(models.WatchHistory).where(
                    and_(
                        models.WatchHistory.user_id == user_id,
                        models.WatchHistory.last_watched < cutoff_time
                    )
                )
            )

