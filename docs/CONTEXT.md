# Project context: mike-g profile

Read this first when picking the project back up. It records what the site is, how it's built and deployed, what was done and why, and what's still open. Last updated 2026-09-24.

## What it is

Mike G.'s personal site (SRE & Dev/AI/Sec Ops Architect). It's styled as a retro terminal "OS", and each section looks like the ops tool that fits it:

| Route | Styled as |
|---|---|
| `/` | An SSH login message summarizing every section, then `git log --graph` for career (overlapping jobs drawn as parallel lanes), then `ls ~/certs` and `finger mike` for contact |
| `/books`, `/books/[slug]` | `htop` list: R = reading, S = paused, progress meters. Detail pages are `man` pages. |
| `/travel`, `/travel/[slug]` | `traceroute` hops with distance from home, plus a dot-matrix world map |
| `/languages`, `/languages/[slug]` | A CI pipeline: CEFR levels A1–C2 as passed / running / pending / skipped stages |
| `/sport`, `/sport/[slug]` | btop-style panels: weekly sparkline, this week / average / peak, records, events |
| `/hobbies`, `/hobbies/[slug]` | `systemctl` units: active (running) or inactive (dead) |

- **Domain:** `mike.euhub.co` (`siteUrl` in `content/profile.md`). Not wired up yet; see Deployment.
- **Repo:** `github.com/EUHUB-AI/profile` (public). Default branch `main`.

## Stack and commands

- Next.js 16 (App Router, `output: 'standalone'`), React 19, Tailwind 4, TypeScript.
- Content: gray-matter + zod 4. Markdown rendering: react-markdown + remark-gfm. World map: dotted-map.
- Tests: Vitest 4. Pinned below 5, because Vitest 5 doesn't support Node 25, which runs on the dev machine.
- Package manager: **npm** (`package-lock.json`). The Dockerfile runs `bun install --frozen-lockfile` against that lockfile. `pnpm-lock.yaml` and `pnpm-workspace.yaml` in the working tree are stray, untracked files; never commit them.

```bash
npm run dev      # http://localhost:3000
npm test         # 83 unit tests + validation of every file in content/
npx eslint . && npx tsc --noEmit
npm run build    # safe while dev runs: Next 16 keeps dev output in .next/dev
```

## Code map

- `content/`: every piece of site content is a Markdown file with frontmatter.
  - `profile.md` is a single file; `career/`, `books/`, `travel/`, `languages/`, `sport/` and `hobbies/` hold one file per entry.
  - The file name is the URL slug.
  - The field reference is in the root `README.md`.
- `src/lib/content/`:
  - `load.ts` reads and validates the files, and throws `ContentError` naming the bad file and field.
  - `schemas.ts` holds the zod schemas; dates accept YYYY, YYYY-MM or YYYY-MM-DD, unquoted YAML dates included.
  - `collections.ts` has the typed `get*()` accessors; `routes.ts` lists every URL for the sitemap.
- `src/lib/tui/`: pure, unit-tested logic.
  - Navigation: tabs, keys.
  - Per section: meter, books, travel and travelMap, languages (CEFR stages), sport (sparkline and stats).
  - Home page: time, gitGraph (career lane layout), motd (home-page summary).
- `src/lib/theme.ts`:
  - The theme switch (`crt` dark, `printout` light).
  - `bootScript`, an inline `<head>` script that applies the theme before first paint and starts the one-time intro animation on `/`.
- `src/components/`:
  - `shell/` holds the frame: title line, tabs, status line, keyboard navigation, the `Prompt` heading, `BackLink`.
  - One folder per section.
  - Shared pieces: Markdown, SampleTag, Meter, StatusDot, Sparkline.
- `docs/superpowers/specs/2026-09-24-ops-tools-redesign-design.md`: the design spec. Colors, type, copy rules, content model.
- `docs/superpowers/plans/2026-09-24-ops-tools-redesign.md`: the 11-task plan used to build it. Its deployment notes predate the Azure switch.
- `infra/` and `.github/workflows/deploy.yml`: the Azure deployment (next section).

## Design rules worth remembering

- **Color tokens only:** `--bg --fg --dim --warn --alert --band --rule`. Color shows state:
  - fg = done / ok
  - warn = in progress
  - dim = paused / planned / secondary
  - alert = errors
- **One font:** Martian Mono, a variable font whose width axis sets the heading hierarchy. **It has no box-drawing, block or symbol glyphs**, so meters, status dots, sparklines and connectors are drawn with CSS/SVG. Never put `▓ ● ✓ ★ ─` in text.
- **The font variable must sit on `<html>`, not `<body>`.** Tailwind resolves `--font-mono` at `:root`. On `<body>` it silently falls back to the system sans-serif. This bug existed on the old site too.
- **Headings** are lowercase commands rendered by `Prompt`, with a screen-reader-only plain label. No ALL-CAPS labels except man-page section names. No middle-dot separators.
- **Motion:** the home-page intro plays once per session, skips on any key or click, and stays off with reduced motion or without JS. Nothing else animates on its own.
- **Wide screens:**
  - Text scales from 14px to 16px at 1920px wide, 18px at 2560px and 22px at 3840px.
  - From 1536px up, the frame is `min(94vw, 200ch)`.
  - Home, travel and sport switch to multi-column layouts.
  - Reading text stays at 68 characters per line.
