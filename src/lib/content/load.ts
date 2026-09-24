import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

export const CONTENT_ROOT = path.join(process.cwd(), 'content');

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentError';
  }
}

export type Entry<T> = T & { slug: string; body: string };

function parseFile<S extends z.ZodType<object>>(root: string, rel: string, schema: S): Entry<z.output<S>> {
  const slug = path.basename(rel, '.md');
  if (!SLUG.test(slug)) {
    throw new ContentError(`${rel}: file names must be lowercase words separated by hyphens (e.g. my-trip.md)`);
  }

  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch (err) {
    throw new ContentError(`${rel}: could not read frontmatter: ${(err as Error).message}`);
  }

  const result = schema.safeParse(parsed.data);
  if (!result.success) {
    throw new ContentError(`${rel}: invalid frontmatter\n${z.prettifyError(result.error)}`);
  }

  return Object.assign({}, result.data, { slug, body: parsed.content.trim() });
}

export function loadCollection<S extends z.ZodType<object>>(
  dir: string,
  schema: S,
  root: string = CONTENT_ROOT,
): Entry<z.output<S>>[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => parseFile(root, `${dir}/${name}`, schema));
}

export function loadSingle<S extends z.ZodType<object>>(
  file: string,
  schema: S,
  root: string = CONTENT_ROOT,
): Entry<z.output<S>> {
  return parseFile(root, file, schema);
}
