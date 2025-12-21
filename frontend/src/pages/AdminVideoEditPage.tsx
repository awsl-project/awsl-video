import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, LogOut, Plus, Video as VideoIcon, Loader2, Upload, Trash, Image as ImageIcon, X, Edit, Play, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { videoApi, getFullUrl, type VideoWithEpisodes, type Episode } from '../api';
import { toast } from '@/hooks/use-toast';

export default function AdminVideoEditPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const [video, setVideo] = useState<VideoWithEpisodes | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [showEpisodeForm, setShowEpisodeForm] = useState(false);
  const [editingEpisodeId, setEditingEpisodeId] = useState<number | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showCoverUploadDialog, setShowCoverUploadDialog] = useState(false);

  // Form state
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
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [uploadStats, setUploadStats] = useState({ current: 0, total: 0 });
  const [retryStatus, setRetryStatus] = useState<string>('');
  const [previewingEpisode, setPreviewingEpisode] = useState<Episode | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

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
    if (videoId) {
      fetchVideoDetail(parseInt(videoId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!showCoverUploadDialog) return;
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
  }, [showCoverUploadDialog]);

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

  const fetchVideoDetail = async (id: number) => {
    setLoading(true);
    try {
      const response = await videoApi.getVideo(id, true);
      setVideo(response.data);
    } catch (error: any) {
      console.error('Failed to fetch video details');
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      } else {
        toast({
          variant: "destructive",
          title: "错误",
          description: "加载视频失败",
        });
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const handleCoverFile = (file: File) => {
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({
        variant: "destructive",
        title: "文件过大",
        description: "封面图片不能超过 2MB",
      });
      return;
    }

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

  const startEditingVideo = () => {
    if (!video) return;
    setVideoTitle(video.title);
    setVideoDesc(video.description || '');
    setVideoCategory(video.category || '');
    setIsEditingVideo(true);
  };

  const cancelEditingVideo = () => {
    setIsEditingVideo(false);
    setVideoTitle('');
    setVideoDesc('');
    setVideoCategory('');
  };

  const saveVideoEdit = async () => {
    if (!video) return;

    try {
      await videoApi.updateVideo(video.id, {
        title: videoTitle,
        description: videoDesc,
        category: videoCategory
      });

      toast({
        variant: "success",
        title: "成功",
        description: "视频信息更新成功",
      });

      setIsEditingVideo(false);
      setVideoTitle('');
      setVideoDesc('');
      setVideoCategory('');
      fetchVideoDetail(video.id);
    } catch (error) {
      console.error('Failed to update video');
      toast({
        variant: "destructive",
        title: "错误",
        description: "更新视频失败",
      });
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm('确定删除该视频吗？此操作不可恢复！')) return;
    try {
      await videoApi.deleteVideo(videoId);

      toast({
        variant: "success",
        title: "成功",
        description: "视频删除成功",
      });

      navigate('/admin');
    } catch (error) {
      console.error('Failed to delete video');
      toast({
        variant: "destructive",
        title: "错误",
        description: "删除视频失败",
      });
    }
  };

  const handleUploadCover = async () => {
    if (!coverFile || !video) return;

    try {
      const formData = new FormData();
      formData.append('cover', coverFile);

      await videoApi.uploadCover(video.id, formData);

      toast({
        variant: "success",
        title: "成功",
        description: "封面上传成功",
      });

      setShowCoverUploadDialog(false);
      setCoverFile(null);
      setCoverPreview('');
      fetchVideoDetail(video.id);
    } catch (error) {
      console.error('Failed to upload cover:', error);
      toast({
        variant: "destructive",
        title: "错误",
        description: "上传封面失败",
      });
    }
  };

  const handleCreateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return;
    try {
      await videoApi.createEpisode(video.id, {
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
      fetchVideoDetail(video.id);
    } catch (error) {
      console.error('Failed to create episode');
      toast({
        variant: "destructive",
        title: "错误",
        description: "创建分集失败",
      });
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

      if (video) {
        fetchVideoDetail(video.id);
      }
    } catch (error) {
      console.error('Failed to delete episode');
      toast({
        variant: "destructive",
        title: "错误",
        description: "删除分集失败",
      });
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

      toast({
        variant: "success",
        title: "成功",
        description: "分集信息更新成功",
      });

      setEditingEpisodeId(null);
      setEpisodeNumber('');
      setEpisodeTitle('');

      if (video) {
        fetchVideoDetail(video.id);
      }
    } catch (error) {
      console.error('Failed to update episode');
      toast({
        variant: "destructive",
        title: "错误",
        description: "更新分集失败",
      });
    }
  };

  const handleUploadClick = (episode: Episode) => {
    setUploadingEpisode(episode);
    setShowUploadDialog(true);
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }

      setVideoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(previewUrl);
    }
  };

  const handleVideoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }

      setVideoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(previewUrl);
    }
  };

  const handleVideoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUploadVideo = async () => {
    if (!videoFile || !uploadingEpisode || !video) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadSpeed(0);
    setUploadStats({ current: 0, total: 0 });
    setRetryStatus('');

    const startTime = Date.now();

    try {
      const tokenResponse = await videoApi.getUploadToken();
      const { token, storage_url } = tokenResponse.data;

      const CHUNK_SIZE = 10 * 1024 * 1024;
      const MAX_CONCURRENT = 3;
      const MAX_RETRIES = 5;
      const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);
      const chunks: Array<{ chunk_index: number; file_id: string; file_size: number } | undefined> = new Array(totalChunks);

      const fileExtension = videoFile.name.substring(videoFile.name.lastIndexOf('.'));
      const fileName = `${video.title}_EP${uploadingEpisode.episode_number}_${uploadingEpisode.title}${fileExtension}`;

      const uploadId = `${uploadingEpisode.id}_${fileName}_${videoFile.size}`;
      const storageKey = `upload_${uploadId}`;

      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          if (parsed.fileName === fileName && parsed.totalChunks === totalChunks && parsed.fileSize === videoFile.size) {
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
            }
          }
        } catch (e) {
          console.warn('Failed to parse saved upload state:', e);
        }
      }

      setUploadStats({ current: chunks.filter(c => c !== undefined).length, total: totalChunks });

      const parseRetryAfter = (errorMessage: string): number | null => {
        const match = errorMessage.match(/retry after (\d+)/i);
        return match ? parseInt(match[1]) : null;
      };

      const uploadChunk = async (chunkIndex: number): Promise<void> => {
        if (chunks[chunkIndex]) {
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
        let rateLimitRetries = 0;

        for (let retry = 0; retry < MAX_RETRIES; retry++) {
          try {
            const uploadResponse = await fetch(`${storage_url}/api/upload`, {
              method: 'POST',
              headers: {
                'X-Api-Token': token,
              },
              body: formData,
            });

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
                rateLimitRetries++;
                const waitSeconds = Math.min(retryAfter, 120);
                setRetryStatus(`速率限制：等待 ${waitSeconds} 秒后重试分片 ${chunkIndex + 1}/${totalChunks} (速率限制重试 #${rateLimitRetries})`);

                for (let i = waitSeconds; i > 0; i--) {
                  setRetryStatus(`速率限制：等待 ${i} 秒后重试分片 ${chunkIndex + 1}/${totalChunks} (速率限制重试 #${rateLimitRetries})`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
                setRetryStatus('');

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

            const fileId = uploadResult.files[0].file_id;
            chunks[chunkIndex] = {
              chunk_index: chunkIndex,
              file_id: fileId,
              file_size: chunkSize,
            };

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

            const completedChunks = chunks.filter(c => c !== undefined).length;
            const uploadedBytes = chunks.filter(c => c !== undefined).reduce((sum, c) => sum + c!.file_size, 0);
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const speedMBps = elapsedSeconds > 0 ? (uploadedBytes / 1024 / 1024) / elapsedSeconds : 0;
            setUploadSpeed(speedMBps);

            const progress = Math.floor((completedChunks / totalChunks) * 85);
            setUploadProgress(progress);
            setUploadStats({ current: completedChunks, total: totalChunks });

            return;
          } catch (error) {
            lastError = error as Error;

            if (retry < MAX_RETRIES - 1) {
              const delayMs = Math.min(Math.pow(2, retry) * 1000, 16000);
              setRetryStatus(`分片 ${chunkIndex + 1}/${totalChunks} 失败，${(delayMs / 1000).toFixed(0)}秒后重试 (尝试 ${retry + 2}/${MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              setRetryStatus('');
            }
          }
        }

        throw new Error(
          `分片 ${chunkIndex + 1}/${totalChunks} 上传失败（已重试 ${MAX_RETRIES} 次）: ${lastError?.message || '未知错误'}`
        );
      };

      for (let i = 0; i < totalChunks; i += MAX_CONCURRENT) {
        const batch = [];
        for (let j = i; j < Math.min(i + MAX_CONCURRENT, totalChunks); j++) {
          batch.push(uploadChunk(j));
        }
        await Promise.all(batch);
      }

      setUploadProgress(90);
      const finalChunks = chunks.filter(c => c !== undefined) as Array<{ chunk_index: number; file_id: string; file_size: number }>;
      await videoApi.finalizeVideoUpload(uploadingEpisode.id, finalChunks);

      setUploadProgress(100);
      localStorage.removeItem(storageKey);

      const totalTime = (Date.now() - startTime) / 1000;
      const finalSpeed = (videoFile.size / 1024 / 1024) / totalTime;

      toast({
        variant: "success",
        title: "成功",
        description: `视频上传成功 (平均速度: ${finalSpeed.toFixed(2)} MB/s)`,
      });

      setShowUploadDialog(false);
      setVideoFile(null);
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      setVideoPreviewUrl('');
      setUploadProgress(0);
      setUploadSpeed(0);
      setUploadStats({ current: 0, total: 0 });
      setRetryStatus('');
      setUploadingEpisode(null);

      if (video) {
        fetchVideoDetail(video.id);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <VideoIcon className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">管理后台</h1>
            </div>
          </div>
        </header>
        <div className="container py-8">
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <VideoIcon className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">管理后台</h1>
            </div>
          </div>
        </header>
        <div className="container py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <VideoIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-4">视频未找到</p>
            <Button onClick={() => navigate('/admin')}>返回列表</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-primary">编辑视频</h1>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回列表
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              返回主页
            </Button>
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Video Information */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  {!isEditingVideo ? (
                    <>
                      <CardTitle>{video.title}</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteVideo(video.id)}>
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
                        rows={5}
                        placeholder="请输入视频简介，支持多行文本"
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
                    {video.cover_url && (
                      <div className="relative aspect-[16/10] overflow-hidden rounded-md mb-4 bg-gradient-to-br from-pink-50 to-gray-100 max-w-sm">
                        <img
                          src={getFullUrl(video.cover_url)}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {video.description && (
                      <p className="text-sm text-muted-foreground mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                        {video.description}
                      </p>
                    )}
                    {video.category && (
                      <div>
                        <Badge className="bg-primary text-white">{video.category}</Badge>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Episodes List */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>集数列表</CardTitle>
                  <Button size="sm" onClick={() => setShowEpisodeForm(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    添加
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {video.episodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <p className="text-sm mb-4">暂无分集</p>
                    <Button size="sm" onClick={() => setShowEpisodeForm(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加第一集
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {video.episodes.map((episode) => (
                      <div key={episode.id}>
                        {editingEpisodeId === episode.id ? (
                          <div className="p-3 rounded-lg border space-y-3 bg-gray-50">
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
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveEpisodeEdit(episode.id)} className="flex-1">保存</Button>
                              <Button size="sm" variant="secondary" onClick={cancelEditingEpisode} className="flex-1">取消</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm leading-tight flex-1">
                                第{episode.episode_number}集 - {episode.title}
                              </p>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePreviewClick(episode)}
                                  disabled={!episode.stream_url}
                                  className="h-8 px-2"
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditingEpisode(episode)}
                                  className="h-8 px-2"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUploadClick(episode)}
                                  className="h-8 px-2"
                                >
                                  <Upload className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEpisode(episode.id)}
                                  className="h-8 px-2"
                                >
                                  <Trash className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

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
            {video.cover_url && (
              <div>
                <Label>当前封面</Label>
                <div className="relative aspect-[16/10] overflow-hidden rounded-md mt-2 bg-gradient-to-br from-pink-50 to-gray-100">
                  <img
                    src={getFullUrl(video.cover_url)}
                    alt="Current cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            <div>
              <Label>选择新封面</Label>
              <div className="mt-2">
                {coverPreview ? (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-gradient-to-br from-pink-50 to-gray-100">
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
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
