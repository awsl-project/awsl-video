from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, exists
from typing import AsyncGenerator, List
from ..database import get_db
from ..models import Video, Episode, VideoChunk
from ..schemas import (
    PaginatedVideos, Video as VideoSchema,
    VideoWithEpisodes, Episode as EpisodeSchema
)
from ..storage import telegram_storage
import re

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

    # Construct response manually to avoid lazy loading issues
    return VideoWithEpisodes(
        id=video.id,
        title=video.title,
        description=video.description,
        cover_url=video.cover_url,
        category=video.category,
        created_at=video.created_at,
        updated_at=video.updated_at,
        episodes=[
            EpisodeSchema(
                id=ep.id,
                video_id=ep.video_id,
                episode_number=ep.episode_number,
                title=ep.title,
                duration=ep.duration,
                created_at=ep.created_at
            ) for ep in episodes
        ]
    )


@router.get("/episodes/{episode_id}", response_model=EpisodeSchema)
async def get_episode(episode_id: int, db: AsyncSession = Depends(get_db)):
    """Get episode information"""
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    return episode


async def generate_video_stream(
    chunks: list,
    start: int = 0,
    end: int = None
) -> AsyncGenerator[bytes, None]:
    """
    Generate video stream from chunks with support for range requests.
    """
    current_pos = 0

    for chunk in chunks:
        chunk_start = current_pos
        chunk_end = current_pos + chunk.chunk_size - 1
        current_pos += chunk.chunk_size

        # Skip chunks before the requested start position
        if chunk_end < start:
            continue

        # Stop if we've passed the requested end position
        if end is not None and chunk_start > end:
            break

        # Download chunk from Telegram
        chunk_data = await telegram_storage.download_chunk(chunk.file_id)

        # Calculate the slice of this chunk to yield
        slice_start = max(0, start - chunk_start)
        slice_end = chunk.chunk_size if end is None else min(chunk.chunk_size, end - chunk_start + 1)

        if slice_start < len(chunk_data):
            yield chunk_data[slice_start:slice_end]


@router.get("/stream/{episode_id}")
async def stream_video(
    episode_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Stream video with support for range requests (for video seeking).
    Similar to the implementation in yunpan.
    """
    # Get episode and chunks
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

    # Calculate total file size
    total_size = sum(chunk.chunk_size for chunk in chunks)

    # Parse range header
    range_header = request.headers.get("range")
    start = 0
    end = total_size - 1
    status_code = 200

    if range_header:
        range_match = re.match(r"bytes=(\d*)-(\d*)", range_header)
        if range_match:
            start_str, end_str = range_match.groups()
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else total_size - 1
            status_code = 206

    content_length = end - start + 1

    headers = {
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
    }

    if status_code == 206:
        headers["Content-Range"] = f"bytes {start}-{end}/{total_size}"

    return StreamingResponse(
        generate_video_stream(chunks, start, end),
        status_code=status_code,
        headers=headers,
        media_type="video/mp4"
    )


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
