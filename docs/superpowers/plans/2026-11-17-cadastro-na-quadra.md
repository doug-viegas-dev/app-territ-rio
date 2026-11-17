# Cadastro na tela da quadra e teclado — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar casas e ruas na própria tela da quadra (campo no fim de cada rua), com a casa nova em foco na barra de resultados, e impedir que o teclado cubra o campo digitado em todo o app.

**Architecture:** Dois componentes novos na tela da quadra (`CadastroRapido`, `NovaRuaInline`) usam as mesmas funções de `src/firebase/` que a `NovaCasaSheet` (nada muda em dados nem regras). O foco na casa nova vem de uma função pura que compara a lista de casas antes e depois (funciona offline, em que `criarCasa` não resolve). O teclado é tratado por um hook global em `src/app/`, mais uma linha no `viewport` e CSS.

**Tech Stack:** React + TypeScript + Vite, Vitest + Testing Library (jsdom), Firebase (só via `src/firebase/`).

**Spec:** `docs/superpowers/specs/2026-11-17-cadastro-na-quadra-design.md`

## Global Constraints

- Interface e textos em português do Brasil, tom calmo e curto, sem exclamação, sem gíria.
- Textos novos exatos: "Número", "Adicionar", "Sem número", "Com número", "Descrição curta", "Mais opções", "Nova rua", "Nome da rua", "Adicionar rua".
- Texto ≥ 16px, alvos de toque ≥ 48px (campo e botão Adicionar 52px; linhas de casa 56px), contraste AA. Status com cor + forma + nome; âmbar só como fundo.
- Todo acesso ao SDK do Firebase fica em `src/firebase/`; regras de negócio são funções puras em `src/domain/`, sem Firebase.
- Nada muda em `src/firebase/`, `src/demo/banco.ts`, `firestore.rules` ou no modelo de dados.
- Só cartão aberto permite cadastrar; resultado só com volta aberta (casa entra Pendente sem volta).
- Número aceita só dígitos (`soDigitos`, `inputMode="numeric"`).
- Não altere `docs/` nem `design/`, salvo este plano e o spec já escritos.
- Um commit por tarefa, mensagem em português no formato `feat(...)`/`fix(...)`. Terminar a mensagem com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Comandos em PowerShell. Testes: `npx vitest run <arquivo>`; tipos: `npx tsc --noEmit -p .`. Há 5 testes que falham sem o emulador do Firebase (houses, rules, storage, e2e): ignore-os, mas não os piore.

## Review Focus

1. **Toque duplo em Adicionar** não pode criar a casa duas vezes: o campo esvazia na hora, e Adicionar com campo vazio só mostra o erro. (Tarefa 3)
2. **Offline:** `criarCasa` não resolve sem rede; a casa nova ainda precisa virar a casa em foco, pela lista local. (Tarefas 2 e 5)
3. **Outra pessoa cadastra ao mesmo tempo:** a casa de outra pessoa que aparece na lista não pode roubar o foco; só a casa com a mesma rua e o mesmo número/descrição que acabei de digitar. (Tarefa 2)
4. **Rua sem nenhuma casa** (declarada na quadra, mas vazia) precisa ter o campo de cadastro; hoje a lista só percorre ruas com casas. (Tarefa 5)
5. **Colar texto com letras no número** vira só dígitos; número repetido na rua avisa mas deixa salvar. (Tarefa 3)

---

### Task 1: Teclado não cobre o campo (todo o app)

**Files:**
- Create: `src/app/useTeclado.ts`
- Test: `src/app/useTeclado.test.tsx`
- Modify: `index.html:5` (viewport), `src/app/App.tsx` (montar o hook), `src/app/styles.css:92-96` (`.app`), `src/app/styles.css:372` (`.auth-tela`)

