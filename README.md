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
