# Blocos para o Codex — depois da Tarefa 4

Cada bloco é **uma sessão nova** do Codex, na pasta raiz do projeto: cole o texto da caixa inteira. O Codex lê `AGENTS.md` sozinho. Entre um bloco e o próximo, **confira** (comandos e o que olhar estão abaixo de cada caixa) e só então abra o seguinte. Se um bloco falhar, abra uma sessão só para o conserto, citando o teste que falha.

Os blocos respeitam a ordem de dependência do plano. Tarefas que mexem no mesmo arquivo (11 e 12 em `QuadraPage.tsx`) ficam no mesmo bloco, em sequência.

| Bloco | Tarefas | Assunto |
|---|---|---|
| 1 | 5 e 6 | Regras de segurança e dados de cartões, quadras, ruas e eventos |
| 2 | 7 | Casas, visitas, ordem e reinício (a mais sensível) |
| 3 | 8 e 9 | Shell, lista de cartões e tela do cartão |
| 4 | 10 | Quadra e registro com um toque |
| 5 | 11 e 12 | Cadastro de casas (com "Nova rua") e reordenar |
| 6 | 13 e 14 | Tela da casa e admin (membros, cartões, PDF) |
| 7 | 15 e 15b | Admin: ciclo e histórico de abertura |
| 8 | 16 | PWA, ícones e instalação |
| 9 | 17 | E2E offline (sem deploy) |
| 10 | revisão | Revisão final |

---

## Bloco 1 — Tarefas 5 e 6

```
Leia AGENTS.md e o plano docs/superpowers/plans/2026-11-06-app-territorios.md (cabeçalho, Global Constraints, Review Focus, tabela de referência visual e as tarefas abaixo). Não faça brainstorming nem proponha novo design.

Execute, nesta ordem, as Tarefas 5 e 6 do plano. Para cada uma: confira os pré-requisitos, siga os steps na ordem (teste falhando, implementação, teste passando) e faça um commit por tarefa. Só passe à próxima se os testes da anterior passarem; se falharem, pare e me mostre. Não adiante outras tarefas, não refatore tarefas anteriores e não altere docs/ nem design/. Para nomes e assinaturas de tarefas anteriores, leia o código existente.

Atenção na Tarefa 5: Review Focus 4, 6 e 7 (publicador nunca abre cartão; só acrescenta rua; eventos só o admin lê; as regras NÃO bloqueiam visita nem casa em cartão fechado). Na Tarefa 6: cartão novo nasce fechado, com evento de criação; abrir e fechar gravam o evento no mesmo batch.

No final, rode os comandos de teste de cada tarefa, informe o resultado real (inclusive falhas) e liste o que ficou pendente ou não verificado.
```

Conferir: `npx firebase emulators:exec --only firestore,storage "npx vitest run tests/rules"` e `npx firebase emulators:exec --only firestore "npx vitest run tests/data/cards.test.ts"` passam; 2 commits novos.

---

## Bloco 2 — Tarefa 7

```
Leia AGENTS.md e o plano docs/superpowers/plans/2026-11-06-app-territorios.md (cabeçalho, Global Constraints, Review Focus, tabela de referência visual e a Tarefa 7). Não faça brainstorming nem proponha novo design.

Execute a Tarefa 7 do plano, seguindo os steps na ordem (teste falhando, implementação, teste passando, commit). Confira os pré-requisitos antes. Não adiante outras tarefas, não refatore tarefas anteriores e não altere docs/ nem design/. Leia o código existente das Tarefas 2, 3 e 6 em vez de supor assinaturas.

É a tarefa mais sensível. Confira especialmente: contadores (resolvidas e totalCasas), fechamento automático (estado, ciclo absolutos e o evento "fechamento_automatico" com o nome de quem registrou), registrarVisita lançando erro em cartão fechado, ordem das casas (Review Focus 3), reinício gravando o evento "reinicio" e abertoPorNome/abertoEm.

No final, rode `npx firebase emulators:exec --only firestore "npx vitest run tests/data/houses.test.ts"`, informe o resultado real (inclusive falhas) e liste o que ficou pendente ou não verificado.
```

Conferir: o teste acima passa; peça ao Codex, se quiser, "mostre o diff de `registrarVisita`" e confira que o batch grava visita, casa, contador e (se for o caso) fechamento e evento juntos.

---

## Bloco 3 — Tarefas 8 e 9

