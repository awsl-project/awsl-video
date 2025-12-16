import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'video.other' | 'article';
  keywords?: string;
  video?: {
    title: string;
    description?: string;
    thumbnailUrl?: string;
    duration?: number;
    uploadDate?: string;
    embedUrl?: string;
  };
  breadcrumbs?: Array<{
    name: string;
    url: string;
  }>;
}

export function SEO({
  title = 'Awsl Video',
  description = '在线视频平台，观看精彩视频内容',
  image,
  url,
  type = 'website',
  keywords,
  video,
  breadcrumbs,
}: SEOProps) {
  const fullTitle = title === 'Awsl Video' ? title : `${title} - Awsl Video`;
  const fullUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Convert relative image URLs to absolute URLs for social media
  const getAbsoluteImageUrl = (imgUrl?: string): string | undefined => {
    if (!imgUrl) return undefined;
    if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
      return imgUrl;
    }
    // Convert relative URL to absolute
    if (typeof window !== 'undefined') {
      return new URL(imgUrl, window.location.origin).href;
    }
    return imgUrl;
  };

  const absoluteImageUrl = getAbsoluteImageUrl(image);
  const absoluteVideoThumbnail = getAbsoluteImageUrl(video?.thumbnailUrl);

  // Generate JSON-LD structured data
  const generateStructuredData = () => {
    const structuredData: any[] = [];

    // Website/Organization schema
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Awsl Video',
      url: siteUrl,
      description: '在线视频平台，观看精彩视频内容',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteUrl}/?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    });

    // Breadcrumb schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      });
    }

    // Video schema for video pages
    if (video && type === 'video.other') {
      const videoSchema: any = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: video.title,
        description: video.description || description,
        thumbnailUrl: absoluteVideoThumbnail || absoluteImageUrl,
        uploadDate: video.uploadDate,
      };

      if (video.duration) {
        // Convert seconds to ISO 8601 duration format (PT#M#S)
        const minutes = Math.floor(video.duration / 60);
        const seconds = video.duration % 60;
        videoSchema.duration = `PT${minutes}M${seconds}S`;
      }

      if (video.embedUrl) {
        videoSchema.embedUrl = video.embedUrl;
      }

      structuredData.push(videoSchema);
    }

    return structuredData;
  };

  const structuredData = generateStructuredData();

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      {absoluteImageUrl && <meta property="og:image" content={absoluteImageUrl} />}
      {absoluteImageUrl && <meta property="og:image:secure_url" content={absoluteImageUrl} />}
      {absoluteImageUrl && <meta property="og:image:width" content="1200" />}
      {absoluteImageUrl && <meta property="og:image:height" content="630" />}
      {absoluteImageUrl && <meta property="og:image:alt" content={fullTitle} />}
      <meta property="og:site_name" content="Awsl Video" />
      <meta property="og:locale" content="zh_CN" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={absoluteImageUrl ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {absoluteImageUrl && <meta name="twitter:image" content={absoluteImageUrl} />}
      {absoluteImageUrl && <meta name="twitter:image:alt" content={fullTitle} />}

      {/* Video-specific Open Graph Tags */}
      {video && type === 'video.other' && (
        <>
          {video.title && <meta property="og:video:title" content={video.title} />}
          {absoluteVideoThumbnail && <meta property="og:image" content={absoluteVideoThumbnail} />}
          {video.duration && <meta property="video:duration" content={video.duration.toString()} />}
          {video.uploadDate && <meta property="video:release_date" content={video.uploadDate} />}
        </>
      )}

      {/* Additional SEO Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      <link rel="canonical" href={fullUrl} />

      {/* Structured Data (JSON-LD) */}
      {structuredData.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}
