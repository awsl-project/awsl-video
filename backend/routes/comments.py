from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List
from ..database import get_db
from ..auth import get_current_user, get_current_user_required
from ..rate_limiter import check_daily_rate_limit
from ..schemas import (
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    CommentUser,
    PaginatedComments,
)
from .. import models

router = APIRouter()


def build_comment_tree(comments: List[models.Comment], users_dict: dict) -> List[CommentResponse]:
    """Build nested comment tree structure"""
    comment_dict = {}
    root_comments = []

    # First pass: create CommentResponse objects
    for comment in comments:
        user = users_dict.get(comment.user_id)
        if not user:
            continue  # Skip if user not found

        comment_response = CommentResponse(
            id=comment.id,
            user=CommentUser.from_orm(user),
            video_id=comment.video_id,
            parent_id=comment.parent_id,
            content=comment.content if not comment.is_deleted else "[此评论已删除]",
            is_deleted=comment.is_deleted,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            replies=[]
        )
        comment_dict[comment.id] = comment_response

        if comment.parent_id is None:
            root_comments.append(comment_response)

    # Second pass: build tree structure
    for comment in comments:
        if comment.parent_id and comment.parent_id in comment_dict:
            parent = comment_dict[comment.parent_id]
            child = comment_dict.get(comment.id)
            if child:
                parent.replies.append(child)

    return root_comments


@router.get("/videos/{video_id}/comments", response_model=PaginatedComments)
async def get_video_comments(
    video_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comments for a video (with pagination for root comments only)"""
    # Check if video exists
    video_result = await db.execute(
        select(models.Video).where(models.Video.id == video_id)
    )
    video = video_result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Get total count of root comments
    count_result = await db.execute(
        select(func.count(models.Comment.id)).where(
            models.Comment.video_id == video_id,
            models.Comment.parent_id.is_(None)
        )
    )
    total = count_result.scalar()

    # Get root comments with pagination
    offset = (page - 1) * page_size
    root_comments_result = await db.execute(
        select(models.Comment)
        .where(
            models.Comment.video_id == video_id,
            models.Comment.parent_id.is_(None)
        )
        .order_by(desc(models.Comment.created_at))
        .limit(page_size)
        .offset(offset)
    )
    root_comments = root_comments_result.scalars().all()

    # Get all replies for these root comments
    root_comment_ids = [c.id for c in root_comments]
    if root_comment_ids:
        replies_result = await db.execute(
            select(models.Comment)
            .where(models.Comment.parent_id.in_(root_comment_ids))
            .order_by(models.Comment.created_at)
        )
        replies = replies_result.scalars().all()
    else:
        replies = []

    # Build comment tree
    all_comments = list(root_comments) + list(replies)

    # Fetch all unique users for these comments
    user_ids = list(set(c.user_id for c in all_comments))
    if user_ids:
        users_result = await db.execute(
            select(models.User).where(models.User.id.in_(user_ids))
        )
        users = users_result.scalars().all()
        users_dict = {user.id: user for user in users}
    else:
        users_dict = {}

    comment_tree = build_comment_tree(all_comments, users_dict)

    return PaginatedComments(
        total=total,
        page=page,
        page_size=page_size,
        comments=comment_tree
    )


@router.post("/videos/{video_id}/comments", response_model=CommentResponse)
async def create_comment(
    video_id: int,
    comment_data: CommentCreate,
    current_user: models.User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """Create a new comment or reply"""
    # Check rate limit: max 100 comments per day
    await check_daily_rate_limit(db, current_user.id, models.Comment, 100, "评论")

    # Check if video exists
    video_result = await db.execute(
        select(models.Video).where(models.Video.id == video_id)
    )
    video = video_result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # If replying to a comment, check if parent exists
    if comment_data.parent_id:
        parent_result = await db.execute(
            select(models.Comment).where(
                models.Comment.id == comment_data.parent_id,
                models.Comment.video_id == video_id
            )
        )
        parent_comment = parent_result.scalar_one_or_none()

        if not parent_comment:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    # Create comment
    comment = models.Comment(
        user_id=current_user.id,
        video_id=video_id,
        parent_id=comment_data.parent_id,
        content=comment_data.content
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        user=CommentUser.from_orm(current_user),
        video_id=comment.video_id,
        parent_id=comment.parent_id,
        content=comment.content,
        is_deleted=comment.is_deleted,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=[]
    )


@router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    current_user: models.User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """Update a comment (only by the author)"""
    result = await db.execute(
        select(models.Comment).where(models.Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this comment")

    if comment.is_deleted:
        raise HTTPException(status_code=400, detail="Cannot update deleted comment")

    comment.content = comment_data.content
    await db.commit()
    await db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        user=CommentUser.from_orm(current_user),
        video_id=comment.video_id,
        parent_id=comment.parent_id,
        content=comment.content,
        is_deleted=comment.is_deleted,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=[]
    )


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    current_user: models.User = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a comment (only by the author)"""
    result = await db.execute(
        select(models.Comment).where(models.Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    # Soft delete
    comment.is_deleted = True
    comment.content = ""
    await db.commit()

    return {"message": "Comment deleted successfully"}
