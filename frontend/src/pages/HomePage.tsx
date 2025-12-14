import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Video as VideoIcon, Play, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { videoApi, getFullUrl, type Video } from '../api';

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

  return (
    <div className="min-h-screen bg-gray-50">
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
                <Card
                  key={video.id}
                  className="group cursor-pointer overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 p-0 gap-0"
                  onClick={() => handleVideoClick(video.id)}
                >
                  {/* Cover */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-pink-50 to-gray-100">
                    {video.cover_url ? (
                      <img
                        src={getFullUrl(video.cover_url)}
                        alt={video.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <VideoIcon className="h-12 w-12 text-primary" />
                      </div>
                    )}
                    {/* Play Icon Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-300">
                      <Play className="h-14 w-14 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-tight mt-1">
                        {video.description}
                      </p>
                    )}
                  </div>
                </Card>
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
