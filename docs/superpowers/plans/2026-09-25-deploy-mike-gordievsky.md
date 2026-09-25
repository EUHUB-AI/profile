# Deploy to RG mike-gordievsky Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the profile site as an Azure Container App in resource group `mike-gordievsky`, reachable first on its Azure-generated `*.azurecontainerapps.io` URL and then on `https://mike.euhub.co`.

**Architecture:**
- The app, `mike-profile-web`, joins the Container Apps environment `personal-brand-analytics-env` that already exists in this resource group. It pulls images from the resource group's registry `mikegordievskypersonalbrand` through its own user-assigned identity, the same pattern the RG's other three apps use.
- The GitHub Actions workflow stays manual (`workflow_dispatch`). It logs in with OIDC through a new app registration scoped to this resource group, pushes the image, and applies `infra/main.bicep`.
- The pull identity is created, and granted AcrPull, before the first deploy, so the very first revision can pull its image.

**Tech Stack:** Azure Container Apps, Azure Container Registry (Basic), Bicep, GitHub Actions (OIDC via `azure/login@v3`), `az` CLI 2.x with Bicep 0.47, `gh` CLI; the app is Next.js 16 standalone in the existing `Dockerfile` (port 3000).

**Spec:** No separate spec. The request is "use RG mike-gordievsky to deploy this personal site as a container app". Current state: `docs/CONTEXT.md` (Deployment section), `infra/README.md`, `.github/workflows/deploy.yml`, `infra/main.bicep`.

## Existing Azure resources (verified 2026-09-25, subscription EUHub `42d3345a-2568-48e0-a414-3fc00ee2cba7`)

| Resource | Name | Notes |
|---|---|---|
| Resource group | `mike-gordievsky` | westeurope. Tags `managed_by: mike`, `manual: true`. |
| Container Apps environment | `personal-brand-analytics-env` | West Europe, Consumption plan. Default domain `jollymeadow-f8c88678.westeurope.azurecontainerapps.io`. Already serves `signals.euhub.co` with a managed certificate. |
| Container registry | `mikegordievskypersonalbrand` | Basic SKU, admin user disabled. Login server `mikegordievskypersonalbrand.azurecr.io`. |
| Apps already in the RG | `personal-brand-analytics`, `linkedin-telegram-worker`, `linkedin-publication-collector` | Each has its own user-assigned identity with AcrPull. **Don't touch them.** |
| DNS for `euhub.co` | Google Cloud DNS (`ns-cloud-c*.googledomains.com`) | Not in Azure. Mike adds records by hand. |

## Global Constraints

**Git and PRs**
- Follow `CLAUDE.md`: npm only, stage files by name (never `git add -A` or `git add .`), branch → PR → merge commit.
- Deploys stay `workflow_dispatch` only. No push trigger, and no GCP.

**Azure resources**
- Everything is created in resource group `mike-gordievsky`, location `westeurope`, and joins `personal-brand-analytics-env`. Never modify, redeploy or delete the RG's other apps, identities, VM, storage or certificates.
- Names:
  - Container App: `mike-profile-web`
  - Image repository: `mike-profile-web`
  - Pull identity: `mike-profile-web-identity`
  - App registration: `gh-oidc-mike-profile-deploy`
  - ARM deployment names: `mike-profile-<run_id>`

