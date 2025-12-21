import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Video as VideoIcon, Home, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoCard } from '@/components/VideoCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { videoApi, type Video } from '../api';
import { toast } from '@/hooks/use-toast';

export default function AdminDashboardPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');

  // Form state
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoCategory, setVideoCategory] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchCategories();
    fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    fetchVideos();
  }, [filterCategory, debouncedSearchKeyword]);

  const fetchCategories = async () => {
    try {
      const response = await videoApi.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await videoApi.getVideos(1, 100, filterCategory, debouncedSearchKeyword, true);
      setVideos(response.data.videos);
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const handleVideoClick = (videoId: number) => {
    navigate(`/admin/edit/${videoId}`);
  };

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await videoApi.createVideo({
        title: videoTitle,
        description: videoDesc,
        category: videoCategory
      });

      toast({
        variant: "success",
        title: "成功",
        description: "视频创建成功",
      });

      setShowCreateDialog(false);
      setVideoTitle('');
      setVideoDesc('');
      setVideoCategory('');
      fetchVideos();
    } catch (error) {
      console.error('Failed to create video');
      toast({
        variant: "destructive",
        title: "错误",
        description: "创建视频失败",
      });
    }
  };

  const handleSearchSubmit = () => {
    setDebouncedSearchKeyword(searchKeyword);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-xl font-bold text-primary">管理后台</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              返回主页
            </Button>
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="搜索视频标题..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit();
                  }
                }}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory || 'all'} onValueChange={(value) => setFilterCategory(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="全部分区" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分区</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建视频
          </Button>
        </div>

        {/* Video Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video bg-gray-200 animate-pulse rounded-lg" />
                <div className="h-4 bg-gray-200 animate-pulse rounded" />
                <div className="h-3 bg-gray-200 animate-pulse rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
            <VideoIcon className="h-20 w-20 mb-4" />
            <p className="text-lg mb-4">暂无视频</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个视频
            </Button>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-4">
              共 <span className="font-semibold text-primary">{videos.length}</span> 个视频
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  mode="normal"
                  onClick={() => handleVideoClick(video.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Create Video Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建视频</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateVideo} className="space-y-4">
            <div>
              <Label>标题</Label>
              <Input
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                required
                placeholder="请输入视频标题"
              />
            </div>
            <div>
              <Label>简介</Label>
              <Textarea
                value={videoDesc}
                onChange={(e) => setVideoDesc(e.target.value)}
                rows={5}
                placeholder="请输入视频简介，支持多行文本"
              />
            </div>
            <div>
              <Label>分区</Label>
              <Select value={videoCategory || undefined} onValueChange={(value) => setVideoCategory(value || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分区" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">创建</Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowCreateDialog(false);
                  setVideoTitle('');
                  setVideoDesc('');
                  setVideoCategory('');
                }}
              >
                取消
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
