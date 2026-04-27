import { z } from 'zod';

// ============================================================
// CREATE NOTIFICATION
// ============================================================

export const createNotificationSchema = z.object({
  userId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  type: z.enum(['APPLICATION_STATUS_CHANGED', 'APPLICATION_PENDING', 'APPLICATION_INTERVIEW', 'APPLICATION_HIRED', 'APPLICATION_REJECTED', 'OFFER_APPROVED', 'COMPANY_APPROVED', 'PROGRAM_CREATED', 'GENERAL']),
  relatedId: z.number().int().positive().optional(),
  metadata: z.string().optional(),
});

export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;

// ============================================================
// LIST NOTIFICATIONS
// ============================================================

export const listNotificationsSchema = z.object({
  page: z.string().transform((val) => parseInt(val)).pipe(z.number().min(1)).optional().default(() => 1),
  limit: z.string().transform((val) => parseInt(val)).pipe(z.number().min(1).max(100)).optional().default(() => 20),
  isRead: z.string().transform((val) => val === 'true').optional(),
  type: z.enum(['APPLICATION_STATUS_CHANGED', 'APPLICATION_PENDING', 'APPLICATION_INTERVIEW', 'APPLICATION_HIRED', 'APPLICATION_REJECTED', 'OFFER_APPROVED', 'COMPANY_APPROVED', 'PROGRAM_CREATED', 'GENERAL']).optional(),
  lang: z.enum(['es', 'en', 'pt']).optional(),
});

export type ListNotificationsDto = z.infer<typeof listNotificationsSchema>;
