# Ops-tools redesign — design spec

Date: 2026-09-24
Status: draft for review

## Intent

**What Mike asked for:** redesign the profile site and add sub-pages about books, hobbies, travel, self-improvement (language learning) and sport. Keep and evolve the terminal identity. Scaffold with placeholder content now; real content replaces it later. Content is authored as Markdown files with frontmatter. Every section is a real URL inside a persistent terminal-style frame.

**Assumptions (correct me):**
- Sport and Hobbies are two separate pages.
- Career stays on the home page.
- Hosting is unchanged: standalone Next.js on Cloud Run, deployed on every push to `main`.
- Placeholder entries must be visibly marked so they can't be mistaken for real facts about Mike.
- The home city used as the travel origin is Bratislava (inferred from the +421 phone number).

**Success looks like:** a visitor can see at a glance that this is an SRE's site. Every section reads like the ops tool that fits it. The site works on a phone, by keyboard, and without JavaScript for reading. Mike can add a book or a trip by dropping in one Markdown file, and a typo gives a build error naming the file and field.

## Concept: your life, shown through the ops tools you already use

| Section | Route | Styled as | Detail page styled as |
|---|---|---|---|
| Home | `/` | SSH login message (MOTD) summarizing every section, `git log --graph` for career (overlapping jobs show as parallel lanes), `ls ~/certs`, `finger mike` for contact | none |
| Books | `/books` | `htop`: in-progress books as processes (R = reading, S = paused), progress as a CPU-style meter, then finished books grouped by year, then queued books | `man` page: NAME, SYNOPSIS, NOTES, SEE ALSO (books with a shared tag) |
| Travel | `/travel` | `traceroute`: trips as numbered hops in date order, with distance from home. Above it, a dot-matrix world map with pins. | Route of the trip's cities plus notes |
| Languages | `/languages` | CI pipeline: CEFR levels A1–C2 as stages (passed / running / pending / skipped) | Pipeline log: stages, methods, notes |
| Sport | `/sport` | btop-style panels: weekly-volume sparkline, this week / average / peak, top record; `up N days` streak | Full panel, records table, events (done or scheduled), notes |
| Hobbies | `/hobbies` | `systemctl list-units`: each hobby is a `.service`, active (running) or inactive (dead) | `systemctl status`: Loaded / Active since …; notes as the journal |

**The one bold moment:** the MOTD on `/` prints line by line (70 ms per line) the first time someone lands on it in a session. Any key or click skips it. It is disabled for prefers-reduced-motion and without JavaScript. Nothing else animates unless the user does something.

## Visual system

**Themes.** "CRT" is the default dark theme. "Printout" is the light theme, styled like green-bar line-printer paper. Colors show state, not decoration.

| Token | CRT | Printout | Meaning |
|---|---|---|---|
| `--bg` | `#0C1410` | `#F4F7F0` | glass / paper |
| `--fg` | `#8AF5A0` | `#1F2B24` | primary text, done / ok |
| `--dim` | `#56966A` | `#56645A` | secondary text, paused / planned |
| `--warn` | `#FFB547` | `#8F5400` | in progress, commit hashes, focus outline |
| `--alert` | `#FF6B57` | `#B3321B` | errors (404) |
| `--band` | `#101C16` | `#DCEBD9` | alternating row band (the "green bar") |
| `--rule` | `#2A4535` | `#B9CBB8` | frame and panel borders |

All text/background pairs meet WCAG AA (4.5:1) on both `--bg` and `--band`. The theme is chosen from a saved choice, falling back to `prefers-color-scheme`. It is applied by an inline `<head>` script before first paint, so there's no flash.

**Type.** A single variable family: **Martian Mono** (Google Fonts, `wdth` 75–112.5, `wght` 100–800). The width axis sets hierarchy:
- Display (page command): 24–40px fluid, `wdth 112.5`, `wght 700`, faint phosphor glow in CRT only.
- Title: 21px, `wght 600`.
- UI: 14px.
- Dense tables: 14px at `wdth 87.5`.
- Micro: 12px.
- Prose: 16px, line-height 1.7, max 68ch.

Martian Mono has no box-drawing, block or symbol glyphs, and Google's subsets would strip them anyway. **Meters, sparklines, status dots and connectors are drawn with CSS/SVG**, never with glyphs like `▓ ▁ ● ✓ ★`.

**Frame.** A centered window (max 110ch) with left-aligned content:
- title line (`mike@mike-g: ~/books`)
- tab bar (`1 ~  2 books  3 travel  4 languages  5 sport  6 hobbies`, active tab in inverse video)
- main pane
- status line (key hints, theme switch, `up 100.00%`)

