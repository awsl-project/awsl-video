import { toast } from "@/hooks/use-toast";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * 包装 API 调用，自动处理错误和成功提示
 */
export async function withToast<T>(
  apiCall: () => Promise<T>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    showSuccess?: boolean;
  }
): Promise<T | null> {
  const {
    successMessage = "操作成功",
    errorMessage,
    showSuccess = true,
  } = options || {};

  try {
    const result = await apiCall();

    if (showSuccess) {
      toast({
        variant: "success",
        title: "成功",
        description: successMessage,
      });
    }

    return result;
  } catch (error: any) {
    const message =
      errorMessage ||
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      "操作失败，请稍后重试";

    toast({
      variant: "destructive",
      title: "错误",
      description: message,
    });

    console.error("API Error:", error);
    return null;
  }
}

/**
 * 仅显示错误提示的包装函数（不显示成功提示）
 */
export async function withErrorToast<T>(
  apiCall: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> {
  return withToast(apiCall, {
    errorMessage,
    showSuccess: false,
  });
}