**Access**
- The pipeline identity gets exactly two roles: Contributor on RG `mike-gordievsky` and AcrPush on the registry. The pipeline performs no role assignments, so it needs no RBAC Administrator role.
- OIDC federated subject: `repo:EUHUB-AI@248672290/profile@1105616066:environment:production`. GitHub environment name: `production`.
- Only three GitHub environment variables: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`. Every other name lives in the workflow `env` block or `infra/main.parameters.json`.

**Container**
- Ingress: external, target port 3000, HTTPS only.
- Probes: `GET /robots.txt`.
- Resources: 0.25 vCPU / 0.5Gi, minReplicas 1, maxReplicas 3.

**Authorization**
- Approving this plan authorizes the `az`/`gh` commands in it that create resources, identities, role assignments, federated credentials, GitHub environment variables and workflow runs. It does **not** authorize DNS changes; those are Mike's (Task 4).
- The site goes live with its current sample content (entries tagged `sample`). This is known and accepted.

## Review Focus

1. **The first revision can't pull its image** because the pull identity lacks AcrPull when the app is created. Expected: the first run's revision is Healthy/Running. Task 1 grants AcrPull before any deploy, and Task 3 Step 4 checks revision health.
2. **OIDC login fails with `AADSTS700213`** (subject mismatch). Expected: the fix is a single `federated-credential update` to the exact subject logged by the run. Task 3 Step 3 has the recovery command.
3. **A later deploy removes `mike.euhub.co`.** A full Bicep PUT overwrites `ingress.customDomains`, so a domain bound by CLI would disappear. Expected: the domain survives redeploys. Task 4 records it in `main.parameters.json`, and Task 4 Step 8 redeploys and re-checks it.
4. **Unknown URLs return 500 in the container** because `content/` is missing at request time. Expected: `/nope` on the live URL returns 404. Checked in Task 3 Step 5.
5. **The template accidentally targets a neighbouring resource.** Expected: a what-if shows exactly one create (`mike-profile-web`) and nothing modified or deleted. Checked in Task 2 Step 4.

---

### Task 1: One-time Azure and GitHub setup

Creates the pull identity and its AcrPull grant, then the GitHub OIDC app registration and its two roles, then the GitHub `production` environment and its variables. This task runs with Mike's `az` login (Owner on the subscription) and `gh` login.

**Files:** none (cloud and GitHub configuration only).

**Interfaces:**
- Produces:
  - user-assigned identity `mike-profile-web-identity` in `mike-gordievsky`, with AcrPull on `mikegordievskypersonalbrand`
  - app registration `gh-oidc-mike-profile-deploy`, whose appId becomes `AZURE_CLIENT_ID`
  - GitHub environment `production` on `EUHUB-AI/profile` with variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`

- [ ] **Step 1: Confirm the target is right before creating anything**

```bash
az account set --subscription 42d3345a-2568-48e0-a414-3fc00ee2cba7
az group show -n mike-gordievsky --query location -o tsv
az containerapp env show -g mike-gordievsky -n personal-brand-analytics-env --query "properties.provisioningState" -o tsv
az acr show -n mikegordievskypersonalbrand --query "{rg:resourceGroup,sku:sku.name}" -o tsv
az containerapp show -g mike-gordievsky -n mike-profile-web --query name -o tsv 2>&1 | tail -1
```

Expected:
- `westeurope`, `Succeeded`, `mike-gordievsky	Basic`.
- The last command reports the app was not found (`ResourceNotFound` or "was not found"). If `mike-profile-web` already exists, stop and ask Mike.

- [ ] **Step 2: Create the pull identity and grant it AcrPull**

```bash
az identity create -g mike-gordievsky -n mike-profile-web-identity -l westeurope \
  --tags app=mike-profile managed_by=github-actions -o none
PULL_PRINCIPAL=$(az identity show -g mike-gordievsky -n mike-profile-web-identity --query principalId -o tsv)
ACR_ID=$(az acr show -n mikegordievskypersonalbrand --query id -o tsv)
az role assignment create --assignee-object-id "$PULL_PRINCIPAL" --assignee-principal-type ServicePrincipal \
  --role AcrPull --scope "$ACR_ID" -o none
az role assignment list --assignee "$PULL_PRINCIPAL" --scope "$ACR_ID" --query "[].roleDefinitionName" -o tsv
```

Expected: the last command prints `AcrPull`.

- [ ] **Step 3: Create the GitHub OIDC app registration, its federated credential and roles**

```bash
APP_ID=$(az ad app create --display-name gh-oidc-mike-profile-deploy --query appId -o tsv)
az ad sp create --id "$APP_ID" -o none
TENANT_ID=$(az account show --query tenantId -o tsv)
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
az role assignment list --assignee "$SP_ID" --all --query "[].roleDefinitionName" -o tsv | sort
```

Expected:
- The echo prints two GUIDs.
- The role list prints exactly `AcrPush` and `Contributor`.
- If the role assignments fail with `PrincipalNotFound`, the new service principal hasn't replicated yet. Wait 30 seconds and re-run only the two `role assignment create` lines.

- [ ] **Step 4: Create the GitHub environment and its variables**

```bash
gh api -X PUT repos/EUHUB-AI/profile/environments/production -o /dev/null
gh variable set AZURE_CLIENT_ID --env production --repo EUHUB-AI/profile --body "$APP_ID"
gh variable set AZURE_TENANT_ID --env production --repo EUHUB-AI/profile --body "$TENANT_ID"
gh variable set AZURE_SUBSCRIPTION_ID --env production --repo EUHUB-AI/profile --body "42d3345a-2568-48e0-a414-3fc00ee2cba7"
gh variable list --env production --repo EUHUB-AI/profile
```

