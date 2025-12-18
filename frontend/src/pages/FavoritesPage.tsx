import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { userApi } from '@/api';
import type { Video } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { VideoCard } from '@/components/VideoCard';

interface FavoriteItem {
  id: number;
  video: Video;
  created_at: string;
}

export default function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadFavorites();
  }, [isAuthenticated, authLoading, navigate]);

  const loadFavorites = async () => {
    try {
      const response = await userApi.getFavorites();
      setFavorites(response.data);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Header showSearch={false} showCategories={false} />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="h-10 bg-gray-200 animate-pulse rounded w-48 mb-2" />
            <div className="h-4 bg-gray-200 animate-pulse rounded w-64" />
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header showSearch={false} showCategories={false} />
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Heart className="h-8 w-8 fill-current text-red-500" />
          我的收藏
        </h1>
        <p className="text-muted-foreground mt-2">
          您收藏的所有视频
        </p>
      </div>

      {favorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">您还没有收藏任何视频</p>
            <Button onClick={() => navigate('/')}>
              浏览视频
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {favorites.map((item) => (
            <VideoCard
              key={item.id}
              video={item.video}
              mode="favorite"
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
