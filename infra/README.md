# Deploying the profile to Azure Container Apps

Same setup as `EUHUB-AI/OminusMTE`: one Container App (`ca-euhub-mike-web`) in `rg-euhub-prod-apps`, running inside the shared Container Apps Environment (`cae-euhub-prod`) and pulling from the shared registry (`acreuhubprod`). Both of those live in `rg-euhub-prod-platform`.

Deploys are **manual**: GitHub → Actions → **Deploy to Azure Container Apps** → **Run workflow**, or `gh workflow run deploy.yml --ref main -f site_indexable=false`. Pushing to `main` deploys nothing.

The workflow has one input, **`site_indexable`** (default off). Leave it off while sample content is live: the site then sends `noindex` headers and an empty sitemap. Turn it on for a deploy once the content is real.

## What's here

- **`Dockerfile`**: multi-stage bun build of the Next.js standalone server, listening on port 3000. `content/` is copied into the image because the server reads the Markdown at request time for 404 pages.
- **`infra/main.bicep`**: creates or updates the Container App inside the **existing** environment and registry. It doesn't create those.
- **`.github/workflows/deploy.yml`**: lint, types, tests and `infra/check-workflow.sh` → build and push the image to ACR → grant AcrPull to an already-existing app → apply the Bicep template → grant the new app AcrPull. It logs in to Azure with OIDC, so no client secret is stored in GitHub. Same shape as `EUHUB-AI/Ominus`.
- **`infra/check-workflow.sh`**: static guardrails for the workflow (manual trigger only, correct targets, the `SITE_INDEXABLE` build arg, the pre-deploy AcrPull grant).

The deploy job prints the app's Azure-generated URL (`https://ca-euhub-mike-web.<env-id>.germanywestcentral.azurecontainerapps.io`) in the run summary. The same link appears on the repo's **production** environment page.

## One-time setup

`EUHUB-AI/Ominus` already deploys to this platform through app registration **`6b7c60ef-1d2e-479a-8b4a-bdc2d3ac54d4`** (tenant `8c4f47c0-d3cc-4c9c-bc45-39bbf0eb18be`), which holds Contributor on `rg-euhub-prod-apps`, AcrPush on the registry and the role needed to grant AcrPull. This repo reuses that identity: it only needs its own federated credential and the same five GitHub variables.

### 1. Federated credential on the shared app registration

Run by an owner of that app registration (or an Application Administrator):

```bash
az ad app federated-credential create --id 6b7c60ef-1d2e-479a-8b4a-bdc2d3ac54d4 --parameters '{
  "name": "gh-profile-environment-production",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:EUHUB-AI@248672290/profile@1105616066:environment:production",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

EUHUB-AI uses GitHub's immutable-ID OIDC subjects, so the subject carries the org and repo IDs. If `azure/login` still fails with `AADSTS700213`, copy the exact subject from that run's log and run `az ad app federated-credential update` to match it.

### 2. GitHub environment and variables

Create an environment named `production` (Repo → Settings → Environments), then set these **environment variables**, the same values as on `EUHUB-AI/Ominus`. They're identifiers, not secrets:

```bash
gh api -X PUT repos/EUHUB-AI/profile/environments/production
gh variable set AZURE_CLIENT_ID --env production --repo EUHUB-AI/profile --body 6b7c60ef-1d2e-479a-8b4a-bdc2d3ac54d4
gh variable set AZURE_TENANT_ID --env production --repo EUHUB-AI/profile --body 8c4f47c0-d3cc-4c9c-bc45-39bbf0eb18be
gh variable set AZURE_SUBSCRIPTION_ID --env production --repo EUHUB-AI/profile --body 42d3345a-2568-48e0-a414-3fc00ee2cba7
gh variable set AZURE_ACR_NAME --env production --repo EUHUB-AI/profile --body acreuhubprod
gh variable set AZURE_CONTAINER_APPS_ENVIRONMENT --env production --repo EUHUB-AI/profile --body cae-euhub-prod
```

### 3. First deploy

Actions → **Deploy to Azure Container Apps** → **Run workflow** on `main` with `site_indexable` off. When the run finishes, open the URL shown in its summary.

## Custom domain: mike.euhub.co

`content/profile.md` already has `siteUrl: https://mike.euhub.co`, which drives the sitemap, robots.txt and page metadata. To serve the site on that domain once the app exists:

```bash
FQDN=$(az containerapp show -n ca-euhub-mike-web -g rg-euhub-prod-apps --query properties.configuration.ingress.fqdn -o tsv)
VERIFY=$(az containerapp show -n ca-euhub-mike-web -g rg-euhub-prod-apps --query properties.customDomainVerificationId -o tsv)
ENV_ID=$(az containerapp env show -n cae-euhub-prod -g rg-euhub-prod-platform --query id -o tsv)
# DNS for euhub.co:  CNAME  mike        -> $FQDN
#                    TXT    asuid.mike  -> $VERIFY
az containerapp hostname add  -n ca-euhub-mike-web -g rg-euhub-prod-apps --hostname mike.euhub.co
az containerapp hostname bind -n ca-euhub-mike-web -g rg-euhub-prod-apps --hostname mike.euhub.co \
  --environment "$ENV_ID" --validation-method CNAME
```

`hostname bind` also issues a free managed TLS certificate.
