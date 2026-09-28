# Azure Container Apps Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the profile site running as Azure Container App `mike-profile-web` in resource group `mike-gordievsky`, first on its Azure-generated URL and then on `https://mike.euhub.co`, deployed by the manual GitHub Actions workflow.

**Architecture:**
- The app joins the Container Apps environment `personal-brand-analytics-env` and pulls from registry `mikegordievskypersonalbrand`, both already in RG `mike-gordievsky`, through a user-assigned identity created and granted AcrPull before the first deploy. This is the pattern the RG's three existing apps use.
- The workflow stays `workflow_dispatch` only. It logs in with OIDC (app registration `gh-oidc-mike-profile-deploy`, GitHub environment `production`), pushes the image, applies `infra/main.bicep`. It gains one input, `site_indexable`, which becomes the Docker build arg `SITE_INDEXABLE`; it defaults to `false`, so the site stays hidden from crawlers while sample content is live.
- Every one-time setup step is idempotent (check, then create), because the 2026-09-25 plan may have been partly executed on another machine and the Azure side can't be inspected until Task 0.

**Tech Stack:** Azure Container Apps, Azure Container Registry (Basic), Bicep, GitHub Actions (`azure/login@v3` OIDC), `az` CLI 2.90, `gh` CLI, Docker 28 for the local image check. The app is Next.js 16 standalone built with bun in the existing `Dockerfile`, port 3000.

**Spec:** No separate spec. Requirements come from `docs/CONTEXT.md` (Deployment section), `infra/README.md`, `CLAUDE.md`, and the resource inventory verified in `docs/superpowers/plans/2026-09-25-deploy-mike-gordievsky.md`, which this plan supersedes.

## State verified on 2026-09-28 (this machine)

| Check | Result |
|---|---|
| `az` login | Logged into the wrong tenant (subscriptions `LKW-Control-*`). Subscription EUHub `42d3345a-2568-48e0-a414-3fc00ee2cba7` is not visible, so nothing in Azure could be inspected. Task 0 fixes this. |
| `gh` login | `michael-pov-it`, scopes `repo`, `read:org`. Enough for environments, variables and workflow runs. |
| GitHub environment `production` on `EUHUB-AI/profile` | Does not exist (HTTP 404). Task 1 Step 4 of the old plan never ran. |
| `.github/workflows/deploy.yml` | Still targets `rg-euhub-prod-apps` / `acreuhubprod`. Task 2 of the old plan never ran. |
| DNS `mike.euhub.co` | No CNAME yet. `signals.euhub.co` → `personal-brand-analytics.jollymeadow-f8c88678.westeurope.azurecontainerapps.io.`, which confirms the environment's default domain. |
| Local tooling | Docker 28.5.1, Node 20, python3 with PyYAML, `az` 2.90.0. |

## Global Constraints

**Git and PRs** (`CLAUDE.md`)
- npm only. Never commit `pnpm-lock.yaml` or `pnpm-workspace.yaml`. Stage files by name, never `git add -A` or `git add .`.
- Branch → PR → merge commit. Before calling any code task done: `npx eslint . && npx tsc --noEmit && npm test && npm run build`.
- Deploys stay `workflow_dispatch` only. No push trigger. No GCP.

