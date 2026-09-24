# CLAUDE.md

Before starting any work here, read `docs/CONTEXT.md`. It covers the site's concept, code map, design rules, Azure deployment, how Mike works (Herdr, Sonnet in the right pane, `/code-review low`, testing on localhost:3000), history and open items.

Hard rules:
- npm only. Never commit `pnpm-lock.yaml` or `pnpm-workspace.yaml`, and never use `git add -A` or `git add .`.
- Work on a branch, then PR, then merge commit. Deploys are manual (`workflow_dispatch`, Azure Container Apps). Never add a deploy that runs on push, and don't reintroduce GCP.
- Martian Mono has no box-drawing, block or symbol glyphs: draw meters, dots and sparklines with CSS/SVG. The font variable class goes on `<html>`, not `<body>`.
- Content lives in `content/**.md`. After editing it, run `npm test`: it validates every file and names the one that's broken.
- Before calling work done, run `npx eslint . && npx tsc --noEmit && npm test && npm run build`.
