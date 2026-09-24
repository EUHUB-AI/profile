import { CEFR } from '@/lib/content/schemas';

export type Cefr = (typeof CEFR)[number];
export type StageStatus = 'passed' | 'running' | 'pending' | 'skipped';

export function pipelineStages(level: Cefr, target: Cefr): { stage: Cefr; status: StageStatus }[] {
  const current = CEFR.indexOf(level);
  const goal = CEFR.indexOf(target);
  return CEFR.map((stage, i) => ({
    stage,
    status: i <= current ? 'passed' : i > goal ? 'skipped' : i === current + 1 ? 'running' : 'pending',
  }));
}

export function pipelineStatus(level: Cefr, target: Cefr): 'running' | 'passed' {
  return level === target ? 'passed' : 'running';
}