Expected: three variables are listed, and `AZURE_CLIENT_ID` equals `$APP_ID`.

If this step runs in a new shell, first recover the values:
- `APP_ID=$(az ad app list --display-name gh-oidc-mike-profile-deploy --query "[0].appId" -o tsv)`
- `TENANT_ID=$(az account show --query tenantId -o tsv)`

- [ ] **Step 5: Record what was created**

Nothing to commit. Paste the `APP_ID` and the identity's `clientId` into the task-completion note. Get the `clientId` with `az identity show -g mike-gordievsky -n mike-profile-web-identity --query clientId -o tsv`.

---

### Task 2: Retarget infra and the workflow to `mike-gordievsky`

**Files:**
- Rewrite: `infra/main.bicep`, `infra/main.parameters.json`, `.github/workflows/deploy.yml`, `infra/README.md`
- Test: `infra/check-workflow.sh`, a new static check of the workflow

**Interfaces:**
- Consumes: the resources from Task 1.
- Produces:
  - Bicep parameters `imageTag` (required) plus `customDomainName` and `customDomainCertificateName` (both default `''`).
  - Bicep outputs `fqdn`, `url`, `deployedImage` and `customDomainVerificationId`.
  - Workflow `env`: `AZURE_RESOURCE_GROUP`, `ACR_NAME`, `IMAGE_REPOSITORY`.

- [ ] **Step 1: Create the branch and write the failing workflow check**

```bash
git switch main && git pull --ff-only origin main && git switch -c deploy/mike-gordievsky
```

Create `infra/check-workflow.sh`:

```bash
#!/usr/bin/env bash
# Static guardrails for the deploy workflow: manual-only trigger, targets RG mike-gordievsky,
# and no leftovers from the old rg-euhub-prod-apps setup.
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
! grep -qE "rg-euhub-prod|acreuhubprod|cae-euhub-prod|AZURE_ACR_NAME|AZURE_CONTAINER_APPS_ENVIRONMENT|role assignment" "$wf" \
  || fail "old rg-euhub-prod setup or role-assignment step still referenced"
grep -q "infra/main.bicep" "$wf" || fail "workflow must deploy infra/main.bicep"
echo "workflow checks passed"
```

Run: `chmod +x infra/check-workflow.sh && infra/check-workflow.sh`
Expected: `FAIL: resource group must be mike-gordievsky`, because the current workflow targets `rg-euhub-prod-apps`.

- [ ] **Step 2: Rewrite the workflow**

Replace `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure Container Apps

# Manual only: Actions → Deploy to Azure Container Apps → Run workflow.
on:
  workflow_dispatch: {}

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
          } >> "$GITHUB_STEP_SUMMARY"
```

Run: `infra/check-workflow.sh`
Expected: `workflow checks passed`.

- [ ] **Step 3: Rewrite the Bicep template and parameters**

Replace `infra/main.bicep`:

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

Replace `infra/main.parameters.json`:

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
Expected: `bicep OK`, with no warnings about unused parameters.

- [ ] **Step 4: Preview against the real resource group (Review Focus 5)**

```bash
az deployment group what-if -g mike-gordievsky \
  --template-file infra/main.bicep --parameters infra/main.parameters.json \
  --parameters imageTag=whatif000000 --result-format ResourceIdOnly
```

Expected:
- Exactly one change: `+ Create` for `.../Microsoft.App/containerApps/mike-profile-web`.
- No `~ Modify`, `- Delete` or `x` entries.
- If anything else appears, stop and ask Mike.

- [ ] **Step 5: Rewrite `infra/README.md`**

Replace its contents with:

````md
# Deploying the profile to Azure Container Apps

The site runs as Container App **`mike-profile-web`** in resource group **`mike-gordievsky`** (westeurope, subscription EUHub). It shares that group's existing Container Apps environment (`personal-brand-analytics-env`) and registry (`mikegordievskypersonalbrand`) with the personal-brand apps, and doesn't touch them.

Deploys are **manual**: GitHub → Actions → **Deploy to Azure Container Apps** → **Run workflow**. The run summary and the repo's **production** environment show the live URL. Pushing to `main` deploys nothing.

## Pieces

