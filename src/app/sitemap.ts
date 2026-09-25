import type { MetadataRoute } from 'next';
import { getProfile } from '@/lib/content/collections';
import { contentPaths } from '@/lib/content/routes';
import { siteIsIndexable } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const { siteUrl } = getProfile();
  if (!siteUrl || !siteIsIndexable()) return [];
  const base = siteUrl.replace(/\/$/, '');
  return contentPaths().map((path) => ({ url: path === '/' ? base : `${base}${path}` }));
}
