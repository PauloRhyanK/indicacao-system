### 🔍 Investigação Ativa (Preciso que respondas a isto para fecharmos o cronograma final)

1. **Integração:** Este banco PostgreSQL vai funcionar de forma 100% isolada neste MVP, ou precisaremos de sincronizar estes leads com algum CRM legado (RD Station, Salesforce, HubSpot) no curto prazo? *(Isso muda drasticamente o tempo de backend).*
2. **Volumetria e Paginação:** Qual é a expectativa de volume de leads para os primeiros 3 meses? A árvore de indicações terá limite de níveis (ex: premiar até o 3º nível de quem indicou) ou será teoricamente infinita? *(Árvores infinitas exigem queries recursivas pesadas que precisam de ser cacheadas).*

---

### ⚠️ Gestão de Risco Técnico (Top 3)


| Risco                                             | Impacto                                                                                                                                                     | Estratégia de Mitigação                                                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Queries Recursivas na Árvore de Indicações** | **Alto:** Bancos SQL lidam mal com hierarquias infinitas (polimorfismo entre leads e usuários indicando). A performance pode afundar quando a base crescer. | Criar uma tabela de junção `referrals` e usar a extensão `ltree` do PostgreSQL ou *Recursive CTEs* limitadas a N níveis de profundidade no backend.                                   |
| **2. Alucinação de IA no Frontend (Loveable)**    | **Médio:** Ferramentas *no-code/AI* tendem a quebrar ao gerenciar estados complexos, como renderizar uma árvore visual de nós pais e filhos.                | O prompt do Loveable deve focar primeiro na estrutura tabular. A árvore deve ser construída como uma lista hierárquica simples (accordions) antes de tentar um grafo visual complexo. |
| **3. Polimorfismo na Indicação**                  | **Alto:** Permitir que um "Lead" ou um "Usuário" seja o indicador quebra as chaves estrangeiras tradicionais (Foreign Keys) no SQL.                         | Abstrair a entidade indicadora. A tabela `leads` terá campos `referred_by_type` (Enum: USER, LEAD) e `referred_by_id`. O ORM do backend cuidará da integridade.                       |


---

### 🛠️ Entregáveis Estruturados (Passo a Passo)

Já li os arquivos `cais_cri_btg.html` e `cais_troca_ativos_5.html`. Eles utilizam a biblioteca Tailwind CSS, a fonte 'General Sans', e um padrão de cores muito elegante (Azul Profundo, Azul Marinho, Ouro) e componentes bem definidos.

Aqui estão os artefatos solicitados para darmos início imediato:

#### 1. Ticket de Banco de Dados (Para gerar via IA - ex: ChatGPT/Claude)

**Copia e cola o texto abaixo na tua IA de geração de código:**

> "Atue como um Arquiteto de Banco de Dados PostgreSQL. Crie o script DDL completo para um MVP de um Programa de Indicações.
> **Regras de Negócio:**
>
> 1. Tabela `users`: (id, name, email, password_hash, role, created_at).
> 2. Tabela `leads`: (id, name, phone, sales_status, notes, created_at).
> 3. Tabela `referrals`: Lida com o polimorfismo. Campos: id, `referred_lead_id` (FK para leads), `referrer_type` (Enum: 'USER' ou 'LEAD'), `referrer_id` (UUID correspondente à tabela correta), created_at.
> 4. Tabela `purchases`: Registra vendas de consórcio. Campos: id, `lead_id` (FK), amount (decimal), purchase_date.
> 5. Tabela `goals`: Acompanha a meta. Campos: id, target_amount, current_amount, start_date, end_date.
>
> **Output esperado:** Código SQL puro com criação de UUIDs nativos do Postgres, constraints, índices nas foreign keys e um comentário sobre como fazer uma query recursiva (CTE) para buscar a árvore de indicações de uma compra."

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
> 2. **Gestão de Leads:** Uma tabela elegante de leads (Nome, Celular, Status, Indicado Por). Deve ter um header com campo de busca. Um botão lateral "Adicionar Lead" que abre um modal.
> 3. **Detalhes do Lead:** Ao clicar num lead, ver uma tela com seus dados, campo de "Observações", um botão "Registrar Compra de Consórcio" e, abaixo, uma UI em formato de "Accordion" ou "Árvore de Diretórios" mostrando quem o indicou e quem ele já indicou.
>
> Mantenha o código limpo, modularizando a Tabela, o Modal e a Árvore de indicações em componentes separados."

#### 4. Estratégia do Backend (Arquitetura Sugerida)

- **Linguagem & ORM:** TypeScript executado em **Node.js** (recomendo Express ou Fastify para leveza no MVP) associado ao **Prisma ORM**.
- **Por que Prisma?** Ele lida perfeitamente com TypeScript, cria os *schemas* com tipagem segura e facilitará imenso a criação de queries relacionais complexas (necessárias para a árvore de indicação) no PostgreSQL.
- **Endpoints Chave:** CRUD de Leads, Cadastro de Compra (este endpoint atualiza a tabela `purchases` e adiciona o valor à tabela `goals`), e um endpoint `GET /leads/:id/tree` (que roda a query recursiva para entregar a árvore montada ao frontend).

#### 5. Infraestrutura (VPS via Docker)

Subir tudo num monorepo usando Docker Compose para facilitar a vida da tua equipa pequena.

- `container 1`: Frontend (dist build servido via Nginx).
- `container 2`: Backend API (Node.js).
- `container 3`: Banco de dados PostgreSQL 15+.
- **Dica de Senior:** Configurar um Caddy ou Traefik como *Reverse Proxy* na entrada da VPS para gerir os certificados SSL (HTTPS) de forma automática.

---

### 📅 Estimativa Macro Preliminar (Assumindo 2 Devs Plenos)

*Nota: Este cronograma será ajustado com base nas tuas respostas às minhas perguntas acima.*


| Épico (Metodologia Ágil)                        | Esforço Estimado | Foco Principal                                                                  | Gargalos / Encarecedores                                                                 |
| ----------------------------------------------- | ---------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Sprint 1: Fundação & BD**                     | 1 Semana         | Setup Docker, Schema Postgres, Modelos Prisma, Auth Básico de Usuários.         | Configurar o polimorfismo das indicações (Referrals) de forma robusta.                   |
| **Sprint 2: Core Business API**                 | 1 Semana         | CRUD Leads, Registro de Vendas, Progressão de Metas.                            | Garantir que o rollback funcione se uma compra falhar no meio.                           |
| **Sprint 3: Front-end (Loveable) & Integração** | 1.5 Semanas      | Geração das telas base, modal, listagens, integração via Axios/Fetch com a API. | Customizar o Loveable para respeitar os detalhes refinados do HTML enviado.              |
| **Sprint 4: A Árvore de Indicações**            | 1 Semana         | Desenvolver a query recursiva no backend e renderizar a árvore visual no front. | **Este é o ponto que vai encarecer o orçamento.** A lógica da árvore é chata de debugar. |


Fico a aguardar as tuas respostas sobre a Integração e a Volumetria para cravarmos este escopo e avançarmos para o código! Como preferes seguir?