# Ops-tools Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the profile site as a retro terminal "OS". Every section (home/career, books, travel, languages, sport, hobbies) is a real route styled as the ops tool that fits it, and the content comes from Markdown files.

**Architecture:** Next.js 16 App Router with a persistent `TuiFrame` layout: title line, tab bar, main pane, status line. Content lives in `content/**.md` and is parsed at build time with gray-matter and validated with zod. Every route is statically generated. Pure logic (grouping, graph layout, stage status, distances, key mapping) lives in `src/lib/**` with Vitest unit tests. Components stay thin.

**Tech Stack:**
- Next.js 16.0.5, React 19.2, Tailwind CSS 4, TypeScript 5
- gray-matter 4, zod 4, react-markdown 10 + remark-gfm 4, dotted-map 3
- Vitest 4.1, Martian Mono via `next/font/google`

**Spec:** `docs/superpowers/specs/2026-09-24-ops-tools-redesign-design.md`

## Global Constraints

**Branch and commits**
- Work on branch `redesign/ops-tools`. Never push to `main`: a push to `main` deploys to production Cloud Run.
- Package manager is npm (`package-lock.json`). The Dockerfile runs `bun install --frozen-lockfile` against it.
- Never `git add -A` or `git add .`. Stage files by name. `pnpm-lock.yaml` and `pnpm-workspace.yaml` stay untracked.

**Dependency versions (pinned exactly)**
- `gray-matter@^4.0.3`, `zod@^4.6.5`, `react-markdown@^10.1.0`, `remark-gfm@^4.0.1`, `dotted-map@^3.1.0`, `vitest@^4.1.11`.
- Not Vitest 5: its engines exclude Node 25 and it needs `@types/node >= 22`.

**Typography**
- One typeface: Martian Mono via `next/font/google` with `subsets: ['latin', 'latin-ext']`, `axes: ['wdth']`, `variable: '--font-martian'`.
- The font has no box-drawing, block or symbol glyphs, so never put `▓ ░ ▁ █ ● ○ ◐ ✓ ★ ─ │` in text. Draw meters, dots, sparklines and connectors with CSS/SVG.

**Color**
- Colors come only from the tokens `--bg --fg --dim --warn --alert --band --rule`. Tailwind classes: `bg-bg text-fg text-dim text-warn text-alert bg-band border-rule`.
- Color shows state:
  - `fg`: done / ok
  - `warn`: in progress
  - `dim`: paused / planned / secondary
  - `alert`: errors

**Copy**
- Page headings are lowercase commands (the `Prompt` component) with a screen-reader-only plain label.
- No ALL-CAPS labels, except man-page section names (NAME, SYNOPSIS, NOTES, SEE ALSO).
- No middle-dot separators, and no `→` appended to link text.

**Motion**
- The only non-user-triggered motion is the MOTD playback on `/`.
- It runs once per session, is skippable by any key or pointer press, and is off for `prefers-reduced-motion` and without JS.

**Routing and content**
- Every detail route exports `generateStaticParams` and `dynamicParams = false`.
- Detail pages type params as `{ params: Promise<{ slug: string }> }` and `await` them (Next 16).
- Placeholder entries have `sample: true` in frontmatter and render the `SampleTag`.

**Layout and accessibility**
- No horizontal page scroll at a 375px viewport.
- Every page has exactly one `h1`.
- Keyboard shortcuts ignore events with Ctrl/Cmd/Alt held and events from editable elements.

## Review Focus

1. **Unquoted YAML dates or years in frontmatter** (`start: 2025-04-12`, `start: 2019`). Expected: accepted and normalized to `"2025-04"` / `"2019"`, not rejected and not rendered as `[object Date]`. Test in Task 2 (`schemas.test.ts`).
2. **One broken Markdown file** (malformed YAML, a missing required field, or a file named `My Trip.md`). Expected: `npm test` and `npm run build` fail with a message naming that file and field. Tests in Task 1 (`load.test.ts`) and Task 2.
3. **Browser and OS shortcuts** (Ctrl/Cmd+1 to switch browser tab, Alt+t), and typing into a form field. Expected: the site does not intercept them. Test in Task 4 (`keys.test.ts`).
4. **City names with accents, spaces or punctuation** (Reykjavík, Rio de Janeiro, St. John's). Expected: clean ASCII hop hostnames like `reykjavik.is`. Test in Task 6 (`travel.test.ts`).
5. **A mistyped URL on the production standalone server** (`/books/typo`, `/nope`). Expected: the styled 404 page with status 404, not a 500 from the server failing to read `content/`. Check in Task 11 (standalone `curl` step).

---

### Task 1: Branch, test runner and content loader

**Files:**
- Modify: `package.json` (dependencies, `scripts.test`)
- Create: `vitest.config.mts`
- Create: `src/lib/content/load.ts`
- Test: `src/lib/content/load.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `CONTENT_ROOT: string`
  - `class ContentError extends Error`
  - `type Entry<T> = T & { slug: string; body: string }`
  - `loadCollection<S extends z.ZodType<object>>(dir: string, schema: S, root?: string): Entry<z.output<S>>[]`
  - `loadSingle<S extends z.ZodType<object>>(file: string, schema: S, root?: string): Entry<z.output<S>>`

- [ ] **Step 1: Create the branch and commit the pending lint fixes on their own**

```bash
git switch -c redesign/ops-tools
git add src/app/page.tsx src/components/CareerAccordion.tsx src/components/HiddenSEO.tsx src/components/ThemeToggle.tsx
git commit -m "fix: resolve eslint errors in HiddenSEO and ThemeToggle"
git status --short
```

Expected: only `?? pnpm-lock.yaml` and `?? pnpm-workspace.yaml` remain.

- [ ] **Step 2: Install dependencies and add the test script**

```bash
npm install gray-matter@^4.0.3 zod@^4.6.5
npm install -D vitest@^4.1.11
npm pkg set scripts.test="vitest run"
```

Create `vitest.config.mts`:

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Write the failing test**

Create `src/lib/content/load.test.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- src/lib/content/load.test.ts`
Expected: FAIL with `Failed to resolve import "./load"`.

- [ ] **Step 5: Implement the loader**

Create `src/lib/content/load.ts`:

```ts
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
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- src/lib/content/load.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 7: Type-check, lint, commit**

```bash
npx tsc --noEmit && npx eslint .
git add package.json package-lock.json vitest.config.mts src/lib/content/load.ts src/lib/content/load.test.ts
git commit -m "feat: add markdown content loader with frontmatter validation"
```

---

### Task 2: Content schemas, sample content and typed accessors

**Files:**
- Create: `src/lib/content/schemas.ts`, `src/lib/content/collections.ts`
- Test: `src/lib/content/schemas.test.ts`, `src/lib/content/content.test.ts`
- Create content:
  - `content/profile.md`
  - `content/career/*.md` (6)
  - `content/books/*.md` (6)
  - `content/travel/*.md` (4)
  - `content/languages/*.md` (3)
  - `content/sport/*.md` (3)
  - `content/hobbies/*.md` (4)

**Interfaces:**
- Consumes: `loadCollection`, `loadSingle`, `Entry` from Task 1.
- Produces:
  - `CEFR` (readonly tuple `'A1'…'C2'`)
  - `yearMonth`, `day` (zod field schemas)
  - `profileSchema`, `careerSchema`, `bookSchema`, `tripSchema`, `languageSchema`, `sportSchema`, `hobbySchema`
  - Types `Profile`, `Job`, `Book`, `Trip`, `Language`, `Sport`, `Hobby`, each an `Entry<…>`
  - `getProfile()`, `getCareer()`, `getBooks()`, `getTrips()`, `getLanguages()`, `getSports()`, `getHobbies()`
  - `getBook(slug)`, `getTrip(slug)`, `getLanguage(slug)`, `getSport(slug)`, `getHobby(slug)`, each returning the entry or `undefined`
- Field shapes, all after parsing:
  - `Book`: `title, author, status: 'reading'|'paused'|'finished'|'queued', progress?, started?, finished?, rating?, published?, tags: string[], sample: boolean`
  - `Trip`: `title, country, countryCode, start, days?, cities: {name, lat, lng}[], sample`
  - `Language`: `name, level: Cefr, target: Cefr, since, methods: string[], streakDays?, sample`
  - `Sport`: `name, unit, weekly: number[], records: {label, value, date}[], events: {name, date, result?}[], streakDays?, active: boolean, sample`
  - `Hobby`: `name, description, state: 'active'|'inactive', since, sample`
  - `Job`: `company, role, start, end?, sample`
  - `Profile`: `name, handle, host, role, uptime?, siteUrl?, home: {city, countryCode, lat, lng}, certifications: string[], contact: {handler?, email, phone?, whatsapp?}`

- [ ] **Step 1: Write the failing schema test**

Create `src/lib/content/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bookSchema, day, languageSchema, yearMonth } from './schemas';

describe('date fields', () => {
  it('accepts YYYY and YYYY-MM strings', () => {
    expect(yearMonth.parse('2019')).toBe('2019');
    expect(yearMonth.parse('2025-04')).toBe('2025-04');
  });

  it('normalizes unquoted YAML dates and bare years instead of failing', () => {
    expect(yearMonth.parse(new Date('2025-04-12T00:00:00Z'))).toBe('2025-04');
    expect(yearMonth.parse(2019)).toBe('2019');
    expect(day.parse(new Date('2027-04-18T00:00:00Z'))).toBe('2027-04-18');
  });

  it('rejects other formats with a hint about the expected format', () => {
    const result = yearMonth.safeParse('April 2025');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/YYYY-MM/);
  });
});

describe('bookSchema', () => {
  const base = { title: 'T', author: 'A' };

  it('requires progress for books being read', () => {
    const result = bookSchema.safeParse({ ...base, status: 'reading' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['progress']);
  });

  it('requires a finished date for finished books', () => {
    const result = bookSchema.safeParse({ ...base, status: 'finished' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['finished']);
  });

  it('rejects progress above 100', () => {
    expect(bookSchema.safeParse({ ...base, status: 'reading', progress: 120 }).success).toBe(false);
  });

  it('defaults tags and sample', () => {
    expect(bookSchema.parse({ ...base, status: 'queued' })).toMatchObject({ tags: [], sample: false });
  });
});

describe('languageSchema', () => {
  it('rejects a target below the current level', () => {
    const result = languageSchema.safeParse({ name: 'German', level: 'B2', target: 'A1', since: '2024-01' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['target']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/content/schemas.test.ts`
Expected: FAIL with `Failed to resolve import "./schemas"`.

- [ ] **Step 3: Implement the schemas**

Create `src/lib/content/schemas.ts`:

```ts
import { z } from 'zod';

const YEAR_MONTH = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// YAML turns `2025-04-12` into a Date and `2019` into a number; normalize both to strings.
export const yearMonth = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 7) : typeof v === 'number' ? String(v) : v),
  z.string().regex(YEAR_MONTH, 'use YYYY-MM (or YYYY)'),
);

export const day = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(DAY, 'use YYYY-MM-DD'),
);

const sample = z.boolean().default(false);
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
const countryCode = z.string().regex(/^[A-Z]{2}$/, 'use a two-letter ISO code like JP');
const handle = z.string().regex(/^[a-z][a-z0-9-]*$/, 'use lowercase letters, digits and hyphens');

export const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const cefr = z.enum(CEFR);

export const profileSchema = z.object({
  name: z.string().min(1),
  handle,
  host: handle,
  role: z.string().min(1),
  uptime: z.string().optional(),
  siteUrl: z.url().optional(),
  home: z.object({ city: z.string().min(1), countryCode, lat, lng }),
  certifications: z.array(z.string().min(1)).default([]),
  contact: z.object({
    handler: z.string().optional(),
    email: z.email(),
    phone: z.string().optional(),
    whatsapp: z.string().regex(/^\d+$/, 'digits only, including the country code').optional(),
  }),
});

export const careerSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  start: yearMonth,
  end: yearMonth.optional(),
  sample,
});

export const bookSchema = z
  .object({
    title: z.string().min(1),
    author: z.string().min(1),
    status: z.enum(['reading', 'paused', 'finished', 'queued']),
    progress: z.number().int().min(0).max(100).optional(),
    started: yearMonth.optional(),
    finished: yearMonth.optional(),
    rating: z.number().int().min(1).max(5).optional(),
    published: z.number().int().optional(),
    tags: z.array(z.string()).default([]),
    sample,
  })
  .superRefine((book, ctx) => {
    if ((book.status === 'reading' || book.status === 'paused') && book.progress === undefined) {
      ctx.addIssue({ code: 'custom', path: ['progress'], message: `${book.status} books need progress (0-100)` });
    }
    if (book.status === 'finished' && !book.finished) {
      ctx.addIssue({ code: 'custom', path: ['finished'], message: 'finished books need a finished date (YYYY-MM)' });
    }
  });

export const tripSchema = z.object({
  title: z.string().min(1),
  country: z.string().min(1),
  countryCode,
  start: yearMonth,
  days: z.number().int().positive().optional(),
  cities: z.array(z.object({ name: z.string().min(1), lat, lng })).min(1),
  sample,
});

export const languageSchema = z
  .object({
    name: z.string().min(1),
    level: cefr,
    target: cefr,
    since: yearMonth,
    methods: z.array(z.string()).default([]),
    streakDays: z.number().int().nonnegative().optional(),
    sample,
  })
  .refine((l) => CEFR.indexOf(l.target) >= CEFR.indexOf(l.level), {
    path: ['target'],
    message: 'target must be the same as or above level',
  });

export const sportSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  weekly: z.array(z.number().nonnegative()).min(2).max(52),
  records: z.array(z.object({ label: z.string().min(1), value: z.string().min(1), date: yearMonth })).default([]),
  events: z
    .array(z.object({ name: z.string().min(1), date: day, result: z.string().optional() }))
    .default([]),
  streakDays: z.number().int().nonnegative().optional(),
  active: z.boolean().default(true),
  sample,
});

export const hobbySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  state: z.enum(['active', 'inactive']),
  since: yearMonth,
  sample,
});
```

- [ ] **Step 4: Run the schema test to verify it passes**

Run: `npm test -- src/lib/content/schemas.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Add the typed accessors**

Create `src/lib/content/collections.ts`:

```ts
import type { z } from 'zod';
import { type Entry, loadCollection, loadSingle } from './load';
import {
  bookSchema,
  careerSchema,
  hobbySchema,
  languageSchema,
  profileSchema,
  sportSchema,
  tripSchema,
} from './schemas';

export type Profile = Entry<z.output<typeof profileSchema>>;
export type Job = Entry<z.output<typeof careerSchema>>;
export type Book = Entry<z.output<typeof bookSchema>>;
export type Trip = Entry<z.output<typeof tripSchema>>;
export type Language = Entry<z.output<typeof languageSchema>>;
export type Sport = Entry<z.output<typeof sportSchema>>;
export type Hobby = Entry<z.output<typeof hobbySchema>>;

export const getProfile = (): Profile => loadSingle('profile.md', profileSchema);
export const getCareer = (): Job[] => loadCollection('career', careerSchema);
export const getBooks = (): Book[] => loadCollection('books', bookSchema);
export const getTrips = (): Trip[] => loadCollection('travel', tripSchema);
export const getLanguages = (): Language[] => loadCollection('languages', languageSchema);
export const getSports = (): Sport[] => loadCollection('sport', sportSchema);
export const getHobbies = (): Hobby[] => loadCollection('hobbies', hobbySchema);

export const getBook = (slug: string) => getBooks().find((b) => b.slug === slug);
export const getTrip = (slug: string) => getTrips().find((t) => t.slug === slug);
export const getLanguage = (slug: string) => getLanguages().find((l) => l.slug === slug);
export const getSport = (slug: string) => getSports().find((s) => s.slug === slug);
export const getHobby = (slug: string) => getHobbies().find((h) => h.slug === slug);
```

- [ ] **Step 6: Write the failing content-integrity test**

Create `src/lib/content/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getBooks, getCareer, getHobbies, getLanguages, getProfile, getSports, getTrips } from './collections';

describe('content/ folder', () => {
  it('has a valid profile', () => {
    expect(getProfile().name).toBeTruthy();
  });

  it.each([
    ['career', getCareer],
    ['books', getBooks],
    ['travel', getTrips],
    ['languages', getLanguages],
    ['sport', getSports],
    ['hobbies', getHobbies],
  ] as const)('%s entries all pass validation', (_name, load) => {
    expect(load().length).toBeGreaterThan(0);
  });
});
```

Run: `npm test -- src/lib/content/content.test.ts`
Expected: FAIL with `ENOENT` on `content/profile.md` and `expected 0 to be greater than 0`.

- [ ] **Step 7: Write the profile and career content (real data from the current site)**

`content/profile.md`:

```md
---
name: Mike G.
handle: mike
host: mike-g
role: SRE & (Dev/AI/Sec Ops) Architect
uptime: 100.00%
home:
  city: Bratislava
  countryCode: SK
  lat: 48.1486
  lng: 17.1077
certifications:
  - Terraform Associate 003
  - CCNA
  - CKAD
  - CKA
  - AWS Certified Solutions Architect – Associate (SAA-C03)
contact:
  handler: Artie
  email: hello@euhub.sk
  phone: "+421 919 028 987"
  whatsapp: "421919028987"
---