```
Leia AGENTS.md e o plano docs/superpowers/plans/2026-11-06-app-territorios.md (cabeçalho, Global Constraints, Review Focus, tabela de referência visual e as tarefas abaixo). Não faça brainstorming nem proponha novo design.

Execute, nesta ordem, as Tarefas 8 e 9 do plano. Para cada uma: confira os pré-requisitos, siga os steps na ordem (teste falhando, implementação, teste passando) e faça um commit por tarefa. Só passe à próxima se os testes da anterior passarem. Não adiante outras tarefas, não refatore tarefas anteriores e não altere docs/ nem design/. Leia o código existente em vez de supor assinaturas.

São tarefas de tela: abra design/prototipo/03-cartoes.html, componentes.html e css/app.css (Tarefa 8) e 04-cartao.html (Tarefa 9) no navegador e reproduza layout, textos e estados (vazio, carregando, sem internet, cartão fechado com "Abrir cartão" só para admin), claro e escuro. Copie os tokens e componentes de design/prototipo/css/app.css para src/app/styles.css; não use design/prototipo/js/app.js. Faça também os "Acertos nas telas da Task 4" descritos no Step 3 da Tarefa 8 (estilos de LoginPage para styles.css, ícone copiado para src/assets, "Só para administradores" para membro ativo sem papel, esqueleto no carregamento).

No final, rode os testes de cada tarefa e `npm run build`, informe o resultado real e liste o que ficou pendente ou não verificado.
```

Conferir: `npx vitest run src/features/cards` passa; rode `npm run dev` e compare com `design/prototipo/index.html` em 390px, claro e escuro.

---

## Bloco 4 — Tarefa 10

```
Leia AGENTS.md e o plano docs/superpowers/plans/2026-11-06-app-territorios.md (cabeçalho, Global Constraints, Review Focus, tabela de referência visual e a Tarefa 10). Não faça brainstorming nem proponha novo design.

Execute a Tarefa 10 do plano, seguindo os steps na ordem (teste falhando, implementação, teste passando, commit). Confira os pré-requisitos antes. Não adiante outras tarefas, não refatore tarefas anteriores e não altere docs/ nem design/. Leia o código existente em vez de supor assinaturas.

É a tela mais importante do app. Reproduza design/prototipo/05-quadra.html (direção "barra fixa na base") com todos os estados: Trabalho e Todas, sem internet, erro ao enviar, cartão fechado (administrador e publicador), quadra sem casas; claro e escuro. Registrar visita é um toque, o foco passa para a próxima casa, alvos ≥ 48px.

No final, rode `npx vitest run src/features/houses` e `npm run build`, informe o resultado real e liste o que ficou pendente ou não verificado.
```

Conferir: testes passam; no `npm run dev`, compare lado a lado com `05-quadra.html` (estados no painel do protótipo).

---

## Bloco 5 — Tarefas 11 e 12

```
Leia AGENTS.md e o plano docs/superpowers/plans/2026-11-06-app-territorios.md (cabeçalho, Global Constraints, Review Focus, tabela de referência visual e as tarefas abaixo). Não faça brainstorming nem proponha novo design.

Execute, nesta ordem, as Tarefas 11 e 12 do plano (ambas mexem em QuadraPage.tsx, por isso em sequência). Para cada uma: confira os pré-requisitos, siga os steps na ordem (teste falhando, implementação, teste passando) e faça um commit por tarefa. Só passe à próxima se os testes da anterior passarem. Não adiante outras tarefas, não refatore tarefas anteriores e não altere docs/ nem design/. Leia o código existente em vez de supor assinaturas.

Reproduza design/prototipo/06-nova-casa.html (inclui o chip "Nova rua", o aviso de número repetido, a aba Faixa e o estado "Casa salva") e 07-reordenar.html (alça, subir/descer, "Mover para outra rua", "Adicionar depois desta"); claro e escuro.

No final, rode `npx vitest run src/features/houses` e `npm run build`, informe o resultado real e liste o que ficou pendente ou não verificado.
```

Conferir: testes passam; teste no navegador: criar uma rua nova, cadastrar uma casa nela, cadastrar por faixa, reordenar com as setas.

---

## Bloco 6 — Tarefas 13 e 14

```
Leia AGENTS.md e o plano docs/superpowers/plans/2026-11-06-app-territorios.md (cabeçalho, Global Constraints, Review Focus, tabela de referência visual e as tarefas abaixo). Não faça brainstorming nem proponha novo design.

Execute, nesta ordem, as Tarefas 13 e 14 do plano. Para cada uma: confira os pré-requisitos, siga os steps na ordem (teste falhando, implementação, teste passando) e faça um commit por tarefa. Só passe à próxima se os testes da anterior passarem. Não adiante outras tarefas, não refatore tarefas anteriores e não altere docs/ nem design/. Leia o código existente em vez de supor assinaturas.

Reproduza design/prototipo/08-casa.html (com histórico, casa sem número, sem histórico, editar, cartão fechado) e 09-admin.html (membros, novo cartão com aviso de PDF de várias páginas, quadras e ruas com "Adicionar rua"); claro e escuro. A Tarefa 14 usa pdfjs: confira o Review Focus 5.

No final, rode `npx vitest run src/features/houses src/features/admin` e `npm run build`, informe o resultado real e liste o que ficou pendente ou não verificado.
```

