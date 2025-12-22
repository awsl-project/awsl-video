import axios from 'axios';
import { ErrorToastManager } from '@/utils/errorHandler';
import type {
  Video,
  Episode,
  VideoWithEpisodes,
  PaginatedVideos,
  UserProfile,
  UserToken,
  WatchHistory,
  VideoStats,
  Comment,
  PaginatedComments,
  PaginatedUsers,
} from '@/types/user';

// Re-export types for convenience
export type { Video, Episode, VideoWithEpisodes, PaginatedVideos };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Helper function to get full URL for cover images
export const getFullUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
};

// Add auth token to requests
// User APIs use: Authorization header
// Admin APIs use: X-Admin-Authorization header
api.interceptors.request.use((config) => {
  const userToken = localStorage.getItem('user_token');
  const adminToken = localStorage.getItem('admin_token');

  // Use different headers for admin vs user APIs
  const isAdminApi = config.url?.startsWith('/admin-api');

  if (isAdminApi && adminToken) {
    config.headers['X-Admin-Authorization'] = `Bearer ${adminToken}`;
  } else if (userToken) {
    config.headers.Authorization = `Bearer ${userToken}`;
  } else if (adminToken && !isAdminApi) {
    // Fallback: use admin token for non-admin APIs if no user token
    config.headers.Authorization = `Bearer ${adminToken}`;
  }

  return config;
});

// Add response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error (no response from server)
    if (!error.response) {
      ErrorToastManager.showNetworkError();
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const message = data?.message || data?.detail || '操作失败';

    // Show error toast with debouncing
    ErrorToastManager.showError(status, message);

    // Handle authentication errors - redirect to login
    if (status === 401 || status === 403) {
      const isAdminPath = window.location.pathname.startsWith('/admin');
      if (isAdminPath) {
        localStorage.removeItem('admin_token');
        if (window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        }
      } else {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// API functions
export const videoApi = {
  // User APIs
  getVideos: (page = 1, pageSize = 20, category = '', search = '', includeEmpty = false, sortBy = 'default') =>
    api.get<PaginatedVideos>('/api/videos', {
      params: { page, page_size: pageSize, category, search, include_empty: includeEmpty, sort_by: sortBy }
    }),

  getCategories: () =>
    api.get<string[]>('/api/categories'),

  getVideo: (videoId: number, includeEmpty = false) =>
    api.get<VideoWithEpisodes>(`/api/videos/${videoId}`, { params: { include_empty: includeEmpty } }),

  getEpisode: (episodeId: number) =>
    api.get<Episode>(`/api/episodes/${episodeId}`),

  // Admin APIs
  login: (username: string, password: string) =>
    api.post<{ access_token: string; token_type: string }>('/admin-api/auth/login', {
      username,
      password,
    }),

  createVideo: (data: { title: string; description?: string; category?: string }) =>
    api.post<Video>('/admin-api/videos', data),

  updateVideo: (videoId: number, data: { title?: string; description?: string; category?: string }) =>
    api.put<Video>(`/admin-api/videos/${videoId}`, data),

  uploadCover: (videoId: number, formData: FormData) =>
    api.post(`/admin-api/videos/${videoId}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteVideo: (videoId: number) =>
    api.delete(`/admin-api/videos/${videoId}`),

  createEpisode: (videoId: number, data: { episode_number: number; title: string; duration?: number }) =>
    api.post<Episode>(`/admin-api/videos/${videoId}/episodes`, data),

  updateEpisode: (episodeId: number, data: { episode_number?: number; title?: string }) =>
    api.put<Episode>(`/admin-api/episodes/${episodeId}`, data),

  deleteEpisode: (episodeId: number) =>
    api.delete(`/admin-api/episodes/${episodeId}`),

  // New upload flow with JWT token
  getUploadToken: () =>
    api.get<{ success: boolean; token: string; expires_in: number; expires_at: string; chat_id: string; storage_url: string }>(
      '/admin-api/upload/token'
    ),

  finalizeVideoUpload: (episodeId: number, chunks: any[]) =>
    api.post(`/admin-api/episodes/${episodeId}/upload/finalize`, { chunks }),

  // User Management APIs (Super Admin only)
  getUsers: (page = 1, pageSize = 20, search = '') =>
    api.get<PaginatedUsers>('/admin-api/users', { params: { page, page_size: pageSize, search } }),

  grantAdmin: (userId: number) =>
    api.post<{ success: boolean; message: string }>(`/admin-api/users/${userId}/admin`),

  revokeAdmin: (userId: number) =>
    api.delete<{ success: boolean; message: string }>(`/admin-api/users/${userId}/admin`),
};

// User API functions
export const userApi = {
  // OAuth
  getOAuthUrl: (provider: 'github' | 'linuxdo', redirectUri: string) =>
    api.get<{ authorize_url: string }>(`/api/oauth/login/${provider}`, { params: { redirect_uri: redirectUri } }),

  oauthCallback: (code: string, provider: string, redirectUri: string) =>
    api.post<UserToken>(`/api/oauth/callback`, null, { params: { code, provider, redirect_uri: redirectUri } }),

  // User Profile
  getCurrentUser: () =>
    api.get<UserProfile>('/api/user/me'),

  // Watch History
  getWatchHistory: (limit = 50, offset = 0) =>
    api.get<WatchHistory[]>('/api/user/history', { params: { limit, offset } }),

  recordWatchHistory: (episodeId: number) =>
    api.post<WatchHistory>('/api/user/history', { episode_id: episodeId }),

  // Favorites
  getFavorites: (limit = 50, offset = 0) =>
    api.get('/api/user/favorites', { params: { limit, offset } }),

  toggleFavorite: (videoId: number) =>
    api.post<{ favorited: boolean }>(`/api/user/videos/${videoId}/favorite`),

  // Likes
  toggleLike: (videoId: number) =>
    api.post<{ liked: boolean; total_likes: number }>(`/api/user/videos/${videoId}/like`),

  // Share
  recordShare: (videoId: number) =>
    api.post<{ message: string; total_shares: number }>(`/api/user/videos/${videoId}/share`),

  // Video Stats
  getVideoStats: (videoId: number) =>
    api.get<VideoStats>(`/api/videos/${videoId}/stats`),

  // Comments
  getComments: (videoId: number, page = 1, pageSize = 20) =>
    api.get<PaginatedComments>(`/api/videos/${videoId}/comments`, { params: { page, page_size: pageSize } }),

  createComment: (videoId: number, content: string, parentId?: number) =>
    api.post<Comment>(`/api/videos/${videoId}/comments`, { content, parent_id: parentId }),

  updateComment: (commentId: number, content: string) =>
    api.put<Comment>(`/api/comments/${commentId}`, { content }),

  deleteComment: (commentId: number) =>
    api.delete(`/api/comments/${commentId}`),
};

