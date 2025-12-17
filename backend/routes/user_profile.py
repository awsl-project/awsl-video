from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List
import logging
from ..database import get_db
from ..auth import get_current_user, get_current_user_required
from ..rate_limiter import check_daily_rate_limit, cleanup_old_watch_history
from ..schemas import (
    UserProfile,
    WatchHistoryRecord,
    WatchHistoryResponse,
    FavoriteResponse,
    FavoriteVideoResponse,
    LikeResponse,
    Video as VideoSchema,
    Episode as EpisodeSchema,
)
from .. import models

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: models.User = Depends(get_current_user_required)
):
    """Get current user profile"""
    return UserProfile.from_orm(current_user)


@router.get("/history", response_model=List[WatchHistoryResponse])
async def get_watch_history(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: models.User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """Get user's watch history"""
    result = await db.execute(
        select(models.WatchHistory)
        .where(models.WatchHistory.user_id == current_user.id)
        .order_by(desc(models.WatchHistory.last_watched))
        .limit(limit)
        .offset(offset)
    )
    history = result.scalars().all()

    if not history:
        return []

    # Fetch related videos and episodes
    video_ids = list(set(h.video_id for h in history))
    episode_ids = list(set(h.episode_id for h in history))

    videos_result = await db.execute(
        select(models.Video).where(models.Video.id.in_(video_ids))
    )
    videos = videos_result.scalars().all()
    videos_dict = {v.id: v for v in videos}

    episodes_result = await db.execute(
        select(models.Episode).where(models.Episode.id.in_(episode_ids))
    )
    episodes = episodes_result.scalars().all()
    episodes_dict = {e.id: e for e in episodes}

    # Build response
    return [
        WatchHistoryResponse(
            id=h.id,
            episode_id=h.episode_id,
            video_id=h.video_id,
            last_watched=h.last_watched,
            video=VideoSchema.from_orm(videos_dict[h.video_id]),
            episode=EpisodeSchema.from_orm(episodes_dict[h.episode_id])
        )
        for h in history
        if h.video_id in videos_dict and h.episode_id in episodes_dict
    ]


@router.post("/history", response_model=WatchHistoryResponse)
async def record_watch_history(
    history_data: WatchHistoryRecord,
    current_user: models.User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """Record watch history for an episode"""
    # Get episode to extract video_id
    episode_result = await db.execute(
        select(models.Episode).where(models.Episode.id == history_data.episode_id)
    )
    episode = episode_result.scalar_one_or_none()

    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    # Get video
    video_result = await db.execute(
        select(models.Video).where(models.Video.id == episode.video_id)
    )
    video = video_result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Check if history record exists
    result = await db.execute(
        select(models.WatchHistory).where(
            models.WatchHistory.user_id == current_user.id,
            models.WatchHistory.episode_id == history_data.episode_id
        )
    )
    history = result.scalar_one_or_none()

    if history:
        # Update last_watched time only (record is auto-updated via onupdate)
        pass
    else:
        # Create new record
        history = models.WatchHistory(
            user_id=current_user.id,
            episode_id=history_data.episode_id,
            video_id=episode.video_id
        )
        db.add(history)

    await db.commit()
    await db.refresh(history)

    # Cleanup old history records (keep only 100 most recent)
    try:
        await cleanup_old_watch_history(db, current_user.id, 100)
        await db.commit()
    except Exception as e:
        # Log but don't fail the request if cleanup fails
        logger.warning(f"Failed to cleanup old history for user {current_user.id}: {e}")

    # Build response with video and episode data
    return WatchHistoryResponse(
        id=history.id,
        episode_id=history.episode_id,
        video_id=history.video_id,
        last_watched=history.last_watched,
        video=VideoSchema.from_orm(video),
        episode=EpisodeSchema.from_orm(episode)
    )


@router.get("/favorites", response_model=List[FavoriteVideoResponse])
async def get_user_favorites(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: models.User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """Get user's favorite videos"""
    result = await db.execute(
        select(models.VideoFavorite)
        .where(models.VideoFavorite.user_id == current_user.id)
        .order_by(desc(models.VideoFavorite.created_at))
        .limit(limit)
        .offset(offset)
    )
    favorites = result.scalars().all()

    # Fetch related videos
    if favorites:
        video_ids = [f.video_id for f in favorites]
        videos_result = await db.execute(
            select(models.Video).where(models.Video.id.in_(video_ids))
        )
        videos = videos_result.scalars().all()
        videos_dict = {v.id: v for v in videos}

        # Build response with video data
        return [
            FavoriteVideoResponse(
                id=f.id,
                video=VideoSchema.from_orm(videos_dict[f.video_id]),
                created_at=f.created_at
            )
            for f in favorites
            if f.video_id in videos_dict
        ]
    else:
        return []


@router.post("/videos/{video_id}/favorite", response_model=FavoriteResponse)
async def toggle_favorite(
    video_id: int,
    current_user: models.User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """Toggle favorite status for a video"""
    # Check if video exists
    video_result = await db.execute(
        select(models.Video).where(models.Video.id == video_id)
    )
    video = video_result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Check if already favorited
    result = await db.execute(
        select(models.VideoFavorite).where(
            models.VideoFavorite.user_id == current_user.id,
            models.VideoFavorite.video_id == video_id
        )
    )
    favorite = result.scalar_one_or_none()

    if favorite:
        # Remove favorite
        await db.delete(favorite)
        await db.commit()
        return FavoriteResponse(favorited=False)
    else:
        # Check rate limit before adding: max 100 favorites per day
        await check_daily_rate_limit(db, current_user.id, models.VideoFavorite, 100, "收藏")

        # Add favorite
        favorite = models.VideoFavorite(
            user_id=current_user.id,
            video_id=video_id
        )
        db.add(favorite)
        await db.commit()
        return FavoriteResponse(favorited=True)


@router.post("/videos/{video_id}/like", response_model=LikeResponse)
async def toggle_like(
    video_id: int,
    current_user: models.User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """Toggle like status for a video"""
    # Check if video exists
    video_result = await db.execute(
        select(models.Video).where(models.Video.id == video_id)
    )
    video = video_result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Check if already liked
    result = await db.execute(
        select(models.VideoLike).where(
            models.VideoLike.user_id == current_user.id,
            models.VideoLike.video_id == video_id
        )
    )
    like = result.scalar_one_or_none()

    if like:
        # Remove like
        await db.delete(like)
        await db.commit()
        liked = False
    else:
        # Check rate limit before adding: max 100 likes per day
        await check_daily_rate_limit(db, current_user.id, models.VideoLike, 100, "点赞")

        # Add like
        like = models.VideoLike(
            user_id=current_user.id,
            video_id=video_id
        )
        db.add(like)
        await db.commit()
        liked = True

    # Get total likes count
    count_result = await db.execute(
        select(func.count(models.VideoLike.id)).where(
            models.VideoLike.video_id == video_id
        )
    )
    total_likes = count_result.scalar()

    return LikeResponse(liked=liked, total_likes=total_likes)


@router.post("/videos/{video_id}/share")
async def record_share(
    video_id: int,
    current_user: models.User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """Record a video share (idempotent - one share per user per video)"""
    # Check if video exists
    video_result = await db.execute(
        select(models.Video).where(models.Video.id == video_id)
    )
    video = video_result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Check if already shared
    result = await db.execute(
        select(models.VideoShare).where(
            models.VideoShare.user_id == current_user.id,
            models.VideoShare.video_id == video_id
        )
    )
    share = result.scalar_one_or_none()

    if not share:
        # Add share record
        share = models.VideoShare(
            user_id=current_user.id,
            video_id=video_id
        )
        db.add(share)
        await db.commit()

    # Get total shares count
    count_result = await db.execute(
        select(func.count(models.VideoShare.id)).where(
            models.VideoShare.video_id == video_id
        )
    )
    total_shares = count_result.scalar()

    return {"message": "Share recorded", "total_shares": total_shares}

