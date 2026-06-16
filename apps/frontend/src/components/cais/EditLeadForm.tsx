import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "./Button";
import { EditLeadFields, type EditLeadFieldsHandle } from "./EditLeadFields";
import { SlideOver } from "./SlideOver";
import type { Lead } from "@/lib/cais-api";

export function EditLeadForm({
  open,
  onClose,
  lead,
}: {
  open: boolean;
  onClose: () => void;
  lead: Lead;
}) {
  const fieldsRef = useRef<EditLeadFieldsHandle>(null);

  const mutation = useMutation({
    mutationFn: () => fieldsRef.current!.submit(),
    onSuccess: onClose,
  });

  return (
    <SlideOver open={open} onClose={onClose} title="Editar Lead">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <EditLeadFields ref={fieldsRef} lead={lead} enabled={open} />

        <div className="flex gap-2">
          <Button type="submit" variant="gold" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
