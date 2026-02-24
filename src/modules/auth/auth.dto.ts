import { z } from 'zod';
import { Role } from '@prisma/client';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

/**
 * Accepts a number, numeric string, empty string, null, or undefined.
 * Coerces to integer or undefined.
 * Handles null sent by HTML forms / JSON serialization.
 */
const coerceYear = z
  .union([
    z.number().int(),
    z.null().transform(() => undefined),
    z.string().transform((val, ctx) => {
      if (!val) return undefined;
      const n = parseInt(val, 10);
      if (isNaN(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a valid year' });
        return z.NEVER;
      }
      return n;
    }),
  ])
  .optional();

/**
 * Accepts string[], null, or undefined — always resolves to string[].
 * null is coerced to [] so frontend can send null without breaking validation.
 */
const safeStringArray = z
  .array(z.string())
  .nullish()
  .transform((v) => v ?? []);

/**
 * Optional string that also accepts null (common in JSON from forms).
 * null is coerced to undefined so service code can use simple `if (dto.x)` guards.
 */
const optStr = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

/**
 * Optional URL field: accepts a valid URL, empty string, null, or undefined.
 * Empty string and null are coerced to undefined.
 */
const optUrl = z
  .union([z.string().url('Invalid URL'), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v == null ? undefined : v));

// -------------------------------------------------------
// Per-role field schemas
// -------------------------------------------------------

const baseRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role, { message: 'Invalid role. Must be STUDENT, COMPANY, UNIVERSITY, or SUPER_ADMIN' }),
});

const studentFields = z.object({
  firstName: z.string().min(1, 'First name is required').nullish().transform((v) => v ?? undefined),
  lastName:  z.string().min(1, 'Last name is required').nullish().transform((v) => v ?? undefined),
  phoneNumber: optStr,
  city:        optStr,
  country:     optStr,
  resumeUrl:   optUrl,
  linkedinUrl: optUrl,
  githubUrl:   optUrl,
  bio:         optStr,
  skills:      optStr,
  dateOfBirth: optStr,
  careerField: optStr,
  // Student type fields
  isStudent:           z.boolean().nullish().transform((v) => v ?? undefined),
  isActiveStudent:     z.boolean().nullish().transform((v) => v ?? undefined),
  universityInviteCode: optStr,
  // Array fields — safe defaults prevent .map() on undefined
  careers: safeStringArray,
  species: safeStringArray,
});

const companyFields = z.object({
  companyName: z.string().min(1, 'Company name is required').nullish().transform((v) => v ?? undefined),
  industry:    optStr,
  size:        optStr,
  website:     optUrl,
  description: optStr,
  logoUrl:     optUrl,
  city:        optStr,
  country:     optStr,
  foundedYear: coerceYear,
  companySize: optStr,
});

const universityFields = z.object({
  universityName: z.string().min(1, 'University name is required').nullish().transform((v) => v ?? undefined),
  city:        optStr,
  country:     optStr,
  website:     optUrl,
  description: optStr,
  logoUrl:     optUrl,
  // Array fields — safe defaults prevent .map() on undefined
  convenioTypes: safeStringArray,
  careers:       safeStringArray,
});

// -------------------------------------------------------
// Register schema — used with validate(schema, 'all')
// -------------------------------------------------------

export const registerSchema = z.object({
  body: baseRegisterSchema
    .and(studentFields.partial())
    .and(companyFields.partial())
    .and(universityFields.partial())
    .superRefine((data, ctx) => {
      if (data.role === Role.STUDENT) {
        if (!data.firstName) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'First name is required for students', path: ['firstName'] });
        }
        if (!data.lastName) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Last name is required for students', path: ['lastName'] });
        }
      }
      if (data.role === Role.COMPANY) {
        if (!data.companyName) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Company name is required for companies', path: ['companyName'] });
        }
      }
      if (data.role === Role.UNIVERSITY) {
        if (!data.universityName) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'University name is required for universities', path: ['universityName'] });
        }
      }
    }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export type RegisterDto = z.infer<typeof registerSchema>['body'];
export type LoginDto = z.infer<typeof loginSchema>['body'];