**Azure**
- Subscription EUHub `42d3345a-2568-48e0-a414-3fc00ee2cba7`. Resource group `mike-gordievsky`, location `westeurope`.
- Existing, do not modify: environment `personal-brand-analytics-env`, registry `mikegordievskypersonalbrand`, apps `personal-brand-analytics`, `linkedin-telegram-worker`, `linkedin-publication-collector`, and their identities, certificates, storage and VM.
- Names: Container App `mike-profile-web`, image repository `mike-profile-web`, pull identity `mike-profile-web-identity`, app registration `gh-oidc-mike-profile-deploy`, ARM deployment `mike-profile-<run_id>`.
- Pipeline identity roles: exactly Contributor on RG `mike-gordievsky` and AcrPush on the registry. The pipeline performs no role assignments.
- OIDC subject: `repo:EUHUB-AI@248672290/profile@1105616066:environment:production`.
- GitHub environment variables: only `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.

**Container**
- External HTTPS ingress, target port 3000, probes `GET /robots.txt`, 0.25 vCPU / 0.5Gi, minReplicas 1, maxReplicas 3.
- `SITE_INDEXABLE` is a build-time flag. The first deploy keeps it `false` (sample content is still live).

**Authorization**
- Approving this plan authorizes the `az` and `gh` commands in it: creating the identity, app registration, federated credential, role assignments, GitHub environment, variables and workflow runs. It does not authorize DNS changes (Task 4 Step 1 hands those to Mike) and it does not authorize logging in to Azure on Mike's behalf (Task 0 is Mike's).

## Review Focus

1. **The first revision can't pull its image** because AcrPull isn't in place when the app is created. Expected: the first revision is Healthy. Task 1 Step 2 grants AcrPull before any deploy; Task 3 Step 4 checks revision health.
2. **OIDC login fails with `AADSTS700213`** (subject mismatch). Expected: one `federated-credential update` to the subject in the run log fixes it. Task 3 Step 3.
3. **A later deploy drops `mike.euhub.co`** because a Bicep PUT overwrites `ingress.customDomains`. Expected: the domain survives redeploys. Task 4 Steps 4 and 6.
4. **Unknown URLs return 500** if `content/` is missing at request time. Expected: `/nope` returns 404 in the container. Task 2 Step 5 checks it locally, Task 3 Step 5 live.
5. **The image built by CI differs from the one checked locally** (different bun or Node version, or a build arg not passed). Expected: the CI image serves the same pages with the same `X-Robots-Tag`. Task 2 Step 5 pins the local baseline; Task 3 Step 5 compares live. The Dockerfile itself was verified on 2026-09-28: `docker build` succeeds with `bun install --frozen-lockfile` against `package-lock.json`, and the container returns 200/200/404/200 for `/`, `/books`, `/nope`, `/robots.txt`.

---

### Task 0: Log this machine in to the EUHub subscription (Mike, interactive)

**Files:** none.

**Interfaces:**
- Produces: an `az` session whose default subscription is `42d3345a-2568-48e0-a414-3fc00ee2cba7`. Every later `az` command assumes it.

- [ ] **Step 1: Log in**

Mike runs this in the Claude session (the `!` prefix) or a terminal:

```bash
az login --use-device-code
```

Pick the account that has Owner on EUHub. If the account belongs to several tenants, the prompt lists them; choose the EUHub one.

- [ ] **Step 2: Select the subscription and verify access**

```bash
az account set --subscription 42d3345a-2568-48e0-a414-3fc00ee2cba7
az account show --query "{name:name,user:user.name}" -o tsv
az group show -n mike-gordievsky --query location -o tsv
```

Expected: the subscription name is `EUHub`, and the last line is `westeurope`. If `az account set` says the subscription doesn't exist, the logged-in account has no access to it; stop and tell Mike which account is active.

---

### Task 1: One-time Azure and GitHub setup (idempotent)

Each step checks first, because the 2026-09-25 plan may have run partly on another machine.

**Files:** none.

**Interfaces:**
- Produces:
  - identity `mike-profile-web-identity` with AcrPull on `mikegordievskypersonalbrand`
  - app registration `gh-oidc-mike-profile-deploy` with federated credential `gh-environment-production`, Contributor on the RG, AcrPush on the registry; its appId is `AZURE_CLIENT_ID`
  - GitHub environment `production` with the three variables

- [ ] **Step 1: Confirm the target and record what already exists**

```bash
az containerapp env show -g mike-gordievsky -n personal-brand-analytics-env --query properties.provisioningState -o tsv
az acr show -n mikegordievskypersonalbrand --query "{rg:resourceGroup,sku:sku.name}" -o tsv
az containerapp show -g mike-gordievsky -n mike-profile-web --query name -o tsv 2>&1 | tail -1
az identity show -g mike-gordievsky -n mike-profile-web-identity --query clientId -o tsv 2>&1 | tail -1
az ad app list --display-name gh-oidc-mike-profile-deploy --query "[].appId" -o tsv
```

Expected: `Succeeded`, `mike-gordievsky	Basic`, then "not found" for the app. The identity and app registration lines print either a GUID (exists, skip creation below) or an error (create). If `mike-profile-web` already exists, stop and ask Mike.

- [ ] **Step 2: Create the pull identity if missing, and grant AcrPull**

```bash
az identity show -g mike-gordievsky -n mike-profile-web-identity -o none 2>/dev/null || \
  az identity create -g mike-gordievsky -n mike-profile-web-identity -l westeurope \
    --tags app=mike-profile managed_by=github-actions -o none
PULL_PRINCIPAL=$(az identity show -g mike-gordievsky -n mike-profile-web-identity --query principalId -o tsv)
ACR_ID=$(az acr show -n mikegordievskypersonalbrand --query id -o tsv)
az role assignment create --assignee-object-id "$PULL_PRINCIPAL" --assignee-principal-type ServicePrincipal \
  --role AcrPull --scope "$ACR_ID" -o none
