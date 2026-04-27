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

// -------------------------------------------------------
// Company profile update
// -------------------------------------------------------

const optStr = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => (v === '' || v == null ? null : v));

const optUrl = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (v === '' || v == null) return null;
    return v;
  });

const coerceYear = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .optional()
  .transform((val, ctx) => {
    if (val === null || val === undefined || val === '') return null;
    const n = typeof val === 'number' ? val : parseInt(String(val), 10);
    if (isNaN(n) || !Number.isInteger(n) || n < 1800 || n > 2100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a valid year (1800-2100)',
      });
      return z.NEVER;
    }
    return n;
  });

const coerceBool = z
  .union([z.boolean(), z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return undefined;
  });

const safeStringArray = z
  .union([z.array(z.string()), z.null(), z.undefined()])
  .optional()
  .transform((v) => (Array.isArray(v) ? Array.from(new Set(v.filter(Boolean))) : undefined));

const workModesEnum = z
  .union([z.array(z.string()), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (!Array.isArray(v)) return undefined;
    const allowed = ['REMOTE', 'HYBRID', 'ON_SITE'];
    return Array.from(new Set(
      v.map((s) => s.toUpperCase().replace(/-/g, '_')).filter((s) => allowed.includes(s)),
    ));
  });

const vacancyTypesEnum = z
  .union([z.array(z.string()), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (!Array.isArray(v)) return undefined;
    const allowed = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'FREELANCE'];
    return Array.from(new Set(
      v.map((s) => s.toUpperCase().replace(/-/g, '_')).filter((s) => allowed.includes(s)),
    ));
  });

const optEmail = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v, ctx) => {
    if (v === '' || v == null) return null;
    // Basic email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid contact email' });
      return z.NEVER;
    }
    return v;
  });

export const updateCompanyProfileSchema = z.object({
  body: z.object({
    companyName: z.string().min(1, 'Company name is required').optional(),
    industry: optStr,
    size: optStr,
    website: optUrl,
    description: optStr,
    logoUrl: optUrl,
    city: optStr,
    country: optStr,
    foundedYear: coerceYear,
    companySize: optStr,
    linkedinUrl: optUrl,
    descriptionLong: optStr,
    contactPerson: optStr,
    contactEmail: optEmail,
    contactPhone: optStr,
    workModes: workModesEnum,
    vacancyTypes: vacancyTypesEnum,
    workingLanguages: safeStringArray,
    participatesInInternships: coerceBool,
  }).strip(),
});

export type ListCandidatesDto = z.infer<typeof listCandidatesSchema>['query'];
export type GetCandidateByIdDto = z.infer<typeof getCandidateByIdSchema>['params'];
export type UpdateCompanyProfileDto = z.infer<typeof updateCompanyProfileSchema>['body'];

// -------------------------------------------------------
// Application status update
// -------------------------------------------------------

export const updateApplicationStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'INTERVIEW', 'REJECTED', 'HIRED']),
    type: z.enum(['job', 'program']).optional(),
  }),
  params: z.object({
    applicationId: z.string().transform(val => parseInt(val, 10)),
  }),
});

export type UpdateApplicationStatusDto = z.infer<typeof updateApplicationStatusSchema>;

// -------------------------------------------------------
// Program offer content management
// -------------------------------------------------------

const positiveParam = z
  .string()
  .transform((val) => parseInt(val, 10))
  .refine((val) => Number.isInteger(val) && val > 0, 'Must be a valid positive ID');

const optionalContentString = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === '') return null;
    return val;
  });

const optionalEnumValue = (allowed: string[]) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((val, ctx) => {
      if (val === undefined) return undefined;
      if (val === null || val === '') return null;
      const normalized = String(val).toUpperCase().replace(/-/g, '_');
      if (!allowed.includes(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Must be one of: ${allowed.join(', ')}`,
        });
        return z.NEVER;
      }
      return normalized;
    });

const optionalPositiveInt = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .optional()
  .transform((val, ctx) => {
    if (val === undefined) return undefined;
    if (val === null || val === '') return null;
    const parsed = typeof val === 'number' ? val : parseInt(String(val), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a positive integer',
      });
      return z.NEVER;
    }
    return parsed;
  });

export const updateProgramOfferContentSchema = z.object({
  params: z.object({
    programId: positiveParam,
    programOfferId: positiveParam,
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(10).optional(),
    requirements: optionalContentString,
    location: optionalContentString,
    salary: optionalContentString,
    workMode: optionalEnumValue(['REMOTE', 'HYBRID', 'ON_SITE']),
    contractType: optionalEnumValue(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'FREELANCE']),
    experienceLevel: optionalContentString,
    maxApplicants: optionalPositiveInt,
  }).refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    { message: 'At least one field must be provided' },
  ),
});

export const deleteProgramOfferSchema = z.object({
  params: z.object({
    programId: positiveParam,
    programOfferId: positiveParam,
  }),
});
