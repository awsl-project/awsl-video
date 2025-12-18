import { useEffect, useState, useRef } from 'react';
import { Home, Search, X } from 'lucide-react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { videoApi } from '../api';
import { UserMenu } from '@/components/UserMenu';

interface HeaderProps {
  currentCategory?: string;
  onCategoryChange?: (category: string) => void;
  onHomeClick?: () => void;
  initialSearchValue?: string;
  onSearch?: (keyword: string) => void;
  showSearch?: boolean;
  showCategories?: boolean;
}

export function Header({
  currentCategory = '',
  onCategoryChange,
  onHomeClick,
  initialSearchValue = '',
  onSearch,
  showSearch = true,
  showCategories = true,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState(initialSearchValue);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const isHomePage = location.pathname === '/';

  useEffect(() => {
    if (showCategories) {
      fetchCategories();
    }
  }, [showCategories]);

  // 同步外部搜索值变化
  useEffect(() => {
    setSearchValue(initialSearchValue);
  }, [initialSearchValue]);

  // 自动聚焦移动搜索框
  useEffect(() => {
    if (showMobileSearch && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [showMobileSearch]);

  const fetchCategories = async () => {
    try {
      const response = await videoApi.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSearchSubmit = () => {
    if (onSearch) {
      onSearch(searchValue);
    } else {
      // 默认行为：导航到首页并带上搜索参数
      navigate(`/?search=${encodeURIComponent(searchValue)}`);
    }
    // 关闭移动搜索框
    setShowMobileSearch(false);
  };

  const toggleMobileSearch = () => {
    setShowMobileSearch(!showMobileSearch);
  };

  const closeMobileSearch = () => {
    setShowMobileSearch(false);
  };

  const handleHomeClick = () => {
    if (onHomeClick) {
      onHomeClick();
    } else {
      // 默认行为：导航到首页
      navigate('/');
    }
  };

  const handleCategoryChange = (category: string) => {
    if (onCategoryChange) {
      onCategoryChange(category);
    } else {
      // 默认行为：导航到首页并带上分类参数
      const search = searchParams.get('search') || '';
      if (category) {
        navigate(`/?category=${encodeURIComponent(category)}${search ? `&search=${encodeURIComponent(search)}` : ''}`);
      } else {
        navigate(`/${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-purple-100/50 bg-gradient-to-r from-purple-50/95 via-pink-50/95 to-blue-50/95 backdrop-blur supports-[backdrop-filter]:bg-purple-50/80">
      <div className="container flex h-16 items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <Button
            variant={isHomePage && currentCategory === '' ? 'default' : 'ghost'}
            size="sm"
            onClick={handleHomeClick}
            className="gap-1 md:gap-2 flex-shrink-0 px-2 md:px-3"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">首页</span>
          </Button>

          {showCategories && categories.length > 0 && (
            <nav className="flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-hide">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={currentCategory === cat ? 'default' : 'ghost'}
                  size="sm"
                  className="whitespace-nowrap flex-shrink-0 px-2 md:px-3 text-xs md:text-sm"
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </Button>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {showSearch && (
            <>
              {/* Desktop Search - Hidden on mobile */}
              <div className="relative w-64 hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
                <Input
                  placeholder="搜索视频..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit();
                    }
                  }}
                  className="pl-9 pr-16 h-9"
                />
                {searchValue && (
                  <button
                    onClick={handleSearchSubmit}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-primary text-white hover:bg-primary/90 transition-colors rounded-md px-2.5 py-1 text-xs font-medium"
                    aria-label="Search"
                  >
                    搜索
                  </button>
                )}
              </div>

              {/* Mobile Search Button - Only visible on mobile */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileSearch}
                className="md:hidden h-9 w-9 p-0"
                aria-label="搜索"
              >
                <Search className="h-4 w-4" />
              </Button>
            </>
          )}

          <UserMenu />
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
            onClick={closeMobileSearch}
          />

          {/* Search Bar */}
          <div className="relative bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 border-b border-purple-100 p-4 animate-in slide-in-from-top">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
                <Input
                  ref={mobileSearchInputRef}
                  placeholder="搜索视频..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit();
                    } else if (e.key === 'Escape') {
                      closeMobileSearch();
                    }
                  }}
                  className="pl-9 pr-3 h-10"
                />
              </div>

              {searchValue ? (
                <Button
                  onClick={handleSearchSubmit}
                  className="h-10 px-4 bg-primary text-white hover:bg-primary/90"
                >
                  搜索
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeMobileSearch}
                  className="h-10 w-10 p-0"
                  aria-label="关闭"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
