# Rodadas, fechamento manual e admin reorganizado — Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam caixas `- [ ]`.

**Objetivo:** registrar o resultado já ao cadastrar a casa, trocar o fechamento automático do cartão por fechamento manual, controlar o trabalho em rodadas por quadra e reorganizar as telas de administração.

**Arquitetura:** regras puras em `src/domain/` (rodada, status, ciclo); camada `src/firebase/` e espelho em `src/demo/banco.ts` para cada operação nova; contadores `totalCasas` e `faltam` na quadra, atualizados nos mesmos lotes das casas e visitas; telas novas e reorganizadas em `src/features/`.

**Stack:** React 18, TypeScript, Vite, Firebase (Firestore) com emuladores, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-rodadas-e-fechamento-manual-design.md` (leia inteira; este plano a implementa e a complementa).

## Global Constraints

- Interface em português do Brasil, tom calmo e curto, sem gíria e sem exclamações.
- A palavra da interface é **rodada**; a aba "Ciclo" vira **Histórico**; o texto "Ciclo" some da interface (o número do ciclo continua como dado).
- Status de casa sempre com cor + forma + nome; rótulos em `src/domain/rotulos.ts`.
- Alvos de toque ≥ 48 px, texto ≥ 16 px, contraste AA; âmbar só como fundo.
- Todo acesso ao SDK do Firebase fica em `src/firebase/` (o teste `tests/arquitetura.test.ts` verifica).
- Regras de negócio são funções puras em `src/domain/`, sem Firebase.
- Toda função de `src/firebase/` que muda dados tem versão equivalente em `src/demo/banco.ts` (padrão `if (demoAtivo()) return demo.x(...)`).
- Visitas e cadastro só em cartão aberto, travado na **interface**; as regras de segurança não verificam isso.
- Dados sensíveis (Não visitar, estudos) nunca em destaque público; sem nomes de moradores.
- Um commit por tarefa, mensagem em português no estilo do repositório (`feat(...)`, `fix(...)`). Não altere `docs/` nem `design/` além do indicado.
- Comandos de teste: `npm test` (unitários, jsdom) e `npx firebase emulators:exec "vitest run tests/data tests/rules"` (dados e regras, com emuladores; Java 21 já instalado). Também `npm run lint` e `npm run build`.

## Review Focus

Entradas e condições que a spec sugere e nenhuma tarefa exercitaria sozinha, da mais provável para a menos:

1. Quadra ou cartão já existente, sem os campos novos (`totalCasas`, `faltam`, `rodadasTotal`, `rodadaAtual`): deve abrir normalmente, a quadra continua visível na lista do cartão e nada quebra. (Teste na Tarefa 3 e na Tarefa 8.)
2. Duas pessoas abrindo rodada na mesma quadra ao mesmo tempo: a segunda é negada e o app mostra "Não foi possível salvar", sem criar rodada duplicada. (Teste de regras na Tarefa 3.)
3. Rodada deixada aberta de um dia para o outro: continua aberta, a faixa mostra "aberta em dd/mm" e encerrar funciona. (Tarefas 2 e 7.)
4. Cartão com todas as casas resolvidas e ainda aberto (o que antes fechava sozinho): continua aberto, não aparece como "contadores suspeitos" e a lista mostra "Nada para visitar nesta quadra". (Tarefas 2 e 7.)
5. Excluir ou criar casa em quadra com contadores: `totalCasas`, `faltam` e `resolvidas` continuam batendo com a lista, também para casas nascidas com Falado, Estudo ou Não visitar. (Tarefa 5.)

---

## Task 1: Logo novo em todo o app

**Files:**
- Create: `src/app/Logo.tsx`, `src/app/Logo.test.tsx`
- Modify: `src/app/Topo.tsx:34`, `src/features/cards/CartoesPage.tsx:19`, `src/features/houses/QuadraPage.tsx:134`, `src/pwa/InstalarPage.tsx:6`, `src/features/auth/AguardandoLiberacao.tsx`, `src/features/auth/LoginPage.tsx`, `src/app/icones.tsx` (remover `#i-logo`), `src/app/styles.css` (remover `--logo-tile` se ficar sem uso)
- Test: `src/app/Logo.test.tsx`, `tests/arquitetura.test.ts`

**Interfaces:**
- Produces: `export default function Logo(props: { tamanho: number; className?: string }): JSX.Element` — `<img>` de `@/assets/icone.svg`, `alt=""`, `width`/`height` = `tamanho`, `style={{ flex: 'none' }}`.

