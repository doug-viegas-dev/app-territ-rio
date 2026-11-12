# Voltas, marcas da casa e histórico de 2 anos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar "rodada" por "volta" (zerando ao reabrir o cartão), tirar Estudo e Não visitar dos status e passá-los para marcas nos detalhes da casa, registrar com Conversado/Não atendeu/Não em casa/Carta, guardar o histórico por 2 anos com apagamento automático e deixar "Fechar cartão" à mão do administrador.

**Architecture:** Regras puras em `src/domain/` (contagem por casa com `naoVisitar` fora de todas as contas, vencimento de 2 anos). Escrita em `src/firebase/` com espelho em `src/demo/banco.ts`. Interface troca só textos ("volta"); os nomes internos `rodada*` e a coleção `rodadas` não mudam. TTL do Firestore em `expiraEm` apaga o vencido; o app filtra o vencido na hora.

**Tech Stack:** React 18, Vite, TypeScript, firebase 12 (Firestore), Vitest + Testing Library, `@firebase/rules-unit-testing`, Firebase Emulator Suite, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-voltas-marcas-historico-design.md` (muda `docs/superpowers/specs/2026-11-06-app-territorios-design.md`; onde houver conflito, vale o novo).

## Global Constraints

- Status: `pendente`, `falado` ("Conversado"), `sem_resposta` ("Não atendeu"), `nao_em_casa` ("Não em casa"), `carta` ("Carta"). Resolvem a casa só `falado` e `carta`. `estudo` e `nao_visitar` saem de `Status`; os rótulos "Estudo" e "Não visitar" existem só para ler visitas antigas.
- Marcas: campos `naoVisitar` e `estudo` (booleanos, opcionais) na casa, cada um com quem marcou e quando. Só se marcam nos detalhes da casa, com o cartão aberto, por qualquer publicador. Continuam depois de "fechar e reiniciar".
- Casa com `naoVisitar` **não existe para as contas**: fora de `totalCasas` (cartão e quadra), `faltam` e `resolvidas`. Segue visível na lista (selo ícone + texto), com registro bloqueado: "Pediu para não ser visitado. Desmarque nos detalhes para registrar".
- "Rodada" vira "volta" **só nos textos da interface**. Não renomear `rodada`, `rodadasTotal`, `rodadaAtual`, `rodadas`, `abrirRodada`, `encerrarRodada`, motivos de evento nem o ícone `i-rodada`.
- Abrir o cartão zera `rodadasTotal` e remove `rodadaAtual` de todas as quadras, no mesmo lote. A lista de voltas do histórico do cartão é ordenada por data, não por número.
- Fechamento comum mantém o status das casas; "fechar e reiniciar" volta todas as casas a `pendente`, sobe o ciclo e mantém as marcas.
- Histórico: cada documento novo em `visits` grava `expiraEm` (Timestamp) = data do registro + 2 anos; o app filtra `expiraEm` ≤ agora. Visita sem `expiraEm` usa `em` + 2 anos.
- Observação: documento em `visits` com `obs`, `em`, `porUid`, `porNome`, `ciclo`, `expiraEm` e **sem `status`**. Não mexe em status nem contadores. Aviso acima do campo, texto exato: "Não anote nenhum dado pessoal: nem nomes, telefones ou documentos de moradores."
- Só administradores fecham e reiniciam o cartão. Regras de segurança não mudam para isso.
- Interface em português do Brasil, tom calmo, curto, sem gíria e sem exclamações. Status sempre com **cor + forma + nome**. Alvos de toque ≥ 48px, texto ≥ 16px, contraste AA, âmbar só como fundo. Fonte Nunito Sans pesos 400, 500, 600 (nunca 700).
- Todo acesso ao SDK do Firebase fica em `src/firebase/` (o teste `tests/arquitetura.test.ts` verifica). Regras de negócio são funções puras em `src/domain/`, sem Firebase.
- Cota: casas só são lidas ao abrir a quadra; o cartão inteiro só é lido ao abrir a confirmação de reinício.
- Sem nomes de moradores em nenhum campo. Sem chaves ou `.env` no repositório.
- Um commit por tarefa. A mensagem termina com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Não altere `docs/` nem `design/` além deste plano e do spec.
- Comandos no PowerShell. Testes de unidade: `npx vitest run <arquivo>`. Testes de dados e de regras precisam dos emuladores (Java 21): `npx firebase emulators:exec --only auth,firestore,storage "npx vitest run tests/data"` e `npx firebase emulators:exec --only firestore,storage "npx vitest run tests/rules"`.

## Review Focus

1. Marcar ou desmarcar `naoVisitar` numa casa já Conversado ou Pendente deve ajustar total, resolvidas e faltam, e repetir a mesma marcação (dois aparelhos) não pode contar duas vezes. → Task 3.
2. Visita antiga sem `expiraEm` e com mais de 2 anos some da tela, mesmo antes da migração. → Tasks 1 e 8.
3. Reabrir um cartão que ficou com volta aberta (aberta offline) zera tudo, a próxima volta é a 1, e o histórico do cartão não mistura duas "volta 1" da mesma quadra. → Tasks 4 e 9.
4. Casa ainda gravada com `status: 'estudo'` ou `'nao_visitar'` (antes da migração) abre como Pendente com a marca e nunca quebra a tela. → Task 2.
5. Rodar "Atualizar dados" duas vezes não muda nada na segunda e não duplica marcas nem contadores. → Task 12.

---

### Task 1: Regras puras do domínio

**Files:**
- Modify: `src/domain/types.ts`, `src/domain/status.ts`, `src/domain/rotulos.ts`, `src/domain/ciclo.ts`, `src/domain/rodada.ts`
- Create: `src/domain/historico.ts`, `src/domain/historico.test.ts`
- Test: `src/domain/status.test.ts`, `src/domain/rotulos.test.ts`, `src/domain/ciclo.test.ts`, `src/domain/rodada.test.ts`

**Interfaces:**
- Produces (types): `Status = 'pendente' | 'falado' | 'sem_resposta' | 'nao_em_casa' | 'carta'`; `StatusVisita = Status | 'estudo' | 'nao_visitar'`; `Casa` ganha `naoVisitar?: boolean; naoVisitarPor?: string; naoVisitarEm?: number; estudo?: boolean; estudoPor?: string; estudoEm?: number`; `Visita` passa a `{ id; status?: StatusVisita; em; porUid; porNome; ciclo; rodada?; obs?; expiraEm?: number }`.
- Produces (`status.ts`): `type CasaConta = Pick<Casa, 'status' | 'naoVisitar'>`; `contaNoTotal(c: Pick<Casa, 'naoVisitar'>): boolean`; `isResolvida(c: CasaConta): boolean`; `faltaVisitar(c: CasaConta): boolean`; `contribuicao(c: CasaConta | null): { total: 0 | 1; resolvidas: 0 | 1; faltam: 0 | 1 }`; `deltaContadores(antes: CasaConta | null, depois: CasaConta | null): { total: number; resolvidas: number; faltam: number }`. Removem `deltaResolvidas` e `deltaFaltam`.
- Produces (`rotulos.ts`): `rotuloStatus(s: StatusVisita): string`.
- Produces (`historico.ts`): `vencimentoDoRegistro(em: number): number`; `aindaNoHistorico(v: { em: number; expiraEm?: number }, agora: number): boolean`.
- Produces (`ciclo.ts`): `listaDeTrabalho(casas: Casa[]): Casa[]` (substitui o retorno `{pendentes, destacadas}`); `idsParaReiniciar(casas: Casa[]): string[]`; `contadoresAposReinicio(casasDaQuadra: Pick<Casa, 'naoVisitar'>[]): { totalCasas: number; faltam: number }`.
- Produces (`rodada.ts`): `podeRegistrarNaCasa(c: Pick<Cartao, 'estado'>, q: Pick<Quadra, 'rodadaAtual'>, casa: Pick<Casa, 'naoVisitar'>): boolean`.

- [ ] **Step 1: Baseline.** Rode `npm test` e `npm run lint` e anote que passam antes de mudar qualquer coisa.

- [ ] **Step 2: Escrever os testes que falham.**
  - `status.test.ts` (substitui o conteúdo): `contribuicao({status:'falado'})` e `({status:'carta'})` dão `{total:1,resolvidas:1,faltam:0}`; `'sem_resposta'`, `'nao_em_casa'` e `'pendente'` dão `{1,0,1}`; `({status:'falado',naoVisitar:true})` dá `{0,0,0}`; `contribuicao(null)` dá `{0,0,0}`. `deltaContadores({status:'falado'},{status:'falado',naoVisitar:true})` = `{total:-1,resolvidas:-1,faltam:0}`; `({status:'pendente'},{status:'pendente',naoVisitar:true})` = `{-1,0,-1}`; `({status:'pendente'},{status:'carta'})` = `{0,1,-1}`; `(null,{status:'sem_resposta'})` = `{1,0,1}`; `({status:'carta'},null)` = `{-1,-1,0}`.
  - `rotulos.test.ts`: `rotuloStatus` devolve, na ordem `pendente, falado, sem_resposta, nao_em_casa, carta, estudo, nao_visitar`: `['Pendente','Conversado','Não atendeu','Não em casa','Carta','Estudo','Não visitar']`.
  - `historico.test.ts`: `vencimentoDoRegistro(new Date(2026,10,12,9).getTime())` é `new Date(2028,10,12,9).getTime()`; `aindaNoHistorico({em: new Date(2024,10,12).getTime()}, new Date(2026,10,13).getTime())` é `false`; com `expiraEm` no futuro é `true`; com `expiraEm === agora` é `false`; `{em: new Date(2025,0,1).getTime()}` sem `expiraEm` em `new Date(2026,10,13)` é `true`.
  - `ciclo.test.ts`: `listaDeTrabalho` devolve, em ordem, as casas que faltam visitar e também as com `naoVisitar` (que ficam visíveis no lugar delas), e deixa de fora as resolvidas; `idsParaReiniciar([falado, sem_resposta, carta, pendente, naoVisitar+falado])` devolve os ids de todas menos a pendente; `contadoresAposReinicio([{}, {}, {naoVisitar:true}])` = `{totalCasas:2, faltam:2}`; `abrirCartao` e `fecharCartao` mantêm os testes atuais.
  - `rodada.test.ts`: `podeRegistrarNaCasa({estado:'aberto'},{rodadaAtual},{})` é `true`; com `{naoVisitar:true}` é `false`; com cartão `fechado` ou quadra sem `rodadaAtual` é `false`.

- [ ] **Step 3: Rodar `npx vitest run src/domain` e ver FALHAR** (funções ou tipos inexistentes).

- [ ] **Step 4: Implementar** as assinaturas de **Interfaces** nos arquivos indicados. `contribuicao` é a soma única que os demais derivam (`deltaContadores` = `contribuicao(depois)` − `contribuicao(antes)`). `vencimentoDoRegistro` soma 2 anos de calendário com `Date#setFullYear`. `aindaNoHistorico` usa `expiraEm ?? vencimentoDoRegistro(em)` e exige `> agora`. Em `rotulos.ts` o mapa cobre os 7 valores de `StatusVisita`. Ajuste `tsc` nos usos antigos só até compilar este diretório; os usos fora de `src/domain` são tratados nas tarefas seguintes (rode `npx tsc -p tsconfig.app.json --noEmit` e anote os erros fora de `src/domain`, que somem até a Task 8).

