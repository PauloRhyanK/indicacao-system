# CAIS Indicações

Sistema web para **programa de indicações e operação comercial de consórcios**. Centraliza leads, vendas, cadeia de indicações, metas e recompensas de campanha em um único fluxo, com controle de acesso por papéis (RBAC).

Monorepo gerenciado com **pnpm** (`apps/api` + `apps/frontend`).

> **Documentação técnica completa:** [`DOCUMENTACAO.md`](./DOCUMENTACAO.md) — mapa da API, fluxos de negócio, modelo de dados, variáveis de ambiente e troubleshooting de infra.

---

## Para que serve

O CAIS apoia equipes comerciais que vendem consórcio com **indicação entre clientes e consultores**. O sistema registra quem indicou quem, acompanha o funil de leads até o fechamento, mede metas (diárias e de período) e controla **recompensas de campanha** por venda — bônus de indicação, equipe comercial e escolha do cliente (cashback ou voucher).

### Principais capacidades

| Área | O que o sistema faz |
|------|---------------------|
| **CRM de leads** | Cadastro, filtros avançados, grid configurável, importação Excel (BASE_CRM) |
| **Vendas** | Registro por lead, histórico, boleto pago, importação de planilha de campanha |
| **Indicações** | Árvore e cadeia de bônus; relatório de recompensas por venda |
| **Metas** | Meta global do período, meta diária da empresa, meta pessoal por consultor |
| **Dashboard** | Desempenho individual e visão gerencial (funil, ranking, KPIs) |
| **Painel TV** | Display fullscreen para a sala comercial (metas, ranking, últimas vendas) |
| **Administração** | Usuários, papéis, permissões granulares, domínios (status, tipos de consórcio) |

---

## Para quem é

| Perfil | Uso típico |
|--------|------------|
| **Administrador** | Configura metas, domínios, equipe e papéis; confere e registra **pagamento** de recompensas; vê dashboard gerencial |
| **Colaborador** (consultor) | Cadastra e edita leads, registra vendas, importa planilhas, registra **escolha do cliente** (cashback/voucher) nas recompensas |
| **Sala comercial / TV** | Acompanha metas e vendas em tempo quasi-real no painel `/tv` (sem login de usuário) |

Papéis de sistema criados no seed: **Administrador** (todas as permissões) e **Colaborador** (operacional, sem gestão de pagamentos de recompensa).

---

## Módulos do sistema

### Aplicação web (rotas autenticadas)

| Módulo | Rota | Descrição |
|--------|------|-----------|
| **Dashboard** | `/dashboard` | Aba *Meu desempenho* (todos) e *Visão geral* (`dashboard.general`) |
| **Leads** | `/leads` | Listagem paginada, filtros, colunas configuráveis, criar/editar/excluir, importar Excel |
| **Ficha do lead** | `/leads/:id` | Dados completos, cadeia de indicação, histórico, atalho para venda |
| **Registrar venda** | `/vendas` | Nova venda + histórico em acordeão (editar data/boleto, cancelar venda) |
| **Indicações** | `/indicacoes` | Recompensas da campanha por venda — filtros, conferência em lote, escolha do cliente |
| **Configurações** | `/configuracoes` | Conta, meta do período, equipe, domínios |
| **Metas** | `/configuracoes/metas` | Meta pessoal, grade semanal, calendário de overrides |
| **Papéis** | `/configuracoes/papeis` | CRUD de papéis e matriz de permissões |

### Rotas públicas / especiais

| Rota | Descrição |
|------|-----------|
| `/login`, `/register` | Autenticação |
| `/primeiro-acesso` | Definição de senha inicial (usuários criados pelo admin) |
| `/tv` | Painel TV — metas, KPIs, ranking, feed de vendas, celebração com som |

### Navegação e permissões (menu lateral)

| Item | Permissão |
|------|-----------|
| Dashboard | Autenticado |
| Leads | `leads.view_all` ou `leads.view_own` |
| Registrar Venda | `sales.create` |
| Indicações | `leads.view_all` ou `leads.view_own` |
| Configurações | Autenticado (sub-seções restritas) |

