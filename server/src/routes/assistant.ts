import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { processAssistantQuery, ChatMessage } from '../services/assistant.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(1000),
      })
    )
    .optional()
    .default([]),
});

// POST /api/assistant/chat
router.post('/assistant/chat', async (req: Request, res: Response) => {
  const parseResult = chatSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid chat payload',
        details: parseResult.error.format(),
      },
    });
  }

  const { message, history } = parseResult.data;

  try {
    const response = await processAssistantQuery(message, history as ChatMessage[]);
    res.json(response);
  } catch (err: any) {
    console.error('Error processing assistant chat:', err);
    res.status(500).json({
      error: {
        code: 'ASSISTANT_ERROR',
        message: 'Failed to process assistant message',
      },
    });
  }
});

export default router;
