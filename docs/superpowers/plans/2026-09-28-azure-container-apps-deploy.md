# Azure Container Apps Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the profile site running as Container App `ca-euhub-mike-web` on the shared EUHub platform, the same pipeline and resource group as `EUHUB-AI/Ominus`, first on its Azure-generated URL and then on `https://mike.euhub.co`.

**Architecture:**
- The app joins environment `cae-euhub-prod` and pulls from registry `acreuhubprod` (both in `rg-euhub-prod-platform`); the app itself lives in `rg-euhub-prod-apps`. The Bicep template on `main` already does this and stays as is.
- The workflow mirrors Ominus's: OIDC login with the app registration Ominus already uses, image push, AcrPull grant before and after the Bicep apply. It stays `workflow_dispatch` only (CLAUDE.md), unlike Ominus which also deploys on push. It gains one input, `site_indexable`, which becomes the Docker build arg `SITE_INDEXABLE`; default `false` while sample content is live.
- Nothing is run with a local `az` login. The two one-time steps are a federated credential on the shared app registration and the GitHub `production` environment; everything in Azure after that is done by the pipeline.

**Tech Stack:** Azure Container Apps, ACR, Bicep, GitHub Actions (`azure/login@v3` OIDC), `gh` CLI, Docker for the local image check. Next.js 16 standalone built with bun in the existing `Dockerfile`, port 3000.

**Spec:** No separate spec. Requirements: `docs/CONTEXT.md` (Deployment), `infra/README.md`, `CLAUDE.md`, and `/srv/hermes-migration/rootfs/incubator/Partners/MatejBojnansky/Ominus/.github/workflows/deploy.yml` (the pipeline to mirror). The earlier `mike-gordievsky` retarget (`2026-09-25-deploy-mike-gordievsky.md`) is abandoned.

## Verified on 2026-09-29

| Check | Result |
|---|---|
| Ominus production variables | `AZURE_CLIENT_ID=6b7c60ef-1d2e-479a-8b4a-bdc2d3ac54d4`, `AZURE_TENANT_ID=8c4f47c0-d3cc-4c9c-bc45-39bbf0eb18be`, `AZURE_SUBSCRIPTION_ID=42d3345a-2568-48e0-a414-3fc00ee2cba7`, `AZURE_ACR_NAME=acreuhubprod`, `AZURE_CONTAINER_APPS_ENVIRONMENT=cae-euhub-prod`. |
| Ominus deploy history | Succeeded on `main` 2026-09-28 18:46 UTC, so that identity's roles work for this RG and registry. |
| GitHub `production` env on `EUHUB-AI/profile` | Missing (404). |
| Local `az` | Logged in to tenant `8c4f47c0…` as a principal with no role on the EUHub subscription. Not needed for this plan. |
| Dockerfile | Builds with `bun install --frozen-lockfile`; container returns 200/200/404/200 for `/`, `/books`, `/nope`, `/robots.txt` with the noindex header. |
| DNS `mike.euhub.co` | No records yet. |

## Global Constraints

- `CLAUDE.md`: npm only; never commit `pnpm-lock.yaml` or `pnpm-workspace.yaml`; stage by name; branch → PR → merge commit; before done: `npx eslint . && npx tsc --noEmit && npm test && npm run build`. Deploys stay `workflow_dispatch` only. No GCP.
- Names: app `ca-euhub-mike-web`, image repository `mike-profile-web`, RG `rg-euhub-prod-apps`, environment `cae-euhub-prod`, registry `acreuhubprod`, region `germanywestcentral`, ARM deployment `mike-profile-<run_id>`.
- OIDC subject: `repo:EUHUB-AI@248672290/profile@1105616066:environment:production`, on app registration `6b7c60ef-1d2e-479a-8b4a-bdc2d3ac54d4`.
- Five GitHub environment variables, values identical to Ominus's.
- Container: external HTTPS ingress, port 3000, probes `GET /robots.txt`, 0.25 vCPU / 0.5Gi, 1–3 replicas. `SITE_INDEXABLE` off for the first deploy.
- Never modify the sibling apps in `rg-euhub-prod-apps` (`ca-euhub-ominus-web`, `ca-euhub-mte-web`, …).

## Review Focus

1. **OIDC login fails with `AADSTS700213`** (subject mismatch). Expected: one `federated-credential update` fixes it. Task 3 Step 3.
2. **The first revision can't pull its image.** Expected: Healthy revision. The workflow grants AcrPull before (existing app) and after (new app) the apply; Task 3 Step 4 checks health via the run log and the live URL.
3. **A later deploy drops `mike.euhub.co`** because the Bicep PUT overwrites `ingress.customDomains`. Expected: the domain survives. Task 4 Step 4 adds `customDomains` to the template and records the binding in parameters.
4. **Unknown URLs return 500** if `content/` is missing at request time. Expected: 404. Task 2 Step 3 locally, Task 3 Step 5 live.
5. **A push to `main` deploys.** Expected: never. `infra/check-workflow.sh` pins the trigger, and Task 2 Step 6 confirms no run starts after merge.

---

### Task 1: One-time setup (Mike, or the platform owner)

**Files:** none.

**Interfaces:**
- Produces: federated credential `gh-profile-environment-production` on app `6b7c60ef…`; GitHub environment `production` with the five variables.

