import type { Metadata } from 'next';
import { Prompt } from '@/components/shell/Prompt';
import { SportPanel } from '@/components/sport/SportPanel';
import { getSports } from '@/lib/content/collections';

export const metadata: Metadata = {
  title: 'Sport',
  description: 'Training volume, personal records and upcoming events.',
};

export default function SportPage() {
  const sports = getSports();
  const active = sports.filter((s) => s.active);
  const streak = Math.max(0, ...active.map((s) => s.streakDays ?? 0));
  return (
    <>
      <Prompt cmd="btop --sport" label="Sport" />
      {sports.length === 0 ? (
        <p className="text-dim">No sports logged yet.</p>
      ) : (
        <>
          <p className="mb-8 text-dim">
            up {streak} days, {active.length} of {sports.length} sports active
          </p>
          <ul className="grid list-none gap-8 p-0 sm:grid-cols-2 2xl:grid-cols-3">
            {sports.map((s) => (
              <li key={s.slug}>
                <SportPanel sport={s} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