- [ ] **Step 1: Write the failing test** — em `Logo.test.tsx`: `renderiza uma imagem decorativa com o tamanho pedido` (`img` com `alt=""`, `width` 36). Em `tests/arquitetura.test.ts`, novo teste `nenhum arquivo de src usa o símbolo antigo #i-logo` que lê todos os `.ts`/`.tsx` de `src/` e espera zero ocorrências de `i-logo`.
- [ ] **Step 2: Run to verify it fails** — `npm test` → FAIL (Logo não existe; `#i-logo` ainda usado).
- [ ] **Step 3: Implement** `Logo` e trocar os quatro usos de `<svg><use href="#i-logo"/></svg>` pelo componente (tamanhos atuais: 36 no `Topo`, 72 nos estados vazios, 64 na `InstalarPage`); `LoginPage` passa a usar `Logo`; `AguardandoLiberacao` ganha `<Logo tamanho={88} />` acima do título, como em `design/prototipo/02-aguardando.html`. Remover o símbolo `i-logo` de `icones.tsx`.
- [ ] **Step 4: Run to verify it passes** — `npm test` → PASS; `npm run lint` sem erros.
- [ ] **Step 5: Commit** — `git commit -m "fix(identidade): logo novo em todas as telas; remove o desenho antigo"`

---

## Task 2: Domínio — status, rodada e ciclo do cartão

**Files:**
- Create: `src/domain/rodada.ts`, `src/domain/rodada.test.ts`
- Modify: `src/domain/types.ts`, `src/domain/status.ts`, `src/domain/ciclo.ts`, `src/features/admin/textoEvento.ts`
- Test: `src/domain/status.test.ts`, `src/domain/ciclo.test.ts`, `src/domain/rodada.test.ts`, `src/features/admin/textoEvento.test.ts`

**Interfaces:**
- Produces (types): `Quadra` ganha `totalCasas: number; faltam: number; rodadasTotal: number; rodadaAtual?: RodadaAtual`; `type RodadaAtual = { id: string; numero: number; porNome: string; em: number }`; `type Rodada = { id: string; numero: number; abertaPorUid: string; abertaPorNome: string; abertaEm: number; encerradaPorUid?: string; encerradaPorNome?: string; encerradaEm?: number }`; `Visita` ganha `rodada?: number`; `EventoCartao.tipo` vira `'aberto' | 'fechado' | 'rodada'`, `motivo` ganha `'fechamento_reinicio' | 'rodada_aberta' | 'rodada_encerrada'`, e o evento ganha `quadraId?: string; quadraRotulo?: string; rodada?: number`.
- Produces (status): `faltaVisitar(s: Status): boolean` (verdadeiro para `pendente` e `sem_resposta`); `deltaFaltam(antes: Status, depois: Status): -1 | 0 | 1` (−1 quando deixa de faltar, 1 quando passa a faltar).
- Produces (rodada): `podeAbrirRodada(q: Pick<Quadra,'rodadaAtual'>): boolean`; `podeEncerrarRodada(q): boolean`; `proximoNumeroRodada(q: Pick<Quadra,'rodadasTotal'>): number`; `podeRegistrarNaQuadra(c: Pick<Cartao,'estado'>, q: Pick<Quadra,'rodadaAtual'>): boolean`; `rodadaDeOutroDia(r: Pick<RodadaAtual,'em'>, agora: number): boolean`; `quadrasComRodadaAberta<Q extends Pick<Quadra,'rodadaAtual'>>(qs: Q[]): Q[]`; `podeFecharCartao(qs: Pick<Quadra,'rodadaAtual'>[]): boolean`; `quadrasParaVisitar<Q extends Pick<Quadra,'totalCasas'|'faltam'>>(qs: Q[]): Q[]` (mantém quadra com `totalCasas === 0` ou `faltam > 0`).
- Produces (ciclo): `fecharCartao(c: Cartao): Pick<Cartao,'estado'>` **sem subir o ciclo**; `estadoAposFecharEReiniciar(c: Pick<Cartao,'ciclo'>): Pick<Cartao,'estado'|'ciclo'>` → `{ estado: 'fechado', ciclo: c.ciclo + 1 }`; `contadoresSuspeitos` deixa de tratar "aberto e tudo resolvido" como suspeito. Removem-se `deveFecharAuto` e `reiniciarCartaoEstado`. `listaDeTrabalho`, `idsParaReiniciar`, `podeRegistrar`, `abrirCartao` ficam como estão.

