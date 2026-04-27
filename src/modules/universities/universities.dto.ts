import { z } from 'zod';

// Helper: "" / null / undefined -> undefined;
//   array real -> array;
//   JSON string de array -> array;
//   string plano (single value) -> [value]  (wrap en array)
function preprocessArray(v: unknown): unknown {
  if (v === undefined || v === null || v === '') return undefined;
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // string plano, no JSON → tratar como un elemento de array
      return [trimmed];
    }
  }
  return [];
}

// Helper: "" -> null  (clear the URL field)
//         undefined stays undefined  (field was NOT sent → skip update)
function preprocessUrl(v: unknown): unknown {
  if (v === '') return null;
  return v;
}

// Exportable: acepta cualquier string parseable como fecha (con/sin timezone, date-only)
export const flexibleDateString = z
  .string()
  .min(1, 'Date is required')
  .refine((v) => !isNaN(new Date(v).getTime()), { message: 'Invalid date format' });

export const optionalFlexibleDate = z
  .string()
  .optional()
  .nullable()
  .refine((v) => v == null || v === '' || !isNaN(new Date(v).getTime()), {
    message: 'Invalid date format',
  });

// ── Invite ─────────────────────────────────────────────────────────────────

export const createInviteSchema = z.object({
  body: z.object({
    // acepta numero o string numerico (form-data compat)
    maxUses: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number().int().positive('maxUses must be a positive integer').optional(),
    ),
    // "" -> null; acepta datetime con o sin timezone
    expiresAt: z.preprocess(
      (v) => (v === '' ? null : v),
      z
        .string()
        .nullable()
        .optional()
        .refine(
          (v) => v == null || !isNaN(new Date(v).getTime()),
          { message: 'Invalid date format for expiresAt' },
        ),
    ),
  }),
});
export type CreateInviteDto = z.infer<typeof createInviteSchema>['body'];

export const redeemInviteSchema = z.object({
  body: z.object({
    inviteCode: z
      .string()
      .min(6, 'Invite code must be at least 6 characters')
      .max(20, 'Invite code must be at most 20 characters')
      .transform((v) => v.trim().toUpperCase()),
  }),
});
export type RedeemInviteDto = z.infer<typeof redeemInviteSchema>['body'];

// ── Students filters ───────────────────────────────────────────────────────

export const getStudentsSchema = z.object({
  query: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    search: z.string().optional(),
    page: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .optional()
      .default(() => 1),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .optional()
      .default(() => 20),
  }),
});
export type GetStudentsDto = z.infer<typeof getStudentsSchema>['query'];

// ── University Profile ─────────────────────────────────────────────────────

export const updateUniversityProfileSchema = z.object({
  body: z.object({
    // Acepta tanto 'name' (campo frontend) como 'universityName' (campo Prisma legacy)
    name: z.string().min(2).max(255).optional(),
    universityName: z.string().min(2).max(255).optional(),

    // "" -> null; acepta URL completa o ruta relativa (/uploads/...)
    logoUrl: z.preprocess(
      preprocessUrl,
      z.string()
        .refine(
          (v) => v.startsWith('/uploads/') || /^https?:\/\//.test(v),
          { message: 'logoUrl must be a valid URL or a relative /uploads/ path' },
        )
        .nullable()
        .optional(),
    ),

    // "" -> null; valida como URL valida o null
    website: z.preprocess(
      preprocessUrl,
      z.string().url('Invalid URL for website').nullable().optional(),
    ),

    location: z.string().max(255).nullable().optional(),
    city: z.string().max(255).nullable().optional(),
    country: z.string().max(255).nullable().optional(),
    description: z.string().max(5000).nullable().optional(),

    // array real | JSON string | undefined/null -> array o undefined
    careers: z.preprocess(
      preprocessArray,
      z
        .array(z.string().min(1, 'Career entry must not be empty').max(100))
        .max(50)
        .optional(),
    ),

    // array real | JSON string | undefined/null — normaliza a UPPER + trim antes de validar enum
    convenioTypes: z.preprocess(
      (v) => {
        const arr = preprocessArray(v);
        if (!Array.isArray(arr)) return arr;
        return arr.map((item) =>
          typeof item === 'string' ? item.trim().toUpperCase() : item,
        );
      },
      z.array(z.enum(['NATIONAL', 'INTERNATIONAL'])).optional(),
    ),
  }),
});
export type UpdateUniversityProfileDto = z.infer<
  typeof updateUniversityProfileSchema
>['body'];

// ── Company detail param ───────────────────────────────────────────────────

export const companyDetailParamsSchema = z.object({
  params: z.object({
    companyId: z
      .string()
      .regex(/^\d+$/, 'companyId must be a numeric string')
      .transform(Number),
  }),
});