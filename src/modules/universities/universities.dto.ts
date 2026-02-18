import { z } from 'zod';

// Create invite code
export const createInviteSchema = z.object({
  body: z.object({
    maxUses: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

export type CreateInviteDto = z.infer<typeof createInviteSchema>['body'];

// Redeem invite code
export const redeemInviteSchema = z.object({
  body: z.object({
    inviteCode: z.string().min(6).max(20),
  }),
});

export type RedeemInviteDto = z.infer<typeof redeemInviteSchema>['body'];

// Get students filters
export const getStudentsSchema = z.object({
  query: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default(() => 1),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default(() => 20),
  }),
});

export type GetStudentsDto = z.infer<typeof getStudentsSchema>['query'];