- [ ] **Step 1: Write the failing tests** — nomes e asserções: `faltaVisitar` verdadeiro só para pendente e sem_resposta; `deltaFaltam('pendente','falado') === -1`, `('falado','sem_resposta') === 1`, `('pendente','sem_resposta') === 0`; `podeAbrirRodada({}) === true` e com `rodadaAtual` `false`; `proximoNumeroRodada({ rodadasTotal: 2 }) === 3`; `podeRegistrarNaQuadra` exige `estado: 'aberto'` e `rodadaAtual`; `rodadaDeOutroDia` falso no mesmo dia local e verdadeiro no dia seguinte; `podeFecharCartao` falso com qualquer quadra com `rodadaAtual`; `quadrasParaVisitar` mantém `{ totalCasas: 0, faltam: 0 }` e `{ totalCasas: 5, faltam: 1 }`, remove `{ totalCasas: 5, faltam: 0 }`; `fecharCartao({ ciclo: 3 })` não traz `ciclo`; `estadoAposFecharEReiniciar({ ciclo: 3 })` → `{ estado: 'fechado', ciclo: 4 }`; `contadoresSuspeitos({ estado: 'aberto', totalCasas: 5, resolvidas: 5 }) === false`; `textoEvento` para `fechamento_reinicio` = `"Ana fechou e reiniciou o território"`, para `rodada_aberta` = `"Ana abriu a rodada 2 da Quadra 5"` (com `rodada` e `quadraRotulo`), para `rodada_encerrada` = `"Ana encerrou a rodada 2 da Quadra 5"`; `fechamento_automatico` mantém o texto antigo.
- [ ] **Step 2: Run to verify it fails** — `npm test` → FAIL.
- [ ] **Step 3: Implement** as funções acima nos arquivos indicados. Remover `deveFecharAuto` e `reiniciarCartaoEstado` e seus testes antigos; os usos em `src/firebase/houses.ts` e `src/demo/banco.ts` são corrigidos nas Tarefas 4 e 5 (até lá, o `tsc` pode acusar erro nesses dois arquivos: não commite a Tarefa 2 sem ajustá-los minimamente — ver Step 4).
- [ ] **Step 4: Manter o build verde** — em `houses.ts` e `banco.ts`, trocar temporariamente os usos removidos por equivalentes mínimos (`fecha = false`; `reiniciarCartaoEstado` → `estadoAposFecharEReiniciar`), e ajustar literais de `Quadra` em testes/semente para os campos novos (valores `0`). Run `npm test && npm run build` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(domínio): rodadas, contador 'faltam' e fechamento do cartão só manual"`

---

## Task 3: Conversores e regras de segurança

**Files:**
- Modify: `src/firebase/converters.ts`, `firestore.rules`
- Test: `tests/rules/firestore.rules.test.ts`, `src/firebase/converters.test.ts` (criar)

**Interfaces:**
- Consumes: tipos da Tarefa 2.
- Produces: `quadraDe(id, d)` devolve `totalCasas`, `faltam`, `rodadasTotal` (padrão `0` quando ausentes) e `rodadaAtual` (só quando o campo é um objeto válido); `visitaDe` devolve `rodada` quando numérico; `eventoDe` devolve `quadraId`, `quadraRotulo`, `rodada` quando presentes e aceita `tipo: 'rodada'`; `export function rodadaDe(id: string, d: Dados): Rodada`.

- [ ] **Step 1: Write the failing tests** — `converters.test.ts`: `quadraDe sem campos novos usa zero e sem rodada atual` (Review Focus 1: `{ totalCasas: 0, faltam: 0, rodadasTotal: 0 }` e `rodadaAtual` ausente); `quadraDe lê rodadaAtual completa`; `eventoDe aceita tipo rodada`; `rodadaDe lê abertura e encerramento`. `firestore.rules.test.ts`, usando o padrão do arquivo: `publicador atualiza totalCasas, faltam e rodadasTotal da quadra`; `publicador não renomeia a quadra nem remove rua`; `publicador define rodadaAtual quando está vazia`; `segunda definição de rodadaAtual é negada` e `rodadasTotal que não sobe de 1 em 1 é negado` (Review Focus 2); `publicador encerra a rodada (remove rodadaAtual)`; `membro cria rodada com abertaPorUid próprio e é negado com uid de outro`; `rodada só aceita preencher campos de encerramento no update`; `publicador cria evento rodada_aberta com o próprio uid` e `é negado a criar fechamento_automatico ou fechado`; `publicador não muda o estado do cartão`; `publicador atualiza resolvidas, totalCasas e atualizadoEm do cartão`; `admin fecha o cartão`.
- [ ] **Step 2: Run to verify it fails** — `npm test` e `npx firebase emulators:exec "vitest run tests/rules"` → FAIL.
- [ ] **Step 3: Implement** os conversores e as regras: no cartão, publicador só `hasOnly(['resolvidas','totalCasas','atualizadoEm'])`; em `eventos`, publicador só cria `tipo == 'rodada'` com `motivo in ['rodada_aberta','rodada_encerrada']` e `porUid == request.auth.uid` (remover a exceção do fechamento automático); em `blocks`, publicador atualiza `hasOnly(['ruas','totalCasas','faltam','rodadaAtual','rodadasTotal'])`, `ruas` só sem remover, `rodadaAtual` só definido quando `resource.data.get('rodadaAtual', null) == null` e então `rodadasTotal == resource.data.get('rodadasTotal', 0) + 1`; nova `match /rodadas/{rodadaId}` dentro de `blocks`: leitura de membro, `create` de membro com `abertaPorUid == request.auth.uid`, `update` de membro com `affectedKeys().hasOnly(['encerradaPorUid','encerradaPorNome','encerradaEm'])` e `encerradaPorUid == request.auth.uid`, `delete: false`.
- [ ] **Step 4: Run to verify it passes** — mesmos comandos → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(dados): conversores de quadra e rodada e regras para rodadas e contadores"`

