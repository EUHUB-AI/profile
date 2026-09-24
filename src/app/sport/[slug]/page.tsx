import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Markdown } from '@/components/Markdown';
import { SampleTag } from '@/components/SampleTag';
import { BackLink } from '@/components/shell/BackLink';
import { Prompt } from '@/components/shell/Prompt';
import { Sparkline } from '@/components/Sparkline';
import { getSport, getSports } from '@/lib/content/collections';
import { sportStats } from '@/lib/tui/sport';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getSports().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const sport = getSport((await params).slug);
  return sport ? { title: sport.name, description: `${sport.name}: weekly ${sport.unit}, records and events` } : {};
}

export default async function SportDetailPage({ params }: Params) {
  const { slug } = await params;
  const sport = getSport(slug);
  if (!sport) notFound();
  const stats = sportStats(sport.weekly);
  const events = [...sport.events].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <article>
      <Prompt cmd={`btop --sport ${sport.slug}`} label={sport.name} />
      <p className="t-title">
        {sport.name}
        {sport.active ? '' : ' (paused)'}
        <SampleTag show={sport.sample} />
      </p>

      <div className={`spark-lg mt-6 ${sport.active ? 'text-warn' : 'text-dim'}`}>
        <Sparkline values={sport.weekly} label={`${sport.name}: weekly ${sport.unit} over the last ${stats.weeks} weeks`} />
      </div>

      <dl className="mt-6 grid grid-cols-[12ch_minmax(0,1fr)] gap-x-[2ch] gap-y-1">
        <dt className="text-dim">this week</dt>
        <dd>
          {stats.last} {sport.unit}
        </dd>
        <dt className="text-dim">average</dt>
        <dd>
          {stats.avg} {sport.unit}
        </dd>
        <dt className="text-dim">peak</dt>
        <dd>
          {stats.peak} {sport.unit}
        </dd>
        <dt className="text-dim">tracked</dt>
        <dd>{stats.weeks} weeks</dd>
        {sport.streakDays !== undefined && (
          <>
            <dt className="text-dim">streak</dt>
            <dd>{sport.streakDays} days</dd>
          </>
        )}
      </dl>

      {sport.records.length > 0 && (
        <>
          <h2 className="t-title mt-12 mb-3">records</h2>
          <ul className="rows">
            {sport.records.map((r) => (
              <li
                key={r.label}
                className="grid grid-cols-[minmax(0,1fr)_12ch] gap-x-[2ch] px-[1ch] py-1.5 sm:grid-cols-[minmax(0,1fr)_12ch_8ch]"
              >
                <span>{r.label}</span>
                <span>{r.value}</span>
                <span className="col-start-2 text-dim sm:col-start-auto">{r.date}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {events.length > 0 && (
        <>
          <h2 className="t-title mt-12 mb-3">events</h2>
          <ul className="rows">
            {events.map((e) => (
              <li
                key={`${e.date}-${e.name}`}
                className="grid grid-cols-[11ch_minmax(0,1fr)] gap-x-[2ch] px-[1ch] py-1.5 sm:grid-cols-[11ch_minmax(0,1fr)_12ch]"
              >
                <span className="text-dim">{e.date}</span>
                <span>{e.name}</span>
                <span className={`col-start-2 sm:col-start-auto ${e.result ? '' : 'text-dim'}`}>
                  {e.result ?? 'scheduled'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {sport.body && (
        <div className="mt-12">
          <Markdown source={sport.body} />
        </div>
      )}
      <BackLink href="/sport" label="Back to sport" />
    </article>
  );
}
