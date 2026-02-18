import { z } from 'zod';

// Create program
export const createProgramSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    description: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    requiresCourseId: z.number().int().positive().optional(),
    maxStudents: z.number().int().positive().optional(),
  }),
});

export type CreateProgramDto = z.infer<typeof createProgramSchema>['body'];

// Company shows interest
export const showInterestSchema = z.object({
  body: z.object({
    message: z.string().optional(),
  }),
});

export type ShowInterestDto = z.infer<typeof showInterestSchema>['body'];

// Update company status in program
export const updateCompanyStatusSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED'], {
      message: 'Invalid status. Must be APPROVED or REJECTED',
    }),
  }),
});

export type UpdateCompanyStatusDto = z.infer<typeof updateCompanyStatusSchema>['body'];

// Create offer in program
export const createProgramOfferSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10),
    requirements: z.string().optional(),
    location: z.string().optional(),
    salary: z.string().optional(),
    workMode: z.enum(['REMOTE', 'HYBRID', 'ON_SITE']).optional(),
    contractType: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'FREELANCE']).optional(),
    experienceLevel: z.enum(['JUNIOR', 'SEMI_SENIOR', 'SENIOR', 'EXPERT']).optional(),
    maxApplicants: z.number().int().positive().optional(),
  }),
});

export type CreateProgramOfferDto = z.infer<typeof createProgramOfferSchema>['body'];

// Update offer status
export const updateOfferStatusSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED'], {
      message: 'Invalid status. Must be APPROVED or REJECTED',
    }),
  }),
});

export type UpdateOfferStatusDto = z.infer<typeof updateOfferStatusSchema>['body'];

// Apply to program offer
export const applyToProgramOfferSchema = z.object({
  body: z.object({
    coverLetter: z.string().optional(),
    resumeUrl: z.string().url().optional(),
  }),
});

export type ApplyToProgramOfferDto = z.infer<typeof applyToProgramOfferSchema>['body'];

// Get programs filters
export const getProgramsSchema = z.object({
  query: z.object({
    isActive: z.string().transform((val) => val === 'true').optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default(() => 1),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default(() => 20),
  }),
});

export type GetProgramsDto = z.infer<typeof getProgramsSchema>['query'];

// Get program applications
export const getProgramApplicationsSchema = z.object({
  query: z.object({
    status: z.enum(['SUBMITTED', 'REVIEWED', 'ACCEPTED', 'REJECTED']).optional(),
    offerId: z.string().regex(/^\d+$/).transform(Number).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default(() => 1),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default(() => 20),
  }),
});

export type GetProgramApplicationsDto = z.infer<typeof getProgramApplicationsSchema>['query'];
