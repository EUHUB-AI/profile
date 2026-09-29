#!/usr/bin/env bash
# Static guardrails for the deploy workflow: manual-only trigger, the shared EUHub
# platform (rg-euhub-prod-apps / cae-euhub-prod / acreuhubprod), the SITE_INDEXABLE
# build arg, and no leftovers from the abandoned mike-gordievsky retarget.
set -euo pipefail
wf=".github/workflows/deploy.yml"
fail() { echo "FAIL: $1"; exit 1; }

python3 - "$wf" <<'PY' || fail "triggers must be exactly workflow_dispatch"
import sys, yaml
doc = yaml.safe_load(open(sys.argv[1]))
triggers = doc.get(True, doc.get("on"))
sys.exit(0 if list(triggers) == ["workflow_dispatch"] else 1)
PY

grep -q "AZURE_RESOURCE_GROUP: rg-euhub-prod-apps" "$wf" || fail "resource group must be rg-euhub-prod-apps"
grep -q "CONTAINER_APP_NAME: ca-euhub-mike-web" "$wf" || fail "container app must be ca-euhub-mike-web"
grep -q "SITE_INDEXABLE=" "$wf" || fail "build must pass the SITE_INDEXABLE build arg"
grep -q "Grant AcrPull to an existing Container App before deploying" "$wf" || fail "pre-deploy AcrPull grant missing"
! grep -qE "mike-gordievsky|mikegordievskypersonalbrand|personal-brand" "$wf" || fail "mike-gordievsky retarget still referenced"
grep -q "infra/main.bicep" "$wf" || fail "workflow must deploy infra/main.bicep"
echo "workflow checks passed"