---

## Funcionalidades por módulo

### Leads

- Grid server-side (25/50/100 por página), busca rápida, abas *Todos* / *Sem responsável*
- Filtros avançados por campo (status, datas, valores, responsável, etc.)
- Colunas visíveis persistidas em `localStorage`
- Campos: nome, celular, oportunidade (`external_code`), grau, valores, indicado por, vendedor, co-vendedor, primeiro contato, status, observações
- **Importação BASE_CRM:** preview de abas, mapeamento de status desconhecidos, deduplicação, relatório detalhado
- Soft-delete; lead com vendas ativas não pode ser excluído

### Vendas

- Registro: lead, valor, **data da venda**, tipo de consórcio, co-vendedor
- Efeitos: lead → status *Fechado*, atualiza `closedAmount`, incrementa meta do período, **gera recompensas da campanha**
- Listagem com data, lead, valor, consórcio, status do boleto
- Editar venda (data/boleto); cancelar venda reverte meta e valor fechado
- **Importação consórcio:** planilha de campanha (imobiliário/veículo) com resolução de vendedores via aliases

### Indicações e recompensas da campanha

Por cada venda fechada, o sistema gera registros de recompensa:

| Tipo | Beneficiário | Regra |
|------|--------------|-------|
| **Vendedor responsável** | User | Quando há responsável no lead |
| **Co-vendedor** | User | Quando há co-vendedor |
| **Indicação** | User ou Lead (cadeia) | Um registro por nível na cadeia de bônus; valor R$ 1.000 ou R$ 2.000 (venda ≥ R$ 1 mi) |
| **Cliente** | Lead comprador | Escolha: **Cashback (1ª parcela)** ou **Voucher de viagens** |

**Tela `/indicacoes`:**

- Tabela por venda: lead, valor, data, escolha do cliente, status de pagamento (admin)
- Filtros: período, pagamento, indicação, busca
- Modal por venda: seções Equipe comercial, Cadeia de indicação e Cliente
- Conferência em lote (admin): fila de modais para marcar pagamentos
- Preenchimento em lote (colaborador): fila para registrar escolhas pendentes do cliente
- Backfill automático na inicialização da API para vendas antigas sem recompensa

**Permissões de recompensa:**

| Permissão | Quem | O que pode |
|-----------|------|------------|
| `rewards.payments` | Admin | Ver e registrar pagamento (equipe, indicação, cliente) |
| `rewards.client_choice` | Colaborador | Registrar escolha do cliente (cashback/voucher) |

Colaboradores **não** veem status de pagamento nem seções de equipe/indicação — apenas a escolha do cliente.

### Indicações (modelo de dados)

- Cada lead tem **no máximo um indicador** (`USER` ou `LEAD`)
- Árvore recursiva: ancestrais e descendentes
- **Cadeia de bônus:** sobe a árvore até profundidade configurável (padrão 10)

### Metas

| Tipo | Configuração | Comportamento |
|------|--------------|---------------|
| **Período** | Configurações / Metas | Valor alvo + intervalo; `currentAmount` acompanha vendas |
| **Diária (empresa)** | Grade semanal + calendário | Base por dia da semana; overrides e presets (normal, peak, etc.) |
| **Diária pessoal** | Metas / onboarding | Override individual; usada no dashboard *Meu desempenho* |

Vendas incrementam/decrementam a meta na **data da venda** (inclusive ao alterar ou cancelar).

### Dashboard

- **Meu desempenho:** meta diária pessoal, KPIs, vendas do dia, leads ativos
- **Visão geral:** meta do período e do dia, funil por status, ranking, últimas vendas (espelha dados da TV)

### Painel TV (`/tv`)

Metas com barras de progresso, KPIs, ranking por vendedor no período, feed das últimas vendas, confete/som em nova venda (polling). Endpoint público: `GET /goals/daily/today`.

### Configurações e RBAC

