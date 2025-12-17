import { useState, useEffect } from 'react';
import { ThumbsUp, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { userApi } from '@/api';
import type { VideoStats } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface VideoInteractionsProps {
  videoId: number;
}

export function VideoInteractions({ videoId }: VideoInteractionsProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [videoId]);

  const loadStats = async () => {
    try {
      const response = await userApi.getVideoStats(videoId);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load video stats:', error);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast({
        title: '需要登录',
        description: '请先登录才能点赞视频',
      });
      sessionStorage.setItem('intended_path', window.location.pathname);
      navigate('/login');
      return;
    }

    setLoading('like');
    try {
      const response = await userApi.toggleLike(videoId);
      setStats((prev) => prev ? {
        ...prev,
        user_liked: response.data.liked,
        likes_count: response.data.total_likes,
      } : null);
      toast({
        title: response.data.liked ? '点赞成功' : '取消点赞',
        description: response.data.liked ? '感谢您的支持！' : '已取消点赞',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.response?.data?.detail || '点赞失败，请重试',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      toast({
        title: '需要登录',
        description: '请先登录才能收藏视频',
      });
      sessionStorage.setItem('intended_path', window.location.pathname);
      navigate('/login');
      return;
    }

    setLoading('favorite');
    try {
      const response = await userApi.toggleFavorite(videoId);
      setStats((prev) => prev ? {
        ...prev,
        user_favorited: response.data.favorited,
        favorites_count: prev.favorites_count + (response.data.favorited ? 1 : -1),
      } : null);
      toast({
        title: response.data.favorited ? '收藏成功' : '取消收藏',
        description: response.data.favorited ? '已添加到我的收藏' : '已从收藏中移除',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.response?.data?.detail || '收藏失败，请重试',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleShare = async () => {
    if (!isAuthenticated) {
      toast({
        title: '需要登录',
        description: '请先登录才能分享视频',
      });
      sessionStorage.setItem('intended_path', window.location.pathname);
      navigate('/login');
      return;
    }

    setLoading('share');
    try {
      // Get page title
      const pageTitle = document.title;

      // Create share text with promotional message
      const shareText = `推荐一个不错的视频：${pageTitle}\n\n${window.location.href}\n\n来这里发现更多精彩内容！`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareText);

      // Record share
      const response = await userApi.recordShare(videoId);
      setStats((prev) => prev ? {
        ...prev,
        shares_count: response.data.total_shares,
      } : null);

      toast({
        title: '分享链接已复制',
        description: '链接已复制到剪贴板，快去分享吧！',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '分享失败',
        description: error.response?.data?.detail || '分享失败，请重试',
      });
    } finally {
      setLoading(null);
    }
  };

  if (!stats) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      {/* Like Button */}
      <Button
        variant={stats.user_liked ? 'default' : 'outline'}
        size="sm"
        onClick={handleLike}
        disabled={loading === 'like'}
        className="gap-2"
      >
        <ThumbsUp className="h-4 w-4" />
        <span>{stats.likes_count}</span>
      </Button>

      {/* Favorite Button */}
      <Button
        variant={stats.user_favorited ? 'default' : 'outline'}
        size="sm"
        onClick={handleFavorite}
        disabled={loading === 'favorite'}
        className="gap-2"
      >
        <Heart className={`h-4 w-4 ${stats.user_favorited ? 'fill-current' : ''}`} />
        <span>{stats.favorites_count}</span>
      </Button>

      {/* Share Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={loading === 'share'}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        <span>{stats.shares_count}</span>
      </Button>

      {/* Comments Count (Read-only) */}
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <span>{stats.comments_count} 条评论</span>
      </div>
    </div>
  );
}
