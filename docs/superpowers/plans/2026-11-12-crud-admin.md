# CRUD completo na Administração (Parte 1) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao administrador editar e excluir cartão, quadra, rua e membro (com a conta do Auth saindo junto), com validação, aviso de falta de internet, erro e concorrência tratados em cada operação.

**Architecture:** Regras puras (validação, ruas, ordem, bloqueios de exclusão) em `src/domain/`. Escrita e leitura do servidor em `src/firebase/`, cada função com espelho em `src/demo/banco.ts`. Telas de Administração ganham blocos e folhas novos, sempre com o mesmo padrão: validar, bloquear com texto quando não pode, confirmar o efeito, mostrar erro. Uma Cloud Function em `functions/` apaga a conta do Auth quando `members/{email}` é apagado.

**Tech Stack:** React 18, Vite, TypeScript, firebase 12 (Firestore, Storage, Auth), Vitest + Testing Library, `@firebase/rules-unit-testing`, Firebase Emulator Suite, firebase-functions e firebase-admin (Node 22) só em `functions/`.

**Spec:** `docs/superpowers/specs/2026-11-12-crud-admin-design.md` (acrescenta à spec de 2026-11-06; onde houver conflito, vale a nova).

## Global Constraints

- Excluir cartão ou quadra **só quando vazio** (nenhum documento em `houses`, mesmo casa marcada "não visitar"). O cartão só exclui **fechado**; cartão e quadra só excluem **sem volta aberta**. A checagem lê do servidor (`getDocsFromServer`), nunca usa `totalCasas` e é refeita ao confirmar.
- Operações que exigem internet (trocar PDF, excluir cartão ou quadra, renomear ou remover rua, remover membro): sem rede o botão fica `aria-disabled` e o texto "Precisa de internet." aparece junto. Nunca esconder o botão. Edição de texto simples fecha a folha na hora e entra na fila, como hoje (`gravar(p)` com `.catch`).
- Nenhuma falha é silenciosa: aviso `role="alert"` (`aviso erro`) com "Não foi possível …" e o próximo passo. `permission-denied` mostra "Você não tem permissão para fazer isso.". Item removido por outra pessoa: "Este item foi removido por outra pessoa."
- Toda confirmação de exclusão ou remoção: folha `role="dialog"` com `aria-label`, o efeito escrito, foco inicial em "Cancelar", foco devolvido ao botão de origem ao fechar, botão de perigo (`btn perigo`) com ícone e texto, desabilitado com texto "Excluindo…" durante o envio.
- Limites e mensagens exatos (os testes copiam estes valores): número do cartão ≤ 10, título ≤ 80, quadra ≤ 40, rua ≤ 60, nome do membro ≤ 80, PDF ≤ 20 MB (`20 * 1024 * 1024`). Textos na Task 1.
- Cada função nova de `src/firebase/` tem espelho em `src/demo/banco.ts`. Na demonstração, remover membro só tira da lista.
- Todo acesso ao SDK do Firebase fica em `src/firebase/` (o teste `tests/arquitetura.test.ts` verifica). `functions/` fica fora de `src/`. Regras de negócio são funções puras em `src/domain/`.
- Interface em português do Brasil, tom calmo, curto, sem gíria e sem exclamações. Alvos de toque ≥ 48px, texto ≥ 16px, contraste AA, âmbar só como fundo. Nunito Sans pesos 400, 500, 600 (nunca 700). Ação de perigo nunca só por cor.
- Regras de segurança (`firestore.rules`, `storage.rules`) não mudam. Se uma tarefa descobrir que precisa mudar, **pare e relate**.
- Visitas, observações e voltas continuam imutáveis. Não alterar `docs/` nem `design/` além deste plano e da spec. Sem chaves ou `.env` no repositório.
- Um commit por tarefa; a mensagem termina com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Comandos no PowerShell. Unidade: `npx vitest run <arquivo>`. Dados (emulador, Java 21): `npx firebase emulators:exec --only auth,firestore,storage "npx vitest run tests/data"`. Regras: `npx firebase emulators:exec --only firestore,storage "npx vitest run tests/rules"`.
- Testes existentes que usam `vi.mock('@/firebase/blocks' | '@/firebase/cards' | '@/firebase/members' | '@/firebase/storage')` com lista fechada de funções quebram quando um componente passa a importar uma função nova. Ao mexer num componente, acrescente a função nova ao `vi.mock` desses testes (`CartaoAdminPage.test.tsx`, `AdminPage.test.tsx`, `QuadrasAdmin.test.tsx`, `MembrosAdmin.test.tsx`, `CartaoForm.test.tsx`, `ListaCartoesAdmin.test.tsx`).

## Review Focus

1. Renomear rua com mais de 400 casas, com falha depois do primeiro lote: repetir só toca as casas que ainda têm o nome antigo e a lista de ruas não perde nenhuma grafia. → Task 3 (dados) e Task 10 (aviso).
2. Excluir cartão ou quadra cuja única casa está marcada "não visitar" (`totalCasas` = 0, mas o documento existe) deve bloquear. → Tasks 2 e 3.
3. Trocar o PDF com falha no envio não pode deixar o cartão apontando para arquivo inexistente nem perder o mapa antigo. → Task 6.
4. Membro removido e liberado de novo antes de a função rodar mantém a conta do Auth. → Task 5.
5. Pessoa com a quadra aberta quando outra a exclui vê "Quadra não encontrada", e não a tela vazia que convida a cadastrar a primeira casa. → Task 9.

---

### Task 1: Regras puras (validação, ruas, ordem, bloqueios)

**Files:**
- Create: `src/domain/validacao.ts`, `src/domain/ruas.ts`, `src/domain/quadras.ts`, `src/domain/exclusao.ts`
- Test: `src/domain/validacao.test.ts`, `src/domain/ruas.test.ts`, `src/domain/quadras.test.ts`, `src/domain/exclusao.test.ts`

