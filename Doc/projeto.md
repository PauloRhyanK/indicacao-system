### ✅ Decisões de Escopo (Fechadas)

1. **Integração:** O MVP opera de forma **isolada** com **importação inicial via planilha Excel** (BASE_CRM). Integrações com CRM legado (RD Station, Salesforce, HubSpot) ficam **fora do escopo imediato**, mas o schema deve prever campos de rastreio (`external_code`, `source`) para facilitar uma fase 2.
2. **Volumetria e Árvore de Indicações:** Volume nos primeiros 3 meses é **indefinido**. A query recursiva da árvore terá **limite simbólico de 10 níveis**; se ultrapassar, a API retorna os dados parciais e avisa o usuário. Métricas de volumetria real serão analisadas depois do go-live.

---

### ⚠️ Gestão de Risco Técnico (Top 3)


| Risco                                             | Impacto                                                                                                                                                     | Estratégia de Mitigação                                                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Queries Recursivas na Árvore de Indicações** | **Alto:** Bancos SQL lidam mal com hierarquias infinitas (polimorfismo entre leads e usuários indicando). A performance pode afundar quando a base crescer. | Criar tabela `referrals` e usar *Recursive CTEs* com **limite fixo de 10 níveis** no backend. Se a profundidade real exceder o limite, retornar flag `tree_truncated: true` na API para o frontend avisar o usuário. |
| **2. Alucinação de IA no Frontend (Loveable)**    | **Médio:** Ferramentas *no-code/AI* tendem a quebrar ao gerenciar estados complexos, como renderizar uma árvore visual de nós pais e filhos.                | O prompt do Loveable deve focar primeiro na estrutura tabular. A árvore deve ser construída como uma lista hierárquica simples (accordions) antes de tentar um grafo visual complexo. |
| **3. Polimorfismo na Indicação**                  | **Alto:** Permitir que um "Lead" ou um "Usuário" seja o indicador quebra as chaves estrangeiras tradicionais (Foreign Keys) no SQL.                         | Tabela dedicada `referrals` com `referrer_type` + `referrer_id` (sem FK polimórfica rígida). Validação de integridade no backend/ORM.                       |


---

### 📊 Análise BASE_CRM vs Schema MVP

Planilha operacional recebida (`BASE_CRM`). Mapeamento coluna a coluna com o DDL proposto e lacunas identificadas.

| Coluna BASE_CRM | Campo sugerido no MVP | Status | Observação |
| --- | --- | --- | --- |
| **ID** (ex: OP-0001) | `leads.external_code` | **Faltava** | Código legível para referência humana e importação Excel. UUID interno permanece como PK. |
| **Data do registro** | `leads.created_at` | ✅ Coberto | Mapeia direto na importação. |
| **Nome do cliente** | `leads.name` | ✅ Coberto | — |
| **Telefone** | `leads.phone` | ✅ Coberto | Normalizar formato na importação (DDI, máscara). |
| **Origem do lead** | `leads.source` | **Faltava** | Ex.: "Base interna", "Indicação", "Marketing". Essencial para analytics de canal. |
| **Responsável pela reunião** | `leads.assigned_to_user_id` (FK → `users`) | **Faltava** | Consultor responsável (ex.: "Lucas/Carlos"). Pode exigir cadastro prévio de usuários na importação. |
| **Status atual da oportunidade** | `leads.sales_status` | ✅ Coberto | Usar enum ou lookup alinhado aos valores da planilha ("Fechado", "Em negociação", etc.). |
| **Próxima ação** | `leads.next_action` | **Faltava** | Texto curto do próximo passo comercial. |
| **Data do próximo follow-up** | `leads.next_follow_up_at` | **Faltava** | Agenda do vendedor; indexar para listagens de "follow-ups do dia". |
| **Observações** | `leads.notes` | ✅ Coberto | Campo de texto livre. |
| **Valor da carta ofertada** | `leads.offered_amount` | **Faltava** | Pipeline em negociação; distinto de venda fechada. |
| **Valor fechado** | `purchases.amount` + `leads.closed_amount` | ⚠️ Parcial | `purchases` registra cada venda; `closed_amount` espelha o valor da planilha quando status = Fechado (denormalizado para importação). |
| **Última atualização** | `leads.updated_at` | **Faltava** | Auditoria e detecção de registros estagnados. |

**Campos do schema original sem equivalente direto na BASE_CRM:**

