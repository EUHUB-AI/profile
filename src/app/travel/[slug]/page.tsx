import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Markdown } from '@/components/Markdown';
import { SampleTag } from '@/components/SampleTag';
import { BackLink } from '@/components/shell/BackLink';
import { Prompt } from '@/components/shell/Prompt';
import { getProfile, getTrip, getTrips } from '@/lib/content/collections';
import { haversineKm, hostName } from '@/lib/tui/travel';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getTrips().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const trip = getTrip((await params).slug);
  return trip ? { title: trip.title, description: `${trip.title}, ${trip.country}, ${trip.start}` } : {};
}

export default async function TripPage({ params }: Params) {
  const { slug } = await params;
  const trip = getTrip(slug);
  if (!trip) notFound();
  const { home } = getProfile();
  const first = trip.cities[0];

  return (
    <article>
      <Prompt cmd={`traceroute ${hostName(first.name, trip.countryCode)}`} label={trip.title} />
      <p className="t-title">
        {trip.title}
        <SampleTag show={trip.sample} />
      </p>
      <dl className="mt-4 grid grid-cols-[10ch_minmax(0,1fr)] gap-x-[2ch] gap-y-1">
        <dt className="text-dim">country</dt>
        <dd>{trip.country}</dd>
        <dt className="text-dim">when</dt>
        <dd>
          {trip.start}
          {trip.days ? `, ${trip.days} days` : ''}
        </dd>
        <dt className="text-dim">distance</dt>
        <dd>
          {Math.round(haversineKm(home, first)).toLocaleString('en-US')} km from {home.city}
        </dd>
      </dl>

      <h2 className="t-title mt-12 mb-3">route</h2>
      <ol className="rows">
        {trip.cities.map((city, i) => (
          <li
            key={`${i}-${city.name}`}
            className="grid grid-cols-[3ch_minmax(0,1fr)] gap-x-[2ch] px-[1ch] py-1.5 sm:grid-cols-[3ch_22ch_minmax(0,1fr)]"
          >
            <span className="text-right text-dim">{i + 1}</span>
            <span>{hostName(city.name, trip.countryCode)}</span>
            <span className="col-start-2 text-dim sm:col-start-auto">
              {city.name} ({city.lat.toFixed(2)}, {city.lng.toFixed(2)})
            </span>
          </li>
        ))}
      </ol>

      {trip.body && (
        <div className="mt-12">
          <Markdown source={trip.body} />
        </div>
      )}
      <BackLink href="/travel" label="Back to travel" />
    </article>
  );
}
