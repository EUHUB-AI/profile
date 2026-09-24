import Link from 'next/link';
import { SampleTag } from '@/components/SampleTag';
import { Sparkline } from '@/components/Sparkline';
import type { Sport } from '@/lib/content/collections';
import { sportStats } from '@/lib/tui/sport';

export function SportPanel({ sport }: { sport: Sport }) {
  const stats = sportStats(sport.weekly);
  const record = sport.records[0];
  return (
    <Link href={`/sport/${sport.slug}`} data-nav-item className={`row panel ${sport.active ? '' : 'text-dim'}`}>
      <span className="panel-title">
        {sport.name.toLowerCase()}
        {sport.active ? '' : ' (paused)'}
        <SampleTag show={sport.sample} />
      </span>
      <span className={`block ${sport.active ? 'text-warn' : ''}`}>
        <Sparkline values={sport.weekly} label={`${sport.name}: weekly ${sport.unit} over the last ${stats.weeks} weeks`} />
      </span>
      <span className="mt-3 flex flex-wrap gap-x-[3ch] gap-y-1">
        <span>
          {stats.last} {sport.unit} <span className="text-dim">this week</span>
        </span>
        <span className="text-dim">avg {stats.avg}</span>
        <span className="text-dim">peak {stats.peak}</span>
      </span>
      {record && (
        <span className="mt-2 block text-dim">
          best {record.label}: {record.value}
        </span>
      )}
    </Link>
  );
}
