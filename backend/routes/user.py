from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, exists
from typing import List
from ..database import get_db
from ..models import Video, Episode, VideoChunk
from ..schemas import (
    PaginatedVideos, Video as VideoSchema,
    VideoWithEpisodes, Episode as EpisodeSchema
)
from ..storage import telegram_storage
from ..utils.compression import build_chunks_param
from ..config import settings

router = APIRouter(prefix="/api", tags=["User"])


@router.get("/categories", response_model=List[str])
async def get_categories():
    """Get all predefined video categories"""
    categories = [
        "影视", "动漫", "音乐", "舞蹈", "游戏",
        "知识", "科技", "美食", "其他"
    ]
    return categories


@router.get("/videos", response_model=PaginatedVideos)
async def list_videos(
    page: int = 1,
    page_size: int = 20,
    category: str = "",
    search: str = "",
    include_empty: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Get paginated list of videos, optionally filtered by category and search keyword

    Args:
        include_empty: If False (default), only return videos that have at least one episode.
                      If True, return all videos including those without episodes.
    """
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20

    offset = (page - 1) * page_size

    # Build query with optional filters
    query = select(Video)

    # Filter out videos without episodes unless include_empty is True
    if not include_empty:
        # Use subquery to check if video has at least one episode with uploaded video chunks
        has_uploaded_episodes = exists(
            select(1)
            .select_from(Episode)
            .join(VideoChunk, VideoChunk.episode_id == Episode.id)
            .where(Episode.video_id == Video.id)
        )
        query = query.where(has_uploaded_episodes)

    if category:
        query = query.where(Video.category == category)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(Video.title.ilike(search_pattern))

    # Get total count
    count_result = await db.execute(
        select(func.count(Video.id)).select_from(
            query.subquery() if (category or search or not include_empty) else Video
        )
    )
    total = count_result.scalar()

    # Get videos
    result = await db.execute(
        query.order_by(Video.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    videos = result.scalars().all()

    return PaginatedVideos(
        total=total,
        page=page,
        page_size=page_size,
        videos=videos
    )


@router.get("/videos/{video_id}", response_model=VideoWithEpisodes)
async def get_video(video_id: int, include_empty: bool = False, db: AsyncSession = Depends(get_db)):
    """Get video information with episodes

    Args:
        include_empty: If False (default), only return episodes that have uploaded video chunks.
                      If True, return all episodes including those without video files.
    """
    result = await db.execute(
        select(Video).where(Video.id == video_id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Load episodes
    query = select(Episode).where(Episode.video_id == video_id)

    # Filter out episodes without video chunks unless include_empty is True
    if not include_empty:
        query = query.where(
            exists().where(VideoChunk.episode_id == Episode.id)
        )

    query = query.order_by(Episode.episode_number)
    episodes_result = await db.execute(query)
    episodes = episodes_result.scalars().all()

    # Build episodes with stream URLs
    episodes_with_urls = []
    for ep in episodes:
        stream_url = await _build_stream_url_for_episode(ep.id, db)
        episodes_with_urls.append(
            EpisodeSchema(
                id=ep.id,
                video_id=ep.video_id,
                episode_number=ep.episode_number,
                title=ep.title,
                duration=ep.duration,
                created_at=ep.created_at,
                stream_url=stream_url
            )
        )

    # Construct response manually to avoid lazy loading issues
    return VideoWithEpisodes(
        id=video.id,
        title=video.title,
        description=video.description,
        cover_url=video.cover_url,
        category=video.category,
        created_at=video.created_at,
        updated_at=video.updated_at,
        episodes=episodes_with_urls
    )


@router.get("/episodes/{episode_id}", response_model=EpisodeSchema)
async def get_episode(episode_id: int, db: AsyncSession = Depends(get_db)):
    """Get episode information with stream URL"""
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    # Build stream URL
    stream_url = await _build_stream_url_for_episode(episode_id, db)

    return EpisodeSchema(
        id=episode.id,
        video_id=episode.video_id,
        episode_number=episode.episode_number,
        title=episode.title,
        duration=episode.duration,
        created_at=episode.created_at,
        stream_url=stream_url
    )


async def _build_stream_url_for_episode(episode_id: int, db: AsyncSession) -> str:
    """
    Build streaming URL for an episode.
    Returns empty string if no chunks found.
    """
    # Get all chunks ordered by chunk_index
    chunks_result = await db.execute(
        select(VideoChunk)
        .where(VideoChunk.episode_id == episode_id)
        .order_by(VideoChunk.chunk_index)
    )
    chunks = chunks_result.scalars().all()

    if not chunks:
        return ""

    # Build chunks information
    chunks_info = [(chunk.file_id, chunk.chunk_size) for chunk in chunks]

    # Build compressed chunks parameter
    compressed_param = build_chunks_param(chunks_info, use_compression=True)

    # Build streaming URL
    storage_url = settings.AWSL_TELEGRAM_STORAGE_URL.rstrip('/')
    stream_url = f"{storage_url}/stream/video?chunks={compressed_param}"

    return stream_url


@router.get("/episodes/{episode_id}/stream-url")
async def get_episode_stream_url(episode_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get streaming URL for an episode.
    Returns the awsl-telegram-storage URL with compressed chunks parameter.

    The video player should use this URL directly without going through our backend.
    This reduces backend load and leverages awsl-telegram-storage's optimizations.
    """
    # Verify episode exists
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    # Get all chunks ordered by chunk_index
    chunks_result = await db.execute(
        select(VideoChunk)
        .where(VideoChunk.episode_id == episode_id)
        .order_by(VideoChunk.chunk_index)
    )
    chunks = chunks_result.scalars().all()

    if not chunks:
        raise HTTPException(status_code=404, detail="Video file not found")

    # Build chunks information
    chunks_info = [(chunk.file_id, chunk.chunk_size) for chunk in chunks]
    total_size = sum(size for _, size in chunks_info)

    # Build compressed chunks parameter
    compressed_param = build_chunks_param(chunks_info, use_compression=True)

    # Build streaming URL
    storage_url = settings.AWSL_TELEGRAM_STORAGE_URL.rstrip('/')
    stream_url = f"{storage_url}/stream/video?chunks={compressed_param}"

    return {
        "stream_url": stream_url,
        "total_size": total_size,
        "chunk_count": len(chunks)
    }


@router.get("/stream/{episode_id}")
async def stream_video(episode_id: int, db: AsyncSession = Depends(get_db)):
    """
    Legacy streaming endpoint that redirects to awsl-telegram-storage.
    This maintains backward compatibility with existing video players.
    """
    # Get stream URL
    stream_info = await get_episode_stream_url(episode_id, db)

    # Redirect to awsl-telegram-storage
    return RedirectResponse(url=stream_info["stream_url"], status_code=307)


@router.get("/cover/{file_id}")
async def get_cover(file_id: str):
    """
    Get cover image from Telegram storage.
    Public endpoint for both admin and user pages.
    """
    try:
        image_data = await telegram_storage.download_chunk(file_id)
        return StreamingResponse(
            iter([image_data]),
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=31536000",
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"Cover not found: {str(e)}"
        )
