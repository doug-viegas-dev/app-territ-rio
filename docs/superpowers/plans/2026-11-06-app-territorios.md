# App de Territórios — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA em que publicadores de uma congregação registram casas por quadra/cartão e o histórico de visitas, com ciclos, offline e dentro da cota gratuita do Firebase.

**Architecture:** React + Vite + TypeScript. Regras de negócio como funções puras em `src/domain/` (sem Firebase). Todo acesso ao SDK fica em `src/firebase/`. Firestore com cache persistente cuida do offline; `vite-plugin-pwa` cuida do app shell e da imagem do cartão.

**Tech Stack:** React 18, Vite, TypeScript, react-router-dom, firebase (Auth, Firestore, Storage, Hosting), vite-plugin-pwa, pdfjs-dist, @dnd-kit/sortable, Vitest + Testing Library, @firebase/rules-unit-testing, Firebase Emulator Suite, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-app-territorios-design.md`

## Global Constraints

- Rótulos de status na interface (identidade visual em `design/identidade/README.md`): `falado` → "Conversado", `sem_resposta` → "Não atendeu", `estudo` → "Estudo", `nao_visitar` → "Não visitar", `pendente` → "Pendente". Os valores internos não mudam. Cada status usa cor + forma + nome (círculo com visto, quadrado com relógio, losango com livro, octógono com traço). Os rótulos ficam em `src/domain/rotulos.ts` (`rotuloStatus(s: Status): string`, criado na Tarefa 2).
- Tema: cores, fonte (Nunito Sans) e regras de contraste de `design/identidade/README.md` viram variáveis CSS na Tarefa 8; âmbar nunca como cor de texto.
- Nome do app: "Meu Território" (nome curto no ícone: "Território").
- Interface e textos em português do Brasil; identificadores de domínio em português (`casa`, `quadra`, `cartao`, `ciclo`), como no spec.
- Status válidos: `pendente`, `sem_resposta`, `falado`, `estudo`, `nao_visitar`. Resolvida = `falado`, `estudo` ou `nao_visitar`.
- Papéis: `admin` e `publicador`. Login só com Google; entra quem tem `members/{email}` com `ativo == true`.
- `numero` da casa é opcional e **pode repetir** na mesma rua; sem `numero`, `descricao` é obrigatória.
- Ordem das casas = campo `ordem` (número decimal) por rua; nunca ordenar pelo número da casa.
- Sem Cloud Functions. Sem mapa embutido: só link "Abrir no Google Maps".
- Cota: lista inicial lê só `cards`; casas só ao abrir a quadra; `visits` só ao abrir a casa.
- `ciclo` nunca decresce. Visitas são sempre novos documentos.
- Alvos de toque ≥ 48px; registrar visita = um toque.
- Todo acesso a `firebase/*` fora de `src/firebase/` é proibido (teste de lint na Task 1).
- **Referência visual:** o protótipo aprovado em `design/prototipo/` (abrir `index.html`) define layout, textos e estados de cada tela; a tabela abaixo diz qual arquivo cada tarefa reproduz. Copiar os tokens e componentes de `design/prototipo/css/app.css` para `src/app/styles.css` (Task 8). Não usar `js/app.js` do protótipo (é só para demonstração). Cada tela implementa os estados do protótipo (vazio, carregando, sem internet, erro, cartão fechado).
- Tema: o app segue `prefers-color-scheme` (claro/escuro), sem chave manual. Fonte Nunito Sans **hospedada no app** (`@fontsource/nunito-sans`, pesos 400, 500, 600), para funcionar offline. Pesos: texto 400, rótulos e botões 500, títulos 600; nunca 700.
- **Abertura de cartão:** cartão novo nasce `fechado`; só admin abre (com confirmação "Fica registrado que foi você, …"), e cada abertura ou fechamento grava um evento em `cards/{c}/eventos` no mesmo batch. Visitas e cadastro de casas só em cartão aberto, travado **na interface** (não nas regras, para não perder visita feita offline).
- **Ruas:** qualquer publicador acrescenta rua a uma quadra (chip "Nova rua"); só acrescenta, nunca remove.
- Tom dos textos: calmo, curto, respeitoso, sem gíria e sem exclamações; copiar os textos do protótipo.

| Tarefa | Protótipo a reproduzir (`design/prototipo/`) |
|---|---|
| 4 | `01-entrar.html`, `02-aguardando.html` |
| 8 | `03-cartoes.html`, `componentes.html`, `css/app.css` |
| 9 | `04-cartao.html` |
| 10 | `05-quadra.html` |
| 11 | `06-nova-casa.html` |
| 12 | `07-reordenar.html` |
| 13 | `08-casa.html` |
| 14, 15 | `09-admin.html` |
| 15b | `11-historico.html` |
| 16 | `10-instalar.html` e o aviso de `03-cartoes.html` |

## Review Focus

1. Cartão com 0 casas não pode "fechar automaticamente" (`resolvidas == total == 0`). → Task 3.
2. Casa sem número e sem descrição deve ser recusada; número repetido deve ser aceito sem erro. → Task 2.
3. Duas casas inseridas offline no mesmo ponto recebem a mesma `ordem`; nenhuma pode sumir e a ordem exibida deve ser estável. → Task 2.
4. Usuário que logou com Google mas não está em `members` (ou está `ativo: false`) não lê nem escreve nada. → Task 5.
5. PDF com mais de uma página ou muito grande: usar a primeira página, avisar o admin e limitar a imagem (largura máx. 1600px). → Task 14.
6. Publicador nunca abre cartão e só consegue **acrescentar** ruas em `blocks`; `eventos` só o admin lê. → Task 5.
7. Visita registrada offline num cartão que foi fechado enquanto isso não pode ser perdida: as regras não bloqueiam visita em cartão fechado; só a interface. → Tasks 5 e 7.
8. Todo evento de abertura/fechamento grava o evento no mesmo batch da mudança de `estado`, com o nome de quem fez (no fechamento automático, quem registrou a última casa). → Tasks 6 e 7.

---

### Task 1: Scaffold do projeto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `vitest.config.ts`, `.gitignore`, `eslint.config.js`
- Test: `src/app/App.test.tsx`, `tests/arquitetura.test.ts`

**Interfaces:**
- Produces: scripts `npm run dev | build | test | lint`; alias de import `@/` → `src/`.

- [ ] **Step 1:** `git init` na raiz do projeto; criar app Vite React-TS (template `react-ts`) na raiz; instalar `react-router-dom`, `firebase`, `vite-plugin-pwa`, `@dnd-kit/core`, `@dnd-kit/sortable`, `pdfjs-dist`, e como dev `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@firebase/rules-unit-testing`, `firebase-tools`, `@playwright/test`.
- [ ] **Step 2: Write the failing test** `tests/arquitetura.test.ts`: varre `src/**/*.{ts,tsx}` fora de `src/firebase/` e `*.test.*`; `expect(arquivosQueImportamFirebase).toEqual([])` para imports de `"firebase/..."`.
- [ ] **Step 3:** Test `App.test.tsx`: renderizar `<App />` mostra o texto "Meu Território".
- [ ] **Step 4:** Run `npm test` — Expected: FAIL (App ainda não existe como esperado).
- [ ] **Step 5:** Implementar `App` mínimo (título "Meu Território"); configurar Vitest (jsdom, setup com `@testing-library/jest-dom`) e alias `@/`.
- [ ] **Step 6:** Run `npm test && npm run build` — Expected: PASS e build sem erros.
- [ ] **Step 7: Commit** `chore: scaffold vite react ts`.

### Task 2: Domínio — tipos, status, ordem e validação de casa

**Files:**
- Create: `src/domain/types.ts`, `src/domain/status.ts`, `src/domain/ordem.ts`, `src/domain/casa.ts`
- Test: `src/domain/status.test.ts`, `src/domain/ordem.test.ts`, `src/domain/casa.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  `type Status = 'pendente'|'sem_resposta'|'falado'|'estudo'|'nao_visitar'`
  `type Casa = { id: string; rua: string; numero?: string; descricao?: string; ordem: number; status: Status; ultimaVisitaEm?: number; ultimoPor?: string; criadoEm: number }`
  `type Cartao = { id: string; numero: string; titulo: string; mapsUrl?: string; imagemPath?: string; pdfPath?: string; estado: 'aberto'|'fechado'; ciclo: number; totalCasas: number; resolvidas: number; atualizadoEm: number; abertoPorNome?: string; abertoEm?: number }`
  `type Quadra = { id: string; rotulo: string; ruas: string[]; ordem: number }`
  `type Visita = { id: string; status: Status; em: number; porUid: string; porNome: string; ciclo: number; obs?: string }`
  `type Papel = 'admin'|'publicador'`
  `type EventoCartao = { id: string; tipo: 'aberto'|'fechado'; motivo: 'criacao'|'abertura'|'fechamento_manual'|'fechamento_automatico'|'reinicio'; em: number; porUid: string; porNome: string }`