- `Dockerfile`: bun build of the Next.js standalone server on port 3000. It includes `content/`, which request-time 404 pages read.
- `infra/main.bicep`: the Container App: external HTTPS ingress, probes on `/robots.txt`, 0.25 vCPU / 0.5Gi, 1–3 replicas. Its image pull uses the user-assigned identity `mike-profile-web-identity`.
- `.github/workflows/deploy.yml`: lint, types and tests → push the image to ACR → apply the Bicep template.
- `infra/check-workflow.sh`: static guardrails for the workflow (manual trigger only, correct targets).

## One-time setup (done 2026-09-25)

Everything below already exists. Keep it for rebuilding from scratch.

```bash
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

`mike.euhub.co` is bound with a managed certificate, and recorded in `infra/main.parameters.json` (`customDomainName`, `customDomainCertificateName`). Keep those two values: without them the next deploy would remove the domain from the app. DNS for `euhub.co` is on Google Cloud DNS:

- `CNAME mike` → the app's Azure hostname
- `TXT asuid.mike` → the app's `customDomainVerificationId`
````

Run: `infra/check-workflow.sh && az bicep build --file infra/main.bicep --stdout > /dev/null && echo ok`
Expected: `workflow checks passed`, then `ok`.

- [ ] **Step 6: Commit, open a PR, merge with a merge commit**

```bash
git add .github/workflows/deploy.yml infra/main.bicep infra/main.parameters.json infra/README.md infra/check-workflow.sh
git commit -m "ci: deploy the profile to Container Apps in RG mike-gordievsky"
git push -u origin deploy/mike-gordievsky
gh pr create --base main --title "Deploy profile to Container Apps in RG mike-gordievsky" \
  --body "Retargets the manual Azure deploy from rg-euhub-prod-apps to RG mike-gordievsky: joins personal-brand-analytics-env, pulls from mikegordievskypersonalbrand with a pre-created user-assigned identity, and adds a static workflow check. what-if shows a single create (mike-profile-web) and no other changes."
gh pr merge --merge
git switch main && git pull --ff-only origin main
gh run list --limit 3
```

Expected: the PR is merged, and `gh run list` shows **no new run**, because the workflow is manual only.

---

### Task 3: First deploy and live verification

**Files:** none.

**Interfaces:**
- Consumes: the merged workflow (Task 2) and the setup from Task 1.
- Produces: a running `mike-profile-web` and its Azure URL, `https://mike-profile-web.jollymeadow-f8c88678.westeurope.azurecontainerapps.io`. Confirm the exact value from the deployment output.

- [ ] **Step 1: Trigger the workflow**

```bash
gh workflow run deploy.yml --repo EUHUB-AI/profile --ref main
sleep 5
RUN_ID=$(gh run list --repo EUHUB-AI/profile --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')
echo "$RUN_ID"
```

- [ ] **Step 2: Watch it to completion**

Run: `gh run watch "$RUN_ID" --repo EUHUB-AI/profile --exit-status`
Expected: jobs `build-and-test`, `build-and-push-image` and `deploy` all succeed.

- [ ] **Step 3: If it failed, recover (Review Focus 2)**

Run: `gh run view "$RUN_ID" --repo EUHUB-AI/profile --log-failed | tail -40`

If `azure/login` failed with `AADSTS700213`:
1. Copy the subject from the log line starting `Presented assertion subject` (or the `sub` shown).
2. Run:

   ```bash
   APP_ID=$(az ad app list --display-name gh-oidc-mike-profile-deploy --query "[0].appId" -o tsv)
   az ad app federated-credential update --id "$APP_ID" --federated-credential-id gh-environment-production \
     --parameters '{"subject":"<exact subject from the log>"}'
   ```

3. Run `gh run rerun "$RUN_ID" --repo EUHUB-AI/profile --failed`, and repeat Step 2.

For any other failure, stop and report the log excerpt to Mike. Don't improvise role changes.

- [ ] **Step 4: Check the revision is healthy (Review Focus 1)**

```bash
az containerapp revision list -n mike-profile-web -g mike-gordievsky \
  --query "[].{name:name,active:properties.active,health:properties.healthState,running:properties.runningState}" -o table
FQDN=$(az containerapp show -n mike-profile-web -g mike-gordievsky --query properties.configuration.ingress.fqdn -o tsv)
echo "https://$FQDN"
```

Expected: one active revision with health `Healthy` and running state `Running` (or `RunningAtMaxScale`), and a URL on `jollymeadow-f8c88678.westeurope.azurecontainerapps.io`.

- [ ] **Step 5: Smoke-test the live site (Review Focus 4)**

