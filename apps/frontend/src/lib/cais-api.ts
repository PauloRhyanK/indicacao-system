import { supabase } from "@/integrations/supabase/client";

export type LeadStatus =
  | "Novo"
  | "Em Contato"
  | "Proposta Enviada"
  | "Convertido"
  | "Perdido";

export const LEAD_STATUSES: LeadStatus[] = [
  "Novo",
  "Em Contato",
  "Proposta Enviada",
  "Convertido",
  "Perdido",
];

export interface Profile {
  id: string;
  name: string;
  role: "admin" | "assessor" | "gestor";
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  status: LeadStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  lead_id: string;
  sale_value: number;
  sold_by: string | null;
  sold_at: string;
}

export interface MetaPeriod {
  id: string;
  period_label: string;
  target_value: number;
  start_date: string;
  end_date: string;
}

export interface ChainNode {
  level: number;
  node_type: "user" | "lead";
  node_id: string;
  node_name: string;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---- Queries ----

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function fetchLead(id: string): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("name");
  if (error) throw error;
  return data as Profile[];
}

export async function fetchSales(): Promise<Sale[]> {
  const { data, error } = await supabase.from("sales").select("*");
  if (error) throw error;
  return data as Sale[];
}

export async function fetchMetaPeriod(): Promise<MetaPeriod | null> {
  const { data, error } = await supabase
    .from("meta_periods")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as MetaPeriod | null;
}

export async function fetchReferralChain(leadId: string): Promise<ChainNode[]> {
  const { data, error } = await supabase.rpc("get_referral_chain", {
    p_lead_id: leadId,
  });
  if (error) throw error;
  return (data ?? []) as ChainNode[];
}

export interface Referral {
  id: string;
  lead_id: string;
  referrer_type: "user" | "lead";
  referrer_user_id: string | null;
  referrer_lead_id: string | null;
  created_at: string;
}

export async function fetchReferrals(): Promise<Referral[]> {
  const { data, error } = await supabase.from("referrals").select("*");
  if (error) throw error;
  return data as Referral[];
}



export interface NewLeadInput {
  name: string;
  phone: string;
  status: LeadStatus;
  notes?: string;
  referrer_type?: "user" | "lead" | null;
  referrer_id?: string | null;
  created_by?: string | null;
}

export async function createLead(input: NewLeadInput): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      name: input.name,
      phone: input.phone,
      status: input.status,
      notes: input.notes || null,
      created_by: input.created_by ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  const lead = data as Lead;

  if (input.referrer_type && input.referrer_id) {
    const { error: refErr } = await supabase.from("referrals").insert({
      lead_id: lead.id,
      referrer_type: input.referrer_type,
      referrer_user_id: input.referrer_type === "user" ? input.referrer_id : null,
      referrer_lead_id: input.referrer_type === "lead" ? input.referrer_id : null,
    });
    if (refErr) throw refErr;
  }
  return lead;
}

export async function updateLead(
  id: string,
  patch: Partial<Pick<Lead, "name" | "phone" | "status" | "notes">>,
): Promise<void> {
  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) throw error;
}

export async function registerSale(input: {
  lead_id: string;
  sale_value: number;
  sold_by?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("sales").insert({
    lead_id: input.lead_id,
    sale_value: input.sale_value,
    sold_by: input.sold_by ?? null,
  });
  if (error) throw error;
}