- Produces (`rotulos.ts`): `rotuloStatus(s: Status): string` ("Conversado", "Não atendeu", "Estudo", "Não visitar", "Pendente"); teste em `src/domain/rotulos.test.ts` cobrindo os cinco valores.
- Produces (`status.ts`): `isResolvida(s: Status): boolean`; `deltaResolvidas(antes: Status, depois: Status): -1|0|1`
- Produces (`ordem.ts`): `ordemFim(ordens: number[]): number` (máx+1; `1` se vazio); `ordemEntre(antes: number|null, depois: number|null): number`; `precisaRenumerar(a: number, b: number): boolean` (`b - a < 1e-6`); `ordenarCasas(casas: Casa[]): Casa[]` (por `ordem`, desempate por `criadoEm`, depois `id`; não muta a entrada)
- Produces (`casa.ts`): `validarCasa(d: { numero?: string; descricao?: string }): string | null` (mensagem de erro ou `null`)

- [ ] **Step 1: Write failing tests** — `deltaResolvidas('pendente','falado') === 1`, `('falado','sem_resposta') === -1`, `('falado','estudo') === 0`; `ordemFim([]) === 1`, `ordemFim([1,3]) === 4`; `ordemEntre(1,2) === 1.5`, `ordemEntre(null,2) < 2`, `ordemEntre(3,null) > 3`, `ordemEntre(null,null) === 1`; `ordenarCasas` com duas casas de `ordem` igual e `criadoEm` diferentes devolve a mais antiga primeiro e é estável entre chamadas; `validarCasa({})` e `validarCasa({numero:'  ', descricao:''})` retornam mensagem; `validarCasa({numero:'120'}) === null`; `validarCasa({descricao:'portão azul'}) === null`; duas casas com `numero:'120'` na mesma rua **não** produzem erro (a função não conhece vizinhas).
- [ ] **Step 2:** Run `npx vitest run src/domain` — Expected: FAIL (módulos inexistentes).
- [ ] **Step 3:** Implementar as funções acima conforme as assinaturas.
- [ ] **Step 4:** Run `npx vitest run src/domain` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(domain): status, ordem e validação de casa`.

### Task 3: Domínio — faixa numérica e regras de ciclo

**Files:**
- Create: `src/domain/faixa.ts`, `src/domain/ciclo.ts`
- Test: `src/domain/faixa.test.ts`, `src/domain/ciclo.test.ts`

**Interfaces:**
- Consumes: `Casa`, `Cartao`, `Status`, `isResolvida` (Task 2).
- Produces (`faixa.ts`): `gerarFaixa(inicio: number, fim: number, paridade: 'todos'|'pares'|'impares'): string[]` (crescente; vazia se `inicio > fim`; limite de 200 itens, excedendo lança `Error('Faixa grande demais')`)
- Produces (`ciclo.ts`):
  `deveFecharAuto(c: Pick<Cartao,'estado'|'totalCasas'|'resolvidas'>): boolean` — `true` só se `estado==='aberto' && totalCasas > 0 && resolvidas === totalCasas`
  `fecharCartao(c: Cartao): Pick<Cartao,'estado'|'ciclo'>` → `{estado:'fechado', ciclo: c.ciclo + 1}`
  `abrirCartao(c: Cartao): Pick<Cartao,'estado'|'ciclo'>` → `{estado:'aberto', ciclo: c.ciclo}`
  `podeRegistrar(c: Pick<Cartao,'estado'>): boolean` — `true` só se `estado === 'aberto'` (usado pela interface para desativar botões e o cadastro)
  `listaDeTrabalho(casas: Casa[]): { pendentes: Casa[]; destacadas: Casa[] }` — `pendentes` = `pendente`/`sem_resposta`; `destacadas` = `estudo`/`nao_visitar`; `falado` não aparece; ambas ordenadas por `ordenarCasas`
  `idsParaReiniciar(casas: Casa[]): string[]` — ids das casas com status diferente de `nao_visitar` e `pendente`

- [ ] **Step 1: Write failing tests** — `gerarFaixa(100,106,'pares')` → `['100','102','104','106']`; `'impares'` de 100 a 106 → `['101','103','105']`; `gerarFaixa(5,1,'todos')` → `[]`; faixa de 500 itens lança erro; `deveFecharAuto({estado:'aberto',totalCasas:0,resolvidas:0}) === false` (Review Focus 1); `{aberto,3,3} === true`; `{fechado,3,3} === false`; `fecharCartao` incrementa ciclo; `abrirCartao` mantém ciclo (ex.: ciclo 2 → 2); `podeRegistrar` é `true` com cartão aberto e `false` com fechado; `listaDeTrabalho` exclui `falado` e separa destacadas; `idsParaReiniciar` mantém de fora `nao_visitar` e `pendente`.
- [ ] **Step 2:** Run `npx vitest run src/domain` — Expected: FAIL.
- [ ] **Step 3:** Implementar conforme assinaturas.
- [ ] **Step 4:** Run `npx vitest run src/domain` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(domain): faixa e regras de ciclo`.

