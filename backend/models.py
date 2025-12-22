from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, UniqueConstraint, Index
from datetime import datetime
from .database import Base


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    cover_url = Column(String(500))
    category = Column(String(50), default="", index=True)  # 分区：动画、番剧、国创、音乐、舞蹈、游戏、知识、科技、运动、汽车、生活、美食、动物、鬼畜、时尚、娱乐、影视、纪录片等
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Episode(Base):
    __tablename__ = "episodes"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, nullable=False, index=True)
    episode_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    duration = Column(Integer)  # in seconds
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_video_episode', 'video_id', 'episode_number'),
    )


class VideoChunk(Base):
    __tablename__ = "video_chunks"

    id = Column(Integer, primary_key=True, index=True)
    episode_id = Column(Integer, nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)  # 0-based index
    file_id = Column(String(500), nullable=False)  # Telegram file_id
    chunk_size = Column(Integer, nullable=False)  # size in bytes

    __table_args__ = (
        Index('idx_episode_chunk', 'episode_id', 'chunk_index'),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    oauth_provider = Column(String(50), nullable=False)  # 'github' or 'linuxdo'
    oauth_id = Column(String(255), nullable=False)  # Unique ID from OAuth provider
    username = Column(String(255), nullable=False)
    name = Column(String(255))  # Display name
    avatar_url = Column(String(500))
    email = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)  # Admin user can manage videos
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('oauth_provider', 'oauth_id', name='unique_oauth_user'),
        Index('idx_username', 'username'),
    )


class WatchHistory(Base):
    __tablename__ = "watch_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    episode_id = Column(Integer, nullable=False, index=True)
    video_id = Column(Integer, nullable=False, index=True)  # Denormalized for easier queries
    last_watched = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('user_id', 'episode_id', name='unique_user_episode_history'),
        Index('idx_user_last_watched', 'user_id', 'last_watched'),
        Index('idx_video_user', 'video_id', 'user_id'),
    )


class VideoLike(Base):
    __tablename__ = "video_likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    video_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('user_id', 'video_id', name='unique_user_video_like'),
        Index('idx_video_like_created', 'video_id', 'created_at'),
    )


class VideoFavorite(Base):
    __tablename__ = "video_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    video_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('user_id', 'video_id', name='unique_user_video_favorite'),
        Index('idx_user_created', 'user_id', 'created_at'),
    )


class VideoShare(Base):
    __tablename__ = "video_shares"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    video_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('user_id', 'video_id', name='unique_user_video_share'),
        Index('idx_video_share_created', 'video_id', 'created_at'),
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    video_id = Column(Integer, nullable=False, index=True)
    parent_id = Column(Integer, nullable=True, index=True)  # For threaded replies
    content = Column(Text, nullable=False)
    is_deleted = Column(Boolean, default=False)  # Soft delete
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_video_comment_created', 'video_id', 'created_at'),
        Index('idx_parent_created', 'parent_id', 'created_at'),
        Index('idx_user_video', 'user_id', 'video_id'),
    )
