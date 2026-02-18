import { z } from 'zod';
import { ApplicationStatus } from '@prisma/client';

export const listCandidatesSchema = z.object({
  query: z.object({
    status: z.nativeEnum(ApplicationStatus).optional(),
    offerId: z.string().transform(val => parseInt(val)).optional(),
    search: z.string().optional(),
    page: z.string().optional().default('1').transform(val => parseInt(val)),
    limit: z.string().optional().default('10').transform(val => parseInt(val)),
  }),
});

export const getCandidateByIdSchema = z.object({
  params: z.object({
    id: z.string().transform(val => parseInt(val)),
  }),
});

export type ListCandidatesDto = z.infer<typeof listCandidatesSchema>['query'];
export type GetCandidateByIdDto = z.infer<typeof getCandidateByIdSchema>['params'];
