import { Globe, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function RegionBlockedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-gray-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-0 shadow-2xl">
        <CardContent className="p-8 md:p-12">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Globe className="h-20 w-20 text-primary opacity-20" />
              <ShieldAlert className="h-12 w-12 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800">
            访问受限
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-center text-gray-600 mb-8">
            Access Restricted
          </p>

          {/* Message */}
          <div className="space-y-4 text-center">
            <p className="text-gray-700 leading-relaxed">
              非常抱歉，根据相关法律法规和政策要求，本服务暂不支持您所在地区访问。
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              We're sorry, but this service is currently not available in your region due to legal and policy requirements.
            </p>
          </div>

          {/* Divider */}
          <div className="my-8 border-t border-gray-200"></div>

          {/* Additional Info */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">
              如有疑问，请联系技术支持
            </p>
            <p className="text-xs text-gray-400">
              If you have any questions, please contact technical support
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              错误代码: HTTP 451 - Unavailable For Legal Reasons
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
