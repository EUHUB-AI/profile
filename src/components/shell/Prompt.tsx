export function Prompt({
  cmd,
  label,
  level = 1,
  id,
}: {
  cmd: string;
  label: string;
  level?: 1 | 2;
  id?: string;
}) {
  const Tag = level === 1 ? 'h1' : 'h2';
  return (
    <Tag id={id} className={level === 1 ? 't-display mb-8' : 't-title mt-14 mb-4'}>
      <span aria-hidden="true">
        <span className="text-dim">$ </span>
        {cmd}
      </span>
      <span className="sr-only">{label}</span>
    </Tag>
  );
}
