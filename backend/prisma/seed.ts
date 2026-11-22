import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding database with initial portfolio data...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Demo User
  const user = await prisma.user.upsert({
    where: { email: 'demo@mindvault.ai' },
    update: {},
    create: {
      email: 'demo@mindvault.ai',
      passwordHash,
      fullName: 'Gurnoor Singh',
    },
  });

  console.log(`[Seed] User ensured: ${user.email} (ID: ${user.id})`);

  // 2. Create Folders
  const devopsFolder = await prisma.folder.create({
    data: {
      userId: user.id,
      name: 'DevOps & Cloud',
      color: '#3B82F6',
    },
  });

  const aiFolder = await prisma.folder.create({
    data: {
      userId: user.id,
      name: 'AI & Machine Learning',
      color: '#8B5CF6',
    },
  });

  const archFolder = await prisma.folder.create({
    data: {
      userId: user.id,
      name: 'System Architecture',
      color: '#10B981',
    },
  });

  // 3. Create Tags
  const tagsData = [
    { name: 'Kubernetes', color: '#3B82F6' },
    { name: 'Docker', color: '#06B6D4' },
    { name: 'RAG', color: '#8B5CF6' },
    { name: 'VectorDB', color: '#A855F7' },
    { name: 'Microservices', color: '#10B981' },
    { name: 'DevOps', color: '#F59E0B' },
  ];

  const tagMap: Record<string, string> = {};
  for (const t of tagsData) {
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId: user.id, name: t.name } },
      create: { userId: user.id, name: t.name, color: t.color },
      update: {},
    });
    tagMap[t.name] = tag.id;
  }

  // 4. Create Rich Notes
  const note1 = await prisma.note.create({
    data: {
      userId: user.id,
      folderId: devopsFolder.id,
      title: 'Container Orchestration with Kubernetes',
      contentText:
        'Kubernetes coordinates clusters of nodes to run containerized workloads reliably. It introduces fundamental abstractions including Pods (the smallest deployable unit), ReplicaSets (ensuring desired replica counts), Deployments (declarative updates), and Services (stable network endpoints for load balancing across ephemeral pods). Ingress controllers manage inbound external HTTP/HTTPS traffic routing to underlying ClusterIP services. Kubernetes also features Horizontal Pod Autoscaling (HPA) to scale pods dynamically based on CPU/memory utilization or custom metrics.',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Container Orchestration with Kubernetes' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Kubernetes coordinates clusters of nodes to run containerized workloads reliably. It introduces fundamental abstractions including Pods, Deployments, and Services.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Core Architecture Components' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', marks: [{ type: 'bold' }], text: 'Control Plane: ' },
                      { type: 'text', text: 'kube-apiserver, etcd, kube-scheduler, and kube-controller-manager.' },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', marks: [{ type: 'bold' }], text: 'Worker Nodes: ' },
                      { type: 'text', text: 'kubelet, kube-proxy, and container runtime (containerd).' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }) as any,
      isPinned: true,
      tags: {
        create: [
          { tagId: tagMap['Kubernetes'] },
          { tagId: tagMap['Docker'] },
          { tagId: tagMap['DevOps'] },
        ],
      },
    },
  });

  const note2 = await prisma.note.create({
    data: {
      userId: user.id,
      folderId: aiFolder.id,
      title: 'RAG Architecture & Vector Retrieval Principles',
      contentText:
        'Retrieval-Augmented Generation (RAG) mitigates LLM hallucinations and grounds responses in proprietary user documents. The ingestion pipeline splits documents recursively using semantic boundary chunking (typically 500-1000 tokens with 10-20% overlap). Chunks are transformed into dense vector representations using models such as all-MiniLM-L6-v2 or OpenAI text-embedding-3-small and stored in Qdrant with user_id payload isolation. During inference, hybrid search combines dense vector cosine distance with sparse BM25 keyword matching via Reciprocal Rank Fusion (RRF) before feeding top passages as context to the LLM.',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'RAG Architecture & Vector Retrieval Principles' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Retrieval-Augmented Generation (RAG) mitigates LLM hallucinations and grounds responses in user documents.',
              },
            ],
          },
        ],
      }) as any,
      isPinned: true,
      tags: {
        create: [
          { tagId: tagMap['RAG'] },
          { tagId: tagMap['VectorDB'] },
        ],
      },
    },
  });

  const note3 = await prisma.note.create({
    data: {
      userId: user.id,
      folderId: archFolder.id,
      title: 'Resilience Patterns for Distributed Microservices',
      contentText:
        'In distributed architectures, failures are inevitable. Key resilience patterns include: 1) Circuit Breakers (preventing cascading failures by tripping open when error rates exceed thresholds), 2) Exponential Backoff with Jitter for retries, 3) Bulkheads to isolate resource pools, and 4) Distributed Tracing with OpenTelemetry to track latency bottlenecks across downstream dependencies.',
      contentJson: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Resilience Patterns for Distributed Microservices' }],
          },
        ],
      }) as any,
      isPinned: false,
      tags: {
        create: [
          { tagId: tagMap['Microservices'] },
        ],
      },
    },
  });

  console.log(`[Seed] Seeded 3 notes: ${note1.id}, ${note2.id}, ${note3.id}`);
  console.log('[Seed] Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
