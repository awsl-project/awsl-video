import { useState, useEffect } from 'react';
import { Send, Loader2, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { userApi } from '@/api';
import type { Comment, PaginatedComments } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface VideoCommentsProps {
  videoId: number;
}

export function VideoComments({ videoId }: VideoCommentsProps) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<PaginatedComments | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const response = await userApi.getComments(videoId);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast({
        title: '需要登录',
        description: '请先登录才能发表评论',
      });
      sessionStorage.setItem('intended_path', window.location.pathname);
      navigate('/login');
      return;
    }

    if (!newComment.trim()) {
      toast({
        variant: 'destructive',
        title: '评论不能为空',
      });
      return;
    }

    setSubmitting(true);
    try {
      await userApi.createComment(videoId, newComment, replyTo || undefined);
      setNewComment('');
      setReplyTo(null);
      await loadComments();
      toast({
        title: '评论成功',
        description: '您的评论已发表',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '评论失败',
        description: error.response?.data?.detail || '发表评论失败，请重试',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (commentId: number) => {
    setCommentToDelete(commentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!commentToDelete) return;

    setDeleting(true);
    try {
      await userApi.deleteComment(commentToDelete);
      await loadComments();
      toast({
        title: '删除成功',
        description: '评论已删除',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: error.response?.data?.detail || '删除评论失败，请重试',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    }
  };

  const renderComment = (comment: Comment, level = 0) => {
    const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
      addSuffix: true,
      locale: zhCN,
    });

    const getInitial = (name: string) => {
      return name.charAt(0).toUpperCase();
    };

    // 根评论
    if (level === 0) {
      return (
        <Card key={comment.id} className="p-4 hover:shadow-md transition-shadow mb-4">
          {/* 主评论 */}
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              {comment.user.avatar_url && (
                <AvatarImage
                  src={comment.user.avatar_url}
                  alt={comment.user.name || comment.user.username}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-pink-600 text-white font-semibold">
                {getInitial(comment.user.name || comment.user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{comment.user.name || comment.user.username}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>
                {!comment.is_deleted && user && user.id === comment.user.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(comment.id)}
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除评论
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {comment.is_deleted ? (
                <p className="text-sm text-muted-foreground italic">[此评论已删除]</p>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!isAuthenticated) {
                        toast({ title: '需要登录', description: '请先登录才能回复评论' });
                        navigate('/login');
                        return;
                      }
                      setReplyTo(comment.id);
                    }}
                    className="text-primary hover:text-primary/80 font-medium h-7 px-2 text-xs"
                  >
                    回复
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 回复列表 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 ml-[52px] space-y-3 pl-4 border-l-2 border-muted">
              {comment.replies.map((reply) => renderComment(reply, level + 1))}
            </div>
          )}
        </Card>
      );
    }

    // 回复评论（在同一个卡片内）
    return (
      <div key={comment.id} className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          {comment.user.avatar_url && (
            <AvatarImage
              src={comment.user.avatar_url}
              alt={comment.user.name || comment.user.username}
              className="object-cover"
            />
          )}
          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white font-semibold text-xs">
            {getInitial(comment.user.name || comment.user.username)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs">{comment.user.name || comment.user.username}</span>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
            {!comment.is_deleted && user && user.id === comment.user.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(comment.id)}
                    className="text-red-600 focus:text-red-600 cursor-pointer text-xs"
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    删除评论
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {comment.is_deleted ? (
            <p className="text-xs text-muted-foreground italic">[此评论已删除]</p>
          ) : (
            <>
              <p className="text-xs whitespace-pre-wrap break-words">{comment.content}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!isAuthenticated) {
                    toast({ title: '需要登录', description: '请先登录才能回复评论' });
                    navigate('/login');
                    return;
                  }
                  setReplyTo(comment.id);
                }}
                className="text-primary hover:text-primary/80 font-medium h-6 px-2 text-xs"
              >
                回复
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        评论 {comments?.total || 0}
      </h2>

      {/* Comment Input */}
      <div className="space-y-4">
        {replyTo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>回复评论</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(null)}
            >
              取消
            </Button>
          </div>
        )}
        <div className="flex gap-3">
          {user && (
            <Avatar className="h-10 w-10">
              {user.avatar_url && (
                <AvatarImage
                  src={user.avatar_url}
                  alt={user.name || user.username}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-pink-600 text-white font-semibold">
                {(user.name || user.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder={isAuthenticated ? '写下你的评论...' : '登录后发表评论'}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={!isAuthenticated || submitting}
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!isAuthenticated || submitting || !newComment.trim()}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    发表评论
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments && comments.comments.length > 0 ? (
          comments.comments.map((comment) => renderComment(comment))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            还没有评论，来发表第一条评论吧！
          </p>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除评论</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。删除后评论内容将被隐藏，但如果有回复则评论仍会显示为"[此评论已删除]"。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
