import type { Metadata } from 'next';
import Link from 'next/link';
import { PipelineStages } from '@/components/languages/PipelineStages';
import { SampleTag } from '@/components/SampleTag';
import { Prompt } from '@/components/shell/Prompt';
import { getLanguages } from '@/lib/content/collections';
import { pipelineStatus } from '@/lib/tui/languages';

export const metadata: Metadata = {
  title: 'Languages',
  description: 'Languages in progress, tracked as a CEFR pipeline from A1 to C2.',
};

export default function LanguagesPage() {
  const languages = getLanguages();
  const running = languages.filter((l) => pipelineStatus(l.level, l.target) === 'running').length;
  return (
    <>
      <Prompt cmd="pipeline status lang" label="Languages" />
      {languages.length === 0 ? (
        <p className="text-dim">No languages logged yet.</p>
      ) : (
        <>
          <p className="mb-6 text-dim">
            {languages.length} pipelines: {running} running, {languages.length - running} passed
          </p>
          <ul className="rows">
            {languages.map((l) => {
              const status = pipelineStatus(l.level, l.target);
              return (
                <li key={l.slug}>
                  <Link
                    href={`/languages/${l.slug}`}
                    data-nav-item
                    className="row grid-cols-1 gap-x-[2ch] gap-y-1 sm:grid-cols-[14ch_8ch_minmax(0,1fr)]"
                  >
                    <span>
                      {l.name.toLowerCase()}
                      <SampleTag show={l.sample} />
                    </span>
                    <span className={status === 'running' ? 'text-warn' : ''}>{status}</span>
                    <PipelineStages level={l.level} target={l.target} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