**Interfaces:**
- Produces (`validacao.ts`), todas devolvem a mensagem de erro ou `null`:
  - `LIMITES = { numeroCartao: 10, tituloCartao: 80, quadra: 40, rua: 60, nomeMembro: 80, pdfBytes: 20 * 1024 * 1024 } as const`
  - `validarCartao(d: { numero: string; titulo: string; mapsUrl?: string }, outros: Pick<Cartao, 'id' | 'numero'>[], proprioId?: string): string | null`
  - `validarQuadra(rotulo: string, outras: Pick<Quadra, 'id' | 'rotulo'>[], proprioId?: string): string | null`
  - `validarRua(nome: string, ruas: string[], atual?: string): string | null` (`atual` é a rua sendo renomeada: sai da comparação, então trocar só maiúsculas é permitido)
  - `validarNomeMembro(nome: string): string | null`
  - `validarNovoMembro(d: { email: string; nome: string }, existentes: { email: string }[]): string | null`
  - `validarArquivoMapa(a: { size: number; type: string }): string | null`
- Produces (`ruas.ts`): `mesmaRua(a: string, b: string): boolean` (espaços cortados, `toLocaleLowerCase('pt-BR')`); `ruasDaQuadra(quadra: Pick<Quadra, 'ruas'>, casas: Pick<Casa, 'rua'>[]): string[]` (ruas da quadra, depois as que só existem nas casas, comparação exata, sem repetir); `renomearRuaNaLista(ruas: string[], de: string, para: string): string[]`.
- Produces (`quadras.ts`): `trocarOrdem(quadras: Pick<Quadra, 'id' | 'ordem'>[], id: string, sentido: 'subir' | 'descer'): [{ id: string; ordem: number }, { id: string; ordem: number }] | null`.
- Produces (`exclusao.ts`): `type MotivoBloqueio = 'aberto' | 'volta' | 'casas'`; `class ExclusaoBloqueada extends Error { constructor(readonly motivo: MotivoBloqueio) }`; `bloqueiosDoCartao(c: Pick<Cartao, 'estado'>, quadras: Pick<Quadra, 'rodadaAtual'>[]): ('aberto' | 'volta')[]`; `bloqueioDaQuadra(q: Pick<Quadra, 'rodadaAtual'>): 'volta' | null`; `TEXTOS_BLOQUEIO` com as chaves da tabela abaixo.

- [ ] **Step 1: Escrever os testes que falham.**
  - `validacao.test.ts`, mensagens exatas:
    - `validarCartao`: número `''` → `'Informe o número do cartão.'`; título `'  '` → `'Informe o título do cartão.'`; número com 11 caracteres → `'O número pode ter até 10 caracteres.'` (10 passa); título com 81 → `'O título pode ter até 80 caracteres.'`; `' 12 '` com `outros=[{id:'a',numero:'12'}]` → `'Já existe o cartão 12.'`; o mesmo com `proprioId:'a'` → `null`; `'12'` vs `'12A'` não colidem; `mapsUrl:'maps.app/x'` → `'Cole o link completo, começando com https://.'`; `'https://maps.app/x'` e `'http://x'` e `undefined` e `''` → `null`.
    - `validarQuadra`: `''` → `'Digite o nome da quadra.'`; 41 caracteres → `'O nome pode ter até 40 caracteres.'`; `'quadra 1'` com `outras=[{id:'q1',rotulo:'Quadra 1'}]` → `'Já existe uma quadra com esse nome.'`; com `proprioId:'q1'` → `null`.
    - `validarRua`: `''` → `'Digite o nome da rua.'`; 61 → `'O nome pode ter até 60 caracteres.'`; `'rua a'` com `['Rua A']` → `'Essa rua já existe nesta quadra.'`; com `atual:'Rua A'` → `null`; `'Rua B'` com `atual:'Rua A'` e `['Rua A','Rua B']` → duplicada.
    - `validarNomeMembro`: `''` → `'Digite o nome da pessoa.'`; 81 → `'O nome pode ter até 80 caracteres.'`.
    - `validarNovoMembro`: `'sem-arroba'` → `'Digite um e-mail válido.'`; nome vazio → `'Digite o nome da pessoa.'`; `'ANA@gmail.com'` com existente `ana@gmail.com` → `'Esse e-mail já está na lista.'`; ordem das checagens: e-mail, nome, duplicado.
    - `validarArquivoMapa`: `{type:'image/png',size:1}` → `'Escolha um arquivo PDF.'`; `{type:'application/pdf',size: 20*1024*1024+1}` → `'O arquivo passa de 20 MB. Escolha outro.'`; exatamente `20*1024*1024` → `null`.
  - `ruas.test.ts`: `mesmaRua(' Rua Á ', 'rua á')` é `true`; `ruasDaQuadra({ruas:['A','B']},[{rua:'B'},{rua:'C'},{rua:'C'},{rua:'a'}])` = `['A','B','C','a']`; `renomearRuaNaLista(['A','B'],'A','C')` = `['C','B']`; com `de` ausente (`['B']`,`'A'`,`'C'`) = `['B','C']`; se `para` já existe (`['A','C']`,`'A'`,`'C'`) = `['C']`.
  - `quadras.test.ts`: com `[{id:'a',ordem:1},{id:'b',ordem:2},{id:'c',ordem:3}]` fora de ordem de entrada: `trocarOrdem(..., 'b', 'subir')` = `[{id:'b',ordem:1},{id:'a',ordem:2}]`; `'b','descer'` = `[{id:'b',ordem:3},{id:'c',ordem:2}]`; `'a','subir'`, `'c','descer'` e id inexistente → `null`.
  - `exclusao.test.ts`: `bloqueiosDoCartao({estado:'aberto'},[{}, {rodadaAtual:{...}}])` = `['aberto','volta']`; fechado e sem volta = `[]`; `bloqueioDaQuadra({rodadaAtual})` = `'volta'`, sem = `null`; `new ExclusaoBloqueada('casas').motivo` é `'casas'` e `instanceof Error`; `TEXTOS_BLOQUEIO`:

    | Chave | Texto |
    |---|---|
    | `cartao.aberto` | `Feche o cartão para excluir.` |
    | `cartao.volta` | `Encerre as voltas abertas antes.` |
    | `cartao.casas` | `Este cartão tem casas. Só é possível excluir um cartão vazio.` |
    | `quadra.volta` | `Encerre a volta aberta antes.` |
    | `quadra.casas` | `Esta quadra tem casas. Só é possível excluir uma quadra vazia.` |
    | `rua.casas` | `Esta rua tem casas. Mude ou exclua as casas antes.` |

