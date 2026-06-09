export const activeOnly = { deletedAt: null } as const;

export const activePurchaseWhere = {
  deletedAt: null,
  lead: { deletedAt: null },
} as const;

export const activeLeadWhere = {
  deletedAt: null,
} as const;

export const activeUserWhere = {
  deletedAt: null,
} as const;
