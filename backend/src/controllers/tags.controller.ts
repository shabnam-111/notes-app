import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error';

const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50),
  color: z.string().optional().default('#A78BFA'),
});

export const listTags = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    const tags = await prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { notes: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        notesCount: t._count.notes,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createTag = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, color } = createTagSchema.parse(req.body);

    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId, name: name.trim() } },
      create: { userId, name: name.trim(), color },
      update: { color },
    });

    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    next(error);
  }
};

export const deleteTag = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.tag.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError('Tag not found', 404);

    await prisma.tag.delete({ where: { id } });

    res.json({ success: true, message: 'Tag deleted successfully' });
  } catch (error) {
    next(error);
  }
};