- [ ] **Step 2: Rodar `npx vitest run src/domain` e ver FALHAR** (módulos inexistentes).

- [ ] **Step 3: Implementar** as assinaturas de **Interfaces**. `bloqueiosDoCartao` usa `podeFecharCartao` de `src/domain/rodada.ts` para "volta". `trocarOrdem` ordena uma cópia por `ordem` e troca os dois valores.

- [ ] **Step 4: Rodar `npx vitest run src/domain`** e ver PASSAR.

- [ ] **Step 5: Commit** `feat(crud): regras puras de validação, ruas, ordem e bloqueio de exclusão`.

---

### Task 2: Dados do cartão (editar, excluir, arquivos do mapa)

**Files:**
- Modify: `src/firebase/cards.ts`, `src/firebase/storage.ts`, `src/demo/banco.ts`
- Test: `tests/data/cards.test.ts`, `src/firebase/storage.test.ts` (novo), `src/demo/banco.test.ts`

**Interfaces:**
- Consumes: `ExclusaoBloqueada`, `bloqueiosDoCartao` (Task 1).
- Produces (`cards.ts`):
  - `atualizarCartao(id: string, d: Partial<Pick<Cartao, 'numero' | 'titulo' | 'imagemPath' | 'pdfPath'>> & { mapsUrl?: string | null }): Promise<void>` (`mapsUrl: null` remove o campo com `deleteField()`).
  - `cartaoTemCasas(cartaoId: string): Promise<boolean>` (lê do servidor; uma casa em qualquer quadra basta).
  - `excluirCartao(cartaoId: string): Promise<void>`: relê do servidor e lança `ExclusaoBloqueada('aberto' | 'volta' | 'casas')`; apaga eventos e quadras em lotes de `LOTE` e o cartão no último lote. Não mexe no Storage.
- Produces (`storage.ts`):
  - `enviarArquivosDoCartao` passa a gravar em `cards/{id}/mapa-{Date.now()}.pdf` e `.webp` (caminho novo a cada troca).
  - `apagarArquivos(paths: (string | undefined)[]): Promise<void>` (ignora `undefined` e `storage/object-not-found`; outro erro sobe).
  - `apagarArquivosDoCartao(cartaoId: string): Promise<void>` (lista `cards/{id}` com `listAll` e apaga tudo, inclusive o `mapa.pdf` e `mapa.webp` antigos).
- Produces (`demo/banco.ts`): `cartaoTemCasas`, `excluirCartao` e `atualizarCartao` com a mesma assinatura; `apagarArquivos` e `apagarArquivosDoCartao` sem efeito.

- [ ] **Step 1: Escrever os testes que falham.**
  - `tests/data/cards.test.ts` (emulador; reaproveita o `beforeAll` do arquivo): `atualizarCartao(id,{mapsUrl:null})` remove `mapsUrl` do documento; `excluirCartao` de cartão fechado, sem volta e sem casas apaga o cartão, as quadras e os eventos; com uma casa comum rejeita com `ExclusaoBloqueada` de `motivo:'casas'` e **nada** é apagado; com uma casa que tem `naoVisitar:true` e `totalCasas:0` no cartão também rejeita com `'casas'`; cartão `aberto` rejeita com `'aberto'`; quadra com `rodadaAtual` rejeita com `'volta'`; `cartaoTemCasas` é `true` com casa em qualquer das duas quadras e `false` sem casas.
  - `src/firebase/storage.test.ts` (mock de `firebase/storage`): `enviarArquivosDoCartao('c1', ...)` devolve caminhos que casam `/^cards\/c1\/mapa-\d+\.pdf$/` e `/^cards\/c1\/mapa-\d+\.webp$/`, e dois envios seguidos (com `vi.setSystemTime`) dão caminhos diferentes; `apagarArquivos([undefined,'cards/c1/a.pdf'])` chama `deleteObject` uma vez; erro `storage/object-not-found` é ignorado; erro `storage/unauthorized` sobe; `apagarArquivosDoCartao('c1')` apaga cada item de `listAll`.
  - `src/demo/banco.test.ts`: na demonstração, `excluirCartao` de cartão fechado e vazio o tira de `observarCartoes`; com casas rejeita `ExclusaoBloqueada('casas')`; `atualizarCartao(id,{mapsUrl:null})` limpa o link.

- [ ] **Step 2: Rodar** `npx vitest run src/firebase/storage.test.ts` e o comando de dados; ver FALHAR.

- [ ] **Step 3: Implementar** as assinaturas. `excluirCartao` lê, com `getDocsFromServer`, o documento do cartão, as quadras e uma casa por quadra (`limit(1)`), e só então escreve. Rode `rg "mapa\.(pdf|webp)" src tests` e ajuste qualquer uso literal dos caminhos antigos.

