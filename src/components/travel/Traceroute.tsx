import Link from 'next/link';
import { SampleTag } from '@/components/SampleTag';
import type { Hop } from '@/lib/tui/travel';

export function Traceroute({ hops, from }: { hops: Hop[]; from: string }) {
  return (
    <>
      <p className="mb-3 text-dim">
        traceroute to world ({hops.length} hops), from {from}
      </p>
      <ol className="rows">
        {hops.map((hop) => (
          <li key={hop.trip.slug}>
            <Link
              href={`/travel/${hop.trip.slug}`}
              data-nav-item
              className="row grid-cols-[3ch_minmax(0,1fr)] gap-x-[2ch] sm:grid-cols-[3ch_18ch_10ch_8ch_minmax(0,1fr)]"
            >
              <span className="text-right text-dim">{hop.n}</span>
              <span>{hop.host}</span>
              <span className="col-start-2 text-dim sm:col-start-auto sm:text-right">
                {hop.km.toLocaleString('en-US')} km
              </span>
              <span className="col-start-2 text-dim sm:col-start-auto">{hop.trip.start}</span>
              <span className="col-start-2 sm:col-start-auto">
                {hop.trip.title}
                <SampleTag show={hop.trip.sample} />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