- [ ] **Step 1: Federated credential on the shared app registration** (needs an owner of that app registration or an Application Administrator; the command is in `infra/README.md` § 1)

Check: `az ad app federated-credential list --id 6b7c60ef-1d2e-479a-8b4a-bdc2d3ac54d4 --query "[].subject" -o tsv`
Expected: includes `repo:EUHUB-AI@248672290/profile@1105616066:environment:production`.

- [ ] **Step 2: GitHub environment and variables** (commands in `infra/README.md` § 2; needs repo admin)

Check: `gh variable list --env production --repo EUHUB-AI/profile`
Expected: the five variables with Ominus's values.

---

### Task 2: Workflow, guardrail, README (done 2026-09-29, PR #3)

**Files:**
- Modify: `.github/workflows/deploy.yml` (from `main`: add `site_indexable` input → `build-args`, `infra/check-workflow.sh` step, pre-deploy AcrPull grant from Ominus, summary line)
- Create: `infra/check-workflow.sh`
- Modify: `infra/README.md` (setup section: reuse the Ominus identity)
- Unchanged: `infra/main.bicep`, `infra/main.parameters.json`, `Dockerfile`

- [x] **Step 1: `infra/check-workflow.sh` RED against `main`'s workflow** → `FAIL: build must pass the SITE_INDEXABLE build arg`
- [x] **Step 2: Workflow rewritten, check GREEN** → `workflow checks passed`; `az bicep build` OK
- [x] **Step 3: Local image** → 200/200/404/200 and `X-Robots-Tag: noindex…`
- [x] **Step 4: README rewritten**
- [ ] **Step 5: Gate** — `infra/check-workflow.sh && npx eslint . && npx tsc --noEmit && npm test && npm run build` → `ALL OK`
- [ ] **Step 6: Merge PR #3 with a merge commit** (after Mike's review), then `gh run list --limit 3` → no new run.

---

### Task 3: First deploy and live verification

- [ ] **Step 1:** `gh workflow run deploy.yml --repo EUHUB-AI/profile --ref main -f site_indexable=false`; capture `RUN_ID` from `gh run list --workflow deploy.yml --limit 1 --json databaseId`.
- [ ] **Step 2:** `gh run watch "$RUN_ID" --repo EUHUB-AI/profile --exit-status` → all three jobs succeed.
- [ ] **Step 3 (Review Focus 1):** on `AADSTS700213`, copy the subject from `gh run view "$RUN_ID" --log-failed`, have the app owner run `az ad app federated-credential update --id 6b7c60ef-1d2e-479a-8b4a-bdc2d3ac54d4 --federated-credential-id gh-profile-environment-production --parameters '{"subject":"<exact>"}'`, then `gh run rerun "$RUN_ID" --failed`. Any other failure: stop and report.
- [ ] **Step 4 (Review Focus 2):** `FQDN` from the run summary (`gh run view "$RUN_ID" --json jobs` or the `production` environment page). `curl -sI https://$FQDN/ | head -1` → `HTTP/2 200`.
- [ ] **Step 5 (Review Focus 4):** status codes for `/ /books /travel /languages /sport /hobbies /robots.txt /sitemap.xml` → 200, `/nope /books/typo` → 404; `curl -sI https://$FQDN/ | grep -i x-robots-tag` → noindex header.

---

### Task 4: Bind `mike.euhub.co` (needs Mike's DNS change and the platform owner's `az`)

**Gate:** two DNS records in `euhub.co` (Google Cloud DNS). Don't pass Step 2 until `dig` shows both.

**Files:** `infra/main.bicep` (add `customDomainName` / `customDomainCertificateName` params and `ingress.customDomains`, as in the abandoned plan's template), `infra/main.parameters.json`.

- [ ] **Step 1:** the app owner runs `az containerapp show -n ca-euhub-mike-web -g rg-euhub-prod-apps --query "{fqdn:properties.configuration.ingress.fqdn,verify:properties.customDomainVerificationId}" -o tsv`; Mike adds `CNAME mike → <fqdn>` and `TXT asuid.mike → <verify>`.
- [ ] **Step 2:** `dig +short CNAME mike.euhub.co; dig +short TXT asuid.mike.euhub.co` → both match.
- [ ] **Step 3:** `az containerapp hostname add … --hostname mike.euhub.co` and `az containerapp hostname bind … --environment <cae-euhub-prod id> --validation-method CNAME` (commands in `infra/README.md` § Custom domain); `curl -s -o /dev/null -w '%{http_code}' https://mike.euhub.co/` → 200.
- [ ] **Step 4 (Review Focus 3):** add the two params and `customDomains` to `main.bicep`, record `mike.euhub.co` and the managed certificate name in `main.parameters.json`; `az bicep build` OK; PR; merge.
- [ ] **Step 5:** redeploy (Task 3 Step 1) and check `az containerapp hostname list` still shows `mike.euhub.co SniEnabled` and `https://mike.euhub.co/` → 200.

---

### Task 5: Update `docs/CONTEXT.md`

- [ ] Deployment section: `site_indexable` input, the shared Ominus identity, the guardrail script, the `az` tenant note, the abandoned `mike-gordievsky` retarget. History: first deploy date. Backlog: drop "Do the Azure setup and first deploy". Temporary sharing: tunnel no longer needed.
- [ ] Gate, PR, merge commit.
