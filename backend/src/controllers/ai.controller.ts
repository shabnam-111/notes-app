import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { aiServiceClient } from '../services/aiService.client';

const analyzeNoteSchema = z.object({
  noteId: z.string().uuid().optional(),
  title: z.string().optional().default(''),
  contentText: z.string().optional().default(''),
});

const acceptTagsSchema = z.object({
  noteId: z.string().uuid(),
  tags: z.array(z.string()).min(1),
  category: z.string().optional(),
});

export const analyzeNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = analyzeNoteSchema.parse(req.body);

    let title = body.title;
    let contentText = body.contentText;

    if (body.noteId) {
      const note = await prisma.note.findFirst({
        where: { id: body.noteId, userId },
      });
      if (!note) throw new AppError('Note not found', 404);
      title = note.title;
      contentText = note.contentText;
    }

    if (!title && !contentText) {
      throw new AppError('Note content or title is required for analysis', 400);
    }

    // Retrieve existing user tags to encourage reuse
    const userTags = await prisma.tag.findMany({
      where: { userId },
      select: { name: true },
      take: 50,
    });
    const existingTags = userTags.map((t) => t.name);

    const analysis = await aiServiceClient.analyzeNote({
      userId,
      title,
      contentText,
      existingTags,
    });

    // Resolve related notes details if any IDs returned
    let relatedNotes: any[] = [];
    if (analysis.relatedNoteIds && analysis.relatedNoteIds.length > 0) {
      relatedNotes = await prisma.note.findMany({
        where: {
          id: { in: analysis.relatedNoteIds },
          userId,
          isArchived: false,
        },
        select: {
          id: true,
          title: true,
          updatedAt: true,
        },
      });
    }

    res.json({
      success: true,
      data: {
        category: analysis.category,
        suggestedTags: analysis.tags,
        description: analysis.description,
        keywords: analysis.keywords,
        relatedNotes,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const acceptTags = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { noteId, tags, category } = acceptTagsSchema.parse(req.body);

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!note) throw new AppError('Note not found', 404);

    // If category is provided, check if a folder with that name exists or create one
    if (category && category.trim()) {
      const folder = await prisma.folder.upsert({
        where: {
          id: note.folderId || '00000000-0000-0000-0000-000000000000',
        },
        create: {
          userId,
          name: category.trim(),
        },
        update: {},
      }).catch(async () => {
        // If upsert fails on folderId, find by name or create
        const existingFolder = await prisma.folder.findFirst({
          where: { userId, name: category.trim() },
        });
        if (existingFolder) return existingFolder;
        return prisma.folder.create({
          data: { userId, name: category.trim() },
        });
      });

      if (folder) {
        await prisma.note.update({
          where: { id: noteId },
          data: { folderId: folder.id },
        });
      }
    }

    // Attach accepted tags
    for (const tagName of tags) {
      const trimmed = tagName.trim();
      if (!trimmed) continue;
      const tag = await prisma.tag.upsert({
        where: { userId_name: { userId, name: trimmed } },
        create: { userId, name: trimmed },
        update: {},
      });

      await prisma.noteTag.upsert({
        where: { noteId_tagId: { noteId, tagId: tag.id } },
        create: { noteId, tagId: tag.id },
        update: {},
      });
    }

    const updatedNote = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        folder: true,
        tags: { include: { tag: true } },
      },
    });

    res.json({
      success: true,
      message: 'Tags and category updated successfully',
      data: {
        ...updatedNote,
        tags: updatedNote?.tags.map((t) => t.tag) || [],
      },
    });
  } catch (error) {
    next(error);
  }
};
