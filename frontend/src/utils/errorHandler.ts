import { toast } from '@/hooks/use-toast';

/**
 * Toast 错误管理器
 * 防止相同错误在短时间内重复显示
 */
export class ErrorToastManager {
  // 缓存最近显示的 toast，key 为 "status-message"
  private static toastCache = new Map<string, number>();

  // 防抖时间间隔（毫秒）
  private static readonly DEBOUNCE_MS = 5000;

  // 最大同时显示的 toast 数量
  private static readonly MAX_TOASTS = 3;

  // 当前活跃的 toast 数量
  private static activeCount = 0;

  /**
   * 显示错误 Toast（带防抖）
   * @param status HTTP 状态码
   * @param message 错误消息
   */
  static showError(status: number, message: string): void {
    const key = `${status}-${message}`;
    const now = Date.now();
    const lastShown = this.toastCache.get(key) || 0;

    // 检查是否在防抖期内
    if (now - lastShown < this.DEBOUNCE_MS) {
      return;
    }

    // 检查是否达到最大显示数量
    if (this.activeCount >= this.MAX_TOASTS) {
      return;
    }

    // 更新缓存和计数
    this.toastCache.set(key, now);
    this.activeCount++;

    // 显示 toast
    toast({
      variant: 'destructive',
      title: `错误 ${status}`,
      description: message,
      duration: 5000, // 5秒后自动关闭
    });

    // 5秒后减少计数
    setTimeout(() => {
      this.activeCount = Math.max(0, this.activeCount - 1);
    }, 5000);
  }

  /**
   * 显示网络错误 Toast
   */
  static showNetworkError(): void {
    this.showError(0, '无法连接到服务器，请检查网络连接');
  }

  /**
   * 清理过期的缓存记录（可选，用于长时间运行的应用）
   */
  static cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.toastCache.forEach((timestamp, key) => {
      if (now - timestamp > this.DEBOUNCE_MS * 2) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.toastCache.delete(key));
  }

  /**
   * 重置管理器状态（主要用于测试）
   */
  static reset(): void {
    this.toastCache.clear();
    this.activeCount = 0;
  }
}

// 每分钟清理一次过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    ErrorToastManager.cleanup();
  }, 60000);
}
