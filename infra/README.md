# Deploying the profile to Azure Container Apps

Same setup as `EUHUB-AI/OminusMTE`: one Container App (`ca-euhub-mike-web`) in `rg-euhub-prod-apps`, running inside the shared Container Apps Environment (`cae-euhub-prod`) and pulling from the shared registry (`acreuhubprod`). Both of those live in `rg-euhub-prod-platform`.

Deploys are **manual**: GitHub → Actions → **Deploy to Azure Container Apps** → **Run workflow**. Pushing to `main` deploys nothing.

## What's here

- **`Dockerfile`**: multi-stage bun build of the Next.js standalone server, listening on port 3000. `content/` is copied into the image because the server reads the Markdown at request time for 404 pages.
- **`infra/main.bicep`**: creates or updates the Container App inside the **existing** environment and registry. It doesn't create those.
- **`.github/workflows/deploy.yml`**: lint, types and tests → build and push the image to ACR → apply the Bicep template → grant the app AcrPull. It logs in to Azure with OIDC, so no client secret is stored in GitHub.

The deploy job prints the app's Azure-generated URL (`https://ca-euhub-mike-web.<env-id>.germanywestcentral.azurecontainerapps.io`) in the run summary. The same link appears on the repo's **production** environment page.

## One-time setup

Run once by someone with Owner/Contributor on the `EUHub` subscription.

### 1. GitHub OIDC app registration

```bash
SUBSCR_ID=42d3345a-2568-48e0-a414-3fc00ee2cba7
RG=rg-euhub-prod-apps
ACR_NAME=acreuhubprod

az account set --subscription "$SUBSCR_ID"

APP_ID=$(az ad app create --display-name "gh-oidc-profile-deploy" --query appId -o tsv)
az ad sp create --id "$APP_ID"
TENANT_ID=$(az account show --query tenantId -o tsv)

# EUHUB-AI uses GitHub's immutable-ID OIDC subjects, so the subject must carry
# the org and repo IDs (org 248672290, repo 1105616066), not just their names.
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "gh-environment-production",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:EUHUB-AI@248672290/profile@1105616066:environment:production",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

If `azure/login` still fails with `AADSTS700213`, copy the exact subject from that run's log and run `az ad app federated-credential update` to match it.

### 2. Minimum roles

```bash
SP_OBJECT_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv)
ACR_ID=$(az acr show --name "$ACR_NAME" --resource-group rg-euhub-prod-platform --query id -o tsv)

az role assignment create --assignee "$SP_OBJECT_ID" --role "Contributor" \
  --scope "/subscriptions/$SUBSCR_ID/resourceGroups/$RG"
az role assignment create --assignee "$SP_OBJECT_ID" --role "AcrPush" --scope "$ACR_ID"
az role assignment create --assignee "$SP_OBJECT_ID" \
  --role "Role Based Access Control Administrator" --scope "$ACR_ID"
```

### 3. GitHub environment and variables

Create an environment named `production` (Repo → Settings → Environments), then set these as **environment variables**. They're identifiers, not secrets:

```bash
gh variable set AZURE_CLIENT_ID --env production --repo EUHUB-AI/profile --body "$APP_ID"
gh variable set AZURE_TENANT_ID --env production --repo EUHUB-AI/profile --body "$TENANT_ID"
gh variable set AZURE_SUBSCRIPTION_ID --env production --repo EUHUB-AI/profile --body "$SUBSCR_ID"
gh variable set AZURE_ACR_NAME --env production --repo EUHUB-AI/profile --body "acreuhubprod"
gh variable set AZURE_CONTAINER_APPS_ENVIRONMENT --env production --repo EUHUB-AI/profile --body "cae-euhub-prod"
```

### 4. First deploy

Actions → **Deploy to Azure Container Apps** → **Run workflow** on `main`. When the run finishes, open the URL shown in its summary.

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
