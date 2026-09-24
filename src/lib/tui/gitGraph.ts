import { ymKey } from './time';

export interface Span {
  slug: string;
  start: string;
  end?: string;
}

export type GraphRow<T extends Span> =
  | { kind: 'commit'; prefix: string; entry: T; lane: number }
  | { kind: 'edge'; prefix: string };

const cmp = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1);
const endKey = (s: Span) => (s.end ? ymKey(s.end) : Number.POSITIVE_INFINITY);
const overlaps = (a: Span, b: Span) => ymKey(a.start) < endKey(b) && ymKey(b.start) < endKey(a);

export function layoutGraph<T extends Span>(entries: T[]): GraphRow<T>[] {
  const lanes = new Map<T, number>();
  const oldestFirst = [...entries].sort((a, b) => cmp(ymKey(a.start), ymKey(b.start)) || cmp(endKey(b), endKey(a)));
  for (const entry of oldestFirst) {
    let lane = 0;
    while ([...lanes].some(([other, l]) => l === lane && overlaps(other, entry))) lane++;
    lanes.set(entry, lane);
  }

  const width = Math.max(0, ...lanes.values()) * 2 + 1;
  const activeLanes = (entry: T) =>
    new Set([...lanes].filter(([other]) => other === entry || overlaps(other, entry)).map(([, l]) => l));
  const newestFirst = [...entries].sort((a, b) => cmp(ymKey(b.start), ymKey(a.start)) || cmp(endKey(b), endKey(a)));

  const rows: GraphRow<T>[] = [];
  newestFirst.forEach((entry, i) => {
    const own = lanes.get(entry) ?? 0;
    const active = activeLanes(entry);
    const cells = Array.from({ length: width }, () => ' ');
    for (const l of active) cells[l * 2] = l === own ? '*' : '|';
    rows.push({ kind: 'commit', prefix: cells.join(''), entry, lane: own });

    const next = newestFirst[i + 1];
    if (!next) return;
    const nextActive = activeLanes(next);
    const closing = [...active].filter((l) => l > 0 && !nextActive.has(l));
    const opening = [...nextActive].filter((l) => l > 0 && !active.has(l));
    if (closing.length === 0 && opening.length === 0) return;
    const edge = Array.from({ length: width }, () => ' ');
    for (const l of active) if (nextActive.has(l)) edge[l * 2] = '|';
    for (const l of closing) edge[l * 2 - 1] = '/';
    for (const l of opening) edge[l * 2 - 1] = '\\';
    rows.push({ kind: 'edge', prefix: edge.join('') });
  });
  return rows;
}

export function shortHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 7);
}