- [ ] **Step 5: Rodar `npx vitest run src/domain`** e ver PASSAR.

- [ ] **Step 6: Commit**

```powershell
git add src/domain
git commit -m "feat(dominio): status novos, marcas fora da conta, vencimento de 2 anos"
```

---

### Task 2: Leitura dos dados (conversores) e voltas por data

**Files:**
- Modify: `src/firebase/converters.ts`, `src/firebase/rodadas.ts`, `src/firebase/offline.ts`, `src/demo/banco.ts` (só `observarRodadas`)
- Test: `src/firebase/converters.test.ts`, `src/demo/banco.test.ts`

**Interfaces:**
- Consumes: tipos da Task 1.
- Produces: `casaDe(id, quadraId, d)` devolve `status` entre os 5 novos e as marcas; `visitaDe(id, d)` devolve `status?: StatusVisita` e `expiraEm?: number`; `observarRodadas` passa a ordenar por `abertaEm` decrescente (mesma chave de cache `cards/{c}/blocks/{q}/rodadas`).

- [ ] **Step 1: Testes que falham em `converters.test.ts`.**
  - `casaDe` com `{status:'estudo'}` devolve `status:'pendente'` e `estudo:true`; com `{status:'nao_visitar'}` devolve `status:'pendente'` e `naoVisitar:true`; com `{status:'carta', naoVisitar:true, naoVisitarPor:'Ana', naoVisitarEm: Timestamp}` devolve `status:'carta'`, `naoVisitar:true`, `naoVisitarPor:'Ana'` e `naoVisitarEm` em milissegundos; com `{status:'qualquer'}` devolve `'pendente'`.
  - `visitaDe` com `{obs:'voltar', em, porUid, porNome, ciclo:1}` (sem `status`) devolve objeto **sem** a chave `status`; com `{status:'estudo'}` mantém `'estudo'`; com `expiraEm` Timestamp devolve o número.
  - `src/demo/banco.test.ts`: `observarRodadas` devolve as voltas da mais recente para a mais antiga por `abertaEm`, mesmo quando os números se repetem.