az role assignment list --assignee "$PULL_PRINCIPAL" --scope "$ACR_ID" --query "[].roleDefinitionName" -o tsv
```

Expected: last line `AcrPull`. `role assignment create` is idempotent. If it fails with `PrincipalNotFound`, wait 30 seconds and rerun that line only.

- [ ] **Step 3: Create the OIDC app registration if missing, its federated credential and roles**

```bash
APP_ID=$(az ad app list --display-name gh-oidc-mike-profile-deploy --query "[0].appId" -o tsv)
[ -n "$APP_ID" ] || APP_ID=$(az ad app create --display-name gh-oidc-mike-profile-deploy --query appId -o tsv)
az ad sp show --id "$APP_ID" -o none 2>/dev/null || az ad sp create --id "$APP_ID" -o none
TENANT_ID=$(az account show --query tenantId -o tsv)
az ad app federated-credential list --id "$APP_ID" --query "[?name=='gh-environment-production'].subject" -o tsv | grep -q . || \
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "gh-environment-production",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:EUHUB-AI@248672290/profile@1105616066:environment:production",
  "audiences": ["api://AzureADTokenExchange"]
}' -o none
SP_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv)
RG_ID=$(az group show -n mike-gordievsky --query id -o tsv)
ACR_ID=$(az acr show -n mikegordievskypersonalbrand --query id -o tsv)
az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal \
  --role Contributor --scope "$RG_ID" -o none
az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal \
  --role AcrPush --scope "$ACR_ID" -o none
echo "APP_ID=$APP_ID TENANT_ID=$TENANT_ID"
az role assignment list --assignee "$SP_ID" --all --query "[].roleDefinitionName" -o tsv | sort -u
```

Expected: the echo prints two GUIDs; the role list is exactly `AcrPush` and `Contributor`. Anything more (for example a leftover Contributor on `rg-euhub-prod-apps`) is reported to Mike, not removed.

- [ ] **Step 4: Create the GitHub environment and its three variables**

```bash
gh api -X PUT repos/EUHUB-AI/profile/environments/production > /dev/null
gh variable set AZURE_CLIENT_ID --env production --repo EUHUB-AI/profile --body "$APP_ID"
gh variable set AZURE_TENANT_ID --env production --repo EUHUB-AI/profile --body "$TENANT_ID"
gh variable set AZURE_SUBSCRIPTION_ID --env production --repo EUHUB-AI/profile --body 42d3345a-2568-48e0-a414-3fc00ee2cba7
gh variable list --env production --repo EUHUB-AI/profile
```

Expected: three variables, `AZURE_CLIENT_ID` equal to `$APP_ID`. In a fresh shell, recover `APP_ID` with `az ad app list --display-name gh-oidc-mike-profile-deploy --query "[0].appId" -o tsv`.

---

### Task 2: Retarget infra and the workflow to `mike-gordievsky`

**Files:**
- Rewrite: `.github/workflows/deploy.yml`, `infra/main.bicep`, `infra/main.parameters.json`, `infra/README.md`
- Create: `infra/check-workflow.sh` (static guardrails, run locally and in the `build-and-test` job)

**Interfaces:**
- Consumes: Task 1's identity and app registration names.
- Produces:
  - Bicep params: `imageTag` (required), `customDomainName` and `customDomainCertificateName` (default `''`).
  - Bicep outputs: `fqdn`, `url`, `deployedImage`, `customDomainVerificationId`.
  - Workflow input `site_indexable` (boolean, default `false`) → Docker `build-args: SITE_INDEXABLE=<value>`.
  - Workflow `env`: `AZURE_RESOURCE_GROUP`, `ACR_NAME`, `IMAGE_REPOSITORY`.

- [ ] **Step 1: Branch, and write the failing workflow check**

```bash
git switch main && git pull --ff-only origin main && git switch -c deploy/azure-container-apps
```

Create `infra/check-workflow.sh`:

```bash
#!/usr/bin/env bash
# Static guardrails for the deploy workflow: manual-only trigger, RG mike-gordievsky,
# no leftovers from the old rg-euhub-prod-apps setup, no role assignments in the pipeline.
set -euo pipefail
wf=".github/workflows/deploy.yml"
fail() { echo "FAIL: $1"; exit 1; }

python3 - "$wf" <<'PY' || fail "triggers must be exactly workflow_dispatch"
import sys, yaml
doc = yaml.safe_load(open(sys.argv[1]))
triggers = doc.get(True, doc.get("on"))
sys.exit(0 if list(triggers) == ["workflow_dispatch"] else 1)
PY

grep -q "AZURE_RESOURCE_GROUP: mike-gordievsky" "$wf" || fail "resource group must be mike-gordievsky"
grep -q "ACR_NAME: mikegordievskypersonalbrand" "$wf" || fail "registry must be mikegordievskypersonalbrand"
grep -q "SITE_INDEXABLE=" "$wf" || fail "build must pass the SITE_INDEXABLE build arg"
! grep -qE "rg-euhub-prod|acreuhubprod|cae-euhub-prod|AZURE_ACR_NAME|AZURE_CONTAINER_APPS_ENVIRONMENT|role assignment" "$wf" \
  || fail "old rg-euhub-prod setup or role-assignment step still referenced"
grep -q "infra/main.bicep" "$wf" || fail "workflow must deploy infra/main.bicep"
echo "workflow checks passed"
```

Run: `chmod +x infra/check-workflow.sh && infra/check-workflow.sh`
Expected: `FAIL: resource group must be mike-gordievsky`.

- [ ] **Step 2: Rewrite `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Azure Container Apps

