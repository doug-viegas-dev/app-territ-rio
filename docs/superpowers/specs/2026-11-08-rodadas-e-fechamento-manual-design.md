# Rodadas, fechamento manual e admin reorganizado — design

Data: 2026-11-08. Complementa `2026-11-06-app-territorios-design.md`. Em caso de conflito, vale este documento para os pontos abaixo.

## Objetivo

O primeiro levantamento cadastra as casas e registra o resultado ao mesmo tempo. Depois a congregação volta só às casas que não foram faladas, em **rodadas** registradas por quadra. O cartão nunca fecha sozinho. A administração fica mais simples de navegar.

## Decisões já aprovadas

- Palavra da interface: **rodada** (não "passada" nem "volta"). A aba "Ciclo" passa a se chamar **Histórico**.
- Rodada é por **quadra**, tem abrir e encerrar manuais, e cada um grava quem fez e quando. Acontece em um único dia.
- **Qualquer membro** abre e encerra rodada.
- "Não foi falado" = status Pendente ou Sem resposta. Estudo e Não visitar continuam em "Atenção".
- Fechar o cartão é sempre manual. Fechar e reiniciar deixa o cartão **fechado**, com as casas Pendentes (menos Não visitar), ciclo + 1, e fica no Histórico.

## Parte 1 — Rodadas e ciclo do cartão

### Dados
- `cards/{cartaoId}/blocks/{quadraId}/rodadas/{id}`: `numero`, `abertaPorUid`, `abertaPorNome`, `abertaEm`, `encerradaPorUid?`, `encerradaPorNome?`, `encerradaEm?`.
- Quadra: `rodadaAtual?: { id, numero, porNome, em }` (cópia da rodada aberta, para a tela não precisar de outra leitura), `rodadasTotal` (último número usado), `totalCasas`, `faltam`.
- Visita: novo campo `rodada` (número), ao lado de `ciclo`.
- Evento do cartão: novo motivo `fechamento_reinicio`; `fechamento_automatico` deixa de ser gerado, mas o texto antigo continua exibido.
- Abrir e encerrar rodada também grava um evento em `eventos` do cartão (`tipo: 'rodada'`, `motivo: 'rodada_aberta' | 'rodada_encerrada'`, com `quadraId`, `quadraRotulo`, `rodada`, quem e quando). É assim que aparecem no Histórico, sem consulta entre coleções. O limite de eventos lidos sobe de 10 para 50.
- Fechar e reiniciar grava **um** evento `fechado` com motivo `fechamento_reinicio` ("X fechou e reiniciou o território").

### Regras (funções puras em `src/domain/rodada.ts`, com testes)
- Abrir: só sem rodada aberta na quadra; número = `rodadasTotal + 1`.
- Encerrar: só com rodada aberta.
- Registrar visita exige cartão aberto **e** rodada aberta; sem rodada, a tela oferece "Abrir rodada".
- Rodada de outro dia continua aberta e mostra "aberta em dd/mm". Nada fecha à meia-noite.
- Segurança: escrita em `rodadas` liberada a membros liberados, como as visitas. A trava de cartão aberto continua só na interface. Duas pessoas abrindo a mesma quadra ao mesmo tempo: as regras só deixam definir `rodadaAtual` quando ela está vazia e `rodadasTotal` sobe de 1 em 1, então a segunda tentativa é negada. Publicadores passam a poder atualizar nas quadras só `ruas` (sem remover), `totalCasas`, `faltam`, `rodadaAtual` e `rodadasTotal`; no cartão, só `resolvidas`, `totalCasas` e `atualizadoEm`. Só administradores mudam o estado do cartão.

### Ciclo do cartão
- `deveFecharAuto` deixa de ser usado em `registrarVisita` (Firebase e demo). Resolver a última casa não fecha o cartão.
- `fecharCartao` **não** sobe o ciclo; só o reinício sobe.
- Fechar e reiniciar: um lote que grava evento `fechado` (`fechamento_reinicio`), volta as casas a Pendente (menos Não visitar), sobe o ciclo, recalcula `faltam` de cada quadra (total menos as casas Não visitar) e deixa `estado: fechado`. Um administrador abre depois.
- Fechar (só fechar) e Fechar e reiniciar ficam **bloqueados** enquanto houver rodada aberta em qualquer quadra: "Encerre as rodadas abertas antes de fechar."
- `reiniciarCartaoEstado` e `contadoresSuspeitos` são ajustados (o último não considera mais "tudo resolvido e aberto" como suspeito).

## Parte 2 — Cadastro com resultado e lista do que falta

### Nova casa
- Aba "Uma casa": linha "O que aconteceu" com Pendente (padrão), Falado, Sem resposta, Estudo, Não visitar, cada um com cor + forma + nome (rótulos de `rotulos.ts`).
- Casa e primeira visita (com `ciclo` e `rodada`) no **mesmo lote**, atualizando `resolvidas` do cartão e `faltam` da quadra.
- Sem rodada aberta: a linha fica desativada, com "Abra a rodada para registrar o que aconteceu" e botão "Abrir rodada"; a casa é salva como Pendente.
- "Salvar e adicionar outra" mantém a rua e volta o resultado para Pendente. A aba "Faixa" segue criando Pendentes.