| Entidade MVP | Uso | Relação com a planilha |
| --- | --- | --- |
| `referrals` | Cadeia de indicações (USER ou LEAD → lead) | Inferir quando `source = "Indicação"`; na importação inicial pode ficar vazio até cadastro manual. |
| `purchases` | Histórico de vendas de consórcio | Criar registro quando `Valor fechado` > 0 e status = Fechado. |
| `goals` | Meta global de vendas | Não existe na planilha; entidade administrativa do dashboard. |
| `users` | Login e consultores | Necessário para `assigned_to_user_id` e indicadores do tipo USER. |

**Regras de importação Excel (MVP):**

1. `external_code` ← coluna **ID** (chave de deduplicação na reimportação).
2. `source`, `sales_status`, `next_action`, datas e valores ← mapeamento 1:1 conforme tabela acima.
3. `assigned_to_user_id` ← resolver por nome do **Responsável pela reunião** (criar usuário placeholder se não existir, ou fila de revisão pós-importação).
4. Se **Origem** = "Indicação" e houver coluna futura com nome do indicador, popular `referrals`; na planilha atual isso não vem explícito.
5. Linhas com **Valor fechado** preenchido geram registro em `purchases` e incrementam `goals.current_amount`.

---

### 📁 Planilha de referência validada

Arquivo: `Doc/Referências/Consórcio CAIS_MESADIGITAL.xlsx`

**Abas do arquivo:**

| Aba | Uso |
| --- | --- |
| `PAINEL` | Dashboard executivo (KPIs calculados a partir da BASE_CRM) |
| **`BASE_CRM`** | **Fonte de importação** — mini CRM de oportunidades |
| `CONFIGURAÇÕES` | Parâmetros internos da planilha |
| `_APOIO` | Tabelas auxiliares para fórmulas do painel |

**Layout da aba BASE_CRM:** as primeiras 5 linhas são título, instruções e legenda visual. O cabeçalho da tabela está na **linha 6**; os dados começam na **linha 7** (`OP-0001` … `OP-0056`). O importador detecta automaticamente a linha de cabeçalho (colunas **ID** + **Nome do cliente**) e prioriza a aba `BASE_CRM`.

**Colunas confirmadas (13 — idênticas ao modelo BASE_CRM):**

| # | Coluna na planilha | Campo MVP |
| --- | --- | --- |
| 1 | ID | `leads.external_code` |
| 2 | Data do registro | `leads.created_at` |
| 3 | Nome do cliente | `leads.name` |
| 4 | Telefone | `leads.phone` (só dígitos) |
| 5 | Origem do lead | `leads.source` |
| 6 | Responsável pela reunião | `leads.assigned_to_user_id` |
| 7 | Status atual da oportunidade | `leads.sales_status` |
| 8 | Próxima ação | `leads.next_action` |
| 9 | Data do próximo follow-up | `leads.next_follow_up_at` |
| 10 | Observações | `leads.notes` |
| 11 | Valor da carta ofertada | `leads.offered_amount` |
| 12 | Valor fechado | `leads.closed_amount` + `purchases` |
| 13 | Última atualização | `leads.updated_at` |

**Valores reais encontrados na planilha (jun/2026):**

| Campo | Valores |
| --- | --- |
| Origem do lead | Base interna, Prospecção ativa, Evento mulheres, Base Lucas, MPA |
| Status | Fechado, Perdido, Em negociação, Follow-up, Pensando, Reagendar, Reunião agendada, Sem retorno |
| Responsável | Lucas/Carlos, Patrick/Carlos, Patrick |
| Volume | 56 oportunidades (`OP-0001`–`OP-0056`) |

**Comportamento do importador (`POST /api/v1/leads/import`):**

1. Aceita `.xlsx` / `.xls` via multipart (`campo file`).
2. Localiza aba `BASE_CRM` (fallback: primeira aba com cabeçalho reconhecível).
3. Deduplica por `external_code` (reimportação atualiza o registro existente).
4. Resolve consultor por nome; cria usuário placeholder se não existir.
5. Linhas sem nome são ignoradas; demais erros retornam no relatório `{ imported, updated, skipped, errors[] }`.
6. Frontend: botão **Importar Excel** na página de Leads, com seleção de aba (default automático).

**Seleção de aba (auto-detect):**

