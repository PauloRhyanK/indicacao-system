/**
 * Helpers para a página de TV pública (`apps/frontend/src/routes/tv.tsx`).
 *
 * Leitura (sem login):
 *   import { fetchDailyGoalToday } from "@/lib/cais-api";
 *   const data = await fetchDailyGoalToday();
 *
 * Quick-set presets (header X-TV-Token = VITE_TV_TOKEN):
 *   import { applyDailyPresetToday } from "@/lib/cais-api";
 *   await applyDailyPresetToday("peak", import.meta.env.VITE_TV_TOKEN);
 *
 * Presets: normal | peak | reduced | sprint
 *
 * React Query na TV:
 *   useQuery({ queryKey: ["daily-goal-today"], queryFn: fetchDailyGoalToday, refetchInterval: 30_000 })
 */

export {
  applyDailyPresetToday,
  fetchDailyGoalToday,
  type DailyGoalToday,
  type DailyPresetSlug,
} from "./cais-api";