On phones (<640px) the frame goes full width, the tab bar sticks to the bottom and scrolls within itself, and the key hints are hidden. There is never horizontal page scroll at 375px.

**Copy rules.**
- Headings are lowercase commands (`$ htop -u books`), with a screen-reader-only plain label ("Books") as the real heading text.
- Prose is sentence case.
- No ALL-CAPS labels, except man-page section names, which are the joke.
- No middle-dot separators, and no `→` appended to links.
- Rows show selection and keyboard focus in inverse video.

## Architecture

**Routes.** `/`, `/books`, `/books/[slug]`, `/travel`, `/travel/[slug]`, `/languages`, `/languages/[slug]`, `/sport`, `/sport/[slug]`, `/hobbies`, `/hobbies/[slug]`, plus `not-found`, `sitemap.xml` and `robots.txt`.
- Every detail route uses `generateStaticParams` with `dynamicParams = false`, so the whole site is prerendered at build.
- The Dockerfile copies `content/` into the runtime image, so pages rendered at request time (like 404s) can still read the profile. Next's file tracing doesn't reliably include it for fully static routes.

**Content model.** Everything lives in `content/` at the repo root:
- `content/profile.md` (single file)
- `content/{career,books,travel,languages,sport,hobbies}/*.md` (one file per entry)

The slug is the file name. File names must be lowercase words joined by hyphens.

Frontmatter is validated with zod at build time. Any error throws `ContentError` with the file path and the failing field.

Date fields accept `YYYY`, `YYYY-MM` or `YYYY-MM-DD` as strings. Unquoted YAML dates and bare years are normalized, not rejected.

The Markdown body renders through `react-markdown` + `remark-gfm`. Raw HTML is not rendered. Body `#`/`##` headings are demoted to `h3`.

| Collection | Required | Optional |
|---|---|---|
| profile | name, handle, host, role, home {city, countryCode, lat, lng}, contact.email | uptime, siteUrl, certifications[], contact.{handler, phone, whatsapp} |
| career | company, role, start | end (absent = present), sample |
| books | title, author, status (reading, paused, finished, queued) | progress 0–100 (required when reading/paused), started, finished (required when finished), rating 1–5, published, tags[], sample |
| travel | title, country, countryCode, start, cities[{name, lat, lng}] (min 1) | days, sample |
| languages | name, level, target (≥ level), since | methods[], streakDays, sample |
| sport | name, unit, weekly[] (2–52 numbers, oldest first) | records[{label, value, date}], events[{name, date, result?}], streakDays, active, sample |
| hobbies | name, description, state (active or inactive), since (when it entered its current state) | sample |

**Sample content.** Every placeholder file has `sample: true` and shows a small `sample` tag wherever it's listed. Career and profile carry Mike's real data from the current site, so they're not samples. `siteUrl` is left unset, so `sitemap.xml` is empty and robots has no sitemap line until Mike sets it.

**Keyboard.**

| Key | Action |
|---|---|
| `1`–`6` | Switch section |
| `j` / `k` | Move focus between `[data-nav-item]` rows |
| `Enter` | Open the focused row (native link) |
| `t` | Switch theme |
| `?` | Help dialog (native `<dialog>`, closed with Esc) |

Keys with Ctrl, Cmd or Alt held, and keys typed into editable fields, are never intercepted.

**SEO.**
- Remove `HiddenSEO`: hidden keyword text risks a search penalty.
- Add per-page titles (`%s | Mike G.`), a JSON-LD `Person` on the home page, `sitemap.xml` and `robots.txt`.

**Cleanup.** Delete the old components (`ConsoleHeader`, `CareerAccordion`, `ComplianceBadge`, `AgentContact`, `AIOperationsBanner`, `HiddenSEO`, `ThemeToggle`), `public/retro-admin-bg.png`, and the now-unused `lucide-react` and `react-icons` dependencies.

## Testing

**Unit tests (Vitest 4, node environment) cover every pure module:**
- content loader
- schemas
- tab matching
- key mapping
- meter cells
- book grouping
- distance and hostnames
- map pins
- CEFR stages
- sparkline heights
- durations
- git-graph lanes
- MOTD summary

**A content-integrity test** loads the real `content/` folder, so a broken Markdown file fails `npm test` before it fails a deploy.

**UI is verified in the running dev server and a production standalone build:**
- both themes
- 375px width
- keyboard only
- reduced motion
- unknown URLs return a styled 404, not a 500

## Out of scope

- A CMS or admin UI.
- Strava or Goodreads sync.
- An interactive fake shell.
- Comments, analytics, i18n.
- Photos in trip pages. They can be added later as Markdown images in `public/`.