- [ ] **Step 2: Rodar `npx vitest run src/firebase/converters.test.ts src/demo/banco.test.ts` e ver FALHAR.**

- [ ] **Step 3: Implementar** em `converters.ts` a lista de status válidos nova e o mapeamento dos legados na leitura da casa (`estudo` → pendente + `estudo`, `nao_visitar` → pendente + `naoVisitar`); campos de marca lidos só quando do tipo certo. Em `rodadas.ts` e `offline.ts` troque `orderBy('numero','desc')` por `orderBy('abertaEm','desc')`; no demo, ordene por `abertaEm`.

- [ ] **Step 4: Rodar os mesmos testes e ver PASSAR.**

- [ ] **Step 5: Commit**

```powershell
git add src/firebase src/demo
git commit -m "feat(dados): ler marcas e status legados; voltas ordenadas por data"
```

---

### Task 3: Escrita — registro, marcas, observação e contadores

**Files:**
- Modify: `src/firebase/houses.ts`, `src/demo/banco.ts` (tipos `Estado`, `semear`, e as mesmas funções)
- Test: `tests/data/houses.test.ts` (emulador), `src/demo/banco.test.ts`

**Interfaces:**
- Consumes: `deltaContadores`, `contribuicao`, `contadoresAposReinicio`, `idsParaReiniciar`, `vencimentoDoRegistro` (Task 1); `paraTimestamp`.
- Produces em `houses.ts` e no demo, com a mesma assinatura:
  - `registrarVisita(a: { cartao: Cartao; quadraId: string; rodada: number; casa: Casa; novoStatus: Status; usuario: Usuario } & OpcoesQuadra): Promise<void>` (sem `obs`; recusa com `Error('Casa marcada como não visitar')` se `casa.naoVisitar`; grava `expiraEm` na visita).
  - `marcarCasa(a: { cartaoId: string; quadraId: string; casa: Casa; marca: 'naoVisitar' | 'estudo'; ligada: boolean; usuario: Usuario } & OpcoesQuadra): Promise<void>`.
  - `salvarObservacao(a: { cartaoId: string; quadraId: string; casaId: string; ciclo: number; texto: string; usuario: Usuario }): Promise<void>`.
  - `criarCasa`, `excluirCasa`, `fecharEReiniciarCartao`, `recalcularContadores` mantêm a assinatura, com a conta nova.
- `Usuario = { uid: string; nome: string }`, `OpcoesQuadra = { quadraSemContadores?: boolean }` (já existem).

- [ ] **Step 1: Testes que falham** (nomes exatos em `tests/data/houses.test.ts`; o espelho em `banco.test.ts` repete os cenários com o demo):
  - `registrarVisita grava expiraEm dois anos depois e não aceita obs`: após registrar `falado`, a visita tem `expiraEm` ≈ `em` + 2 anos e nenhum campo `obs`.
  - `registrarVisita recusa casa marcada como não visitar`: rejeita com a mensagem acima e não grava nada.
  - `registrarVisita com carta e conversado soma em resolvidas; não em casa não soma`.
  - `marcarCasa naoVisitar numa casa Conversado tira da conta`: cartão `totalCasas` e `resolvidas` caem 1; quadra `totalCasas` cai 1 e `faltam` não muda; a casa guarda `naoVisitar:true`, `naoVisitarPor` e `naoVisitarEm`.
  - `marcarCasa naoVisitar numa casa Pendente`: cartão `totalCasas` −1; quadra `totalCasas` −1 e `faltam` −1.
  - `marcarCasa desmarcar devolve às contas` (inverso dos dois anteriores) e remove os três campos.
  - `marcarCasa repetida não conta duas vezes`: chamar com `ligada:true` quando `casa.naoVisitar` já é `true` não altera nenhum contador.
  - `marcarCasa estudo só grava a marca` (contadores intactos).
  - `quadraSemContadores` não toca na quadra em nenhuma marca.
  - `salvarObservacao grava visita sem status` com `obs`, `ciclo`, `expiraEm`, e **não** muda `status`, `ultimaVisitaEm` nem contadores; texto vazio ou só espaços rejeita com `Error('Observação vazia')`.
  - `criarCasa e excluirCasa respeitam a nova conta`: excluir casa `naoVisitar` não mexe em nenhum contador; criar casa com resultado `carta` soma resolvidas.
  - `fecharEReiniciarCartao`: todas as casas com status ≠ pendente voltam a `pendente` (inclusive as `naoVisitar`), as marcas ficam, `resolvidas` = 0, `totalCasas` do cartão e da quadra excluem as `naoVisitar`, `faltam` = `totalCasas` da quadra.
  - `recalcularContadores` usa a mesma conta.

