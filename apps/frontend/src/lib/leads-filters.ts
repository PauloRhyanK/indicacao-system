import type { LeadsFilters } from "@/lib/cais-api";

export type FilterField =
  | "name"
  | "phone"
  | "external_code"
  | "status"
  | "assigned"
  | "offered_amount"
  | "closed_amount"
  | "created_at"
  | "updated_at"
  | "notes";

export type FilterOperator =
  | "contains"
  | "equals"
  | "before"
  | "after"
  | "between"
  | "gte"
  | "lte";

export interface FilterRow {
  id: string;
  field: FilterField | "";
  operator: FilterOperator;
  value: string;
  value2?: string;
}

export const FILTER_FIELD_OPTIONS: {
  id: FilterField;
  label: string;
  type: "text" | "select" | "date" | "number";
  operators: FilterOperator[];
}[] = [
  { id: "name", label: "Nome", type: "text", operators: ["contains", "equals"] },
  { id: "phone", label: "Celular", type: "text", operators: ["contains"] },
  { id: "external_code", label: "Código", type: "text", operators: ["contains", "equals"] },
  { id: "status", label: "Status", type: "select", operators: ["equals"] },
  { id: "assigned", label: "Vendedor responsável", type: "select", operators: ["equals"] },
  { id: "offered_amount", label: "Valor ofertado", type: "number", operators: ["equals", "gte", "lte", "between"] },
  { id: "closed_amount", label: "Valor fechado", type: "number", operators: ["equals", "gte", "lte", "between"] },
  { id: "created_at", label: "Data registro", type: "date", operators: ["equals", "before", "after", "between"] },
  { id: "updated_at", label: "Última atualização", type: "date", operators: ["equals", "before", "after", "between"] },
  { id: "notes", label: "Observações", type: "text", operators: ["contains"] },
];

export function emptyFilterRow(): FilterRow {
  return { id: crypto.randomUUID(), field: "", operator: "contains", value: "" };
}

function applyDateFilter(
  target: LeadsFilters,
  fromKey: keyof LeadsFilters,
  toKey: keyof LeadsFilters,
  operator: FilterOperator,
  value: string,
  value2?: string,
) {
  if (!value) return;
  if (operator === "equals") {
    (target[fromKey] as string | undefined) = value;
    (target[toKey] as string | undefined) = value;
  } else if (operator === "before") {
    (target[toKey] as string | undefined) = value;
  } else if (operator === "after") {
    (target[fromKey] as string | undefined) = value;
  } else if (operator === "between" && value2) {
    (target[fromKey] as string | undefined) = value;
    (target[toKey] as string | undefined) = value2;
  }
}

function applyNumberFilter(
  target: LeadsFilters,
  minKey: keyof LeadsFilters,
  maxKey: keyof LeadsFilters,
  operator: FilterOperator,
  value: string,
  value2?: string,
) {
  const num = Number(value);
  if (value === "" || Number.isNaN(num)) return;
  if (operator === "equals") {
    (target[minKey] as number | undefined) = num;
    (target[maxKey] as number | undefined) = num;
  } else if (operator === "gte") {
    (target[minKey] as number | undefined) = num;
  } else if (operator === "lte") {
    (target[maxKey] as number | undefined) = num;
  } else if (operator === "between" && value2 !== undefined) {
    const num2 = Number(value2);
    if (!Number.isNaN(num2)) {
      (target[minKey] as number | undefined) = num;
      (target[maxKey] as number | undefined) = num2;
    }
  }
}

export function compileLeadFilters(rows: FilterRow[]): LeadsFilters {
  const result: LeadsFilters = {};

  for (const row of rows) {
    if (!row.field || !row.value) continue;

    switch (row.field) {
      case "name":
      case "phone":
      case "external_code":
        result.search = row.value;
        break;
      case "status":
        result.status = row.value;
        break;
      case "assigned":
        result.responsavelId = row.value;
        break;
      case "created_at":
        applyDateFilter(result, "createdFrom", "createdTo", row.operator, row.value, row.value2);
        break;
      case "updated_at":
        applyDateFilter(result, "updatedFrom", "updatedTo", row.operator, row.value, row.value2);
        break;
      case "offered_amount":
        applyNumberFilter(result, "offeredMin", "offeredMax", row.operator, row.value, row.value2);
        break;
      case "closed_amount":
        applyNumberFilter(result, "closedMin", "closedMax", row.operator, row.value, row.value2);
        break;
      case "notes":
        result.notes = row.value;
        break;
    }
  }

  return result;
}

export function countActiveFilters(rows: FilterRow[]): number {
  return rows.filter((r) => r.field && r.value).length;
}

export function filterRowLabel(row: FilterRow): string {
  const field = FILTER_FIELD_OPTIONS.find((f) => f.id === row.field);
  if (!field || !row.value) return "";
  return `${field.label}: ${row.value}${row.value2 ? ` — ${row.value2}` : ""}`;
}