Infrastructure as code, GitOps, and platforms that stay up. Migrating legacy VMs to containers on AWS, keeping `main` production-ready, and designing for SOC 2 from day one.
```

`content/career/2023-12-ux-research-recruitment.md`:

```md
---
company: "(NDA) Targeted UX research recruitment"
role: DevOps Architect
start: "2023-12"
---

- Migrated project (research CRM) from legacy VM infra to modern AWS ECS Container Architecture.
- Implemented secured, predictable infrastructure with 100% uptime using Terraform Cloud.
- Configured ALBs with robust health checks to eliminate risks and human error.
- Established GitOps workflow where 'master' branch is always production-ready.
- Achieved SOC 2 compliance readiness through infrastructure design.
- Designed TFC variable-driven infrastructure enabling changes without deep DevOps expertise.
```

`content/career/2023-12-pajak-go-id.md`:

```md
---
company: "(NDA) (Project: Pajak.go.id)"
role: DevOps Architect
start: "2023-12"
end: "2024-12"
---

- Scaled and supported vast K8s microservices architecture designed to handle the anticipated load of 300 million users
- Automated resilience via rigorous ALB health checks and K8s probes, systematically eliminating dependence on manual operational intervention
- Enforced rigorous GitOps CI/CD pipelines, ensuring the codebase remained consistent and the 'master' branch was continuously production-ready
- Bridged technology and strategy by negotiating and embedding security controls necessary for high-compliance standards, specifically focusing on the Availability and Security Trust Service Criteria (TSC)
```

`content/career/2022-05-geniusee.md`:

```md
---
company: Geniusee
role: Strong Middle DevOps
start: "2022-05"
end: "2023-10"
---

- Migrated legacy VM infrastructure to modern AWS ECS.
- Optimized CI/CD pipelines using GitLab CI.
- Managed Kubernetes clusters and Docker registries.
```

`content/career/2021-03-netforce.md`:

```md
---
company: NETFORCE
role: Middle DevOps
start: "2021-03"
end: "2022-04"
---

- Maintained large-scale production environments.
- Automated deployment processes using Jenkins and Python.
- Monitored system health with Prometheus and Grafana.
```

`content/career/2020-03-avys-wholesale.md`:

```md
---
company: AVyS Wholesale LDA
role: System Engineer (Telecom)
start: "2020-03"
end: "2021-03"
---

- L1 Support for Fleximovil.es
- On-premise infra support and maintenance
- Monitoring, provisioning of on-premise infra with Zabbix
```

`content/career/2019-imonomy.md`:

```md
---
company: Imonomy
role: DevOps
start: "2019"
end: "2020-03"
---

- Configured RTB servers for real-time bidding operations.
- Developed Bash scripts for cron jobs
- Monitored with Zabbix, handled replications, and managed Nginx
- Managed Python, PHP, JS, Apache, MySQL and Popular CMSes.
```

- [ ] **Step 8: Write the sample books**

`content/books/designing-data-intensive-applications.md`:

```md
---
title: Designing Data-Intensive Applications
author: Martin Kleppmann
status: reading
progress: 68
started: "2026-07"
published: 2017
tags: [distributed-systems, databases]
sample: true
---

Sample entry. Replace with your own notes: what stuck with you, a quote worth keeping, where you'd use it.
```

`content/books/atomic-habits.md`:

```md
---
title: Atomic Habits
author: James Clear
status: reading
progress: 30
started: "2026-08"
published: 2018
tags: [self-improvement, habits]
sample: true
---

Sample entry. Replace with your own notes.
```

`content/books/fluent-forever.md`:

```md
---
title: Fluent Forever
author: Gabriel Wyner
status: paused
progress: 12
started: "2026-02"
published: 2014
tags: [language-learning, self-improvement]
sample: true
---

Sample entry. Replace with your own notes.
```

`content/books/site-reliability-engineering.md`:

```md
---
title: Site Reliability Engineering
author: Betsy Beyer, Chris Jones, Jennifer Petoff, Niall Richard Murphy
status: finished
finished: "2026-03"
rating: 5
published: 2016
tags: [sre, operations]
sample: true
---

Sample entry. Replace with your own notes.
```

`content/books/the-phoenix-project.md`:

```md
---
title: The Phoenix Project
author: Gene Kim, Kevin Behr, George Spafford
status: finished
finished: "2025-11"
rating: 4
published: 2013
tags: [devops, operations]
sample: true
---

Sample entry. Replace with your own notes.
```

`content/books/the-pragmatic-programmer.md`:

```md
---
title: The Pragmatic Programmer
author: David Thomas, Andrew Hunt
status: queued
published: 2019
tags: [craft]
sample: true
---
```

- [ ] **Step 9: Write the sample trips**

`content/travel/2024-05-portugal.md`:

```md
---
title: Lisbon and the Algarve coast
country: Portugal
countryCode: PT
start: "2024-05"
days: 9
cities:
  - { name: Lisbon, lat: 38.7223, lng: -9.1393 }
  - { name: Lagos, lat: 37.1028, lng: -8.6730 }
sample: true
---

Sample entry. Replace with your own trip notes.
```

`content/travel/2024-10-georgia.md`:

```md
---
title: Tbilisi and the Kazbegi mountains
country: Georgia
countryCode: GE
start: "2024-10"
days: 7
cities:
  - { name: Tbilisi, lat: 41.7151, lng: 44.8271 }
  - { name: Stepantsminda, lat: 42.6570, lng: 44.6433 }
sample: true
---

Sample entry. Replace with your own trip notes.
```

`content/travel/2025-04-japan.md`:

```md
---
title: Tokyo and Kyoto in cherry blossom season
country: Japan
countryCode: JP
start: "2025-04"
days: 14
cities:
  - { name: Tokyo, lat: 35.6762, lng: 139.6503 }
  - { name: Kyoto, lat: 35.0116, lng: 135.7681 }
sample: true
---

Sample entry. Replace with your own trip notes.
```

`content/travel/2026-06-iceland.md`:

```md
---
title: Ring Road in the midnight sun
country: Iceland
countryCode: IS
start: "2026-06"
days: 10
cities:
  - { name: Reykjavík, lat: 64.1466, lng: -21.9426 }
  - { name: Akureyri, lat: 65.6885, lng: -18.1262 }
sample: true
---

Sample entry. Replace with your own trip notes.
```

- [ ] **Step 10: Write the sample languages**

`content/languages/english.md`:

```md
---
name: English
level: C1
target: C1
since: "2010"
methods:
  - Technical documentation and RFCs every day
  - Conference talks without subtitles
sample: true
---

Sample entry. Replace with your own notes on how you learned and keep it up.
```

`content/languages/german.md`:

```md
---
name: German
level: B1
target: B2
since: "2024-01"
streakDays: 41
methods:
  - Anki, 20 new cards a day
  - Tutor twice a week
  - Podcasts on the commute
sample: true
---

Sample entry. Replace with your own notes.
```

`content/languages/spanish.md`:

```md
---
name: Spanish
level: A2
target: B1
since: "2025-09"
methods:
  - Duolingo
  - Series with Spanish subtitles
sample: true
---

Sample entry. Replace with your own notes.
```

- [ ] **Step 11: Write the sample sports**

`content/sport/running.md`:

```md
---
name: Running
unit: km
weekly: [18, 22, 20, 25, 0, 15, 24, 28, 30, 26, 32, 35]
streakDays: 41
records:
  - { label: 10k, value: "44:12", date: "2026-05" }
  - { label: half marathon, value: "1:39:40", date: "2025-10" }
events:
  - { name: Night Run Bratislava 10k, date: "2026-05-16", result: "44:12" }
  - { name: Vienna City Marathon, date: "2027-04-18" }
sample: true
---

Sample entry. Replace with your own training notes.
```

`content/sport/cycling.md`:

```md
---
name: Cycling
unit: km
weekly: [60, 0, 45, 80, 95, 70, 0, 110, 85, 60, 90, 120]
records:
  - { label: longest ride, value: "182 km", date: "2026-08" }
sample: true
---

Sample entry. Replace with your own notes.
```

`content/sport/climbing.md`:

```md
---
name: Climbing
unit: sessions
weekly: [2, 1, 2, 2, 0, 1, 2, 3, 2, 2, 1, 2]
active: false
records:
  - { label: hardest boulder, value: "6B+", date: "2026-04" }
sample: true
---

Sample entry. Replace with your own notes.
```

- [ ] **Step 12: Write the sample hobbies**

`content/hobbies/photography.md`:

```md
---
name: Photography
description: Street photography on a 35mm film camera
state: active
since: "2019-06"
sample: true
---

Sample entry. Replace with your own notes.
```

`content/hobbies/homelab.md`:

```md
---
name: Homelab
description: A small Proxmox cluster running more services than it should
state: active
since: "2021-01"
sample: true
---

Sample entry. Replace with your own notes.
```

`content/hobbies/chess.md`:

```md
---
name: Chess
description: Blitz games online
state: inactive
since: "2022-03"
sample: true
---

Sample entry. Replace with your own notes.
```

`content/hobbies/cooking.md`:

```md
---
name: Cooking
description: Slow-cooked stews and Georgian khachapuri
state: active
since: "2024-11"
sample: true
---

Sample entry. Replace with your own notes.
```

- [ ] **Step 13: Run the whole suite**

Run: `npm test`
Expected: PASS. All tests in `load.test.ts`, `schemas.test.ts` and `content.test.ts` pass (7 + 8 + 7).

- [ ] **Step 14: Type-check, lint, commit**

```bash
npx tsc --noEmit && npx eslint .
git add src/lib/content/schemas.ts src/lib/content/schemas.test.ts src/lib/content/collections.ts src/lib/content/content.test.ts content
git commit -m "feat: add content schemas, typed accessors and sample content"
```

---

### Task 3: Design tokens, theme and the TUI frame

**Files:**
- Rewrite: `src/app/globals.css`, `src/app/layout.tsx`
- Modify: `src/app/page.tsx` (temporary: drop the old background, top bar and `<main>`)
- Delete: `src/components/ThemeToggle.tsx`
- Create:
  - `src/lib/theme.ts`
  - `src/lib/tui/tabs.ts`
  - `src/components/shell/TuiFrame.tsx`
  - `src/components/shell/ShellHeader.tsx`
  - `src/components/shell/StatusLine.tsx`
  - `src/components/shell/ThemeToggle.tsx`
  - `src/components/shell/Prompt.tsx`
- Test: `src/lib/tui/tabs.test.ts`

**Interfaces:**
- Consumes: `getProfile`, `Profile` from Task 2.
- Produces:
  - `type Tab = { key: string; href: string; label: string }`
  - `TABS: readonly Tab[]`
  - `activeTabHref(pathname: string): string | undefined`
  - `promptPath(pathname: string): string`
  - `type Theme = 'dark' | 'light'`
  - `bootScript: string`
  - `currentTheme(): Theme`, `setTheme(t: Theme): void`, `toggleTheme(): void`
  - `<Prompt cmd label level? id? />`: a heading showing `$ cmd` visually, with `label` as its screen-reader text. `level` is 1 (default, `t-display`) or 2 (`t-title`).
  - `<TuiFrame profile>{children}</TuiFrame>`
  - CSS classes: `.t-display .t-title .t-dense .t-micro .link .frame .shell-* .tab .tab-key`

- [ ] **Step 1: Write the failing tabs test**

Create `src/lib/tui/tabs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TABS, activeTabHref, promptPath } from './tabs';

describe('activeTabHref', () => {
  it('matches home only on the exact root', () => {
    expect(activeTabHref('/')).toBe('/');
  });

  it('matches a section and its detail pages', () => {
    expect(activeTabHref('/books')).toBe('/books');
    expect(activeTabHref('/books/atomic-habits')).toBe('/books');
  });

  it('returns undefined for unknown paths', () => {
    expect(activeTabHref('/nope')).toBeUndefined();
  });
});

describe('promptPath', () => {
  it('shows the root as ~', () => {
    expect(promptPath('/')).toBe('~');
  });

  it('shows other paths under ~', () => {
    expect(promptPath('/travel/2025-04-japan')).toBe('~/travel/2025-04-japan');
  });

  it('drops a trailing slash', () => {
    expect(promptPath('/books/')).toBe('~/books');
  });
});

describe('TABS', () => {
  it('assigns keys 1-6 in order', () => {
    expect(TABS.map((t) => t.key).join('')).toBe('123456');
  });
});
```

Run: `npm test -- src/lib/tui/tabs.test.ts`
Expected: FAIL with `Failed to resolve import "./tabs"`.

- [ ] **Step 2: Implement tabs**

Create `src/lib/tui/tabs.ts`:

```ts
export interface Tab {
  key: string;
  href: string;
  label: string;
}

export const TABS: readonly Tab[] = [
  { key: '1', href: '/', label: '~' },
  { key: '2', href: '/books', label: 'books' },
  { key: '3', href: '/travel', label: 'travel' },
  { key: '4', href: '/languages', label: 'languages' },
  { key: '5', href: '/sport', label: 'sport' },
  { key: '6', href: '/hobbies', label: 'hobbies' },
];

export function activeTabHref(pathname: string): string | undefined {
  if (pathname === '/') return '/';
  const section = `/${pathname.split('/')[1]}`;
  return TABS.find((t) => t.href !== '/' && t.href === section)?.href;
}

export function promptPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '~' : `~${trimmed}`;
}
```

Run: `npm test -- src/lib/tui/tabs.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 3: Add the theme helpers**

Create `src/lib/theme.ts`:

```ts
export type Theme = 'dark' | 'light';

const THEME_KEY = 'theme';
const MOTD_KEY = 'motd-seen';

// Runs in <head> before first paint: applies the theme and arms the one-time MOTD playback on "/".
export const bootScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}d.dataset.theme=t}catch(e){d.dataset.theme='dark'}try{if(location.pathname==='/'&&!sessionStorage.getItem('${MOTD_KEY}')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.motdPlay='';sessionStorage.setItem('${MOTD_KEY}','1')}}catch(e){}})();`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this page view.
  }
}

export function toggleTheme(): void {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}
```

- [ ] **Step 4: Replace the global stylesheet**

Replace `src/app/globals.css` entirely:

```css
@import "tailwindcss";

:root {
  --bg: #0c1410;
  --fg: #8af5a0;
  --dim: #56966a;
  --warn: #ffb547;
  --alert: #ff6b57;
  --band: #101c16;
  --rule: #2a4535;
  color-scheme: dark;
}

[data-theme="light"] {
  --bg: #f4f7f0;
  --fg: #1f2b24;
  --dim: #56645a;
  --warn: #8f5400;
  --alert: #b3321b;
  --band: #dcebd9;
  --rule: #b9cbb8;
  color-scheme: light;
}

@theme inline {
  --color-bg: var(--bg);
  --color-fg: var(--fg);
  --color-dim: var(--dim);
  --color-warn: var(--warn);
  --color-alert: var(--alert);
  --color-band: var(--band);
  --color-rule: var(--rule);
  --font-mono: var(--font-martian), ui-monospace, monospace;
  --font-sans: var(--font-martian), ui-monospace, monospace;
  /* legacy aliases for the old home page components; removed in Task 10 */
  --color-background: var(--bg);
  --color-foreground: var(--fg);
  --color-accent: var(--warn);
}

html {
  background: var(--bg);
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.5;
  font-variation-settings: "wdth" 100;
  -webkit-font-smoothing: antialiased;
}

::selection {
  background: var(--fg);
  color: var(--bg);
}

:focus-visible {
  outline: 2px solid var(--warn);
  outline-offset: 2px;
}

kbd {
  font: inherit;
  color: var(--fg);
}

.t-display {
  font-size: clamp(1.5rem, 4.5vw, 2.5rem);
  line-height: 1.15;
  font-weight: 700;
  font-variation-settings: "wdth" 112.5, "wght" 700;
  overflow-wrap: anywhere;
}

:root:not([data-theme="light"]) .t-display {
  text-shadow: 0 0 12px color-mix(in srgb, var(--fg) 35%, transparent);
}

.t-title {
  font-size: 1.3125rem;
  line-height: 1.3;
  font-weight: 600;
  font-variation-settings: "wdth" 100, "wght" 600;
}

.t-dense {
  font-size: 0.875rem;
  font-variation-settings: "wdth" 87.5;
}

.t-micro {
  font-size: 0.75rem;
}

