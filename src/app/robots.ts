import type { MetadataRoute } from 'next';
import { getProfile } from '@/lib/content/collections';

export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = getProfile();
  return {
    rules: { userAgent: '*', allow: '/' },
    ...(siteUrl ? { sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml` } : {}),
  };
}
