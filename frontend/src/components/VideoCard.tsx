import { Link } from 'react-router-dom';
import { Video as VideoIcon, Play, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getFullUrl } from '@/api';

export interface VideoCardProps {
  video: {
    id: number;
    title: string;
    description?: string;
    cover_url?: string;
    category?: string;
  };
  mode?: 'normal' | 'favorite' | 'history';
  episodeInfo?: {
    episode_number: number;
    title: string;
  };
  onClick?: () => void;
}

export function VideoCard({
  video,
  mode = 'normal',
  episodeInfo,
  onClick,
}: VideoCardProps) {

  const cardContent = (
    <Card
      className={`group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 p-0 gap-0 ${
        onClick ? 'cursor-pointer' : ''
      }`}
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

        {/* Favorite Icon */}
        {mode === 'favorite' && (
          <div className="absolute top-2 right-2">
            <Heart className="h-6 w-6 fill-current text-red-500 drop-shadow-lg" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors leading-tight">
          {video.title}
        </h3>

        {/* Episode Info for History */}
        {mode === 'history' && episodeInfo && (
          <p className="text-sm text-muted-foreground mt-1">
            第 {episodeInfo.episode_number} 集 - {episodeInfo.title}
          </p>
        )}

        {/* Description */}
        {video.description && mode !== 'history' && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-tight mt-1">
            {video.description}
          </p>
        )}

        {/* Category */}
        {video.category && mode === 'favorite' && (
          <div className="mt-2">
            <span className="text-xs bg-secondary px-2 py-1 rounded">
              {video.category}
            </span>
          </div>
        )}
      </div>
    </Card>
  );

  // If onClick is provided, use div wrapper with onClick
  if (onClick) {
    return (
      <div onClick={onClick} className="group">
        {cardContent}
      </div>
    );
  }

  // Otherwise, use Link wrapper
  return (
    <Link to={`/video/${video.id}`} className="group">
      {cardContent}
    </Link>
  );
}