.link {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.link:hover {
  color: var(--warn);
}

.frame {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  max-width: 110ch;
  margin: 0 auto;
}

.skip-link {
  position: absolute;
  left: -9999px;
}

.skip-link:focus {
  left: 1rem;
  top: 1rem;
  z-index: 50;
  padding: 0.25rem 1ch;
  background: var(--fg);
  color: var(--bg);
}

.shell-title {
  order: 1;
  padding: 0.5rem 2ch;
  border-bottom: 1px solid var(--rule);
  color: var(--dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shell-main {
  order: 2;
  flex: 1;
  padding: 1.5rem 2ch 3rem;
}

.shell-status {
  order: 3;
  display: flex;
  gap: 2ch;
  padding: 0.375rem 2ch;
  border-top: 1px solid var(--rule);
}

.shell-tabs {
  order: 4;
  position: sticky;
  bottom: 0;
  z-index: 10;
  background: var(--bg);
  border-top: 1px solid var(--rule);
  overflow-x: auto;
}

.shell-tabs ul {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tab {
  display: block;
  padding: 0.5rem 1.5ch;
  white-space: nowrap;
  text-decoration: none;
}

.tab:hover {
  background: var(--band);
}

.tab[aria-current="page"] {
  background: var(--fg);
  color: var(--bg);
}

.tab[aria-current="page"] .tab-key {
  color: var(--bg);
}

@media (min-width: 640px) {
  .frame {
    min-height: calc(100dvh - 3rem);
    margin: 1.5rem auto;
    border: 1px solid var(--rule);
  }

  .shell-tabs {
    order: 2;
    position: static;
    border-top: 0;
    border-bottom: 1px solid var(--rule);
  }

  .shell-main {
    order: 3;
    padding: 2rem 4ch 3rem;
  }

  .shell-status {
    order: 4;
  }
}
```

- [ ] **Step 5: Create the shell components**

`src/components/shell/ThemeToggle.tsx`:

```tsx
'use client';

import { useSyncExternalStore } from 'react';
import { type Theme, currentTheme, toggleTheme } from '@/lib/theme';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);
  const label = theme === null ? '…' : theme === 'dark' ? 'crt' : 'printout';
  return (
    <button type="button" onClick={toggleTheme} className="cursor-pointer hover:text-warn">
      theme: {label}
    </button>
  );
}
```

`src/components/shell/ShellHeader.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TABS, activeTabHref, promptPath } from '@/lib/tui/tabs';

export function ShellHeader({ user, host }: { user: string; host: string }) {
  const pathname = usePathname();
  const active = activeTabHref(pathname);
  return (
    <>
      <div className="shell-title t-dense">
        {user}@{host}: {promptPath(pathname)}
      </div>
      <nav aria-label="Sections" className="shell-tabs">
        <ul>
          {TABS.map((tab) => (
            <li key={tab.href}>
              <Link href={tab.href} className="tab" aria-current={active === tab.href ? 'page' : undefined}>
                <span className="tab-key text-dim">{tab.key}</span> {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
```

`src/components/shell/StatusLine.tsx`:

```tsx
'use client';

import { ThemeToggle } from './ThemeToggle';

export function StatusLine({ uptime }: { uptime?: string }) {
  return (
    <footer className="shell-status t-dense">
      <div className="ml-auto flex gap-[2ch]">
        <ThemeToggle />
        {uptime && <span className="text-dim">up {uptime}</span>}
      </div>
    </footer>
  );
}
```

`src/components/shell/Prompt.tsx`:

```tsx
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
```

`src/components/shell/TuiFrame.tsx`:

```tsx
import type { ReactNode } from 'react';
import type { Profile } from '@/lib/content/collections';
import { ShellHeader } from './ShellHeader';
import { StatusLine } from './StatusLine';

export function TuiFrame({ profile, children }: { profile: Profile; children: ReactNode }) {
  return (
    <div className="frame">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ShellHeader user={profile.handle} host={profile.host} />
      <main id="main" className="shell-main">
        {children}
      </main>
      <StatusLine uptime={profile.uptime} />
    </div>
  );
}
```

- [ ] **Step 6: Rewrite the root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Martian_Mono } from 'next/font/google';
import { TuiFrame } from '@/components/shell/TuiFrame';
import { getProfile } from '@/lib/content/collections';
import { bootScript } from '@/lib/theme';
import './globals.css';

const martian = Martian_Mono({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  variable: '--font-martian',
  display: 'swap',
});

export function generateMetadata(): Metadata {
  const profile = getProfile();
  return {
    ...(profile.siteUrl ? { metadataBase: new URL(profile.siteUrl) } : {}),
    title: { default: `${profile.name} | ${profile.role}`, template: `%s | ${profile.name}` },
    description: `${profile.name}, ${profile.role}. Career, plus the books, travel, languages, sport and hobbies in between.`,
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = getProfile();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className={martian.variable}>
        <TuiFrame profile={profile}>{children}</TuiFrame>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Make the old home page fit inside the frame (temporary until Task 10)**

Delete the old toggle: `git rm src/components/ThemeToggle.tsx`

Replace `src/app/page.tsx`:

```tsx
import AgentContact from "@/components/AgentContact";
import CareerAccordion from "@/components/CareerAccordion";
import ComplianceBadge from "@/components/ComplianceBadge";
import ConsoleHeader from "@/components/ConsoleHeader";
import HiddenSEO from "@/components/HiddenSEO";

export default function Home() {
  return (
    <div>
      <ConsoleHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="border border-foreground/30 p-4">
            <h1 className="text-xl font-bold mb-2 text-accent">MIKE G.</h1>
            <p className="text-sm opacity-80 mb-4">SRE & (Dev/AI/Sec Ops) Architect</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <ComplianceBadge label="Terraform Associate 003" />
              <ComplianceBadge label="CCNA" />
              <ComplianceBadge label="CKAD" />
              <ComplianceBadge label="CKA" />
              <ComplianceBadge label="AWS Certified SA - Associate (SAA-C03)" />
            </div>
          </div>
          <div className="space-y-4 text-sm">
            <div className="p-3 border-l-2 border-accent bg-accent/5">
              <div className="font-bold text-accent">UPTIME GUARANTEE</div>
              <div className="text-lg font-bold">100.00%</div>
              <div className="text-xs opacity-70">Operational Availability</div>
            </div>
            <div className="p-3 border-l-2 border-accent bg-accent/5">
              <div className="font-bold text-accent">ARCHITECTURE</div>
              <div className="text-xs">Legacy VM &rarr; AWS ECS</div>
              <div className="text-xs opacity-70">Migration Complete</div>
            </div>
            <AgentContact />
          </div>
        </div>
        <div className="lg:col-span-2">
          <CareerAccordion />
        </div>
      </div>
      <HiddenSEO />
    </div>
  );
}
```

- [ ] **Step 8: Verify in the browser**

Run: `npx tsc --noEmit && npx eslint . && npm test`
Expected: all clean, all tests pass.

Run `npm run dev` (restart it if one is already running), open http://localhost:3000 and check:
- The frame shows the title line `mike@mike-g: ~`, tabs `1 ~ 2 books … 6 hobbies` with `~` in inverse video, and a status line with `theme: crt` and `up 100.00%`.
- Clicking `theme: crt` switches to the printout palette. Reload: no flash of the dark theme, and it's still printout.
- At a 375px viewport width the tabs sit at the bottom and scroll sideways inside themselves, with no page-level horizontal scroll.
- Clicking `books` shows Next's 404 inside the frame. That's expected until Task 5.

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/app/page.tsx src/lib/theme.ts src/lib/tui/tabs.ts src/lib/tui/tabs.test.ts src/components/shell
git commit -m "feat: add CRT/printout design tokens and persistent TUI frame"
```

---

### Task 4: Keyboard navigation and help dialog

**Files:**
- Create: `src/lib/tui/keys.ts`, `src/components/shell/KeyboardNav.tsx`
- Modify: `src/components/shell/StatusLine.tsx`, `src/components/shell/TuiFrame.tsx`, `src/app/globals.css` (append)
- Test: `src/lib/tui/keys.test.ts`

**Interfaces:**
- Consumes: `TABS` (Task 3), `toggleTheme` (Task 3).
- Produces:
  - `type KeyAction = { type: 'goto'; href: string } | { type: 'move'; delta: 1 | -1 } | { type: 'toggleTheme' } | { type: 'help' }`
  - `resolveKey(input: KeyInput): KeyAction | null`
  - `nextIndex(current: number, count: number, delta: 1 | -1): number`
  - DOM contract: any focusable element in `<main>` with a `data-nav-item` attribute is a j/k stop. `window` event `'tui:help'` opens the help dialog.

- [ ] **Step 1: Write the failing test**

Create `src/lib/tui/keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { nextIndex, resolveKey } from './keys';

const plain = { altKey: false, ctrlKey: false, metaKey: false, isEditable: false };

describe('resolveKey', () => {
  it('maps digits to section tabs', () => {
    expect(resolveKey({ ...plain, key: '1' })).toEqual({ type: 'goto', href: '/' });
    expect(resolveKey({ ...plain, key: '2' })).toEqual({ type: 'goto', href: '/books' });
    expect(resolveKey({ ...plain, key: '6' })).toEqual({ type: 'goto', href: '/hobbies' });
  });

  it('maps j, k, t and ?', () => {
    expect(resolveKey({ ...plain, key: 'j' })).toEqual({ type: 'move', delta: 1 });
    expect(resolveKey({ ...plain, key: 'k' })).toEqual({ type: 'move', delta: -1 });
    expect(resolveKey({ ...plain, key: 't' })).toEqual({ type: 'toggleTheme' });
    expect(resolveKey({ ...plain, key: '?' })).toEqual({ type: 'help' });
  });

  it('leaves browser shortcuts alone when Ctrl, Cmd or Alt is held', () => {
    expect(resolveKey({ ...plain, key: '1', ctrlKey: true })).toBeNull();
    expect(resolveKey({ ...plain, key: '1', metaKey: true })).toBeNull();
    expect(resolveKey({ ...plain, key: 't', altKey: true })).toBeNull();
  });

  it('ignores keys typed into editable fields', () => {
    expect(resolveKey({ ...plain, key: 'j', isEditable: true })).toBeNull();
  });

  it('ignores unmapped and uppercase keys', () => {
    expect(resolveKey({ ...plain, key: 'x' })).toBeNull();
    expect(resolveKey({ ...plain, key: 'J' })).toBeNull();
    expect(resolveKey({ ...plain, key: '7' })).toBeNull();
  });
});

describe('nextIndex', () => {
  it('starts at the first item going down and the last going up', () => {
    expect(nextIndex(-1, 5, 1)).toBe(0);
    expect(nextIndex(-1, 5, -1)).toBe(4);
  });

  it('moves one step and stops at the ends', () => {
    expect(nextIndex(2, 5, 1)).toBe(3);
    expect(nextIndex(4, 5, 1)).toBe(4);
    expect(nextIndex(0, 5, -1)).toBe(0);
  });

  it('returns -1 when there is nothing to focus', () => {
    expect(nextIndex(-1, 0, 1)).toBe(-1);
  });
});
```

Run: `npm test -- src/lib/tui/keys.test.ts`
Expected: FAIL with `Failed to resolve import "./keys"`.

- [ ] **Step 2: Implement the key mapping**

Create `src/lib/tui/keys.ts`:

```ts
import { TABS } from './tabs';

export type KeyAction =
  | { type: 'goto'; href: string }
  | { type: 'move'; delta: 1 | -1 }
  | { type: 'toggleTheme' }
  | { type: 'help' };

export interface KeyInput {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  isEditable: boolean;
}

export function resolveKey(input: KeyInput): KeyAction | null {
  if (input.altKey || input.ctrlKey || input.metaKey || input.isEditable) return null;
  const tab = TABS.find((t) => t.key === input.key);
  if (tab) return { type: 'goto', href: tab.href };
  switch (input.key) {
    case 'j':
      return { type: 'move', delta: 1 };
    case 'k':
      return { type: 'move', delta: -1 };
    case 't':
      return { type: 'toggleTheme' };
    case '?':
      return { type: 'help' };
    default:
      return null;
  }
}

export function nextIndex(current: number, count: number, delta: 1 | -1): number {
  if (count === 0) return -1;
  if (current < 0) return delta > 0 ? 0 : count - 1;
  return Math.min(count - 1, Math.max(0, current + delta));
}
```

Run: `npm test -- src/lib/tui/keys.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 3: Add the KeyboardNav component**

Create `src/components/shell/KeyboardNav.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toggleTheme } from '@/lib/theme';
import { nextIndex, resolveKey } from '@/lib/tui/keys';

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function KeyboardNav() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const openHelp = () => dialog?.showModal();

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const action = resolveKey({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        isEditable: isEditable(event.target),
      });
      if (!action) return;

      if (dialog?.open) {
        if (action.type === 'help') {
          event.preventDefault();
          dialog.close();
        }
        return;
      }

      event.preventDefault();
      if (action.type === 'goto') {
        router.push(action.href);
      } else if (action.type === 'toggleTheme') {
        toggleTheme();
      } else if (action.type === 'help') {
        openHelp();
      } else {
        const items = Array.from(document.querySelectorAll<HTMLElement>('main [data-nav-item]'));
        const index = nextIndex(items.indexOf(document.activeElement as HTMLElement), items.length, action.delta);
        if (index >= 0) {
          items[index].focus();
          items[index].scrollIntoView({ block: 'nearest' });
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('tui:help', openHelp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('tui:help', openHelp);
    };
  }, [router]);

  return (
    <dialog ref={dialogRef} className="help" aria-labelledby="help-title">
      <h2 id="help-title" className="t-title mb-4">
        Keyboard shortcuts
      </h2>
      <dl className="grid grid-cols-[10ch_minmax(0,1fr)] gap-y-1">
        <dt><kbd>1</kbd>-<kbd>6</kbd></dt>
        <dd>switch section</dd>
        <dt><kbd>j</kbd> <kbd>k</kbd></dt>
        <dd>next / previous item</dd>
        <dt><kbd>enter</kbd></dt>
        <dd>open item</dd>
        <dt><kbd>t</kbd></dt>
        <dd>switch theme (crt / printout)</dd>
        <dt><kbd>?</kbd></dt>
        <dd>show this help</dd>
        <dt><kbd>esc</kbd></dt>
        <dd>close</dd>
      </dl>
      <form method="dialog" className="mt-6">
        <button type="submit" className="link cursor-pointer">
          Close
        </button>
      </form>
    </dialog>
  );
}
```

- [ ] **Step 4: Add key hints to the status line and mount KeyboardNav**

Replace `src/components/shell/StatusLine.tsx`:

```tsx
'use client';

import { ThemeToggle } from './ThemeToggle';

export function StatusLine({ uptime }: { uptime?: string }) {
  return (
    <footer className="shell-status t-dense">
      <p className="hidden gap-[2ch] text-dim sm:flex">
        <button type="button" className="hint" onClick={() => window.dispatchEvent(new Event('tui:help'))}>
          <kbd>?</kbd> keys
        </button>
        <span>
          <kbd>1-6</kbd> tabs
        </span>
        <span>
          <kbd>j/k</kbd> move
        </span>
        <span>
          <kbd>t</kbd> theme
        </span>
      </p>
      <div className="ml-auto flex gap-[2ch]">
        <ThemeToggle />
        {uptime && <span className="text-dim">up {uptime}</span>}
      </div>
    </footer>
  );
}
```

In `src/components/shell/TuiFrame.tsx`, add `import { KeyboardNav } from './KeyboardNav';` and render `<KeyboardNav />` right after `<StatusLine uptime={profile.uptime} />`.

Append to `src/app/globals.css`:

```css
.help {
  max-width: min(48ch, calc(100vw - 2rem));
  padding: 1.5rem 3ch;
  border: 1px solid var(--fg);
  background: var(--bg);
  color: var(--fg);
}

.help::backdrop {
  background: color-mix(in srgb, var(--bg) 75%, transparent);
}

.hint {
  cursor: pointer;
}

.hint:hover {
  color: var(--warn);
}
```

- [ ] **Step 5: Verify in the browser**

Run: `npx tsc --noEmit && npx eslint . && npm test`
Expected: clean, all tests pass.

With the dev server running, check at http://localhost:3000:
- `2` goes to `/books` (a 404 for now) and `1` comes back.
- `t` switches the theme.
- `?` opens the help dialog. `Esc` closes it, and so does `?` again.
- Ctrl+1 (Cmd+1 on macOS) still switches browser tabs.
- Clicking `? keys` in the status line opens the dialog.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tui/keys.ts src/lib/tui/keys.test.ts src/components/shell/KeyboardNav.tsx src/components/shell/StatusLine.tsx src/components/shell/TuiFrame.tsx src/app/globals.css
git commit -m "feat: add keyboard navigation and shortcut help"
```

---

### Task 5: Books (htop list and man-page detail)

**Files:**
- Create:
  - `src/lib/tui/meter.ts`, `src/lib/tui/books.ts`
  - `src/components/Markdown.tsx`, `src/components/SampleTag.tsx`, `src/components/Meter.tsx`, `src/components/shell/BackLink.tsx`
  - `src/components/books/HtopList.tsx`, `src/components/books/ManPage.tsx`
  - `src/app/books/page.tsx`, `src/app/books/[slug]/page.tsx`
- Modify: `package.json`, `src/app/globals.css` (append)
- Test: `src/lib/tui/meter.test.ts`, `src/lib/tui/books.test.ts`

**Interfaces:**
- Consumes: `Book`, `getBooks`, `getBook` (Task 2); `Prompt` (Task 3); the `data-nav-item` contract (Task 4).
- Produces:
  - `filledCells(percent: number, cells?: number): number`
  - `groupBooks(books: Book[]): { running: Book[]; finishedByYear: [string, Book[]][]; queued: Book[] }`
  - `relatedBooks(book: Book, all: Book[], limit?: number): Book[]`
  - Components: `<Markdown source />`, `<SampleTag show />`, `<Meter percent cells? />`, `<BackLink href label />`
  - CSS classes: `.rows`, `.row` (the list-row pattern every later section uses), `.meter`, `.sample-tag`, `.prose-tui`, `.man`, `.man-h`, `.man-indent`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tui/meter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { filledCells } from './meter';

describe('filledCells', () => {
  it('rounds to the nearest cell', () => {
    expect(filledCells(68)).toBe(7);
  });

  it('is empty at 0 and full at 100', () => {
    expect(filledCells(0)).toBe(0);
    expect(filledCells(100)).toBe(10);
  });

  it('shows at least one cell for any progress', () => {
    expect(filledCells(4)).toBe(1);
  });

  it('clamps out-of-range values', () => {
    expect(filledCells(150)).toBe(10);
    expect(filledCells(-5)).toBe(0);
  });

  it('supports other widths', () => {
    expect(filledCells(50, 20)).toBe(10);
  });
});
```

Create `src/lib/tui/books.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Book } from '@/lib/content/collections';
import { groupBooks, relatedBooks } from './books';

function book(slug: string, fields: Partial<Book> & Pick<Book, 'status'>): Book {
  return { slug, title: slug, author: 'A', tags: [], sample: false, body: '', ...fields };
}

describe('groupBooks', () => {
  it('lists reading before paused, each by progress descending', () => {
    const groups = groupBooks([
      book('p', { status: 'paused', progress: 90 }),
      book('r1', { status: 'reading', progress: 10 }),
      book('r2', { status: 'reading', progress: 70 }),
    ]);
    expect(groups.running.map((b) => b.slug)).toEqual(['r2', 'r1', 'p']);
  });

  it('groups finished books by year, newest year and newest book first', () => {
    const groups = groupBooks([
      book('old', { status: 'finished', finished: '2025-02' }),
      book('new', { status: 'finished', finished: '2026-03' }),
      book('newer', { status: 'finished', finished: '2026-07' }),
    ]);
    expect(groups.finishedByYear.map(([year, list]) => [year, list.map((b) => b.slug)])).toEqual([
      ['2026', ['newer', 'new']],
      ['2025', ['old']],
    ]);
  });

  it('sorts queued books by title', () => {
    const groups = groupBooks([
      book('z', { status: 'queued', title: 'Zen' }),
      book('a', { status: 'queued', title: 'Art' }),
    ]);
    expect(groups.queued.map((b) => b.slug)).toEqual(['a', 'z']);
  });

  it('returns empty groups when there are no books', () => {
    expect(groupBooks([])).toEqual({ running: [], finishedByYear: [], queued: [] });
  });
});

describe('relatedBooks', () => {
  const sre = book('sre', { status: 'finished', finished: '2026-03', tags: ['sre', 'operations'] });
  const phoenix = book('phoenix', { status: 'finished', finished: '2025-11', tags: ['operations'] });
  const habits = book('habits', { status: 'reading', progress: 30, tags: ['habits'] });

  it('returns other books that share a tag', () => {
    expect(relatedBooks(sre, [sre, phoenix, habits]).map((b) => b.slug)).toEqual(['phoenix']);
  });

  it('returns nothing for a book without tags', () => {
    expect(relatedBooks(book('x', { status: 'queued' }), [sre, phoenix, habits])).toEqual([]);
  });
});
```

Run: `npm test -- src/lib/tui/meter.test.ts src/lib/tui/books.test.ts`
Expected: FAIL with `Failed to resolve import "./meter"` and `"./books"`.

- [ ] **Step 2: Implement meter and books helpers**

Create `src/lib/tui/meter.ts`:

```ts
export function filledCells(percent: number, cells = 10): number {
  const p = Math.min(100, Math.max(0, percent));
  if (p === 0) return 0;
  return Math.max(1, Math.round((p / 100) * cells));
}
```

Create `src/lib/tui/books.ts`:

```ts
import type { Book } from '@/lib/content/collections';

export interface BookGroups {
  running: Book[];
  finishedByYear: [string, Book[]][];
  queued: Book[];
}

export function groupBooks(books: Book[]): BookGroups {
  const running = books
    .filter((b) => b.status === 'reading' || b.status === 'paused')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'reading' ? -1 : 1;
      return (b.progress ?? 0) - (a.progress ?? 0);
    });

  const byYear = new Map<string, Book[]>();
  const finished = books
    .filter((b) => b.status === 'finished')
    .sort((a, b) => (b.finished ?? '').localeCompare(a.finished ?? ''));
  for (const b of finished) {
    const year = (b.finished ?? '').slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), b]);
  }
  const finishedByYear = [...byYear.entries()].sort(([a], [b]) => b.localeCompare(a));

  const queued = books.filter((b) => b.status === 'queued').sort((a, b) => a.title.localeCompare(b.title));

  return { running, finishedByYear, queued };
}

