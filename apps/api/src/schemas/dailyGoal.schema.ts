import { z } from "zod";

export const DAILY_PRESET_SLUGS = ["normal", "peak", "reduced", "sprint"] as const;

export const dailyPresetSlugSchema = z.enum(DAILY_PRESET_SLUGS);

export const upsertDailyDefaultsSchema = z.object({
  defaults: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        amount: z.coerce.number().nonnegative(),
      }),
    )
    .length(7),
});

export const upsertDailyOverrideSchema = z
  .object({
    amount: z.coerce.number().nonnegative().optional(),
    presetSlug: dailyPresetSlugSchema.optional(),
  })
  .refine((data) => data.amount !== undefined || data.presetSlug !== undefined, {
    message: "Informe amount ou presetSlug",
  });

export const applyDailyPresetSchema = z.object({
  presetSlug: dailyPresetSlugSchema,
});

export const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Use o formato YYYY-MM"),
});

export type UpsertDailyDefaultsInput = z.infer<typeof upsertDailyDefaultsSchema>;
export type UpsertDailyOverrideInput = z.infer<typeof upsertDailyOverrideSchema>;
export type ApplyDailyPresetInput = z.infer<typeof applyDailyPresetSchema>;
