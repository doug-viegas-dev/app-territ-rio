# Protótipo estático · Meu Território

HTML e CSS puros, sem bibliotecas. Abra `index.html` no navegador (funciona direto do disco; fonte Nunito Sans vem do Google Fonts).

- `index.html`: miniaturas das 10 telas + componentes, com chave claro/escuro.
- `01-…` a `10-…`: as 10 telas do briefing. `componentes.html`: botão de status, linha de casa, chip, progresso, avisos, botões, campos, texto.
- `css/app.css`: tokens da identidade como variáveis (`:root` claro, `:root[data-tema="escuro"]` escuro) e todos os componentes.
- `js/app.js`: só para o protótipo (tema, ícones, estados). Não faz parte do app.
- `direcoes-quadra.html`: as 3 direções comparadas; escolhida: **C · Barra fixa na base**.

## Estados de cada tela
Em tela larga, painel à esquerda lista os estados. Em qualquer largura: `?v=nome` e `?tema=escuro` no endereço (ex.: `05-quadra.html?v=offline&tema=escuro`).

## Decisões que o código deve manter
- Status sempre com cor + forma + nome. Pendente: círculo tracejado neutro.
- Âmbar só como fundo: barra de progresso, botão “+ casa”, sublinhado do item ativo, caminho do ícone.
- Alvos de toque ≥ 48px, texto ≥ 16px. Verificado por script em 390px, claro e escuro, em todos os estados.
- Cores do tema escuro (definidas aqui, a identidade só mostra a imagem): Conversado `#7FD1AE`, Não atendeu `#EDBB62`, Estudo `#C3A5E6`, Não visitar `#EE9E98`; superfície `#212839`; principal `#8FA0CC`.
- Erro usa ícone de triângulo e `--cor-erro` (mesmo vermelho do Não visitar), sem usar a forma octogonal.
- O ícone do app em `#i-logo` (js/app.js) é uma aproximação; os SVG-mestre estão em `design/identidade/icone.svg` e `icone-maskable.svg`, e os PNG saem do script da Task 16 do plano.
- Qualquer publicador pode criar rua (chip "Nova rua" na tela Nova casa; o administrador também tem "Adicionar rua" em Quadras e ruas). Decisão do usuário. Já refletido no spec (seções 2, 5 e 9) e no plano (Tasks 5, 6 e 11).
- Histórico de abertura e fechamento (`11-historico.html`, só administradores): últimos 10 registros por cartão, com data, hora e quem (ou "Automático" + quem registrou a última casa). Spec §4 e plano Tasks 6, 7 e 15b já preveem o log, p. ex. `cards/{c}/events { tipo: "aberto"|"fechado", motivo: "automatico"|"manual"|"reinicio"|"reabertura"|"criacao", em, porUid, porNome }`, gravado no mesmo batch que muda `estado`. 
- Para trabalhar um cartão, alguém precisa **abri-lo** e isso fica registrado com o nome (decisão do usuário). Cartão novo nasce fechado; "Abrir cartão" tem confirmação ("Fica registrado que foi você…"); o cartão aberto mostra "Aberto por… em…". **Só administradores abrem cartões** (decisão do usuário); o publicador vê o cartão fechado com "Peça a um administrador" e sem botão. Isso condiz com o spec (só admin reabre). O mesmo nome de ação ("Abrir cartão") vale na Quadra, na Casa, no Cartão e na Administração.
