import { Markdown } from '@/components/Markdown';
import { SampleTag } from '@/components/SampleTag';
import type { Job } from '@/lib/content/collections';
import { layoutGraph, shortHash } from '@/lib/tui/gitGraph';

export function GitLog({ jobs }: { jobs: Job[] }) {
  const rows = layoutGraph(jobs);
  const first = rows[0];
  const headSlug = first?.kind === 'commit' ? first.entry.slug : undefined;
  return (
    <ol className="gitlog">
      {rows.map((row, i) =>
        row.kind === 'edge' ? (
          <li key={`edge-${i}`} aria-hidden="true" className="gitlog-edge">
            {row.prefix}
          </li>
        ) : (
          <li key={row.entry.slug}>
            <details open={row.entry.slug === headSlug}>
              <summary data-nav-item className="gitlog-summary">
                <span aria-hidden="true" className="gitlog-graph text-dim">
                  {row.prefix}
                </span>
                <span>
                  <span className="text-warn">{shortHash(row.entry.slug)}</span>
                  {row.entry.slug === headSlug && <span className="text-dim"> (HEAD -&gt; main)</span>}{' '}
                  {row.entry.role} @ {row.entry.company}
                  <span className="text-dim">
                    {' '}
                    {row.entry.start}..{row.entry.end ?? 'now'}
                  </span>
                  <SampleTag show={row.entry.sample} />
                  <span className="gitlog-toggle" aria-hidden="true" />
                </span>
              </summary>
              <div className="gitlog-body">
                <Markdown source={row.entry.body} />
              </div>
            </details>
          </li>
        ),
      )}
    </ol>
  );
}
