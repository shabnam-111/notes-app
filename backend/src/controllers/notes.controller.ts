import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { jobQueue } from '../services/jobQueue';
import { aiServiceClient } from '../services/aiService.client';

const createNoteSchema = z.object({
  title: z.string().optional().default('Untitled Note'),
  contentJson: z.any().optional(),
  contentText: z.string().optional().default(''),
  folderId: z.string().uuid().nullable().optional(),
  isPinned: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
});

const updateNoteSchema = z.object({
  title: z.string().optional(),
  contentJson: z.any().optional(),
  contentText: z.string().optional(),
  folderId: z.string().uuid().nullable().optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  version: z.number().int().optional(),
});

function formatNoteData(note: any) {
  if (!note) return note;
  let parsedJson = note.contentJson;
  if (typeof parsedJson === 'string') {
    try {
      parsedJson = JSON.parse(parsedJson);
    } catch {
      // keep as is
    }
  }
  return {
    ...note,
    contentJson: parsedJson,
    tags: note.tags ? note.tags.map((t: any) => t.tag || t) : [],
  };
}

export const listNotes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      folderId,
      tagId,
      isPinned,
      isArchived,
      search,
      page = '1',
      limit = '20',
      sort = 'updatedAt',
      order = 'desc',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      userId,
      isArchived: isArchived === 'true' ? true : isArchived === 'all' ? undefined : false,
    };

    if (folderId) {
      where.folderId = folderId === 'null' ? null : folderId;
    }

    if (isPinned !== undefined) {
      where.isPinned = isPinned === 'true';
    }

    if (tagId) {
      where.tags = {
        some: {
          tagId,
        },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { contentText: { contains: search } },
      ];
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          folder: { select: { id: true, name: true, color: true } },
          tags: { include: { tag: true } },
        },
        orderBy: [
          { isPinned: 'desc' },
          { [sort]: order === 'asc' ? 'asc' : 'desc' },
        ],
        skip,
        take: limitNum,
      }),
      prisma.note.count({ where }),
    ]);

    res.json({
      success: true,
      data: notes.map(formatNoteData),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const note = await prisma.note.findFirst({
      where: { id, userId },
      include: {
        folder: { select: { id: true, name: true, color: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!note) {
      throw new AppError('Note not found', 404);
    }

    res.json({
      success: true,
      data: formatNoteData(note),
    });
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = createNoteSchema.parse(req.body);

    const serializedContentJson =
      data.contentJson !== undefined && data.contentJson !== null
        ? typeof data.contentJson === 'string'
          ? data.contentJson
          : JSON.stringify(data.contentJson)
        : null;

    const note = await prisma.note.create({
      data: {
        userId,
        title: data.title,
        contentJson: serializedContentJson as any,
        contentText: data.contentText || '',
        folderId: data.folderId || null,
        isPinned: data.isPinned,
        version: 1,
        lastEditedAt: new Date(),
      },
    });

    // Handle initial tags if provided
    if (data.tags && data.tags.length > 0) {
      for (const tagName of data.tags) {
        const trimmed = tagName.trim();
        if (!trimmed) continue;
        const tag = await prisma.tag.upsert({
          where: { userId_name: { userId, name: trimmed } },
          create: { userId, name: trimmed },
          update: {},
        });
        await prisma.noteTag.create({
          data: { noteId: note.id, tagId: tag.id },
        });
      }
    }

    // Trigger vector indexing in background
    jobQueue.enqueueNoteIndexing(userId, note.id);

    const createdWithTags = await prisma.note.findUnique({
      where: { id: note.id },
      include: {
        folder: { select: { id: true, name: true, color: true } },
        tags: { include: { tag: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: formatNoteData(createdWithTags),
    });
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = updateNoteSchema.parse(req.body);

    const existing = await prisma.note.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError('Note not found', 404);
    }

    // Optimistic Concurrency Control
    if (data.version !== undefined && data.version !== existing.version) {
      throw new AppError(
        'Concurrent edit detected. Another update occurred while editing this note. Please reload and merge changes.',
        409,
        'CONCURRENT_MODIFICATION'
      );
    }

    const serializedContentJson =
      data.contentJson !== undefined
        ? typeof data.contentJson === 'string'
          ? data.contentJson
          : JSON.stringify(data.contentJson)
        : undefined;

    await prisma.note.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(serializedContentJson !== undefined && { contentJson: serializedContentJson as any }),
        ...(data.contentText !== undefined && { contentText: data.contentText }),
        ...(data.folderId !== undefined && { folderId: data.folderId }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
        ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
        version: { increment: 1 },
        lastEditedAt: new Date(),
      },
    });

    // Update tags if provided
    if (data.tags !== undefined) {
      await prisma.noteTag.deleteMany({ where: { noteId: id } });
      for (const tagName of data.tags) {
        const trimmed = tagName.trim();
        if (!trimmed) continue;
        const tag = await prisma.tag.upsert({
          where: { userId_name: { userId, name: trimmed } },
          create: { userId, name: trimmed },
          update: {},
        });
        await prisma.noteTag.create({
          data: { noteId: id, tagId: tag.id },
        });
      }
    }

    // Asynchronously update vector in Qdrant if content or title changed
    if (data.title !== undefined || data.contentText !== undefined || data.tags !== undefined) {
      jobQueue.enqueueNoteIndexing(userId, id);
    }

    const refreshed = await prisma.note.findUnique({
      where: { id },
      include: {
        folder: { select: { id: true, name: true, color: true } },
        tags: { include: { tag: true } },
      },
    });

    res.json({
      success: true,
      data: formatNoteData(refreshed),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.note.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError('Note not found', 404);
    }

    await prisma.note.delete({ where: { id } });

    // Asynchronously delete vector embedding from Qdrant
    aiServiceClient.deleteNoteVector(userId, id);

    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const togglePin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.note.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError('Note not found', 404);

    const updated = await prisma.note.update({
      where: { id },
      data: { isPinned: !existing.isPinned },
    });

    res.json({ success: true, isPinned: updated.isPinned });
  } catch (error) {
    next(error);
  }
};

export const toggleArchive = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.note.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError('Note not found', 404);

    const willArchive = !existing.isArchived;
    const updated = await prisma.note.update({
      where: { id },
      data: { isArchived: willArchive },
    });

    if (willArchive) {
      // Remove from vector search index when archived
      aiServiceClient.deleteNoteVector(userId, id);
    } else {
      // Re-index when restored
      jobQueue.enqueueNoteIndexing(userId, id);
    }

    res.json({ success: true, isArchived: updated.isArchived });
  } catch (error) {
    next(error);
  }
};