- [ ] **Step 2: Rodar** `npx firebase emulators:exec --only auth,firestore,storage "npx vitest run tests/data/houses.test.ts"` e `npx vitest run src/demo` e ver FALHAR.

- [ ] **Step 3: Implementar em `houses.ts`** as assinaturas acima. Abordagem: todo ajuste de contador sai de `deltaContadores(antes, depois)` com `{status, naoVisitar}` da casa antes e depois (`null` para criar/excluir); o cartão recebe `increment` de `total` (em `totalCasas`) e `resolvidas`, a quadra de `total` (em `totalCasas`) e `faltam`, só se `!op.quadraSemContadores`. `marcarCasa` grava `{ [marca]: true, [marca+'Por']: usuario.nome, [marca+'Em']: agora }` ou `deleteField()` nos três, e é no-op quando `!!casa[marca] === ligada`. `salvarObservacao` cria o documento em `.../visits` sem `status`. Substitua nos demais pontos as chamadas a `isResolvida(status)`, `faltaVisitar(status)`, `deltaResolvidas` e `deltaFaltam` pelas funções novas.

- [ ] **Step 4: Espelhar no demo** (`src/demo/banco.ts`): mesmas funções e mesma conta; troque, em `semear`, os dados de `estudo` e `nao_visitar` por marcas (`estudo: true`, `naoVisitar: true`) com status `pendente`, e as visitas semente passam a ter `expiraEm`. O demo continua exportando as mesmas funções que `houses.ts` desvia com `demoAtivo()`.

- [ ] **Step 5: Rodar os comandos do Step 2 e ver PASSAR.** Rode também `npx vitest run tests/arquitetura.test.ts`.

- [ ] **Step 6: Commit**

```powershell
git add src/firebase src/demo tests/data
git commit -m "feat(dados): marcas da casa, observação e contagem sem as casas de não visitar"
```

---

### Task 4: Abrir o cartão zera as voltas

**Files:**
- Modify: `src/firebase/cards.ts`, `src/demo/banco.ts`, `src/features/cards/ConfirmarAbertura.tsx`, `src/features/cards/CartaoPage.tsx`, `src/features/admin/EstadoCartao.tsx`
- Test: `tests/data/cards.test.ts`, `src/demo/banco.test.ts`, `src/features/cards/CartaoPage.test.tsx`, `src/features/admin/EstadoCartao.test.tsx`

**Interfaces:**
- Consumes: `useQuadrasCarregadas(cartaoId): Quadra[] | null` (já existe em `src/features/cards/useCartao.ts`).
- Produces: `abrirCartaoManual(c: Cartao, usuario: Usuario, quadras: Pick<Quadra, 'id'>[]): Promise<void>` (também no demo); `ConfirmarAbertura` ganha a prop `quadras: Quadra[] | null`.

- [ ] **Step 1: Testes que falham.**
  - `tests/data/cards.test.ts` — `abrir o cartão zera as voltas de todas as quadras`: duas quadras com `rodadasTotal` 3 e 5, uma com `rodadaAtual`; depois de `abrirCartaoManual(c, u, quadras)` ambas têm `rodadasTotal: 0` e nenhuma tem `rodadaAtual`; o cartão fica `aberto` e o evento `abertura` existe; `abrirRodada` na primeira devolve volta de número 1.
  - Demo: o mesmo cenário.
  - `ConfirmarAbertura`: com `quadras={null}` o botão "Abrir cartão" fica desativado e não chama `abrirCartaoManual`; com a lista, chama com `(cartao, {uid,nome}, quadras)`.

- [ ] **Step 2: Rodar os testes e ver FALHAR** (`cards.test.ts` pelo comando de emulador; telas com `npx vitest run src/features`).

- [ ] **Step 3: Implementar** o reset no mesmo `writeBatch` da abertura: para cada quadra, `update(blocks/{id}, { rodadasTotal: 0, rodadaAtual: deleteField() })`. `CartaoPage` e `EstadoCartao` passam `quadras` carregadas (`CartaoPage` troca `useQuadras` por `useQuadrasCarregadas` e usa `quadras ?? []` onde precisa de lista).

- [ ] **Step 4: Rodar os testes do Step 2 e ver PASSAR.**

- [ ] **Step 5: Commit**

```powershell
git add src tests/data
git commit -m "feat(cartao): abrir o cartão zera as voltas das quadras"
```

---

### Task 5: Regras de segurança do Firestore

**Files:**
- Modify: `firestore.rules`
- Test: `tests/rules/firestore.rules.test.ts`

**Interfaces:**
- Produces: em `.../visits/{visitId}`, `allow update: if ehAdmin() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['expiraEm'])`; `allow delete: if false` permanece. Nenhuma outra regra muda: `expiraEm`, `naoVisitar`/`estudo` e visita sem `status` já passam nas regras atuais de `houses` (`ehMembro`) e `visits` (`porUid == auth.uid`).

