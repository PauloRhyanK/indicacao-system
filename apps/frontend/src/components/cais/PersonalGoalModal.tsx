import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonalDailyGoalCard } from "./PersonalDailyGoalCard";

const SKIPPED_KEY = "cais-personal-goal-skipped";

export function hasSkippedPersonalGoal(): boolean {
  return localStorage.getItem(SKIPPED_KEY) === "true";
}

export function markPersonalGoalSkipped(): void {
  localStorage.setItem(SKIPPED_KEY, "true");
}

interface PersonalGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyDailyTarget: number;
}

export function PersonalGoalModal({
  open,
  onOpenChange,
  companyDailyTarget,
}: PersonalGoalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-branco">
        <DialogHeader>
          <DialogTitle className="text-azul-profundo">Qual sua meta para o dia?</DialogTitle>
          <DialogDescription className="text-slate-500">
            Defina um objetivo pessoal ou use a meta da empresa no painel.
          </DialogDescription>
        </DialogHeader>
        <PersonalDailyGoalCard
          compact
          initialAmount={null}
          companyDailyTarget={companyDailyTarget}
          onSaved={() => onOpenChange(false)}
        />
        <button
          type="button"
          className="w-full text-center text-[13px] text-azul-medio hover:text-azul-profundo"
          onClick={() => {
            markPersonalGoalSkipped();
            onOpenChange(false);
          }}
        >
          Pular — usar meta da empresa
        </button>
      </DialogContent>
    </Dialog>
  );
}

export const PERSONAL_GOAL_PROMPTED_KEY = "cais-personal-goal-prompted";

export function hasBeenPromptedForPersonalGoal(): boolean {
  return localStorage.getItem(PERSONAL_GOAL_PROMPTED_KEY) === "true";
}

export function markPersonalGoalPrompted(): void {
  localStorage.setItem(PERSONAL_GOAL_PROMPTED_KEY, "true");
}
