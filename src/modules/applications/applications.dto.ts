import { z } from 'zod';
import { ApplicationStatus } from '@prisma/client';

export const applyToOfferSchema = z.object({
  body: z.object({
    coverLetter: z.string().optional(),
    resumeUrl: z.string().url().optional(),
  }),
});

export const updateApplicationStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ApplicationStatus, {
      message: 'Invalid application status',
    }),
  }),
});

export const createNoteSchema = z.object({
  body: z.object({
    note: z.string().min(1, 'Note cannot be empty'),
    isPrivate: z.boolean().optional().default(true),
  }),
});

export const getApplicationsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(ApplicationStatus).optional(),
    offerId: z.string().regex(/^\d+$/).transform(Number).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default(() => 1),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default(() => 20),
  }),
});

export type ApplyToOfferDto = z.infer<typeof applyToOfferSchema>['body'];
export type UpdateApplicationStatusDto = z.infer<typeof updateApplicationStatusSchema>['body'];
export type CreateNoteDto = z.infer<typeof createNoteSchema>['body'];
export type GetApplicationsDto = z.infer<typeof getApplicationsSchema>['query'];
