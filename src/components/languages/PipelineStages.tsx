import { type DotState, StatusDot } from '@/components/StatusDot';
import { type Cefr, type StageStatus, pipelineStages } from '@/lib/tui/languages';

export const STAGE_DOT: Record<StageStatus, DotState> = {
  passed: 'done',
  running: 'running',
  pending: 'pending',
  skipped: 'off',
};

export function PipelineStages({ level, target }: { level: Cefr; target: Cefr }) {
  return (
    <span className="stages">
      {pipelineStages(level, target).map((s) => (
        <span key={s.stage} className={`stage ${s.status === 'skipped' ? 'text-dim' : ''}`}>
          <StatusDot state={STAGE_DOT[s.status]} /> {s.stage}
          <span className="sr-only"> {s.status}</span>
        </span>
      ))}
    </span>
  );
}