export function relatedBooks(book: Book, all: Book[], limit = 5): Book[] {
  return all.filter((b) => b.slug !== book.slug && b.tags.some((t) => book.tags.includes(t))).slice(0, limit);
}
```

Run: `npm test -- src/lib/tui/meter.test.ts src/lib/tui/books.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 3: Install the Markdown renderer and add the shared components**

```bash
npm install react-markdown@^10.1.0 remark-gfm@^4.0.1
```

`src/components/Markdown.tsx`:

```tsx
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
```

`src/components/SampleTag.tsx`:

```tsx
export function SampleTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="sample-tag" title="Placeholder entry">
      sample
    </span>
  );
}
```

`src/components/Meter.tsx`:

```tsx
import { filledCells } from '@/lib/tui/meter';

export function Meter({ percent, cells = 10 }: { percent: number; cells?: number }) {
  const on = filledCells(percent, cells);
  return (
    <span className="meter" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <span key={i} data-on={i < on ? '' : undefined} />
      ))}
    </span>
  );
}
```

`src/components/shell/BackLink.tsx`:

```tsx
import Link from 'next/link';

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <p className="mt-14">
      <Link href={href} className="link">
        <span aria-hidden="true" className="text-dim">
          $ cd ..{' '}
        </span>
        {label}
      </Link>
    </p>
  );
}
```

- [ ] **Step 4: Append list-row, meter, prose and man-page styles**

Append to `src/app/globals.css`:

```css
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rows > li:nth-child(even) {
  background: var(--band);
}

.row {
  display: grid;
  align-items: baseline;
  padding: 0.375rem 1ch;
  text-decoration: none;
}

.row:hover {
  background: color-mix(in srgb, var(--fg) 8%, transparent);
}

.row:focus-visible {
  outline: none;
  background: var(--fg);
  color: var(--bg);
}

.row:focus-visible :is(.text-dim, .text-warn, .text-alert, .text-fg) {
  color: var(--bg);
}

.row:focus-visible .meter {
  --meter-on: var(--bg);
  --meter-off: color-mix(in srgb, var(--bg) 35%, transparent);
}

.row:focus-visible .sample-tag {
  color: var(--bg);
}

.meter {
  display: inline-grid;
  grid-auto-flow: column;
  grid-auto-columns: 0.55ch;
  gap: 1px;
  height: 0.8em;
  vertical-align: -0.05em;
  --meter-on: currentColor;
  --meter-off: color-mix(in srgb, currentColor 25%, transparent);
}

.meter > span {
  background: var(--meter-off);
}

.meter > span[data-on] {
  background: var(--meter-on);
}

.sample-tag {
  margin-left: 1ch;
  padding: 0 0.5ch;
  border: 1px solid currentColor;
  color: var(--warn);
  font-size: 0.75rem;
  white-space: nowrap;
  vertical-align: 0.1em;
}

.prose-tui {
  max-width: 68ch;
  font-size: 1rem;
  line-height: 1.7;
}

.prose-tui > * + * {
  margin-top: 1em;
}

.prose-tui h3 {
  margin-top: 1.75em;
  font-weight: 700;
  font-variation-settings: "wdth" 100, "wght" 700;
}

.prose-tui a {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.prose-tui a:hover {
  color: var(--warn);
}

.prose-tui ul {
  padding-left: 2ch;
  list-style: none;
}

.prose-tui ul > li::before {
  content: "-";
  display: inline-block;
  width: 2ch;
  margin-left: -2ch;
  color: var(--dim);
}

.prose-tui li + li {
  margin-top: 0.25em;
}

.prose-tui ol {
  padding-left: 3ch;
  list-style: decimal;
}

.prose-tui code {
  padding: 0 0.3ch;
  background: var(--band);
}

.prose-tui blockquote {
  padding-left: 2ch;
  border-left: 2px solid var(--rule);
  color: var(--dim);
}

.man {
  max-width: 80ch;
}

.man section + section {
  margin-top: 1.5rem;
}

.man-h {
  font-weight: 700;
  font-variation-settings: "wdth" 100, "wght" 700;
}

.man-indent {
  padding-left: 3ch;
}

@media (min-width: 640px) {
  .man-indent {
    padding-left: 7ch;
  }
}
```

- [ ] **Step 5: Build the list and detail components**

`src/components/books/HtopList.tsx`:

```tsx
import Link from 'next/link';
import { Meter } from '@/components/Meter';
import { SampleTag } from '@/components/SampleTag';
import type { Book } from '@/lib/content/collections';
import { groupBooks } from '@/lib/tui/books';

export function HtopList({ books }: { books: Book[] }) {
  const { running, finishedByYear, queued } = groupBooks(books);
  const reading = running.filter((b) => b.status === 'reading').length;

  return (
    <div className="space-y-12">
      <p className="text-dim">
        Tasks: {books.length} total, {reading} running, {running.length - reading} sleeping, {queued.length} queued
      </p>

      {running.length > 0 && (
        <section aria-labelledby="books-running">
          <h2 id="books-running" className="t-title mb-3">
            in progress
          </h2>
          <ul className="rows">
            {running.map((b) => {
              const tone = b.status === 'reading' ? 'text-warn' : 'text-dim';
              return (
                <li key={b.slug}>
                  <Link
                    href={`/books/${b.slug}`}
                    data-nav-item
                    className="row grid-cols-[2ch_minmax(0,1fr)] gap-x-[2ch] sm:grid-cols-[2ch_18ch_minmax(0,1fr)_22ch]"
                  >
                    <span className={tone}>
                      <span aria-hidden="true">{b.status === 'reading' ? 'R' : 'S'}</span>
                      <span className="sr-only">{b.status}</span>
                    </span>
                    <span className={`${tone} whitespace-nowrap`}>
                      <Meter percent={b.progress ?? 0} />{' '}
                      <span className="inline-block w-[4ch] text-right">{b.progress ?? 0}%</span>
                    </span>
                    <span className="col-start-2 sm:col-start-auto">
                      {b.title}
                      <SampleTag show={b.sample} />
                    </span>
                    <span className="col-start-2 text-dim sm:col-start-auto">{b.author}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {finishedByYear.map(([year, list]) => (
        <section key={year} aria-labelledby={`books-${year}`}>
          <h2 id={`books-${year}`} className="t-title mb-3">
            finished in {year}
          </h2>
          <ul className="rows">
            {list.map((b) => (
              <li key={b.slug}>
                <Link
                  href={`/books/${b.slug}`}
                  data-nav-item
                  className="row grid-cols-[8ch_minmax(0,1fr)] gap-x-[2ch] sm:grid-cols-[8ch_4ch_minmax(0,1fr)_22ch]"
                >
                  <span className="text-dim">{b.finished}</span>
                  <span className="text-dim">
                    {b.rating && (
                      <>
                        <span aria-hidden="true">{b.rating}/5</span>
                        <span className="sr-only">rated {b.rating} out of 5</span>
                      </>
                    )}
                  </span>
                  <span className="col-start-2 sm:col-start-auto">
                    {b.title}
                    <SampleTag show={b.sample} />
                  </span>
                  <span className="col-start-2 text-dim sm:col-start-auto">{b.author}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {queued.length > 0 && (
        <section aria-labelledby="books-queued">
          <h2 id="books-queued" className="t-title mb-3">
            queued
          </h2>
          <ul className="rows">
            {queued.map((b) => (
              <li key={b.slug}>
                <Link
                  href={`/books/${b.slug}`}
                  data-nav-item
                  className="row grid-cols-[minmax(0,1fr)] gap-x-[2ch] sm:grid-cols-[minmax(0,1fr)_22ch]"
                >
                  <span>
                    {b.title}
                    <SampleTag show={b.sample} />
                  </span>
                  <span className="text-dim">{b.author}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

`src/components/books/ManPage.tsx`:

```tsx
import Link from 'next/link';
import { Markdown } from '@/components/Markdown';
import { SampleTag } from '@/components/SampleTag';
import type { Book } from '@/lib/content/collections';

export function ManPage({ book, related }: { book: Book; related: Book[] }) {
  const name = `${book.slug.toUpperCase()}(7)`;
  const synopsis: [string, string][] = [['status', book.status]];
  if (book.progress !== undefined && book.status !== 'finished') synopsis.push(['progress', `${book.progress}%`]);
  if (book.started) synopsis.push(['started', book.started]);
  if (book.finished) synopsis.push(['finished', book.finished]);
  if (book.rating) synopsis.push(['rating', `${book.rating}/5`]);
  if (book.published) synopsis.push(['published', String(book.published)]);
  if (book.tags.length > 0) synopsis.push(['tags', book.tags.join(', ')]);

  return (
    <article className="man">
      <h1 className="sr-only">{book.title}</h1>
      <header aria-hidden="true" className="t-dense mb-8 flex justify-between gap-[2ch] text-dim">
        <span className="truncate">{name}</span>
        <span className="hidden sm:inline">Reading Manual</span>
        <span className="hidden truncate sm:inline">{name}</span>
      </header>

      <section>
        <h2 className="man-h">NAME</h2>
        <p className="man-indent">
          {book.title} - {book.author}
          <SampleTag show={book.sample} />
        </p>
      </section>

      <section>
        <h2 className="man-h">SYNOPSIS</h2>
        <dl className="man-indent grid grid-cols-[11ch_minmax(0,1fr)] gap-x-[2ch]">
          {synopsis.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-dim">{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {book.body && (
        <section>
          <h2 className="man-h">NOTES</h2>
          <div className="man-indent">
            <Markdown source={book.body} />
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="man-h">SEE ALSO</h2>
          <p className="man-indent flex flex-wrap gap-x-[2ch]">
            {related.map((r) => (
              <Link key={r.slug} href={`/books/${r.slug}`} data-nav-item className="link">
                {r.slug}(7)
              </Link>
            ))}
          </p>
        </section>
      )}

      <footer aria-hidden="true" className="t-dense mt-12 flex justify-between gap-[2ch] text-dim">
        <span>mike-g</span>
        <span>{book.finished ?? book.started ?? ''}</span>
        <span className="hidden truncate sm:inline">{name}</span>
      </footer>
    </article>
  );
}
```

- [ ] **Step 6: Add the routes**

`src/app/books/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { HtopList } from '@/components/books/HtopList';
import { Prompt } from '@/components/shell/Prompt';
import { getBooks } from '@/lib/content/collections';

export const metadata: Metadata = {
  title: 'Books',
  description: 'Books in progress, finished and queued.',
};

export default function BooksPage() {
  const books = getBooks();
  return (
    <>
      <Prompt cmd="htop -u books" label="Books" />
      {books.length === 0 ? <p className="text-dim">No books logged yet.</p> : <HtopList books={books} />}
    </>
  );
}
```

`src/app/books/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ManPage } from '@/components/books/ManPage';
import { BackLink } from '@/components/shell/BackLink';
import { getBook, getBooks } from '@/lib/content/collections';
import { relatedBooks } from '@/lib/tui/books';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getBooks().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const book = getBook((await params).slug);
  return book ? { title: book.title, description: `${book.title} by ${book.author}` } : {};
}

export default async function BookPage({ params }: Params) {
  const { slug } = await params;
  const book = getBook(slug);
  if (!book) notFound();
  return (
    <>
      <ManPage book={book} related={relatedBooks(book, getBooks())} />
      <BackLink href="/books" label="Back to books" />
    </>
  );
}
```

- [ ] **Step 7: Verify in the browser**

Run: `npx tsc --noEmit && npx eslint . && npm test`
Expected: clean, all tests pass.

In the dev server check:
- `/books` shows the "Tasks:" line, then "in progress" (DDIA 68% and Atomic Habits 30% in amber with R, Fluent Forever 12% dim with S), "finished in 2026", "finished in 2025" and "queued".
- Every row has a `sample` tag, and even rows have the band background.
- `j`/`k` moves an inverse-video highlight through the rows. `Enter` opens `/books/designing-data-intensive-applications`.
- The detail page shows NAME, SYNOPSIS, NOTES, SEE ALSO. SRE shows `the-phoenix-project(7)`.
- Both themes and 375px width work: rows stack and there's no horizontal scroll.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/tui/meter.ts src/lib/tui/meter.test.ts src/lib/tui/books.ts src/lib/tui/books.test.ts src/components/Markdown.tsx src/components/SampleTag.tsx src/components/Meter.tsx src/components/shell/BackLink.tsx src/components/books src/app/books src/app/globals.css
git commit -m "feat: add books section as htop list with man-page details"
```

---

### Task 6: Travel (traceroute and world map)

**Files:**
- Create:
  - `src/lib/tui/travel.ts`, `src/lib/tui/travelMap.ts`
  - `src/components/travel/Traceroute.tsx`, `src/components/travel/WorldMap.tsx`
  - `src/app/travel/page.tsx`, `src/app/travel/[slug]/page.tsx`
