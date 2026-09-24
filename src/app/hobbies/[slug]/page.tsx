import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unitState } from '@/components/hobbies/UnitList';
import { Markdown } from '@/components/Markdown';
import { SampleTag } from '@/components/SampleTag';
import { BackLink } from '@/components/shell/BackLink';
import { Prompt } from '@/components/shell/Prompt';
import { StatusDot } from '@/components/StatusDot';
import { getHobbies, getHobby } from '@/lib/content/collections';
import { durationSince, now } from '@/lib/tui/time';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getHobbies().map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const hobby = getHobby((await params).slug);
  return hobby ? { title: hobby.name, description: hobby.description } : {};
}

export default async function HobbyPage({ params }: Params) {
  const { slug } = await params;
  const hobby = getHobby(slug);
  if (!hobby) notFound();
  const active = hobby.state === 'active';

  return (
    <article>
      <Prompt cmd={`systemctl status ${hobby.slug}.service`} label={hobby.name} />
      <p className="t-title">
        {hobby.name}
        <SampleTag show={hobby.sample} />
      </p>
      <p className="mt-4">
        <StatusDot state={active ? 'done' : 'off'} /> {hobby.slug}.service - {hobby.description}
      </p>
      <dl className="mt-1 grid grid-cols-[8ch_minmax(0,1fr)] gap-x-[1ch] pl-[2ch]">
        <dt className="text-right text-dim">Loaded:</dt>
        <dd>
          loaded (~/hobbies/{hobby.slug}.md; {active ? 'enabled' : 'disabled'})
        </dd>
        <dt className="text-right text-dim">Active:</dt>
        <dd className={active ? '' : 'text-dim'}>
          {unitState(hobby)} since {hobby.since}; {durationSince(hobby.since, now())} ago
        </dd>
      </dl>
      {hobby.body && (
        <div className="mt-12">
          <Markdown source={hobby.body} />
        </div>
      )}
      <BackLink href="/hobbies" label="Back to hobbies" />
    </article>
  );
}
