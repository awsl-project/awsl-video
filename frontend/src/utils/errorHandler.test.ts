import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorToastManager } from './errorHandler';
import { toast } from '@/hooks/use-toast';

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('ErrorToastManager', () => {
  beforeEach(() => {
    // 重置管理器状态
    ErrorToastManager.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should show error toast', () => {
    ErrorToastManager.showError(404, '资源不存在');

    expect(toast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: '错误 404',
      description: '资源不存在',
      duration: 5000,
    });
  });

  it('should debounce same error within 5 seconds', () => {
    // 显示第一次错误
    ErrorToastManager.showError(404, '资源不存在');
    expect(toast).toHaveBeenCalledTimes(1);

    // 立即再次显示相同错误，应该被防抖
    ErrorToastManager.showError(404, '资源不存在');
    expect(toast).toHaveBeenCalledTimes(1);

    // 显示不同的错误，应该正常显示
    ErrorToastManager.showError(500, '服务器错误');
    expect(toast).toHaveBeenCalledTimes(2);
  });

  it('should show same error after debounce period', () => {
    vi.useFakeTimers();

    // 显示第一次错误
    ErrorToastManager.showError(404, '资源不存在');
    expect(toast).toHaveBeenCalledTimes(1);

    // 5秒后再次显示相同错误，应该正常显示
    vi.advanceTimersByTime(5001);
    ErrorToastManager.showError(404, '资源不存在');
    expect(toast).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('should limit maximum concurrent toasts', () => {
    // 显示3个不同的错误（达到最大数量）
    ErrorToastManager.showError(400, '请求错误');
    ErrorToastManager.showError(404, '资源不存在');
    ErrorToastManager.showError(500, '服务器错误');
    expect(toast).toHaveBeenCalledTimes(3);

    // 尝试显示第4个错误，应该被限制
    ErrorToastManager.showError(503, '服务不可用');
    expect(toast).toHaveBeenCalledTimes(3);
  });

  it('should show network error', () => {
    ErrorToastManager.showNetworkError();

    expect(toast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: '错误 0',
      description: '无法连接到服务器，请检查网络连接',
      duration: 5000,
    });
  });

  it('should cleanup expired cache entries', () => {
    vi.useFakeTimers();

    // 添加一些缓存项
    ErrorToastManager.showError(404, '错误1');
    ErrorToastManager.showError(500, '错误2');

    // 推进时间超过清理阈值（防抖时间的2倍）
    vi.advanceTimersByTime(10001);

    // 调用清理
    ErrorToastManager.cleanup();

    // 现在应该可以再次显示相同的错误
    ErrorToastManager.showError(404, '错误1');
    expect(toast).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it('should allow showing error after toast duration', () => {
    vi.useFakeTimers();

    // 显示3个不同的错误（达到最大数量）
    ErrorToastManager.showError(400, '错误1');
    ErrorToastManager.showError(404, '错误2');
    ErrorToastManager.showError(500, '错误3');
    expect(toast).toHaveBeenCalledTimes(3);

    // 5秒后toast自动关闭，计数器应该减少
    vi.advanceTimersByTime(5000);

    // 现在应该可以显示新的错误
    ErrorToastManager.showError(503, '错误4');
    expect(toast).toHaveBeenCalledTimes(4);

    vi.useRealTimers();
  });
});
