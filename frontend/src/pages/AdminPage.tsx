import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LogOut, Plus, Video as VideoIcon, Loader2, Upload, Trash, Image as ImageIcon, X, Edit, Play, Search, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { videoApi, getFullUrl, type Video, type VideoWithEpisodes, type Episode } from '../api';
import { toast } from '@/hooks/use-toast';

export default function AdminPage() {
  const { videoId } = useParams<{ videoId?: string }>();
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoWithEpisodes | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [showEpisodeForm, setShowEpisodeForm] = useState(false);
  const [editingEpisodeId, setEditingEpisodeId] = useState<number | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showCoverUploadDialog, setShowCoverUploadDialog] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoCategory, setVideoCategory] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingEpisode, setUploadingEpisode] = useState<Episode | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState(0); // MB/s
  const [uploadStats, setUploadStats] = useState({ current: 0, total: 0 }); // 当前分片/总分片
  const [retryStatus, setRetryStatus] = useState<string>(''); // 重试状态信息
  const [previewingEpisode, setPreviewingEpisode] = useState<Episode | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchCategories();
    fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件首次挂载时执行

  // 防抖搜索关键词
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const handleSearchSubmit = () => {
    // 立即触发搜索
    setDebouncedSearchKeyword(searchKeyword);
  };

  useEffect(() => {
    fetchVideos();
  }, [filterCategory, debouncedSearchKeyword]);

  // 监听路由参数中的 videoId
  useEffect(() => {
    if (videoId) {
      const id = parseInt(videoId);
      // 先从视频列表中找到对应视频，立即更新选中状态（提供即时反馈）
      const video = videos.find(v => v.id === id);
      if (video) {
        // 设置临时选中状态，只有基本信息，选中状态立即显示
        setSelectedVideo({
          ...video,
          episodes: []
        } as VideoWithEpisodes);
        // 显示分集加载状态
        setLoadingEpisodes(true);
      } else {
        // 列表中找不到，显示完整加载状态
        setLoadingDetail(true);
      }
      // 异步加载完整的视频详情（包括 episodes）
      fetchVideoDetail(id);
    } else {
      setSelectedVideo(null);
      setLoadingEpisodes(false);
    }
  }, [videoId, videos]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!showVideoForm && !showCoverUploadDialog) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleCoverFile(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showVideoForm, showCoverUploadDialog]);

  // Clean up video preview URL on component unmount
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  const fetchCategories = async () => {
    try {
      const response = await videoApi.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await videoApi.getVideos(1, 100, filterCategory, debouncedSearchKeyword, true);
      setVideos(response.data.videos);
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoDetail = async (videoId: number) => {
    try {
      const response = await videoApi.getVideo(videoId, true);
      setSelectedVideo(response.data);
    } catch (error) {
      console.error('Failed to fetch video details');
    } finally {
      setLoadingDetail(false);
      setLoadingEpisodes(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const handleCoverFile = (file: File) => {
    // Check file size (2MB limit)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      toast({
        variant: "destructive",
        title: "文件过大",
        description: "封面图片不能超过 2MB",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "文件类型错误",
        description: "请选择图片文件",
      });
      return;
    }

    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCoverFile(file);
    }
  };

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await videoApi.createVideo({
        title: videoTitle,
        description: videoDesc,
        category: videoCategory
      });

      toast({
        variant: "success",
        title: "成功",
        description: "视频创建成功",
      });

      setShowVideoForm(false);
      setVideoTitle('');
      setVideoDesc('');
      setVideoCategory('');
      fetchVideos();
    } catch (error) {
      console.error('Failed to create video');
    }
  };

  const handleCreateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideo) return;
    try {
      await videoApi.createEpisode(selectedVideo.id, {
        episode_number: parseInt(episodeNumber),
        title: episodeTitle,
      });

      toast({
        variant: "success",
        title: "成功",
        description: "分集创建成功",
      });

      setShowEpisodeForm(false);
      setEpisodeNumber('');
      setEpisodeTitle('');
      fetchVideoDetail(selectedVideo.id);
    } catch (error) {
      console.error('Failed to create episode');
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm('确定删除该视频吗？')) return;
    try {
      await videoApi.deleteVideo(videoId);

      toast({
        variant: "success",
        title: "成功",
        description: "视频删除成功",
      });

      fetchVideos();
      if (selectedVideo?.id === videoId) {
        navigate('/admin');
      }
    } catch (error) {
      console.error('Failed to delete video');
    }
  };

  const handleDeleteEpisode = async (episodeId: number) => {
    if (!confirm('确定删除该集数吗？')) return;
    try {
      await videoApi.deleteEpisode(episodeId);

      toast({
        variant: "success",
        title: "成功",
        description: "分集删除成功",
      });

      if (selectedVideo) {
        fetchVideoDetail(selectedVideo.id);
      }
    } catch (error) {
      console.error('Failed to delete episode');
    }
  };

  const handleUploadClick = (episode: Episode) => {
    setUploadingEpisode(episode);
    setShowUploadDialog(true);
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clean up previous preview URL
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }

      setVideoFile(file);
      // Create local preview URL
      const previewUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(previewUrl);
    }
  };

  const handleVideoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      // Clean up previous preview URL
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }

      setVideoFile(file);
      // Create local preview URL
      const previewUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(previewUrl);
    }
  };

  const handleVideoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUploadVideo = async () => {
    if (!videoFile || !uploadingEpisode) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadSpeed(0);
    setUploadStats({ current: 0, total: 0 });
    setRetryStatus('');

    const startTime = Date.now();

    try {
      // Step 1: Get JWT token from backend
      const tokenResponse = await videoApi.getUploadToken();
      const { token, storage_url } = tokenResponse.data;

      // Step 2: 配置上传参数
      const CHUNK_SIZE = 10 * 1024 * 1024; // 固定 10MB 分片
      const MAX_CONCURRENT = 3; // 最大并发数
      const MAX_RETRIES = 5; // 每个分片最大重试次数（增加到5次以应对频繁限流）
      const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);
      const chunks: Array<{ chunk_index: number; file_id: string; file_size: number } | undefined> = new Array(totalChunks);

      // Get file extension from original file
      const fileExtension = videoFile.name.substring(videoFile.name.lastIndexOf('.'));
      const fileName = `${selectedVideo?.title}_EP${uploadingEpisode.episode_number}_${uploadingEpisode.title}${fileExtension}`;

      // Upload state for persistence and resume
      // Use a deterministic uploadId based on episode and file properties for resume capability
      const uploadId = `${uploadingEpisode.id}_${fileName}_${videoFile.size}`;
      const storageKey = `upload_${uploadId}`;

      // Step 2.5: 尝试从 localStorage 恢复未完成的上传
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          if (parsed.fileName === fileName && parsed.totalChunks === totalChunks && parsed.fileSize === videoFile.size) {
            // 恢复已完成的分片
            for (const [idx, chunk] of Object.entries(parsed.completedChunks || {})) {
              chunks[parseInt(idx)] = chunk as any;
            }
            const resumedCount = chunks.filter(c => c !== undefined).length;
            if (resumedCount > 0) {
              toast({
                variant: "default",
                title: "恢复上传",
                description: `检测到未完成的上传，已恢复 ${resumedCount}/${totalChunks} 个分片`,
              });
              console.log(`Resumed upload: ${resumedCount}/${totalChunks} chunks already uploaded`);
            }
          }
        } catch (e) {
          console.warn('Failed to parse saved upload state:', e);
        }
      }

      setUploadStats({ current: chunks.filter(c => c !== undefined).length, total: totalChunks });

      // Helper: 解析 "Too Many Requests: retry after X" 错误
      const parseRetryAfter = (errorMessage: string): number | null => {
        const match = errorMessage.match(/retry after (\d+)/i);
        return match ? parseInt(match[1]) : null;
      };

      // Step 3: 上传单个分片的函数（带速率限制感知的重试机制）
      const uploadChunk = async (chunkIndex: number): Promise<void> => {
        // 如果分片已上传，跳过
        if (chunks[chunkIndex]) {
          console.log(`Chunk ${chunkIndex + 1} already uploaded, skipping`);
          return;
        }

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, videoFile.size);
        const chunkBlob = videoFile.slice(start, end);
        const chunkSize = end - start;

        const formData = new FormData();
        const chunkFileName = `${fileName}.part${chunkIndex + 1}`;
        formData.append('file', chunkBlob, chunkFileName);
        formData.append('media_type', 'document');

        let lastError: Error | null = null;
        let rateLimitRetries = 0; // 速率限制重试计数（仅用于显示）

        // 重试机制（指数退避 + 速率限制无限重试）
        for (let retry = 0; retry < MAX_RETRIES; retry++) {
          try {
            const uploadResponse = await fetch(`${storage_url}/api/upload`, {
              method: 'POST',
              headers: {
                'X-Api-Token': token,
              },
              body: formData,
            });

            // 处理速率限制错误 (429 或 400 with rate limit message)
            if (uploadResponse.status === 429 || uploadResponse.status === 400) {
              const errorText = await uploadResponse.text();
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { error: errorText };
              }

              const errorMessage = errorData.error || errorText;
              const retryAfter = parseRetryAfter(errorMessage);

              if (retryAfter !== null) {
                // 速率限制：一直重试直到成功，不计入 MAX_RETRIES
                rateLimitRetries++;
                const waitSeconds = Math.min(retryAfter, 120); // 最多等待120秒
                setRetryStatus(`速率限制：等待 ${waitSeconds} 秒后重试分片 ${chunkIndex + 1}/${totalChunks} (速率限制重试 #${rateLimitRetries})`);
                console.warn(`Rate limited on chunk ${chunkIndex + 1}, waiting ${waitSeconds}s (rate limit retry #${rateLimitRetries})`);

                // 倒计时显示
                for (let i = waitSeconds; i > 0; i--) {
                  setRetryStatus(`速率限制：等待 ${i} 秒后重试分片 ${chunkIndex + 1}/${totalChunks} (速率限制重试 #${rateLimitRetries})`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
                setRetryStatus('');

                // 不计入 retry 次数，继续当前循环
                retry--;
                continue;
              }

              throw new Error(`HTTP ${uploadResponse.status}: ${errorMessage}`);
            }

            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              throw new Error(`HTTP ${uploadResponse.status}: ${errorText}`);
            }

            const uploadResult = await uploadResponse.json();

            if (!uploadResult.success || !uploadResult.files || uploadResult.files.length === 0) {
              throw new Error('Invalid response from server');
            }

            // 成功上传
            const fileId = uploadResult.files[0].file_id;
            chunks[chunkIndex] = {
              chunk_index: chunkIndex,
              file_id: fileId,
              file_size: chunkSize,
            };

            // 保存上传状态到 localStorage
            const uploadState = {
              uploadId,
              episodeId: uploadingEpisode.id,
              fileName,
              fileSize: videoFile.size,
              totalChunks,
              completedChunks: Object.fromEntries(
                chunks
                  .map((c, i) => [i, c])
                  .filter(([_, c]) => c !== undefined)
              ),
              timestamp: Date.now(),
            };
            localStorage.setItem(storageKey, JSON.stringify(uploadState));

            // 更新统计信息（使用已完成的分片总大小计算，避免并发竞态）
            const completedChunks = chunks.filter(c => c !== undefined).length;
            const uploadedBytes = chunks.filter(c => c !== undefined).reduce((sum, c) => sum + c!.file_size, 0);
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const speedMBps = elapsedSeconds > 0 ? (uploadedBytes / 1024 / 1024) / elapsedSeconds : 0;
            setUploadSpeed(speedMBps);

            // 更新进度（0-85% 用于上传分片）
            const progress = Math.floor((completedChunks / totalChunks) * 85);
            setUploadProgress(progress);
            setUploadStats({ current: completedChunks, total: totalChunks });

            return; // 成功，退出重试循环
          } catch (error) {
            lastError = error as Error;
            console.warn(`Chunk ${chunkIndex + 1} upload attempt ${retry + 1} failed:`, error);

            if (retry < MAX_RETRIES - 1) {
              // 指数退避：1s, 2s, 4s, 8s, 16s
              const delayMs = Math.min(Math.pow(2, retry) * 1000, 16000);
              setRetryStatus(`分片 ${chunkIndex + 1}/${totalChunks} 失败，${(delayMs / 1000).toFixed(0)}秒后重试 (尝试 ${retry + 2}/${MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              setRetryStatus('');
            }
          }
        }

        // 所有重试失败
        throw new Error(
          `分片 ${chunkIndex + 1}/${totalChunks} 上传失败（已重试 ${MAX_RETRIES} 次）: ${lastError?.message || '未知错误'}`
        );
      };

      // Step 4: 并行上传分片（分批控制并发）
      for (let i = 0; i < totalChunks; i += MAX_CONCURRENT) {
        const batch = [];
        for (let j = i; j < Math.min(i + MAX_CONCURRENT, totalChunks); j++) {
          batch.push(uploadChunk(j));
        }
        // 等待当前批次的所有分片完成
        await Promise.all(batch);
      }

      // Step 5: Finalize upload by sending chunks to backend
      setUploadProgress(90);
      const finalChunks = chunks.filter(c => c !== undefined) as Array<{ chunk_index: number; file_id: string; file_size: number }>;
      await videoApi.finalizeVideoUpload(uploadingEpisode.id, finalChunks);

      setUploadProgress(100);

      // 清除 localStorage 中的上传状态
      localStorage.removeItem(storageKey);

      // 计算最终平均速度（基于实际文件大小和总时间）
      const totalTime = (Date.now() - startTime) / 1000;
      const finalSpeed = (videoFile.size / 1024 / 1024) / totalTime;

      // Log chunk details in console only
      console.log(`Video uploaded successfully with ${totalChunks} chunks`, {
        episodeId: uploadingEpisode.id,
        fileName,
        totalSize: videoFile.size,
        chunkSize: CHUNK_SIZE,
        chunks: finalChunks.length,
        totalTime: totalTime.toFixed(2) + 's',
        averageSpeed: finalSpeed.toFixed(2) + ' MB/s',
      });

      toast({
        variant: "success",
        title: "成功",
        description: `视频上传成功 (平均速度: ${finalSpeed.toFixed(2)} MB/s)`,
      });

      setShowUploadDialog(false);
      setVideoFile(null);
      // Clean up preview URL
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      setVideoPreviewUrl('');
      setUploadProgress(0);
      setUploadSpeed(0);
      setUploadStats({ current: 0, total: 0 });
      setRetryStatus('');
      setUploadingEpisode(null);

      if (selectedVideo) {
        fetchVideoDetail(selectedVideo.id);
      }
    } catch (error: any) {
      console.error('Failed to upload video:', error);
      toast({
        variant: "destructive",
        title: "上传失败",
        description: error.message || "视频上传失败，请重新尝试。未完成的上传已保存，下次上传会自动恢复。",
        duration: 8000,
      });
    } finally {
      setIsUploading(false);
      setRetryStatus('');
    }
  };

  const handlePreviewClick = (episode: Episode) => {
    setPreviewingEpisode(episode);
    setShowPreviewDialog(true);
  };

  const startEditingVideo = () => {
    if (!selectedVideo) return;
    setVideoTitle(selectedVideo.title);
    setVideoDesc(selectedVideo.description || '');
    setVideoCategory(selectedVideo.category || '');
    setIsEditingVideo(true);
  };

  const cancelEditingVideo = () => {
    setIsEditingVideo(false);
    setVideoTitle('');
    setVideoDesc('');
    setVideoCategory('');
  };

  const saveVideoEdit = async () => {
    if (!selectedVideo) return;

    try {
      await videoApi.updateVideo(selectedVideo.id, {
        title: videoTitle,
        description: videoDesc,
        category: videoCategory
      });

      setIsEditingVideo(false);
      setVideoTitle('');
      setVideoDesc('');
      setVideoCategory('');
      fetchVideos();
      fetchVideoDetail(selectedVideo.id);
    } catch (error) {
      console.error('Failed to update video');
    }
  };

  const handleUploadCover = async () => {
    if (!coverFile || !selectedVideo) return;

    try {
      const formData = new FormData();
      formData.append('cover', coverFile);

      await videoApi.uploadCover(selectedVideo.id, formData);

      toast({
        variant: "success",
        title: "成功",
        description: "封面上传成功",
      });

      setShowCoverUploadDialog(false);
      setCoverFile(null);
      setCoverPreview('');
      fetchVideos();
      fetchVideoDetail(selectedVideo.id);
    } catch (error) {
      console.error('Failed to upload cover:', error);
    }
  };

  const startEditingEpisode = (episode: Episode) => {
    setEditingEpisodeId(episode.id);
    setEpisodeNumber(episode.episode_number.toString());
    setEpisodeTitle(episode.title);
  };

  const cancelEditingEpisode = () => {
    setEditingEpisodeId(null);
    setEpisodeNumber('');
    setEpisodeTitle('');
  };

  const saveEpisodeEdit = async (episodeId: number) => {
    try {
      await videoApi.updateEpisode(episodeId, {
        episode_number: parseInt(episodeNumber),
        title: episodeTitle,
      });

      setEditingEpisodeId(null);
      setEpisodeNumber('');
      setEpisodeTitle('');

      if (selectedVideo) {
        fetchVideoDetail(selectedVideo.id);
      }
    } catch (error) {
      console.error('Failed to update episode');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <VideoIcon className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">管理后台</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              返回主页
            </Button>
          </div>
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            退出登录
          </Button>
        </div>
      </header>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">视频列表</h2>
              <Button onClick={() => setShowVideoForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                新建
              </Button>
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
                <Input
                  placeholder="搜索视频标题..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit();
                    }
                  }}
                  className="pl-9 pr-16"
                />
                {searchKeyword && (
                  <button
                    onClick={handleSearchSubmit}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-primary text-white hover:bg-primary/90 transition-colors rounded-md px-2.5 py-1 text-xs font-medium"
                    aria-label="Search"
                  >
                    搜索
                  </button>
                )}
              </div>
              <Select value={filterCategory || undefined} onValueChange={(value) => setFilterCategory(value || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="全部分区" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-1.5">
                {videos.map((video) => (
                  <Card
                    key={video.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedVideo?.id === video.id ? 'border-primary' : ''
                    } ${loadingEpisodes || loadingDetail ? 'pointer-events-none opacity-50' : ''}`}
                    onClick={() => {
                      // 加载中不允许切换
                      if (loadingEpisodes || loadingDetail) return;
                      navigate(`/admin/${video.id}`);
                    }}
                  >
                    <CardContent className="py-1.5 px-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate leading-tight flex-1">{video.title}</p>
                        {video.category && (
                          <Badge className="text-xs shrink-0 bg-primary text-white">{video.category}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Video Detail */}
          <div className="lg:col-span-3 space-y-4">
            {loadingDetail ? (
              <Card>
                <CardHeader>
                  <div className="h-6 bg-gray-200 animate-pulse rounded w-1/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="w-full h-48 bg-gray-200 animate-pulse rounded-md" />
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
                  <div className="space-y-2 mt-6">
                    <div className="h-12 bg-gray-200 animate-pulse rounded" />
                    <div className="h-12 bg-gray-200 animate-pulse rounded" />
                    <div className="h-12 bg-gray-200 animate-pulse rounded" />
                  </div>
                </CardContent>
              </Card>
            ) : selectedVideo ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      {!isEditingVideo ? (
                        <>
                          <CardTitle>{selectedVideo.title}</CardTitle>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVideo(selectedVideo.id);
                            }}>
                              <Trash className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setShowCoverUploadDialog(true)}>
                              <ImageIcon className="h-4 w-4 mr-1" />
                              上传封面
                            </Button>
                            <Button variant="ghost" size="sm" onClick={startEditingVideo}>
                              <Edit className="h-4 w-4 mr-1" />
                              编辑
                            </Button>
                          </div>
                        </>
                      ) : (
                        <CardTitle>编辑视频信息</CardTitle>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditingVideo ? (
                      <div className="space-y-4">
                        <div>
                          <Label>标题</Label>
                          <Input
                            value={videoTitle}
                            onChange={(e) => setVideoTitle(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>简介</Label>
                          <Textarea
                            value={videoDesc}
                            onChange={(e) => setVideoDesc(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>分区</Label>
                          <Select value={videoCategory || undefined} onValueChange={(value) => setVideoCategory(value || '')}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择分区" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={saveVideoEdit} className="flex-1">保存</Button>
                          <Button variant="secondary" onClick={cancelEditingVideo} className="flex-1">取消</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {selectedVideo.cover_url && (
                          <img
                            src={getFullUrl(selectedVideo.cover_url)}
                            alt={selectedVideo.title}
                            className="w-full h-48 object-cover rounded-md mb-4"
                          />
                        )}
                        {selectedVideo.description && (
                          <p className="text-sm text-muted-foreground mb-4">{selectedVideo.description}</p>
                        )}
                        {selectedVideo.category && (
                          <div className="mb-4">
                            <Badge className="bg-primary text-white">{selectedVideo.category}</Badge>
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">集数列表</h3>
                            <Button size="sm" onClick={() => setShowEpisodeForm(true)}>
                              <Plus className="h-4 w-4 mr-1" />
                              添加分集
                            </Button>
                          </div>
                          {loadingEpisodes ? (
                            // 分集加载骨架屏
                            <div className="space-y-2">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                                  <div className="flex-1">
                                    <div className="h-5 bg-gray-200 animate-pulse rounded w-48" />
                                  </div>
                                  <div className="flex gap-2">
                                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded" />
                                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded" />
                                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded" />
                                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              {selectedVideo.episodes.map((episode) => (
                                <div key={episode.id}>
                                  {editingEpisodeId === episode.id ? (
                                    <div className="p-3 rounded-lg border space-y-3">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <Label className="text-xs">集数</Label>
                                          <Input
                                            type="number"
                                            value={episodeNumber}
                                            onChange={(e) => setEpisodeNumber(e.target.value)}
                                            className="h-8"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs">标题</Label>
                                          <Input
                                            value={episodeTitle}
                                            onChange={(e) => setEpisodeTitle(e.target.value)}
                                            className="h-8"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={() => saveEpisodeEdit(episode.id)} className="flex-1">保存</Button>
                                        <Button size="sm" variant="secondary" onClick={cancelEditingEpisode} className="flex-1">取消</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between p-3 rounded-lg border">
                                      <div>
                                        <p className="font-medium">
                                          第{episode.episode_number}集 - {episode.title}
                                        </p>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handlePreviewClick(episode)}
                                        >
                                          <Play className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEditingEpisode(episode)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleUploadClick(episode)}
                                        >
                                          <Upload className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteEpisode(episode.id)}
                                        >
                                          <Trash className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <VideoIcon className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">选择一个视频查看详情</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Video Form Dialog */}
      <Dialog open={showVideoForm} onOpenChange={setShowVideoForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>创建视频</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateVideo} className="space-y-4">
            <div>
              <Label>标题</Label>
              <Input
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>简介</Label>
              <Textarea
                value={videoDesc}
                onChange={(e) => setVideoDesc(e.target.value)}
              />
            </div>
            <div>
              <Label>分区</Label>
              <Select value={videoCategory || undefined} onValueChange={(value) => setVideoCategory(value || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分区" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">创建</Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => {
                setShowVideoForm(false);
                setVideoTitle('');
                setVideoDesc('');
                setVideoCategory('');
              }}>
                取消
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Episode Form Dialog */}
      <Dialog open={showEpisodeForm} onOpenChange={setShowEpisodeForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>添加分集</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEpisode} className="space-y-4">
            <div>
              <Label>集数</Label>
              <Input
                type="number"
                value={episodeNumber}
                onChange={(e) => setEpisodeNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>标题</Label>
              <Input
                value={episodeTitle}
                onChange={(e) => setEpisodeTitle(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">添加</Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowEpisodeForm(false)}>
                取消
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Video Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        if (!open && videoPreviewUrl) {
          // Clean up preview URL when dialog closes
          URL.revokeObjectURL(videoPreviewUrl);
          setVideoPreviewUrl('');
        }
        setShowUploadDialog(open);
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>上传视频</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {uploadingEpisode && (
              <div className="text-sm text-muted-foreground">
                第{uploadingEpisode.episode_number}集 - {uploadingEpisode.title}
              </div>
            )}
            <div>
              <Label>选择视频文件</Label>
              <div className="mt-2">
                {videoFile ? (
                  <div className="space-y-3">
                    {/* File Info */}
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <VideoIcon className="h-8 w-8 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{videoFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        {!isUploading && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (videoPreviewUrl) {
                                URL.revokeObjectURL(videoPreviewUrl);
                              }
                              setVideoFile(null);
                              setVideoPreviewUrl('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* Video Preview */}
                    {videoPreviewUrl && (
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <video
                          className="w-full h-full"
                          controls
                          src={videoPreviewUrl}
                          key={videoPreviewUrl}
                        >
                          您的浏览器不支持视频播放
                        </video>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-all hover:bg-gray-50"
                    onClick={() => videoInputRef.current?.click()}
                    onDrop={handleVideoDrop}
                    onDragOver={handleVideoDragOver}
                  >
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      点击选择或拖拽视频文件到此处
                    </p>
                    <p className="text-xs text-muted-foreground">
                      支持 MP4, MKV, AVI 等格式
                    </p>
                  </div>
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoFileChange}
                  disabled={isUploading}
                />
              </div>
            </div>
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>上传进度</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">分片进度:</span> {uploadStats.current}/{uploadStats.total}
                  </div>
                  <div className="text-right">
                    <span className="font-medium">上传速度:</span> {uploadSpeed > 0 ? `${uploadSpeed.toFixed(2)} MB/s` : '计算中...'}
                  </div>
                </div>
                {retryStatus ? (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center font-medium bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                    {retryStatus}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">
                    正在并行上传 (最多3个分片同时进行)，请勿关闭窗口...
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleUploadVideo}
                className="flex-1"
                disabled={!videoFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    上传中...
                  </>
                ) : (
                  '开始上传'
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  // Clean up preview URL
                  if (videoPreviewUrl) {
                    URL.revokeObjectURL(videoPreviewUrl);
                  }
                  setShowUploadDialog(false);
                  setVideoFile(null);
                  setVideoPreviewUrl('');
                  setUploadProgress(0);
                }}
                disabled={isUploading}
              >
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Video Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>视频预览</DialogTitle>
          </DialogHeader>
          {previewingEpisode && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                第{previewingEpisode.episode_number}集 - {previewingEpisode.title}
              </div>
              <div className="aspect-video bg-black rounded-md overflow-hidden">
                {previewingEpisode.stream_url ? (
                  <video
                    className="w-full h-full"
                    controls
                    autoPlay
                    src={previewingEpisode.stream_url}
                    key={previewingEpisode.stream_url}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-white">视频未上传</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cover Upload Dialog */}
      <Dialog open={showCoverUploadDialog} onOpenChange={setShowCoverUploadDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>上传封面</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedVideo && selectedVideo.cover_url && (
              <div>
                <Label>当前封面</Label>
                <img
                  src={getFullUrl(selectedVideo.cover_url)}
                  alt="Current cover"
                  className="w-full h-48 object-cover rounded-md mt-2"
                />
              </div>
            )}
            <div>
              <Label>选择新封面</Label>
              <div className="mt-2">
                {coverPreview ? (
                  <div className="relative">
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-48 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">点击上传或粘贴封面图片</p>
                  </div>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUploadCover}
                className="flex-1"
                disabled={!coverFile}
              >
                上传
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowCoverUploadDialog(false);
                  setCoverFile(null);
                  setCoverPreview('');
                }}
              >
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
