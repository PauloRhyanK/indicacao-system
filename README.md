# Cais Indicações — Monorepo

MVP de um Programa de Indicações para Consórcios. Monorepo gerido com **pnpm**.

## Estrutura

```
apps/
  api/        # Backend Fastify + Prisma + Zod
  frontend/   # Frontend TanStack Start (Vercel em produção)
docker/
  docker-compose.dev.yml    # Postgres + pgAdmin (infra de dev)
  docker-compose.prod.yml   # Postgres + API + pgAdmin (subdomínio db.*)
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

Sobe Postgres (rede interna) + API + **pgAdmin** (subdomínio `db.*`). As migrations são aplicadas automaticamente no boot (`prisma migrate deploy`).

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

#### pgAdmin — subdomínio `db.seudominio.com.br`

1. **DNS:** registro **A** (ou CNAME) apontando `db.seudominio.com.br` para o IP da VPS.

2. **NPM:** crie um **Proxy Host** separado (não use Custom Location):

| Campo | Valor |
| --- | --- |
| Domain Names | `db.seudominio.com.br` |
| Forward Hostname | `cais-db` |
| Forward Port | `80` |
| Scheme | `http` |
| SSL | Let's Encrypt |

3. **`.env` da VPS:** `PROXY_NETWORK` = mesma rede do `global-proxy` (ex.: `proxy-network`).

4. **Recriar pgAdmin** após `git pull`:

```bash
docker compose --env-file .env -f docker/docker-compose.prod.yml up -d pgadmin
```

Acesse: **`https://db.seudominio.com.br`**

- Login pgAdmin: `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD`
- Servidor **CAIS — Postgres**: senha = `POSTGRES_PASSWORD` (primeira conexão)

Ferramenta de infra/dev — **sem atalho no app** CAIS.

**Segurança:** considere Access List no NPM (IP do escritório/VPN). O pgAdmin tem login próprio, mas a URL fica pública.

O Postgres **não** entra na rede do proxy; só o pgAdmin expõe a interface.

#### Diagnóstico pgAdmin (502 / connection refused)

```bash
docker ps --filter name=cais_pgadmin
docker logs cais_pgadmin_prod --tail 50
docker run --rm --network proxy-network curlimages/curl:latest \
  curl -svI http://cais-db:80/ 2>&1 | head -15
```

Esperado: `HTTP/1.1 302` com redirect para `/login`. Se `connection refused`, o container não subiu — veja os logs (email/senha `PGADMIN_*` inválidos ou ausentes).

| Problema | Solução |
|----------|---------|
| `PGADMIN_*` ausente no `.env` | Preencher e `docker compose ... up -d pgadmin` |
| `NameError: name 'https' is not defined` nos logs | `git pull` (remove `PGADMIN_CONFIG_PREFERRED_URL_SCHEME` inválido) e `docker compose ... up -d pgadmin --force-recreate` |
| NPM aponta para `localhost` | Usar **`cais-db`**, porta **80** |
| Redes Docker diferentes | `PROXY_NETWORK=proxy-network` (ou nome da rede do `global-proxy`) |

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
