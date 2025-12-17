import { useState } from 'react';
import { Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { userApi } from '@/api';
import { toast } from '@/hooks/use-toast';

export default function UserLoginPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleOAuthLogin = async (provider: 'github' | 'linuxdo') => {
    setLoading(provider);
    try {
      const redirectUri = `${window.location.origin}/login/callback`;
      const response = await userApi.getOAuthUrl(provider, redirectUri);

      // Store provider in session storage for callback
      sessionStorage.setItem('oauth_provider', provider);

      // Redirect to OAuth provider
      window.location.href = response.data.authorize_url;
    } catch (error: any) {
      console.error('OAuth login failed:', error);
      toast({
        variant: 'destructive',
        title: '登录失败',
        description: error.response?.data?.detail || '无法连接到认证服务',
      });
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Header showSearch={false} showCategories={false} />

      <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <Card className="w-full max-w-[360px] shadow-lg">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              登录
            </CardTitle>
            <CardDescription className="text-sm">
              选择一个平台登录以使用完整功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {/* GitHub Login */}
            <Button
              variant="outline"
              className="w-full h-11 border-pink-200 hover:bg-pink-50 hover:border-pink-300 transition-colors"
              onClick={() => handleOAuthLogin('github')}
              disabled={loading !== null}
            >
              <Github className="mr-2 h-5 w-5" />
              {loading === 'github' ? '跳转中...' : '使用 GitHub 登录'}
            </Button>

            {/* Linux.do Login */}
            <Button
              variant="outline"
              className="w-full h-11 border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-colors"
              onClick={() => handleOAuthLogin('linuxdo')}
              disabled={loading !== null}
            >
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              {loading === 'linuxdo' ? '跳转中...' : '使用 Linux.do 登录'}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-pink-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  或者
                </span>
              </div>
            </div>

            {/* Guest mode */}
            <Button
              variant="ghost"
              className="w-full hover:bg-pink-50 hover:text-pink-600 transition-colors"
              onClick={() => window.location.href = '/'}
            >
              以游客身份继续浏览
            </Button>

            <p className="text-xs text-center text-muted-foreground pt-2">
              登录后可以收藏视频、记录观看历史和发表评论
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
