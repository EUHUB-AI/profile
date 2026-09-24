import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { Profile } from '@/lib/content/collections';
import type { MotdSummary } from '@/lib/tui/motd';
import { MotdPlayback } from './MotdPlayback';

export function Motd({ profile, summary, asOf }: { profile: Profile; summary: MotdSummary; asOf: string }) {
  const lines: ReactNode[] = [
    `Welcome to ${profile.host} (GNU/Life, SRE edition)`,
    '',
    ` * Role:      ${profile.role}`,
    <>
      {' * Contact:   '}
      <a href="#contact" data-nav-item>
        finger {profile.handle}
      </a>
    </>,
    '',
    `  System information as of ${asOf}`,
    '',
    <>
      {'  Reading:     '}
      <Link href="/books" data-nav-item>
        {summary.reading} in progress
      </Link>
    </>,
    <>
      {'  Countries:   '}
      <Link href="/travel" data-nav-item>
        {summary.countries} visited
      </Link>
    </>,
    <>
      {'  Languages:   '}
      <Link href="/languages" data-nav-item>
        {summary.languagesRunning} of {summary.languagesTotal} in rollout
      </Link>
    </>,
    summary.streak ? (
      <>
        {'  Streak:      '}
        <Link href="/sport" data-nav-item>
          {summary.streak.days} days ({summary.streak.sport.toLowerCase()})
        </Link>
      </>
    ) : null,
    <>
      {'  Services:    '}
      <Link href="/hobbies" data-nav-item>
        {summary.hobbiesActive} of {summary.hobbiesTotal} hobbies active
      </Link>
    </>,
    '',
    summary.nowReading ? (
      <>
        {'  Now reading: '}
        <Link href={`/books/${summary.nowReading.slug}`} data-nav-item>
          {summary.nowReading.title}
        </Link>
        {` (${summary.nowReading.progress}%)`}
      </>
    ) : null,
    summary.lastTrip ? (
      <>
        {'  Last hop:    '}
        <Link href={`/travel/${summary.lastTrip.slug}`} data-nav-item>
          {summary.lastTrip.host}
        </Link>
        {` (${summary.lastTrip.start})`}
      </>
    ) : null,
  ].filter((line) => line !== null);

  return (
    <>
      <pre className="motd">
        {lines.map((line, i) => (
          <span key={i} className="motd-line" style={{ '--i': i } as CSSProperties}>
            {line}
            {'\n'}
          </span>
        ))}
      </pre>
      <MotdPlayback />
    </>
  );
}
