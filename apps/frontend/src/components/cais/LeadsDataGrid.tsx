import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ThemeProvider } from "@mui/material/styles";
import { Menu, MenuItem } from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { MoreVertical } from "lucide-react";
import { StatusBadge } from "./Badge";
import { caisMuiTheme } from "@/lib/mui-theme";
import {
  formatBRL,
  formatDate,
  formatDateTime,
  formatOpportunityGrade,
  isLeadClosed,
  type Lead,
  type LeadsPagination,
} from "@/lib/cais-api";

export interface LeadGridRow {
  id: string;
  lead: Lead;
  name: string;
  phone: string;
  opportunity: string;
  created_at: string;
  created_by_name: string;
  status_name: string;
  status_slug: string | null;
  opportunity_grade_label: string;
  offered_amount: number | null;
  closed_amount: number | null;
  assigned_name: string;
  first_contact_name: string;
  updated_at: string;
  referrer_label: string;
  notes: string;
}

function toGridRow(lead: Lead, referrerLabel: Map<string, string>): LeadGridRow {
  const referrerFromLead = lead.referrer?.name;
  return {
    id: lead.id,
    lead,
    name: lead.name,
    phone: lead.phone,
    opportunity: lead.external_code ?? "—",
    created_at: lead.created_at,
    created_by_name: lead.created_by?.name ?? "—",
    status_name: lead.salesStatus?.name ?? "Sem status",
    status_slug: lead.salesStatus?.slug ?? null,
    opportunity_grade_label: formatOpportunityGrade(lead.opportunity_grade),
    offered_amount: lead.offered_amount,
    closed_amount: lead.closed_amount,
    assigned_name: lead.responsavel?.name ?? "—",
    first_contact_name: lead.first_contact?.name ?? "—",
    updated_at: lead.updated_at,
    referrer_label: referrerFromLead ?? referrerLabel.get(lead.id) ?? "—",
    notes: lead.notes ?? "—",
  };
}

