# Prompts para o Codex — Meu Território

Uma tarefa por conversa (sessão nova), na pasta raiz do projeto. O Codex lê `AGENTS.md` sozinho. Cole o **prompt base** e depois a linha da tarefa. Marque `[x]` ao terminar cada uma e **confira o commit** antes de abrir a próxima.

## Prompt base (cole sempre primeiro)

```
Estou implementando o app "Meu Território". O spec, o plano e o protótipo visual já estão aprovados: não faça brainstorming nem proponha novo design.

Leia AGENTS.md. Depois leia o plano docs/superpowers/plans/2026-11-06-app-territorios.md (cabeçalho, Global Constraints, Review Focus, a tabela de referência visual e a tarefa indicada abaixo) e, só se precisar, a seção relevante do spec docs/superpowers/specs/2026-11-06-app-territorios-design.md. Se a tarefa for de tela, abra também o arquivo de design/prototipo/ indicado na tabela (HTML estático: reproduza layout, textos e estados, claro e escuro).

Faça SOMENTE a tarefa indicada, seguindo os steps na ordem (teste falhando, implementação, teste passando, commit). Não adiante tarefas seguintes e não refatore o que é de tarefas anteriores. Para nomes e assinaturas de tarefas anteriores, leia o código existente em vez de supor.

Antes de começar, confira os pré-requisitos da tarefa. Se algum faltar, pare e me diga. No final, rode os testes da tarefa, informe o resultado real (inclusive falhas) e liste o que ficou pendente ou não foi verificado. Não altere docs/ nem design/.
```

## Tarefas

- [ ] **Tarefa 1 — Scaffold do projeto.**
  Prompt: `Execute a Tarefa 1 do plano.`
  Pré-requisitos: Node 20+ (já há o 22). Pronto quando: `npm test` e `npm run build` passam; repositório git criado, com commit.

- [ ] **Tarefa 2 — Domínio: tipos, status, ordem e validação de casa.**
  Prompt: `Execute a Tarefa 2 do plano.`
  Pré-requisito: Tarefa 1. Pronto quando: `npx vitest run src/domain` passa.

- [ ] **Tarefa 3 — Domínio: faixa numérica e regras de ciclo.**
  Prompt: `Execute a Tarefa 3 do plano.`
  Pré-requisito: Tarefa 2. Pronto quando: `npx vitest run src/domain` passa.

- [ ] **Tarefa 4 — Firebase init, emulador e login com gate de membros.**
  Prompt: `Execute a Tarefa 4 do plano. Os passos do console do Firebase são meus; use os emuladores e o .env.example.`
  Pré-requisitos: Tarefa 1; **você** criou o projeto Firebase (plano Blaze, Auth com Google, Firestore e Storage) e tem os valores do `.env`. Pronto quando: testes de `src/features/auth` passam. O login real com Google você confere abrindo o app.

- [ ] **Tarefa 5 — Regras de segurança (Firestore e Storage).**
  Prompt: `Execute a Tarefa 5 do plano. Confira o Review Focus 4, 6 e 7.`
  Pré-requisito: Tarefa 4. Pronto quando: `npx firebase emulators:exec --only firestore,storage "npx vitest run tests/rules"` passa.

- [ ] **Tarefa 6 — Camada de dados: cartões, quadras, ruas e eventos.**
  Prompt: `Execute a Tarefa 6 do plano.`
  Pré-requisitos: Tarefas 2, 3, 4 e 5. Pronto quando: `tests/data/cards.test.ts` passa no emulador.

- [ ] **Tarefa 7 — Camada de dados: casas, visitas, ordem e reinício.**
  Prompt: `Execute a Tarefa 7 do plano. É a mais sensível: confira contadores, fechamento automático (e o evento gravado), trava de cartão fechado e a ordem das casas.`
  Pré-requisito: Tarefa 6. Pronto quando: `tests/data/houses.test.ts` passa no emulador.

- [ ] **Tarefa 8 — Shell do app, roteamento e lista de cartões.**
  Prompt: `Execute a Tarefa 8 do plano. Copie os tokens e componentes de design/prototipo/css/app.css.`
  Pré-requisitos: Tarefas 4 e 6. Pronto quando: `npx vitest run src/features/cards` passa e `npm run dev` abre a lista parecida com `03-cartoes.html`, claro e escuro.

