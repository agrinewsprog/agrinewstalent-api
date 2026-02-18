import { z } from 'zod';

// ============================================================
// CREATE PROMOTION
// ============================================================

export const createPromotionSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  description: z.string().min(10),
  discountPercent: z.number().int().min(1).max(100).optional(),
  discountAmount: z.number().positive().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  targetRole: z.enum(['STUDENT', 'COMPANY', 'UNIVERSITY', 'SUPER_ADMIN']).optional(),
  targetUniversityId: z.number().int().positive().optional(),
  maxUses: z.number().int().positive().optional(),
}).refine(
  (data) => data.discountPercent || data.discountAmount,
  { message: 'Either discountPercent or discountAmount must be provided' }
);

export type CreatePromotionDto = z.infer<typeof createPromotionSchema>;

// ============================================================
// UPDATE PROMOTION STATUS
// ============================================================

export const updatePromotionStatusSchema = z.object({
  isActive: z.boolean(),
});

export type UpdatePromotionStatusDto = z.infer<typeof updatePromotionStatusSchema>;

// ============================================================
// LIST PROMOTIONS
// ============================================================

export const listPromotionsSchema = z.object({
  page: z.string().transform((val) => parseInt(val)).pipe(z.number().min(1)).optional().default(() => 1),
  limit: z.string().transform((val) => parseInt(val)).pipe(z.number().min(1).max(100)).optional().default(() => 20),
  isActive: z.string().transform((val) => val === 'true').optional(),
  targetRole: z.enum(['STUDENT', 'COMPANY', 'UNIVERSITY', 'SUPER_ADMIN']).optional(),
});

export type ListPromotionsDto = z.infer<typeof listPromotionsSchema>;
