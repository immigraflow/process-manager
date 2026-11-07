# CLAUDE.md

Guia para trabalhar neste repositório. Interface e comentários do código estão em português (pt-BR); mantenha o idioma.

## O que é

ImmigraFlow ("Gestor de Processos"): app web para escritórios de imigração acompanharem processos de visto americano (PWD → ETA 9089 → I-140 → NVC/AOS, com ciclo de recursos). Multi-tenant: cada usuário pertence a uma organização e só vê os dados dela.

## Stack e como rodar

- HTML + CSS + JavaScript em módulos ES nativos. **Sem framework, sem `package.json`, sem build e sem testes automatizados.**
- Backend: Supabase (Auth + Postgres) via `@supabase/supabase-js@2` carregado por CDN. Ícones PrimeIcons 7 e fontes Google também por CDN.
- Para rodar localmente, sirva a pasta por HTTP (módulos ES não funcionam em `file://`):
  `python3 -m http.server 8000` e abra `http://localhost:8000`.
- `js/config.js` tem a URL e a chave `anon` do Supabase (pública por desenho; a segurança depende do RLS no banco).
- O schema SQL/RLS **não está versionado aqui**; só as migrações pontuais em `db/migrations/` (aplicar manualmente no Supabase). Tabelas usadas: `organizations`, `organization_members`, `cases`, `etapas`, `templates`, `eventos` (colunas em `js/api.js` e `js/mappers.js`).

## Arquitetura (js/)

| Arquivo | Papel |
|---|---|
| `app.js` | Ponto de entrada: shell da página, abas (`TABS`), modais, `render()` |
| `state.js` | Estado global em memória (`state`) e helpers (`getCase`, `findI140Marco`, `findStatusMarco`) |
| `constants.js` | Status, `MARCO_DEFS`, templates (`DEFAULT_TEMPLATE`, `AOS_TEMPLATE`, `RECURSO_STEPS`), colunas do Kanban |
| `domain.js` | Regras puras: etapa concluída, urgência, categoria do Kanban, prazo mais próximo, `computeResultados`, `agruparPorFase`/`faseDaEtapa` (fases da linha do tempo), `prazoInfo` (selo de prazo) e `orderCasesByStatus` (ordem da lista lateral) |
| `dashboard.js` | Cálculos puros da aba Início (indicadores e gráficos), reaproveitando `domain.js` |
| `mappers.js` | Linha do Supabase (snake_case) ⇄ modelo local (camelCase) |
| `api.js` | **Único** lugar que chama `sb.from(...)`. Todo CRUD passa por aqui |
| `auth.js` / `authStorage.js` | Login, logout, recuperar/trocar senha, "permanecer conectado" |
| `events.js` | Liga os elementos renderizados às ações e re-renderiza |
| `render/*.js` | Uma função `render...View()` por aba, devolvendo string HTML |

Abas: Início, Processos, Acompanhamento dos casos (Kanban), Prioridades, Resultados, Data de prioridade, Lembretes.

## Padrões que precisam ser respeitados

- **Render total:** a cada mudança de estado o `#app` inteiro é refeito com `innerHTML`, e `attachEvents(render)` religa os handlers (`.onclick`/`.onchange`, sem delegação). Para um novo elemento interativo, adicione o handler em `attachEvents`.
- **`withBusy(render, fn)`** (em `events.js`) chama `render()` antes de esperar o servidor. Por isso, **leia os campos do formulário antes** de chamá-lo, nunca dentro do callback.
- **Escape de HTML:** todo texto vindo do banco passa por `escapeHtml()`.
- **CSS:** a fonte é `css/styles.scss`; `css/styles.css` é a saída compilada e também é versionada. Não há script de compilação no repositório: ao mudar um, mude o outro (ou compile com `npx sass css/styles.scss css/styles.css`). Use os tokens de `:root` (`--accent`, `--urgent`, `--warning`, `--done`, `--purple`...).
- Estado de tela (aba atual, filtros, formulários abertos) fica em `state`, não no DOM.

## Modelo de dados e regras de negócio

