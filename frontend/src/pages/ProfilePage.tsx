import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || !user) {
    return (
      <>
        <Header showSearch={false} showCategories={false} />
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </div>
      </>
    );
  }

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const displayName = user.name || user.username;
  const initial = getInitial(displayName);

  const getProviderName = (provider: string) => {
    const providers: Record<string, string> = {
      github: 'GitHub',
      linuxdo: 'Linux.do',
    };
    return providers[provider] || provider;
  };

  return (
    <div className="min-h-screen">
      <Header showSearch={false} showCategories={false} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card>
            <CardHeader>
              <CardTitle>个人信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24">
                  {user.avatar_url && (
                    <AvatarImage
                      src={user.avatar_url}
                      alt={displayName}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-pink-600 text-white font-semibold text-4xl">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-2xl font-bold">{displayName}</h2>
                    <p className="text-muted-foreground">@{user.username}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {getProviderName(user.oauth_provider)}
                    </Badge>
                    {user.is_active ? (
                      <Badge variant="default" className="bg-green-500">
                        活跃
                      </Badge>
                    ) : (
                      <Badge variant="destructive">不活跃</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle>账号详情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              {user.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">邮箱地址</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              )}

              {/* OAuth Provider */}
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">登录方式</p>
                  <p className="text-sm text-muted-foreground">
                    {getProviderName(user.oauth_provider)}
                  </p>
                </div>
              </div>

              {/* Join Date */}
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">加入时间</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(user.created_at), 'PPP', { locale: zhCN })}
                  </p>
                </div>
              </div>

              {/* Last Login */}
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">最后登录</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(user.last_login), 'PPP', { locale: zhCN })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