- [ ] **Step 4: Rodar os mesmos comandos** e ver PASSAR; rode também `npx vitest run src/demo`.

- [ ] **Step 5: Commit** `feat(crud): excluir cartão vazio, mapa com caminho novo e mapsUrl removível`.

---

### Task 3: Dados de quadras e ruas

**Files:**
- Modify: `src/firebase/blocks.ts`, `src/demo/banco.ts`
- Test: `tests/data/blocks.test.ts` (novo; copie o cabeçalho de `tests/data/cards.test.ts`), `src/demo/banco.test.ts`

**Interfaces:**
- Consumes: `ExclusaoBloqueada`, `bloqueioDaQuadra`, `renomearRuaNaLista` (Task 1); `LOTE` de `./houses`.
- Produces (`blocks.ts`):
  - `quadraTemCasas(cartaoId: string, quadraId: string): Promise<boolean>` (servidor, `limit(1)`).
  - `excluirQuadra(cartaoId: string, quadraId: string): Promise<void>`: relê do servidor; lança `ExclusaoBloqueada('volta')` se houver `rodadaAtual`, `ExclusaoBloqueada('casas')` se houver casas.
  - `trocarOrdemDeQuadras(cartaoId: string, troca: [{ id: string; ordem: number }, { id: string; ordem: number }]): Promise<void>` (um `writeBatch`).
  - `renomearRua(cartaoId: string, quadraId: string, de: string, para: string): Promise<{ casas: number }>`: lê do servidor as casas com `rua == de`, atualiza em lotes de `LOTE`, depois a lista da quadra com `renomearRuaNaLista`. Se falhar depois de gravar ao menos um lote, lança `RenomeacaoIncompleta` (exportada, `extends Error`); antes disso, relança o erro original.
  - `removerRua(cartaoId: string, quadraId: string, rua: string): Promise<void>`: lança `ExclusaoBloqueada('casas')` se o servidor tiver casa com essa rua; senão remove da lista da quadra.
- Produces (`demo/banco.ts`): as mesmas cinco funções.

- [ ] **Step 1: Escrever os testes que falham** (emulador, `tests/data/blocks.test.ts`):
  - `excluirQuadra`: quadra vazia some; com casa comum, e com casa `naoVisitar`, rejeita `'casas'` e nada é apagado; com `rodadaAtual` rejeita `'volta'`.
  - `trocarOrdemDeQuadras`: após a troca, `observarQuadras` devolve as duas quadras com as ordens trocadas, e uma terceira intacta.
  - `renomearRua`: com 3 casas em `'Rua A'` e 1 em `'Rua B'`, após `renomearRua(...,'Rua A','Rua C')` as 3 casas têm `rua:'Rua C'`, a de `'Rua B'` não muda e `quadra.ruas` tem `'Rua C'` no lugar de `'Rua A'`; trocar só caixa (`'Rua A'`→`'rua a'`) funciona; com `rua` só nas casas (fora da lista) acrescenta o novo nome à lista; **mais de 400 casas** (crie 401) atualiza todas; repetir depois de uma falha injetada no segundo lote (mock de `writeBatch` que lança no 2º `commit`) lança `RenomeacaoIncompleta`, e uma segunda chamada normal termina o trabalho e devolve `{casas}` igual ao número que faltava (o primeiro lote não é regravado).
  - `removerRua`: sem casas remove da lista; com casa rejeita `'casas'` e a lista fica igual.
  - `src/demo/banco.test.ts`: `renomearRua` muda `rua` nas casas e na lista; `excluirQuadra` com casas rejeita `'casas'`; `trocarOrdemDeQuadras` e `removerRua` refletem em `observarQuadras`.

- [ ] **Step 2: Rodar o comando de dados** e ver FALHAR.

- [ ] **Step 3: Implementar** as assinaturas. `renomearRua` conta os lotes gravados numa variável local para decidir entre `RenomeacaoIncompleta` e o erro original; a consulta usa `where('rua','==',de)`.

- [ ] **Step 4: Rodar o comando de dados e `npx vitest run src/demo`** e ver PASSAR.

- [ ] **Step 5: Commit** `feat(crud): excluir quadra, reordenar e renomear ou remover rua`.

---

### Task 4: Remover membro (dados)

**Files:**
- Modify: `src/firebase/members.ts`, `src/demo/banco.ts`
- Test: `src/firebase/members.test.ts`, `src/demo/banco.test.ts`, `tests/rules/firestore.rules.test.ts` (só se faltar o caso)

**Interfaces:**
- Produces: `removerMembro(email: string): Promise<void>` (`deleteDoc` em `members/{email em minúsculas e sem espaços}`); espelho em `demo/banco.ts` que tira o membro da lista observada.

- [ ] **Step 1: Escrever os testes que falham.** Em `members.test.ts` (acrescente `deleteDoc: vi.fn()` ao `vi.mock('firebase/firestore')`): `removerMembro('  Ana@Gmail.com ')` chama `deleteDoc` com a referência de `members/ana@gmail.com`. Em `firestore.rules.test.ts`, confira se já há caso "admin apaga outro membro permitido" e "admin apaga a si mesmo negado"; se faltar algum, acrescente.

- [ ] **Step 2: Rodar** `npx vitest run src/firebase/members.test.ts` e ver FALHAR.

- [ ] **Step 3: Implementar** `removerMembro` e o espelho em `demo`.

- [ ] **Step 4: Rodar** `npx vitest run src/firebase/members.test.ts src/demo` e o comando de regras; ver PASSAR.

- [ ] **Step 5: Commit** `feat(crud): remover membro`.

---

### Task 5: Cloud Function que apaga a conta do Auth

