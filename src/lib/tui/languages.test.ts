import { describe, expect, it } from 'vitest';
import { type Cefr, pipelineStages, pipelineStatus } from './languages';

const statuses = (level: Cefr, target: Cefr) => pipelineStages(level, target).map((s) => `${s.stage}:${s.status}`);

describe('pipelineStages', () => {
  it('marks passed, running, pending and skipped stages', () => {
    expect(statuses('B1', 'C1')).toEqual(['A1:passed', 'A2:passed', 'B1:passed', 'B2:running', 'C1:pending', 'C2:skipped']);
  });

  it('has no running stage once the target is reached', () => {
    expect(statuses('B2', 'B2')).toEqual(['A1:passed', 'A2:passed', 'B1:passed', 'B2:passed', 'C1:skipped', 'C2:skipped']);
  });

  it('runs the next stage even when it is the target', () => {
    expect(statuses('A1', 'A2')).toEqual(['A1:passed', 'A2:running', 'B1:skipped', 'B2:skipped', 'C1:skipped', 'C2:skipped']);
  });
});

describe('pipelineStatus', () => {
  it('is running until the target is reached', () => {
    expect(pipelineStatus('B1', 'B2')).toBe('running');
    expect(pipelineStatus('C1', 'C1')).toBe('passed');
  });
});