- Modify: `package.json`, `next.config.ts`
- Test: `src/lib/tui/travel.test.ts`, `src/lib/tui/travelMap.test.ts`

**Interfaces:**
- Consumes: `Trip`, `getTrips`, `getTrip`, `getProfile` (Task 2); `Prompt` (Task 3); `SampleTag`, `Markdown`, `BackLink`, `.rows/.row` (Task 5).
- Produces:
  - `haversineKm(a: Coord, b: Coord): number`
  - `hostName(city: string, countryCode: string): string`
  - `type Hop = { n: number; trip: Trip; host: string; km: number }`
  - `traceroute(trips: Trip[], home: Coord): Hop[]`
  - `countryCount(trips: Trip[]): number`
  - `HOME_PIN = '__home'`
  - `buildTravelMap(places: {lat; lng; slug}[], home: Coord): { width; height; dots: {x; y}[]; pins: {x; y; slug}[] }`

- [ ] **Step 1: Write the failing tests**

`src/lib/tui/travel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Trip } from '@/lib/content/collections';
import { countryCount, haversineKm, hostName, traceroute } from './travel';

const BRATISLAVA = { lat: 48.1486, lng: 17.1077 };

function trip(slug: string, start: string, countryCode: string, city: { name: string; lat: number; lng: number }): Trip {
  return { slug, start, countryCode, title: slug, country: countryCode, cities: [city], sample: false, body: '' };
}

describe('haversineKm', () => {
  it('measures great-circle distance', () => {
    expect(haversineKm({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 })).toBeCloseTo(343.6, 0);
  });

  it('is zero for the same point', () => {
    expect(haversineKm(BRATISLAVA, BRATISLAVA)).toBe(0);
  });
});

describe('hostName', () => {
  it('strips accents', () => {
    expect(hostName('Reykjavík', 'IS')).toBe('reykjavik.is');
  });

  it('turns spaces and punctuation into single hyphens', () => {
    expect(hostName('Rio de Janeiro', 'BR')).toBe('rio-de-janeiro.br');
    expect(hostName("St. John's", 'CA')).toBe('st-john-s.ca');
  });
});

describe('traceroute', () => {
  it('numbers trips as hops in date order with distance from home', () => {
    const hops = traceroute(
      [
        trip('japan', '2025-04', 'JP', { name: 'Tokyo', lat: 35.6762, lng: 139.6503 }),
        trip('portugal', '2024-05', 'PT', { name: 'Lisbon', lat: 38.7223, lng: -9.1393 }),
      ],
      BRATISLAVA,
    );
    expect(hops.map((h) => [h.n, h.host, h.km])).toEqual([
      [1, 'lisbon.pt', 2348],
      [2, 'tokyo.jp', 9094],
    ]);
  });
});

describe('countryCount', () => {
  it('counts each country once', () => {
    const tokyo = { name: 'Tokyo', lat: 35.7, lng: 139.7 };
    expect(
      countryCount([trip('a', '2024-01', 'JP', tokyo), trip('b', '2025-01', 'JP', tokyo), trip('c', '2025-02', 'PT', tokyo)]),
    ).toBe(2);
  });
});
```

`src/lib/tui/travelMap.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildTravelMap } from './travelMap';

describe('buildTravelMap', () => {
  const model = buildTravelMap(
    [
      { lat: 35.6762, lng: 139.6503, slug: 'japan' },
      { lat: 64.1466, lng: -21.9426, slug: 'iceland' },
    ],
    { lat: 48.1486, lng: 17.1077 },
  );

  it('draws land dots for the whole world', () => {
    expect(model.dots.length).toBeGreaterThan(1000);
  });

  it('adds one pin per place plus home', () => {
    expect(model.pins.map((p) => p.slug).sort()).toEqual(['__home', 'iceland', 'japan']);
  });

  it('keeps pins inside the drawing area', () => {
    for (const pin of model.pins) {
      expect(pin.x).toBeGreaterThanOrEqual(0);
      expect(pin.x).toBeLessThanOrEqual(model.width);
      expect(pin.y).toBeGreaterThanOrEqual(0);
      expect(pin.y).toBeLessThanOrEqual(model.height);
    }
  });
});
```

Run: `npm test -- src/lib/tui/travel.test.ts src/lib/tui/travelMap.test.ts`
Expected: FAIL with `Failed to resolve import "./travel"` and `"./travelMap"`.

- [ ] **Step 2: Implement the travel helpers**

```bash
npm install dotted-map@^3.1.0
```

`src/lib/tui/travel.ts`:

```ts
import type { Trip } from '@/lib/content/collections';

export interface Coord {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: Coord, b: Coord): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function hostName(city: string, countryCode: string): string {
  const base = city
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}.${countryCode.toLowerCase()}`;
}

export interface Hop {
  n: number;
  trip: Trip;
  host: string;
  km: number;
}

export function traceroute(trips: Trip[], home: Coord): Hop[] {
  return [...trips]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((trip, i) => ({
      n: i + 1,
      trip,
      host: hostName(trip.cities[0].name, trip.countryCode),
      km: Math.round(haversineKm(home, trip.cities[0])),
    }));
}

export function countryCount(trips: Trip[]): number {
  return new Set(trips.map((t) => t.countryCode)).size;
}
```

`src/lib/tui/travelMap.ts`:

```ts
import DottedMap from 'dotted-map';
import type { Coord } from './travel';

export const HOME_PIN = '__home';

export interface MapModel {
  width: number;
  height: number;
  dots: { x: number; y: number }[];
  pins: { x: number; y: number; slug: string }[];
}

function pinSlug(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('slug' in data)) return undefined;
  const { slug } = data as { slug: unknown };
  return typeof slug === 'string' ? slug : undefined;
}

export function buildTravelMap(places: (Coord & { slug: string })[], home: Coord): MapModel {
  const map = new DottedMap({ height: 40, grid: 'diagonal', projection: { name: 'robinson' } });
  for (const place of places) map.addPin({ lat: place.lat, lng: place.lng, data: { slug: place.slug } });
  map.addPin({ lat: home.lat, lng: home.lng, data: { slug: HOME_PIN } });

  const model: MapModel = { width: 0, height: 0, dots: [], pins: [] };
  for (const point of map.getPoints()) {
    model.width = Math.max(model.width, point.x + 1);
    model.height = Math.max(model.height, point.y + 1);
    const slug = pinSlug(point.data);
    if (slug) model.pins.push({ x: point.x, y: point.y, slug });
    else model.dots.push({ x: point.x, y: point.y });
  }
  return model;
}
```

Run: `npm test -- src/lib/tui/travel.test.ts src/lib/tui/travelMap.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 3: Keep dotted-map out of the server bundle**

Replace `next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['dotted-map'],
};

export default nextConfig;
```

- [ ] **Step 4: Build the components**

`src/components/travel/WorldMap.tsx`:

```tsx
import type { Coord } from '@/lib/tui/travel';
import { HOME_PIN, buildTravelMap } from '@/lib/tui/travelMap';

export function WorldMap({ places, home }: { places: (Coord & { slug: string })[]; home: Coord }) {
  const model = buildTravelMap(places, home);
  return (
    <svg
      viewBox={`0 0 ${model.width} ${model.height}`}
      role="img"
      aria-label={`World map with ${model.pins.length - 1} visited places marked`}
      className="mb-10 h-auto w-full"
    >
      {model.dots.map((d) => (
        <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r={0.22} className="fill-dim opacity-50" />
      ))}
      {model.pins.map((p) => (
        <circle
          key={`pin-${p.x}-${p.y}`}
          cx={p.x}
          cy={p.y}
          r={0.45}
          className={p.slug === HOME_PIN ? 'fill-fg' : 'fill-warn'}
        />
      ))}
    </svg>
  );
}
```

`src/components/travel/Traceroute.tsx`:

```tsx
import Link from 'next/link';
import { SampleTag } from '@/components/SampleTag';
import type { Hop } from '@/lib/tui/travel';

export function Traceroute({ hops, from }: { hops: Hop[]; from: string }) {
  return (
    <>
      <p className="mb-3 text-dim">
        traceroute to world ({hops.length} hops), from {from}
      </p>
      <ol className="rows">
        {hops.map((hop) => (
          <li key={hop.trip.slug}>
            <Link
              href={`/travel/${hop.trip.slug}`}
              data-nav-item
              className="row grid-cols-[3ch_minmax(0,1fr)] gap-x-[2ch] sm:grid-cols-[3ch_18ch_10ch_8ch_minmax(0,1fr)]"
            >
              <span className="text-right text-dim">{hop.n}</span>
              <span>{hop.host}</span>
              <span className="col-start-2 text-dim sm:col-start-auto sm:text-right">
                {hop.km.toLocaleString('en-US')} km
              </span>
              <span className="col-start-2 text-dim sm:col-start-auto">{hop.trip.start}</span>
              <span className="col-start-2 sm:col-start-auto">
                {hop.trip.title}
                <SampleTag show={hop.trip.sample} />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
```

- [ ] **Step 5: Add the routes**

`src/app/travel/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { Prompt } from '@/components/shell/Prompt';
import { Traceroute } from '@/components/travel/Traceroute';
import { WorldMap } from '@/components/travel/WorldMap';
import { getProfile, getTrips } from '@/lib/content/collections';
import { countryCount, hostName, traceroute } from '@/lib/tui/travel';

export const metadata: Metadata = {
  title: 'Travel',
  description: 'Trips so far, listed as hops away from home.',
};

export default function TravelPage() {
  const trips = getTrips();
  const { home } = getProfile();
  const cities = trips.reduce((n, t) => n + t.cities.length, 0);
  return (
    <>
      <Prompt cmd="traceroute world" label="Travel" />
      {trips.length === 0 ? (
        <p className="text-dim">No trips logged yet.</p>
      ) : (
        <>
          <p className="mb-6 text-dim">
            {countryCount(trips)} countries, {cities} cities
          </p>
          <WorldMap
            places={trips.flatMap((t) => t.cities.map((c) => ({ lat: c.lat, lng: c.lng, slug: t.slug })))}
            home={home}
          />
          <Traceroute hops={traceroute(trips, home)} from={hostName(home.city, home.countryCode)} />
        </>
      )}
    </>
  );
}
```

`src/app/travel/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Markdown } from '@/components/Markdown';
import { SampleTag } from '@/components/SampleTag';
import { BackLink } from '@/components/shell/BackLink';
import { Prompt } from '@/components/shell/Prompt';
import { getProfile, getTrip, getTrips } from '@/lib/content/collections';
import { haversineKm, hostName } from '@/lib/tui/travel';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getTrips().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const trip = getTrip((await params).slug);
  return trip ? { title: trip.title, description: `${trip.title}, ${trip.country}, ${trip.start}` } : {};
}

export default async function TripPage({ params }: Params) {
  const { slug } = await params;
  const trip = getTrip(slug);
  if (!trip) notFound();
  const { home } = getProfile();
  const first = trip.cities[0];

  return (
    <article>
      <Prompt cmd={`traceroute ${hostName(first.name, trip.countryCode)}`} label={trip.title} />
      <p className="t-title">
        {trip.title}
        <SampleTag show={trip.sample} />
      </p>
      <dl className="mt-4 grid grid-cols-[10ch_minmax(0,1fr)] gap-x-[2ch] gap-y-1">
        <dt className="text-dim">country</dt>
        <dd>{trip.country}</dd>
        <dt className="text-dim">when</dt>
        <dd>
          {trip.start}
          {trip.days ? `, ${trip.days} days` : ''}
        </dd>
        <dt className="text-dim">distance</dt>
        <dd>
          {Math.round(haversineKm(home, first)).toLocaleString('en-US')} km from {home.city}
        </dd>
      </dl>

      <h2 className="t-title mt-12 mb-3">route</h2>
      <ol className="rows">
        {trip.cities.map((city, i) => (
          <li
            key={`${i}-${city.name}`}
            className="grid grid-cols-[3ch_minmax(0,1fr)] gap-x-[2ch] px-[1ch] py-1.5 sm:grid-cols-[3ch_22ch_minmax(0,1fr)]"
          >
            <span className="text-right text-dim">{i + 1}</span>
            <span>{hostName(city.name, trip.countryCode)}</span>
            <span className="col-start-2 text-dim sm:col-start-auto">
              {city.name} ({city.lat.toFixed(2)}, {city.lng.toFixed(2)})
            </span>
          </li>
        ))}
      </ol>

      {trip.body && (
        <div className="mt-12">
          <Markdown source={trip.body} />
        </div>
      )}
      <BackLink href="/travel" label="Back to travel" />
    </article>
  );
}
```

- [ ] **Step 6: Verify in the browser**

Run: `npx tsc --noEmit && npx eslint . && npm test`
Expected: clean, all tests pass.

In the dev server check:
- `/travel` shows "4 countries, 8 cities", a dot-matrix world map with amber pins (Portugal, Georgia, Japan, Iceland) and a phosphor home pin in Slovakia.
- The traceroute rows read `1 lisbon.pt 2,348 km 2024-05 …` through `4 reykjavik.is`.
- The Iceland detail page shows the route `reykjavik.is`, `akureyri.is`.
- Both themes work, and at 375px the map scales down with no horizontal scroll.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json next.config.ts src/lib/tui/travel.ts src/lib/tui/travel.test.ts src/lib/tui/travelMap.ts src/lib/tui/travelMap.test.ts src/components/travel src/app/travel
git commit -m "feat: add travel section as traceroute with dot-matrix world map"
```

---

### Task 7: Languages (CEFR pipeline)

**Files:**
- Create:
  - `src/lib/tui/languages.ts`
  - `src/components/StatusDot.tsx`, `src/components/languages/PipelineStages.tsx`
  - `src/app/languages/page.tsx`, `src/app/languages/[slug]/page.tsx`
- Modify: `src/app/globals.css` (append)
- Test: `src/lib/tui/languages.test.ts`

**Interfaces:**
- Consumes: `CEFR` (Task 2); `Language`, `getLanguages`, `getLanguage` (Task 2); `Prompt` (Task 3); `SampleTag`, `Markdown`, `BackLink`, `.rows/.row` (Task 5).
- Produces:
  - `type Cefr`
  - `type StageStatus = 'passed' | 'running' | 'pending' | 'skipped'`
  - `pipelineStages(level: Cefr, target: Cefr): { stage: Cefr; status: StageStatus }[]`
  - `pipelineStatus(level: Cefr, target: Cefr): 'running' | 'passed'`
  - `type DotState = 'done' | 'running' | 'pending' | 'off'` and `<StatusDot state />`
  - `STAGE_DOT: Record<StageStatus, DotState>`
  - `<PipelineStages level target />`

- [ ] **Step 1: Write the failing test**

`src/lib/tui/languages.test.ts`:

```ts
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
```

Run: `npm test -- src/lib/tui/languages.test.ts`
Expected: FAIL with `Failed to resolve import "./languages"`.

- [ ] **Step 2: Implement**

`src/lib/tui/languages.ts`:

```ts
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
```

Run: `npm test -- src/lib/tui/languages.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 3: Add the status dot and stages components and their styles**

`src/components/StatusDot.tsx`:

```tsx
export type DotState = 'done' | 'running' | 'pending' | 'off';

export function StatusDot({ state }: { state: DotState }) {
  return <span className="dot" data-state={state} aria-hidden="true" />;
}
```

`src/components/languages/PipelineStages.tsx`:

```tsx
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
```

Append to `src/app/globals.css`:

```css
.dot {
  display: inline-block;
  width: 0.7em;
  height: 0.7em;
  border: 1.5px solid currentColor;
  border-radius: 50%;
  vertical-align: -0.05em;
}

.dot[data-state="done"] {
  border-color: var(--fg);
  background: var(--fg);
}

.dot[data-state="running"] {
  border-color: var(--warn);
  background: linear-gradient(90deg, var(--warn) 50%, transparent 50%);
}

.dot[data-state="pending"] {
  border-color: var(--dim);
}

.dot[data-state="off"] {
  border-color: var(--dim);
  opacity: 0.45;
}

.row:focus-visible .dot {
  border-color: var(--bg);
}

.row:focus-visible .dot[data-state="done"] {
  background: var(--bg);
}

.row:focus-visible .dot[data-state="running"] {
  background: linear-gradient(90deg, var(--bg) 50%, transparent 50%);
}

.stages {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 0.25rem;
}

.stage {
  white-space: nowrap;
}

.stage + .stage::before {
  content: "";
  display: inline-block;
  width: 1.5ch;
  margin: 0 0.75ch;
  border-top: 1px solid var(--rule);
  vertical-align: middle;
}
```

- [ ] **Step 4: Add the routes**

