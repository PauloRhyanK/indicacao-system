import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "./Button";
import { EditLeadFields, type EditLeadFieldsHandle } from "./EditLeadFields";
import { SlideOver } from "./SlideOver";
import type { Lead } from "@/lib/cais-api";

const FORM_ID = "edit-lead-form";

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
    <SlideOver
      open={open}
      onClose={onClose}
      title="Editar Lead"
      footer={
        <div className="flex gap-2">
          <Button type="submit" form={FORM_ID} variant="gold" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <EditLeadFields ref={fieldsRef} lead={lead} enabled={open} />
      </form>
    </SlideOver>
  );
}
