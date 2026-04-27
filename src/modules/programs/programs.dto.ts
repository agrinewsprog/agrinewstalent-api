import { z } from 'zod';

// ── Flexible date helper (acepta datetime con/sin timezone, date-only) ───────
const flexDate = z
  .string()
  .min(1, 'Date is required')
  .refine((v) => !isNaN(new Date(v).getTime()), { message: 'Invalid date format' });

const flexDateOpt = z
  .string()
  .optional()
  .refine((v) => v === undefined || v === '' || !isNaN(new Date(v).getTime()), {
    message: 'Invalid date format',
  });

// ── Create program ─────────────────────────────────────────────────
export const createProgramSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    description: z.string().optional().nullable(),
    rules: z.string().optional().nullable(),
    // status opcional: ACTIVE (default) o CLOSED
    status: z.enum(['ACTIVE', 'CLOSED']).optional(),
    // startDate / endDate opcionales: el frontend no siempre los envía;
    // el service aplica defaults (hoy / +1 año) si faltan.
    startDate: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      flexDate.optional(),
    ),
    endDate: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      flexDate.optional(),
    ),
    requiresCourseId: z.preprocess(
      (v) => (v === '' || v == null ? undefined : Number(v)),
      z.number().int().positive().optional(),
    ),
    maxStudents: z.preprocess(
      (v) => (v === '' || v == null ? undefined : Number(v)),
      z.number().int().positive().optional(),
    ),
  }),
});
export type CreateProgramDto = z.infer<typeof createProgramSchema>['body'];

// ── Update program ─────────────────────────────────────────────────
export const updateProgramSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().optional().nullable(),
    rules: z.string().optional().nullable(),
    startDate: flexDateOpt,
    endDate: flexDateOpt,
    status: z.enum(['ACTIVE', 'CLOSED']).optional(),
    requiresCourseId: z.preprocess(
      (v) => (v === '' || v == null ? undefined : Number(v)),
      z.number().int().positive().optional().nullable(),
    ),
    maxStudents: z.preprocess(
      (v) => (v === '' || v == null ? undefined : Number(v)),
      z.number().int().positive().optional().nullable(),
    ),
  }),
});
export type UpdateProgramDto = z.infer<typeof updateProgramSchema>['body'];

// ── Company interest ───────────────────────────────────────────────
export const showInterestSchema = z.object({
  body: z.object({
    message: z.string().optional(),
  }),
});
export type ShowInterestDto = z.infer<typeof showInterestSchema>['body'];

// ── Update company status ──────────────────────────────────────────
export const updateCompanyStatusSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED', 'PENDING'], {
      message: 'Invalid status. Must be APPROVED, REJECTED or PENDING',
    }),
  }),
});
export type UpdateCompanyStatusDto = z.infer<typeof updateCompanyStatusSchema>['body'];

// ── Create offer in program ────────────────────────────────────────
const createProgramOfferBodySchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  requirements: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ON_SITE']).optional(),
  contractType: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'FREELANCE']).optional(),
  experienceLevel: z.enum(['JUNIOR', 'SEMI_SENIOR', 'SENIOR', 'EXPERT']).optional(),
  maxApplicants: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
});

export const createProgramOfferSchema = z.object({
  params: z.object({
    programId: z.string().transform((val) => parseInt(val, 10)).refine((val) => Number.isInteger(val) && val > 0, {
      message: 'Invalid program ID',
    }),
  }),
  body: createProgramOfferBodySchema,
});
export type CreateProgramOfferDto = z.infer<typeof createProgramOfferBodySchema>;

// ── Update offer status ────────────────────────────────────────────
export const updateOfferStatusSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED'], {
      message: 'Invalid status. Must be APPROVED or REJECTED',
    }),
  }),
});
export type UpdateOfferStatusDto = z.infer<typeof updateOfferStatusSchema>['body'];

// ── Apply to program offer ─────────────────────────────────────────
export const applyToProgramOfferSchema = z.object({
  body: z.object({
    coverLetter: z.string().optional(),
    resumeUrl: z.string().url().optional(),
  }),
});
export type ApplyToProgramOfferDto = z.infer<typeof applyToProgramOfferSchema>['body'];

// ── Get programs list filters ──────────────────────────────────────
export const getProgramsSchema = z.object({
  query: z.object({
    status: z.enum(['ACTIVE', 'CLOSED']).optional(),
    isActive: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    page: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .optional()
      .default(() => 1),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .optional()
      .default(() => 20),
  }),
});
export type GetProgramsDto = z.infer<typeof getProgramsSchema>['query'];

// ── Get program applications filters ──────────────────────────────
export const getProgramApplicationsSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'INTERVIEW', 'HIRED', 'REJECTED']).optional(),
    offerId: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .optional(),
    page: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .optional()
      .default(() => 1),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .optional()
      .default(() => 20),
  }),
});
export type GetProgramApplicationsDto = z.infer<typeof getProgramApplicationsSchema>['query'];