`src/app/languages/page.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { PipelineStages } from '@/components/languages/PipelineStages';
import { SampleTag } from '@/components/SampleTag';
import { Prompt } from '@/components/shell/Prompt';
import { getLanguages } from '@/lib/content/collections';
import { pipelineStatus } from '@/lib/tui/languages';

export const metadata: Metadata = {
  title: 'Languages',
  description: 'Languages in progress, tracked as a CEFR pipeline from A1 to C2.',
};

export default function LanguagesPage() {
  const languages = getLanguages();
  const running = languages.filter((l) => pipelineStatus(l.level, l.target) === 'running').length;
  return (
    <>
      <Prompt cmd="pipeline status lang" label="Languages" />
      {languages.length === 0 ? (
        <p className="text-dim">No languages logged yet.</p>
      ) : (
        <>
          <p className="mb-6 text-dim">
            {languages.length} pipelines: {running} running, {languages.length - running} passed
          </p>
          <ul className="rows">
            {languages.map((l) => {
              const status = pipelineStatus(l.level, l.target);
              return (
                <li key={l.slug}>
                  <Link
                    href={`/languages/${l.slug}`}
                    data-nav-item
                    className="row grid-cols-1 gap-x-[2ch] gap-y-1 sm:grid-cols-[14ch_8ch_minmax(0,1fr)]"
                  >
                    <span>
                      {l.name.toLowerCase()}
                      <SampleTag show={l.sample} />
                    </span>
                    <span className={status === 'running' ? 'text-warn' : ''}>{status}</span>
                    <PipelineStages level={l.level} target={l.target} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
```

`src/app/languages/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { STAGE_DOT } from '@/components/languages/PipelineStages';
import { Markdown } from '@/components/Markdown';
import { SampleTag } from '@/components/SampleTag';
import { BackLink } from '@/components/shell/BackLink';
import { Prompt } from '@/components/shell/Prompt';
import { StatusDot } from '@/components/StatusDot';
import { getLanguage, getLanguages } from '@/lib/content/collections';
import { type StageStatus, pipelineStages, pipelineStatus } from '@/lib/tui/languages';

type Params = { params: Promise<{ slug: string }> };

const TONE: Record<StageStatus, string> = { passed: '', running: 'text-warn', pending: 'text-dim', skipped: 'text-dim' };

export const dynamicParams = false;

export function generateStaticParams() {
  return getLanguages().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const lang = getLanguage((await params).slug);
  return lang ? { title: lang.name, description: `${lang.name}: ${lang.level}, aiming for ${lang.target}` } : {};
}

export default async function LanguagePage({ params }: Params) {
  const { slug } = await params;
  const lang = getLanguage(slug);
  if (!lang) notFound();

  return (
    <article>
      <Prompt cmd={`pipeline logs ${lang.slug}`} label={lang.name} />
      <p className="t-title">
        {lang.name}
        <SampleTag show={lang.sample} />
      </p>
      <dl className="mt-4 grid grid-cols-[10ch_minmax(0,1fr)] gap-x-[2ch] gap-y-1">
        <dt className="text-dim">status</dt>
        <dd>{pipelineStatus(lang.level, lang.target)}</dd>
        <dt className="text-dim">level</dt>
        <dd>{lang.level}</dd>
        <dt className="text-dim">target</dt>
        <dd>{lang.target}</dd>
        <dt className="text-dim">since</dt>
        <dd>{lang.since}</dd>
        {lang.streakDays !== undefined && (
          <>
            <dt className="text-dim">streak</dt>
            <dd>{lang.streakDays} days</dd>
          </>
        )}
      </dl>

      <h2 className="t-title mt-12 mb-3">stages</h2>
      <ol className="rows">
        {pipelineStages(lang.level, lang.target).map((s) => (
          <li key={s.stage} className="grid grid-cols-[2ch_4ch_minmax(0,1fr)] gap-x-[2ch] px-[1ch] py-1.5">
            <span>
              <StatusDot state={STAGE_DOT[s.status]} />
            </span>
            <span>{s.stage}</span>
            <span className={TONE[s.status]}>{s.status}</span>
          </li>
        ))}
      </ol>

      {lang.methods.length > 0 && (
        <>
          <h2 className="t-title mt-12 mb-3">methods</h2>
          <div className="prose-tui">
            <ul>
              {lang.methods.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      {lang.body && (
        <div className="mt-12">
          <Markdown source={lang.body} />
        </div>
      )}
      <BackLink href="/languages" label="Back to languages" />
    </article>
  );
}
```

- [ ] **Step 5: Verify in the browser**

Run: `npx tsc --noEmit && npx eslint . && npm test`
Expected: clean, all tests pass.

In the dev server check:
- `/languages` shows "3 pipelines: 2 running, 1 passed".
- German is `running` in amber, with stages A1–B1 as filled dots, B2 half-filled amber, and C1–C2 dim.
- English is `passed`.
- Stages wrap cleanly at 375px.
- `/languages/german` lists the stages and methods.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tui/languages.ts src/lib/tui/languages.test.ts src/components/StatusDot.tsx src/components/languages src/app/languages src/app/globals.css
git commit -m "feat: add languages section as a CEFR pipeline"
```

---

### Task 8: Sport (btop panels)

**Files:**
- Create:
  - `src/lib/tui/sport.ts`
  - `src/components/Sparkline.tsx`, `src/components/sport/SportPanel.tsx`
  - `src/app/sport/page.tsx`, `src/app/sport/[slug]/page.tsx`
- Modify: `src/app/globals.css` (append)
- Test: `src/lib/tui/sport.test.ts`

**Interfaces:**
- Consumes: `Sport`, `getSports`, `getSport` (Task 2); `Prompt` (Task 3); `SampleTag`, `Markdown`, `BackLink`, `.rows/.row` (Task 5).
- Produces:
  - `sparkHeights(values: number[], levels?: number): number[]`
  - `sportStats(weekly: number[]): { last: number; avg: number; peak: number; weeks: number }`
  - `<Sparkline values label />`
  - `<SportPanel sport />`

- [ ] **Step 1: Write the failing test**

`src/lib/tui/sport.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sparkHeights, sportStats } from './sport';

describe('sparkHeights', () => {
  it('scales values to the tallest bar', () => {
    expect(sparkHeights([0, 5, 10], 8)).toEqual([0, 4, 8]);
  });

  it('keeps small non-zero weeks visible', () => {
    expect(sparkHeights([1, 100], 8)).toEqual([1, 8]);
  });

  it('returns zeros when nothing was logged', () => {
    expect(sparkHeights([0, 0], 8)).toEqual([0, 0]);
  });
});

describe('sportStats', () => {
  it('reports the last week, the average and the peak', () => {
    expect(sportStats([10, 20, 30, 0])).toEqual({ last: 0, avg: 15, peak: 30, weeks: 4 });
  });

  it('rounds the average to one decimal', () => {
    expect(sportStats([1, 2, 2]).avg).toBe(1.7);
  });
});
```

Run: `npm test -- src/lib/tui/sport.test.ts`
Expected: FAIL with `Failed to resolve import "./sport"`.

- [ ] **Step 2: Implement**

`src/lib/tui/sport.ts`:

```ts
export function sparkHeights(values: number[], levels = 8): number[] {
  const max = Math.max(0, ...values);
  if (max === 0) return values.map(() => 0);
  return values.map((v) => (v <= 0 ? 0 : Math.max(1, Math.round((v / max) * levels))));
}

export interface SportStats {
  last: number;
  avg: number;
  peak: number;
  weeks: number;
}

export function sportStats(weekly: number[]): SportStats {
  const total = weekly.reduce((sum, v) => sum + v, 0);
  return {
    last: weekly[weekly.length - 1] ?? 0,
    avg: Math.round((total / Math.max(1, weekly.length)) * 10) / 10,
    peak: Math.max(0, ...weekly),
    weeks: weekly.length,
  };
}
```

Run: `npm test -- src/lib/tui/sport.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 3: Add the Sparkline and SportPanel components and their styles**

`src/components/Sparkline.tsx`:

```tsx
import { sparkHeights } from '@/lib/tui/sport';

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const heights = sparkHeights(values, 8);
  return (
    <svg className="spark" viewBox={`0 0 ${values.length * 3} 8`} preserveAspectRatio="none" role="img" aria-label={label}>
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 3}
          y={8 - Math.max(h, 0.5)}
          width={2}
          height={Math.max(h, 0.5)}
          fill="currentColor"
          opacity={h === 0 ? 0.3 : 1}
        />
      ))}
    </svg>
  );
}
```

`src/components/sport/SportPanel.tsx`:

```tsx
import Link from 'next/link';
import { SampleTag } from '@/components/SampleTag';
import { Sparkline } from '@/components/Sparkline';
import type { Sport } from '@/lib/content/collections';
import { sportStats } from '@/lib/tui/sport';

export function SportPanel({ sport }: { sport: Sport }) {
  const stats = sportStats(sport.weekly);
  const record = sport.records[0];
  return (
    <Link href={`/sport/${sport.slug}`} data-nav-item className={`row panel ${sport.active ? '' : 'text-dim'}`}>
      <span className="panel-title">
        {sport.name.toLowerCase()}
        {sport.active ? '' : ' (paused)'}
        <SampleTag show={sport.sample} />
      </span>
      <span className={`block ${sport.active ? 'text-warn' : ''}`}>
        <Sparkline values={sport.weekly} label={`${sport.name}: weekly ${sport.unit} over the last ${stats.weeks} weeks`} />
      </span>
      <span className="mt-3 flex flex-wrap gap-x-[3ch] gap-y-1">
        <span>
          {stats.last} {sport.unit} <span className="text-dim">this week</span>
        </span>
        <span className="text-dim">avg {stats.avg}</span>
        <span className="text-dim">peak {stats.peak}</span>
      </span>
      {record && (
        <span className="mt-2 block text-dim">
          best {record.label}: {record.value}
        </span>
      )}
    </Link>
  );
}
```

Append to `src/app/globals.css`:

```css
.panel {
  position: relative;
  display: block;
  margin-top: 0.75rem;
  padding: 1.25rem 2ch 1rem;
  border: 1px solid var(--rule);
}

.panel-title {
  position: absolute;
  top: -0.8em;
  left: 1.5ch;
  padding: 0 1ch;
  background: var(--bg);
}

.row:focus-visible .panel-title {
  background: var(--fg);
}

.spark {
  display: block;
  width: 100%;
  height: 2rem;
}

.spark-lg .spark {
  height: 5rem;
}

.row:focus-visible .spark {
  color: var(--bg);
}
```

- [ ] **Step 4: Add the routes**

`src/app/sport/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { Prompt } from '@/components/shell/Prompt';
import { SportPanel } from '@/components/sport/SportPanel';
import { getSports } from '@/lib/content/collections';

export const metadata: Metadata = {
  title: 'Sport',
  description: 'Training volume, personal records and upcoming events.',
};

export default function SportPage() {
  const sports = getSports();
  const active = sports.filter((s) => s.active);
  const streak = Math.max(0, ...active.map((s) => s.streakDays ?? 0));
  return (
    <>
      <Prompt cmd="btop --sport" label="Sport" />
      {sports.length === 0 ? (
        <p className="text-dim">No sports logged yet.</p>
      ) : (
        <>
          <p className="mb-8 text-dim">
            up {streak} days, {active.length} of {sports.length} sports active
          </p>
          <ul className="grid list-none gap-8 p-0 sm:grid-cols-2">
            {sports.map((s) => (
              <li key={s.slug}>
                <SportPanel sport={s} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
```

`src/app/sport/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Markdown } from '@/components/Markdown';
import { SampleTag } from '@/components/SampleTag';
import { BackLink } from '@/components/shell/BackLink';
import { Prompt } from '@/components/shell/Prompt';
import { Sparkline } from '@/components/Sparkline';
import { getSport, getSports } from '@/lib/content/collections';
import { sportStats } from '@/lib/tui/sport';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getSports().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const sport = getSport((await params).slug);
  return sport ? { title: sport.name, description: `${sport.name}: weekly ${sport.unit}, records and events` } : {};
}

export default async function SportDetailPage({ params }: Params) {
  const { slug } = await params;
  const sport = getSport(slug);
  if (!sport) notFound();
  const stats = sportStats(sport.weekly);
  const events = [...sport.events].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <article>
      <Prompt cmd={`btop --sport ${sport.slug}`} label={sport.name} />
      <p className="t-title">
        {sport.name}
        {sport.active ? '' : ' (paused)'}
        <SampleTag show={sport.sample} />
      </p>

      <div className={`spark-lg mt-6 ${sport.active ? 'text-warn' : 'text-dim'}`}>
        <Sparkline values={sport.weekly} label={`${sport.name}: weekly ${sport.unit} over the last ${stats.weeks} weeks`} />
      </div>

      <dl className="mt-6 grid grid-cols-[12ch_minmax(0,1fr)] gap-x-[2ch] gap-y-1">
        <dt className="text-dim">this week</dt>
        <dd>
          {stats.last} {sport.unit}
        </dd>
        <dt className="text-dim">average</dt>
        <dd>
          {stats.avg} {sport.unit}
        </dd>
        <dt className="text-dim">peak</dt>
        <dd>
          {stats.peak} {sport.unit}
        </dd>
        <dt className="text-dim">tracked</dt>
        <dd>{stats.weeks} weeks</dd>
        {sport.streakDays !== undefined && (
          <>
            <dt className="text-dim">streak</dt>
            <dd>{sport.streakDays} days</dd>
          </>
        )}
      </dl>

      {sport.records.length > 0 && (
        <>
          <h2 className="t-title mt-12 mb-3">records</h2>
          <ul className="rows">
            {sport.records.map((r) => (
              <li
                key={r.label}
                className="grid grid-cols-[minmax(0,1fr)_12ch] gap-x-[2ch] px-[1ch] py-1.5 sm:grid-cols-[minmax(0,1fr)_12ch_8ch]"
              >
                <span>{r.label}</span>
                <span>{r.value}</span>
                <span className="col-start-2 text-dim sm:col-start-auto">{r.date}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {events.length > 0 && (
        <>
          <h2 className="t-title mt-12 mb-3">events</h2>
          <ul className="rows">
            {events.map((e) => (
              <li
                key={`${e.date}-${e.name}`}
                className="grid grid-cols-[11ch_minmax(0,1fr)] gap-x-[2ch] px-[1ch] py-1.5 sm:grid-cols-[11ch_minmax(0,1fr)_12ch]"
              >
                <span className="text-dim">{e.date}</span>
                <span>{e.name}</span>
                <span className={`col-start-2 sm:col-start-auto ${e.result ? '' : 'text-warn'}`}>
                  {e.result ?? 'scheduled'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {sport.body && (
        <div className="mt-12">
          <Markdown source={sport.body} />
        </div>
      )}
      <BackLink href="/sport" label="Back to sport" />
    </article>
  );
}
```

- [ ] **Step 5: Verify in the browser**

Run: `npx tsc --noEmit && npx eslint . && npm test`
Expected: clean, all tests pass.

In the dev server check:
- `/sport` shows "up 41 days, 2 of 3 sports active" and three bordered panels, each with its title set into the top border.
- Running and cycling show amber sparklines with faint bars for zero weeks. Climbing is dim with "(paused)".
- `j`/`k` inverts a whole panel.
- `/sport/running` shows the records and events. Vienna City Marathon shows `scheduled` in amber.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tui/sport.ts src/lib/tui/sport.test.ts src/components/Sparkline.tsx src/components/sport src/app/sport src/app/globals.css
git commit -m "feat: add sport section as btop-style panels"
```

---

### Task 9: Hobbies (systemctl units)

**Files:**
- Create:
  - `src/lib/tui/time.ts`
  - `src/components/hobbies/UnitList.tsx`
  - `src/app/hobbies/page.tsx`, `src/app/hobbies/[slug]/page.tsx`
- Test: `src/lib/tui/time.test.ts`

**Interfaces:**
- Consumes: `Hobby`, `getHobbies`, `getHobby` (Task 2); `Prompt` (Task 3); `SampleTag`, `Markdown`, `BackLink`, `.rows/.row` (Task 5); `StatusDot` (Task 7).
- Produces:
  - `ymKey(value: string): number` (`"YYYY"`, `"YYYY-MM"` or `"YYYY-MM-DD"` to a month index)
  - `durationSince(start: string, at: Date): string` (like `"7y 3m"` or `"5m"`)
  - `now(): Date`
  - `unitState(hobby: Hobby): string`
  - `<UnitList hobbies />`

- [ ] **Step 1: Write the failing test**

`src/lib/tui/time.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { durationSince, ymKey } from './time';

describe('ymKey', () => {
  it('orders year-months', () => {
    expect(ymKey('2020-03')).toBeGreaterThan(ymKey('2020-02'));
    expect(ymKey('2021-01')).toBeGreaterThan(ymKey('2020-12'));
  });

  it('treats a bare year as January', () => {
    expect(ymKey('2019')).toBe(ymKey('2019-01'));
  });
});

describe('durationSince', () => {
  const at = new Date('2026-09-24T12:00:00Z');

  it('formats years and months', () => {
    expect(durationSince('2019-06', at)).toBe('7y 3m');
  });

  it('formats months only under a year', () => {
    expect(durationSince('2026-04', at)).toBe('5m');
  });

  it('never goes negative for future dates', () => {
    expect(durationSince('2027-01', at)).toBe('0m');
  });
});
```

Run: `npm test -- src/lib/tui/time.test.ts`
Expected: FAIL with `Failed to resolve import "./time"`.

- [ ] **Step 2: Implement**

`src/lib/tui/time.ts`:

```ts
export function ymKey(value: string): number {
  const [year, month] = value.split('-');
  return Number(year) * 12 + (month ? Number(month) - 1 : 0);
}

export function durationSince(start: string, at: Date): string {
  const months = Math.max(0, at.getUTCFullYear() * 12 + at.getUTCMonth() - ymKey(start));
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return years > 0 ? `${years}y ${rest}m` : `${rest}m`;
}

