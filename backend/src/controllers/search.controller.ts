import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { aiServiceClient } from '../services/aiService.client';

const searchSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
  filterType: z.enum(['all', 'notes', 'documents']).optional().default('all'),
  folderId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
});

export const searchKnowledge = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = searchSchema.parse(req.body);

    const searchResult = await aiServiceClient.search({
      userId,
      query: body.query,
      filterType: body.filterType,
      folderId: body.folderId,
      tagId: body.tagId,
      limit: body.limit,
      offset: body.offset,
    });

    res.json({
      success: true,
      query: body.query,
      total: searchResult.total,
      results: searchResult.results,
    });
  } catch (error) {
    next(error);
  }
};