Conferir: testes passam. Depois, **você** testa a importação com um PDF real de cartão.

---

## Bloco 7 — Tarefas 15 e 15b

```
Leia AGENTS.md e o plano docs/superpowers/plans/2026-11-06-app-territorios.md (cabeçalho, Global Constraints, Review Focus, tabela de referência visual e as tarefas abaixo). Não faça brainstorming nem proponha novo design.

Execute, nesta ordem, as Tarefas 15 e 15b do plano. Para cada uma: confira os pré-requisitos, siga os steps na ordem (teste falhando, implementação, teste passando) e faça um commit por tarefa. Só passe à próxima se os testes da anterior passarem. Não adiante outras tarefas, não refatore tarefas anteriores e não altere docs/ nem design/. Leia o código existente em vez de supor assinaturas.

Reproduza a parte "Ciclo" de design/prototipo/09-admin.html (abrir, fechar, reiniciar com a confirmação e a caixa "Entendo que o cartão começa um novo ciclo", recalcular) e design/prototipo/11-historico.html (últimos 10 registros, troca de cartão, vazio, carregando, sem permissão); claro e escuro. Só administradores abrem cartões e veem o histórico.

No final, rode `npx vitest run src/features/admin` e `npm run build`, informe o resultado real e liste o que ficou pendente ou não verificado.
```

Conferir: testes passam; no navegador, como admin: abrir um cartão (confirmação com seu nome), registrar uma visita, ver o registro no histórico.

---

## Bloco 8 — Tarefa 16

```
Leia AGENTS.md e o plano docs/superpowers/plans/2026-11-06-app-territorios.md (cabeçalho, Global Constraints, Review Focus, tabela de referência visual e a Tarefa 16). Não faça brainstorming nem proponha novo design.

Execute a Tarefa 16 do plano, seguindo os steps na ordem (teste falhando, implementação, teste passando, commit). Confira os pré-requisitos antes. Não adiante outras tarefas, não refatore tarefas anteriores e não altere docs/ nem design/ (os SVG-mestre de design/identidade/ são só entrada do script de ícones).

Reproduza design/prototipo/10-instalar.html e o aviso de instalação de 03-cartoes.html: no Android o botão "Instalar app" (evento beforeinstallprompt), o estado "App instalado" e o caminho pelo menu do Chrome; no iPhone o passo a passo. Gere os ícones PNG com scripts/gerar-icones.mjs.

No final, rode `npx vitest run src/pwa && npm run build`, confirme que dist/sw.js e public/icons/ (3 PNG) existem, informe o resultado real e liste o que ficou pendente ou não verificado.
```

Conferir: testes e build passam; abra os PNG de `public/icons/` e compare com a identidade. O botão "Instalar app" **você** confere num Android real depois do deploy.

---

## Bloco 9 — Tarefa 17 (sem deploy)

```
Leia AGENTS.md e o plano docs/superpowers/plans/2026-11-06-app-territorios.md (cabeçalho, Global Constraints, Review Focus, tabela de referência visual e a Tarefa 17). Não faça brainstorming nem proponha novo design.

Execute a Tarefa 17 do plano, steps 1 a 4. Pare antes do deploy (step 5) e me avise. Confira os pré-requisitos antes (Tarefas 1 a 16 concluídas e Java instalado). Não refatore tarefas anteriores além do necessário para corrigir o que o E2E expuser (e, nesse caso, registre o bug em teste de unidade da camada correspondente) e não altere docs/ nem design/.

No final, rode `npx firebase emulators:exec "npx playwright test"`, informe o resultado real (inclusive falhas) e liste o que ficou pendente ou não verificado.
```

Conferir: o comando acima passa. **Você** faz o deploy (step 5) e o teste em Android e iPhone reais: instalar, abrir um cartão, desligar a internet, registrar visita, religar.

---

## Bloco 10 — Revisão final

```
Revise o projeto inteiro contra o spec docs/superpowers/specs/2026-11-06-app-territorios-design.md, a seção Review Focus do plano docs/superpowers/plans/2026-11-06-app-territorios.md e as telas de design/prototipo/ (cada estado: vazio, carregando, sem internet, erro, cartão fechado). Foque em: regras de segurança, contadores de progresso, fechamento automático, ordem das casas, abertura de cartão só por admin e funcionamento offline. Liste os problemas por gravidade e não corrija sem eu pedir.
```
