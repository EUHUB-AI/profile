import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose-tui">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ h1: 'h3', h2: 'h3' }}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
