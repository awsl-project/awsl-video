import { useEffect, useState } from 'react';
import { Home, Search } from 'lucide-react';
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
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button
            variant={isHomePage && currentCategory === '' ? 'default' : 'ghost'}
            size="sm"
            onClick={handleHomeClick}
            className="gap-2 flex-shrink-0"
          >
            <Home className="h-4 w-4" />
            首页
          </Button>

          {showCategories && categories.length > 0 && (
            <nav className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={currentCategory === cat ? 'default' : 'ghost'}
                  size="sm"
                  className="whitespace-nowrap flex-shrink-0"
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </Button>
              ))}
            </nav>
          )}
        </div>

        {showSearch && (
          <div className="relative w-64 flex-shrink-0">
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
        )}

        <UserMenu />
      </div>
    </header>
  );
}