**Files:**
- Create: `functions/package.json`, `functions/tsconfig.json`, `functions/src/apagarContaDoMembro.ts`, `functions/src/index.ts`, `functions/src/apagarContaDoMembro.test.ts`, `tests/functions/apagar-conta.test.ts`
- Modify: `firebase.json`, `package.json`, `.gitignore`, `README.md`, `eslint.config.js` e `tsconfig*.json` só se `functions/` entrar no lint ou no `tsc -b` raiz

**Interfaces:**
- Produces (`apagarContaDoMembro.ts`):
  - `type Dependencias = { membroExiste(email: string): Promise<boolean>; uidDoEmail(email: string): Promise<string | null>; apagarConta(uid: string): Promise<void> }`
  - `apagarContaDoMembro(email: string, dep: Dependencias): Promise<'apagada' | 'sem_conta' | 'membro_voltou'>`
- Produces (`index.ts`): `export const apagarContaAoRemoverMembro = onDocumentDeleted({ document: 'members/{email}', retry: true }, ...)`, ligando as dependências ao `firebase-admin` (`getAuth().getUserByEmail`, `deleteUser`) e ao Firestore.

- [ ] **Step 1: Escrever os testes que falham.**
  - `functions/src/apagarContaDoMembro.test.ts` (Vitest, dependências falsas): conta existe e membro continua apagado → chama `apagarConta(uid)` e devolve `'apagada'`; `membroExiste` devolve `true` (liberado de novo) → **não** chama `apagarConta`, devolve `'membro_voltou'`; `uidDoEmail` devolve `null` → devolve `'sem_conta'`, sem erro; `apagarConta` lança erro temporário → a função **relança** (para a retentativa).
  - `tests/functions/apagar-conta.test.ts` (`// @vitest-environment node`, emuladores de Auth, Firestore e Functions): cria o usuário no Auth emulator por REST, grava `members/{email}` e apaga; espera (com limite de 10 s) o usuário sumir do Auth; segundo caso: apagar e regravar `members/{email}` logo em seguida mantém o usuário.

- [ ] **Step 2: Montar o pacote.** `functions/package.json` com `"engines": {"node": "22"}`, `"main": "lib/index.js"` e scripts `build` (`tsc`) e `test` (`vitest run`); instale as versões estáveis mais recentes de `firebase-functions` e `firebase-admin` compatíveis com Node 22 (`npm view <pacote> version`). Rode `npm --prefix functions install`.

- [ ] **Step 3: Rodar** `npx vitest run --root functions` e ver FALHAR.

- [ ] **Step 4: Implementar** as duas assinaturas. `apagarContaDoMembro` confere `membroExiste` **antes** de `uidDoEmail`/`apagarConta`; trata `auth/user-not-found` como `'sem_conta'`.

- [ ] **Step 5: Configurar.** `firebase.json`: `"functions": [{ "source": "functions", "predeploy": ["npm --prefix functions run build"] }]` e `"functions": { "port": 5001, "host": "127.0.0.1" }` em `emulators`. `package.json` raiz: scripts `"build:funcoes": "npm --prefix functions run build"`, `"test:funcoes": "npm run build:funcoes && npx firebase emulators:exec --only auth,firestore,functions \"npx vitest run tests/functions\""`, `"deploy:funcoes": "npm run build:funcoes && firebase deploy --only functions"`; o script `e2e` passa a rodar `npm run build:funcoes &&` antes do `firebase emulators:exec`, porque o emulador de Functions exige o build. `.gitignore`: `functions/lib`. `README.md`: uma seção curta "Cloud Function" com os comandos e a nota de que o plano Blaze e o deploy são do usuário.

- [ ] **Step 6: Rodar** `npx vitest run --root functions` e `npm run test:funcoes`; ver PASSAR. Confirme que `npm test` e `npm run lint` continuam passando.

- [ ] **Step 7: Commit** `feat(crud): função que apaga a conta do Auth ao remover o membro`.

---

### Task 6: Cartão — validação, mapa e edição ("Dados do cartão")

**Files:**
- Create: `src/features/admin/useMapa.ts`, `src/features/admin/CampoMapa.tsx`, `src/features/admin/EditarCartao.tsx`, `src/features/admin/EditarCartao.test.tsx`
- Modify: `src/features/admin/CartaoForm.tsx`, `src/features/admin/CartaoAdminPage.tsx`
- Test: `src/features/admin/CartaoForm.test.tsx`, `src/features/admin/CartaoAdminPage.test.tsx`

**Interfaces:**
- Consumes: `validarCartao`, `validarArquivoMapa` (Task 1); `atualizarCartao`, `enviarArquivosDoCartao`, `apagarArquivos` (Task 2); `useCartoes()`, `useOnline()`.
- Produces: `type Mapa = { arquivo: File; imagem: Blob; paginas: number }` e `useMapa(): { mapa: Mapa | null; lendo: boolean; erro: string | null; escolher(arquivo: File | undefined): Promise<void>; limpar(): void }` (`escolher` valida com `validarArquivoMapa` antes de `pdfParaImagem`); `CampoMapa({ mapa, lendo, erro, onEscolher }: …)` (apresentação do campo de PDF, com o aviso de várias páginas); `EditarCartao({ cartao }: { cartao: Cartao })`.

