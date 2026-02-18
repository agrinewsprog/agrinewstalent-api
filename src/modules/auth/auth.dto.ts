import { z } from 'zod';
import { Role } from '@prisma/client';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.nativeEnum(Role, {
      message: 'Invalid role',
    }),
    // Profile data based on role
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    companyName: z.string().min(1).optional(),
    universityName: z.string().min(1).optional(),
  }).refine(
    (data) => {
      if (data.role === Role.STUDENT) {
        return data.firstName && data.lastName;
      }
      if (data.role === Role.COMPANY) {
        return data.companyName;
      }
      if (data.role === Role.UNIVERSITY) {
        return data.universityName;
      }
      return true;
    },
    {
      message: 'Required profile fields missing for the selected role',
    }
  ),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export type RegisterDto = z.infer<typeof registerSchema>['body'];
export type LoginDto = z.infer<typeof loginSchema>['body'];
