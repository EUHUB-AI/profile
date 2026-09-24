export function SampleTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="sample-tag" title="Placeholder entry">
      sample
    </span>
  );
}
