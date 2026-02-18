import { z } from 'zod';

// ============================================================
// LIST COURSES
// ============================================================

export const listCoursesSchema = z.object({
  page: z.string().transform((val) => parseInt(val)).pipe(z.number().min(1)).optional().default(() => 1),
  limit: z.string().transform((val) => parseInt(val)).pipe(z.number().min(1).max(100)).optional().default(() => 20),
  search: z.string().optional(),
});

export type ListCoursesDto = z.infer<typeof listCoursesSchema>;

// ============================================================
// COMPLETE COURSE
// ============================================================

export const completeCourseSchema = z.object({
  certificateUrl: z.string().url({ message: 'Certificate URL must be a valid URL' }).optional(),
});

export type CompleteCourseDto = z.infer<typeof completeCourseSchema>;
