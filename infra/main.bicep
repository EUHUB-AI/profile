// Provisions the mike-g profile Container App into the existing shared
// Container Apps Environment + Azure Container Registry (the same platform
// resources the sibling ca-euhub-*-web apps use). Both live in
// rg-euhub-prod-platform; the app itself goes into rg-euhub-prod-apps.
// Deploy with resource-group scope:
//
//   az deployment group create \
//     --resource-group rg-euhub-prod-apps \
//     --template-file infra/main.bicep \
//     --parameters infra/main.parameters.json \
//     --parameters imageTag=<git-sha>
//
// Re-running is safe: it's declarative and only changes what drifted.

@description('Azure region. Matches the shared Container Apps Environment.')
param location string = 'germanywestcentral'

@description('Name of the Container App to create/update.')
param containerAppName string = 'ca-euhub-mike-web'

@description('Resource group holding the shared Container Apps Environment and ACR.')
param platformResourceGroup string = 'rg-euhub-prod-platform'

@description('Name of the existing Container Apps Environment to join.')
param containerAppsEnvironmentName string = 'cae-euhub-prod'

@description('Name of the existing Azure Container Registry images are pushed to.')
param acrName string = 'acreuhubprod'

@description('Repository name within the registry.')
param imageRepository string = 'mike-profile-web'

@description('Image tag to deploy; the workflow passes the short git SHA.')
param imageTag string

@description('Always-on replica floor. 1 avoids cold starts; 0 scales to zero to save cost at the price of a slow first hit after idle.')
@minValue(0)
@maxValue(5)
param minReplicas int = 1

@minValue(1)
@maxValue(10)
param maxReplicas int = 3

@description('vCPU for the Next.js standalone server.')
param cpu string = '0.25'

@description('Memory for the Next.js standalone server.')
param memory string = '0.5Gi'

param tags object = {
  environment: 'prod'
  managed_by: 'github-actions'
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: containerAppsEnvironmentName
  scope: resourceGroup(platformResourceGroup)
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
  scope: resourceGroup(platformResourceGroup)
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  tags: tags
  identity: {
    // System-assigned identity + AcrPull (granted in deploy.yml) instead of
    // registry admin credentials stored as a Container App secret.
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        allowInsecure: false
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
          identity: 'system'
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

@description('The default public hostname Azure assigns this Container App.')
output fqdn string = containerApp.properties.configuration.ingress.fqdn

@description('Fully-qualified image reference that was deployed.')
output deployedImage string = '${acr.properties.loginServer}/${imageRepository}:${imageTag}'

@description('The Container App\'s system-assigned identity principal ID; deploy.yml grants it AcrPull.')
output containerAppPrincipalId string = containerApp.identity.principalId

@description('Resource ID of the ACR, for the AcrPull grant step in deploy.yml.')
output acrId string = acr.id