export function LeadsDataGrid({
  leads,
  pagination,
  loading,
  referrerLabel,
  page,
  pageSize,
  onPageChange,
  onRegisterSale,
  canDelete,
  onDelete,
  showAssignAction,
  onAssignResponsavel,
}: {
  leads: Lead[];
  pagination: LeadsPagination;
  loading: boolean;
  referrerLabel: Map<string, string>;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onRegisterSale: (lead: Lead) => void;
  canDelete?: boolean;
  onDelete?: (lead: Lead) => void;
  showAssignAction?: boolean;
  onAssignResponsavel?: (lead: Lead) => void;
}) {
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuRow, setMenuRow] = useState<LeadGridRow | null>(null);

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  const rows = useMemo(
    () => leads.map((l) => toGridRow(l, referrerLabel)),
    [leads, referrerLabel],
  );

  const columns: GridColDef<LeadGridRow>[] = useMemo(
    () => [
      { field: "name", headerName: "Nome", minWidth: 140, flex: 1 },
      { field: "phone", headerName: "Celular", minWidth: 120 },
      { field: "opportunity", headerName: "Oportunidade", minWidth: 110 },
      {
        field: "created_at",
        headerName: "Data registro",
        minWidth: 110,
        valueFormatter: (v) => (v ? formatDate(String(v)) : "—"),
      },
      { field: "created_by_name", headerName: "Criado por", minWidth: 120 },
      {
        field: "status_name",
        headerName: "Status",
        width: 160,
        flex: 0,
        sortable: false,
        renderCell: ({ row }) => (
          <StatusBadge
            status={row.status_name}
            slug={row.status_slug}
            compact
          />
        ),
      },
      {
        field: "opportunity_grade_label",
        headerName: "Grau",
        minWidth: 90,
      },
      {
        field: "offered_amount",
        headerName: "Valor ofertado",
        minWidth: 120,
        valueFormatter: (v) =>
          v != null && v !== "" ? formatBRL(Number(v)) : "—",
      },
      {
        field: "closed_amount",
        headerName: "Valor fechado",
        minWidth: 120,
        valueFormatter: (v) =>
          v != null && v !== "" ? formatBRL(Number(v)) : "—",
      },
      { field: "assigned_name", headerName: "Vendedor responsável", minWidth: 140 },
      { field: "first_contact_name", headerName: "Primeiro contato", minWidth: 130 },
      {
        field: "updated_at",
        headerName: "Última atualização",
        minWidth: 140,
        valueFormatter: (v) => (v ? formatDateTime(String(v)) : "—"),
      },
      { field: "referrer_label", headerName: "Indicado por", minWidth: 120 },
      {
        field: "notes",
        headerName: "Observações",
        minWidth: 160,
        flex: 1,
        renderCell: ({ value }) => {
          const text = value ? String(value) : "—";
          return (
            <span className="block w-full truncate" title={text === "—" ? undefined : text}>
              {text}
            </span>
          );
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 56,
        flex: 0,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        cellClassName: "cais-actions-cell",
        valueGetter: () => "",
        renderCell: ({ row }) => (
          <button
            type="button"
            aria-label="Ações do lead"
            className="flex h-full min-h-[44px] w-full items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 hover:text-azul-profundo focus:outline-none focus-visible:ring-2 focus-visible:ring-ouro/50"
            onClick={(e) => {
              e.stopPropagation();
              if (menuRow?.id === row.id) {
                closeMenu();
              } else {
                setMenuAnchor(e.currentTarget);
                setMenuRow(row);
              }
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [menuRow],
  );

  const paginationModel: GridPaginationModel = {
    page: page - 1,
    pageSize,
  };

  return (
    <ThemeProvider theme={caisMuiTheme}>
      <div className="max-w-full overflow-hidden" style={{ height: 560 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          rowCount={pagination.total}
          rowHeight={44}
          columnHeaderHeight={44}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => onPageChange(model.page + 1, model.pageSize)}
          pageSizeOptions={[25, 50, 100]}
          disableRowSelectionOnClick
          onRowClick={(params, event) => {
            const cell = (event.target as HTMLElement).closest("[data-field]");
            if (cell?.getAttribute("data-field") === "actions") return;
            navigate({ to: "/leads/$id", params: { id: params.row.id } });
          }}
          onCellClick={(params, event) => {
            if (params.field === "actions") {
              event.stopPropagation();
            }
          }}
          sx={{
            cursor: "pointer",
            width: "100%",
            maxWidth: "100%",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            "& .MuiDataGrid-main": {
              overflow: "hidden",
            },
            "& .MuiDataGrid-virtualScroller": {
              overflow: "auto",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f1f5f9",
              color: "#081421",
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "#f8fafc",
            },
            "& .MuiDataGrid-row": {
              maxHeight: 44,
            },
            "& .MuiDataGrid-cell": {
              fontSize: 13,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              py: 0,
              lineHeight: 1.25,
            },
            "& .MuiDataGrid-cellContent": {
              overflow: "hidden",
              minWidth: 0,
              width: "100%",
              display: "flex",
              alignItems: "center",
              lineHeight: 1.25,
            },
            "& .cais-actions-cell": {
              overflow: "visible",
              padding: 0,
            },
            "& .cais-actions-cell .MuiDataGrid-cellContent": {
              overflow: "visible",
              height: "100%",
              padding: 0,
            },
          }}
          disableColumnFilter
          disableColumnSelector
        />

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor && menuRow)}
          onClose={closeMenu}
          onClick={(e) => e.stopPropagation()}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              sx: {
                minWidth: 160,
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              },
            },
          }}
        >
          {menuRow && (
            <>
              <MenuItem
                sx={{ fontSize: 13 }}
                onClick={() => {
                  navigate({ to: "/leads/$id", params: { id: menuRow.id } });
                  closeMenu();
                }}
              >
                Ver Detalhes
              </MenuItem>
              {!isLeadClosed(menuRow.lead) && (
                <MenuItem
                  sx={{ fontSize: 13, color: "#002B49" }}
                  onClick={() => {
                    onRegisterSale(menuRow.lead);
                    closeMenu();
                  }}
                >
                  Registrar Venda
                </MenuItem>
              )}
              {showAssignAction && onAssignResponsavel && !menuRow.lead.responsavel && (
                <MenuItem
                  sx={{ fontSize: 13, color: "#002B49" }}
                  onClick={() => {
                    onAssignResponsavel(menuRow.lead);
                    closeMenu();
                  }}
                >
                  Atribuir vendedor responsável
                </MenuItem>
              )}
              {canDelete && onDelete && (
                <MenuItem
                  sx={{ fontSize: 13, color: "#dc2626" }}
                  onClick={() => {
                    onDelete(menuRow.lead);
                    closeMenu();
                  }}
                >
                  Excluir
                </MenuItem>
              )}
            </>
          )}
        </Menu>
      </div>
    </ThemeProvider>
  );
}
