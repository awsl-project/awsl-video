import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Video as VideoIcon, ArrowUpDown } from 'lucide-react';
import { Header } from '@/components/Header';
import { SEO } from '@/components/SEO';
import { VideoCard } from '@/components/VideoCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { videoApi, type Video } from '../api';

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [searchKeyword, setSearchKeyword] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default');
  const [error, setError] = useState<string | null>(null);
  const pageSize = 24;
  const navigate = useNavigate();

  // 监听 URL 参数变化
  useEffect(() => {
    const urlCategory = searchParams.get('category') || '';
    const urlSearch = searchParams.get('search') || '';
    const urlSort = searchParams.get('sort') || 'default';
    if (urlCategory !== category || urlSearch !== searchKeyword || urlSort !== sortBy) {
      setCategory(urlCategory);
      setSearchKeyword(urlSearch);
      setSortBy(urlSort);
      setPage(1);
    }
  }, [searchParams, category, searchKeyword, sortBy]);

  useEffect(() => {
    setVideos(null); // Reset videos when page/filters change
    fetchVideos(page, category, searchKeyword, sortBy);
  }, [page, category, searchKeyword, sortBy]);

  const fetchVideos = async (currentPage: number, currentCategory: string, searchQuery: string, sort: string) => {
    try {
      setError(null);
      const response = await videoApi.getVideos(currentPage, pageSize, currentCategory, searchQuery, false, sort);
      setVideos(response.data.videos);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError('加载视频失败，请稍后重试');
      setVideos([]);
    }
  };

  const handleVideoClick = (videoId: number) => {
    navigate(`/video/${videoId}`);
  };

  const handleCategoryChange = (newCategory: string) => {
    const params = new URLSearchParams();
    if (newCategory) params.set('category', newCategory);
    if (searchKeyword) params.set('search', searchKeyword);
    if (sortBy !== 'default') params.set('sort', sortBy);
    const search = params.toString();
    navigate(search ? `/?${search}` : '/');
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  const handleSearch = (keyword: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (keyword) params.set('search', keyword);
    if (sortBy !== 'default') params.set('sort', sortBy);
    const search = params.toString();
    navigate(search ? `/?${search}` : '/', { replace: true });
  };

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (searchKeyword) params.set('search', searchKeyword);
    if (newSort !== 'default') params.set('sort', newSort);
    const search = params.toString();
    navigate(search ? `/?${search}` : '/');
  };

  const totalPages = Math.ceil(total / pageSize);

  // Generate dynamic SEO content with useMemo for performance
  const seoContent = useMemo(() => {
    let title = 'Awsl Video';
    let description = '在线视频平台，观看精彩视频内容';
    let keywords = '视频网站,在线视频,视频播放,分集播放,视频平台';

    if (searchKeyword && category) {
      title = `${category} - "${searchKeyword}" 搜索结果`;
      description = `在${category}分区搜索"${searchKeyword}"的视频结果，共找到 ${total} 个视频。`;
      keywords = `${category},${searchKeyword},视频搜索,在线视频`;
    } else if (searchKeyword) {
      title = `"${searchKeyword}" 搜索结果`;
      description = `搜索"${searchKeyword}"的视频结果，共找到 ${total} 个视频。`;
      keywords = `${searchKeyword},视频搜索,在线视频,视频播放`;
    } else if (category) {
      title = `${category} - 分区视频`;
      description = `${category}分区的所有视频，共 ${total} 个精彩视频等你观看。`;
      keywords = `${category},视频分区,在线视频,视频平台`;
    } else if (total > 0) {
      description = `精选视频平台，共有 ${total} 个精彩视频，支持分集播放和在线观看。`;
    }

    return { title, description, keywords };
  }, [searchKeyword, category, total]);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={seoContent.title}
        description={seoContent.description}
        keywords={seoContent.keywords}
        type="website"
      />
      <Header
        currentCategory={category}
        onCategoryChange={handleCategoryChange}
        onHomeClick={handleHomeClick}
        initialSearchValue={searchKeyword}
        onSearch={handleSearch}
      />

      {/* Content */}
      <main className="container py-8">
        {error ? (
          // Error state
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center text-red-500 py-8">
              <VideoIcon className="h-16 w-16 mx-auto mb-4 text-red-400" />
              <p className="text-lg font-semibold mb-2">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setVideos(null);
                  fetchVideos(page, category, searchKeyword, sortBy);
                }}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        ) : videos === null ? (
          // Loading state - show skeleton
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="h-5 bg-gray-200 animate-pulse rounded w-24" />
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-gray-200 animate-pulse rounded" />
                <div className="h-9 w-[160px] bg-gray-200 animate-pulse rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-video bg-gray-200 animate-pulse rounded-lg" />
                  <div className="h-4 bg-gray-200 animate-pulse rounded" />
                  <div className="h-3 bg-gray-200 animate-pulse rounded w-2/3" />
                </div>
              ))}
            </div>
          </>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
            <VideoIcon className="h-20 w-20 mb-4" />
            <p className="text-lg">暂无视频</p>
          </div>
        ) : (
          <>
            {/* Sort Selector */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-600">
                共 <span className="font-semibold text-pink-600">{total}</span> 个视频
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-pink-500" />
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[160px] h-9 border border-gray-200 shadow-none hover:border-pink-300 transition-colors bg-white">
                    <SelectValue placeholder="排序方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">智能推荐</SelectItem>
                    <SelectItem value="latest">最新发布</SelectItem>
                    <SelectItem value="popular">最受欢迎</SelectItem>
                    <SelectItem value="trending">最近热门</SelectItem>
                    <SelectItem value="likes">最多点赞</SelectItem>
                    <SelectItem value="favorites">最多收藏</SelectItem>
                    <SelectItem value="shares">最多分享</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Video Grid */}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                >
                  上一页
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (page <= 4) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-md border transition-all ${
                          page === pageNum
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'hover:bg-accent'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
