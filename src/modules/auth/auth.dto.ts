import { z } from 'zod';
import { Role } from '@prisma/client';

// Base schema for all roles
const baseRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role, {
    message: 'Invalid role',
  }),
});

// Student-specific fields
const studentFields = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  resumeUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  bio: z.string().optional(),
  skills: z.string().optional(),
  dateOfBirth: z.string().optional(),
  careerField: z.string().optional(),
});

// Company-specific fields
const companyFields = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  industry: z.string().optional(),
  size: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  city: z.string().optional(),
  country: z.string().optional(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional().or(z.string().transform(val => val ? parseInt(val) : undefined)),
  companySize: z.string().optional(),
});

// University-specific fields
const universityFields = z.object({
  universityName: z.string().min(1, 'University name is required'),
  city: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

export const registerSchema = z.object({
  body: baseRegisterSchema
    .and(studentFields.partial())
    .and(companyFields.partial())
    .and(universityFields.partial())
    .refine(
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