- [ ] **Step 1: Testes que falham** (no estilo do arquivo, com `publisherDb()` e `adminDb()`):
  - `admin pode preencher expiraEm numa visita existente`: `assertSucceeds(updateDoc(.../visits/v1, { expiraEm: ts }))`.
  - `admin não altera outros campos da visita`: `assertFails(updateDoc(.../visits/v1, { status: 'carta' }))`.
  - `publicador não altera a visita nem o expiraEm`: `assertFails`.
  - `publicador cria observação sem status, com expiraEm`: `assertSucceeds(setDoc(.../visits/v9, { obs: 'voltar à tarde', porUid: 'publisher', porNome: 'Publicador', ciclo: 1, expiraEm: ts }))`.
  - `publicador marca a casa`: `assertSucceeds(updateDoc(.../houses/h1, { naoVisitar: true, naoVisitarPor: 'Publicador' }))`.
  - `publicador continua sem abrir cartão nem zerar voltas`: `assertFails(updateDoc(.../blocks/b1, { rodadasTotal: 0 }))` depois de gravar, com as regras desligadas, `rodadasTotal: 3` na quadra `b1` (o teste existente de "abrir/encerrar volta" segue valendo).

- [ ] **Step 2: Rodar** `npx firebase emulators:exec --only firestore,storage "npx vitest run tests/rules"` e ver FALHAR só o primeiro teste (os demais já passam: servem de rede de proteção).

- [ ] **Step 3: Implementar** a regra de `update` da visita para administrador conforme **Interfaces**.

- [ ] **Step 4: Rodar o mesmo comando e ver PASSAR** (incluindo os testes antigos de regras; o antigo `updateDoc(... visits/v1, { status: 'estudo' })` do publicador segue falhando).

- [ ] **Step 5: Commit**

```powershell
git add firestore.rules tests/rules
git commit -m "feat(regras): administrador preenche expiraEm nas visitas"
```

---

### Task 6: Visual dos status novos e selo das marcas

**Files:**
- Modify: `src/app/icones.tsx`, `src/app/styles.css`, `src/features/houses/rotuloCasa.ts`
- Create: `src/features/houses/SeloMarcas.tsx`, `src/features/houses/SeloMarcas.test.tsx`

**Interfaces:**
- Produces: ícones `nao-em-casa` e `carta` (cada um com forma própria e glifo: triângulo com porta, hexágono com envelope; `estudo` e `nao-visitar` já existem e passam a servir de selo); variáveis `--st-nao-em-casa` e `--st-carta` (claro e escuro) e classes `.c-nao-em-casa`, `.c-carta`; classe `.selo`; `SeloMarcas({ casa }: { casa: Pick<Casa, 'naoVisitar' | 'estudo'> }): JSX.Element | null`; `classeStatus(s: StatusVisita)` continua devolvendo `s.replace('_','-')`.

- [ ] **Step 1: Testes que falham** em `SeloMarcas.test.tsx`: sem marcas renderiza nada; com `naoVisitar` mostra o texto "Não visitar" e um ícone (`use[href="#i-nao-visitar"]`); com `estudo` mostra "Estudo" e `#i-estudo`; com as duas mostra as duas, `naoVisitar` primeiro.

- [ ] **Step 2: Rodar `npx vitest run src/features/houses/SeloMarcas.test.tsx` e ver FALHAR.**

- [ ] **Step 3: Implementar.** Escolha as cores no padrão dos tokens existentes (`--st-*`), uma para o tema claro e outra para o escuro, e confira contraste mínimo 4,5:1 contra a superfície de cada tema (nenhuma das duas pode ficar parecida com `--st-falado` verde ou `--st-sem-resposta` âmbar). `.selo` é um `span` com o ícone de 20px e o texto 16px, sem `font-weight` 700. Adicione `.casa.fora .rotulo { color: var(--texto-suave) }` (sem `opacity`, para manter o contraste).

- [ ] **Step 4: Rodar o teste e ver PASSAR.**

- [ ] **Step 5: Commit**

```powershell
git add src
git commit -m "feat(visual): ícones e cores de Não em casa e Carta; selo das marcas"
```

---

### Task 7: Tela principal da quadra

**Files:**
- Modify: `src/features/houses/QuadraPage.tsx`, `src/features/houses/CasaLinha.tsx`, `src/features/houses/NovaCasaSheet.tsx`
- Test: `src/features/houses/QuadraPage.test.tsx`, `src/features/houses/NovaCasaSheet.test.tsx`, `src/features/houses/CasaLinha.test.tsx` (novo)

**Interfaces:**
- Consumes: `podeRegistrarNaCasa`, `listaDeTrabalho`, `contaNoTotal`, `isResolvida`, `faltaVisitar` (Task 1); `SeloMarcas` (Task 6); `registrarVisita` sem `obs` (Task 3).
- Produces: `CasaLinha` mostra `SeloMarcas` e usa a classe `fora` quando `casa.naoVisitar`; `CasaAtencao` deixa de existir.

- [ ] **Step 1: Testes que falham.**
  - `QuadraPage`: a barra "Registrar visita" tem exatamente 4 botões com os nomes `Conversado`, `Não atendeu`, `Não em casa`, `Carta`; clicar em "Carta" chama `registrarVisita` com `novoStatus: 'carta'` e sem `obs`.
  - `QuadraPage`: com a casa em foco `naoVisitar`, os 4 botões têm `aria-disabled="true"`, clicar não chama `registrarVisita`, e aparece o texto "Pediu para não ser visitado. Desmarque nos detalhes para registrar".
  - `QuadraPage`: não existe a seção "Atenção"; uma casa `naoVisitar` aparece na lista no lugar normal, com o selo "Não visitar"; uma casa `estudo` e Pendente aparece com o selo "Estudo".
  - `QuadraPage`: o subtítulo e o progresso contam só casas que `contaNoTotal` (quadra com 3 casas, uma `naoVisitar` e uma `falado`: "1 de 2 resolvidas").
  - `QuadraPage`: o título de rua mostra "N para visitar" sem contar as casas `naoVisitar`.
  - `NovaCasaSheet`: a escolha de resultado oferece `Pendente`, `Conversado`, `Não atendeu`, `Não em casa`, `Carta` (sem Estudo nem Não visitar); o texto do botão e do aviso diz "volta" ("Abra a volta para registrar o que aconteceu", "Abrir volta").
  - `CasaLinha`: casa `naoVisitar` tem a classe `fora` e o selo; casa comum não tem.

