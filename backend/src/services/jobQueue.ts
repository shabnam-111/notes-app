import { prisma } from '../config/prisma';
import { aiServiceClient } from './aiService.client';

export const jobQueue = {
  /**
   * Enqueues and triggers asynchronous note vector indexing
   */
  async enqueueNoteIndexing(userId: string, noteId: string): Promise<void> {
    // Run asynchronously without blocking HTTP response
    setImmediate(async () => {
      try {
        const note = await prisma.note.findFirst({
          where: { id: noteId, userId },
          include: { tags: { include: { tag: true } } },
        });

        if (!note || note.isArchived) return;

        const tagNames = note.tags.map((t) => t.tag.name);
        await aiServiceClient.indexNote({
          userId,
          noteId: note.id,
          title: note.title,
          contentText: note.contentText,
          tags: tagNames,
        });
      } catch (err) {
        console.error(`[JobQueue] Note indexing error for ${noteId}:`, err);
      }
    });
  },

  /**
   * Enqueues document processing (PDF, DOCX, TXT, MD)
   */
  async enqueueDocumentProcessing(documentId: string, userId: string): Promise<void> {
    // Record AI Job in DB
    const job = await prisma.aiJob.create({
      data: {
        userId,
        jobType: 'doc_processing',
        targetId: documentId,
        status: 'pending',
      },
    });

    setImmediate(async () => {
      try {
        await prisma.aiJob.update({
          where: { id: job.id },
          data: { status: 'running' },
        });

        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'processing' },
        });

        const doc = await prisma.document.findFirst({
          where: { id: documentId, userId },
        });

        if (!doc) {
          throw new Error('Document record not found');
        }

        const result = await aiServiceClient.processDocument({
          userId,
          documentId: doc.id,
          filePath: doc.filePath,
          fileType: doc.fileType,
          filename: doc.filename,
        });

        if (result.success) {
          await prisma.document.update({
            where: { id: documentId },
            data: { status: 'indexed', errorMessage: null },
          });

          await prisma.aiJob.update({
            where: { id: job.id },
            data: {
              status: 'completed',
              result: JSON.stringify({ chunksCount: result.chunksCount }) as any,
            },
          });
        } else {
          await prisma.document.update({
            where: { id: documentId },
            data: { status: 'failed', errorMessage: result.error || 'Extraction failed' },
          });

          await prisma.aiJob.update({
            where: { id: job.id },
            data: { status: 'failed', errorMessage: result.error },
          });
        }
      } catch (err: any) {
        console.error(`[JobQueue] Doc processing error for ${documentId}:`, err);
        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'failed', errorMessage: err.message },
        });

        await prisma.aiJob.update({
          where: { id: job.id },
          data: { status: 'failed', errorMessage: err.message },
        });
      }
    });
  },
};
