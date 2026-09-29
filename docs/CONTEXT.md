# Project context: mike-g profile

Read this first when picking the project back up. It records what the site is, how it's built and deployed, what was done and why, and what's still open. Last updated 2026-09-29.

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
- `docs/superpowers/plans/2026-09-28-azure-container-apps-deploy.md`: the deployment plan that was executed (setup done by hand in the portal, PRs #3 and #4). `2026-09-25-deploy-mike-gordievsky.md` is the superseded first draft.
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

- **Where:** Container App `mike-profile-web` in resource group **`mike-gordievsky`** (westeurope, subscription EUHub `42d3345a-2568-48e0-a414-3fc00ee2cba7`, tenant `8c4f47c0-d3cc-4c9c-bc45-39bbf0eb18be`). It shares that group's existing Container Apps environment `personal-brand-analytics-env` and registry `mikegordievskypersonalbrand` with the personal-brand apps (`personal-brand-analytics`, `linkedin-telegram-worker`, `linkedin-publication-collector`). **Never touch those.**
- **URLs:** `https://mike.euhub.co` (managed certificate `mc-personal-brand-mike-euhub-co-5112`), plus the Azure URL `https://mike-profile-web.jollymeadow-f8c88678.westeurope.azurecontainerapps.io`.
- **Deploy:** manual only. Actions → **Deploy to Azure Container Apps** → **Run workflow**, or `gh workflow run deploy.yml --ref main -f site_indexable=false`. Pushing to `main` deploys nothing.
- **Hidden from crawlers:** the workflow input `site_indexable` (default off) sets the `SITE_INDEXABLE` build arg. Off means robots.txt disallows everyone, every response carries `X-Robots-Tag: noindex, nofollow, noai…`, pages carry robots meta tags, the sitemap is empty and the home page omits JSON-LD (list of blocked agents in `src/lib/site.ts`). Mike wants the site reachable by direct link only, so keep it off.
- **Pipeline:** lint, types, tests, `infra/check-workflow.sh` → push to ACR → `infra/main.bicep`.
- **Identities:** GitHub side is app registration `gh-oidc-mike-profile-deploy` (client ID `678fefdc-1e3f-444e-b489-bc2c4075b232`, federated subject `repo:EUHUB-AI/profile:environment:production`) with Contributor on the RG and AcrPush on the registry. The image pull uses user-assigned identity `mike-profile-web-identity` (AcrPull). All created by hand in the portal on 2026-09-29.
- **Custom domain:** `mike.euhub.co` must stay recorded in `infra/main.parameters.json`, or the next deploy removes it. DNS for `euhub.co` is on Google Cloud DNS, edited by hand (CNAME `mike`, TXT `asuid.mike`).
- **Guardrail:** `infra/check-workflow.sh` checks the workflow is manual-only and targets this RG.
- **Local `az` on the dell machine** is a service principal with no rights on this RG; Azure commands for this app run from Mike's home machine (user login) or the portal.
- **Superseded:** the `rg-euhub-prod-apps` / `cae-euhub-prod` target (2026-09-24) was never deployed. The Cloudflare quick tunnel from 2026-09-25 is no longer needed.

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
6. **2026-09-29: first deploy.** Deployed to RG `mike-gordievsky` as `mike-profile-web` (run 36610613289) and bound `mike.euhub.co`. Live with sample content still tagged `sample`, hidden from crawlers. Plan: `docs/superpowers/plans/2026-09-28-azure-container-apps-deploy.md`.

## Open items / backlog

- **Rotate the leaked service principal secret.** On the dell machine, `~/.zsh_history` holds an `az login --service-principal` line with the secret of principal `72fa1486-fa27-4258-8747-d6758943dca1` (Contributor on `rg-lkwc-engine-prod`, unrelated to this site). Rotate it in Entra and delete the line.
- **Decide whether the site needs a real wall.** It is hidden from crawlers by robots rules only (see Deployment). A scraper that ignores them, or anyone with the link, still gets in. Options: Container Apps built-in auth with Entra (recommended, one Bicep change) or an ingress IP allowlist. Not requested yet.
- **Going public later.** Replace the sample content first, then run the deploy workflow with `site_indexable` ticked. Also confirm `siteUrl` in `content/profile.md` (currently `https://mike.euhub.co`) and re-check robots.txt and the sitemap on the live site.
- **Unused GitHub variables.** `AZURE_ACR_NAME` and `AZURE_CONTAINER_APPS_ENVIRONMENT` on the `production` environment are leftovers from the abandoned shared-platform setup. The workflow ignores them, so delete them when convenient.
- **Replace sample content.** Books, travel, languages, sport and hobbies are placeholders with `sample: true`, and they show a `sample` tag. `grep -rl "sample: true" content/` lists them. Career and profile are real data.
- **Confirm the travel origin.** `home` is set to Bratislava, a guess from the +421 phone number.
- **Phone layout:** the intro lines wrap unevenly at 390px. Smaller intro text or no-wrap values would fix it.
- **UHD:** the frame caps at 200 characters, about 80% of a 3840px screen. Raise the cap if Mike wants it wider.
- **Dates frozen at build time:** "System information as of …" and the hobby "… ago" durations only update on each deploy.
- **Smells left from the review, deliberately not fixed:**
  - The five detail pages repeat the same setup (params, static page list, metadata, not-found, header, footer).
  - The language stage → color/dot mapping exists three times.
  - `unitState` and `STAGE_DOT` should move to `lib/tui/`.
  - `bootScript` does two jobs.

## Gotchas learned

- **Azure from this machine.** The dell machine's `az` session is a service principal with no rights on `mike-gordievsky` and no Graph rights, so it cannot create identities, app registrations or role assignments. Check `az account show --query user.type` first; it must say `user`. Azure commands for this app run from Mike's home machine or the portal.
- **Claude can't write GitHub settings.** Creating the `production` environment and setting its variables is blocked by the session's permission classifier. Hand Mike the exact `gh` commands instead.
- **OIDC subject form.** GitHub presents `repo:EUHUB-AI/profile:environment:production`, the plain-name form. The immutable-ID form (`repo:EUHUB-AI@<orgid>/profile@<repoid>:...`) fails with `AADSTS700213`. In the portal, pick "GitHub Actions deploying Azure resources" and type only the plain org, repo and environment names.
- **Redeploys must keep the domain.** A Bicep PUT overwrites `ingress.customDomains`. `mike.euhub.co` and its certificate `mc-personal-brand-mike-euhub-co-5112` are recorded in `infra/main.parameters.json`; if the domain is ever rebound, update the certificate name there.
- **`gh pr edit` fails** with a Projects (classic) GraphQL error. Use `gh api -X PATCH repos/EUHUB-AI/profile/pulls/<n>` instead.
- **Fresh checkout has no `node_modules`.** Run `npm ci` before `npx eslint . && npx tsc --noEmit && npm test && npm run build`.
- **Superpowers plugin** (`superpowers@superpowers-marketplace` 6.4.2) is installed at user scope on the dell machine. The deploy plan was written with its `writing-plans` skill and run with `executing-plans`. A plugin installed mid-session isn't in that session's skill list; start a new session or read the `SKILL.md` directly under `~/.claude/plugins/cache/superpowers-marketplace/superpowers/`.
- In zsh, never name a shell variable `path`: it's tied to `$PATH` and breaks every command after it.
- Headless Chrome screenshots default to the light (`printout`) theme.
  - Use `google-chrome --headless=new --window-size=2560,1440 --screenshot=… http://localhost:3000/`.
- Detail routes use Next 16 Promise params: type them `{ params: Promise<{ slug: string }> }` and `await` them.
- Every detail route sets `dynamicParams = false` and has `generateStaticParams`.
- The standalone server needs `content/` next to `server.js` for request-time renders like 404s.
  - The Dockerfile copies it in. Next's file tracing doesn't include it for fully static routes.
