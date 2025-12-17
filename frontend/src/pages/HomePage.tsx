import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Video as VideoIcon, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { SEO } from '@/components/SEO';
import { VideoCard } from '@/components/VideoCard';
import { videoApi, type Video } from '../api';

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [searchKeyword, setSearchKeyword] = useState(searchParams.get('search') || '');
  const pageSize = 24;
  const navigate = useNavigate();

  // 监听 URL 参数变化
  useEffect(() => {
    const urlCategory = searchParams.get('category') || '';
    const urlSearch = searchParams.get('search') || '';
    if (urlCategory !== category || urlSearch !== searchKeyword) {
      setCategory(urlCategory);
      setSearchKeyword(urlSearch);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchVideos(page, category, searchKeyword);
  }, [page, category, searchKeyword]);

  const fetchVideos = async (currentPage: number, currentCategory: string, searchQuery: string) => {
    setLoading(true);
    try {
      const response = await videoApi.getVideos(currentPage, pageSize, currentCategory, searchQuery);
      setVideos(response.data.videos);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (videoId: number) => {
    navigate(`/video/${videoId}`);
  };

  const handleCategoryChange = (newCategory: string) => {
    const params = new URLSearchParams();
    if (newCategory) params.set('category', newCategory);
    if (searchKeyword) params.set('search', searchKeyword);
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
    const search = params.toString();
    navigate(search ? `/?${search}` : '/', { replace: true });
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
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
            <VideoIcon className="h-20 w-20 mb-4" />
            <p className="text-lg">暂无视频</p>
          </div>
        ) : (
          <>
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
