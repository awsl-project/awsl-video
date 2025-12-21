import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { useToast } from '@/hooks/use-toast';

export function ApiInterceptor() {
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Request interceptor
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        // Add any request transformations here
        // e.g., adding auth tokens, headers, etc.
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    const responseInterceptor = api.interceptors.response.use(
      (response) => {
        // Add any response transformations here
        return response;
      },
      (error) => {
        // Handle errors globally
        const status = error.response?.status;
        const message = error.response?.data?.detail || error.message || '请求失败';

        // Handle region blocking (HTTP 451)
        if (status === 451) {
          navigate('/region-blocked');
          return Promise.reject(error);
        }

        // Don't show toast for specific status codes that are handled locally
        const skipToastForStatus = [401, 404];

        if (status && !skipToastForStatus.includes(status)) {
          let errorMessage = message;

          switch (status) {
            case 400:
              errorMessage = `请求错误: ${message}`;
              break;
            case 403:
              errorMessage = '权限不足';
              break;
            case 500:
              errorMessage = '服务器错误，请稍后重试';
              break;
            case 502:
            case 503:
              errorMessage = '服务暂时不可用，请稍后重试';
              break;
            default:
              errorMessage = message;
          }

          toast({
            variant: 'destructive',
            title: '错误',
            description: errorMessage,
          });
        }

        return Promise.reject(error);
      }
    );

    // Cleanup
    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [toast]);

  return null;
}