- **Equipe:** CRUD usuários, atribuição de papéis, forçar primeiro acesso
- **Domínios:** status de lead, tipos de consórcio
- **Papéis:** permissões granulares por grupo (Leads, Vendas, Indicações, Metas, Dashboard, Administração)

Catálogo completo em `apps/api/src/constants/permissions.ts`.

---

## Stack técnica

| Camada | Tecnologia |
|--------|------------|
| **Backend** | Node.js 20, Fastify 5, Prisma, PostgreSQL 16, Zod, JWT, bcrypt |
| **Frontend** | TanStack Router/Start, React Query, Tailwind CSS, MUI DataGrid |
| **Monorepo** | pnpm workspaces |
| **Deploy** | Vercel (frontend) + Docker/VPS (API + Postgres) |

### Estrutura do repositório

```
apps/
  api/          # Backend Fastify + Prisma + Zod
  frontend/     # Frontend TanStack Start (Vercel em produção)
docker/         # docker-compose.dev.yml / docker-compose.prod.yml
Doc/            # Documentação de produto e referências
DOCUMENTACAO.md # Mapa completo: API, fluxos, RBAC, env vars
```

### Serviços backend (domínios)

`auth`, `user`, `permission`, `lead`, `leadImport`, `consorcioImport`, `purchase`, `referral`, `referralTree`, `bonusChain`, `campaignReward`, `goal`, `dailyGoal`, `dashboard`, `lookup`, `consortiumType`, `userResolver`, `domainResolver`.

---

## Desenvolvimento

### Pré-requisitos

- Node.js 20+
- pnpm 9+ (`corepack enable`)
- Docker + Docker Compose

### Setup

```bash
# 1. Instalar dependências
pnpm install

# 2. Copiar variáveis de ambiente
cp .env.example apps/api/.env

# 3. Subir banco e pgAdmin
pnpm docker:dev

# 4. Aplicar migrations
pnpm db:migrate

# 5. Seed: domínios, papéis RBAC e admin (SEED_ADMIN_* no .env)
pnpm db:seed

# 6. API (watch)
pnpm dev

# 7. Frontend (outro terminal)
pnpm dev:frontend

# Ou ambos:
pnpm dev:all
```

| Serviço | URL |
|---------|-----|
| API | `http://localhost:3001/api/v1` |
| Health | `http://localhost:3001/api/v1/health` |
| Frontend | `http://localhost:3000` (porta padrão Vite) |
| pgAdmin | `http://localhost:5050` (`admin@cais.local` / `admin`) |

Credenciais do admin: `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` no `.env`. O seed **não** cria leads, vendas ou metas — apenas domínios, RBAC e usuário administrador.

### Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | API em modo watch |
| `pnpm dev:frontend` | Frontend em dev |
| `pnpm dev:all` | API + frontend |
| `pnpm db:migrate` | Migrations Prisma |
| `pnpm db:seed` | Seed inicial |
| `pnpm db:studio` | Prisma Studio |
| `pnpm docker:dev` | Postgres + pgAdmin (dev) |
| `pnpm docker:prod` | Stack de produção (VPS) |

---

## API — visão rápida

Prefixo: **`/api/v1`**. Exceto `/health`, `/auth/login`, `/auth/register`, `/auth/set-initial-password` e `GET /goals/daily/today`, as rotas exigem `Authorization: Bearer <token>`.

| Grupo | Rotas principais |
|-------|------------------|
| **Auth** | `POST /auth/login`, `GET /auth/me` |
| **Usuários** | `GET/POST /users`, papéis por usuário |
| **Leads** | `GET/POST /leads`, `GET/PATCH/DELETE /leads/:id`, import, árvore, cadeia de bônus |
| **Vendas** | `GET /purchases`, `POST /leads/:id/purchases`, import consórcio |
| **Recompensas** | `GET /campaign-rewards`, `GET /purchases/:id/campaign-rewards`, `PATCH /campaign-rewards/:id` |
| **Metas** | `GET /goals/current`, metas diárias, dashboard |
| **Settings** | Lookups, status de lead, tipos de consórcio |
| **RBAC** | `GET /permissions/catalog`, CRUD `/roles` |

