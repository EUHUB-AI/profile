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
