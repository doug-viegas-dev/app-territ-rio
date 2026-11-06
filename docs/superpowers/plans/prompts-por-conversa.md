# Prompts por conversa — App de Territórios

Cada tarefa do plano roda em uma conversa nova, para não carregar contexto acumulado. Abra uma conversa na pasta do projeto, cole o **prompt base** e depois a linha da tarefa.

- Spec: `docs/superpowers/specs/2026-11-06-app-territorios-design.md`
- Plano: `docs/superpowers/plans/2026-11-06-app-territorios.md`

## Prompt base (cole sempre primeiro)

```
Estou implementando o app de territórios. Não faça brainstorming nem proponha novo design: o spec e o plano já estão aprovados.

Leia o plano docs/superpowers/plans/2026-11-06-app-territorios.md (cabeçalho, Global Constraints, Review Focus e a tarefa indicada abaixo) e, só se precisar, a seção relevante do spec docs/superpowers/specs/2026-11-06-app-territorios-design.md. Se a tarefa for de tela, abra também o arquivo de design/prototipo/ indicado na tabela de referência visual do plano (HTML estático aprovado: reproduza layout, textos e estados, claro e escuro).

Use a skill superpowers:executing-plans. Faça SOMENTE a tarefa indicada, seguindo os steps na ordem (teste falhando, implementação, teste passando, commit). Não adiante tarefas seguintes e não refatore o que é de tarefas anteriores. Para saber os nomes e assinaturas de tarefas anteriores, leia o código já existente em vez de supor.

Antes de começar, confira os pré-requisitos da tarefa. Se algum faltar, pare e me diga. No final, rode os testes da tarefa, informe o resultado real (inclusive falhas) e liste o que ficou pendente ou não foi verificado.
```

## Tarefas

Marque `[x]` ao terminar cada uma.

- [ ] **Tarefa 1 — Scaffold do projeto.**
  Prompt: `Execute a Tarefa 1 do plano.`
  Pré-requisitos: Node 20+ instalado.
  Pronto quando: `npm test` e `npm run build` passam; repositório git criado e com commit.

- [ ] **Tarefa 2 — Domínio: tipos, status, ordem e validação de casa.**
  Prompt: `Execute a Tarefa 2 do plano.`
  Pré-requisitos: Tarefa 1 concluída.
  Pronto quando: `npx vitest run src/domain` passa.

- [ ] **Tarefa 3 — Domínio: faixa numérica e regras de ciclo.**
  Prompt: `Execute a Tarefa 3 do plano.`
  Pré-requisitos: Tarefa 2 concluída (`src/domain/types.ts`, `status.ts`, `ordem.ts`).
  Pronto quando: `npx vitest run src/domain` passa.

- [ ] **Tarefa 4 — Firebase init, emulador e login com gate de membros.**
  Prompt: `Execute a Tarefa 4 do plano.`
  Pré-requisitos: Tarefa 1 concluída; **você** criou o projeto no Firebase (plano Blaze, Auth com Google, Firestore e Storage ativos) e tem os valores para o `.env`; Java instalado (emuladores).
  Pronto quando: testes de `src/features/auth` passam. O login real com Google você confere abrindo o app.

- [ ] **Tarefa 5 — Regras de segurança (Firestore e Storage).**
  Prompt: `Execute a Tarefa 5 do plano.`
  Pré-requisitos: Tarefa 4 concluída; Java instalado.
  Pronto quando: `npx firebase emulators:exec --only firestore,storage "npx vitest run tests/rules"` passa.

- [ ] **Tarefa 6 — Camada de dados: cartões e quadras.**
  Prompt: `Execute a Tarefa 6 do plano.`
  Pré-requisitos: Tarefas 2, 3, 4 e 5 concluídas.
  Pronto quando: `tests/data/cards.test.ts` passa no emulador.

- [ ] **Tarefa 7 — Camada de dados: casas, visitas, ordem e reinício.**
  Prompt: `Execute a Tarefa 7 do plano. Esta é a tarefa mais sensível: confira bem contadores, fechamento automático e a ordem das casas.`
  Pré-requisitos: Tarefa 6 concluída.
  Pronto quando: `tests/data/houses.test.ts` passa no emulador.

- [ ] **Tarefa 8 — Shell do app, roteamento e lista de cartões.**
  Prompt: `Execute a Tarefa 8 do plano.`
  Pré-requisitos: Tarefas 4 e 6 concluídas.
  Pronto quando: `npx vitest run src/features/cards` passa e `npm run dev` abre a lista, parecida com `design/prototipo/03-cartoes.html` (confira claro e escuro).