- [ ] **Step 1: Escrever os testes que falham.**
  - `CartaoForm.test.tsx`: número repetido de outro cartão mostra `Já existe o cartão 12.` e não chama `criarCartao`; PDF de 20 MB + 1 byte mostra `O arquivo passa de 20 MB. Escolha outro.`; link do Maps sem `https://` mostra `Cole o link completo, começando com https://.`; os casos existentes continuam passando.
  - `EditarCartao.test.tsx`: abre com número, título e link preenchidos; salvar sem PDF chama `atualizarCartao(id, { numero, titulo, mapsUrl })` e mostra `Dados salvos.` em `role="status"`; link apagado envia `mapsUrl: null`; o próprio número não conta como repetido, o de outro cartão sim; **trocar o PDF**: ordem das chamadas `enviarArquivosDoCartao` → `atualizarCartao` (com os caminhos novos) → `apagarArquivos([pdfPath e imagemPath antigos])`; se `enviarArquivosDoCartao` rejeita, `atualizarCartao` **não** é chamado, aparece `Não foi possível trocar o mapa. O mapa antigo continua valendo.` e `apagarArquivos` não é chamado; se só `apagarArquivos` rejeita, o resultado é de sucesso; sem internet, o botão de trocar mapa fica `aria-disabled` com `Precisa de internet.` e salvar sem PDF continua permitido; segundo toque durante o envio não duplica a chamada.
  - `CartaoAdminPage.test.tsx`: aparece o bloco "Dados do cartão" (fechado por padrão), na ordem Estado, Dados do cartão, Quadras e ruas, Histórico.

- [ ] **Step 2: Rodar** `npx vitest run src/features/admin` e ver FALHAR.

- [ ] **Step 3: Implementar.** Extraia de `CartaoForm` o estado do PDF para `useMapa` e o campo para `CampoMapa` (refatoração com os testes atuais verdes), depois aplique as validações. `EditarCartao` valida com `validarCartao(d, cartoes, cartao.id)`; **sem PDF** grava pelo padrão `gravar(p)` (fecha na hora, erro por `.catch`); **com PDF** envia primeiro, grava depois e só então apaga os arquivos antigos (ignorando falha dessa limpeza).

- [ ] **Step 4: Rodar** `npx vitest run src/features/admin` e `npx tsc -p tsconfig.app.json --noEmit`; ver PASSAR.

- [ ] **Step 5: Commit** `feat(crud): editar dados e mapa do cartão, com validação`.

---

### Task 7: Cartão — "Excluir cartão"

**Files:**
- Create: `src/features/admin/ExcluirCartao.tsx`, `src/features/admin/ExcluirCartao.test.tsx`
- Modify: `src/features/admin/CartaoAdminPage.tsx`, `src/features/admin/AdminPage.tsx`, `src/features/admin/ListaCartoesAdmin.tsx`
- Test: `src/features/admin/AdminPage.test.tsx`, `src/features/admin/ListaCartoesAdmin.test.tsx`, `src/features/admin/CartaoAdminPage.test.tsx`

**Interfaces:**
- Consumes: `bloqueiosDoCartao`, `TEXTOS_BLOQUEIO`, `ExclusaoBloqueada` (Task 1); `cartaoTemCasas`, `excluirCartao`, `apagarArquivosDoCartao` (Task 2); `useOnline()`.
- Produces: `ExcluirCartao({ cartao, quadras }: { cartao: Cartao; quadras: Quadra[] | null })`. Ao concluir, `navigate('/admin', { state: { aba: 'cartoes', excluido: cartao.numero, arquivosFicaram?: true } })`. `AdminPage` abre a aba de `location.state?.aba` (padrão `'membros'`); `ListaCartoesAdmin` mostra o aviso `Cartão {numero} excluído.` (e, se `arquivosFicaram`, `Os arquivos do mapa ficaram guardados.`) em `role="status"`.

- [ ] **Step 1: Escrever os testes que falham.** `ExcluirCartao.test.tsx`:
  - botão `Excluir cartão` desabilitado (`aria-disabled`) com o texto de `TEXTOS_BLOQUEIO.cartao.aberto` quando o cartão está aberto; com `TEXTOS_BLOQUEIO.cartao.volta` quando há quadra com `rodadaAtual`; com `Precisa de internet.` sem rede; enquanto `quadras === null`, com `Aguarde: ainda estamos carregando as quadras do cartão.`;
  - com cartão fechado, sem volta e online, chama `cartaoTemCasas`; mostra `Verificando…` e, se devolver `true`, desabilita com `TEXTOS_BLOQUEIO.cartao.casas`; se rejeitar, o botão continua habilitado (a confirmação decide);
  - toque abre a folha `Excluir cartão` com o efeito escrito (`Não dá para desfazer`), foco em `Cancelar`; `Cancelar` fecha e devolve o foco ao botão;
  - confirmar chama `excluirCartao(id)` e, com sucesso, `apagarArquivosDoCartao(id)` e navega com `state { aba:'cartoes', excluido:'12' }`; se `apagarArquivosDoCartao` rejeita, `arquivosFicaram: true`; se `excluirCartao` rejeita `ExclusaoBloqueada('casas')`, a folha mostra `TEXTOS_BLOQUEIO.cartao.casas` e não navega; outro erro mostra `Não foi possível excluir`; `permission-denied` mostra `Você não tem permissão para fazer isso.`; o botão fica `Excluindo…` e um segundo toque não chama de novo.
  - `AdminPage.test.tsx`: com `location.state.aba = 'cartoes'` a aba Cartões abre; sem state, Membros. `ListaCartoesAdmin.test.tsx`: mostra o aviso de excluído e o de arquivos.

- [ ] **Step 2: Rodar** `npx vitest run src/features/admin` e ver FALHAR.

- [ ] **Step 3: Implementar** `ExcluirCartao` e o bloco "Excluir cartão" (último de `CartaoAdminPage`, fechado por padrão) e os ajustes de `AdminPage` e `ListaCartoesAdmin`.

- [ ] **Step 4: Rodar** `npx vitest run src/features/admin`; ver PASSAR.

- [ ] **Step 5: Commit** `feat(crud): excluir cartão vazio pela Administração`.

---

### Task 8: Quadra — nome único, excluir e reordenar

**Files:**
- Modify: `src/features/admin/QuadrasAdmin.tsx`
- Test: `src/features/admin/QuadrasAdmin.test.tsx`

