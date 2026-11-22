import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error';
import { aiServiceClient } from '../services/aiService.client';

const createSessionSchema = z.object({
  title: z.string().optional().default('New Conversation'),
});

const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
});

export const listSessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        messageCount: s._count.messages,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title } = createSessionSchema.parse(req.body);

    const session = await prisma.chatSession.create({
      data: {
        userId,
        title,
      },
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new AppError('Chat session not found', 404);
    }

    const formattedMessages = session.messages.map((m) => {
      let parsedCitations = m.citations;
      if (typeof parsedCitations === 'string') {
        try {
          parsedCitations = JSON.parse(parsedCitations);
        } catch {}
      }
      return {
        ...m,
        citations: parsedCitations,
      };
    });

    res.json({
      success: true,
      data: {
        ...session,
        messages: formattedMessages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.chatSession.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError('Chat session not found', 404);

    await prisma.chatSession.delete({ where: { id } });

    res.json({ success: true, message: 'Chat session deleted' });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: sessionId } = req.params;
    const { message } = sendMessageSchema.parse(req.body);

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20, // last 20 messages for conversational history
        },
      },
    });

    if (!session) {
      throw new AppError('Chat session not found', 404);
    }

    // Save user message
    const userMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: message,
      },
    });

    // Format conversational history
    const history = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Call RAG microservice with user isolation
    const ragResult = await aiServiceClient.chatWithNotes({
      userId,
      message,
      history,
    });

    // Save assistant message with citations
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: ragResult.answer,
        citations: JSON.stringify(ragResult.citations) as any,
      },
    });

    // Auto-update session title if it's the first message and still titled 'New Conversation'
    if (session.messages.length === 0 && session.title === 'New Conversation') {
      const autoTitle = message.slice(0, 40) + (message.length > 40 ? '...' : '');
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: autoTitle },
      });
    } else {
      // Touch updatedAt
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });
    }

    res.json({
      success: true,
      userMessage: userMsg,
      assistantMessage: {
        ...assistantMsg,
        citations: ragResult.citations,
      },
      fromKnowledgeBase: ragResult.fromKnowledgeBase,
    });
  } catch (error) {
    next(error);
  }
};