Lista completa de endpoints, payloads e permissões: [`DOCUMENTACAO.md` §4](./DOCUMENTACAO.md#4-mapa-da-api).

---

## Produção

Arquitetura: **dois frontends na Vercel** (admin + confidencial) + **API e Postgres na VPS via Docker**.

| Domínio | App | Root Directory (Vercel) |
|---------|-----|-------------------------|
| `admin.caisinvestimentos.com.br` | CRM (leads, vendas, indicações) | `apps/frontend` |
| `confidencial.caisinvestimentos.com.br` | Condomínio de credores (RJ) | `apps/confidencial` |
| `api.caisinvestimentos.com.br` | API REST | VPS Docker |

### Backend (VPS)

```bash
# POSTGRES_PASSWORD, JWT_SECRET, CORS_ORIGIN obrigatórios no .env
pnpm docker:prod
```

Sobe Postgres (rede interna) + API + pgAdmin. API e pgAdmin entram na rede Docker **`proxy-network`** (mesma do Nginx Proxy Manager).

### Nginx Proxy Manager

| Host | Forward | Porta |
|------|---------|-------|
| `api.seudominio.com.br` | `cais-api` | `3001` |
| `db.seudominio.com.br` | `cais-db` | `80` |

Use o alias **`cais-api`** (não `api`) para evitar conflito com outros projetos na mesma VPS.

`CORS_ORIGIN` deve listar **ambos** os frontends (admin e confidencial), separados por vírgula:

```env
CORS_ORIGIN=https://admin.caisinvestimentos.com.br,https://confidencial.caisinvestimentos.com.br
```

Após alterar `CORS_ORIGIN`, redeploy/restart do container da API.

### Frontend admin (Vercel)

1. Importe o repositório; **Root Directory:** `apps/frontend`
2. Framework: TanStack Start (Nitro)
3. Domínio customizado: `admin.caisinvestimentos.com.br` (Cloudflare CNAME → Vercel)
4. Variáveis:
   - `VITE_API_URL` — URL pública da API (ex.: `https://api.caisinvestimentos.com.br/api/v1`)
   - `VITE_TV_TOKEN` / `VITE_TV_SOUND` — opcionais, painel TV

### Frontend confidencial (Vercel — 2º projeto)

1. Novo projeto no mesmo repositório; **Root Directory:** `apps/confidencial`
2. Domínio customizado: `confidencial.caisinvestimentos.com.br` (Cloudflare CNAME → Vercel)
3. Variáveis:
   - `VITE_API_URL` — mesma URL da API (`https://api.caisinvestimentos.com.br/api/v1`)

O módulo RJ **não** aparece no menu do admin. Acesso exige permissão `rj.view` (Administrador recebe por padrão). Login é independente do admin (sessão JWT por subdomínio).

Dev local:

```bash
pnpm dev:confidencial   # http://localhost:5174
pnpm dev:frontend       # admin
pnpm --filter api dev   # API
```

Em dev local, o proxy Vite (`/api/v1` → `localhost:3001`) funciona sem `VITE_API_URL`.

### pgAdmin e troubleshooting

Acesso: `https://db.seudominio.com.br`. Login: `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD`. Registrar servidor Postgres: host `postgres`, porta `5432`.

Diagnóstico detalhado (502, connection refused, volumes): [`DOCUMENTACAO.md`](./DOCUMENTACAO.md) e seção pgAdmin neste repositório (histórico de deploy).

---

## Referências

| Documento | Conteúdo |
|-----------|----------|
| [`DOCUMENTACAO.md`](./DOCUMENTACAO.md) | Mapa completo do sistema — módulos, API, RBAC, fluxos, modelo de dados, env vars |
| `Doc/` | Materiais de produto e referências de negócio |
| `apps/api/prisma/schema.prisma` | Modelo de dados canônico |
| `apps/api/src/constants/permissions.ts` | Catálogo de permissões RBAC |

---

## Licença

Projeto privado — uso interno CAIS.