**Interfaces:**
- Consumes: `validarQuadra`, `trocarOrdem`, `bloqueioDaQuadra`, `TEXTOS_BLOQUEIO`, `ExclusaoBloqueada` (Task 1); `excluirQuadra`, `quadraTemCasas`, `trocarOrdemDeQuadras` (Task 3); `useOnline()`.
- Produces: na folha "Editar quadra", botões `Subir`, `Descer` e `Excluir quadra`; a lista de quadras ganha o nome único validado ao criar e editar.

- [ ] **Step 1: Escrever os testes que falham** (acrescente as funções novas ao `vi.mock('@/firebase/blocks')`):
  - criar ou editar com nome repetido mostra `Já existe uma quadra com esse nome.` e não grava; 41 caracteres mostra `O nome pode ter até 40 caracteres.`; editar mantendo o próprio nome é permitido;
  - `Subir` na segunda quadra chama `trocarOrdemDeQuadras('c12', [{id:'q2',ordem:1},{id:'q1',ordem:2}])`; na primeira, `Subir` está `aria-disabled` com `Já é a primeira`; na última, `Descer` com `Já é a última`;
  - `Excluir quadra`: com `rodadaAtual` desabilitado com `TEXTOS_BLOQUEIO.quadra.volta`; sem rede, `Precisa de internet.`; online e sem volta, `quadraTemCasas` `true` mostra `TEXTOS_BLOQUEIO.quadra.casas`; confirmar chama `excluirQuadra('c12','q1')`; `ExclusaoBloqueada('casas')` na confirmação mostra o texto de casas; `not-found` mostra `Este item foi removido por outra pessoa.`; foco inicial em `Cancelar`.

- [ ] **Step 2: Rodar** `npx vitest run src/features/admin/QuadrasAdmin.test.tsx` e ver FALHAR.

- [ ] **Step 3: Implementar.** Reaproveite o padrão de confirmação de `ExcluirEvento`.

- [ ] **Step 4: Rodar** o mesmo comando; ver PASSAR.

- [ ] **Step 5: Commit** `feat(crud): quadra com nome único, reordenar e excluir`.

---

### Task 9: Telas "Quadra não encontrada" e erro ao excluir casa

(Vem antes das ruas porque a Task 10 também mexe em `QuadraPage.tsx`.)

**Files:**
- Modify: `src/features/houses/QuadraPage.tsx`, `src/features/houses/CasaPage.tsx`
- Test: `src/features/houses/QuadraPage.test.tsx`, `src/features/houses/CasaPage.test.tsx`

**Interfaces:**
- Consumes: `useQuadrasCarregadas(cartaoId): Quadra[] | null`, `useOnline()`, `excluirCasa` (existente).
- Produces: com as quadras já carregadas e a quadra ausente, as duas telas mostram o título `Quadra não encontrada` e o link `Voltar para o Cartão {numero}`, sem o convite "Cadastrar a primeira casa". `CasaPage` passa a usar `useQuadrasCarregadas`.

- [ ] **Step 1: Escrever os testes que falham.**
  - `QuadraPage`: quadras carregadas sem a quadra da rota → `Quadra não encontrada` e **sem** `Cadastrar a primeira casa`; enquanto as quadras não chegaram (`null`), continua o esqueleto de carregando; quadra existente não muda.
  - `CasaPage`: mesma checagem; excluir casa **online** não navega antes de `excluirCasa` resolver, e se rejeitar mostra `Não foi possível excluir` dentro da folha (sem navegar); **offline** chama `excluirCasa` sem esperar e navega.

- [ ] **Step 2: Rodar** `npx vitest run src/features/houses` e ver FALHAR.

- [ ] **Step 3: Implementar.** Em `CasaPage`, `excluir` fica assíncrono: online espera o resultado antes de `navigate`; offline mantém o comportamento atual (a escrita não resolve sem rede). Remova o `.catch(() => {})`.

- [ ] **Step 4: Rodar** `npx vitest run src/features/houses`; ver PASSAR.

- [ ] **Step 5: Commit** `fix(crud): quadra removida e erro ao excluir casa não passam em silêncio`.

---

### Task 10: Ruas — lista com Renomear e Remover

**Files:**
- Create: `src/features/admin/RuasDaQuadra.tsx`, `src/features/admin/RuasDaQuadra.test.tsx`
- Modify: `src/features/admin/QuadrasAdmin.tsx`, `src/features/houses/QuadraPage.tsx` (usar `ruasDaQuadra`)
- Test: `src/features/admin/QuadrasAdmin.test.tsx`, `src/features/houses/QuadraPage.test.tsx`

**Interfaces:**
- Consumes: `validarRua`, `ruasDaQuadra`, `mesmaRua`, `TEXTOS_BLOQUEIO`, `ExclusaoBloqueada` (Task 1); `renomearRua`, `removerRua`, `RenomeacaoIncompleta`, `adicionarRua` (Task 3); `useCasas(cartaoId, quadraId)` (existente, só com a folha aberta); `useOnline()`.
- Produces: `RuasDaQuadra({ cartaoId, quadra }: { cartaoId: string; quadra: Quadra })`, lista das ruas (união de `quadra.ruas` com as das casas) com `Renomear` e `Remover` em cada linha. Na folha de **editar** quadra o campo de texto "Ruas" é substituído por esta lista; na folha de **nova** quadra o campo de texto continua (`ruasDoTexto`). `QuadraPage` passa a obter suas ruas por `ruasDaQuadra`.

