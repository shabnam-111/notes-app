pipeline {
    agent { label 'mindvault-windows' }
    options {
        skipDefaultCheckout()
        disableConcurrentBuilds()
        timeout(time: 45, unit: 'MINUTES')
    }
    parameters {
        choice(name: 'DELIVERY', choices: ['kind', 'registry', 'build-only'], description: 'Load images into kind, push to Docker Hub, or build only.')
        string(name: 'DOCKERHUB_NAMESPACE', defaultValue: '', description: 'Docker Hub namespace for registry delivery.')
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.IMAGE_TAG = bat(script: '@git rev-parse --short=12 HEAD', returnStdout: true).trim()
                    env.IMAGE_PREFIX = ''
                    if (params.DELIVERY == 'registry') {
                        if (!(params.DOCKERHUB_NAMESPACE ==~ /[a-z0-9]+([_-][a-z0-9]+)*/)) {
                            error('Enter a valid Docker Hub namespace.')
                        }
                        env.IMAGE_PREFIX = params.DOCKERHUB_NAMESPACE + '/'
                    }
                }
            }
        }
        stage('Test') {
            steps {
                bat 'docker build --target test backend'
                bat 'docker build --target test frontend'
            }
        }
        stage('Build images') {
            steps {
                bat 'docker build -t %IMAGE_PREFIX%mindvault-backend:%IMAGE_TAG% backend'
                bat 'docker build --target database-init -t %IMAGE_PREFIX%mindvault-database-init:%IMAGE_TAG% backend'
                bat 'docker build -t %IMAGE_PREFIX%mindvault-frontend:%IMAGE_TAG% frontend'
                bat 'docker build -t %IMAGE_PREFIX%mindvault-ai-service:%IMAGE_TAG% ai-service'
                bat 'docker run --rm --network none -e EMBEDDING_PROVIDER=deterministic %IMAGE_PREFIX%mindvault-ai-service:%IMAGE_TAG% python -m pytest tests -q'
            }
        }
        stage('Push images') {
            when { expression { params.DELIVERY == 'registry' } }
            steps {
                withCredentials([usernamePassword(credentialsId: 'mindvault-dockerhub', usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_TOKEN')]) {
                    powershell '''
                        $ErrorActionPreference = 'Stop'
                        $env:DOCKER_CONFIG = Join-Path $env:WORKSPACE ('docker-config-' + $env:BUILD_NUMBER)
                        New-Item -ItemType Directory -Path $env:DOCKER_CONFIG -Force | Out-Null
                        try {
                            $env:REGISTRY_TOKEN | docker login --username $env:REGISTRY_USER --password-stdin
                            if ($LASTEXITCODE) { throw 'Docker login failed' }
                            foreach ($service in 'backend','database-init','frontend','ai-service') {
                                docker push "$($env:IMAGE_PREFIX)mindvault-$($service):$env:IMAGE_TAG"
                                if ($LASTEXITCODE) { throw "Push failed for $service" }
                            }
                        } finally {
                            docker logout
                            Remove-Item -LiteralPath $env:DOCKER_CONFIG -Recurse -Force
                        }
                    '''
                }
            }
        }
        stage('Load images into kind') {
            when { expression { params.DELIVERY == 'kind' } }
            steps {
                bat 'kind load docker-image --name mindvault-demo mindvault-backend:%IMAGE_TAG% mindvault-database-init:%IMAGE_TAG% mindvault-frontend:%IMAGE_TAG% mindvault-ai-service:%IMAGE_TAG%'
            }
        }
        stage('Deploy and verify') {
            when { expression { params.DELIVERY != 'build-only' } }
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'
                    ./scripts/deploy-demo.ps1 -Tag $env:IMAGE_TAG -ImagePrefix $env:IMAGE_PREFIX
                    $forward = Start-Process kubectl -ArgumentList '--context','kind-mindvault-demo','-n','mindvault','port-forward','svc/frontend','13100:3000' -WindowStyle Hidden -PassThru
                    try {
                        $ready = $false
                        for ($attempt = 0; $attempt -lt 20; $attempt++) {
                            try {
                                Invoke-RestMethod 'http://127.0.0.1:13100/api/v1/health' -TimeoutSec 2 | Out-Null
                                $ready = $true
                                break
                            } catch { Start-Sleep -Seconds 1 }
                        }
                        if (!$ready -or $forward.HasExited) { throw 'Kubernetes port-forward failed' }
                        ./scripts/smoke-demo.ps1 -BaseUrl 'http://127.0.0.1:13100'
                    } finally {
                        if (!$forward.HasExited) { Stop-Process -Id $forward.Id }
                    }
                '''
            }
        }
    }
}

