import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./Button";
import { Field, inputClass, SlideOver } from "./SlideOver";
import { fetchProfiles, updateLead } from "@/lib/cais-api";

export function AssignResponsavelDialog({
  open,
  leadId,
  leadName,
  onClose,
}: {
  open: boolean;
  leadId: string | null;
  leadName: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles, enabled: open });

  const mutation = useMutation({
    mutationFn: (responsavelId: string) =>
      updateLead(leadId!, { responsavelId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      onClose();
    },
  });

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={leadName ? `Atribuir responsável — ${leadName}` : "Atribuir responsável"}
    >
      <Field label="Responsável pelo lead *">
        <select
          required
          className={inputClass}
          defaultValue=""
          disabled={mutation.isPending}
          onChange={(e) => {
            const id = e.target.value;
            if (id && leadId) mutation.mutate(id);
          }}
        >
          <option value="" disabled>
            Selecione um consultor
          </option>
          {(profiles.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" type="button" onClick={onClose} disabled={mutation.isPending}>
          Cancelar
        </Button>
      </div>
    </SlideOver>
  );
}