# Manual only: Actions → Deploy to Azure Container Apps → Run workflow.
on:
  workflow_dispatch:
    inputs:
      site_indexable:
        description: "Let search engines and AI crawlers index the site (SITE_INDEXABLE build arg)"
        type: boolean
        default: false

# id-token: write lets azure/login exchange GitHub's OIDC token for an Azure one;
# no client secret is stored anywhere.
permissions:
  id-token: write
  contents: read

env:
  AZURE_RESOURCE_GROUP: mike-gordievsky
  ACR_NAME: mikegordievskypersonalbrand
  IMAGE_REPOSITORY: mike-profile-web

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: infra/check-workflow.sh

  build-and-push-image:
    needs: build-and-test
    runs-on: ubuntu-latest
    # Same "production" environment as deploy, so one federated credential covers both jobs.
    environment: production
    outputs:
      image_tag: ${{ steps.vars.outputs.image_tag }}
    steps:
      - uses: actions/checkout@v7

      - id: vars
        run: echo "image_tag=$(git rev-parse --short=12 HEAD)" >> "$GITHUB_OUTPUT"

      - uses: azure/login@v3
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - run: az acr login --name ${{ env.ACR_NAME }}

      - uses: docker/setup-buildx-action@v4

      - uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          build-args: |
            SITE_INDEXABLE=${{ inputs.site_indexable }}
          tags: |
            ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_REPOSITORY }}:${{ steps.vars.outputs.image_tag }}
            ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_REPOSITORY }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push-image
    runs-on: ubuntu-latest
    environment:
      name: production
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v7

      - uses: azure/login@v3
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - id: deploy
        run: |
          set -euo pipefail
          # Unique --name per run: a cancelled run's ARM deployment can keep running
          # server-side and would block the next one under a shared name.
          result=$(az deployment group create \
            --name "mike-profile-${{ github.run_id }}" \
            --resource-group "${{ env.AZURE_RESOURCE_GROUP }}" \
            --template-file infra/main.bicep \
            --parameters infra/main.parameters.json \
            --parameters \
              acrName="${{ env.ACR_NAME }}" \
              imageRepository="${{ env.IMAGE_REPOSITORY }}" \
              imageTag="${{ needs.build-and-push-image.outputs.image_tag }}" \
            --query properties.outputs \
            --output json)
          echo "fqdn=https://$(echo "$result" | jq -r .fqdn.value)" >> "$GITHUB_OUTPUT"
          echo "url=$(echo "$result" | jq -r .url.value)" >> "$GITHUB_OUTPUT"

      - run: |
          {
            echo "Deployed → ${{ steps.deploy.outputs.url }}"
            echo ""
            echo "Azure URL: ${{ steps.deploy.outputs.fqdn }}"
            echo "Indexable: ${{ inputs.site_indexable }}"
          } >> "$GITHUB_STEP_SUMMARY"
```

Run: `infra/check-workflow.sh`
Expected: `workflow checks passed`.

- [ ] **Step 3: Rewrite `infra/main.bicep` and `infra/main.parameters.json`**

`infra/main.bicep`:

```bicep
// The mike-g profile Container App, joining the Container Apps environment and registry
// that already live in resource group mike-gordievsky (shared with the personal-brand apps).
// The pull identity and its AcrPull grant are created once by hand (see infra/README.md),
// so the very first revision can pull its image. Deploy with:
//
//   az deployment group create -g mike-gordievsky \
//     --template-file infra/main.bicep --parameters infra/main.parameters.json \
//     --parameters imageTag=<git-sha>

@description('Region of the existing Container Apps environment.')
param location string = 'westeurope'

param containerAppName string = 'mike-profile-web'

@description('Existing Container Apps environment in this resource group.')
param containerAppsEnvironmentName string = 'personal-brand-analytics-env'

@description('Existing registry in this resource group.')
param acrName string = 'mikegordievskypersonalbrand'

@description('Existing user-assigned identity that holds AcrPull on the registry.')
param pullIdentityName string = 'mike-profile-web-identity'

param imageRepository string = 'mike-profile-web'

@description('Image tag to deploy; the workflow passes the short git SHA.')
param imageTag string

@description('Custom hostname already bound to this app, e.g. mike.euhub.co. Empty until bound.')
param customDomainName string = ''

@description('Name of the environment managed certificate for customDomainName. Empty until bound.')
param customDomainCertificateName string = ''

@minValue(0)
@maxValue(5)
param minReplicas int = 1

@minValue(1)
@maxValue(10)
param maxReplicas int = 3

param cpu string = '0.25'
param memory string = '0.5Gi'

param tags object = {
  app: 'mike-profile'
  managed_by: 'github-actions'
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: containerAppsEnvironmentName
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: pullIdentityName
}

