import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ContentError, loadCollection, loadSingle } from './load';

const schema = z.object({ title: z.string().min(1), count: z.number().int().default(0) });

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

function write(rel: string, text: string) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

describe('loadCollection', () => {
  it('parses frontmatter, applies defaults, and derives slug and body', () => {
    write('things/first-thing.md', '---\ntitle: First\n---\n\nHello *world*\n');
    expect(loadCollection('things', schema, root)).toEqual([
      { title: 'First', count: 0, slug: 'first-thing', body: 'Hello *world*' },
    ]);
  });

  it('sorts entries by file name and ignores non-markdown files', () => {
    write('things/b.md', '---\ntitle: B\n---\n');
    write('things/a.md', '---\ntitle: A\n---\n');
    write('things/notes.txt', 'ignore me');
    expect(loadCollection('things', schema, root).map((e) => e.slug)).toEqual(['a', 'b']);
  });

  it('returns an empty list when the folder does not exist', () => {
    expect(loadCollection('missing', schema, root)).toEqual([]);
  });

  it('names the file and the field when frontmatter is invalid', () => {
    write('things/bad.md', '---\ncount: 3\n---\n');
    expect(() => loadCollection('things', schema, root)).toThrow(ContentError);
    expect(() => loadCollection('things', schema, root)).toThrow(/things\/bad\.md[\s\S]*title/);
  });

  it('names the file when the YAML itself is malformed', () => {
    write('things/broken.md', '---\ntitle: [unclosed\n---\n');
    expect(() => loadCollection('things', schema, root)).toThrow(/things\/broken\.md/);
  });

  it('rejects file names that would make bad URLs', () => {
    write('things/My Trip.md', '---\ntitle: X\n---\n');
    expect(() => loadCollection('things', schema, root)).toThrow(/My Trip\.md[\s\S]*lowercase/);
  });
});

describe('loadSingle', () => {
  it('loads one file by relative path', () => {
    write('profile.md', '---\ntitle: Me\n---\nPlan text');
    expect(loadSingle('profile.md', schema, root)).toEqual({
      title: 'Me',
      count: 0,
      slug: 'profile',
      body: 'Plan text',
    });
  });
});