export function now(): Date {
  return new Date();
}
```

Run: `npm test -- src/lib/tui/time.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 3: Add the unit list**

`src/components/hobbies/UnitList.tsx`:

```tsx
import Link from 'next/link';
import { SampleTag } from '@/components/SampleTag';
import { StatusDot } from '@/components/StatusDot';
import type { Hobby } from '@/lib/content/collections';

export function unitState(hobby: Hobby): string {
  return hobby.state === 'active' ? 'active (running)' : 'inactive (dead)';
}

export function UnitList({ hobbies }: { hobbies: Hobby[] }) {
  const active = hobbies.filter((h) => h.state === 'active').length;
  return (
    <>
      <ul className="rows">
        {hobbies.map((h) => (
          <li key={h.slug}>
            <Link
              href={`/hobbies/${h.slug}`}
              data-nav-item
              className="row grid-cols-[2ch_minmax(0,1fr)] gap-x-[2ch] sm:grid-cols-[2ch_24ch_17ch_minmax(0,1fr)]"
            >
              <span>
                <StatusDot state={h.state === 'active' ? 'done' : 'off'} />
              </span>
              <span>
                {h.slug}.service
                <SampleTag show={h.sample} />
              </span>
              <span className={`col-start-2 sm:col-start-auto ${h.state === 'active' ? '' : 'text-dim'}`}>{unitState(h)}</span>
              <span className="col-start-2 text-dim sm:col-start-auto">{h.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-dim">
        {hobbies.length} units listed: {active} active, {hobbies.length - active} inactive.
      </p>
    </>
  );
}
```

- [ ] **Step 4: Add the routes**

`src/app/hobbies/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { UnitList } from '@/components/hobbies/UnitList';
import { Prompt } from '@/components/shell/Prompt';
import { getHobbies } from '@/lib/content/collections';

export const metadata: Metadata = {
  title: 'Hobbies',
  description: 'Hobbies, listed like services: running or stopped.',
};

export default function HobbiesPage() {
  const hobbies = getHobbies();
  return (
    <>
      <Prompt cmd="systemctl --type=hobby" label="Hobbies" />
      {hobbies.length === 0 ? <p className="text-dim">No hobbies logged yet.</p> : <UnitList hobbies={hobbies} />}
    </>
  );
}
```

`src/app/hobbies/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unitState } from '@/components/hobbies/UnitList';
import { Markdown } from '@/components/Markdown';
import { SampleTag } from '@/components/SampleTag';
import { BackLink } from '@/components/shell/BackLink';
import { Prompt } from '@/components/shell/Prompt';
import { StatusDot } from '@/components/StatusDot';
import { getHobbies, getHobby } from '@/lib/content/collections';
import { durationSince, now } from '@/lib/tui/time';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getHobbies().map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const hobby = getHobby((await params).slug);
  return hobby ? { title: hobby.name, description: hobby.description } : {};
}

export default async function HobbyPage({ params }: Params) {
  const { slug } = await params;
  const hobby = getHobby(slug);
  if (!hobby) notFound();
  const active = hobby.state === 'active';

  return (
    <article>
      <Prompt cmd={`systemctl status ${hobby.slug}.service`} label={hobby.name} />
      <p className="t-title">
        {hobby.name}
        <SampleTag show={hobby.sample} />
      </p>
      <p className="mt-4">
        <StatusDot state={active ? 'done' : 'off'} /> {hobby.slug}.service - {hobby.description}
      </p>
      <dl className="mt-1 grid grid-cols-[8ch_minmax(0,1fr)] gap-x-[1ch] pl-[2ch]">
        <dt className="text-right text-dim">Loaded:</dt>
        <dd>
          loaded (~/hobbies/{hobby.slug}.md; {active ? 'enabled' : 'disabled'})
        </dd>
        <dt className="text-right text-dim">Active:</dt>
        <dd className={active ? '' : 'text-dim'}>
          {unitState(hobby)} since {hobby.since}; {durationSince(hobby.since, now())} ago
        </dd>
      </dl>
      {hobby.body && (
        <div className="mt-12">
          <Markdown source={hobby.body} />
        </div>
      )}
      <BackLink href="/hobbies" label="Back to hobbies" />
    </article>
  );
}
```

- [ ] **Step 5: Verify in the browser**

Run: `npx tsc --noEmit && npx eslint . && npm test`
Expected: clean, all tests pass.

In the dev server check:
- `/hobbies` lists `chess.service` (hollow dim dot, inactive (dead)), `cooking.service`, `homelab.service` and `photography.service` (filled dots, active (running)).
- The footer reads "4 units listed: 3 active, 1 inactive."
- `/hobbies/photography` shows `Active: active (running) since 2019-06; 7y 3m ago`. The exact duration depends on today's date.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tui/time.ts src/lib/tui/time.test.ts src/components/hobbies src/app/hobbies
git commit -m "feat: add hobbies section as systemctl units"
```

---

### Task 10: Home (MOTD, git log, certs, finger) and old-site cleanup

**Files:**
- Create:
  - `src/lib/tui/gitGraph.ts`, `src/lib/tui/motd.ts`
  - `src/components/home/Motd.tsx`, `src/components/home/MotdPlayback.tsx`, `src/components/home/GitLog.tsx`, `src/components/home/Finger.tsx`
- Rewrite: `src/app/page.tsx`
- Modify: `src/app/globals.css` (remove the legacy aliases, append home styles), `package.json` (remove `lucide-react`, `react-icons`)
- Delete:
  - `src/components/ConsoleHeader.tsx`, `CareerAccordion.tsx`, `ComplianceBadge.tsx`, `AgentContact.tsx`, `AIOperationsBanner.tsx`, `HiddenSEO.tsx`
  - `public/retro-admin-bg.png`
- Test: `src/lib/tui/gitGraph.test.ts`, `src/lib/tui/motd.test.ts`

**Interfaces:**
- Consumes:
  - `Job`, `Profile`, the `get*` accessors and the `Book`/`Trip`/`Language`/`Sport`/`Hobby` types (Task 2)
  - `Prompt` (Task 3); `Markdown`, `SampleTag` (Task 5)
  - `hostName`, `countryCount` (Task 6)
  - `ymKey`, `now` (Task 9)
- Produces:
  - `layoutGraph<T extends Span>(entries: T[]): GraphRow<T>[]`, where `Span = { slug; start; end? }` and `GraphRow<T> = { kind: 'commit'; prefix; entry: T; lane } | { kind: 'edge'; prefix }`
  - `shortHash(input: string): string`
  - `summarize(input): MotdSummary`

- [ ] **Step 1: Write the failing tests**

`src/lib/tui/gitGraph.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { layoutGraph, shortHash } from './gitGraph';

const render = (rows: ReturnType<typeof layoutGraph<{ slug: string; start: string; end?: string }>>) =>
  rows.map((r) => (r.kind === 'commit' ? `${r.prefix.trimEnd()} ${r.entry.slug}` : r.prefix.trimEnd()));

describe('layoutGraph', () => {
  it('draws overlapping jobs as parallel lanes that merge back', () => {
    const jobs = [
      { slug: 'geniusee', start: '2022-05', end: '2023-10' },
      { slug: 'imonomy', start: '2019', end: '2020-03' },
      { slug: 'pajak', start: '2023-12', end: '2024-12' },
      { slug: 'avys', start: '2020-03', end: '2021-03' },
      { slug: 'ux', start: '2023-12' },
      { slug: 'netforce', start: '2021-03', end: '2022-04' },
    ];
    expect(render(layoutGraph(jobs))).toEqual([
      '* | ux',
      '| * pajak',
      '|/',
      '* geniusee',
      '* netforce',
      '* avys',
      '* imonomy',
    ]);
  });

  it('keeps a single straight line when nothing overlaps', () => {
    expect(render(layoutGraph([{ slug: 'a', start: '2020-01', end: '2021-01' }]))).toEqual(['* a']);
  });

  it('returns no rows for no entries', () => {
    expect(layoutGraph([])).toEqual([]);
  });
});

describe('shortHash', () => {
  it('returns a stable 7-character hex hash', () => {
    expect(shortHash('ux')).toMatch(/^[0-9a-f]{7}$/);
    expect(shortHash('ux')).toBe(shortHash('ux'));
    expect(shortHash('ux')).not.toBe(shortHash('pajak'));
  });
});
```

`src/lib/tui/motd.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Book, Hobby, Language, Sport, Trip } from '@/lib/content/collections';
import { summarize } from './motd';

describe('summarize', () => {
  it('summarizes every section', () => {
    const books: Book[] = [
      { slug: 'a', title: 'A', author: 'x', status: 'reading', progress: 40, started: '2026-01', tags: [], sample: false, body: '' },
      { slug: 'b', title: 'B', author: 'x', status: 'reading', progress: 10, started: '2026-08', tags: [], sample: false, body: '' },
      { slug: 'c', title: 'C', author: 'x', status: 'finished', finished: '2025-01', tags: [], sample: false, body: '' },
    ];
    const trips: Trip[] = [
      { slug: 't1', title: 'T1', country: 'Japan', countryCode: 'JP', start: '2025-04', cities: [{ name: 'Tokyo', lat: 35.7, lng: 139.7 }], sample: false, body: '' },
      { slug: 't2', title: 'T2', country: 'Iceland', countryCode: 'IS', start: '2026-06', cities: [{ name: 'Reykjavík', lat: 64.1, lng: -21.9 }], sample: false, body: '' },
    ];
    const languages: Language[] = [
      { slug: 'de', name: 'German', level: 'B1', target: 'B2', since: '2024-01', methods: [], sample: false, body: '' },
      { slug: 'en', name: 'English', level: 'C1', target: 'C1', since: '2010', methods: [], sample: false, body: '' },
    ];
    const sports: Sport[] = [
      { slug: 'run', name: 'Running', unit: 'km', weekly: [1, 2], records: [], events: [], streakDays: 41, active: true, sample: false, body: '' },
      { slug: 'climb', name: 'Climbing', unit: 'sessions', weekly: [1, 2], records: [], events: [], streakDays: 90, active: false, sample: false, body: '' },
    ];
    const hobbies: Hobby[] = [
      { slug: 'chess', name: 'Chess', description: 'd', state: 'inactive', since: '2022-03', sample: false, body: '' },
      { slug: 'photo', name: 'Photography', description: 'd', state: 'active', since: '2019-06', sample: false, body: '' },
    ];

    expect(summarize({ books, trips, languages, sports, hobbies })).toEqual({
      reading: 2,
      nowReading: { title: 'B', progress: 10, slug: 'b' },
      countries: 2,
      lastTrip: { host: 'reykjavik.is', start: '2026-06', slug: 't2' },
      languagesRunning: 1,
      languagesTotal: 2,
      streak: { sport: 'Running', days: 41 },
      hobbiesActive: 1,
      hobbiesTotal: 2,
    });
  });

  it('handles empty sections without inventing values', () => {
    expect(summarize({ books: [], trips: [], languages: [], sports: [], hobbies: [] })).toEqual({
      reading: 0,
      nowReading: undefined,
      countries: 0,
      lastTrip: undefined,
      languagesRunning: 0,
      languagesTotal: 0,
      streak: undefined,
      hobbiesActive: 0,
      hobbiesTotal: 0,
    });
  });
});
```

Run: `npm test -- src/lib/tui/gitGraph.test.ts src/lib/tui/motd.test.ts`
Expected: FAIL with `Failed to resolve import "./gitGraph"` and `"./motd"`.

- [ ] **Step 2: Implement the graph layout and summary**

`src/lib/tui/gitGraph.ts`:

```ts
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
```

`src/lib/tui/motd.ts`:

```ts
import type { Book, Hobby, Language, Sport, Trip } from '@/lib/content/collections';
import { countryCount, hostName } from './travel';

export interface MotdSummary {
  reading: number;
  nowReading?: { title: string; progress: number; slug: string };
  countries: number;
  lastTrip?: { host: string; start: string; slug: string };
  languagesRunning: number;
  languagesTotal: number;
  streak?: { sport: string; days: number };
  hobbiesActive: number;
  hobbiesTotal: number;
}

export function summarize(input: {
  books: Book[];
  trips: Trip[];
  languages: Language[];
  sports: Sport[];
  hobbies: Hobby[];
}): MotdSummary {
  const reading = input.books.filter((b) => b.status === 'reading');
  const current = [...reading].sort((a, b) => (b.started ?? '').localeCompare(a.started ?? ''))[0];
  const lastTrip = [...input.trips].sort((a, b) => b.start.localeCompare(a.start))[0];
  const streakSport = input.sports
    .filter((s) => s.active && s.streakDays !== undefined)
    .sort((a, b) => (b.streakDays ?? 0) - (a.streakDays ?? 0))[0];

  return {
    reading: reading.length,
    nowReading: current ? { title: current.title, progress: current.progress ?? 0, slug: current.slug } : undefined,
    countries: countryCount(input.trips),
    lastTrip: lastTrip
      ? { host: hostName(lastTrip.cities[0].name, lastTrip.countryCode), start: lastTrip.start, slug: lastTrip.slug }
      : undefined,
    languagesRunning: input.languages.filter((l) => l.level !== l.target).length,
    languagesTotal: input.languages.length,
    streak: streakSport ? { sport: streakSport.name, days: streakSport.streakDays ?? 0 } : undefined,
    hobbiesActive: input.hobbies.filter((h) => h.state === 'active').length,
    hobbiesTotal: input.hobbies.length,
  };
}
```

Run: `npm test -- src/lib/tui/gitGraph.test.ts src/lib/tui/motd.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 3: Build the home components**

`src/components/home/MotdPlayback.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

export function MotdPlayback() {
  useEffect(() => {
    const root = document.documentElement;
    if (!('motdPlay' in root.dataset)) return;
    const lines = document.querySelectorAll('.motd-line');
    const last = lines[lines.length - 1];

    function stop() {
      delete root.dataset.motdPlay;
      cleanup();
    }
    function cleanup() {
      window.removeEventListener('keydown', stop);
      window.removeEventListener('pointerdown', stop);
      last?.removeEventListener('animationend', stop);
    }

    window.addEventListener('keydown', stop);
    window.addEventListener('pointerdown', stop);
    last?.addEventListener('animationend', stop);
    return cleanup;
  }, []);

  return null;
}
```

`src/components/home/Motd.tsx`:

```tsx
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { Profile } from '@/lib/content/collections';
import type { MotdSummary } from '@/lib/tui/motd';
import { MotdPlayback } from './MotdPlayback';

export function Motd({ profile, summary, asOf }: { profile: Profile; summary: MotdSummary; asOf: string }) {
  const lines: ReactNode[] = [
    `Welcome to ${profile.host} (GNU/Life, SRE edition)`,
    '',
    ` * Role:      ${profile.role}`,
    <>
      {' * Contact:   '}
      <a href="#contact" data-nav-item>
        finger {profile.handle}
      </a>
    </>,
    '',
    `  System information as of ${asOf}`,
    '',
    <>
      {'  Reading:     '}
      <Link href="/books" data-nav-item>
        {summary.reading} in progress
      </Link>
    </>,
    <>
      {'  Countries:   '}
      <Link href="/travel" data-nav-item>
        {summary.countries} visited
      </Link>
    </>,
    <>
      {'  Languages:   '}
      <Link href="/languages" data-nav-item>
        {summary.languagesRunning} of {summary.languagesTotal} in rollout
      </Link>
    </>,
    summary.streak ? (
      <>
        {'  Streak:      '}
        <Link href="/sport" data-nav-item>
          {summary.streak.days} days ({summary.streak.sport.toLowerCase()})
        </Link>
      </>
    ) : null,
    <>
      {'  Services:    '}
      <Link href="/hobbies" data-nav-item>
        {summary.hobbiesActive} of {summary.hobbiesTotal} hobbies active
      </Link>
    </>,
    '',
    summary.nowReading ? (
      <>
        {'  Now reading: '}
        <Link href={`/books/${summary.nowReading.slug}`} data-nav-item>
          {summary.nowReading.title}
        </Link>
        {` (${summary.nowReading.progress}%)`}
      </>
    ) : null,
    summary.lastTrip ? (
      <>
        {'  Last hop:    '}
        <Link href={`/travel/${summary.lastTrip.slug}`} data-nav-item>
          {summary.lastTrip.host}
        </Link>
        {` (${summary.lastTrip.start})`}
      </>
    ) : null,
  ].filter((line) => line !== null);

  return (
    <>
      <pre className="motd">
        {lines.map((line, i) => (
          <span key={i} className="motd-line" style={{ '--i': i } as CSSProperties}>
            {line}
            {'\n'}
          </span>
        ))}
      </pre>
      <MotdPlayback />
    </>
  );
}
```

`src/components/home/GitLog.tsx`:

