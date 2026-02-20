import { z } from 'zod';

export const limitCommentaryQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
})

export const createCommentarySchema = z.object({
    minutes: z.number().int().nonnegative().max(32767),
    sequence: z.number().int().optional(),
    period: z.string().optional(),
    eventType: z.string().optional(),
    actor: z.string().optional(),
    team: z.string().optional(),
    message: z.string().min(1),
    metadata: z.record( z.string(), z.any()).optional(),
    tags: z.array(z.string()).optional(),
})