# MindVault DevOps demo

Run the demo from this directory in PowerShell. The demo uses Docker Desktop with Linux containers, Java 21, Git, kubectl, and kind. Keep the Jenkins agent and the kind cluster on the same Windows machine.

## Docker

```powershell
docker compose -p mindvault-demo up -d --build --wait --wait-timeout 240
docker compose -p mindvault-demo ps -a
./scripts/smoke-demo.ps1 -BaseUrl "http://127.0.0.1:3100"
```

The local .env sets the frontend to port 3100. On a fresh copy, create .env from .env.example, add generated database/JWT credentials, and either set FRONTEND_PORT=3100 or pass the default URL on port 3000 to the smoke script. The database-init container should exit with code 0. It applies the PostgreSQL schema with Prisma without accepting destructive changes.

## Jenkins

On the prepared workstation, open http://127.0.0.1:8088/job/MindVault/. Sign in as `mindvault-demo` with the password saved locally in `.demo/jenkins-password.txt`. In a new PowerShell terminal, select the isolated kubeconfig with `$env:KUBECONFIG = (Resolve-Path .demo/kubeconfig).Path`.

Run Jenkins under the Windows account that can access Docker Desktop. Install the suggested plugins, label the Windows executor `mindvault-windows`, and create a Pipeline job using **Pipeline script from SCM** with this source repository and script path `Jenkinsfile`. The agent must have Docker, Git, kind, and kubectl on PATH, and a kubeconfig containing the `kind-mindvault-demo` context. If needed, create the cluster once with `kind create cluster --name mindvault-demo`.

If Docker reports cgroup version 1 and kubelet fails to start, use `kind create cluster --name mindvault-demo --image kindest/node:v1.36.1 --config k8s/kind-cgroup-v1.yaml` for this local demo.

Use **Build with Parameters** after committing the source. The default kind delivery builds and tests the application, tags the images with the commit SHA, loads them into kind, waits for rollouts, then runs the smoke test through the frontend. For a Docker Hub demonstration, choose registry delivery, enter the repository namespace, and configure the Jenkins username/password credential `mindvault-dockerhub` with a Docker Hub token. Use public repositories for the four demo images or configure registry pull credentials for the namespace before using private repositories.

## Kubernetes

```powershell
kubectl --context kind-mindvault-demo -n mindvault get deployments,pods,svc,pvc
kubectl --context kind-mindvault-demo -n mindvault get pods -o "custom-columns=POD:.metadata.name,IMAGES:.spec.containers[*].image"
kubectl --context kind-mindvault-demo -n mindvault port-forward svc/frontend 3200:3000
```

Open http://127.0.0.1:3200. Register, sign in, create a note, and reload to show it persisted. In a second terminal, run `./scripts/smoke-demo.ps1 -BaseUrl http://127.0.0.1:3200` to verify the same sequence through HTTP. The PostgreSQL, Redis, Qdrant, and upload volumes are scoped to the demo namespace. This setup targets a single-node cluster.