- [ ] **Step 2: Rodar `npx vitest run src/features/houses` e ver FALHAR.**

- [ ] **Step 3: Implementar.** `STATUS_REGISTRAVEIS = ['falado','sem_resposta','nao_em_casa','carta']` na quadra e `RESULTADOS = ['pendente','falado','sem_resposta','nao_em_casa','carta']` na `NovaCasaSheet`. Em `QuadraPage`: `podeAnotar` usa `podeRegistrarNaCasa(cartao, quadra, foco)`; a lista "Trabalho" vem de `listaDeTrabalho` agrupada por rua (inclui as `naoVisitar`, que o modo "Todas" também mostra); `falta(c)` passa a ser `faltaVisitar(c)`; as contagens usam `casas.filter(contaNoTotal)`; remova `destacadas` e `CasaAtencao`.

- [ ] **Step 4: Rodar `npx vitest run src/features/houses` e ver PASSAR.**

- [ ] **Step 5: Commit**

```powershell
git add src/features/houses
git commit -m "feat(quadra): quatro opções de registro, selos das marcas e casas de não visitar fora da conta"
```

---

### Task 8: Detalhes da casa

**Files:**
- Modify: `src/features/houses/CasaPage.tsx`, `src/features/houses/HistoricoVisitas.tsx`
- Test: `src/features/houses/CasaPage.test.tsx`, `src/features/houses/HistoricoVisitas.test.tsx` (novo)

**Interfaces:**
- Consumes: `marcarCasa`, `salvarObservacao`, `observarVisitas` (`houses.ts`); `aindaNoHistorico`; `SeloMarcas`.
- Produces: `HistoricoVisitas({ visitas }: { visitas: Visita[] })` mostra visita sem `status` como "Observação" (ícone `info`) e o rótulo de volta como "Volta N".

- [ ] **Step 1: Testes que falham.**
  - `CasaPage`: não existe a região "Registrar visita" nem botões `Conversado`/`Carta`; não existe o texto "A observação vai junto com o próximo registro".
  - `CasaPage`: bloco "Sobre esta casa" com dois interruptores `role="switch"`, nomes "Pediu para não ser visitado" e "Aqui há um estudo de alguém", cada um com `aria-checked` coerente com `casa.naoVisitar` e `casa.estudo`.
  - `CasaPage`: tocar em "Aqui há um estudo de alguém" chama `marcarCasa` com `{ marca: 'estudo', ligada: true }` sem confirmação.
  - `CasaPage`: tocar em "Pediu para não ser visitado" abre uma confirmação (`role="dialog"`, nome "Marcar como não visitar") dizendo que a casa sai das contas e o registro trava; só "Marcar" chama `marcarCasa` com `{ marca: 'naoVisitar', ligada: true }`; "Cancelar" não chama. Desligar não pede confirmação.
  - `CasaPage`: com cartão `fechado` os dois interruptores e o botão "Salvar" da observação têm `aria-disabled="true"` e não chamam nada.
  - `CasaPage`: o aviso exato "Não anote nenhum dado pessoal: nem nomes, telefones ou documentos de moradores." aparece acima do campo "Observação"; "Salvar" com texto vazio ou só espaços não chama `salvarObservacao`; com texto chama `salvarObservacao({ ..., texto, ciclo: cartao.ciclo })` e limpa o campo.
  - `CasaPage`: o histórico não mostra visita de mais de 2 anos (sem `expiraEm`, `em` há 3 anos) e mostra a de 1 ano.
  - `HistoricoVisitas`: visita sem `status` aparece com o título "Observação" e o texto; visita com `status:'estudo'` (legado) aparece com o rótulo "Estudo"; `rodada: 2` aparece como "Volta 2".

- [ ] **Step 2: Rodar `npx vitest run src/features/houses/CasaPage.test.tsx src/features/houses/HistoricoVisitas.test.tsx` e ver FALHAR.**

- [ ] **Step 3: Implementar.** Remova de `CasaPage` os botões de registro, `registrar`, `enviar`, `falha` e `AvisoNaoEnviado`. Mantenha o resumo do status no alto e acrescente `SeloMarcas`. Os dois interruptores são botões de 48px com `role="switch"`. A confirmação de `naoVisitar` segue o padrão `veu`/`folha` do projeto. A escrita não espera resposta (offline só resolve com rede), como o `salvarEdicao` atual; falha mostra o aviso de erro existente. O histórico filtra com `aindaNoHistorico(v, Date.now())` dentro de `useVisitas`.

- [ ] **Step 4: Rodar os mesmos testes e ver PASSAR.**

- [ ] **Step 5: Commit**

```powershell
git add src/features/houses
git commit -m "feat(casa): marcas e observação nos detalhes; sem registro de visita; histórico de 2 anos"
```

---

### Task 9: "Volta" nos textos e histórico do cartão sem mistura

**Files:**
- Modify: `src/features/houses/FaixaRodada.tsx`, `src/features/houses/AvisoNaoEnviado.tsx`, `src/features/cards/CartaoPage.tsx`, `src/features/admin/HistoricoCartaoPage.tsx`, `src/features/admin/EstadoCartao.tsx`, `src/features/admin/textoEvento.ts`
- Test: `FaixaRodada.test.tsx`, `AvisoNaoEnviado` (dentro de `QuadraPage.test.tsx`/`CasaPage.test.tsx`), `CartaoPage.test.tsx`, `HistoricoCartaoPage.test.tsx`, `EstadoCartao.test.tsx`, `textoEvento.test.ts`

**Interfaces:**
- Produces: textos exatos — `Abrir volta`, `Encerrar volta`, `Nenhuma volta aberta`, `Volta N · aberta por X às HH:MM`, `Volta N · aberta em DD/MM por X`, `Volta aberta` (cartão), `Encerre as voltas abertas antes de fechar.`, `Volta aberta em: <quadras>.`, `Voltas por quadra` (histórico, nome da região `Voltas por quadra`), `Volta N`; `textoEvento`: `<nome> abriu a volta N da <quadra>`, `<nome> encerrou a volta N da <quadra>`; `tituloEvento`: `Volta aberta`, `Volta encerrada`.