---

## Task 4: Rodadas na camada de dados (Firebase e demo)

**Files:**
- Create: `src/firebase/rodadas.ts`, `tests/data/rodadas.test.ts`
- Modify: `src/firebase/blocks.ts` (criar quadra com contadores zerados), `src/firebase/cards.ts` (`observarEventos` com limite), `src/demo/banco.ts`, `src/demo/banco.test.ts`
- Test: `tests/data/rodadas.test.ts`, `src/demo/banco.test.ts`

**Interfaces:**
- Consumes: `Quadra`, `Rodada`, `RodadaAtual`, `podeAbrirRodada`, `podeEncerrarRodada`, `proximoNumeroRodada` (Tarefa 2).
- Produces: `abrirRodada(cartaoId: string, quadra: Quadra, usuario: { uid: string; nome: string }): Promise<void>` e `encerrarRodada(cartaoId: string, quadra: Quadra, usuario: { uid: string; nome: string }): Promise<void>`, ambas lançando `Error` quando a regra de domínio não permite; `observarEventos(cartaoId: string, cb: (e: EventoCartao[]) => void, limite = 50): () => void`; `observarRodadas(cartaoId: string, quadraId: string, cb: (r: Rodada[]) => void): () => void` (mais recente primeiro).
- `abrirRodada` grava em um lote: documento em `rodadas` (id gerado antes, para `rodadaAtual.id`), quadra com `{ rodadaAtual: { id, numero, porNome, em }, rodadasTotal: numero }` e evento `{ tipo: 'rodada', motivo: 'rodada_aberta', quadraId, quadraRotulo, rodada, em, porUid, porNome }`. `encerrarRodada` preenche `encerradaPorUid/Nome/Em` na rodada, remove `rodadaAtual` da quadra (`deleteField()`) e grava o evento `rodada_encerrada`.

- [ ] **Step 1: Write the failing tests** — `tests/data/rodadas.test.ts` (emulador, padrão de `houses.test.ts`): `abrirRodada cria a rodada 1 com quem e quando`, `abrirRodada na quadra com rodada aberta lança erro`, `encerrarRodada grava quem e quando e limpa rodadaAtual`, `a rodada seguinte é a 2`, `abrir e encerrar gravam eventos com quadra e número`. Em `banco.test.ts`: os mesmos comportamentos contra a demo (`abrirRodada`, `encerrarRodada`, `observarRodadas`, eventos).
- [ ] **Step 2: Run to verify it fails** — `npm test` e `npx firebase emulators:exec "vitest run tests/data/rodadas.test.ts"` → FAIL.
- [ ] **Step 3: Implement** em `rodadas.ts` (e espelho em `banco.ts`, com `Estado.rodadas: Record<string, Rodada[]>`); `criarQuadra` passa a gravar `totalCasas: 0, faltam: 0, rodadasTotal: 0`; `observarEventos` aceita o limite; a semente da demo preenche os contadores das quadras a partir das casas (função `recontarQuadra`, mesma ideia de `recontar`).
- [ ] **Step 4: Run to verify it passes** — mesmos comandos → PASS; `npm run build`.
- [ ] **Step 5: Commit** — `git commit -m "feat(rodadas): abrir e encerrar rodada por quadra, com histórico"`

---

## Task 5: Visitas, casas, fechamento e contadores na camada de dados

**Files:**
- Modify: `src/firebase/houses.ts`, `src/firebase/cards.ts`, `src/demo/banco.ts`
- Test: `tests/data/houses.test.ts`, `tests/data/cards.test.ts`, `src/demo/banco.test.ts`