- **Keyboard:** `1`–`6` switch tabs, `j`/`k` move between rows, `t` switches theme, `?` opens help. Shortcuts never fire with Ctrl/Cmd/Alt held or while typing in a field.

## Deployment

- **Target:** Azure Container Apps, the same setup as `EUHUB-AI/OminusMTE`.
  - App `ca-euhub-mike-web` in `rg-euhub-prod-apps`.
  - Shared environment `cae-euhub-prod` and registry `acreuhubprod`, both in `rg-euhub-prod-platform`.
  - Region `germanywestcentral`, subscription `EUHub`.
- **Trigger:** manual only (`workflow_dispatch`). A push to `main` deploys nothing.
- **Pipeline:** lint, types and tests → build and push to ACR (OIDC login, no stored secrets) → apply `infra/main.bicep` → grant AcrPull.
- **Output:** the run summary and the GitHub `production` environment show the app's Azure-generated URL (`*.azurecontainerapps.io`).
- **Not done yet** (steps in `infra/README.md`):
  - the Azure app registration and its OIDC credential (subject `repo:EUHUB-AI@248672290/profile@1105616066:environment:production`)
  - role assignments
  - the GitHub `production` environment and its variables
  - the first manual run
  - DNS for `mike.euhub.co` (a CNAME plus an `asuid.mike` TXT record) and `az containerapp hostname add/bind`
- **GCP is gone:** the old Cloud Run pipeline and `cloudbuild.yaml` were removed on 2026-09-24. Don't reintroduce them.

## How Mike works

- Uses **Herdr** (terminal multiplexer): workspace `w2`, with the planning and reviewing Claude in the left pane.
- Implementation is delegated to **Sonnet 5, medium effort** (`claude --model claude-sonnet-5 --effort medium --permission-mode auto`), started in a right-hand split with `herdr agent start`. I keep an eye on it with `herdr agent wait` and `herdr agent read`.
- Reviews use **`/code-review low`**: two parallel reviewers, one for standards and one for the spec, against `main`.
- Mike tests on **`http://localhost:3000`**, so keep a dev server running there during reviews.
- Work on feature branches, then PR, then merge with a **merge commit**, so per-task history stays in `main`.
- When offered options, Mike usually takes the recommended one. He asks for decisions to be surfaced when they have real consequences, like the GCP deploy that would have fired on merge.

## History (2026-09-24)

1. **Bug fixes on the old site.** A JSX comment was rendering as text in `HiddenSEO`, `ThemeToggle` had a setState-in-effect bug, and there were unused imports.
2. **Redesign brainstorm.** Chose to evolve the terminal look, use Markdown content, and have real routes inside a persistent frame. The frontend-design skill set the direction. Spec and plan written.
3. **Build.** Sonnet 5 ran the 11-task plan in the right Herdr pane and opened PR #1.
4. **Code review.**
   - Priority findings fixed: sample tags missing from the home-page summary, the intro replaying after back/forward navigation, date formats, a 404 title, and four style-rule breaches.
   - The Martian Mono loading bug was found from Mike's QHD screenshot and fixed. Wide-screen scaling and two-column layouts were added.
5. **Domain and deploy prep.** Domain set to `mike.euhub.co`. GCP removed. Azure Container Apps pipeline added (manual trigger), copied from the OminusMTE setup. PR #1 merged to `main` with a merge commit.

## Open items / backlog

- **Replace sample content.** Books, travel, languages, sport and hobbies are placeholders with `sample: true`, and they show a `sample` tag. `grep -rl "sample: true" content/` lists them. Career and profile are real data.
- **Confirm the travel origin.** `home` is set to Bratislava, a guess from the +421 phone number.
- **Do the Azure setup and first deploy**, then bind `mike.euhub.co` (see Deployment).
- **Phone layout:** the intro lines wrap unevenly at 390px. Smaller intro text or no-wrap values would fix it.
- **UHD:** the frame caps at 200 characters, about 80% of a 3840px screen. Raise the cap if Mike wants it wider.
- **Dates frozen at build time:** "System information as of …" and the hobby "… ago" durations only update on each deploy.
- **Smells left from the review, deliberately not fixed:**
  - The five detail pages repeat the same setup (params, static page list, metadata, not-found, header, footer).
  - The language stage → color/dot mapping exists three times.
  - `unitState` and `STAGE_DOT` should move to `lib/tui/`.
  - `bootScript` does two jobs.

## Gotchas learned

- In zsh, never name a shell variable `path`: it's tied to `$PATH` and breaks every command after it.
- Headless Chrome screenshots default to the light (`printout`) theme.
  - Use `google-chrome --headless=new --window-size=2560,1440 --screenshot=… http://localhost:3000/`.
- Detail routes use Next 16 Promise params: type them `{ params: Promise<{ slug: string }> }` and `await` them.
- Every detail route sets `dynamicParams = false` and has `generateStaticParams`.
- The standalone server needs `content/` next to `server.js` for request-time renders like 404s.
  - The Dockerfile copies it in. Next's file tracing doesn't include it for fully static routes.
