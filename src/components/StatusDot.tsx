export type DotState = 'done' | 'running' | 'pending' | 'off';

export function StatusDot({ state }: { state: DotState }) {
  return <span className="dot" data-state={state} aria-hidden="true" />;
}