var customDomains = empty(customDomainName) ? [] : [
  {
    name: customDomainName
    certificateId: '${containerAppsEnvironment.id}/managedCertificates/${customDomainCertificateName}'
    bindingType: 'SniEnabled'
  }
]

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        allowInsecure: false
        customDomains: customDomains
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: pullIdentity.id
        }
      ]
    }
    template: {
      revisionSuffix: take(imageTag, 10)
      containers: [
        {
          name: 'mike-profile-web'
          image: '${acr.properties.loginServer}/${imageRepository}:${imageTag}'
          env: [
            { name: 'NEXT_TELEMETRY_DISABLED', value: '1' }
          ]
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/robots.txt', port: 3000 }
              initialDelaySeconds: 5
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: { path: '/robots.txt', port: 3000 }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
}

@description('Azure-generated hostname, e.g. mike-profile-web.jollymeadow-f8c88678.westeurope.azurecontainerapps.io.')
output fqdn string = containerApp.properties.configuration.ingress.fqdn

@description('Public URL: the custom domain once bound, otherwise the Azure-generated one.')
output url string = empty(customDomainName) ? 'https://${containerApp.properties.configuration.ingress.fqdn}' : 'https://${customDomainName}'

output deployedImage string = '${acr.properties.loginServer}/${imageRepository}:${imageTag}'

@description('Value for the asuid TXT record when binding a custom domain.')
output customDomainVerificationId string = containerApp.properties.customDomainVerificationId
```

`infra/main.parameters.json`:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "containerAppName": { "value": "mike-profile-web" },
    "containerAppsEnvironmentName": { "value": "personal-brand-analytics-env" },
    "pullIdentityName": { "value": "mike-profile-web-identity" },
    "customDomainName": { "value": "" },
    "customDomainCertificateName": { "value": "" }
  }
}
```

Run: `az bicep build --file infra/main.bicep --stdout > /dev/null && echo "bicep OK"`
Expected: `bicep OK`, no warnings. If `az bicep` is missing, `az bicep install` first.

- [ ] **Step 4: Preview against the real resource group (Review Focus 5 of the old plan: no neighbour touched)**

```bash
az deployment group what-if -g mike-gordievsky \
  --template-file infra/main.bicep --parameters infra/main.parameters.json \
  --parameters imageTag=whatif000000 --result-format ResourceIdOnly
```

Expected: exactly one `+ Create` for `.../Microsoft.App/containerApps/mike-profile-web`; no `~ Modify` or `- Delete`. Anything else: stop and ask Mike.

- [ ] **Step 5: Build and smoke-test the image locally (Review Focus 4 and 5)**

```bash
docker build -t mike-profile-web:local .
docker run -d --rm --name mike-profile-local -p 3100:3000 mike-profile-web:local
sleep 3
for p in / /books /nope /robots.txt; do printf "%-12s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3100$p)"; done
curl -sI http://127.0.0.1:3100/ | grep -i x-robots-tag
docker stop mike-profile-local
```

Expected: `200 200 404 200`, and the header `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai` (hidden by default). Verified on 2026-09-28 with the unchanged Dockerfile, so a failure here means a regression since then.

- [ ] **Step 6: Rewrite `infra/README.md`**

Replace its contents with:

````md
# Deploying the profile to Azure Container Apps

The site runs as Container App **`mike-profile-web`** in resource group **`mike-gordievsky`** (westeurope, subscription EUHub). It shares that group's existing Container Apps environment (`personal-brand-analytics-env`) and registry (`mikegordievskypersonalbrand`) with the personal-brand apps, and doesn't touch them.

Deploys are **manual**: GitHub → Actions → **Deploy to Azure Container Apps** → **Run workflow**, or `gh workflow run deploy.yml --ref main`. The run summary and the repo's **production** environment show the live URL. Pushing to `main` deploys nothing.

The workflow has one input, **`site_indexable`** (default off). Leave it off while sample content is live: the site then sends `noindex` headers and an empty sitemap. Turn it on for a deploy once the content is real.

## Pieces

- `Dockerfile`: bun build of the Next.js standalone server on port 3000. It includes `content/`, which request-time 404 pages read.
- `infra/main.bicep`: the Container App: external HTTPS ingress, probes on `/robots.txt`, 0.25 vCPU / 0.5Gi, 1–3 replicas. Its image pull uses the user-assigned identity `mike-profile-web-identity`.
- `.github/workflows/deploy.yml`: lint, types, tests and `infra/check-workflow.sh` → push the image to ACR → apply the Bicep template.
- `infra/check-workflow.sh`: static guardrails for the workflow (manual trigger only, correct targets, no role assignments).

## One-time setup (done 2026-09-28)

Everything below already exists. Keep it for rebuilding from scratch. Run with an account that has Owner on EUHub.

```bash
az account set --subscription 42d3345a-2568-48e0-a414-3fc00ee2cba7

az identity create -g mike-gordievsky -n mike-profile-web-identity -l westeurope
az role assignment create --assignee-object-id "$(az identity show -g mike-gordievsky -n mike-profile-web-identity --query principalId -o tsv)" \
  --assignee-principal-type ServicePrincipal --role AcrPull --scope "$(az acr show -n mikegordievskypersonalbrand --query id -o tsv)"

APP_ID=$(az ad app create --display-name gh-oidc-mike-profile-deploy --query appId -o tsv); az ad sp create --id "$APP_ID"
az ad app federated-credential create --id "$APP_ID" --parameters '{"name":"gh-environment-production","issuer":"https://token.actions.githubusercontent.com","subject":"repo:EUHUB-AI@248672290/profile@1105616066:environment:production","audiences":["api://AzureADTokenExchange"]}'
SP_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv)
az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal --role Contributor --scope "$(az group show -n mike-gordievsky --query id -o tsv)"
az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal --role AcrPush --scope "$(az acr show -n mikegordievskypersonalbrand --query id -o tsv)"

gh api -X PUT repos/EUHUB-AI/profile/environments/production
gh variable set AZURE_CLIENT_ID --env production --repo EUHUB-AI/profile --body "$APP_ID"
gh variable set AZURE_TENANT_ID --env production --repo EUHUB-AI/profile --body "$(az account show --query tenantId -o tsv)"
gh variable set AZURE_SUBSCRIPTION_ID --env production --repo EUHUB-AI/profile --body 42d3345a-2568-48e0-a414-3fc00ee2cba7
```

If `azure/login` fails with `AADSTS700213`, copy the exact subject from the failed run's log and run `az ad app federated-credential update --id "$APP_ID" --federated-credential-id gh-environment-production --parameters '{"subject":"<exact subject>"}'`.

## Custom domain

`mike.euhub.co` is bound with a managed certificate and recorded in `infra/main.parameters.json` (`customDomainName`, `customDomainCertificateName`). Keep those two values: without them the next deploy removes the domain from the app. DNS for `euhub.co` is on Google Cloud DNS, edited by hand:

- `CNAME mike` → the app's Azure hostname
- `TXT asuid.mike` → the app's `customDomainVerificationId`
````

- [ ] **Step 7: Full local verification**

Run: `infra/check-workflow.sh && az bicep build --file infra/main.bicep --stdout > /dev/null && npx eslint . && npx tsc --noEmit && npm test && npm run build && echo ALL OK`
Expected: `workflow checks passed` … `ALL OK`.

- [ ] **Step 8: Commit, PR, merge with a merge commit**

```bash
git add .github/workflows/deploy.yml infra/main.bicep infra/main.parameters.json infra/README.md infra/check-workflow.sh docs/superpowers/plans/2026-09-28-azure-container-apps-deploy.md
git status --short   # must not list pnpm-lock.yaml or pnpm-workspace.yaml
git commit -m "ci: deploy the profile to Container Apps in RG mike-gordievsky"
git push -u origin deploy/azure-container-apps
gh pr create --base main --title "Deploy profile to Container Apps in RG mike-gordievsky" \
  --body "Retargets the manual Azure deploy from rg-euhub-prod-apps to RG mike-gordievsky: joins personal-brand-analytics-env, pulls from mikegordievskypersonalbrand with a pre-created user-assigned identity, adds a site_indexable input and a static workflow check. what-if shows a single create (mike-profile-web) and nothing else."
gh pr merge --merge
git switch main && git pull --ff-only origin main
gh run list --repo EUHUB-AI/profile --limit 3
```

Expected: PR merged, and no new workflow run (manual only). The Dockerfile is not part of this change.

---

### Task 3: First deploy and live verification

**Files:** none.

**Interfaces:**
- Consumes: the merged workflow (Task 2), the setup (Task 1).
- Produces: running `mike-profile-web` at `https://mike-profile-web.jollymeadow-f8c88678.westeurope.azurecontainerapps.io` (confirm from the deployment output).

- [ ] **Step 1: Trigger the workflow (indexing off)**

```bash
gh workflow run deploy.yml --repo EUHUB-AI/profile --ref main -f site_indexable=false
sleep 5
RUN_ID=$(gh run list --repo EUHUB-AI/profile --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')
echo "$RUN_ID"
```

- [ ] **Step 2: Watch it to completion**

Run: `gh run watch "$RUN_ID" --repo EUHUB-AI/profile --exit-status`
Expected: `build-and-test`, `build-and-push-image` and `deploy` all succeed.

- [ ] **Step 3: If it failed, recover (Review Focus 2)**

Run: `gh run view "$RUN_ID" --repo EUHUB-AI/profile --log-failed | tail -40`

If `azure/login` failed with `AADSTS700213`: copy the subject from the log, then

```bash
APP_ID=$(az ad app list --display-name gh-oidc-mike-profile-deploy --query "[0].appId" -o tsv)
az ad app federated-credential update --id "$APP_ID" --federated-credential-id gh-environment-production \
  --parameters '{"subject":"<exact subject from the log>"}'
gh run rerun "$RUN_ID" --repo EUHUB-AI/profile --failed
```

and repeat Step 2. For any other failure, stop and report the log excerpt to Mike. Don't improvise role changes.

- [ ] **Step 4: Check the revision is healthy (Review Focus 1)**

```bash
az containerapp revision list -n mike-profile-web -g mike-gordievsky \
  --query "[].{name:name,active:properties.active,health:properties.healthState,running:properties.runningState}" -o table
FQDN=$(az containerapp show -n mike-profile-web -g mike-gordievsky --query properties.configuration.ingress.fqdn -o tsv)
echo "https://$FQDN"
```

Expected: one active revision, `Healthy`, `Running` (or `RunningAtMaxScale`).

- [ ] **Step 5: Smoke-test the live site (Review Focus 4)**

```bash
for p in / /books /travel /languages /sport /hobbies /robots.txt /sitemap.xml /nope /books/typo; do
  printf "%-14s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "https://$FQDN$p")"
done
curl -sI "https://$FQDN/" | grep -i x-robots-tag
```

Expected: `200` for every page, robots.txt and sitemap.xml; `404` for `/nope` and `/books/typo`; an `X-Robots-Tag: noindex, nofollow…` header (indexing off).

- [ ] **Step 6: Confirm the neighbours are untouched**

Run: `az containerapp list -g mike-gordievsky --query "[].{name:name,state:properties.runningStatus,image:properties.template.containers[0].image}" -o table`
Expected: `personal-brand-analytics`, `linkedin-telegram-worker` and `linkedin-publication-collector` keep the images they had; `mike-profile-web` is added.

---

### Task 4: Bind `mike.euhub.co` (needs Mike's DNS change)

**Gate:** Steps 2 and 3 need two DNS records in the `euhub.co` zone on Google Cloud DNS. Don't continue past Step 2 until `dig` shows both.

**Files:**
- Modify: `infra/main.parameters.json` (`customDomainName`, `customDomainCertificateName`)

**Interfaces:**
- Consumes: the running app (Task 3).
- Produces: `https://mike.euhub.co` with a managed certificate, recorded in parameters.

- [ ] **Step 1: Get the two DNS values for Mike**

```bash
FQDN=$(az containerapp show -n mike-profile-web -g mike-gordievsky --query properties.configuration.ingress.fqdn -o tsv)
VERIFY=$(az containerapp show -n mike-profile-web -g mike-gordievsky --query properties.customDomainVerificationId -o tsv)
printf 'CNAME  mike        -> %s\nTXT    asuid.mike  -> %s\n' "$FQDN" "$VERIFY"
```

Hand Mike exactly these two records. `signals.euhub.co` already follows the same pattern.

- [ ] **Step 2: Wait for DNS**

Run: `dig +short CNAME mike.euhub.co; dig +short TXT asuid.mike.euhub.co`
Expected: the CNAME equals `$FQDN.` and the TXT equals `"$VERIFY"`. Re-check until both match.

- [ ] **Step 3: Add the hostname and bind a managed certificate**

```bash
az containerapp hostname add -n mike-profile-web -g mike-gordievsky --hostname mike.euhub.co
az containerapp hostname bind -n mike-profile-web -g mike-gordievsky --hostname mike.euhub.co \
  --environment personal-brand-analytics-env --validation-method CNAME
CERT_NAME=$(az containerapp env certificate list -g mike-gordievsky -n personal-brand-analytics-env \
  --managed-certificates-only --query "[?properties.subjectName=='mike.euhub.co'].name | [0]" -o tsv)
echo "$CERT_NAME"
curl -s -o /dev/null -w '%{http_code}\n' https://mike.euhub.co/
```

Expected: `CERT_NAME` non-empty; curl prints `200`. If curl reports a TLS error, wait 2 minutes and retry; issuance can take a few minutes.

- [ ] **Step 4: Record the binding in parameters (Review Focus 3)**

In `infra/main.parameters.json` set `customDomainName` to `mike.euhub.co` and `customDomainCertificateName` to the literal `$CERT_NAME` from Step 3.

Run: `az deployment group what-if -g mike-gordievsky --template-file infra/main.bicep --parameters infra/main.parameters.json --parameters imageTag=whatif000000 --result-format FullResourcePayloads | grep -n customDomains -A6 | head -20`
Expected: `mike.euhub.co` with a `certificateId` ending in `/managedCertificates/$CERT_NAME`, and no removal.

- [ ] **Step 5: Commit through a PR**

```bash
git switch -c deploy/mike-euhub-co-domain
git add infra/main.parameters.json
git commit -m "infra: keep mike.euhub.co bound across deploys"
git push -u origin deploy/mike-euhub-co-domain
gh pr create --base main --title "Keep mike.euhub.co bound across deploys" \
  --body "Records the mike.euhub.co binding and its managed certificate in main.parameters.json so the Bicep deploy no longer drops the custom domain."
gh pr merge --merge
git switch main && git pull --ff-only origin main
```

- [ ] **Step 6: Redeploy and prove the domain survives**

```bash
gh workflow run deploy.yml --repo EUHUB-AI/profile --ref main -f site_indexable=false
sleep 5
RUN_ID=$(gh run list --repo EUHUB-AI/profile --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --repo EUHUB-AI/profile --exit-status
az containerapp hostname list -n mike-profile-web -g mike-gordievsky --query "[].{name:name,binding:bindingType}" -o table
for p in / /books /nope /sitemap.xml; do printf "%-14s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://mike.euhub.co$p)"; done
```

Expected: run succeeds; hostname list still shows `mike.euhub.co  SniEnabled`; codes `200 200 404 200`; run summary says `Deployed → https://mike.euhub.co`.

---

### Task 5: Update the project context

**Files:**
- Modify: `docs/CONTEXT.md` (Deployment section, History, Open items)
- Modify: `docs/superpowers/plans/2026-09-25-deploy-mike-gordievsky.md` (add a superseded note at the top)

- [ ] **Step 1: Replace the Deployment section of `docs/CONTEXT.md`**

Replace everything from `## Deployment` up to (not including) `## How Mike works` with:

```md
## Deployment

- **Where:** Container App `mike-profile-web` in resource group **`mike-gordievsky`** (westeurope, subscription EUHub `42d3345a-2568-48e0-a414-3fc00ee2cba7`). It shares that group's existing Container Apps environment `personal-brand-analytics-env` and registry `mikegordievskypersonalbrand` with the personal-brand apps (`personal-brand-analytics`, `linkedin-telegram-worker`, `linkedin-publication-collector`). **Never touch those.**
- **URLs:** `https://mike.euhub.co` (managed certificate), plus the Azure URL `https://mike-profile-web.jollymeadow-f8c88678.westeurope.azurecontainerapps.io`.
- **Deploy:** manual only. Actions → **Deploy to Azure Container Apps** → **Run workflow**, or `gh workflow run deploy.yml --ref main -f site_indexable=false`. Pushing to `main` deploys nothing.
- **Indexing:** the workflow input `site_indexable` (default off) sets the `SITE_INDEXABLE` build arg. Keep it off until the sample content is replaced.
- **Pipeline:** lint, types, tests, `infra/check-workflow.sh` → push to ACR → `infra/main.bicep`.
- **Identities:** GitHub side is app registration `gh-oidc-mike-profile-deploy` (OIDC, environment `production`) with Contributor on the RG and AcrPush on the registry. The image pull uses user-assigned identity `mike-profile-web-identity` (AcrPull).
- **Custom domain:** `mike.euhub.co` must stay recorded in `infra/main.parameters.json`, or the next deploy removes it. DNS for `euhub.co` is on Google Cloud DNS, edited by hand.
- **Local `az`:** this machine's default `az` login is another tenant (LKW-Control). Run `az account set --subscription 42d3345a-2568-48e0-a414-3fc00ee2cba7` after `az login` before touching this app.
- **Superseded:** the `rg-euhub-prod-apps` / `cae-euhub-prod` target (2026-09-24) was never deployed.
```

In `## History`, append:

```md
6. **2026-09-28: first deploy.** Deployed to RG `mike-gordievsky` as `mike-profile-web` and bound `mike.euhub.co`. Live with sample content still tagged `sample`, and hidden from crawlers.
```

In `## Open items / backlog`, delete the line starting `- **Do the Azure setup and first deploy**`. Update the `Last updated` date at the top to 2026-09-28. In the Temporary sharing bullet, note the Cloudflare tunnel is no longer needed.

- [ ] **Step 2: Mark the old plan superseded**

Insert as line 2 of `docs/superpowers/plans/2026-09-25-deploy-mike-gordievsky.md`:

```md
> Superseded on 2026-09-28 by `2026-09-28-azure-container-apps-deploy.md`, which was executed.
```

- [ ] **Step 3: Verify and commit through a PR**

```bash
npx eslint . && npx tsc --noEmit && npm test && npm run build
git switch -c docs/deploy-context
git add docs/CONTEXT.md docs/superpowers/plans/2026-09-25-deploy-mike-gordievsky.md
git commit -m "docs: record the mike-gordievsky deployment in project context"
git push -u origin docs/deploy-context
gh pr create --base main --title "Record the mike-gordievsky deployment in project context" --body "Updates docs/CONTEXT.md with the live deployment, identities, URLs, the site_indexable input and the domain guardrail."
gh pr merge --merge
git switch main && git pull --ff-only origin main
```

Expected: all checks pass, PR merged, no workflow run starts.
