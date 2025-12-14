from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
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

    episodes = relationship("Episode", back_populates="video", cascade="all, delete-orphan")


class Episode(Base):
    __tablename__ = "episodes"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    episode_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    duration = Column(Integer)  # in seconds
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("Video", back_populates="episodes")
    chunks = relationship("VideoChunk", back_populates="episode", cascade="all, delete-orphan")


class VideoChunk(Base):
    __tablename__ = "video_chunks"

    id = Column(Integer, primary_key=True, index=True)
    episode_id = Column(Integer, ForeignKey("episodes.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)  # 0-based index
    file_id = Column(String(500), nullable=False)  # Telegram file_id
    chunk_size = Column(Integer, nullable=False)  # size in bytes

    episode = relationship("Episode", back_populates="chunks")
