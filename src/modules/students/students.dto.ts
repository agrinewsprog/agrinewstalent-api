import { z } from 'zod';

export const redeemInviteSchema = z.object({
  body: z.object({
    inviteCode: z
      .string()
      .min(6, 'Invite code must be at least 6 characters')
      .max(20, 'Invite code must be at most 20 characters')
      .transform((v) => v.trim().toUpperCase()),
  }),
});