```tsx
import { Markdown } from '@/components/Markdown';
import { SampleTag } from '@/components/SampleTag';
import type { Job } from '@/lib/content/collections';
import { layoutGraph, shortHash } from '@/lib/tui/gitGraph';

export function GitLog({ jobs }: { jobs: Job[] }) {
  const rows = layoutGraph(jobs);
  const first = rows[0];
  const headSlug = first?.kind === 'commit' ? first.entry.slug : undefined;
  return (
    <ol className="gitlog">
      {rows.map((row, i) =>
        row.kind === 'edge' ? (
          <li key={`edge-${i}`} aria-hidden="true" className="gitlog-edge">
            {row.prefix}
          </li>
        ) : (
          <li key={row.entry.slug}>
            <details open={row.entry.slug === headSlug}>
              <summary data-nav-item className="gitlog-summary">
                <span aria-hidden="true" className="gitlog-graph text-dim">
                  {row.prefix}
                </span>
                <span>
                  <span className="text-warn">{shortHash(row.entry.slug)}</span>
                  {row.entry.slug === headSlug && <span className="text-dim"> (HEAD -&gt; main)</span>}{' '}
                  {row.entry.role} @ {row.entry.company}
                  <span className="text-dim">
                    {' '}
                    {row.entry.start}..{row.entry.end ?? 'now'}
                  </span>
                  <SampleTag show={row.entry.sample} />
                  <span className="gitlog-toggle" aria-hidden="true" />
                </span>
              </summary>
              <div className="gitlog-body">
                <Markdown source={row.entry.body} />
              </div>
            </details>
          </li>
        ),
      )}
    </ol>
  );
}
```

`src/components/home/Finger.tsx`:

```tsx
import { Fragment, type ReactNode } from 'react';
import { Markdown } from '@/components/Markdown';
import type { Profile } from '@/lib/content/collections';

export function Finger({ profile }: { profile: Profile }) {
  const { contact } = profile;
  const rows: [string, ReactNode][] = [
    ['Login', profile.handle],
    ['Name', profile.name],
  ];
  if (contact.handler) rows.push(['Handler', contact.handler]);
  rows.push([
    'Mail',
    <a key="mail" href={`mailto:${contact.email}`} data-nav-item className="link">
      {contact.email}
    </a>,
  ]);
  if (contact.phone) {
    rows.push([
      'Phone',
      <a key="phone" href={`tel:${contact.phone.replace(/\s+/g, '')}`} data-nav-item className="link">
        {contact.phone}
      </a>,
    ]);
  }
  if (contact.whatsapp) {
    rows.push([
      'WhatsApp',
      <a key="wa" href={`https://wa.me/${contact.whatsapp}`} data-nav-item className="link">
        wa.me/{contact.whatsapp}
      </a>,
    ]);
  }

  return (
    <div>
      <dl className="grid grid-cols-[10ch_minmax(0,1fr)] gap-x-[1ch] gap-y-1">
        {rows.map(([key, value]) => (
          <Fragment key={key}>
            <dt className="text-dim">{key}:</dt>
            <dd>{value}</dd>
          </Fragment>
        ))}
      </dl>
      {profile.body && (
        <>
          <p className="mt-6 mb-2 text-dim">Plan:</p>
          <Markdown source={profile.body} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite the home page**

Replace `src/app/page.tsx`:

```tsx
import { Finger } from '@/components/home/Finger';
import { GitLog } from '@/components/home/GitLog';
import { Motd } from '@/components/home/Motd';
import { Prompt } from '@/components/shell/Prompt';
import {
  getBooks,
  getCareer,
  getHobbies,
  getLanguages,
  getProfile,
  getSports,
  getTrips,
} from '@/lib/content/collections';
import { summarize } from '@/lib/tui/motd';
import { now } from '@/lib/tui/time';

export default function Home() {
  const profile = getProfile();
  const summary = summarize({
    books: getBooks(),
    trips: getTrips(),
    languages: getLanguages(),
    sports: getSports(),
    hobbies: getHobbies(),
  });
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.role,
    email: `mailto:${profile.contact.email}`,
    ...(profile.contact.phone ? { telephone: profile.contact.phone } : {}),
    ...(profile.siteUrl ? { url: profile.siteUrl } : {}),
    knowsAbout: profile.certifications,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Prompt cmd={`ssh ${profile.handle}@${profile.host}`} label={`${profile.name}, ${profile.role}`} />
      <Motd profile={profile} summary={summary} asOf={now().toISOString().slice(0, 10)} />

      <section aria-labelledby="career">
        <Prompt level={2} id="career" cmd="git log --graph career" label="Career" />
        <GitLog jobs={getCareer()} />
      </section>

      <section aria-labelledby="certs">
        <Prompt level={2} id="certs" cmd="ls ~/certs" label="Certifications" />
        <ul className="grid list-none gap-x-[4ch] gap-y-1 p-0 sm:grid-cols-2">
          {profile.certifications.map((cert) => (
            <li key={cert}>{cert}</li>
          ))}
        </ul>
      </section>

      <section id="contact" aria-labelledby="contact-heading">
        <Prompt level={2} id="contact-heading" cmd={`finger ${profile.handle}`} label="Contact" />
        <Finger profile={profile} />
      </section>
    </>
  );
}
```

- [ ] **Step 5: Remove the old site and legacy styles, and add the home styles**

```bash
git rm src/components/ConsoleHeader.tsx src/components/CareerAccordion.tsx src/components/ComplianceBadge.tsx src/components/AgentContact.tsx src/components/AIOperationsBanner.tsx src/components/HiddenSEO.tsx public/retro-admin-bg.png
npm uninstall lucide-react react-icons
grep -rn "lucide-react\|react-icons\|components/ConsoleHeader\|HiddenSEO" src || echo "no references left"
```

Expected: `no references left`.

In `src/app/globals.css`, delete these four lines from the `@theme inline` block:

```css
  /* legacy aliases for the old home page components; removed in Task 10 */
  --color-background: var(--bg);
  --color-foreground: var(--fg);
  --color-accent: var(--warn);
```

Append to `src/app/globals.css`:

```css
.motd {
  margin: 0 0 3rem;
  font: inherit;
  line-height: 1.6;
  white-space: pre-wrap;
}

.motd a {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.motd a:hover {
  color: var(--warn);
}

@keyframes motd-line {
  from {
    visibility: hidden;
  }
  to {
    visibility: visible;
  }
}

html[data-motd-play] .motd-line {
  animation: motd-line 1ms steps(1, end) both;
  animation-delay: calc(var(--i) * 70ms);
}

@media (prefers-reduced-motion: reduce) {
  html[data-motd-play] .motd-line {
    animation: none;
  }
}

.gitlog {
  margin: 0;
  padding: 0;
  list-style: none;
}

.gitlog-edge,
.gitlog-graph {
  white-space: pre;
}

.gitlog-edge {
  color: var(--dim);
}

.gitlog-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 1ch;
  padding: 0.125rem 0;
  list-style: none;
  cursor: pointer;
}

.gitlog-summary::-webkit-details-marker {
  display: none;
}

.gitlog-summary:hover {
  background: color-mix(in srgb, var(--fg) 8%, transparent);
}

.gitlog-toggle::after {
  content: "[+]";
  margin-left: 1ch;
  color: var(--dim);
}

details[open] > .gitlog-summary .gitlog-toggle::after {
  content: "[-]";
}

.gitlog-body {
  margin: 0.5rem 0 1rem 0.5ch;
  padding-left: 2ch;
  border-left: 1px solid var(--dim);
}
```

- [ ] **Step 6: Verify in the browser**

Run: `npx tsc --noEmit && npx eslint . && npm test`
Expected: clean, all tests pass.

In a fresh private window (so the session is new), open http://localhost:3000 and check:
- `$ ssh mike@mike-g` in wide heavy type with a faint glow.
- The MOTD prints line by line over about a second. Reload: it shows instantly, since it plays only once per session.
- In a new private window, press any key during playback: it finishes immediately.
- With OS reduced motion on, there's no playback.
- With JS disabled (DevTools > Disable JavaScript), the full MOTD is visible.
- Career shows the graph `* |`, `| *`, `|/`, then a straight line of `*`.
- Hashes are amber. The first commit shows `(HEAD -> main)` and is expanded with `[-]`. The others expand on click and on Enter via `j`/`k`.
- `ls ~/certs` lists the 5 certifications, and `finger mike` shows the mail, phone and WhatsApp links plus the Plan.
- Both themes work, and there's no horizontal scroll at 375px.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/app/page.tsx src/app/globals.css src/lib/tui/gitGraph.ts src/lib/tui/gitGraph.test.ts src/lib/tui/motd.ts src/lib/tui/motd.test.ts src/components/home
git status --short
git commit -m "feat: rebuild home as MOTD, git log career, certs and finger contact"
```

Expected before the commit: the old components and `public/retro-admin-bg.png` show as staged deletions (`D`), the pnpm files stay untracked, and nothing else is unstaged.

---

### Task 11: 404, sitemap, robots, content in the runtime image, README and final verification

**Files:**
- Create: `src/app/not-found.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/content/routes.ts`
- Modify: `Dockerfile` (one `COPY` line)
- Rewrite: `README.md`
- Test: `src/lib/content/routes.test.ts`

**Interfaces:**
- Consumes: all accessors (Task 2); `TABS` (Task 3).
- Produces: `contentPaths(): string[]` (every public path).

- [ ] **Step 1: Write the failing test**

`src/lib/content/routes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getBooks, getHobbies } from './collections';
import { contentPaths } from './routes';

describe('contentPaths', () => {
  const paths = contentPaths();

  it('includes every section and every detail page', () => {
    expect(paths).toContain('/');
    expect(paths).toContain('/travel');
    for (const b of getBooks()) expect(paths).toContain(`/books/${b.slug}`);
    for (const h of getHobbies()) expect(paths).toContain(`/hobbies/${h.slug}`);
  });

  it('has no duplicates', () => {
    expect(new Set(paths).size).toBe(paths.length);
  });
});
```

Run: `npm test -- src/lib/content/routes.test.ts`
Expected: FAIL with `Failed to resolve import "./routes"`.

- [ ] **Step 2: Implement routes, sitemap, robots and 404**

`src/lib/content/routes.ts`:

```ts
import { TABS } from '@/lib/tui/tabs';
import { getBooks, getHobbies, getLanguages, getSports, getTrips } from './collections';

export function contentPaths(): string[] {
  return [
    ...TABS.map((t) => t.href),
    ...getBooks().map((b) => `/books/${b.slug}`),
    ...getTrips().map((t) => `/travel/${t.slug}`),
    ...getLanguages().map((l) => `/languages/${l.slug}`),
    ...getSports().map((s) => `/sport/${s.slug}`),
    ...getHobbies().map((h) => `/hobbies/${h.slug}`),
  ];
}
```

Run: `npm test -- src/lib/content/routes.test.ts`
Expected: PASS (2 tests).

`src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next';
import { getProfile } from '@/lib/content/collections';
import { contentPaths } from '@/lib/content/routes';

export default function sitemap(): MetadataRoute.Sitemap {
  const { siteUrl } = getProfile();
  if (!siteUrl) return [];
  const base = siteUrl.replace(/\/$/, '');
  return contentPaths().map((path) => ({ url: path === '/' ? base : `${base}${path}` }));
}
```

`src/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next';
import { getProfile } from '@/lib/content/collections';

export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = getProfile();
  return {
    rules: { userAgent: '*', allow: '/' },
    ...(siteUrl ? { sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml` } : {}),
  };
}
```

`src/app/not-found.tsx`:

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1 className="sr-only">Page not found</h1>
      <p aria-hidden="true" className="t-title text-alert">
        bash: cd: no such file or directory
      </p>
      <p className="mt-4 max-w-[60ch]">
        This page doesn&apos;t exist. Pick a section from the tabs, or go to the{' '}
        <Link href="/" className="link">
          home page
        </Link>
        .
      </p>
    </>
  );
}
```

- [ ] **Step 3: Ship content/ in the runtime image**

The root layout reads `content/profile.md`, so any page rendered at request time (such as a 404) needs `content/` next to `server.js`. Next's file tracing skips fully static routes, so copy the folder explicitly. In `Dockerfile`, add this line directly after the `COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static` line:

```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/content ./content
```

- [ ] **Step 4: Rewrite the README as the content guide**

Replace `README.md`:

````md
# mike-g profile

Personal site styled as a retro terminal. Each section looks like the ops tool that fits it: an SSH login message and `git log` on the home page, `htop` for books, `traceroute` for travel, a CI pipeline for languages, `btop` for sport and `systemctl` for hobbies.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests + content validation
npm run build   # production build (fails on invalid content)
```

Pushing to `main` deploys to Cloud Run. Work on a branch.

## Editing content

Everything lives in `content/`. Add one Markdown file per entry. The file name becomes the URL, so use lowercase words joined by hyphens, like `content/travel/2025-04-japan.md`. Frontmatter goes between the `---` lines; the rest of the file is Markdown notes. Use `###` for headings inside notes.

Dates are `"YYYY-MM"` (or `"YYYY"`, or `"YYYY-MM-DD"` for sport events). Quote times like `"44:12"`, or YAML reads them as numbers.

If a file is invalid, `npm test` and `npm run build` fail with the file name and the field to fix.

### Before going live

- Replace every sample entry. `grep -rl "sample: true" content/` lists them, and they show a `sample` tag on the site.
- Set `siteUrl` in `content/profile.md` (for example `https://your-domain`) to enable `sitemap.xml`.
- Check `home` in `content/profile.md`. It's the origin for travel distances and currently set to Bratislava.

### Fields

| Folder | Required | Optional |
|---|---|---|
| `profile.md` | `name`, `handle`, `host`, `role`, `home {city, countryCode, lat, lng}`, `contact.email` | `uptime`, `siteUrl`, `certifications`, `contact.handler`, `contact.phone`, `contact.whatsapp` |
| `career/` | `company`, `role`, `start` | `end` (leave out while current) |
| `books/` | `title`, `author`, `status` (`reading` / `paused` / `finished` / `queued`) | `progress` 0–100 (required for reading/paused), `started`, `finished` (required for finished), `rating` 1–5, `published`, `tags` |
| `travel/` | `title`, `country`, `countryCode` (e.g. `JP`), `start`, `cities` (list of `{ name, lat, lng }`) | `days` |
| `languages/` | `name`, `level`, `target` (CEFR `A1`–`C2`, target ≥ level), `since` | `methods`, `streakDays` |
| `sport/` | `name`, `unit`, `weekly` (2–52 numbers, oldest first) | `records` (`{ label, value, date }`), `events` (`{ name, date, result }`, no result = scheduled), `streakDays`, `active` |
| `hobbies/` | `name`, `description`, `state` (`active` / `inactive`), `since` (when it entered that state) | |

All collections also accept `sample: true` for placeholder entries.

## Keyboard

`1`–`6` switch sections, `j`/`k` move between items, `Enter` opens, `t` switches theme (crt / printout), `?` shows help.
````

- [ ] **Step 5: Run the full verification**

```bash
npx eslint . && npx tsc --noEmit && npm test && npm run build
```

Expected: no lint or type errors and every test file passes. The build route table lists `/`, `/books`, `/travel`, `/languages`, `/sport`, `/hobbies`, `/sitemap.xml` and `/robots.txt` as static (○), and every `[slug]` route as SSG (●) with its generated paths.

- [ ] **Step 6: Check 404s on the production standalone server (Review Focus 5)**

This mirrors the Dockerfile's runner stage: copy `public`, `.next/static` and `content` next to `server.js`.

```bash
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/ && cp -r content .next/standalone/
PORT=3100 node .next/standalone/server.js > .next/standalone.log 2>&1 & echo $! > .next/standalone.pid
sleep 2
for p in / /books /books/atomic-habits /books/typo /nope /robots.txt; do printf "%s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3100$p"; done
curl -s http://localhost:3100/nope | grep -o "no such file or directory"
kill "$(cat .next/standalone.pid)"
```

Expected:
- Status codes: `/ 200`, `/books 200`, `/books/atomic-habits 200`, `/books/typo 404`, `/nope 404`, `/robots.txt 200`.
- The 404 body contains `no such file or directory`.
- `.next/standalone.log` has no `ENOENT` or `ContentError`.

If Docker is installed, also check the real image:

```bash
docker build -t profile-redesign . && docker run --rm -d -p 3200:3000 --name profile-redesign profile-redesign
sleep 3; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3200/nope; docker stop profile-redesign
```

Expected: it builds, and `/nope` returns `404`.

- [ ] **Step 7: Final visual QA pass**

With `npm run dev`, check each of these on `/`, `/books`, `/books/site-reliability-engineering`, `/travel`, `/travel/2026-06-iceland`, `/languages`, `/languages/german`, `/sport`, `/sport/running`, `/hobbies` and `/hobbies/photography`:
- **Themes:** both CRT and printout. No unreadable text, and even rows have bands in printout.
- **Mobile:** at a 375px viewport, `document.documentElement.scrollWidth <= window.innerWidth` in the console returns `true`, and tabs are at the bottom.
- **Keyboard only:** `1`–`6`, `j`/`k`, `Enter`, `t`, `?`, `Esc` all work, and the focus is always visible.
- **Headings:** exactly one `h1` per page (`document.querySelectorAll('h1').length === 1`).
- **Sample tags:** every sample entry shows `sample`.

- [ ] **Step 8: Commit**

```bash
git add src/app/not-found.tsx src/app/sitemap.ts src/app/robots.ts src/lib/content/routes.ts src/lib/content/routes.test.ts Dockerfile README.md
git commit -m "feat: add 404, sitemap, robots and ship content in the runtime image"
git log --oneline main..HEAD
```

Expected: 12 commits on `redesign/ops-tools` (the lint fix plus 11 tasks). Do not push; Mike decides when this goes to `main`.
