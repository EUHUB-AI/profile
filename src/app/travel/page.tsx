import type { Metadata } from 'next';
import { Prompt } from '@/components/shell/Prompt';
import { Traceroute } from '@/components/travel/Traceroute';
import { WorldMap } from '@/components/travel/WorldMap';
import { getProfile, getTrips } from '@/lib/content/collections';
import { countryCount, hostName, traceroute } from '@/lib/tui/travel';

export const metadata: Metadata = {
  title: 'Travel',
  description: 'Trips so far, listed as hops away from home.',
};

export default function TravelPage() {
  const trips = getTrips();
  const { home } = getProfile();
  const cities = trips.reduce((n, t) => n + t.cities.length, 0);
  return (
    <>
      <Prompt cmd="traceroute world" label="Travel" />
      {trips.length === 0 ? (
        <p className="text-dim">No trips logged yet.</p>
      ) : (
        <>
          <div className="2xl:grid 2xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] 2xl:items-start 2xl:gap-x-[6ch]">
            <div className="mb-10 2xl:sticky 2xl:top-8 2xl:col-start-1 2xl:mb-0">
              <WorldMap
                places={trips.flatMap((t) => t.cities.map((c) => ({ lat: c.lat, lng: c.lng, slug: t.slug })))}
                home={home}
              />
            </div>
            <div className="2xl:col-start-2">
              <p className="mb-6 text-dim">
                {countryCount(trips)} countries, {cities} cities
              </p>
              <Traceroute hops={traceroute(trips, home)} from={hostName(home.city, home.countryCode)} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