- `case` = `{ id, nome, numero, cliente, nvcAosChoice, tipoVisto, etapas[] }`. A ordem das etapas vem da coluna `ordem`.
- **Etapa:** `tipo` `'normal'` ou `'marco'`. Status de etapa normal: `nao_iniciado`, `confeccao`, `revisao`, `pendencia`, `concluido`. Status de marco: depende de `MARCO_DEFS[marcoTipo]` (`pwd`, `eta9089`, `i140`, `status`, `recurso_decisao`); o marco conta como concluído conforme `doneKey`/`doneKeys`.
- `colecao`: `'padrao'` (fluxo principal) ou `'aos'`. **As etapas de AOS e todas as rodadas de recurso compartilham `'aos'`** e são anexadas ao fim da lista.
- **Etapa atual** = primeira etapa não concluída na ordem do array (`currentEtapa`). Kanban, Prioridades e Início partem dela.
- **Conclusão em cascata:** ao concluir uma etapa (ou marco), todas as anteriores pendentes são concluídas (`api.completeUpToDb`).
- **Propagações** (em `events.js`, ao salvar um marco): PWD `emitido` + validade → vira o `prazo` da etapa normal "Protocolar o ETA 9089"; ETA `certificado` + validade → vira `marco.prazoAlvo` do marco I-140.
- **Recursos (L3):** decisão `negado`/`rfe`/`rejeitado` + `recursoTipo` diferente de `recursoAplicadoPara` gera 8 etapas + um novo marco "O recurso foi aceito?", que pode repetir o ciclo.
- **NVC/AOS:** aparece quando o marco STATUS está `sim`. Escolher AOS cria as 10 etapas de `AOS_TEMPLATE` uma única vez; NVC encerra a atuação.
- **Urgência:** vencido (prazo < hoje), próximo (até 7 dias), em dia. Validade de marco concluído entra no ranking quando faltam até 122 dias.

## Aba Processos: lista lateral e linha do tempo (IMF-002)

- **Lista lateral:** ordenada por `orderCasesByStatus`: 1º Urgentes (selo VENCIDO do card, i.e. `caseOverallStatus` = qualquer etapa pendente vencida, ou etapa atual em pendência); depois pela categoria Kanban da etapa atual, na ordem de `SIDEBAR_STATUS_ORDER`: Em revisão, Em andamento, Liberadas para trabalhar; sem etapa pendente (concluídos, NVC, sem fluxo) por último. Dentro do grupo, do mais antigo ao mais recente (`createdAt`, de `cases.created_at`). Mostra só `CASE_LIST_LIMIT` (10) itens; o botão "VER MAIS" (`state.casesExpanded`) mostra o resto e vira "VER MENOS". Ícones `pi-plus-circle` / `pi-minus-circle` (PrimeIcons já vem por CDN; PrimeNG não é usado, o projeto não tem Angular). Se o processo selecionado cair fora dos 10 (criado agora, atalho do Início), `revealSelectedCase` (em `events.js`) abre a lista inteira.
- **Linha do tempo:** resumo (etapa atual, fase, prazo, barra de progresso) + fases em acordeão (PWD, Recrutamento e ETA 9089, I-140), delimitadas pela posição dos marcos PWD e ETA 9089 (`agruparPorFase`; sem esses marcos vira uma fase única "Etapas"). Abre por padrão a fase da etapa atual; `state.fasesAbertas` guarda o que o usuário abriu/fechou e `state.expandedEtapaId` a etapa não atual aberta. A etapa atual vem sempre aberta, com a tag AGORA e os controles de sempre (status, editar, excluir). As etapas de AOS usam as mesmas linhas, sem acordeão.

## Tipos de visto (IMF-001)

- `cases.tipo_visto` guarda a chave do tipo (`eb1`, `eb2nw`, `eb3`, `l1`, `o1`, `casamento`, `parentesco`, `vawa`, `asilo`). Processos antigos (sem valor) contam como `eb3`.
- `VISA_GROUPS` (em `constants.js`) alimenta o select agrupado do modal **Novo processo**. `VISA_TIPOS_COM_FLUXO` lista os tipos com fluxo implementado (hoje só `eb3`); os demais são criados sem etapas e a aba Processos mostra "Fluxo a ser implementado" no lugar da linha do tempo.
- Para implementar o fluxo de um novo tipo: criar o template dele, incluir a chave em `VISA_TIPOS_COM_FLUXO` e fazer `events.js` (criação do caso) escolher o template pelo tipo.
- O fluxo EB-3 continua vindo da tabela `templates` da organização (editável em "Etapas padrão").

## Convenção de branches

`feature/#IMF-NNN`, com número sequencial a cada alteração (`feature/#IMF-001`, `feature/#IMF-002`...). No shell, use aspas: `git checkout -b 'feature/#IMF-002'`.

## Armadilhas conhecidas

- **Regras acopladas ao título das etapas.** `computeResultados` e as propagações localizam etapas por título (`protocolar o pwd`, `protocolar o eta 9089`, comparados em minúsculas), e o painel Início usa "Liberar docs para assinatura do empregador" para detectar a fase final. Renomear essas etapas no template quebra as regras.
- `todayISO()` (`utils.js`) usa `toISOString()`, ou seja, **data em UTC**. No Brasil (UTC-3), entre 21h e meia-noite o app já considera o dia seguinte. Todas as comparações de prazo herdam isso.
- `dbSeedDefaultTemplateIfEmpty` insere o template padrão no primeiro acesso de uma organização sem template.
- Sem testes: valide mudanças abrindo o app no navegador com um usuário real de teste (use um projeto Supabase separado do de produção).
