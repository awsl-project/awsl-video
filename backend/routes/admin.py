from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from ..database import get_db
from ..models import Video, Episode, VideoChunk
from ..schemas import (
    VideoCreate, VideoUpdate, Video as VideoSchema,
    VideoWithEpisodes, EpisodeCreate, Episode as EpisodeSchema,
    UploadResponse, FinalizeVideoUploadRequest,
    UserListItem, PaginatedUsers, UpdateUserAdminRequest
)
from ..auth import get_current_admin, get_any_admin
from ..models import User
from ..storage import telegram_storage
from ..config import settings
import httpx
import logging
import traceback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin-api", tags=["Admin"])


@router.post("/videos", response_model=VideoSchema)
async def create_video(
    video: VideoCreate,
    current_admin = Depends(get_any_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new video (accessible to super admin and OAuth admin)"""
    db_video = Video(**video.model_dump())
    db.add(db_video)
    await db.commit()
    await db.refresh(db_video)
    return db_video


@router.get("/videos/{video_id}", response_model=VideoWithEpisodes)
async def get_video(
    video_id: int,
    current_admin = Depends(get_any_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get video by ID with episodes (accessible to super admin and OAuth admin)"""
    result = await db.execute(
        select(Video).where(Video.id == video_id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Load episodes
    episodes_result = await db.execute(
        select(Episode).where(Episode.video_id == video_id).order_by(Episode.episode_number)
    )
    video.episodes = episodes_result.scalars().all()

    return video


@router.put("/videos/{video_id}", response_model=VideoSchema)
async def update_video(
    video_id: int,
    video_update: VideoUpdate,
    current_admin = Depends(get_any_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update video information (accessible to super admin and OAuth admin)"""
    result = await db.execute(
        select(Video).where(Video.id == video_id)
    )
    db_video = result.scalar_one_or_none()
    if not db_video:
        raise HTTPException(status_code=404, detail="Video not found")

    update_data = video_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_video, field, value)

    await db.commit()
    await db.refresh(db_video)
    return db_video


@router.delete("/videos/{video_id}")
async def delete_video(
    video_id: int,
    current_admin = Depends(get_any_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a video and all its episodes (accessible to super admin and OAuth admin)"""
    result = await db.execute(
        select(Video).where(Video.id == video_id)
    )
    db_video = result.scalar_one_or_none()
    if not db_video:
        raise HTTPException(status_code=404, detail="Video not found")

    await db.delete(db_video)
    await db.commit()
    return {"message": "Video deleted successfully"}


@router.post("/videos/{video_id}/episodes", response_model=EpisodeSchema)
async def create_episode(
    video_id: int,
    episode: EpisodeCreate,
    current_admin = Depends(get_any_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new episode for a video (accessible to super admin and OAuth admin)"""
    # Check if video exists
    result = await db.execute(
        select(Video).where(Video.id == video_id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    db_episode = Episode(**episode.model_dump(), video_id=video_id)
    db.add(db_episode)
    await db.commit()
    await db.refresh(db_episode)
    return db_episode


@router.put("/episodes/{episode_id}", response_model=EpisodeSchema)
async def update_episode(
    episode_id: int,
    episode_number: Optional[int] = None,
    title: Optional[str] = None,
    current_admin = Depends(get_any_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update episode information (accessible to super admin and OAuth admin)"""
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    if episode_number is not None:
        episode.episode_number = episode_number
    if title is not None:
        episode.title = title

    await db.commit()
    await db.refresh(episode)
    return episode


@router.delete("/episodes/{episode_id}")
async def delete_episode(
    episode_id: int,
    current_admin = Depends(get_any_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete an episode (accessible to super admin and OAuth admin)"""
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    await db.delete(episode)
    await db.commit()
    return {"message": "Episode deleted successfully"}


@router.post("/upload-cover")
async def upload_cover(
    file: UploadFile = File(...),
    media_type: str = Form("photo"),
    current_admin = Depends(get_any_admin)
):
    """
    Upload cover image to Telegram storage (accessible to super admin and OAuth admin).
    File size must be within 2MB.
    """
    # Check file size (2MB limit)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:  # 2MB
        raise HTTPException(
            status_code=400,
            detail="Cover image must be less than 2MB"
        )

    # Upload to Telegram
    file_id = await telegram_storage.upload_chunk(contents, file.filename or "cover.jpg")

    return {
        "success": True,
        "files": [{"file_id": file_id}]
    }


@router.post("/videos/{video_id}/cover")
async def upload_video_cover(
    video_id: int,
    cover: UploadFile = File(...),
    current_admin = Depends(get_any_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload and associate cover image with a specific video (accessible to super admin and OAuth admin).
    File size must be within 2MB.
    """
    # Check if video exists
    result = await db.execute(
        select(Video).where(Video.id == video_id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Check file size (2MB limit)
    contents = await cover.read()
    if len(contents) > 2 * 1024 * 1024:  # 2MB
        raise HTTPException(
            status_code=400,
            detail="Cover image must be less than 2MB"
        )

    # Upload to Telegram
    file_id = await telegram_storage.upload_chunk(contents, cover.filename or f"cover_{video_id}.jpg")

    # Construct cover URL using awsl-telegram-storage download endpoint
    storage_url = settings.AWSL_TELEGRAM_STORAGE_URL.rstrip('/')
    cover_url = f"{storage_url}/file/{file_id}"

    # Update video with cover URL
    video.cover_url = cover_url
    await db.commit()
    await db.refresh(video)

    return {
        "success": True,
        "cover_url": cover_url,
        "file_id": file_id
    }


@router.get("/upload/token")
async def generate_upload_token(
    current_admin = Depends(get_any_admin)
):
    """
    Generate a temporary JWT token for direct upload to awsl-telegram-storage (accessible to super admin and OAuth admin).
    Token expires in 1 hour (3600 seconds).
    Uses CHAT_ID from environment configuration.

    Returns:
        JWT token, expires_in, expires_at, chat_id, and storage_url
    """
    # Fixed 1 hour expiry
    expires_in = 3600
    chat_id = settings.AWSL_TELEGRAM_CHAT_ID

    # Call awsl-telegram-storage to generate JWT token
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.AWSL_TELEGRAM_STORAGE_URL}/api/token/generate",
            headers={
                "X-Api-Token": settings.AWSL_TELEGRAM_API_TOKEN,
                "Content-Type": "application/json"
            },
            json={"expires_in": expires_in, "chat_id": chat_id}
        )

        response.raise_for_status()
        result = response.json()

        if not result.get('success'):
            logger.error(f"Token generation failed: {result}")
            raise HTTPException(
                status_code=500,
                detail="Failed to generate upload token"
            )

        return {
            "success": True,
            "token": result['token'],
            "expires_in": result['expires_in'],
            "expires_at": result['expires_at'],
            "chat_id": chat_id,
            "storage_url": settings.AWSL_TELEGRAM_STORAGE_URL
        }


@router.post("/episodes/{episode_id}/upload/finalize")
async def finalize_episode_upload(
    episode_id: int,
    request: FinalizeVideoUploadRequest,
    current_admin = Depends(get_any_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Finalize video upload by storing chunk information after frontend direct upload (accessible to super admin and OAuth admin).

    Args:
        episode_id: Episode ID
        request: Finalize request containing chunks information

    Returns:
        Success message with chunk count
    """
    # Check if episode exists
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    # Delete existing chunks if any
    existing_chunks = (await db.execute(
        select(VideoChunk).where(VideoChunk.episode_id == episode_id)
    )).scalars().all()

    for chunk in existing_chunks:
        await db.delete(chunk)
    await db.commit()

    # Save new chunks
    for chunk_info in request.chunks:
        db_chunk = VideoChunk(
            episode_id=episode_id,
            chunk_index=chunk_info.chunk_index,
            file_id=chunk_info.file_id,
            chunk_size=chunk_info.file_size or chunk_info.chunk_size or 0
        )
        db.add(db_chunk)

    await db.commit()

    return {
        "success": True,
        "message": f"Successfully saved {len(request.chunks)} chunks",
        "episode_id": episode_id,
        "chunks_count": len(request.chunks)
    }


# User Management APIs (Super Admin Only)
@router.get("/users", response_model=PaginatedUsers)
async def list_users(
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    current_admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all users with pagination and search.
    Only accessible to super admin (fixed password login).
    """
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20

    offset = (page - 1) * page_size

    # Build query
    query = select(User)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (User.username.ilike(search_pattern)) |
            (User.name.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar()

    # Get users
    query = query.order_by(User.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedUsers(
        total=total,
        page=page,
        page_size=page_size,
        users=[UserListItem.from_orm(user) for user in users]
    )


@router.post("/users/{user_id}/admin")
async def grant_admin(
    user_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Grant admin rights to a user.
    Only accessible to super admin (fixed password login).
    """
    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Grant admin rights
    user.is_admin = True
    await db.commit()
    await db.refresh(user)

    return {
        "success": True,
        "message": f"Admin rights granted to {user.username}",
        "user": UserListItem.from_orm(user)
    }


@router.delete("/users/{user_id}/admin")
async def revoke_admin(
    user_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke admin rights from a user.
    Only accessible to super admin (fixed password login).
    """
    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Revoke admin rights
    user.is_admin = False
    await db.commit()
    await db.refresh(user)

    return {
        "success": True,
        "message": f"Admin rights revoked from {user.username}",
        "user": UserListItem.from_orm(user)
    }