- [ ] **Tarefa 9 — Tela do cartão (imagem, link do Maps, quadras, abrir cartão).**
  Prompt: `Execute a Tarefa 9 do plano.`
  Pré-requisito: Tarefa 8. Pronto quando: `src/features/cards/CartaoPage.test.tsx` passa.

- [ ] **Tarefa 10 — Tela da quadra e registro de visita com um toque.**
  Prompt: `Execute a Tarefa 10 do plano. Reproduza a direção "barra fixa na base" de design/prototipo/05-quadra.html, com todos os estados.`
  Pré-requisitos: Tarefas 7 e 9. Pronto quando: `npx vitest run src/features/houses` passa.

- [ ] **Tarefa 11 — Cadastro rápido de casas (inclui "Nova rua").**
  Prompt: `Execute a Tarefa 11 do plano.`
  Pré-requisito: Tarefa 10. Pronto quando: `NovaCasaSheet.test.tsx` passa.

- [ ] **Tarefa 12 — Reordenar casas.**
  Prompt: `Execute a Tarefa 12 do plano.`
  Pré-requisito: Tarefa 10 (rode depois da 11, pois ambas mexem em `QuadraPage.tsx`). Pronto quando: `npx vitest run src/features/houses` passa.

- [ ] **Tarefa 13 — Tela da casa com histórico e observação.**
  Prompt: `Execute a Tarefa 13 do plano.`
  Pré-requisito: Tarefa 10. Pronto quando: `CasaPage.test.tsx` passa.

- [ ] **Tarefa 14 — Admin: membros, cartões, quadras e importação de PDF.**
  Prompt: `Execute a Tarefa 14 do plano.`
  Pré-requisitos: Tarefas 6 e 8. Pronto quando: `npx vitest run src/features/admin` passa. Teste com um PDF real seu depois, no navegador.

- [ ] **Tarefa 15 — Admin: fechar, abrir, reiniciar e recalcular.**
  Prompt: `Execute a Tarefa 15 do plano.`
  Pré-requisitos: Tarefas 7, 9 e 14. Pronto quando: `CicloAdmin.test.tsx` passa.

- [ ] **Tarefa 15b — Admin: histórico de abertura e fechamento.**
  Prompt: `Execute a Tarefa 15b do plano.`
  Pré-requisitos: Tarefas 6 e 15. Pronto quando: `npx vitest run src/features/admin` passa.

- [ ] **Tarefa 16 — PWA, offline, ícones e instalação (Android e iPhone).**
  Prompt: `Execute a Tarefa 16 do plano.`
  Pré-requisitos: Tarefa 8; SVG-mestre em `design/identidade/` (já existem). Pronto quando: `npx vitest run src/pwa && npm run build` passam, `dist/sw.js` existe e `public/icons/` tem os 3 PNG. O botão "Instalar app" você confere num Android real.

- [ ] **Tarefa 17 — E2E offline e deploy.**
  Prompt: `Execute a Tarefa 17 do plano, steps 1 a 4. Pare antes do deploy (step 5) e me avise.`
  Pré-requisitos: Tarefas 1 a 16; Java instalado. Pronto quando: `npx firebase emulators:exec "npx playwright test"` passa. O deploy e o teste em Android e iPhone são seus.

## Revisão final (sessão própria, depois da Tarefa 17)

```
Revise o projeto inteiro contra o spec docs/superpowers/specs/2026-11-06-app-territorios-design.md, a seção Review Focus do plano e as telas de design/prototipo/ (cada estado: vazio, carregando, sem internet, erro, cartão fechado). Foque em: regras de segurança, contadores de progresso, fechamento automático, ordem das casas, abertura de cartão só por admin e funcionamento offline. Liste os problemas por gravidade e não corrija sem eu pedir.
```

## Dicas

- As Tarefas 2 e 3 não dependem do Firebase. A Tarefa 16 depende da Tarefa 8 (usa o shell do app); não a faça antes.
- Se uma sessão errar o rumo, descarte e recomece com o mesmo prompt, em vez de corrigir por muitas mensagens.
- Se uma tarefa falhar por algo de tarefa anterior, abra uma sessão só para esse conserto, citando o teste que falha.
- Para telas, peça ao Codex um print comparando com o protótipo (rode `npm run dev` e abra `design/prototipo/index.html` ao lado).