**Interfaces:**
- Produces: `useTeclado(): void` — enquanto montado: (a) grava `--altura-visivel` (px) em `document.documentElement.style` a partir de `window.visualViewport.height`, só quando `visualViewport.scale <= 1.01`, a cada evento `resize` e `scroll` do `visualViewport`; (b) em `focusin` de `input`, `textarea` ou `select`, chama `scrollIntoView({ block: 'center', behavior: 'smooth' })` no alvo após 300 ms e define `document.documentElement.dataset.teclado = 'aberto'`; em `focusout` apaga esse atributo; (c) ao desmontar remove os ouvintes e a variável. Sem `window.visualViewport`, só faz (b).

- [ ] **Step 1: Escrever os testes**, em `src/app/useTeclado.test.tsx`, com um componente de teste que chama `useTeclado()` e renderiza um `<input aria-label="Campo" />`, `visualViewport` simulado (objeto com `height`, `scale`, `addEventListener`, `removeEventListener`) e `vi.useFakeTimers()`:
  - `grava --altura-visivel com a altura do visualViewport`: dispara `resize` com `height = 420` → `document.documentElement.style.getPropertyValue('--altura-visivel')` é `'420px'`.
  - `não grava a altura com zoom (scale 2)`: variável continua vazia.
  - `rola o campo focado até o centro depois de 300 ms`: `scrollIntoView` mockado em `HTMLElement.prototype`; foca o input; antes de 300 ms não foi chamado; depois, chamado com `{ block: 'center', behavior: 'smooth' }`.
  - `marca data-teclado ao focar e limpa ao sair`: `'aberto'` com foco, `undefined` após `blur`.
  - `remove ouvintes e a variável ao desmontar`.
- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run src/app/useTeclado.test.tsx` → FAIL (módulo não existe).
- [ ] **Step 3: Implementar `useTeclado` em `src/app/useTeclado.ts`** conforme a interface acima (um `useEffect`, sem estado React).
- [ ] **Step 4: Ligar ao app.** Chamar `useTeclado()` no corpo de `App` em `src/app/App.tsx`. Em `index.html:5` acrescentar `, interactive-widget=resizes-content` ao `content` do `viewport`. Em `styles.css`: `.app` passa a `height: var(--altura-visivel, 100dvh)` (mantendo a linha `100vh` anterior como fallback); o `@media (min-width: 920px)` continua com a altura própria; `.auth-tela` usa `min-height: var(--altura-visivel, 100dvh)`. Acrescentar a regra `@media (max-width: 919px) { html[data-teclado="aberto"] .esconde-no-teclado { display: none; } }`.
- [ ] **Step 5: Rodar:** `npx vitest run src/app` e `npx tsc --noEmit -p .` → PASS, sem erros de tipo.
- [ ] **Step 6: Commit:** `git add index.html src/app && git commit -m "fix(app): teclado não cobre o campo digitado"`

---

### Task 2: Regras puras do cadastro rápido

**Files:**
- Modify: `src/domain/casa.ts`
- Test: `src/domain/casa.test.ts`

**Interfaces:**
- Consumes: `soDigitos`, `Casa` de `src/domain/types.ts`.
- Produces:
  - `validarEntradaRapida(modo: 'numero' | 'descricao', texto: string): string | null` — `null` se válido. Modo `numero`: texto vazio → `'Digite o número da casa.'`; com algo que não seja só dígitos → `'Use só números no campo Número.'`. Modo `descricao`: vazio/só espaços → `'Escreva uma descrição curta.'`.
  - `casaNova(antes: string[], agora: Casa[], esperada: { rua: string; numero?: string; descricao?: string }): Casa | undefined` — devolve a última casa de `agora` cujo `id` não está em `antes` e cuja `rua` é igual a `esperada.rua` e cujo `numero` e `descricao` (após `trim`, tratando ausente como vazio) são iguais aos de `esperada`.

- [ ] **Step 1: Testes** em `src/domain/casa.test.ts`:
  - `validarEntradaRapida('numero', '')` → `'Digite o número da casa.'`; `('numero', '12a')` → `'Use só números no campo Número.'`; `('numero', '232')` → `null`.
  - `validarEntradaRapida('descricao', '   ')` → `'Escreva uma descrição curta.'`; `('descricao', 'portão azul')` → `null`.
  - `casaNova` devolve a casa 232 quando `agora` tem um id que não estava em `antes` e bate rua+número.
  - `casaNova` ignora casa nova de outra pessoa com número diferente (`'999'`) → `undefined`.
  - `casaNova` com duas candidatas iguais devolve a última da lista.
  - `casaNova` sem id novo → `undefined`.
  - `casaNova` com descrição: `{ rua, descricao: 'Portão azul' }` casa com `descricao: ' Portão azul '` (trim) e sem `numero`.
- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run src/domain/casa.test.ts` → FAIL.
- [ ] **Step 3: Implementar as duas funções** em `src/domain/casa.ts`, junto de `validarCasa`.
- [ ] **Step 4: Rodar:** `npx vitest run src/domain/casa.test.ts` → PASS.
- [ ] **Step 5: Commit:** `git add src/domain && git commit -m "feat(casa): validação e achado da casa nova no cadastro rápido"`