### Quadra
- Faixa no topo: "Rodada N · aberta por Nome às hh:mm" + **Encerrar rodada**, ou "Nenhuma rodada aberta" + **Abrir rodada**; "aberta em dd/mm" se for de outro dia.
- "Trabalho" mostra Pendente e Sem resposta, com "Atenção" para Estudo e Não visitar. Sem nada a visitar: "Nada para visitar nesta quadra" com atalho para "Todas".
- Sem rodada aberta, os botões de status ficam bloqueados (mesmo padrão do cartão fechado).

### Cartão
- Por padrão lista só quadras com casas para visitar (`faltam > 0`), com "N para visitar" e etiqueta "Rodada aberta". Quadras sem nenhuma casa continuam visíveis. Botão "Mostrar todas as quadras".
- Contadores `totalCasas` e `faltam` na quadra, mantidos nos lotes de criar casa, excluir casa, registrar visita e reiniciar. "Recalcular contadores" também os corrige (lê do servidor, como hoje).

## Parte 3 — Administração

- **Cartões**: lista de cartões (número, título, Aberto/Fechado, quadras, casas que faltam) e botão **Novo cartão** que abre `CartaoForm` numa folha. Tocar numa linha abre a tela do cartão.
- **Tela do cartão** (`/admin/cartao/:id`), com voltar para a lista e blocos recolhíveis: Estado (Abrir, Fechar, Fechar e reiniciar, Recalcular contadores), Quadras e ruas (de `QuadrasAdmin`, só deste cartão), atalho ao Histórico.
- **Histórico** (antes "Ciclo"): linha do tempo de todos os cartões, mais recente primeiro (cartão, evento, quem, quando), com um seletor compacto "Todos os cartões". O histórico por cartão (`/admin/cartao/:id/historico`) também lista as rodadas por quadra.
- Remover o texto "Ciclo" da interface; o número do ciclo continua como dado.

## Parte 4 — Botão de adicionar casa e logo

### Botão "+ casa"
- Hoje é um botão flutuante com o texto "casa" (`.fab.sobre-barra`, `bottom: 208px`) que fica sobre a lista, acima da barra de status.
- A palavra "casa" sai do botão e entra um **ícone novo `casa-mais`** (casa com sinal de mais), em `src/app/icones.tsx`. O botão mantém `aria-label="Adicionar casa"`, alvo ≥ 48 px, e um tooltip/rótulo acessível para quem usa leitor de tela.
- Refinamento visual e de posição: o botão deixa de cobrir as linhas da lista. A posição e o acabamento (tamanho, sombra, cor de contraste com o tema claro e escuro) são definidos na tarefa de tela, conferindo no celular real, e seguem a regra de alcance com uma mão. Decidido: **canto inferior direito**, acima da barra de status, com margem no fim da lista para nenhuma linha ficar escondida atrás dele.
- Mesma troca de palavra por ícone onde "casa" aparece como rótulo de ação (ex.: "Cadastrar a primeira casa" fica com ícone + texto, pois o texto é a explicação principal e não só um rótulo).

### Logo novo em todo o app
Auditoria feita em 2026-11-08. O logo novo (marcador com casa, `design/identidade/logo-final.png`, vindo do commit 4642a09) já está em `public/favicon.svg`, `public/icons/*.png`, `design/identidade/icone.svg` e `src/assets/icone.svg`, e na tela de login. O **desenho antigo** (casa com caminho âmbar sobre quadrado) continua no símbolo `#i-logo` de `src/app/icones.tsx` e aparece em:
- `src/app/Topo.tsx` (logo na barra da lista de cartões),
- `src/features/cards/CartoesPage.tsx` (estado vazio),
- `src/features/houses/QuadraPage.tsx` (estado vazio),
- `src/pwa/InstalarPage.tsx`.

Correção: criar um componente `Logo` (`src/app/Logo.tsx`) que usa `src/assets/icone.svg` via `<img>` (o SVG novo embute um PNG, então não serve como `<symbol>`), com a prop `tamanho`; trocar os quatro usos; remover o símbolo `#i-logo` antigo e a variável `--logo-tile` se ficarem sem uso. Teste: nenhum arquivo em `src/` referencia `#i-logo`. A tela "Aguardando liberação" não tem logo hoje, embora o protótipo (`02-aguardando.html`) tenha; entra com o `Logo` novo.

## Fora de escopo

Fechamento automático à meia-noite, rodadas no nível do cartão, edição de rodadas antigas, notificações, mudanças nas regras de segurança além de liberar `rodadas`.

## Testes

- Domínio: `rodada.ts`, `ciclo.ts` ajustado (sem fechamento automático, bloqueio com rodada aberta, reinício).
- Firebase/demo: `criarCasa` com status em lote único, `registrarVisita` sem fechar, contadores da quadra.
- Telas: `NovaCasaSheet` (resultado, sem rodada), `QuadraPage` (faixa de rodada, lista vazia), `CartaoPage` (quadras que faltam), `AdminPage` e nova tela do cartão, Histórico.
- O teste que impede o SDK do Firebase fora de `src/firebase/` continua valendo.

## Pontos para o plano

- Ordem sugerida: logo (independente, pequena) → domínio e dados → rodadas na quadra → cadastro com resultado → botão de casa → lista do cartão → admin e Histórico.
- Migração: quadras existentes sem `totalCasas`/`faltam`/`rodadasTotal` são tratadas com valores padrão até um "Recalcular contadores".
