import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, History as HistoryIcon } from 'lucide-react';
import { userApi } from '@/api';
import type { WatchHistory } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { VideoCard } from '@/components/VideoCard';

export default function WatchHistoryPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<WatchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadHistory();
  }, [isAuthenticated, authLoading, navigate]);

  const loadHistory = async () => {
    try {
      const response = await userApi.getWatchHistory();
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header showSearch={false} showCategories={false} />
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <Header showSearch={false} showCategories={false} />
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <HistoryIcon className="h-8 w-8" />
          观看历史
        </h1>
        <p className="text-muted-foreground mt-2">
          继续观看您上次未看完的视频
        </p>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HistoryIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">您还没有观看历史</p>
            <Button onClick={() => navigate('/')}>
              浏览视频
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {history.map((item) => (
            <VideoCard
              key={item.id}
              video={item.video}
              mode="history"
              episodeInfo={item.episode}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