---

### Task 3: Componente `CadastroRapido` (campo no fim da rua)

**Files:**
- Create: `src/features/houses/CadastroRapido.tsx`
- Test: `src/features/houses/CadastroRapido.test.tsx`
- Modify: `src/app/styles.css` (classes `.cadastro-rapido`, `.cadastro-rapido .linha`, `.cadastro-rapido .atalhos`)

**Interfaces:**
- Consumes: `criarCasa(cartaoId, quadraId, d, existentes, op)` de `@/firebase/houses`; `soDigitos`, `validarEntradaRapida` de `@/domain/casa`; `Casa`, `Quadra` de `@/domain/types`.
- Produces: `export default function CadastroRapido(props: { rua: string; quadra: Quadra; casas: Casa[]; cartaoId: string; onAdicionada: (esperada: { rua: string; numero?: string; descricao?: string }) => void; onMaisOpcoes: (rua: string) => void; onErro: () => void })`.
  Comportamento: modo inicial `numero`. Linha com campo (`id` único por rua, `aria-label` "Número" ou "Descrição curta", `className="entrada"`, altura mínima 52px) e botão **Adicionar** (52px). Abaixo, dois botões de 48px lado a lado: **Sem número**/**Com número** (alterna o modo, mantém o modo entre casas) e **Mais opções** (chama `onMaisOpcoes(rua)`). Enter no campo = Adicionar. Ao adicionar: valida com `validarEntradaRapida`; se inválido mostra o erro (`role="alert"`) e não chama nada; se válido, chama `criarCasa(cartaoId, quadra.id, { rua, numero | descricao }, casas, { quadraSemContadores: quadra.semContadores === true })` **sem esperar a promessa**, esvazia o campo **antes** de qualquer outra coisa, mantém o foco nele, chama `onAdicionada(esperada)`, e em falha da promessa chama `onErro`. No modo `numero`, o campo usa `soDigitos` ao digitar/colar; número já existente na mesma rua mostra o aviso "Já existe um N nesta rua. Pode salvar mesmo assim." (`role="status"`) e não impede salvar.

- [ ] **Step 1: Testes** (mockar `@/firebase/houses` como em `NovaCasaSheet.test.tsx`), nomes e asserções:
  - `adiciona pelo botão: chama criarCasa com rua e número e esvazia o campo`: digita `232`, clica Adicionar → `criarCasa` chamado com `('c12','q3',{ rua:'Rua das Acácias', numero:'232' }, casas, { quadraSemContadores:false })`; campo com valor `''`; `onAdicionada` com `{ rua, numero:'232' }`.
  - `Enter também adiciona`.
  - `toque duplo não cria duas casas`: dois cliques seguidos em Adicionar → `criarCasa` chamado 1 vez.
  - `campo vazio mostra "Digite o número da casa." e não chama criarCasa`.
  - `colar "12a4" deixa só 124`.
  - `número repetido avisa mas salva`: casas já têm `124` na rua; digita `124` → aviso visível; Adicionar chama `criarCasa`.
  - `Sem número troca para Descrição curta e mantém o modo depois de adicionar`: clica Sem número, digita `Portão azul`, Adicionar → `criarCasa` com `{ rua, descricao:'Portão azul' }`; campo ainda se chama "Descrição curta"; botão agora diz "Com número".
  - `descrição vazia mostra "Escreva uma descrição curta."`.
  - `Mais opções chama onMaisOpcoes com a rua`.
  - `falha de criarCasa chama onErro` (promessa rejeitada).
  - `foco volta ao campo depois de adicionar` (`document.activeElement`).
- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run src/features/houses/CadastroRapido.test.tsx` → FAIL.
- [ ] **Step 3: Implementar `CadastroRapido`** conforme a interface; estilos em `styles.css` com os tamanhos da seção Global Constraints.
- [ ] **Step 4: Rodar:** `npx vitest run src/features/houses/CadastroRapido.test.tsx` e `npx tsc --noEmit -p .` → PASS.
- [ ] **Step 5: Commit:** `git add src/features/houses src/app/styles.css && git commit -m "feat(casas): campo de cadastro rápido no fim da rua"`

---

### Task 4: Componente `NovaRuaInline`

**Files:**
- Create: `src/features/houses/NovaRuaInline.tsx`
- Test: `src/features/houses/NovaRuaInline.test.tsx`

**Interfaces:**
- Consumes: `adicionarRua(cartaoId, quadraId, rua)` de `@/firebase/blocks`.
- Produces: `export default function NovaRuaInline(props: { cartaoId: string; quadra: Quadra; ruas: string[]; onErro: () => void })`. Fechado: botão tracejado "Nova rua" (48px, ícone `mais`). Aberto: campo "Nome da rua" (52px) com `autoFocus`, botão **Adicionar rua** e botão **Cancelar** (48px). Validações iguais às da `FolhaNovaRua` em `NovaCasaSheet.tsx`: vazio → "Digite o nome da rua."; repetido sem diferenciar maiúsculas (`toLocaleLowerCase('pt-BR')`) → "Essa rua já existe nesta quadra.". Válido: chama `adicionarRua` sem esperar, fecha e limpa; falha da promessa chama `onErro`.

- [ ] **Step 1: Testes** (mockar `@/firebase/blocks`): `abre o campo ao tocar em Nova rua`; `adiciona a rua e fecha`; `nome vazio mostra "Digite o nome da rua."`; `rua repetida (maiúsculas diferentes) mostra "Essa rua já existe nesta quadra."`; `Cancelar fecha sem chamar adicionarRua`; `falha de adicionarRua chama onErro`.
- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run src/features/houses/NovaRuaInline.test.tsx` → FAIL.
- [ ] **Step 3: Implementar `NovaRuaInline`**; reaproveitar as classes `.entrada`, `.btn` e `.dica` existentes.
- [ ] **Step 4: Rodar:** o mesmo teste e `npx tsc --noEmit -p .` → PASS.
- [ ] **Step 5: Commit:** `git add src/features/houses && git commit -m "feat(casas): nova rua dentro da tela da quadra"`

---

### Task 5: Integrar na `QuadraPage`

**Files:**
- Modify: `src/features/houses/QuadraPage.tsx`, `src/features/houses/NovaCasaSheet.tsx` (nova prop `ruaInicial?: string`)
- Test: `src/features/houses/QuadraPage.test.tsx`, `src/features/houses/NovaCasaSheet.test.tsx`

**Interfaces:**
- Consumes: `CadastroRapido`, `NovaRuaInline` (tarefas 3 e 4); `casaNova` (tarefa 2).
- Produces: `NovaCasaSheet` aceita `ruaInicial?: string` (rua selecionada ao abrir quando não há `depoisDe`; precedência: `depoisDe?.rua` > `ruaInicial` > `ruas[0]`).

- [ ] **Step 1: Testes na `QuadraPage.test.tsx`** (reaproveitar `preparar`/`renderPagina`; mockar `@/firebase/houses` e `@/firebase/blocks` como os testes existentes), nomes e asserções:
  - `mostra o campo de cadastro no fim de cada rua do cartão aberto`: duas ruas → dois campos "Número".
  - `rua declarada sem nenhuma casa também tem o campo` (quadra.ruas com rua sem casas).
  - `cartão fechado não mostra campo de cadastro nem Nova rua`.
  - `o botão "Adicionar casa" do topo não existe mais`.
  - `adicionar 232 faz a 232 virar a casa em foco`: ao chamar `criarCasa`, o mock de `observarCasas` entrega a lista com a casa nova (id novo, número 232) → a barra "Registrar visita" mostra "232".
  - `não troca o foco por casa de outra pessoa com outro número`: lista ganha uma casa `999` e depois a `232`; foco termina na 232.
  - `funciona offline`: `criarCasa` retorna promessa que nunca resolve; o foco ainda vai para a casa nova pela lista.
  - `Mais opções abre a folha já com a rua escolhida`.
  - `Nova rua aparece no fim da lista e adiciona`.
  - `quadra vazia mostra o convite e o campo de cadastro da primeira rua` (sem o botão "Cadastrar a primeira casa").
  - `a barra de resultados tem a classe esconde-no-teclado`.
  Em `NovaCasaSheet.test.tsx`: `ruaInicial seleciona a rua pedida`.
- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run src/features/houses/QuadraPage.test.tsx src/features/houses/NovaCasaSheet.test.tsx` → FAIL nos novos.
- [ ] **Step 3: Implementar** em `QuadraPage.tsx`:
  - Remover o botão "Adicionar casa" do topo (manter "Reordenar") e o botão "Cadastrar a primeira casa" da quadra vazia.
  - Percorrer **`ruas`** (não `grupos`) nos dois modos: cada rua mostra título (com a contagem, ou "nenhuma casa") e suas casas (modo Trabalho: `listaDeTrabalho`; modo Todas: todas) e, se `aberto`, um `CadastroRapido` no fim. Depois da última rua, `NovaRuaInline` se `aberto`. Na quadra vazia, mostrar o convite e as mesmas linhas de rua + `NovaRuaInline`, no lugar dos botões antigos.
  - Foco na casa nova: guardar em um `useRef` os ids de `casas` e a `esperada` recebida em `onAdicionada`; um `useEffect` sobre `casas` chama `casaNova(idsAntes, casas, esperada)` e, ao achar, faz `setFocoId(c.id)` e limpa a `esperada`.
  - `onMaisOpcoes(rua)` → `setNovaCasa({ ruaInicial: rua })`; `NovaCasaSheet` recebe `ruaInicial`.
  - Adicionar a classe `esconde-no-teclado` ao `<section className="barra-fixa no-fluxo">`.
  - Em `NovaCasaSheet.tsx`: prop `ruaInicial?: string` na inicialização do estado `rua`.
- [ ] **Step 4: Rodar:** `npx vitest run src/features src/app src/domain` e `npx tsc --noEmit -p .` → PASS (tarefas anteriores incluídas; sem novas falhas além dos 5 que dependem de emulador).
- [ ] **Step 5: Commit:** `git add src/features/houses && git commit -m "feat(quadra): cadastrar casas e ruas na própria tela da quadra"`

---

### Task 6: Verificação final

**Files:** nenhum novo.

- [ ] **Step 1:** `npx vitest run` — informar o resultado real (esperado: só os 5 que dependem do emulador falham, como antes); `npx tsc --noEmit -p .`; `npm run build` (ou `node node_modules/vite/bin/vite.js build` se o `npm` falhar no ambiente) → build sem erro.
- [ ] **Step 2: Conferir no modo demonstração** (`src/demo/`): abrir a quadra de um cartão aberto, cadastrar 232, 233 sem resultado, tocar na 232 e marcar; cadastrar "Portão azul" no modo Sem número; criar uma nova rua. Descrever o que viu; não declarar pronto sem ter visto.
- [ ] **Step 3: Listar o que fica para o usuário no celular real** (Chrome do Android e iPhone): campo ficar visível com o teclado aberto em Nova rua, Nova casa (Mais opções), cadastro rápido na quadra, Entrar e formulários da Administração; a barra de resultados some ao digitar e volta ao fechar o teclado.
- [ ] **Step 4:** Sem commit extra se nada mudou; relatar pendências.