**Interfaces:**
- Consumes: `deltaResolvidas`, `deltaFaltam`, `faltaVisitar`, `podeFecharCartao`, `estadoAposFecharEReiniciar`, `fecharCartao` (Tarefa 2).
- Produces:
  - `registrarVisita(a: { cartao: Cartao; quadraId: string; rodada: number; casa: Casa; novoStatus: Status; obs?: string; usuario: Usuario }): Promise<void>` — grava `rodada` na visita, ajusta `resolvidas` do cartão e `faltam` da quadra, **nunca fecha o cartão**.
  - `criarCasa(cartaoId, quadraId, d: { rua: string; numero?: string; descricao?: string; depoisDe?: string; resultado?: { status: Status; usuario: Usuario; ciclo: number; rodada: number } }, existentes: Casa[]): Promise<string>` — com `resultado` e status diferente de `pendente`, grava casa e visita no mesmo lote; sempre soma `totalCasas` e, quando falta visitar, `faltam` da quadra.
  - `criarCasasEmFaixa` e `excluirCasa` ajustam `totalCasas` e `faltam` da quadra.
  - `fecharCartaoManual(c: Cartao, usuario: Usuario, quadras: Pick<Quadra,'rodadaAtual'>[]): Promise<void>` e `fecharEReiniciarCartao(cartao: Cartao, casas: Casa[], quadras: Quadra[], usuario: Usuario): Promise<void>` (substitui `reiniciarCartao`); ambas lançam `Error('Rodada aberta')` se `!podeFecharCartao(quadras)`. `fecharEReiniciarCartao` volta as casas a Pendente (menos Não visitar, `idsParaReiniciar`), recalcula `resolvidas` do cartão e `faltam` de cada quadra (total menos Não visitar), aplica `estadoAposFecharEReiniciar` e grava um evento `{ tipo: 'fechado', motivo: 'fechamento_reinicio' }`.
  - `recalcularContadores(cartaoId: string)` também grava `totalCasas` e `faltam` de cada quadra.

- [ ] **Step 1: Write the failing tests** — emulador e demo: `registrarVisita grava a rodada na visita`; `registrarVisita da última casa não fecha o cartão` (Review Focus 4); `registrarVisita ajusta faltam da quadra` (pendente→falado: −1; falado→sem_resposta: +1); `criarCasa com resultado falado grava casa e visita no mesmo lote, com resolvidas +1 e faltam inalterado`; `criarCasa com resultado sem_resposta soma faltam`; `criarCasa pendente soma totalCasas e faltam`; `excluirCasa de casa que falta reduz faltam e totalCasas` e `de casa resolvida reduz resolvidas` (Review Focus 5); `criarCasasEmFaixa soma o tamanho da faixa em totalCasas e faltam`; `fecharCartaoManual não sobe o ciclo`; `fecharCartaoManual lança erro com rodada aberta`; `fecharEReiniciarCartao deixa o cartão fechado, ciclo +1, casas Pendente menos Não visitar, faltam por quadra correto e um evento fechamento_reinicio`; `fecharEReiniciarCartao lança erro com rodada aberta`; `recalcularContadores corrige totalCasas e faltam da quadra`.
- [ ] **Step 2: Run to verify it fails** — `npm test` e `npx firebase emulators:exec "vitest run tests/data"` → FAIL.
- [ ] **Step 3: Implement** nos três arquivos (os lotes de reinício continuam em fatias de 400 operações; os contadores de quadra vão no último lote). Remover `reiniciarCartao` e os imports de `deveFecharAuto`/`reiniciarCartaoEstado`, e os temporários da Tarefa 2.
- [ ] **Step 4: Run to verify it passes** — mesmos comandos → PASS; `npm run build` mostra erro apenas nos chamadores de `reiniciarCartao`, `fecharCartaoManual` e `registrarVisita`, corrigidos nas Tarefas 7 e 10 — para manter o build verde aqui, ajuste esses chamadores minimamente (passar `rodada` provisória e `quadras: []`) e anote em comentário `// ajustado na Tarefa 7/10`.
- [ ] **Step 5: Commit** — `git commit -m "feat(dados): fechamento só manual, visita com rodada e contadores por quadra"`

---

## Task 6: Ícone de casa com mais e botão "+ casa" no canto inferior direito

**Files:**
- Modify: `src/app/icones.tsx` (símbolo `i-casa-mais` e nome `casa-mais`), `src/app/styles.css` (`.fab`, `.fab.sobre-barra`), `src/features/houses/QuadraPage.tsx` (apenas o botão e o espaço no fim da lista)
- Test: `src/features/houses/QuadraPage.test.tsx`

**Interfaces:**
- Consumes: `Icone` com `nome="casa-mais"`.
- Produces: botão `aria-label="Adicionar casa"` com **apenas o ícone**, sem a palavra "casa", ≥ 48 px, no canto inferior direito acima da barra de status; a lista ganha `padding-bottom` suficiente para a última linha não ficar atrás dele.

- [ ] **Step 1: Write the failing test** — `o botão de adicionar casa mostra só o ícone e tem nome acessível`: `getByRole('button', { name: 'Adicionar casa' })`, sem texto visível `casa`, contém o símbolo `i-casa-mais`.
- [ ] **Step 2: Run to verify it fails** — `npm test -- QuadraPage` → FAIL.
- [ ] **Step 3: Implement** o símbolo (casa em contorno com sinal de mais, mesmo estilo dos demais ícones de `icones.tsx`), trocar o conteúdo do botão e refinar o CSS: tamanho 56 px, `right: 16px`, sombra e contraste nos temas claro e escuro, posição acima da barra de status (`bottom` calculado a partir da altura da barra, em vez do valor fixo `208px`).
- [ ] **Step 4: Run to verify it passes** — `npm test` → PASS; abrir `npm run dev` e conferir no modo celular, nos temas claro e escuro, que o botão não cobre linhas nem o painel de status (relatar o resultado real).
- [ ] **Step 5: Commit** — `git commit -m "feat(ui): botão de adicionar casa só com ícone, no canto inferior direito"`

