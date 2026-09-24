import type { Metadata } from 'next';
import { Martian_Mono } from 'next/font/google';
import { TuiFrame } from '@/components/shell/TuiFrame';
import { getProfile } from '@/lib/content/collections';
import { bootScript } from '@/lib/theme';
import './globals.css';

const martian = Martian_Mono({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  variable: '--font-martian',
  display: 'swap',
});

export function generateMetadata(): Metadata {
  const profile = getProfile();
  return {
    ...(profile.siteUrl ? { metadataBase: new URL(profile.siteUrl) } : {}),
    title: { default: `${profile.name} | ${profile.role}`, template: `%s | ${profile.name}` },
    description: `${profile.name}, ${profile.role}. Career, plus the books, travel, languages, sport and hobbies in between.`,
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = getProfile();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className={martian.variable}>
        <TuiFrame profile={profile}>{children}</TuiFrame>
      </body>
    </html>
  );
}
