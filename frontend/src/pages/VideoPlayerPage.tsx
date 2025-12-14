import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Video as VideoIcon, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { videoApi, type VideoWithEpisodes, type Episode } from '../api';

export default function VideoPlayerPage() {
  const { videoId, episodeId } = useParams<{ videoId: string; episodeId?: string }>();
  const [video, setVideo] = useState<VideoWithEpisodes | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (videoId) {
      fetchVideoData(parseInt(videoId));
    }
  }, [videoId]);

  useEffect(() => {
    if (video && video.episodes.length > 0) {
      if (episodeId) {
        const episode = video.episodes.find((ep) => ep.id === parseInt(episodeId));
        if (episode) {
          setCurrentEpisode(episode);
        }
      } else {
        setCurrentEpisode(video.episodes[0]);
      }
    }
  }, [video, episodeId]);

  const fetchVideoData = async (id: number) => {
    setLoading(true);
    try {
      const response = await videoApi.getVideo(id);
      setVideo(response.data);
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    navigate(category ? `/?category=${category}` : '/');
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  const handleSearch = (keyword: string) => {
    if (keyword.trim()) {
      navigate(`/?search=${encodeURIComponent(keyword)}`);
    } else {
      navigate('/');
    }
  };

  const handleEpisodeClick = (episode: Episode) => {
    navigate(`/video/${videoId}/${episode.id}`);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '未知';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <VideoIcon className="h-20 w-20 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">视频未找到</p>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentCategory={video?.category || ''}
        onCategoryChange={handleCategoryChange}
        onHomeClick={handleHomeClick}
        onSearch={handleSearch}
      />

      {/* Content */}
      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden border-0 shadow-lg p-0 gap-0">
              <div className="aspect-video bg-black">
                {currentEpisode ? (
                  <video
                    ref={videoRef}
                    className="w-full h-full"
                    controls
                    autoPlay
                    src={videoApi.getStreamUrl(currentEpisode.id)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-white">请选择剧集</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Video Info */}
            <Card className="border-0 shadow p-0 gap-0">
              <CardContent className="p-6">
                {video.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {video.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Episode List */}
          <div className="space-y-4">
            <Card className="border-0 shadow">
              <CardContent className="p-4">
                {/* Video Title */}
                <div className="mb-4 pb-4 border-b">
                  <h1 className="text-xl font-bold mb-1">{video.title}</h1>
                  {currentEpisode && (
                    <p className="text-sm text-muted-foreground">
                      第{currentEpisode.episode_number}集 - {currentEpisode.title}
                    </p>
                  )}
                </div>

                <h2 className="font-semibold mb-4">选集 ({video.episodes.length})</h2>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {video.episodes.map((episode) => (
                    <button
                      key={episode.id}
                      onClick={() => handleEpisodeClick(episode)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        currentEpisode?.id === episode.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-accent border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {currentEpisode?.id === episode.id ? (
                            <Play className="h-4 w-4 fill-current" />
                          ) : (
                            <span className="text-muted-foreground">
                              {episode.episode_number}
                            </span>
                          )}
                          <span className="font-medium text-sm">{episode.title}</span>
                        </div>
                        {episode.duration && (
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(episode.duration)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
