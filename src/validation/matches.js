import { z } from 'zod';

// MATCH_STATUS constant (keys uppercase, values lowercase)
export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

// Helper to validate strict ISO datetime (must match toISOString())
const isIsoString = (s) => {
  try {
    const d = new Date(s);
    return !Number.isNaN(d.getTime()) && d.toISOString() === s;
  } catch (e) {
    return false;
  }
};

// listMatchesQuerySchema: optional coerced positive integer limit, max 100
export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// matchIdParamSchema: required id as coerced positive integer
export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const isoDateString = z.string().refine((val) => !isNaN(Date.parse(val)), {message: "In"})

// createMatchSchema
export const createMatchSchema = z
  .object({
    sport: z.string().min(1, 'sport is required'),
    homeTeam: z.string().min(1, 'homeTeam is required'),
    awayTeam: z.string().min(1, 'awayTeam is required'),
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime(),
    homeScore: z.coerce.number().int().min(0).optional(),
    awayScore: z.coerce.number().int().min(0).optional(),
  })
  .refine((data) => isIsoString(data.startTime), {
    message: 'startTime must be a valid ISO datetime string',
    path: ['startTime'],
  })
  .refine((data) => isIsoString(data.endTime), {
    message: 'endTime must be a valid ISO datetime string',
    path: ['endTime'],
  })
  .superRefine((data, ctx) => {
    try {
      const s = new Date(data.startTime);
      const e = new Date(data.endTime);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        return;
      }
      if (e.getTime() <= s.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'endTime must be after startTime',
          path: ['endTime'],
        });
      }
    } catch (e) {
      // ignore parse errors; refinements above will report invalid ISO
    }
  });

// updateScoreSchema: requires homeScore and awayScore as coerced non-negative integers
export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});
