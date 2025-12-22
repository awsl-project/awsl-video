// Video Types
export interface Video {
  id: number;
  title: string;
  description?: string;
  cover_url?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: number;
  video_id: number;
  episode_number: number;
  title: string;
  duration?: number;
  created_at: string;
  stream_url?: string;
}

export interface VideoWithEpisodes extends Video {
  episodes: Episode[];
}

export interface PaginatedVideos {
  total: number;
  page: number;
  page_size: number;
  videos: Video[];
}

// User Authentication Types
export interface UserProfile {
  id: number;
  oauth_provider: string;
  username: string;
  name?: string;
  avatar_url?: string;
  email?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login: string;
}

export interface UserToken {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface WatchHistory {
  id: number;
  episode_id: number;
  video_id: number;
  last_watched: string;
  video: Video;
  episode: Episode;
}

export interface VideoStats {
  likes_count: number;
  favorites_count: number;
  shares_count: number;
  comments_count: number;
  user_liked: boolean;
  user_favorited: boolean;
}

export interface CommentUser {
  id: number;
  username: string;
  name?: string;
  avatar_url?: string;
}

export interface Comment {
  id: number;
  user: CommentUser;
  video_id: number;
  parent_id?: number;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  replies: Comment[];
}

export interface PaginatedComments {
  total: number;
  page: number;
  page_size: number;
  comments: Comment[];
}

// User Management Types (Admin)
export interface UserListItem {
  id: number;
  username: string;
  name?: string;
  avatar_url?: string;
  oauth_provider: string;
  email?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login: string;
}

export interface PaginatedUsers {
  total: number;
  page: number;
  page_size: number;
  users: UserListItem[];
}
