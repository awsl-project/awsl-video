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
    UploadResponse
)
from ..auth import get_current_admin
from ..storage import telegram_storage
import httpx

router = APIRouter(prefix="/admin-api", tags=["Admin"])


@router.post("/videos", response_model=VideoSchema)
async def create_video(
    video: VideoCreate,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new video"""
    db_video = Video(**video.model_dump())
    db.add(db_video)
    await db.commit()
    await db.refresh(db_video)
    return db_video


@router.get("/videos/{video_id}", response_model=VideoWithEpisodes)
async def get_video(
    video_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get video by ID with episodes"""
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
    current_admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update video information"""
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
    current_admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a video and all its episodes"""
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
    current_admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new episode for a video"""
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


@router.post("/episodes/{episode_id}/upload", response_model=UploadResponse)
async def upload_video_file(
    episode_id: int,
    file: UploadFile = File(...),
    current_admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload video file for an episode using streaming.
    The file will be split into 10MB chunks and stored in Telegram.
    """
    # Check if episode exists and get video info
    result = await db.execute(
        select(Episode).where(Episode.id == episode_id)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    # Get video info for filename formatting
    video_result = await db.execute(
        select(Video).where(Video.id == episode.video_id)
    )
    video = video_result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Format filename: {video_title}_EP{episode_number}
    # Clean title for filename (remove special characters)
    clean_title = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in video.title)
    base_filename = f"{clean_title}_EP{episode.episode_number}"

    # Delete existing chunks if any
    existing_chunks = (await db.execute(
        select(VideoChunk).where(VideoChunk.episode_id == episode_id)
    )).scalars().all()

    for chunk in existing_chunks:
        await db.delete(chunk)
    await db.commit()

    # Upload file in chunks using streaming
    try:
        chunks_info = []
        chunk_index = 0
        chunk_data = b""
        CHUNK_SIZE = 10 * 1024 * 1024  # 10MB

        # Stream file content
        while True:
            # Read in smaller pieces (1MB at a time) to avoid memory issues
            piece = await file.read(1024 * 1024)  # 1MB
            if not piece:
                # Upload remaining data if any
                if chunk_data:
                    chunk_filename = f"{base_filename}.part{chunk_index}"
                    file_id = await telegram_storage.upload_chunk(chunk_data, chunk_filename)

                    db_chunk = VideoChunk(
                        episode_id=episode_id,
                        chunk_index=chunk_index,
                        file_id=file_id,
                        chunk_size=len(chunk_data)
                    )
                    db.add(db_chunk)
                    chunks_info.append({
                        'chunk_index': chunk_index,
                        'file_id': file_id,
                        'chunk_size': len(chunk_data)
                    })
                break

            chunk_data += piece

            # If we've accumulated a full chunk, upload it
            while len(chunk_data) >= CHUNK_SIZE:
                # Extract one chunk
                current_chunk = chunk_data[:CHUNK_SIZE]
                chunk_data = chunk_data[CHUNK_SIZE:]

                # Upload chunk to Telegram with formatted filename
                chunk_filename = f"{base_filename}.part{chunk_index}"
                file_id = await telegram_storage.upload_chunk(current_chunk, chunk_filename)

                # Save to database immediately
                db_chunk = VideoChunk(
                    episode_id=episode_id,
                    chunk_index=chunk_index,
                    file_id=file_id,
                    chunk_size=len(current_chunk)
                )
                db.add(db_chunk)

                chunks_info.append({
                    'chunk_index': chunk_index,
                    'file_id': file_id,
                    'chunk_size': len(current_chunk)
                })

                chunk_index += 1

                # Commit after each chunk for progress tracking
                await db.commit()

        # Final commit
        await db.commit()

        return UploadResponse(
            episode_id=episode_id,
            message=f"Successfully uploaded {len(chunks_info)} chunks"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload video: {str(e)}"
        )


@router.put("/episodes/{episode_id}", response_model=EpisodeSchema)
async def update_episode(
    episode_id: int,
    episode_number: Optional[int] = None,
    title: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update episode information"""
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
    current_admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete an episode"""
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
    current_admin: dict = Depends(get_current_admin)
):
    """
    Upload cover image to Telegram storage.
    File size must be within 2MB.
    """
    # Check file size (2MB limit)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:  # 2MB
        raise HTTPException(
            status_code=400,
            detail="Cover image must be less than 2MB"
        )

    try:
        # Upload to Telegram
        file_id = await telegram_storage.upload_chunk(contents, file.filename or "cover.jpg")

        return {
            "success": True,
            "files": [{"file_id": file_id}]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload cover: {str(e)}"
        )


@router.post("/videos/{video_id}/cover")
async def upload_video_cover(
    video_id: int,
    cover: UploadFile = File(...),
    current_admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload and associate cover image with a specific video.
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

    try:
        # Upload to Telegram
        file_id = await telegram_storage.upload_chunk(contents, cover.filename or f"cover_{video_id}.jpg")

        # Construct cover URL using the public API endpoint
        cover_url = f"/api/cover/{file_id}"

        # Update video with cover URL
        video.cover_url = cover_url
        await db.commit()
        await db.refresh(video)

        return {
            "success": True,
            "cover_url": cover_url,
            "file_id": file_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload cover: {str(e)}"
        )
