// The site stays hidden from search engines and AI crawlers unless the build sets
// SITE_INDEXABLE=true. Read at build time: robots.txt, the sitemap and pages are static.
export function siteIsIndexable(): boolean {
  return process.env.SITE_INDEXABLE === 'true';
}

export const BLOCKED_AGENTS = [
  '*',
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'meta-externalagent',
  'Amazonbot',
];
