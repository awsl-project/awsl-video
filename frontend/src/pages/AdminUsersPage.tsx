import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, VideoIcon, Users, Search as SearchIcon, Shield, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { videoApi } from '../api';
import { toast } from '@/hooks/use-toast';
import type { UserListItem, PaginatedUsers } from '@/types/user';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [actionType, setActionType] = useState<'grant' | 'revoke'>('grant');

  const navigate = useNavigate();
  const pageSize = 20;

  useEffect(() => {
    // Only super admin (fixed password login) can access user management
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      navigate('/admin');
      return;
    }
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    if (debouncedSearchKeyword !== undefined) {
      setPage(1);
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchKeyword]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await videoApi.getUsers(page, pageSize, debouncedSearchKeyword);
      const data: PaginatedUsers = response.data;
      setUsers(data.users);
      setTotal(data.total);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      }
      toast({
        variant: 'destructive',
        title: '错误',
        description: '加载用户列表失败',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const handleGrantAdmin = (user: UserListItem) => {
    setSelectedUser(user);
    setActionType('grant');
    setShowConfirmDialog(true);
  };

  const handleRevokeAdmin = (user: UserListItem) => {
    setSelectedUser(user);
    setActionType('revoke');
    setShowConfirmDialog(true);
  };

  const confirmAction = async () => {
    if (!selectedUser) return;

    try {
      if (actionType === 'grant') {
        await videoApi.grantAdmin(selectedUser.id);
        toast({
          variant: 'success',
          title: '成功',
          description: `已授予 ${selectedUser.username} 管理员权限`,
        });
      } else {
        await videoApi.revokeAdmin(selectedUser.id);
        toast({
          variant: 'success',
          title: '成功',
          description: `已撤销 ${selectedUser.username} 的管理员权限`,
        });
      }
      setShowConfirmDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '操作失败',
      });
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-primary">管理后台</h1>
            <nav className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                onClick={() => navigate('/admin')}
              >
                <VideoIcon className="h-4 w-4 mr-2" />
                视频管理
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary font-medium"
              >
                <Users className="h-4 w-4 mr-2" />
                用户管理
              </Button>
            </nav>
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
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="搜索用户名、姓名或邮箱..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* User List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 border animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gray-200 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32" />
                      <div className="h-3 bg-gray-200 rounded w-48" />
                    </div>
                  </div>
                  <div className="h-9 w-24 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
            <Users className="h-20 w-20 mb-4" />
            <p className="text-lg">暂无用户</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-4">
              共 <span className="font-semibold text-primary">{total}</span> 个用户
            </div>

            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="bg-white rounded-lg p-4 border hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          user.username.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{user.name || user.username}</h3>
                          {user.is_admin && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                              管理员
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>@{user.username}</span>
                          <span>{user.oauth_provider === 'github' ? 'GitHub' : 'Linux.do'}</span>
                          {user.email && <span>{user.email}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {user.is_admin ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRevokeAdmin(user)}
                        >
                          <ShieldOff className="h-4 w-4 mr-2" />
                          撤销管理员
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary hover:text-primary"
                          onClick={() => handleGrantAdmin(user)}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          设为管理员
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                >
                  上一页
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (page <= 4) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-md border transition-all ${
                          page === pageNum ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'grant' ? '授予管理员权限' : '撤销管理员权限'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'grant'
                ? `确定要授予 "${selectedUser?.username}" 管理员权限吗？该用户将能够管理视频内容。`
                : `确定要撤销 "${selectedUser?.username}" 的管理员权限吗？该用户将无法继续管理视频内容。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {actionType === 'grant' ? '授予' : '撤销'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