- [ ] **Step 1: Escrever os testes que falham** (`RuasDaQuadra.test.tsx`, com `useCasas` simulado):
  - a lista mostra a união (rua só nas casas aparece); uma rua com casas tem `Remover` `aria-disabled` com `TEXTOS_BLOQUEIO.rua.casas`; sem casas, `Remover` abre confirmação e chama `removerRua(cartaoId, quadraId, rua)`; `ExclusaoBloqueada('casas')` vindo do servidor mostra o mesmo texto;
  - `Renomear` abre folha com o nome atual; nome vazio, repetido ou com 61 caracteres mostra o erro de `validarRua` (sem chamar `renomearRua`); trocar só maiúsculas é aceito; confirmar chama `renomearRua(cartaoId, quadraId, 'Rua A', 'Rua C')`;
  - `RenomeacaoIncompleta` mostra `Parte das casas foi atualizada. Toque em Renomear de novo para terminar.`; outro erro mostra `Não foi possível renomear a rua. Tente de novo.`;
  - sem rede, `Renomear` e `Remover` ficam `aria-disabled` com `Precisa de internet.`; `Adicionar rua` (já existente) segue funcionando offline.
  - `QuadrasAdmin.test.tsx`: o teste "edita o rótulo e as ruas (uma por linha…)" muda para "edita o rótulo" (a folha de edição não tem mais o campo "Ruas"); a folha de nova quadra ainda aceita ruas em texto. `QuadraPage.test.tsx`: a ordem e a união das ruas continuam iguais.

- [ ] **Step 2: Rodar** `npx vitest run src/features/admin src/features/houses` e ver FALHAR.

- [ ] **Step 3: Implementar** `RuasDaQuadra` e a troca na folha de edição. A leitura de casas só acontece com a folha aberta (custo de leitura limitado a uma quadra).

- [ ] **Step 4: Rodar** `npx vitest run src/features/admin src/features/houses`; ver PASSAR.

- [ ] **Step 5: Commit** `feat(crud): renomear e remover rua, com as casas junto`.

---

### Task 11: Membro — editar e remover

**Files:**
- Modify: `src/features/admin/MembrosAdmin.tsx`
- Test: `src/features/admin/MembrosAdmin.test.tsx`

**Interfaces:**
- Consumes: `validarNomeMembro`, `validarNovoMembro` (Task 1); `salvarMembro` (existente), `removerMembro` (Task 4); `useOnline()`, `useSessao()`.
- Produces: cada linha ganha o botão `Editar {nome}` (≥ 48px) que abre a folha "Editar membro" (nome, papel, `Salvar`, `Cancelar`, `Remover da lista`); a folha de remoção `Remover {nome}?`. "Liberar novo e-mail" passa a validar com `validarNovoMembro` (e o limite de 80 do nome).

- [ ] **Step 1: Escrever os testes que falham** (acrescente `removerMembro` ao `vi.mock('@/firebase/members')`):
  - `Editar Ana Pereira` abre a folha com nome e papel preenchidos; `Salvar` chama `salvarMembro('ana@gmail.com', { nome, papel, ativo: true })` mantendo `ativo`; nome vazio mostra `Digite o nome da pessoa.`; 81 caracteres mostra `O nome pode ter até 80 caracteres.`;
  - promover Ana a `Administrador` grava `papel: 'admin'`; rebaixar outro administrador é permitido;
  - na linha do próprio administrador logado, o grupo de papel fica desabilitado com `Você não pode mudar o seu próprio papel.` e **não existe** `Remover da lista`;
  - `Remover da lista` abre `Remover Ana Pereira?` com o texto `A conta de Ana Pereira deixa de existir. Se a pessoa entrar de novo com o Google, não terá acesso até você liberar o e-mail.`, foco em `Cancelar`; confirmar chama `removerMembro('ana@gmail.com')` e fecha as folhas; falha mostra `Não foi possível remover` e `permission-denied` mostra `Você não tem permissão para fazer isso.`; sem rede, o botão fica `aria-disabled` com `Precisa de internet.`;
  - e-mail inválido, repetido ou nome longo continuam recusados na folha de liberar (os casos existentes passam).

- [ ] **Step 2: Rodar** `npx vitest run src/features/admin/MembrosAdmin.test.tsx` e ver FALHAR.

- [ ] **Step 3: Implementar.** A folha de edição reaproveita o layout de `FolhaNovoMembro`.

- [ ] **Step 4: Rodar** o mesmo comando; ver PASSAR.

- [ ] **Step 5: Commit** `feat(crud): editar e remover membro`.

---

### Task 12: Verificação final e entrega

**Files:** nenhum arquivo novo (só correções que a verificação apontar, cada uma com teste).

- [ ] **Step 1: Rodar tudo.** `npm run lint`; `npx tsc -b`; `npm test`; `npx firebase emulators:exec --only auth,firestore,storage "npx vitest run tests/data"`; `npx firebase emulators:exec --only firestore,storage "npx vitest run tests/rules"`; `npm run test:funcoes`; `npm run build`. Esperado: tudo verde; qualquer falha é relatada com a saída real.

- [ ] **Step 2: Conferir o defeito das ruas na quadra** (spec, "Defeitos já vistos"): com o emulador e dados de exemplo, renomear uma rua com casas e abrir a `QuadraPage`: a rua antiga não pode reaparecer. Se reaparecer, abra um teste que reproduza e corrija em `renomearRua`.

- [ ] **Step 3: Passada pela demonstração.** Com `npm run dev` e a demonstração ativa, percorra: editar dados do cartão, excluir um cartão novo e vazio, criar, subir, descer e excluir quadra, renomear e remover rua, editar e remover membro. Relate o que não foi possível ver.

- [ ] **Step 4: Listar o que fica com o usuário** (não tente fazer): plano Blaze ativo; `npm run deploy:funcoes`; no console do Firebase, conferir em Functions que `apagarContaAoRemoverMembro` está ativa e testar removendo um e-mail de teste e vendo a conta sumir de Authentication; testes em celular real.

- [ ] **Step 5: Commit** só se a verificação gerou correções: `fix(crud): ajustes da verificação final`.
