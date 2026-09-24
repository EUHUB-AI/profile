export interface Tab {
  key: string;
  href: string;
  label: string;
}

export const TABS: readonly Tab[] = [
  { key: '1', href: '/', label: '~' },
  { key: '2', href: '/books', label: 'books' },
  { key: '3', href: '/travel', label: 'travel' },
  { key: '4', href: '/languages', label: 'languages' },
  { key: '5', href: '/sport', label: 'sport' },
  { key: '6', href: '/hobbies', label: 'hobbies' },
];

export function activeTabHref(pathname: string): string | undefined {
  if (pathname === '/') return '/';
  const section = `/${pathname.split('/')[1]}`;
  return TABS.find((t) => t.href !== '/' && t.href === section)?.href;
}

export function promptPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '~' : `~${trimmed}`;
}
