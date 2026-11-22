import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error';

const folderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100),
  color: z.string().optional().default('#8B5CF6'),
  parentId: z.string().uuid().nullable().optional(),
});

export const listFolders = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    const folders = await prisma.folder.findMany({
      where: { userId },
      include: {
        _count: {
          select: { notes: { where: { isArchived: false } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: folders.map((f) => ({
        id: f.id,
        name: f.name,
        color: f.color,
        parentId: f.parentId,
        notesCount: f._count.notes,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createFolder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, color, parentId } = folderSchema.parse(req.body);

    if (parentId) {
      const parent = await prisma.folder.findFirst({ where: { id: parentId, userId } });
      if (!parent) throw new AppError('Parent folder not found', 404);
    }

    const folder = await prisma.folder.create({
      data: {
        userId,
        name,
        color,
        parentId: parentId || null,
      },
    });

    res.status(201).json({ success: true, data: folder });
  } catch (error) {
    next(error);
  }
};

export const updateFolder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, color, parentId } = folderSchema.parse(req.body);

    const existing = await prisma.folder.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError('Folder not found', 404);

    if (parentId && parentId === id) {
      throw new AppError('Folder cannot be its own parent', 400);
    }

    const updated = await prisma.folder.update({
      where: { id },
      data: {
        name,
        color,
        parentId: parentId || null,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteFolder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.folder.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError('Folder not found', 404);

    // Any notes in this folder have folder_id set to null automatically by relation onDelete: SetNull
    await prisma.folder.delete({ where: { id } });

    res.json({ success: true, message: 'Folder deleted successfully' });
  } catch (error) {
    next(error);
  }
};
