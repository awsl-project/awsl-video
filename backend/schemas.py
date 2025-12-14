from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Video Schemas
class EpisodeBase(BaseModel):
    episode_number: int
    title: str
    duration: Optional[int] = None

class EpisodeCreate(EpisodeBase):
    pass

class Episode(EpisodeBase):
    id: int
    video_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class VideoBase(BaseModel):
    title: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    category: Optional[str] = ""

class VideoCreate(VideoBase):
    pass

class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    category: Optional[str] = None

class Video(VideoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class VideoWithEpisodes(Video):
    episodes: List[Episode] = []

# Pagination
class PaginatedVideos(BaseModel):
    total: int
    page: int
    page_size: int
    videos: List[Video]

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str
    password: str

# Upload Schemas
class UploadResponse(BaseModel):
    episode_id: int
    message: str