- [ ] **Step 1: Testes que falham.** Atualize as expectativas dos arquivos de teste acima para os textos novos (nenhum texto visível pode conter "rodada"). Em `HistoricoCartaoPage.test.tsx`, novo teste `não mistura duas volta 1 da mesma quadra`: eventos da quadra Q1 em ordem cronológica `aberta 1`, `encerrada 1`, `aberta 1` (outra abertura do cartão, data posterior), `encerrada 1` produzem **duas** entradas "Volta 1", a mais recente primeiro, cada uma com seu par de abertura/encerramento; `aberta 1` seguida de `aberta 2` sem encerramento mantém as duas.

- [ ] **Step 2: Rodar `npx vitest run src/features` e ver FALHAR.**

- [ ] **Step 3: Implementar** a troca de texto e, em `rodadasPorQuadra` (`HistoricoCartaoPage.tsx`), trocar o agrupamento por número (`Map<number, …>`) por varredura em ordem cronológica de `em`: cada `rodada_aberta` cria uma entrada nova; `rodada_encerrada` fecha a entrada mais recente da mesma quadra com o mesmo `numero` ainda sem encerramento. A saída é ordenada por `abertaEm` decrescente (entrada sem abertura conhecida usa o `em` do encerramento).

- [ ] **Step 4: Verificar que não sobrou "rodada" visível:** busque `rodada` (sem diferenciar maiúsculas) em `src`, fora dos arquivos `*.test.*`, com a ferramenta de busca do ambiente (Grep), e confira que todo resultado é identificador de código, nunca texto entre aspas ou JSX.

- [ ] **Step 5: Rodar `npx vitest run src` e ver PASSAR.**

- [ ] **Step 6: Commit**

```powershell
git add src
git commit -m "feat(voltas): nome volta na interface e histórico do cartão sem mistura de voltas"
```

---

### Task 10: "Fechar cartão" à mão do administrador

**Files:**
- Create: `src/features/cards/BotaoFecharCartao.tsx`, `src/features/cards/ConfirmarFechamento.tsx`, `src/features/admin/ConfirmarReinicio.tsx`, `src/features/admin/useCasasDoCartao.ts`
- Modify: `src/features/admin/EstadoCartao.tsx`, `src/features/cards/CartaoPage.tsx`, `src/features/houses/QuadraPage.tsx`
- Test: `src/features/cards/BotaoFecharCartao.test.tsx`, `src/features/cards/ConfirmarFechamento.test.tsx`, `src/features/admin/EstadoCartao.test.tsx`, `CartaoPage.test.tsx`, `QuadraPage.test.tsx`

**Interfaces:**
- Consumes: `fecharCartaoManual(c, usuario, quadras)` (`cards.ts`), `encerrarRodada(cartaoId, quadra, usuario)` (`rodadas.ts`), `fecharEReiniciarCartao`, `podeFecharCartao`, `quadrasComRodadaAberta`; `useQuadrasCarregadas`.
- Produces: `BotaoFecharCartao({ cartao, quadras }: { cartao: Cartao; quadras: Quadra[] | null })` — só renderiza para administrador com cartão aberto; `ConfirmarFechamento({ cartao, quadras, usuario, onFechar, onReiniciar, onErro })`; `ConfirmarReinicio` e `useCasasDoCartao(cartaoId: string, quadras: Quadra[]): Casa[]` movidos de `EstadoCartao.tsx` sem mudar o comportamento (a assinatura de `ConfirmarReinicio` troca `casas` por leitura própria via `useCasasDoCartao`, para só ler as casas quando a folha abre).

- [ ] **Step 1: Testes que falham.**
  - `BotaoFecharCartao`: administrador + cartão aberto mostra o botão "Fechar cartão"; publicador, ou cartão fechado, não mostra nada.
  - `ConfirmarFechamento` sem volta aberta: mostra "Fechar o cartão 12? As voltas recomeçam na próxima abertura."; "Fechar cartão" chama `fecharCartaoManual` com o usuário e fecha a folha; há um botão secundário "Fechar e reiniciar" que chama `onReiniciar`.
  - `ConfirmarFechamento` com volta aberta na "Quadra 3": mostra "Volta aberta em: Quadra 3."; o botão passa a ser "Encerrar voltas e fechar" e chama `encerrarRodada` para cada quadra com volta aberta e só depois `fecharCartaoManual` com as quadras já sem `rodadaAtual`; se `encerrarRodada` rejeitar, **não** chama `fecharCartaoManual` e chama `onErro`.
  - `CartaoPage` e `QuadraPage`: administrador vê "Fechar cartão" no alto com o cartão aberto; publicador não vê.
  - `EstadoCartao`: continua com "Fechar cartão", "Fechar e reiniciar", "Abrir cartão" e "Recalcular contadores"; o texto de "Fechar e reiniciar" diz "volta a Pendente" e que as marcas ficam; a confirmação de reinício conta casas fora das `naoVisitar` ("As N casas voltam a Pendente. As marcas de Não visitar e Estudo continuam.").

- [ ] **Step 2: Rodar `npx vitest run src/features` e ver FALHAR.**

- [ ] **Step 3: Implementar.** `BotaoFecharCartao` abre `ConfirmarFechamento`; "Fechar e reiniciar" fecha essa folha e abre `ConfirmarReinicio`. As escritas não bloqueiam a tela (padrão `gravar` de `EstadoCartao`): falha mostra o aviso "Não foi possível salvar" existente. Em `QuadraPage`/`CartaoPage` o botão fica no bloco do topo, abaixo do título, com `minHeight` 48.

- [ ] **Step 4: Rodar `npx vitest run src` e ver PASSAR.**

- [ ] **Step 5: Commit**

