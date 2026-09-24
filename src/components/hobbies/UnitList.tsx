import Link from 'next/link';
import { SampleTag } from '@/components/SampleTag';
import { StatusDot } from '@/components/StatusDot';
import type { Hobby } from '@/lib/content/collections';

export function unitState(hobby: Hobby): string {
  return hobby.state === 'active' ? 'active (running)' : 'inactive (dead)';
}

export function UnitList({ hobbies }: { hobbies: Hobby[] }) {
  const active = hobbies.filter((h) => h.state === 'active').length;
  return (
    <>
      <ul className="rows">
        {hobbies.map((h) => (
          <li key={h.slug}>
            <Link
              href={`/hobbies/${h.slug}`}
              data-nav-item
              className="row grid-cols-[2ch_minmax(0,1fr)] gap-x-[2ch] sm:grid-cols-[2ch_24ch_17ch_minmax(0,1fr)]"
            >
              <span>
                <StatusDot state={h.state === 'active' ? 'done' : 'off'} />
              </span>
              <span>
                {h.slug}.service
                <SampleTag show={h.sample} />
              </span>
              <span className={`col-start-2 sm:col-start-auto ${h.state === 'active' ? '' : 'text-dim'}`}>{unitState(h)}</span>
              <span className="col-start-2 text-dim sm:col-start-auto">{h.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-dim">
        {hobbies.length} units listed: {active} active, {hobbies.length - active} inactive.
      </p>
    </>
  );
}
