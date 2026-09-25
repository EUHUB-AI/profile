import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { siteIsIndexable } from './site';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('hidden by default', () => {
  it('is not indexable unless SITE_INDEXABLE=true', () => {
    expect(siteIsIndexable()).toBe(false);
    vi.stubEnv('SITE_INDEXABLE', '1');
    expect(siteIsIndexable()).toBe(false);
  });

  it('robots.txt disallows everything, AI agents included, and advertises no sitemap', () => {
    const result = robots();
    expect(result.sitemap).toBeUndefined();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    expect(rules).toHaveLength(1);
    expect(rules[0].disallow).toBe('/');
    expect(rules[0].allow).toBeUndefined();
    expect(rules[0].userAgent).toEqual(expect.arrayContaining(['*', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot']));
  });

  it('sitemap.xml is empty', () => {
    expect(sitemap()).toEqual([]);
  });
});

describe('public when SITE_INDEXABLE=true', () => {
  it('robots.txt allows crawling and points at the sitemap', () => {
    vi.stubEnv('SITE_INDEXABLE', 'true');
    const result = robots();
    expect(result.rules).toEqual({ userAgent: '*', allow: '/' });
    expect(result.sitemap).toBe('https://mike.euhub.co/sitemap.xml');
  });

  it('sitemap.xml lists the site', () => {
    vi.stubEnv('SITE_INDEXABLE', 'true');
    expect(sitemap().map((e) => e.url)).toContain('https://mike.euhub.co/books');
  });
});
