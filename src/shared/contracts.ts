import { z } from 'zod';

export const AudienceSchema = z.enum(['Exec', 'Cross-functional', 'Engineering']);
export type Audience = z.infer<typeof AudienceSchema>;

export const LengthSchema = z.enum(['Short', 'Standard', 'Detailed']);
export type Length = z.infer<typeof LengthSchema>;

export const ToneSchema = z.enum(['Neutral', 'Crisp', 'Friendly']);
export type Tone = z.infer<typeof ToneSchema>;

export const UpdateSettingsSchema = z.object({
  audience: AudienceSchema,
  length: LengthSchema,
  tone: ToneSchema
});
export type UpdateSettings = z.infer<typeof UpdateSettingsSchema>;

export const UpdateDraftSchema = z.object({
  rawInput: z.string(),
  settings: UpdateSettingsSchema,
  output: z.string()
});
export type UpdateDraft = z.infer<typeof UpdateDraftSchema>;

export const GenerateRequestSchema = z.object({
  rawInput: z
    .string()
    .trim()
    .min(10, 'rawInput is too short')
    .max(20000, 'rawInput is too long'),
  settings: UpdateSettingsSchema
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const GenerateResponseSchema = z.object({
  markdown: z.string(),
  warnings: z.array(z.string()).optional(),
  meta: z
    .object({
      provider: z.string(),
      model: z.string().optional(),
      durationMs: z.number().int().nonnegative()
    })
    .optional()
});
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;