---

## Task 7: Quadra — faixa de rodada, bloqueios e lista do que falta

**Files:**
- Create: `src/features/houses/FaixaRodada.tsx`, `src/features/houses/FaixaRodada.test.tsx`
- Modify: `src/features/houses/QuadraPage.tsx`, `src/features/houses/CasaPage.tsx`, `src/features/houses/QuadraPage.test.tsx`, `src/features/houses/CasaPage.test.tsx`
- Test: os arquivos acima

**Interfaces:**
- Consumes: `abrirRodada`, `encerrarRodada` (Tarefa 4); `podeRegistrarNaQuadra`, `rodadaDeOutroDia`, `podeAbrirRodada`, `podeEncerrarRodada` (Tarefa 2); `registrarVisita` com `rodada` (Tarefa 5).
- Produces: `export default function FaixaRodada(props: { cartaoId: string; quadra: Quadra; cartaoAberto: boolean; onErro: () => void }): JSX.Element`. Aberta: `Rodada N · aberta por Nome às hh:mm` e botão "Encerrar rodada"; de outro dia: `Rodada N · aberta em dd/mm por Nome`; sem rodada: "Nenhuma rodada aberta" e botão "Abrir rodada". Com cartão fechado, os botões ficam desativados (`aria-disabled`).

- [ ] **Step 1: Write the failing tests** — `FaixaRodada`: `mostra rodada aberta com quem e hora`, `mostra a data quando a rodada é de outro dia` (Review Focus 3), `Abrir rodada chama abrirRodada com a quadra e o usuário`, `Encerrar rodada chama encerrarRodada`, `falha de gravação chama onErro`. `QuadraPage`: `sem rodada aberta os botões de status ficam bloqueados`, `com rodada aberta registrar a visita grava a rodada`, `Nada para visitar nesta quadra com atalho para Todas quando só restam casas resolvidas` (Review Focus 4), `Trabalho continua mostrando Atenção para Estudo e Não visitar`.
- [ ] **Step 2: Run to verify it fails** — `npm test -- FaixaRodada QuadraPage CasaPage` → FAIL.
- [ ] **Step 3: Implement** a faixa abaixo do topo da quadra; `QuadraPage` usa `podeRegistrarNaQuadra(cartao, quadra)` no lugar de `podeRegistrar(cartao)` para bloquear os botões e passa `rodada: quadra.rodadaAtual.numero` a `registrarVisita` (a `CasaPage` faz o mesmo); estado vazio do modo Trabalho com o texto "Nada para visitar nesta quadra". Remover os parâmetros provisórios da Tarefa 5 nesses arquivos.
- [ ] **Step 4: Run to verify it passes** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(quadra): faixa de rodada, registro só com rodada aberta e lista do que falta"`

---

## Task 8: Nova casa com "O que aconteceu" e cartão só com quadras que faltam

**Files:**
- Modify: `src/features/houses/NovaCasaSheet.tsx`, `src/features/houses/QuadraPage.tsx` (novas props da folha), `src/features/cards/CartaoPage.tsx`, `src/features/houses/NovaCasaSheet.test.tsx`, `src/features/cards/CartaoPage.test.tsx`
- Test: os arquivos acima

**Interfaces:**
- Consumes: `criarCasa` com `resultado` (Tarefa 5); `quadrasParaVisitar`, `podeRegistrarNaQuadra` (Tarefa 2); `abrirRodada` (Tarefa 4).
- Produces: `NovaCasaSheet` ganha as props `cartao: Cartao` e `usuario: { uid: string; nome: string }`. Linha "O que aconteceu" com Pendente (padrão), Falado, Sem resposta, Estudo e Não visitar, cada um com ícone de status + nome (`rotuloStatus`, `classeStatus`).

- [ ] **Step 1: Write the failing tests** — `NovaCasaSheet`: `escolher Falado salva a casa com resultado, ciclo e rodada`, `Pendente salva sem resultado`, `sem rodada aberta a linha fica desativada com o aviso e o botão Abrir rodada`, `Salvar e adicionar outra mantém a rua e volta o resultado para Pendente`, `a aba Faixa não mostra o resultado`. `CartaoPage`: `lista só as quadras com casas para visitar, com N para visitar`, `quadra vazia continua aparecendo`, `quadra antiga sem contadores continua aparecendo` (Review Focus 1), `Mostrar todas as quadras revela as demais`, `mostra a etiqueta Rodada aberta`.
- [ ] **Step 2: Run to verify it fails** — `npm test -- NovaCasaSheet CartaoPage` → FAIL.
- [ ] **Step 3: Implement** a linha de resultado (opções em `role="radiogroup"`, alvo ≥ 48 px), o aviso "Abra a rodada para registrar o que aconteceu" com botão "Abrir rodada", e a lista do cartão com `quadrasParaVisitar` e o botão "Mostrar todas as quadras".
- [ ] **Step 4: Run to verify it passes** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(casas): resultado ao cadastrar a casa e cartão só com quadras que faltam"`

