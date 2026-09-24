import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { STAGE_DOT } from '@/components/languages/PipelineStages';
import { Markdown } from '@/components/Markdown';
import { SampleTag } from '@/components/SampleTag';
import { BackLink } from '@/components/shell/BackLink';
import { Prompt } from '@/components/shell/Prompt';
import { StatusDot } from '@/components/StatusDot';
import { getLanguage, getLanguages } from '@/lib/content/collections';
import { type StageStatus, pipelineStages, pipelineStatus } from '@/lib/tui/languages';

type Params = { params: Promise<{ slug: string }> };

const TONE: Record<StageStatus, string> = { passed: '', running: 'text-warn', pending: 'text-dim', skipped: 'text-dim' };

export const dynamicParams = false;

export function generateStaticParams() {
  return getLanguages().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const lang = getLanguage((await params).slug);
  return lang ? { title: lang.name, description: `${lang.name}: ${lang.level}, aiming for ${lang.target}` } : {};
}

export default async function LanguagePage({ params }: Params) {
  const { slug } = await params;
  const lang = getLanguage(slug);
  if (!lang) notFound();

  return (
    <article>
      <Prompt cmd={`pipeline logs ${lang.slug}`} label={lang.name} />
      <p className="t-title">
        {lang.name}
        <SampleTag show={lang.sample} />
      </p>
      <dl className="mt-4 grid grid-cols-[10ch_minmax(0,1fr)] gap-x-[2ch] gap-y-1">
        <dt className="text-dim">status</dt>
        <dd>{pipelineStatus(lang.level, lang.target)}</dd>
        <dt className="text-dim">level</dt>
        <dd>{lang.level}</dd>
        <dt className="text-dim">target</dt>
        <dd>{lang.target}</dd>
        <dt className="text-dim">since</dt>
        <dd>{lang.since}</dd>
        {lang.streakDays !== undefined && (
          <>
            <dt className="text-dim">streak</dt>
            <dd>{lang.streakDays} days</dd>
          </>
        )}
      </dl>

      <h2 className="t-title mt-12 mb-3">stages</h2>
      <ol className="rows">
        {pipelineStages(lang.level, lang.target).map((s) => (
          <li key={s.stage} className="grid grid-cols-[2ch_4ch_minmax(0,1fr)] gap-x-[2ch] px-[1ch] py-1.5">
            <span>
              <StatusDot state={STAGE_DOT[s.status]} />
            </span>
            <span>{s.stage}</span>
            <span className={TONE[s.status]}>{s.status}</span>
          </li>
        ))}
      </ol>

      {lang.methods.length > 0 && (
        <>
          <h2 className="t-title mt-12 mb-3">methods</h2>
          <div className="prose-tui">
            <ul>
              {lang.methods.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      {lang.body && (
        <div className="mt-12">
          <Markdown source={lang.body} />
        </div>
      )}
      <BackLink href="/languages" label="Back to languages" />
    </article>
  );
}
