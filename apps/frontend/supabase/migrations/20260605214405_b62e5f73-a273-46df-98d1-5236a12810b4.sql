
-- Enums
create type public.app_role as enum ('admin','assessor','gestor');

-- Profiles (no FK to auth.users so demo profiles can be seeded)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'assessor' check (role in ('admin','assessor','gestor')),
  created_at timestamptz not null default now()
);

-- User roles (separate table)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);

-- Leads
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  status text not null default 'Novo' check (status in ('Novo','Em Contato','Proposta Enviada','Convertido','Perdido')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Referrals (polymorphic)
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  referrer_type text check (referrer_type in ('user','lead')),
  referrer_user_id uuid references public.profiles(id),
  referrer_lead_id uuid references public.leads(id),
  created_at timestamptz not null default now(),
  constraint chk_referrer check (
    (referrer_type = 'user' and referrer_user_id is not null and referrer_lead_id is null) or
    (referrer_type = 'lead' and referrer_lead_id is not null and referrer_user_id is null)
  )
);

-- Sales
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  sale_value numeric(12,2) not null,
  sold_by uuid references public.profiles(id),
  sold_at timestamptz not null default now()
);

-- Meta periods
create table public.meta_periods (
  id uuid primary key default gen_random_uuid(),
  period_label text not null,
  target_value numeric(12,2) not null,
  start_date date not null,
  end_date date not null
);

-- Grants
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.profiles to anon;
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;
grant select, insert, update, delete on public.referrals to authenticated;
grant all on public.referrals to service_role;
grant select, insert, update, delete on public.sales to authenticated;
grant all on public.sales to service_role;
grant select, insert, update, delete on public.meta_periods to authenticated;
grant all on public.meta_periods to service_role;

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.leads enable row level security;
alter table public.referrals enable row level security;
alter table public.sales enable row level security;
alter table public.meta_periods enable row level security;

create policy "auth read profiles" on public.profiles for select to authenticated using (true);
create policy "auth write profiles" on public.profiles for all to authenticated using (true) with check (true);

create policy "auth read roles" on public.user_roles for select to authenticated using (true);

create policy "auth all leads" on public.leads for all to authenticated using (true) with check (true);
create policy "auth all referrals" on public.referrals for all to authenticated using (true) with check (true);
create policy "auth all sales" on public.sales for all to authenticated using (true) with check (true);
create policy "auth all meta" on public.meta_periods for all to authenticated using (true) with check (true);

-- has_role helper
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger leads_updated_at before update on public.leads
  for each row execute function public.update_updated_at_column();

-- Auto create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), 'assessor');
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sale auto-converts lead
create or replace function public.handle_new_sale()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.leads set status = 'Convertido', updated_at = now() where id = new.lead_id;
  return new;
end; $$;
create trigger on_sale_created
  after insert on public.sales
  for each row execute function public.handle_new_sale();

-- Recursive referral chain
create or replace function public.get_referral_chain(p_lead_id uuid)
returns table(level int, node_type text, node_id uuid, node_name text)
language sql stable as $$
  with recursive chain as (
    select 1 as level, r.referrer_type as node_type,
      coalesce(r.referrer_user_id, r.referrer_lead_id) as node_id
    from public.referrals r where r.lead_id = p_lead_id
    union all
    select c.level + 1, r.referrer_type,
      coalesce(r.referrer_user_id, r.referrer_lead_id)
    from chain c
    join public.referrals r on r.lead_id = c.node_id and c.node_type = 'lead'
    where c.level < 10
  )
  select c.level, c.node_type, c.node_id,
    coalesce(p.name, l.name) as node_name
  from chain c
  left join public.profiles p on c.node_type='user' and p.id=c.node_id
  left join public.leads l on c.node_type='lead' and l.id=c.node_id
  order by c.level desc;
$$;
