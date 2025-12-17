import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { userApi } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let handled = false;

    const handleCallback = async () => {
      if (handled) return;
      handled = true;

      const code = searchParams.get('code');
      const provider = sessionStorage.getItem('oauth_provider');

      if (!code) {
        setError('未收到授权码');
        return;
      }

      if (!provider) {
        setError('未找到 OAuth 提供商信息');
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/login/callback`;
        const response = await userApi.oauthCallback(code, provider, redirectUri);

        // Login successful
        login(response.data.access_token, response.data.user);

        // Clear provider from session
        sessionStorage.removeItem('oauth_provider');

        toast({
          title: '登录成功',
          description: `欢迎回来，${response.data.user.name || response.data.user.username}！`,
        });

        // Redirect to home or intended page
        const intendedPath = sessionStorage.getItem('intended_path') || '/';
        sessionStorage.removeItem('intended_path');
        navigate(intendedPath);
      } catch (error: any) {
        console.error('OAuth callback failed:', error);
        const errorMessage = error.response?.data?.detail || '登录失败，请重试';
        setError(errorMessage);

        toast({
          variant: 'destructive',
          title: '登录失败',
          description: errorMessage,
        });

        // Redirect to login page after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header />
      <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-20">
        <div className="text-center space-y-4">
          {error ? (
            <>
              <div className="text-red-500 text-lg font-semibold">
                {error}
              </div>
              <p className="text-muted-foreground">
                正在跳转到登录页面...
              </p>
            </>
          ) : (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <h2 className="text-2xl font-semibold">正在登录...</h2>
              <p className="text-muted-foreground">
                请稍候，我们正在验证您的身份
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
