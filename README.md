# Cais Indicações — Monorepo

MVP de um Programa de Indicações para Consórcios. Monorepo gerido com **pnpm**.

## Estrutura

```
apps/
  api/        # Backend Fastify + Prisma + Zod
  frontend/   # Frontend TanStack Start (Vercel em produção)
docker/
  docker-compose.dev.yml    # Postgres + pgAdmin (infra de dev)
  docker-compose.prod.yml   # Postgres + API (produção na VPS)
Doc/          # Documentação de produto e referências
```

## Stack do backend

- Node.js 20 + Fastify 5
- Prisma ORM + PostgreSQL 16
- Zod (validação)
- JWT (`@fastify/jwt`) + bcrypt
- `xlsx` para importação de planilhas (BASE_CRM)

## Pré-requisitos

- Node.js 20+
- pnpm 9+ (`corepack enable`)
- Docker + Docker Compose

## Setup de desenvolvimento

```bash
# 1. Instalar dependências
pnpm install

# 2. Copiar variáveis de ambiente
cp .env.example apps/api/.env

# 3. Subir banco e pgAdmin
pnpm docker:dev

# 4. Aplicar migrations
pnpm db:migrate

# 5. Popular domínios, papéis RBAC e usuário admin (via SEED_ADMIN_* no .env)
pnpm db:seed

# 6. Rodar a API em modo watch
pnpm dev
```

- API: `http://localhost:3001/api/v1`
- Health check: `http://localhost:3001/api/v1/health`
- pgAdmin: `http://localhost:5050` (login `admin@cais.local` / `admin`)

Credenciais do admin (seed): definidas em `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` no `.env`. O seed popula **somente** domínios do sistema (status, origens, próximas ações, tipos de consórcio), papéis RBAC e o usuário administrador — sem metas, leads, vendas ou indicações.

## Endpoints principais

Todos sob o prefixo `/api/v1`. Exceto `/health` e `/auth/login`, exigem `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/auth/login` | Login, retorna `{ token, user }` |
| GET | `/auth/me` | Perfil autenticado |
| GET/POST | `/users` | Lista/cria consultores (POST = ADMIN) |
| GET | `/leads` | Lista paginada (`page`, `limit`, `search`, `status`, `source`, `assignedTo`) |
| POST | `/leads` | Cria lead (com `referrer` opcional) |
| GET/PATCH/DELETE | `/leads/:id` | Detalhe / atualizar / remover (DELETE = ADMIN) |
| POST | `/leads/import` | Upload `.xlsx`/`.xls` (campo `file`) |
| GET | `/leads/:id/tree?maxDepth=10` | Árvore de indicações |
| GET/POST | `/leads/:leadId/purchases` | Histórico / registrar compra |
| GET | `/goals/current` | Meta vigente |
| PATCH | `/goals/:id` | Atualiza meta (ADMIN) |
| GET | `/dashboard/summary` | KPIs do dashboard |

## Produção

Arquitetura: **frontend na Vercel** + **backend e Postgres na VPS via Docker**.

### Backend (VPS)

```bash
# Variáveis obrigatórias no ambiente / .env: POSTGRES_PASSWORD, JWT_SECRET, CORS_ORIGIN
pnpm docker:prod
```

Sobe Postgres (rede interna) + API conectada à **mesma rede Docker** do Nginx Proxy Manager. As migrations são aplicadas automaticamente no boot (`prisma migrate deploy`).

No `.env` de produção, defina também `PROXY_NETWORK` (nome da rede do container `global-proxy`):

```bash
docker inspect global-proxy --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

### Nginx Proxy Manager

Crie um **Proxy Host** (mesmo padrão do Church Manager):

| Campo | Valor |
| --- | --- |
| Domain Names | `api.seudominio.com.br` |
| Forward Hostname | `cais-api` |
| Forward Port | `3001` |
| SSL | Let's Encrypt |

Use `cais-api` (alias na rede proxy) — **não** use `api`, pois conflita com o Church Manager.

O Postgres **não** entra na rede do proxy (fica só em `cais_internal`).

Defina `CORS_ORIGIN` com a URL do frontend na Vercel (ex.: `https://cais-indicacoes.vercel.app`).

### Frontend (Vercel)

1. Importe o repositório na Vercel.
2. **Root Directory:** `apps/frontend`
3. Framework: TanStack Start (detectado automaticamente com Nitro).
4. Variáveis de ambiente:
   - `VITE_API_URL` — URL pública da API (ex.: `https://api.seudominio.com.br/api/v1`)
   - `VITE_TV_TOKEN` / `VITE_TV_SOUND` — opcionais, para a tela TV
5. Deploy.

Em dev local, o proxy Vite (`/api/v1` → `localhost:3001`) continua funcionando sem alterar `VITE_API_URL`.
