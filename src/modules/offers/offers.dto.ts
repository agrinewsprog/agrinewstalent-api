import { z } from 'zod';
import { JobOfferStatus } from '@prisma/client';

export const createOfferSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    requirements: z.string().optional(),
    location: z.string().optional(),
    salary: z.string().optional(),
    contractType: z.string().optional(),
    experienceLevel: z.string().optional(),
  }),
});

export const updateOfferSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    requirements: z.string().optional(),
    location: z.string().optional(),
    salary: z.string().optional(),
    contractType: z.string().optional(),
    experienceLevel: z.string().optional(),
    status: z.nativeEnum(JobOfferStatus).optional(),
  }),
});

export type CreateOfferDto = z.infer<typeof createOfferSchema>['body'];
export type UpdateOfferDto = z.infer<typeof updateOfferSchema>['body'];
