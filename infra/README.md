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
az ad app federated-credential create --id "$APP_ID" --parameters '{"name":"gh-environment-production","issuer":"https://token.actions.githubusercontent.com","subject":"repo:EUHUB-AI/profile:environment:production","audiences":["api://AzureADTokenExchange"]}'
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