---

## Task 9: Administração — lista de cartões e "Novo cartão" em folha

**Files:**
- Create: `src/features/admin/ListaCartoesAdmin.tsx`, `src/features/admin/ListaCartoesAdmin.test.tsx`
- Modify: `src/features/admin/AdminPage.tsx`, `src/features/admin/CartaoForm.tsx` (apresentação em folha), `src/features/admin/CartaoForm.test.tsx`, `src/app/styles.css` se faltar classe para a linha da lista
- Test: os arquivos acima

**Interfaces:**
- Consumes: `useCartoes()`, `CartaoForm`.
- Produces: `export default function ListaCartoesAdmin(): JSX.Element` — uma linha por cartão (número, título, Aberto/Fechado, quantas quadras, casas que faltam como `totalCasas − resolvidas`) que navega para `/admin/cartao/:id`; botão "Novo cartão" no topo que abre `CartaoForm` numa folha (`role="dialog"`, `aria-label="Novo cartão"`) com "Cancelar"; ao criar, a folha fecha. `AdminPage` com abas `membros | cartoes | historico`; a aba Cartões mostra só `ListaCartoesAdmin`.

- [ ] **Step 1: Write the failing tests** — `lista os cartões com estado e casas que faltam`, `Novo cartão abre a folha e o formulário não aparece antes`, `Cancelar fecha a folha`, `criar o cartão fecha a folha`, `tocar numa linha navega para a tela do cartão`; `AdminPage`: `as abas são Membros, Cartões e Histórico` e `não existe mais a aba Ciclo`.
- [ ] **Step 2: Run to verify it fails** — `npm test -- ListaCartoesAdmin AdminPage CartaoForm` → FAIL.
- [ ] **Step 3: Implement** os componentes e a aba; o `CartaoForm` ganha `onCriado?: () => void` e `onCancelar?: () => void`. A aba Histórico mostra provisoriamente o conteúdo da Tarefa 11 (placeholder removido nela).
- [ ] **Step 4: Run to verify it passes** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(admin): lista de cartões e novo cartão em folha"`

---

## Task 10: Tela do cartão no admin (estado, quadras e histórico)

**Files:**
- Create: `src/features/admin/CartaoAdminPage.tsx`, `src/features/admin/CartaoAdminPage.test.tsx`, `src/features/admin/EstadoCartao.tsx`
- Modify: `src/app/routes.tsx` (rota `admin/cartao/:cartaoId`), `src/features/admin/QuadrasAdmin.tsx` (recebe o cartão por prop, sem chips), `src/features/admin/HistoricoCartaoPage.tsx:56` (voltar para `/admin/cartao/:id`), remover `CicloAdmin.tsx` e `CicloAdmin.test.tsx` (conteúdo migra para `EstadoCartao`)
- Test: os arquivos acima, `src/features/admin/QuadrasAdmin.test.tsx`

**Interfaces:**
- Consumes: `fecharCartaoManual`, `fecharEReiniciarCartao` (Tarefa 5); `podeFecharCartao`, `contadoresSuspeitos` (Tarefa 2); `abrirCartaoManual`; `recalcularContadores`.
- Produces: `export default function EstadoCartao(props: { cartao: Cartao; quadras: Quadra[] }): JSX.Element` com botões Abrir cartão, Fechar cartão, Fechar e reiniciar e Recalcular contadores; `QuadrasAdmin` passa a `({ cartao }: { cartao: Cartao })`. `CartaoAdminPage` mostra três blocos recolhíveis (Estado aberto por padrão, Quadras e ruas, Histórico com atalho) e botão de voltar para a lista.
- Textos: "Fechar" e "Fechar e reiniciar" desativados com a mensagem "Encerre as rodadas abertas antes de fechar." quando `!podeFecharCartao(quadras)`; a folha de confirmação de "Fechar e reiniciar" mantém o texto atual do reinício (casas voltam a Pendente exceto Não visitar; novo ciclo; sem desfazer) e informa que o cartão fica **fechado**.