- [ ] **Tarefa 9 — Tela do cartão (imagem, link do Maps, quadras).**
  Prompt: `Execute a Tarefa 9 do plano.`
  Pré-requisitos: Tarefa 8 concluída.
  Pronto quando: `src/features/cards/CartaoPage.test.tsx` passa.

- [ ] **Tarefa 10 — Tela da quadra e registro de visita com um toque.**
  Prompt: `Execute a Tarefa 10 do plano.`
  Pré-requisitos: Tarefas 7 e 9 concluídas.
  Pronto quando: `npx vitest run src/features/houses` passa.

- [ ] **Tarefa 11 — Cadastro rápido de casas.**
  Prompt: `Execute a Tarefa 11 do plano.`
  Pré-requisitos: Tarefa 10 concluída.
  Pronto quando: `NovaCasaSheet.test.tsx` passa.

- [ ] **Tarefa 12 — Reordenar casas.**
  Prompt: `Execute a Tarefa 12 do plano.`
  Pré-requisitos: Tarefa 10 concluída (a 11 é independente, mas ambas mexem em `QuadraPage.tsx`: rode uma de cada vez).
  Pronto quando: `npx vitest run src/features/houses` passa.

- [ ] **Tarefa 13 — Tela da casa com histórico e observação.**
  Prompt: `Execute a Tarefa 13 do plano.`
  Pré-requisitos: Tarefa 10 concluída.
  Pronto quando: `CasaPage.test.tsx` passa.

- [ ] **Tarefa 14 — Admin: membros, cartões, quadras e importação de PDF.**
  Prompt: `Execute a Tarefa 14 do plano.`
  Pré-requisitos: Tarefas 6 e 8 concluídas.
  Pronto quando: `npx vitest run src/features/admin` passa. Teste com um PDF real seu, depois, no navegador.

- [ ] **Tarefa 15 — Admin: fechar, abrir, reiniciar e recalcular.**
  Prompt: `Execute a Tarefa 15 do plano.`
  Pré-requisitos: Tarefas 7, 9 e 14 concluídas.
  Pronto quando: `CicloAdmin.test.tsx` passa.

- [ ] **Tarefa 15b — Admin: histórico de abertura e fechamento.**
  Prompt: `Execute a Tarefa 15b do plano.`
  Pré-requisitos: Tarefas 6 e 15 concluídas.
  Pronto quando: `npx vitest run src/features/admin` passa.

- [ ] **Tarefa 16 — PWA, offline e orientação de instalação.**
  Prompt: `Execute a Tarefa 16 do plano.`
  Pré-requisitos: Tarefa 8 concluída; os SVG-mestre `design/identidade/icone.svg` e `icone-maskable.svg` (já existem).
  Pronto quando: `npx vitest run src/pwa && npm run build` passam, `dist/sw.js` existe e `public/icons/` tem `icon-192.png`, `icon-512.png` e `maskable-512.png`. O botão "Instalar app" você confere num Android real.

- [ ] **Tarefa 17 — E2E offline e deploy.**
  Prompt: `Execute a Tarefa 17 do plano, steps 1 a 4. Pare antes do deploy (step 5) e me avise.`
  Pré-requisitos: Tarefas 1 a 16 concluídas; Java instalado.
  Pronto quando: `npx firebase emulators:exec "npx playwright test"` passa. O deploy e o teste em Android e iPhone são seus.

## Revisão final (conversa própria, depois da Tarefa 17)

```
Revise o projeto inteiro contra o spec docs/superpowers/specs/2026-11-06-app-territorios-design.md, a seção Review Focus do plano e as telas de design/prototipo/ (cada estado: vazio, carregando, sem internet, erro, cartão fechado). Use a skill superpowers:requesting-code-review. Foque em: regras de segurança, contadores de progresso, fechamento automático, ordem das casas e funcionamento offline. Liste problemas por gravidade e não corrija sem eu pedir.
```

## Dicas para gastar menos

- Uma tarefa por conversa; ao terminar, peça só "mostre o resumo e o commit" e encerre.
- Se a conversa errar o rumo, descarte-a e comece outra com o mesmo prompt, em vez de corrigir por muitas mensagens.
- As Tarefas 2 e 3 não dependem do Firebase. A Tarefa 16 depende da Tarefa 8 (usa o shell do app); não a faça antes.
- Se uma tarefa falhar por algo de tarefa anterior, abra uma conversa só para esse conserto, citando o teste que falha.
