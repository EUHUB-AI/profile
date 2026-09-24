import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { SampleTag } from '@/components/SampleTag';
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
      <SampleTag show={summary.samples.books} />
    </>,
    <>
      {'  Countries:   '}
      <Link href="/travel" data-nav-item>
        {summary.countries} visited
      </Link>
      <SampleTag show={summary.samples.trips} />
    </>,
    <>
      {'  Languages:   '}
      <Link href="/languages" data-nav-item>
        {summary.languagesRunning} of {summary.languagesTotal} in rollout
      </Link>
      <SampleTag show={summary.samples.languages} />
    </>,
    summary.streak ? (
      <>
        {'  Streak:      '}
        <Link href="/sport" data-nav-item>
          {summary.streak.days} days ({summary.streak.sport.toLowerCase()})
        </Link>
        <SampleTag show={summary.streak.sample} />
      </>
    ) : null,
    <>
      {'  Services:    '}
      <Link href="/hobbies" data-nav-item>
        {summary.hobbiesActive} of {summary.hobbiesTotal} hobbies active
      </Link>
      <SampleTag show={summary.samples.hobbies} />
    </>,
    '',
    summary.nowReading ? (
      <>
        {'  Now reading: '}
        <Link href={`/books/${summary.nowReading.slug}`} data-nav-item>
          {summary.nowReading.title}
        </Link>
        {` (${summary.nowReading.progress}%)`}
        <SampleTag show={summary.nowReading.sample} />
      </>
    ) : null,
    summary.lastTrip ? (
      <>
        {'  Last hop:    '}
        <Link href={`/travel/${summary.lastTrip.slug}`} data-nav-item>
          {summary.lastTrip.host}
        </Link>
        {` (${summary.lastTrip.start})`}
        <SampleTag show={summary.lastTrip.sample} />
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