```bash
for p in / /books /books/atomic-habits /travel /languages /sport /hobbies /robots.txt /sitemap.xml /nope /books/typo; do
  printf "%-22s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "https://$FQDN$p")"
done
curl -s "https://$FQDN/" | grep -o "Welcome to mike-g[^<]*"
curl -s "https://$FQDN/nope" | grep -o "no such file or directory"
```

Expected:
- `200` for every page, `robots.txt` and `sitemap.xml`; `404` for `/nope` and `/books/typo`.
- The two greps print `Welcome to mike-g (GNU/Life, SRE edition)` and `no such file or directory`.

- [ ] **Step 6: Confirm the neighbours are untouched**

Run: `az containerapp list -g mike-gordievsky --query "[].{name:name,state:properties.runningStatus,image:properties.template.containers[0].image}" -o table`

Expected:
- `personal-brand-analytics`, `linkedin-telegram-worker` and `linkedin-publication-collector` keep the images they had before. Their tags were `linkedin-analytics-dashboard:78aeff7b87ba…`, `linkedin-telegram-worker:3292cfb` and `linkedin-publication-collector@sha256:6d59d80b…`.
- `mike-profile-web` is added.

---

### Task 4: Bind `mike.euhub.co` (needs Mike's DNS change)

**Gate:** Steps 2–3 need Mike to add two DNS records at Google Cloud DNS for `euhub.co`. Don't continue past Step 3 until `dig` shows both.

**Files:**
- Modify: `infra/main.parameters.json` (`customDomainName`, `customDomainCertificateName`)

**Interfaces:**
- Consumes: the running app (Task 3).
- Produces: `https://mike.euhub.co`, served with a managed certificate and recorded in parameters, so later deploys keep it.

- [ ] **Step 1: Get the two DNS values for Mike**

```bash
FQDN=$(az containerapp show -n mike-profile-web -g mike-gordievsky --query properties.configuration.ingress.fqdn -o tsv)
VERIFY=$(az containerapp show -n mike-profile-web -g mike-gordievsky --query properties.customDomainVerificationId -o tsv)
printf 'CNAME  mike        -> %s\nTXT    asuid.mike  -> %s\n' "$FQDN" "$VERIFY"
```

Send Mike exactly these two records to add to the `euhub.co` zone. `signals.euhub.co` already uses the same pattern with this environment.

- [ ] **Step 2: Wait for DNS**

Run: `dig +short CNAME mike.euhub.co; dig +short TXT asuid.mike.euhub.co`
Expected: the CNAME equals `$FQDN.` (with a trailing dot), and the TXT equals `"$VERIFY"`. Re-check until both match; don't proceed on a partial match.

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

Expected:
- `CERT_NAME` is non-empty, like `mike.euhub.co-personal-2609…`.
- The curl prints `200`. Certificate issuance can take a few minutes; if curl reports a TLS error, retry after 2 minutes.

- [ ] **Step 4: Record the binding in parameters (Review Focus 3)**

Replace the two custom-domain entries in `infra/main.parameters.json`:

```json
    "customDomainName": { "value": "mike.euhub.co" },
    "customDomainCertificateName": { "value": "<CERT_NAME from Step 3>" }
```

Use the literal certificate name printed in Step 3, not the placeholder text.

Run: `az deployment group what-if -g mike-gordievsky --template-file infra/main.bicep --parameters infra/main.parameters.json --parameters imageTag=whatif000000 --result-format FullResourcePayloads | grep -n "customDomains" -A6 | head -20`

Expected:
- `mike.euhub.co` appears with a `certificateId` ending in `/managedCertificates/<CERT_NAME>`.
- `customDomains` shows no `- Delete` / removal.

- [ ] **Step 5: Commit through a PR**

```bash
git switch -c deploy/mike-euhub-co-domain
git add infra/main.parameters.json
git commit -m "infra: keep mike.euhub.co bound across deploys"
git push -u origin deploy/mike-euhub-co-domain
gh pr create --base main --title "Keep mike.euhub.co bound across deploys" \
  --body "Records the mike.euhub.co binding and its managed certificate in main.parameters.json, so the Bicep deploy no longer drops the custom domain."
gh pr merge --merge
git switch main && git pull --ff-only origin main
```

- [ ] **Step 6: Redeploy and prove the domain survives**

