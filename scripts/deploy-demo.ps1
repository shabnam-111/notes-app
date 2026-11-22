param([Parameter(Mandatory)][ValidatePattern('^[a-zA-Z0-9_.-]+$')][string]$Tag, [string]$ImagePrefix = '')
$ErrorActionPreference = 'Stop'
function Invoke-Kube {
    & kubectl --context kind-mindvault-demo @args
    if ($LASTEXITCODE) { throw "kubectl failed: $args" }
}
if (-not (Invoke-Kube get ns mindvault --ignore-not-found -o name)) {
    Invoke-Kube create ns mindvault
}
if (-not (Invoke-Kube -n mindvault get secret mindvault-secrets --ignore-not-found -o name)) {
    $password = [guid]::NewGuid().ToString('N')
    $secret = @{
        apiVersion = 'v1'; kind = 'Secret'
        metadata = @{ name = 'mindvault-secrets'; namespace = 'mindvault' }
        stringData = @{
            POSTGRES_USER = 'mindvault'
            POSTGRES_DB = 'mindvault'
            POSTGRES_PASSWORD = $password
            DATABASE_URL = "postgresql://mindvault:$password@postgres:5432/mindvault?schema=public"
            JWT_SECRET = [guid]::NewGuid().ToString('N')
            JWT_REFRESH_SECRET = [guid]::NewGuid().ToString('N')
        }
    } | ConvertTo-Json -Depth 6 -Compress
    $secret | & kubectl --context kind-mindvault-demo create -f -
    if ($LASTEXITCODE) { throw 'Could not create the MindVault Kubernetes Secret' }
}
$overlay = Join-Path ([IO.Path]::GetTempPath()) ("mindvault-" + [guid]::NewGuid())
New-Item -ItemType Directory $overlay | Out-Null
try {
    Copy-Item (Join-Path $PSScriptRoot '../k8s') (Join-Path $overlay 'base') -Recurse
    $images = foreach ($name in 'backend','database-init','frontend','ai-service') {
        @{ name = "mindvault-$name"; newName = "$($ImagePrefix)mindvault-$name"; newTag = $Tag }
    }
    @{
        apiVersion = 'kustomize.config.k8s.io/v1beta1'
        kind = 'Kustomization'
        resources = @('base')
        images = @($images)
    } | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $overlay 'kustomization.yaml')
    Invoke-Kube apply -k $overlay
    foreach ($name in 'postgres','redis','qdrant','ai-service','backend','frontend') {
        Invoke-Kube -n mindvault rollout status "deployment/$name" --timeout=300s
    }
    Invoke-Kube -n mindvault get 'pods,svc,pvc'
} finally {
    Remove-Item -LiteralPath $overlay -Recurse -Force
}