```powershell
git add src
git commit -m "feat(cartao): botão Fechar cartão no topo do cartão e da quadra, só para administradores"
```

---

### Task 11: Migração "Atualizar dados" e guia do TTL

**Files:**
- Create: `src/firebase/migracao.ts` (no modo demo a ação não grava nada, ver Step 3), `docs/ttl-historico.md`
- Modify: `src/features/admin/EstadoCartao.tsx`, `README.md`
- Test: `tests/data/migracao.test.ts` (emulador), `src/features/admin/EstadoCartao.test.tsx`

**Interfaces:**
- Consumes: `casaDe`, `contribuicao`, `vencimentoDoRegistro`, `recalcularContadores(cartaoId)`; `getDocsFromServer`.
- Produces: `atualizarDadosDoCartao(cartaoId: string, usuario: { nome: string }): Promise<{ casas: number; visitas: number }>` — idempotente.

- [ ] **Step 1: Testes que falham** (`tests/data/migracao.test.ts`):
  - casas gravadas com `status:'estudo'` e `'nao_visitar'` viram `status:'pendente'` com `estudo:true` / `naoVisitar:true` (`estudoPor`/`naoVisitarPor` = nome do administrador, `...Em` preenchido); `falado` e `sem_resposta` não mudam.
  - visitas sem `expiraEm` recebem `em` + 2 anos; visitas que já têm não mudam.
  - depois da migração `totalCasas` do cartão e da quadra não contam as `naoVisitar` e `resolvidas`/`faltam` batem com a conta nova.
  - rodar duas vezes: o segundo retorno é `{ casas: 0, visitas: 0 }` e nada é regravado (documentos e contadores iguais).
  - `EstadoCartao`: botão "Atualizar dados" (precisa de internet, como "Recalcular contadores"; desativado offline), chama `atualizarDadosDoCartao(cartao.id, { nome })` e mostra o resumo "N casas e M visitas atualizadas." ou "Nada para atualizar."

- [ ] **Step 2: Rodar** `npx firebase emulators:exec --only auth,firestore,storage "npx vitest run tests/data/migracao.test.ts"` e `npx vitest run src/features/admin/EstadoCartao.test.tsx` e ver FALHAR.

- [ ] **Step 3: Implementar.** Leia casas e visitas **do servidor** (`getDocsFromServer`), nunca do cache. Atualize em lotes de 400 (`LOTE` de `houses.ts`). Chame `recalcularContadores(cartaoId)` no fim. No modo demo a função devolve `{ casas: 0, visitas: 0 }` sem gravar. Escreva `docs/ttl-historico.md` com o passo do usuário: console do Firebase → Firestore → aba "Time to live" → criar política com grupo de coleções `visits` e campo `expiraEm`; avisa que o apagamento pode levar cerca de 1 dia, é definitivo e que o app já esconde o vencido. No `README.md`, acrescente a ordem de publicação: publicar o app novo, rodar "Atualizar dados" em cada cartão, ligar o TTL.

- [ ] **Step 4: Rodar os comandos do Step 2 e ver PASSAR.**

- [ ] **Step 5: Commit**

```powershell
git add src tests/data docs/ttl-historico.md README.md
git commit -m "feat(migracao): ação Atualizar dados para marcas e vencimento; guia do TTL"
```

---

### Task 12: Fechamento — e2e, verificação completa e revisão de simplicidade

**Files:**
- Modify: `tests/e2e/offline.spec.ts`, `tests/e2e/seed.ts`, `tests/e2e/abrir-offline.spec.ts` (só o que citar status ou textos antigos)
- Create: `docs/superpowers/plans/2026-11-12-revisao-simplicidade.md` (lista, sem código)

**Interfaces:**
- Consumes: tudo acima.

- [ ] **Step 1: Atualizar os e2e para os textos e dados novos.** Os nomes visíveis passam a "Abrir volta", "Encerrar volta", "Nenhuma volta aberta", "Volta 2 · aberta por", "Voltas por quadra", "Encerre as voltas abertas antes de fechar."; casas semente com `nao_visitar` passam a `status:'pendente'` + `naoVisitar:true`; a asserção do reinício (`casas` com `h3: 'nao_visitar'`) passa a esperar `h3: 'pendente'` com `naoVisitar: true`; o fluxo do registro usa a região "Registrar visita" só na tela da quadra.

- [ ] **Step 2: Verificação completa**, cada comando com saída conferida:
  - `npm test` → todos passam.
  - `npm run lint` → sem erros.
  - `npm run build` → compila sem erros de tipo.
  - `npx firebase emulators:exec --only auth,firestore,storage "npx vitest run tests/data"` → passa.
  - `npx firebase emulators:exec --only firestore,storage "npx vitest run tests/rules"` → passa.
  - `npm run e2e` → passa; se o Chromium do Playwright não estiver instalado, informe que não foi verificado.

- [ ] **Step 3: Procurar sobras** com a ferramenta de busca (Grep): `estudo|nao_visitar` em `src`, fora de `*.test.*`, só pode aparecer em rótulos legados (`rotulos.ts`), tipo `StatusVisita`, conversor `casaDe`, migração, ícones e selos. `isResolvida\(|faltaVisitar\(` em `src` só com a casa inteira como argumento (nunca `.status`).

- [ ] **Step 4: Escrever a lista de revisão de simplicidade** (spec, "etapa 6"): passe pelos fluxos mais usados (registrar na rua, abrir a quadra, abrir/encerrar volta, fechar cartão, ver detalhes) com o app em modo demo (`npm run dev`), e liste, em até 10 linhas, o que ainda exige mais de um toque, tem texto longo ou fica escondido. Não implemente nada dessa lista.

- [ ] **Step 5: Commit**

```powershell
git add tests/e2e docs/superpowers/plans/2026-11-12-revisao-simplicidade.md
git commit -m "test(e2e): textos de volta e marcas; lista de revisão de simplicidade"
```
