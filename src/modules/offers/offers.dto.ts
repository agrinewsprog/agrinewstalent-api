import { z } from 'zod';
import { JobOfferStatus } from '@prisma/client';

export const createOfferSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    requirements: z.string().optional(),
    location: z.string().optional(),
    workMode: z.enum(['remote', 'hybrid', 'onsite']).optional(),
    salary: z.string().optional(),
    contractType: z.enum(['full-time', 'part-time', 'internship', 'freelance']).optional(),
    experienceLevel: z.enum(['junior', 'mid', 'senior', 'any']).optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

export const updateOfferSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(10).optional(),
    requirements: z.string().optional(),
    location: z.string().optional(),
    workMode: z.enum(['remote', 'hybrid', 'onsite']).optional(),
    salary: z.string().optional(),
    contractType: z.enum(['full-time', 'part-time', 'internship', 'freelance']).optional(),
    experienceLevel: z.enum(['junior', 'mid', 'senior', 'any']).optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

export const getOffersSchema = z.object({
  query: z.object({
    status: z.nativeEnum(JobOfferStatus).optional(),
    companyId: z.string().regex(/^\d+$/).transform(Number).optional(),
    location: z.string().optional(),
    workMode: z.enum(['remote', 'hybrid', 'onsite']).optional(),
    contractType: z.enum(['full-time', 'part-time', 'internship', 'freelance']).optional(),
    experienceLevel: z.enum(['junior', 'mid', 'senior', 'any']).optional(),
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default(() => 1),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default(() => 10),
  }),
});

export type CreateOfferDto = z.infer<typeof createOfferSchema>['body'];
export type UpdateOfferDto = z.infer<typeof updateOfferSchema>['body'];
export type GetOffersDto = z.infer<typeof getOffersSchema>['query'];
