import axios from 'axios';
import { toast } from '@/hooks/use-toast';

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
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized or 403 Forbidden
    if (error.response?.status === 401 || error.response?.status === 403) {
      const message = error.response?.data?.message || '登录已过期，请重新登录';

      toast({
        variant: "destructive",
        title: "认证失败",
        description: message,
      });

      // Clear token and redirect to login
      localStorage.removeItem('admin_token');
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }

    return Promise.reject(error);
  }
);

// Types
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

// API functions
export const videoApi = {
  // User APIs
  getVideos: (page = 1, pageSize = 20, category = '', search = '', includeEmpty = false) =>
    api.get<PaginatedVideos>('/api/videos', {
      params: { page, page_size: pageSize, category, search, include_empty: includeEmpty }
    }),

  getCategories: () =>
    api.get<string[]>('/api/categories'),

  getVideo: (videoId: number, includeEmpty = false) =>
    api.get<VideoWithEpisodes>(`/api/videos/${videoId}`, { params: { include_empty: includeEmpty } }),

  getEpisode: (episodeId: number) =>
    api.get<Episode>(`/api/episodes/${episodeId}`),

  getStreamUrl: (episodeId: number) =>
    `${API_BASE_URL}/api/stream/${episodeId}`,

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

  uploadVideo: (episodeId: number, formData: FormData, onProgress?: (progress: number) => void) => {
    return api.post(`/admin-api/episodes/${episodeId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },

  deleteEpisode: (episodeId: number) =>
    api.delete(`/admin-api/episodes/${episodeId}`),
};
