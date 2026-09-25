import type { MetadataRoute } from 'next';
import { getProfile } from '@/lib/content/collections';
import { BLOCKED_AGENTS, siteIsIndexable } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  if (!siteIsIndexable()) {
    return { rules: [{ userAgent: BLOCKED_AGENTS, disallow: '/' }] };
  }
  const { siteUrl } = getProfile();
  return {
    rules: { userAgent: '*', allow: '/' },
    ...(siteUrl ? { sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml` } : {}),
  };
}