1. Varre **todas** as abas do arquivo.
2. Em cada aba, procura uma linha com colunas **ID** + **Nome do cliente** (cabeçalho pode não ser a linha 1).
3. Sugere por padrão: aba chamada `BASE_CRM`, ou a aba com mais colunas reconhecidas e mais linhas de dados.
4. O usuário pode escolher outra aba no modal antes de importar (`POST /leads/import/preview` lista as opções).

---

### 🛠️ Entregáveis Estruturados (Passo a Passo)

Já li os arquivos `cais_cri_btg.html` e `cais_troca_ativos_5.html`. Eles utilizam a biblioteca Tailwind CSS, a fonte 'General Sans', e um padrão de cores muito elegante (Azul Profundo, Azul Marinho, Ouro) e componentes bem definidos.

Aqui estão os artefatos solicitados para darmos início imediato:

#### 1. Ticket de Banco de Dados (Para gerar via IA - ex: ChatGPT/Claude)

**Copia e cola o texto abaixo na tua IA de geração de código:**

> "Atue como um Arquiteto de Banco de Dados PostgreSQL sênior. Atualize o script DDL do MVP considerando tabelas dinâmicas de parametrização para evitar enums rígidos.
>
> **Tabelas auxiliares (Módulo 5):**
>
> 1. `lead_statuses`: (id UUID PK, slug VARCHAR UNIQUE, name VARCHAR).
> 2. `lead_sources`: (id UUID PK, slug VARCHAR UNIQUE, name VARCHAR).
> 3. `next_actions`: (id UUID PK, slug VARCHAR UNIQUE, name VARCHAR).
>
> **Tabelas principais:**
>
> 1. `users`: (id UUID PK, name, email, password_hash, role, created_at).
> 2. `leads`: (id UUID PK, external_code VARCHAR UNIQUE, name, phone, **source_id** FK → lead_sources, assigned_to_user_id FK → users, **sales_status_id** FK → lead_statuses, **next_action_id** FK nullable → next_actions, next_follow_up_at, notes, offered_amount DECIMAL nullable, closed_amount DECIMAL nullable, created_at, updated_at).
> 3. `referrals`: Polimorfismo — id, referred_lead_id (FK → leads), referrer_type (Enum USER/LEAD), referrer_id (UUID), created_at.
> 4. `purchases`: id, lead_id (FK), amount, purchase_date, created_at.
> 5. `goals`: id, target_amount, current_amount, start_date, end_date.
>
> **INSERTs iniciais (planilha Cais):**
>
> - Status: Reunião agendada, Reunião realizada, Pensando, Mandar proposta, Proposta enviada, Em negociação, Fechado, Perdido, Sem retorno, Follow-up, Reagendar.
> - Origens: Base interna, MPA, Reativação, Prospecção ativa, Base Lucas, WhatsApp, Outro, Evento mulheres.
> - Ações: Cobrar decisão, Mandar proposta, Reenviar proposta, Agendar retorno, Ligar novamente, Enviar mensagem, Aguardar cliente, Sem ação, Fechado, Encerrado.
>
> **Requisitos técnicos:**
> - UUIDs nativos (`gen_random_uuid()`), FKs com ON DELETE SET NULL nas tabelas auxiliares.
> - Índices em `leads.external_code`, `leads.sales_status_id`, `leads.source_id`, `leads.next_follow_up_at`.
> - CTE recursiva para árvore de indicações **limitada a 10 níveis** (implementada em `referralTree.service.ts` — sem alteração neste módulo).
> - Importação Excel valida status/origem/ação contra tabelas auxiliares; valores desconhecidos exigem mapeamento no preview antes de persistir."

#### 2. Prompt para Extração da Identidade Visual

Como solicitaste, aqui está o prompt estruturado (embora eu já tenha processado a maior parte por ti).
**Prompt:**

> "Analise os arquivos HTML enviados. Aja como um UI/UX Engineer e extraia um Design System focado em Tailwind CSS.
> Quero que me devolvas:
>
> 1. Paleta de cores exata (Mapeie as vars CSS como `--azul-profundo`, `--ouro`, `--cinza-claro` para a config do Tailwind).
> 2. Família de fontes utilizada e chamadas de API (ex: Fontshare 'General Sans').
> 3. Padrão de classes Tailwind para os seguintes componentes: Cards (.kpi-card, .card), Botões (.btn-primary, .btn-gold), Badges de status (.badge-green, .badge-amber) e Tabelas (.data-table).
>
> Retorne isso formatado em um JSON/Markdown pronto para ser injetado nas instruções globais de um gerador de frontend."

