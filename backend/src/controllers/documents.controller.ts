import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { jobQueue } from '../services/jobQueue';
import { aiServiceClient } from '../services/aiService.client';

export const uploadDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      throw new AppError('No file uploaded or file rejected by validator', 400);
    }

    const { originalname, filename, path: filePath, size } = req.file;
    const ext = path.extname(originalname).replace('.', '').toLowerCase();
    const title = path.basename(originalname, path.extname(originalname));

    const document = await prisma.document.create({
      data: {
        userId,
        title,
        filename: originalname,
        filePath,
        fileType: ext,
        fileSize: size,
        status: 'uploaded',
      },
    });

    // Enqueue async processing in background
    jobQueue.enqueueDocumentProcessing(document.id, userId);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully. Background processing initiated.',
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

export const listDocuments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { status } = req.query as { status?: string };

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const docs = await prisma.document.findMany({
      where,
      include: {
        _count: {
          select: { chunks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        status: doc.status,
        errorMessage: doc.errorMessage,
        chunksCount: doc._count.chunks,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const doc = await prisma.document.findFirst({
      where: { id, userId },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          take: 50, // Preview first 50 chunks
        },
      },
    });

    if (!doc) {
      throw new AppError('Document not found', 404);
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const doc = await prisma.document.findFirst({
      where: { id, userId },
    });

    if (!doc) {
      throw new AppError('Document not found', 404);
    }

    // Remove physical file from disk if present
    if (fs.existsSync(doc.filePath)) {
      try {
        fs.unlinkSync(doc.filePath);
      } catch (err) {
        console.warn(`[DocDelete] Unable to unlink physical file ${doc.filePath}`);
      }
    }

    // Delete DB record (cascades to chunks)
    await prisma.document.delete({ where: { id } });

    // Remove vectors from Qdrant
    aiServiceClient.deleteDocumentVectors(userId, id);

    res.json({ success: true, message: 'Document and all indexed chunks deleted' });
  } catch (error) {
    next(error);
  }
};
