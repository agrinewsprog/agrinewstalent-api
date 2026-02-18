import { z } from 'zod';

// ============================================================
// CREATE AGREEMENT
// ============================================================

export const createAgreementSchema = z.object({
  universityId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  title: z.string().min(5).max(255),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

export type CreateAgreementDto = z.infer<typeof createAgreementSchema>;

// ============================================================
// UPDATE AGREEMENT STATUS
// ============================================================

export const updateAgreementStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'CLOSED']),
});

export type UpdateAgreementStatusDto = z.infer<typeof updateAgreementStatusSchema>;

// ============================================================
// LIST AGREEMENTS
// ============================================================

export const listAgreementsSchema = z.object({
  page: z.string().transform((val) => parseInt(val)).pipe(z.number().min(1)).optional().default(() => 1),
  limit: z.string().transform((val) => parseInt(val)).pipe(z.number().min(1).max(100)).optional().default(() => 20),
  status: z.enum(['PENDING', 'ACTIVE', 'CLOSED']).optional(),
  universityId: z.string().transform((val) => parseInt(val)).optional(),
  companyId: z.string().transform((val) => parseInt(val)).optional(),
});

export type ListAgreementsDto = z.infer<typeof listAgreementsSchema>;