### Task 4: Firebase init, emulador e login com gate de membros

**Files:**
- Create: `firebase.json`, `.firebaserc`, `src/firebase/app.ts`, `src/firebase/auth.ts`, `src/firebase/members.ts`, `src/features/auth/AuthProvider.tsx`, `src/features/auth/LoginPage.tsx`, `src/features/auth/AguardandoLiberacao.tsx`, `.env.example`
- Test: `src/features/auth/AuthProvider.test.tsx`

**Interfaces:**
- Produces (`app.ts`): `db` (Firestore com `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`), `auth`, `storage`; conecta aos emuladores quando `import.meta.env.VITE_USE_EMULATORS === 'true'`.
- Produces (`auth.ts`): `entrarComGoogle(): Promise<void>`, `sair(): Promise<void>`, `observarUsuario(cb: (u: {uid:string; email:string; nome:string} | null) => void): () => void` (nome cai para o e-mail se `displayName` vier vazio).
- Produces (`members.ts`): `observarMembro(email: string, cb: (m: {papel: Papel; ativo: boolean; nome: string} | null) => void): () => void`
- Produces (`AuthProvider`): hook `useSessao(): { carregando: boolean; usuario: Usuario|null; membro: Membro|null }`; componente `<RequerMembro papel?: Papel>` que renderiza filhos só se `membro?.ativo`, senão `LoginPage` (sem usuário) ou `AguardandoLiberacao` (usuário sem membro/inativo).

