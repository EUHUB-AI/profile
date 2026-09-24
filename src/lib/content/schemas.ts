import { z } from 'zod';

const YEAR_MONTH = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const DAY_OR_LOOSER = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;

// YAML turns `2025-04-12` into a Date and `2019` into a number; normalize both to strings.
export const yearMonth = z.preprocess(
  (v) => {
    if (v instanceof Date) return v.toISOString().slice(0, 7);
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string' && DAY.test(v)) return v.slice(0, 7);
    return v;
  },
  z.string().regex(YEAR_MONTH, 'use YYYY-MM (or YYYY)'),
);

export const day = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'number' ? String(v) : v),
  z.string().regex(DAY_OR_LOOSER, 'use YYYY-MM-DD (or YYYY-MM, YYYY)'),
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