- [ ] **Step 1: Write the failing tests** — `EstadoCartao`: `Fechar cartão grava fechamento manual sem subir o ciclo`, `Fechar e reiniciar confirma e deixa o cartão fechado`, `Fechar e Fechar e reiniciar ficam desativados com rodada aberta e mostram o aviso`, `Abrir cartão só com cartão fechado`, `contadores suspeitos mostram o aviso`; `CartaoAdminPage`: `mostra os três blocos`, `voltar leva à lista`, `a rota admin/cartao/:id exige administrador`; `QuadrasAdmin`: `lista só as quadras do cartão recebido`.
- [ ] **Step 2: Run to verify it fails** — `npm test -- EstadoCartao CartaoAdminPage QuadrasAdmin` → FAIL.
- [ ] **Step 3: Implement** migrando a lógica de `CicloAdmin` (inclui `useCasasDoCartao` e a folha de confirmação do reinício) para `EstadoCartao`; remover os chips de troca de cartão; remover os chamadores provisórios da Tarefa 5.
- [ ] **Step 4: Run to verify it passes** — `npm test` → PASS; `npm run build` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(admin): tela do cartão com estado, quadras e histórico"`

---

## Task 11: Histórico (antes "Ciclo")

**Files:**
- Create: `src/features/admin/HistoricoAdmin.tsx`, `src/features/admin/HistoricoAdmin.test.tsx`
- Modify: `src/features/admin/AdminPage.tsx`, `src/features/admin/HistoricoCartaoPage.tsx`, `src/features/admin/HistoricoCartaoPage.test.tsx`, `src/features/admin/textoEvento.ts` se faltar texto
- Test: os arquivos acima

**Interfaces:**
- Consumes: `observarEventos(cartaoId, cb, limite)` (Tarefa 4), `useCartoes()`, `textoEvento`.
- Produces: `export default function HistoricoAdmin(): JSX.Element` — linha do tempo única de todos os cartões, mais recente primeiro (cartão, tipo do evento, texto, data e hora), com seletor compacto "Todos os cartões" (um `<select>`, não uma fileira de botões); tocar num item navega para `/admin/cartao/:id/historico`. `HistoricoCartaoPage` troca os chips por um título do cartão, usa o ícone e o rótulo certos para eventos de rodada ("Rodada aberta"/"Rodada encerrada" com a quadra e o número), agrupa as rodadas por quadra num bloco "Rodadas por quadra" e remove a frase "Só os últimos 10 registros aparecem".

- [ ] **Step 1: Write the failing tests** — `HistoricoAdmin`: `junta os eventos de todos os cartões, do mais recente para o mais antigo`, `o seletor filtra por cartão`, `tocar num item abre o histórico do cartão`, `sem eventos mostra Nenhum registro ainda`; `HistoricoCartaoPage`: `mostra eventos de rodada com quadra e número`, `mostra fechou e reiniciou o território`, `não mostra mais chips de cartão`.
- [ ] **Step 2: Run to verify it fails** — `npm test -- HistoricoAdmin HistoricoCartaoPage` → FAIL.
- [ ] **Step 3: Implement** o componente e ligá-lo à aba Histórico de `AdminPage` (um observador de eventos por cartão, junção e ordenação no cliente).
- [ ] **Step 4: Run to verify it passes** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(admin): aba Histórico com linha do tempo de todos os cartões"`

---

## Task 12: Semente de testes e verificação final

**Files:**
- Modify: `tests/e2e/seed.ts`, `tests/e2e/*.spec.ts` que dependam de "Ciclo", de fechamento automático ou do botão "casa" com texto, `src/demo/banco.ts` (semente com uma rodada aberta e uma encerrada de exemplo)
- Test: `tests/e2e`, suíte completa

**Interfaces:**
- Consumes: tudo acima.
- Produces: semente com quadras que têm `totalCasas`, `faltam`, `rodadasTotal` e (em uma delas) `rodadaAtual`; e2e que cobre o fluxo principal.

- [ ] **Step 1: Write the failing e2e** — `fluxo: abrir rodada, cadastrar casa já falada, encerrar rodada, ver no Histórico` e `fluxo: fechar e reiniciar deixa o cartão fechado e aparece no Histórico`; ajustar os e2e existentes que citavam a aba "Ciclo" ou o fechamento automático.
- [ ] **Step 2: Run to verify it fails** — `npm run e2e` → FAIL antes da semente.
- [ ] **Step 3: Implement** a semente e os ajustes.
- [ ] **Step 4: Verificação completa** — `npm test`, `npx firebase emulators:exec "vitest run tests/data tests/rules"`, `npm run lint`, `npm run build`, `npm run e2e`: todos passando. Conferir manualmente no navegador em modo celular, claro e escuro: botão de adicionar casa, logo nas telas Login, Aguardando, Cartões (topo e estado vazio), Quadra vazia e Instalar. Relatar o resultado real de cada comando e o que não foi verificado (teste em celular real é do usuário; o deploy das regras novas com `npm run deploy:regras` também é do usuário).
- [ ] **Step 5: Commit** — `git commit -m "test: semente e e2e para rodadas e fechamento manual"`
