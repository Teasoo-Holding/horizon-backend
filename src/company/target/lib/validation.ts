// lib/validations/target.ts
import { z } from 'zod';

export const BaseTargetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  baselineYear: z.string().min(2000).max(2100),
  targetYear: z.string().min(2000).max(2100),
});

export const GeneralTargetSchema = BaseTargetSchema.extend({
  type: z.literal('GENERAL'),
  reductionPercentage: z.number().min(0).max(100),
});

export const ScopeTargetSchema = BaseTargetSchema.extend({
  type: z.literal('SCOPE'),
  scopes: z.object({
    scope1: z.object({
      reductionPercentage: z.number().min(0).max(100),
    }),
    scope2: z.object({
      reductionPercentage: z.number().min(0).max(100),
    }),
    scope3: z.object({
      reductionPercentage: z.number().min(0).max(100),
    }),
  }),
});

export const CreateTargetSchema = z.discriminatedUnion('type', [
  GeneralTargetSchema,
  ScopeTargetSchema,
]);

export type CreateTargetInput = z.infer<typeof CreateTargetSchema>;