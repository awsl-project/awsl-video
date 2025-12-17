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
    stream_url: Optional[str] = None

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


# OAuth Schemas
class OAuthCallbackRequest(BaseModel):
    code: str
    provider: str  # 'github' or 'linuxdo'


class UserToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserProfile"


# User Schemas
class UserBase(BaseModel):
    username: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserProfile(UserBase):
    id: int
    oauth_provider: str
    email: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login: datetime

    class Config:
        from_attributes = True


# Watch History Schemas
class WatchHistoryRecord(BaseModel):
    episode_id: int


class WatchHistoryResponse(BaseModel):
    id: int
    episode_id: int
    video_id: int
    last_watched: datetime
    video: Video
    episode: Episode

    class Config:
        from_attributes = True


# Like Schemas
class LikeResponse(BaseModel):
    liked: bool
    total_likes: int


# Favorite Schemas
class FavoriteResponse(BaseModel):
    favorited: bool


class FavoriteVideoResponse(BaseModel):
    id: int
    video: Video
    created_at: datetime

    class Config:
        from_attributes = True


# Comment Schemas
class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None


class CommentUpdate(BaseModel):
    content: str


class CommentUser(BaseModel):
    id: int
    username: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class CommentResponse(BaseModel):
    id: int
    user: CommentUser
    video_id: int
    parent_id: Optional[int] = None
    content: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    replies: List["CommentResponse"] = []

    class Config:
        from_attributes = True


class PaginatedComments(BaseModel):
    total: int
    page: int
    page_size: int
    comments: List[CommentResponse]


# Stats Schemas
class VideoStats(BaseModel):
    likes_count: int
    favorites_count: int
    shares_count: int
    comments_count: int
    user_liked: bool = False
    user_favorited: bool = False