#### 3. Prompt para o Frontend (Loveable)

**Copia e cola no Loveable:**

> "Crie um Dashboard administrativo para um MVP de Consórcios utilizando React, Tailwind CSS e Lucide Icons.
> **Design System Obrigatório:**
>
> - Fonte: 'General Sans' (importe via API Fontshare).
> - Cores customizadas no Tailwind: `azul-profundo` (#081421), `azul-marinho` (#002B49), `ouro` (#d9bd7e), `slate-50` para background.
> - Botões Primários devem ser escuros, Botões de destaque em Ouro. Use estilização de cards com bordas sutis.
>
> **Páginas a criar (Crie um roteador simples com abas no topo):**
>
> 1. **Dashboard Inicial:** Um Card KPI gigante (estilo `.kpi-card`) mostrando o progresso da Meta de Vendas (Valor atual vs Valor Alvo) com uma barra de progresso verde/ouro.
> 2. **Gestão de Leads:** Tabela com colunas alinhadas à BASE_CRM: Nome, Celular, Status, Origem, Responsável, Próxima Ação, Follow-up, Valor Ofertado. Botão **Importar Excel** e **Adicionar Lead** (modal).
> 3. **Detalhes do Lead:** Ao clicar num lead, ver uma tela com seus dados, campo de "Observações", um botão "Registrar Compra de Consórcio" e, abaixo, uma UI em formato de "Accordion" ou "Árvore de Diretórios" mostrando quem o indicou e quem ele já indicou.
>
> Mantenha o código limpo, modularizando a Tabela, o Modal e a Árvore de indicações em componentes separados."

#### 4. Estratégia do Backend (Arquitetura Sugerida)

- **Linguagem & ORM:** TypeScript executado em **Node.js** (recomendo Express ou Fastify para leveza no MVP) associado ao **Prisma ORM**.
- **Por que Prisma?** Ele lida perfeitamente com TypeScript, cria os *schemas* com tipagem segura e facilitará imenso a criação de queries relacionais complexas (necessárias para a árvore de indicação) no PostgreSQL.
- **Endpoints Chave:** CRUD de Leads, **POST /leads/import** (upload Excel BASE_CRM), Cadastro de Compra (atualiza `purchases` e `goals`), e **GET /leads/:id/tree?maxDepth=10** (CTE recursiva com flag `tree_truncated` se exceder o limite).

#### 5. Infraestrutura (VPS via Docker)

Subir tudo num monorepo usando Docker Compose para facilitar a vida da tua equipa pequena.

- `container 1`: Frontend (dist build servido via Nginx).
- `container 2`: Backend API (Node.js).
- `container 3`: Banco de dados PostgreSQL 15+.
- **Dica de Senior:** Configurar um Caddy ou Traefik como *Reverse Proxy* na entrada da VPS para gerir os certificados SSL (HTTPS) de forma automática.

---

### 📅 Estimativa Macro Preliminar (Assumindo 2 Devs Plenos)

*Escopo fechado com importação Excel e limite de 10 níveis na árvore.*


| Épico (Metodologia Ágil)                        | Esforço Estimado | Foco Principal                                                                  | Gargalos / Encarecedores                                                                 |
| ----------------------------------------------- | ---------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Sprint 1: Fundação & BD**                     | 1 Semana         | Setup Docker, Schema Postgres (incl. campos BASE_CRM), Modelos Prisma, Auth Básico. | Polimorfismo de `referrals` e mapeamento de importação Excel.                            |
| **Sprint 2: Core Business API**                 | 1 Semana         | CRUD Leads, Import Excel, Registro de Vendas, Metas.                               | Resolver consultor na importação; rollback transacional em compras.                      |
| **Sprint 3: Front-end (Loveable) & Integração** | 1.5 Semanas      | Telas base, modal, listagens, upload Excel, integração com API.                   | Colunas extras da BASE_CRM na tabela; customização visual do HTML de referência.         |
| **Sprint 4: A Árvore de Indicações**            | 1 Semana         | CTE recursiva (max 10 níveis) + árvore visual + aviso de truncamento.               | UX do aviso quando a contagem ultrapassa o limite simbólico.                             |

**Total preliminar:** ~4,5 semanas (2 devs plenos), sem integração CRM externa na fase 1.