- [ ] **Step 1: Write the failing test** — com `observarUsuario`/`observarMembro` mockados: sem usuário → botão "Entrar com Google"; usuário sem membro → texto "Aguardando liberação"; membro `ativo:false` → "Aguardando liberação"; membro ativo → renderiza o filho; `<RequerMembro papel="admin">` com membro `publicador` → não renderiza o filho.
- [ ] **Step 2:** Run `npx vitest run src/features/auth` — Expected: FAIL.
- [ ] **Step 3:** Criar projeto Firebase (console), habilitar Auth Google, Firestore e Storage (plano Blaze); preencher `.env` a partir de `.env.example`; implementar os módulos e componentes acima. `firebase.json` define emuladores (auth 9099, firestore 8080, storage 9199, hosting) e rewrite SPA `** → /index.html`. `LoginPage` e `AguardandoLiberacao` seguem `design/prototipo/01-entrar.html` e `02-aguardando.html`: o botão "Entrar com Google" usa o logotipo "G" oficial conforme as diretrizes de marca do Google (o protótipo está sem ele); `AguardandoLiberacao` mostra o e-mail do usuário e os botões "Verificar de novo" e "Sair".
- [ ] **Step 4:** Run `npx vitest run src/features/auth` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(auth): login google com gate de membros`.

### Task 5: Regras de segurança (Firestore e Storage) com testes

**Files:**
- Create: `firestore.rules`, `storage.rules`
- Test: `tests/rules/firestore.rules.test.ts`, `tests/rules/storage.rules.test.ts`

**Interfaces:**
- Consumes: formato de dados do spec §4.
- Produces: regras que implementam spec §9. Helper `ehMembro()` = `get(/members/{token.email})` existe, `ativo == true`, `token.email_verified`. `ehAdmin()` = membro com `papel == 'admin'`.
  - `members`: leitura do próprio doc por membro; escrita só admin.
  - `cards`, `blocks`: leitura membros; escrita admin, **exceto** que publicador pode atualizar em `cards` apenas as chaves `resolvidas`, `totalCasas`, `estado`, `ciclo`, `atualizadoEm` (`request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`), **e `estado` só pode ficar igual ou passar a `'fechado'`** (publicador nunca abre); em `blocks` o publicador pode atualizar apenas a chave `ruas`, e só acrescentando (`resource.data.ruas.toSet().difference(request.resource.data.ruas.toSet()).size() == 0`).
  - `cards/{c}/eventos`: leitura só admin; criação pelo admin, ou pelo publicador apenas com `tipo == 'fechado'`, `motivo == 'fechamento_automatico'` e `porUid == request.auth.uid`; ninguém atualiza nem apaga.
  - **Não** bloquear `visits` nem `houses` por `estado` do cartão (decisão: não perder visita offline).
  - `houses`: membros criam/atualizam; só admin apaga. `visits`: membros criam; ninguém atualiza ou apaga; `porUid == request.auth.uid`.
  - Storage `cards/**`: leitura membros, escrita admin.

- [ ] **Step 1: Write failing tests** (rodando com `firebase emulators:exec` + `@firebase/rules-unit-testing`) — usuário não autenticado não lê `cards`; usuário autenticado sem doc em `members` não lê (Review Focus 4); membro `ativo:false` não lê nem escreve; publicador lê `cards`, cria `houses` e `visits`, atualiza `resolvidas` do cartão; publicador **não** altera `titulo` do cartão, não cria `cards`, não escreve `members`, não apaga `houses`, não altera `visits` existentes; admin faz tudo isso; `visits` com `porUid` de outro usuário é recusada; storage: publicador lê imagem e não escreve; publicador não consegue pôr `estado: 'aberto'` num cartão (Review Focus 6) mas consegue pôr `'fechado'` junto do evento `fechamento_automatico`; publicador acrescenta uma rua em `blocks` (só `ruas`) mas não remove rua nem altera `rotulo`/`ordem`; `eventos`: publicador não lê e só cria o de fechamento automático com o próprio `porUid`, ninguém edita ou apaga, admin lê e cria; `visits` e `houses` continuam aceitas com cartão `fechado` (Review Focus 7).
- [ ] **Step 2:** Run `npx firebase emulators:exec --only firestore,storage "npx vitest run tests/rules"` — Expected: FAIL.
- [ ] **Step 3:** Escrever `firestore.rules` e `storage.rules` conforme acima (requer Java instalado para os emuladores).
- [ ] **Step 4:** Mesmo comando — Expected: PASS.
- [ ] **Step 5: Commit** `feat(security): regras firestore e storage`.

### Task 6: Camada de dados — cartões e quadras

**Files:**
- Create: `src/firebase/cards.ts`, `src/firebase/blocks.ts`, `src/firebase/converters.ts`
- Test: `tests/data/cards.test.ts` (contra emulador)

**Interfaces:**
- Consumes: tipos da Task 2, `fecharCartao`/`abrirCartao` (Task 3).
- Produces (`cards.ts`):
  `observarCartoes(cb: (c: Cartao[]) => void): () => void` — ordena em memória: abertos primeiro (por `numero`), depois fechados;
  `observarCartao(id: string, cb: (c: Cartao|null) => void): () => void`;
  `criarCartao(d: {numero: string; titulo: string; mapsUrl?: string}, usuario: {uid: string; nome: string}): Promise<string>` (nasce `fechado`, `ciclo: 1`, contadores 0; no mesmo batch grava o evento `{tipo:'fechado', motivo:'criacao'}`);
  `atualizarCartao(id: string, d: Partial<Pick<Cartao,'numero'|'titulo'|'mapsUrl'|'imagemPath'|'pdfPath'>>): Promise<void>`;
  `fecharCartaoManual(c: Cartao, usuario: {uid: string; nome: string}): Promise<void>` e `abrirCartaoManual(c: Cartao, usuario): Promise<void>`: cada um grava `estado`/`ciclo` **absolutos**, `atualizadoEm` e o evento (`fechamento_manual` / `abertura`) no mesmo batch; `abrirCartaoManual` grava também `abertoPorNome` e `abertoEm`;
  `observarEventos(cartaoId: string, cb: (e: EventoCartao[]) => void): () => void` — os 10 mais recentes (`orderBy('em','desc')`, `limit(10)`); só admin lê.
- Produces (`blocks.ts`): `observarQuadras(cartaoId: string, cb: (q: Quadra[]) => void): () => void`; `criarQuadra(cartaoId: string, d: {rotulo: string; ruas: string[]}): Promise<string>`; `atualizarQuadra(cartaoId: string, id: string, d: Partial<Pick<Quadra,'rotulo'|'ruas'|'ordem'>>): Promise<void>`; `adicionarRua(cartaoId: string, quadraId: string, rua: string): Promise<void>` — corta espaços; ignora nome vazio ou já existente (sem diferenciar maiúsculas); usa `arrayUnion` para só acrescentar (qualquer membro).
- `converters.ts` converte `Timestamp` ↔ `number` (ms) para que o domínio nunca veja tipos do SDK.

- [ ] **Step 1: Write failing tests** — criar cartão e observar: vem `fechado`, `ciclo 1`, com um evento `criacao`; `observarCartoes` entrega abertos antes de fechados; `abrirCartaoManual` deixa `aberto` sem mudar `ciclo`, grava `abertoPorNome`/`abertoEm` e um evento `abertura` com o nome de quem abriu; `fecharCartaoManual` deixa `fechado`, `ciclo` +1 e evento `fechamento_manual`; `observarEventos` devolve no máximo 10, do mais novo para o mais antigo (criar 12 eventos e conferir); criar quadra com ruas e observar; `adicionarRua` acrescenta, ignora vazia e repetida (`"rua das acácias"` vs `"Rua das Acácias"`) e não remove as existentes.
- [ ] **Step 2:** Run `npx firebase emulators:exec --only firestore "npx vitest run tests/data/cards.test.ts"` — Expected: FAIL.
- [ ] **Step 3:** Implementar com `onSnapshot`; autenticar o teste como admin pelo emulador de Auth.
- [ ] **Step 4:** Mesmo comando — Expected: PASS.
- [ ] **Step 5: Commit** `feat(data): cartões e quadras`.

### Task 7: Camada de dados — casas, visitas, ordem e reinício

**Files:**
- Create: `src/firebase/houses.ts`
- Test: `tests/data/houses.test.ts` (emulador)

**Interfaces:**
- Consumes: `deltaResolvidas`, `deveFecharAuto`, `fecharCartao`, `abrirCartao`, `podeRegistrar`, `idsParaReiniciar`, `ordemFim`, `ordemEntre`, `precisaRenumerar`, `ordenarCasas`, `validarCasa`.
- Produces:
  `observarCasas(cartaoId, quadraId, cb: (c: Casa[]) => void): () => void` (já ordenadas por `ordenarCasas`);
  `observarVisitas(cartaoId, quadraId, casaId, cb: (v: Visita[]) => void): () => void` (mais recente primeiro);
  `criarCasa(cartaoId, quadraId, d: {rua: string; numero?: string; descricao?: string; depoisDe?: string}, existentes: Casa[]): Promise<string>` — valida com `validarCasa`; sem `depoisDe` usa `ordemFim` das casas da mesma rua; com `depoisDe` usa `ordemEntre(ordemDela, ordemDaSeguinteNaMesmaRua)`; batch: cria a casa e `increment(1)` em `totalCasas` do cartão;
  `criarCasasEmFaixa(cartaoId, quadraId, d: {rua: string; numeros: string[]}, existentes: Casa[]): Promise<void>` — um batch, `ordem` crescente, `totalCasas` += n;
  `moverCasa(cartaoId, quadraId, casaId, destino: {rua: string; antes: Casa|null; depois: Casa|null}, ruaCasas: Casa[]): Promise<void>` — grava só a casa movida; se `precisaRenumerar(antes.ordem, depois.ordem)`, renumera a rua inteira (1..n) no mesmo batch;
  `editarCasa(cartaoId, quadraId, casaId, d: {numero?: string; descricao?: string}): Promise<void>` (revalida);
  `registrarVisita(a: { cartao: Cartao; quadraId: string; casa: Casa; novoStatus: Status; obs?: string; usuario: {uid: string; nome: string} }): Promise<void>` — um batch: novo doc em `visits` (com `ciclo: cartao.ciclo`), atualiza `status`/`ultimaVisitaEm`/`ultimoPor` da casa, `increment(deltaResolvidas)` em `resolvidas` do cartão e `atualizadoEm`; se `deveFecharAuto` com os valores já somados, inclui no batch `estado`/`ciclo` **absolutos** de `fecharCartao` (idempotente entre aparelhos) e o evento `{tipo:'fechado', motivo:'fechamento_automatico', porUid, porNome}` com o usuário que registrou; **lança `Error('Cartão fechado')` e não grava nada se `!podeRegistrar(cartao)`** (a interface já desativa os botões; isto é a segunda barreira, só com o cache local);
  `reiniciarCartao(cartao: Cartao, casas: Casa[], usuario: {uid: string; nome: string}): Promise<void>` — batches de ≤ 400: casas de `idsParaReiniciar` voltam a `pendente`; cartão `aberto`, `resolvidas` = nº de `nao_visitar`, `abertoPorNome`/`abertoEm` do admin e evento `{tipo:'aberto', motivo:'reinicio'}` (no último batch);
  `recalcularContadores(cartaoId: string): Promise<void>` — lê todas as casas do cartão e regrava `totalCasas`/`resolvidas`.

- [ ] **Step 1: Write failing tests** — (a) `criarCasa` sem número e sem descrição rejeita; duas casas `numero:'120'` na mesma rua são aceitas; `totalCasas` do cartão sobe; (b) casas novas entram no fim da rua; `depoisDe` insere entre vizinhas; (c) `criarCasasEmFaixa` cria na ordem crescente; (d) `moverCasa` altera só o doc movido (verificar por `ordem` das outras inalteradas) e mover para outra rua altera `rua`; com vizinhas a 1e-7 de distância renumera 1..n (Review Focus 3: duas casas com `ordem` igual permanecem visíveis e estáveis); (e) `registrarVisita` cria visita com `ciclo` do cartão, atualiza a casa e `resolvidas` (+1 ao ir de `pendente` a `falado`, 0 de `falado` a `estudo`, −1 de `falado` a `sem_resposta`); registrar a última casa pendente fecha o cartão com `ciclo` +1; cartão com 1 casa `sem_resposta` não fecha; (e2) `registrarVisita` em cartão `fechado` lança erro e não cria visita nem muda contador; o fechamento automático cria o evento `fechamento_automatico` com o nome de quem registrou a última casa (Review Focus 8); (f) `reiniciarCartao` mantém `nao_visitar`, zera o resto, deixa cartão `aberto` com `resolvidas` correto e grava o evento `reinicio` com o nome do admin; (g) `recalcularContadores` corrige contadores adulterados.
- [ ] **Step 2:** Run `npx firebase emulators:exec --only firestore "npx vitest run tests/data/houses.test.ts"` — Expected: FAIL.
- [ ] **Step 3:** Implementar com `writeBatch`; usar `increment()` para contadores e valores absolutos para `estado`/`ciclo`.
- [ ] **Step 4:** Mesmo comando — Expected: PASS.
- [ ] **Step 5: Commit** `feat(data): casas, visitas, ordem e reinício`.

### Task 8: Shell do app, roteamento e lista de cartões

**Files:**
- Create: `src/app/routes.tsx`, `src/app/Layout.tsx`, `src/app/styles.css`, `src/features/cards/useCartoes.ts`, `src/features/cards/CartoesPage.tsx`, `src/features/cards/CartaoResumo.tsx`
- Modify: `src/app/App.tsx`, `src/main.tsx`
- Test: `src/features/cards/CartoesPage.test.tsx`

**Interfaces:**
- Consumes: `observarCartoes`, `RequerMembro`, `useSessao`.
- Produces: rotas `/` (cartões), `/cartao/:cartaoId`, `/cartao/:cartaoId/quadra/:quadraId`, `/cartao/:cartaoId/quadra/:quadraId/casa/:casaId`, `/admin`; `Layout` com cabeçalho e navegação inferior de 2 itens, "Cartões" e "Administração" (este só para admin), como em `design/prototipo/03-cartoes.html`; indicador de conexão (`useOnline(): boolean`): só o ícone de nuvem quando sincronizado, ícone e palavra em "Sem internet", "Sincronizando" e "Não enviado", e a faixa "Sem internet — suas anotações serão enviadas depois."

- [ ] **Step 1: Write the failing test** — com `observarCartoes` mockado: mostra seções "Em andamento" e "Fechados" nessa ordem; cada cartão exibe "12/30" (`resolvidas/totalCasas`) e navega para `/cartao/:id`; cartão com `totalCasas: 0` mostra "0/0" sem dividir por zero na barra de progresso; lista vazia mostra "Nenhum cartão ainda"; com `useOnline` falso aparece "Sem internet — suas anotações serão enviadas depois."; carregando mostra o esqueleto, sem texto de erro.
- [ ] **Step 2:** Run `npx vitest run src/features/cards` — Expected: FAIL.
- [ ] **Step 3:** Instalar `@fontsource/nunito-sans` (importar 400, 500, 600); copiar de `design/prototipo/css/app.css` os tokens (`:root` claro e escuro, este via `@media (prefers-color-scheme: dark)`) e os componentes usados até aqui para `src/app/styles.css`; copiar o conjunto de ícones SVG de `design/prototipo/js/app.js` (símbolos `i-*`) para `src/app/icones.tsx`; implementar rotas, layout mobile-first (CSS puro, alvos ≥ 48px) e a página conforme `03-cartoes.html`. **Acertos nas telas da Task 4:** (a) mover os estilos locais de `LoginPage.tsx` (`EstilosAuth`, cores fixas) para `src/app/styles.css` usando as variáveis do tema, e remover o `<style>` injetado; (b) copiar `design/identidade/icone.svg` para `src/assets/` e importar de lá (não importar de `design/`); (c) `RequerMembro papel="admin"` com membro **ativo** que não é admin deve mostrar "Só para administradores" (como `design/prototipo/09-admin.html?v=sem-acesso`), não "Aguardando liberação"; "Aguardando liberação" fica só para quem não está em `members` ou está inativo; (d) mostrar o esqueleto, e não uma tela em branco, enquanto `carregando`.
- [ ] **Step 4:** Run `npx vitest run src/features/cards` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): shell e lista de cartões`.

### Task 9: Tela do cartão (imagem, link do Maps, quadras)

**Files:**
- Create: `src/firebase/storage.ts`, `src/features/cards/CartaoPage.tsx`, `src/features/cards/ImagemCartao.tsx`
- Test: `src/features/cards/CartaoPage.test.tsx`

**Interfaces:**
- Consumes: `observarCartao`, `observarQuadras`, `abrirCartaoManual`, `useSessao`.
- Produces: `urlDaImagem(path: string): Promise<string>` em `storage.ts`; `ImagemCartao` com toque para ampliar (tela cheia com zoom por pinça nativo do navegador).

- [ ] **Step 1: Write the failing test** — mostra título e número; link "Abrir no Google Maps" com `href=mapsUrl` e `target="_blank"` só quando `mapsUrl` existe; lista as quadras com rótulo; clicar na quadra navega; cartão fechado mostra o aviso "Cartão fechado"; o **admin** vê o botão "Abrir cartão", que abre uma folha de confirmação ("Fica registrado que foi você, {nome}, em {data} às {hora}.") e, ao confirmar, chama `abrirCartaoManual` com o usuário; o **publicador** vê "Para registrar visitas, um administrador precisa abrir o cartão. Peça a um deles." e nenhum botão; cartão aberto mostra "Aberto por {abertoPorNome} em {data}"; cartão sem quadras mostra "Nenhuma quadra ainda".
- [ ] **Step 2:** Run `npx vitest run src/features/cards/CartaoPage.test.tsx` — Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Mesmo comando — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): tela do cartão`.

### Task 10: Tela da quadra e registro de visita com um toque

**Files:**
- Create: `src/features/houses/useCasas.ts`, `src/features/houses/QuadraPage.tsx`, `src/features/houses/CasaLinha.tsx`, `src/features/houses/rotuloCasa.ts`
- Test: `src/features/houses/rotuloCasa.test.ts`, `src/features/houses/QuadraPage.test.tsx`

**Interfaces:**
- Consumes: `observarCasas`, `registrarVisita`, `listaDeTrabalho`, `useSessao`.
- Produces: `rotuloCasa(c: Pick<Casa,'numero'|'descricao'>): string` → `"120 · portão azul"`, `"120"`, ou `"portão azul"`; `QuadraPage` mostra casas **na ordem de `ordem`, agrupadas por rua**, com alternância "Trabalho" (pendentes + destacadas) / "Todas". Layout da direção escolhida (`design/prototipo/05-quadra.html`): lista de leitura, casa em foco com contorno e **barra fixa na base** com os 4 botões em grade 2×2 e o link "Detalhes"; após registrar, o foco passa para a próxima casa da lista de trabalho; casa pendente mostra só o círculo tracejado (a palavra "Pendente" fica só para leitor de tela); botão flutuante "+ casa" e botão "Reordenar".

- [ ] **Step 1: Write failing tests** — `rotuloCasa` nos três formatos; `QuadraPage`: casas aparecem na ordem recebida dentro da rua (uma casa `numero:'200'` com `ordem` menor aparece antes de `'100'`); no modo "Trabalho" casas `falado` não aparecem e `estudo`/`nao_visitar` aparecem em seção "Atenção"; tocar em "Conversado" chama `registrarVisita` uma vez com `novoStatus:'falado'` e os dados do usuário; cada botão tem altura ≥ 48px (estilo inline/classe verificada); duas casas com o mesmo número aparecem as duas; com cartão `fechado` os 4 botões ficam desativados (`aria-disabled`), `registrarVisita` não é chamado, o botão "+ casa" some e aparece o aviso "Cartão fechado" (admin com o link "Abrir cartão", publicador com "Só um administrador pode abrir o cartão. Peça a um deles."); após registrar, o foco vai para a próxima casa; quadra sem casas mostra "Nenhuma casa nesta quadra" e o botão "Cadastrar a primeira casa"; erro de envio mostra "A última anotação não foi enviada" com "Tentar de novo".
- [ ] **Step 2:** Run `npx vitest run src/features/houses` — Expected: FAIL.
- [ ] **Step 3:** Implementar; botões: Conversado, Não atendeu, Estudo, Não visitar (rótulos de `src/domain/rotulos.ts`, ver Global Constraints); o botão do status atual aparece marcado; erro de escrita mostra aviso sem travar a tela (escritas offline não rejeitam, ficam na fila).
- [ ] **Step 4:** Run `npx vitest run src/features/houses` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): quadra e registro de visita`.

### Task 11: Cadastro rápido de casas

**Files:**
- Create: `src/features/houses/NovaCasaSheet.tsx`, `src/features/houses/FaixaForm.tsx`
- Modify: `src/features/houses/QuadraPage.tsx`, `src/features/houses/CasaLinha.tsx`
- Test: `src/features/houses/NovaCasaSheet.test.tsx`

**Interfaces:**
- Consumes: `criarCasa`, `criarCasasEmFaixa`, `adicionarRua`, `validarCasa`, `gerarFaixa`, `Quadra.ruas`.
- Produces: `NovaCasaSheet({ quadra, casas, cartaoId, depoisDe?: Casa, onFechar })` — chips das ruas, chip tracejado "+ Nova rua" (abre uma folha "Nome da rua" que chama `adicionarRua`; qualquer publicador), campo número, campo descrição, botão "Salvar e adicionar outra"; `FaixaForm` com início, fim e paridade; "Adicionar depois desta" na `CasaLinha` abre o sheet com `depoisDe`.

- [ ] **Step 1: Write failing tests** — salvar sem número e sem descrição mostra o erro de `validarCasa` e não chama `criarCasa`; só descrição → chama `criarCasa`; número já existente na rua mostra aviso "já existe um 120 nesta rua" mas **ainda salva**; após salvar, o sheet permanece aberto com a rua mantida e campos limpos; `FaixaForm` 100–106 pares chama `criarCasasEmFaixa` com `['100','102','104','106']`; "Adicionar depois desta" envia `depoisDe`; o chip "Nova rua" abre a folha e salvar chama `adicionarRua` com o nome sem espaços nas pontas, a rua nova vira chip e fica selecionada; nome vazio ou repetido (sem diferenciar maiúsculas) não chama `adicionarRua`.
- [ ] **Step 2:** Run `npx vitest run src/features/houses/NovaCasaSheet.test.tsx` — Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Mesmo comando — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): cadastro rápido de casas`.

### Task 12: Reordenar casas

**Files:**
- Create: `src/features/houses/ReordenarLista.tsx`, `src/features/houses/destinoDoMovimento.ts`
- Modify: `src/features/houses/QuadraPage.tsx`
- Test: `src/features/houses/destinoDoMovimento.test.ts`, `src/features/houses/ReordenarLista.test.tsx`

**Interfaces:**
- Consumes: `moverCasa`, `Casa`.
- Produces: `destinoDoMovimento(ruaCasas: Casa[], casaId: string, novoIndice: number): { antes: Casa|null; depois: Casa|null }` (vizinhas **após remover** a casa movida da lista); `ReordenarLista` com alça de arrastar (`@dnd-kit/sortable`) e botões "Subir"/"Descer"; modo ativado por botão "Reordenar" na quadra (fora dele não há arrastar).

- [ ] **Step 1: Write failing tests** — `destinoDoMovimento([a,b,c], 'a', 2)` → `{antes: c, depois: null}`; mover `c` para o índice 0 → `{antes: null, depois: a}`; mover `a` para o índice 1 de `[a,b,c]` → `{antes: b, depois: c}`; `ReordenarLista`: clicar em "Descer" na primeira casa chama `moverCasa` com `antes` = a segunda e `depois` = a terceira; "Subir" na primeira casa está desabilitado; fora do modo reordenar não existe alça.
- [ ] **Step 2:** Run `npx vitest run src/features/houses` — Expected: FAIL nos novos testes.
- [ ] **Step 3:** Implementar; mover entre ruas da mesma quadra via botão "Mover para outra rua" (chips de rua) que põe a casa no fim da rua escolhida.
- [ ] **Step 4:** Run `npx vitest run src/features/houses` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): reordenar casas`.

### Task 13: Tela da casa com histórico e observação

**Files:**
- Create: `src/features/houses/CasaPage.tsx`, `src/features/houses/HistoricoVisitas.tsx`
- Test: `src/features/houses/CasaPage.test.tsx`

**Interfaces:**
- Consumes: `observarVisitas`, `registrarVisita`, `editarCasa`.
- Produces: `CasaPage` com os 4 botões de status, campo de observação opcional enviado junto, edição de número/descrição, e `HistoricoVisitas` (status, data em pt-BR, `porNome`, ciclo, `obs`).

- [ ] **Step 1: Write failing tests** — histórico lista visitas na ordem recebida (mais recente primeiro) com nome e ciclo; registrar com observação envia `obs`; casa sem visitas mostra "Nenhuma visita ainda"; editar descrição chama `editarCasa` e remover número e descrição juntos é recusado; com cartão `fechado` os botões de status ficam desativados e o aviso "Cartão fechado" aparece (admin com "Abrir cartão"); casa sem número mostra só a descrição e "Sem número".
- [ ] **Step 2:** Run `npx vitest run src/features/houses/CasaPage.test.tsx` — Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Mesmo comando — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): histórico da casa`.

### Task 14: Admin — membros, cartões, quadras e importação de PDF

**Files:**
- Create: `src/features/admin/AdminPage.tsx`, `src/features/admin/MembrosAdmin.tsx`, `src/features/admin/CartaoForm.tsx`, `src/features/admin/QuadrasAdmin.tsx`, `src/features/admin/pdfParaImagem.ts`
- Modify: `src/firebase/members.ts` (adicionar `observarMembros`, `salvarMembro`), `src/firebase/storage.ts` (adicionar `enviarArquivosDoCartao`)
- Test: `src/features/admin/pdfParaImagem.test.ts`, `src/features/admin/MembrosAdmin.test.tsx`, `src/features/admin/CartaoForm.test.tsx`

**Interfaces:**
- Produces: `observarMembros(cb: (m: (Membro & {email: string})[]) => void): () => void`; `salvarMembro(email: string, d: {nome: string; papel: Papel; ativo: boolean}): Promise<void>` (e-mail em minúsculas como id); `enviarArquivosDoCartao(cartaoId: string, arquivos: {pdf: Blob; imagem: Blob}): Promise<{pdfPath: string; imagemPath: string}>`;
  `pdfParaImagem(arquivo: File, opts?: { larguraMax?: number }): Promise<{ imagem: Blob; paginas: number }>` — renderiza só a **página 1** com pdfjs em canvas, `larguraMax` padrão 1600, saída `image/webp` (qualidade 0.8), devolve o total de páginas.

- [ ] **Step 1: Write failing tests** — `pdfParaImagem` com PDF de 3 páginas (fixture em `tests/fixtures/`) devolve `paginas: 3` e imagem com largura ≤ 1600 (Review Focus 5); `CartaoForm`: PDF com mais de 1 página mostra aviso "Só a primeira página será usada"; salvar chama `criarCartao`, `enviarArquivosDoCartao` e `atualizarCartao` nessa ordem; `MembrosAdmin`: adicionar e-mail normaliza para minúsculas, alternar "ativo" chama `salvarMembro`; admin não consegue desativar a si mesmo; `QuadrasAdmin` edita rótulo e lista de ruas (uma por linha, sem linhas vazias ou repetidas) e tem "Adicionar rua" (folha com chips de quadra e o nome, chama `adicionarRua`); membros: lista com e-mail, nome, papel e chave Ativo/Inativo; o cartão criado nasce `fechado` e a tela avisa que um administrador precisa abri-lo.
- [ ] **Step 2:** Run `npx vitest run src/features/admin` — Expected: FAIL.
- [ ] **Step 3:** Implementar; configurar o worker do pdfjs (`pdfjs-dist/build/pdf.worker.min.mjs` via `?url`).
- [ ] **Step 4:** Run `npx vitest run src/features/admin` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): membros, cartões e importação de PDF`.

### Task 15: Admin — fechar, abrir, reiniciar e recalcular

**Files:**
- Create: `src/features/admin/CicloAdmin.tsx`
- Modify: `src/features/cards/CartaoPage.tsx`
- Test: `src/features/admin/CicloAdmin.test.tsx`

**Interfaces:**
- Consumes: `fecharCartaoManual`, `abrirCartaoManual`, `reiniciarCartao`, `recalcularContadores`, `observarCasas` das quadras do cartão, `useSessao` (usuário para o registro).
- Produces: `CicloAdmin({ cartao })` com botões "Fechar cartão" (só se aberto), "Abrir cartão" (só se fechado, com a mesma confirmação da `CartaoPage`; fica desativado com a nota "Abrir só fica disponível com o cartão fechado"), "Reiniciar território" e "Recalcular contadores", e o link "Ver quando foi aberto e fechado" para o histórico (Task 15b); "Reiniciar território" pede confirmação com texto explícito do efeito ("As casas voltam a Pendente, exceto as de Não visitar. O histórico de visitas continua guardado. Esta ação não tem desfazer.") e uma caixa "Entendo que o cartão começa um novo ciclo." marcada antes de habilitar o botão.

- [ ] **Step 1: Write failing tests** — "Abrir cartão" só está ativo com cartão fechado e "Fechar cartão" só com aberto; abrir chama `abrirCartaoManual` com o usuário só depois da confirmação; "Reiniciar" não chama `reiniciarCartao` sem marcar a caixa e confirmar; confirmando, chama com as casas de todas as quadras e o usuário; botões inexistentes para publicador (renderização dentro de `RequerMembro papel="admin"`).
- [ ] **Step 2:** Run `npx vitest run src/features/admin/CicloAdmin.test.tsx` — Expected: FAIL.
- [ ] **Step 3:** Implementar e encaixar na `CartaoPage` e no `/admin`.
- [ ] **Step 4:** Mesmo comando — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): ciclo do cartão`.

### Task 15b: Admin — histórico de abertura e fechamento

**Files:**
- Create: `src/features/admin/HistoricoCartaoPage.tsx`, `src/features/admin/textoEvento.ts`
- Modify: `src/app/routes.tsx` (rota `/admin/cartao/:cartaoId/historico`, dentro de `RequerMembro papel="admin"`)
- Test: `src/features/admin/textoEvento.test.ts`, `src/features/admin/HistoricoCartaoPage.test.tsx`

**Interfaces:**
- Consumes: `observarEventos`, `observarCartoes`, `useSessao`, `EventoCartao` (Tasks 2 e 6).
- Produces: `textoEvento(e: Pick<EventoCartao,'motivo'|'porNome'>): string` → `"Maria S. reiniciou o território"` (`reinicio`), `"Paulo R. abriu o cartão"` (`abertura`), `"Maria S. fechou manualmente"` (`fechamento_manual`), `"Automático: Ana P. registrou a última casa"` (`fechamento_automatico`), `"Maria S. criou o cartão"` (`criacao`); `HistoricoCartaoPage` conforme `design/prototipo/11-historico.html`: título "Histórico", chips para trocar de cartão, aviso "Mostra quem abriu ou fechou o cartão e quando. Só os últimos 10 registros aparecem.", linha do tempo com ícone de cadeado fechado/aberto, "Aberto"/"Fechado", data e hora pt-BR (`dd/mm/aaaa · hh:mm`) e o texto do evento, do mais novo para o mais antigo.

- [ ] **Step 1: Write failing tests** — `textoEvento` nos cinco motivos; a página com 10 eventos mostra 10 itens na ordem recebida, "Aberto" e "Fechado" conforme `tipo`, data e hora formatadas; trocar o chip de cartão chama `observarEventos` com o outro id; lista vazia mostra "Nenhum registro ainda" e "Este cartão ainda não foi fechado nem reaberto."; carregando mostra o esqueleto; publicador (renderizado fora de `RequerMembro papel="admin"`) não vê a página: "Só para administradores".
- [ ] **Step 2:** Run `npx vitest run src/features/admin` — Expected: FAIL nos novos testes.
- [ ] **Step 3:** Implementar; o link "Ver quando foi aberto e fechado" do `CicloAdmin` (Task 15) aponta para a rota.
- [ ] **Step 4:** Run `npx vitest run src/features/admin` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): histórico de abertura e fechamento`.

### Task 16: PWA, offline e orientação de instalação

**Files:**
- Modify: `vite.config.ts`, `src/main.tsx`, `index.html`
- Create: `scripts/gerar-icones.mjs` (dev dep `@resvg/resvg-js`; lê `design/identidade/icone.svg` e `icone-maskable.svg` e grava em `public/icons/` `icon-192.png`, `icon-512.png`, `maskable-512.png`, e copia `icone.svg` como `public/favicon.svg`), `src/pwa/useInstalacao.ts`, `src/pwa/AvisoInstalar.tsx`, `src/pwa/InstalarPage.tsx`, `src/pwa/useOnline.ts`
- Test: `src/pwa/useOnline.test.ts`, `src/pwa/useInstalacao.test.ts`, `src/pwa/AvisoInstalar.test.tsx`

**Interfaces:**
- Produces: `useOnline(): boolean` (eventos `online`/`offline`); `useInstalacao(): { podeInstalar: boolean; instalado: boolean; instalar(): Promise<'accepted'|'dismissed'> }` guarda o evento `beforeinstallprompt` (Android/Chrome; chama `preventDefault()` e `prompt()` ao instalar) e escuta `appinstalled`; `AvisoInstalar` (aviso dispensável no topo da lista de cartões, como em `design/prototipo/03-cartoes.html`) mostra o botão **"Instalar app"** quando `podeInstalar` e, no iOS/Safari fora do modo `standalone`, o link "Ver como" para o passo a passo; `InstalarPage` (como `design/prototipo/10-instalar.html`): no Android o botão "Instalar app" fixo no rodapé (um toque instala; o Chrome ainda pede uma confirmação), o estado "App instalado" ("Procure o ícone Território na tela inicial.") após `appinstalled`, e "O botão não funcionou?" com o caminho pelo menu do Chrome; no iPhone o passo a passo "Compartilhar" → "Adicionar à Tela de Início" → "Adicionar", só no Safari; tudo dispensável e lembrado em `localStorage` (com try/catch); manifest com `name: "Meu Território"`, `short_name: "Território"`, `display: "standalone"`; Workbox: precache do shell, `CacheFirst` para `firebasestorage.googleapis.com` (respostas 0 e 200, expiração 90 dias, máx. 60 entradas), `NavigateFallback: '/index.html'`.

- [ ] **Step 1: Write failing tests** — `useOnline` reage a eventos; `AvisoInstalar` aparece em UA de iPhone fora de standalone, some em standalone e após dispensar; não quebra se `localStorage` lançar erro; Android: com `beforeinstallprompt` simulado aparece "Instalar app", tocar chama o `prompt()` do evento, `appinstalled` mostra "App instalado", e sem o evento o botão não aparece (cai no passo a passo).
- [ ] **Step 2:** Run `npx vitest run src/pwa` — Expected: FAIL.
- [ ] **Step 3:** Rodar `node scripts/gerar-icones.mjs` para criar os ícones PNG a partir dos SVG-mestre de `design/identidade/` (conferir a olho contra `identidade-visual.png`); implementar e configurar `vite-plugin-pwa` (`registerType: 'autoUpdate'`, ícones `icon-192`, `icon-512` e `maskable-512` com `purpose: 'maskable'`).
- [ ] **Step 4:** Run `npx vitest run src/pwa && npm run build` — Expected: PASS e `dist/sw.js` + `dist/manifest.webmanifest` gerados.
- [ ] **Step 5: Commit** `feat(pwa): offline e instalação`.

### Task 17: E2E offline e deploy

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/offline.spec.ts`, `tests/e2e/seed.ts`, `README.md`
- Modify: `package.json` (scripts `e2e`, `deploy`)

**Interfaces:**
- Consumes: app completo rodando contra emuladores (`VITE_USE_EMULATORS=true`), `seed.ts` cria admin, publicador, um cartão **aberto** e outro **fechado**, cada um com uma quadra e duas ruas.

- [ ] **Step 1: Write failing E2E tests** — (a) publicador abre o cartão online, vai offline (`context.setOffline(true)`), registra "Conversado" em uma casa e cadastra uma casa só com descrição; a UI reflete as duas mudanças; ao voltar online os dados aparecem no emulador (consulta direta ao Firestore) com visita e contador corretos; (b) registrar a última casa pendente fecha o cartão e ele passa para "Fechados"; (c) admin abre e reinicia o cartão e as casas voltam a pendentes menos "não visitar"; (d) usuário fora de `members` vê "Aguardando liberação"; (e) no cartão fechado o publicador vê "Peça a um deles", sem botão "Abrir cartão", e os botões de status ficam desativados; o admin abre o cartão e o histórico mostra o registro "Aberto" com o nome dele; (f) publicador cria uma rua nova pelo chip "Nova rua" e cadastra uma casa nela.
- [ ] **Step 2:** Run `npx firebase emulators:exec "npx playwright test"` — Expected: FAIL.
- [ ] **Step 3:** Corrigir o que o E2E expuser (registrar bugs achados nos testes de unidade da camada correspondente) e escrever o README com: criar projeto, plano Blaze, **alerta de orçamento** no console, criar o primeiro admin manualmente em `members/{email}` (campos `nome`, `papel: "admin"`, `ativo: true`), `firebase deploy`, como instalar o PWA no iPhone/Android.
- [ ] **Step 4:** Run `npx firebase emulators:exec "npx playwright test"` — Expected: PASS.
- [ ] **Step 5:** Run `npm run build && npx firebase deploy --only hosting,firestore:rules,storage` e verificar manualmente em um Android e um iPhone: instalar, abrir um cartão, desligar a internet, registrar visita, religar.
- [ ] **Step 6: Commit** `test(e2e): fluxo offline; docs: README e deploy`.