```bash
gh workflow run deploy.yml --repo EUHUB-AI/profile --ref main
sleep 5
RUN_ID=$(gh run list --repo EUHUB-AI/profile --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --repo EUHUB-AI/profile --exit-status
az containerapp hostname list -n mike-profile-web -g mike-gordievsky --query "[].{name:name,binding:bindingType}" -o table
for p in / /books /nope /sitemap.xml; do printf "%-14s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://mike.euhub.co$p)"; done
```

Expected:
- The run succeeds.
- The hostname list still shows `mike.euhub.co  SniEnabled`.
- Status codes: `/` 200, `/books` 200, `/nope` 404, `/sitemap.xml` 200.
- The run summary says `Deployed → https://mike.euhub.co`.

---

### Task 5: Update the project context

**Files:**
- Modify: `docs/CONTEXT.md` (Deployment section and History)
- Modify: `~/.claude/projects/-home-engineer-projects-personal-profile/memory/project_profile_site.md` and `reference_euhub_azure.md` (not in the repo)

- [ ] **Step 1: Replace the Deployment section of `docs/CONTEXT.md`**

Replace everything from `## Deployment` up to (not including) `## How Mike works` with:

```md
## Deployment

- **Where:** Container App `mike-profile-web` in resource group **`mike-gordievsky`** (westeurope, subscription EUHub). It shares that group's existing Container Apps environment `personal-brand-analytics-env` and registry `mikegordievskypersonalbrand` with the personal-brand apps (`personal-brand-analytics`, `linkedin-telegram-worker`, `linkedin-publication-collector`). **Never touch those.**
- **URLs:** `https://mike.euhub.co` (managed certificate), plus the Azure URL `https://mike-profile-web.jollymeadow-f8c88678.westeurope.azurecontainerapps.io`.
- **Deploy:** manual only. Actions → **Deploy to Azure Container Apps** → **Run workflow**, or `gh workflow run deploy.yml --ref main`. Pushing to `main` deploys nothing.
- **Pipeline:** lint, types and tests → push to ACR → `infra/main.bicep`.
- **Identities:**
  - The GitHub side is app registration `gh-oidc-mike-profile-deploy` (OIDC, environment `production`), with Contributor on the RG and AcrPush on the registry.
  - The image pull uses user-assigned identity `mike-profile-web-identity` (AcrPull).
- **Custom domain:** `mike.euhub.co` must stay recorded in `infra/main.parameters.json`, or the next deploy removes it. DNS for `euhub.co` is on Google Cloud DNS, edited by hand.
- **Guardrail:** `infra/check-workflow.sh` checks the workflow is manual-only and targets this RG.
- **Superseded:** the earlier `rg-euhub-prod-apps` / `cae-euhub-prod` target (2026-09-24) was never deployed.
```

In `## History`, append:

```md
6. **2026-09-25: first deploy.** Deployed to RG `mike-gordievsky` as `mike-profile-web` and bound `mike.euhub.co`. The site is live with sample content still tagged `sample`.
```

In `## Open items / backlog`, delete the line starting `- **Do the Azure setup and first deploy**`.

- [ ] **Step 2: Update memory**

In `project_profile_site.md`, replace the paragraph starting `**Not deployed yet.**` with:

`**Live since 2026-09-25** at https://mike.euhub.co (Container App mike-profile-web in RG mike-gordievsky, manual workflow_dispatch deploys). Sample content is still live, tagged "sample".`

In `reference_euhub_azure.md`, append:

`Mike's personal apps (this profile, personal-brand, linkedin-*) live in RG **mike-gordievsky** (westeurope) with their own environment personal-brand-analytics-env and ACR mikegordievskypersonalbrand, not the shared rg-euhub-prod-* platform. euhub.co DNS is on Google Cloud DNS.`

Update the matching `MEMORY.md` line to `redesign live 2026-09-25 at mike.euhub.co (RG mike-gordievsky); see docs/CONTEXT.md`.

- [ ] **Step 3: Verify and commit through a PR**

```bash
npx eslint . && npx tsc --noEmit && npm test && npm run build
git switch -c docs/deploy-context
git add docs/CONTEXT.md
git commit -m "docs: record the mike-gordievsky deployment in project context"
git push -u origin docs/deploy-context
gh pr create --base main --title "Record the mike-gordievsky deployment in project context" --body "Updates docs/CONTEXT.md with the live deployment, identities, URLs and domain guardrail."
gh pr merge --merge
git switch main && git pull --ff-only origin main
```

Expected: all checks pass and the PR is merged. No workflow run starts.
