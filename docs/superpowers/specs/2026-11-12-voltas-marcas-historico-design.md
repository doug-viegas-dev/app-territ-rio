# Voltas, marcas da casa e histórico de 2 anos — design

Data: 2026-11-12. Muda o modelo aprovado em `2026-11-06-app-territorios-design.md`. Onde houver conflito, vale este documento.

## Objetivo

Simplificar o uso na rua e na administração:

1. "Rodada" passa a se chamar **volta**.
2. A contagem de voltas **zera** quando o cartão é aberto de novo depois de fechado.
3. "Estudo" e "Não visitar" deixam de ser opções de registro. Viram **marcas** da casa, adicionadas só nos detalhes.
4. O histórico de cada casa guarda **2 anos**, com apagamento automático.
5. As opções de registro passam a ser **Conversado, Não atendeu, Não em casa e Carta**.
6. **Fechar o cartão** fica visível, à mão de quem administra.

Critério geral: tudo simples e fácil. Uma revisão de simplicidade dos fluxos mais usados vem depois (etapa 6).

## Decisões

### Status da casa

`Status = 'pendente' | 'falado' | 'sem_resposta' | 'nao_em_casa' | 'carta'`

| Valor no banco | Rótulo | Significado | Resolve a casa |
|---|---|---|---|
| `pendente` | Pendente | nenhuma visita ainda | não |
| `falado` | Conversado | houve conversa | sim |
| `sem_resposta` | Não atendeu | a pessoa viu e não quis atender | não |
| `nao_em_casa` | Não em casa | não havia ninguém | não |
| `carta` | Carta | carta deixada ou enviada | sim |

Os valores `falado` e `sem_resposta` continuam como estão. `estudo` e `nao_visitar` saem de `Status`. Os rótulos antigos "Estudo" e "Não visitar" existem só para ler visitas antigas no histórico.

### Marcas da casa

Dois campos opcionais em `Casa`, independentes do status: `naoVisitar` e `estudo` (booleanos). Cada marca guarda quem marcou e quando.

- Só se marcam e desmarcam **nos detalhes da casa**, com o cartão aberto. Qualquer publicador pode.
- As marcas descrevem a casa e **continuam** depois de "fechar e reiniciar".
- **Não visitar**: a casa **não existe para as contas**. Sai de `totalCasas` do cartão e da quadra, de `faltam` e de `resolvidas`, e de qualquer percentual. Os botões de registro ficam desativados, com o texto "Pediu para não ser visitado. Desmarque nos detalhes para registrar". Marcar pede uma confirmação curta.
- **Estudo**: só uma marcação visível. A casa segue o fluxo normal.
- Na lista da quadra, a casa fica **no lugar normal**, sem seção de destaque, com selo de **ícone + texto** ("Não visitar", "Estudo"). A casa "não visitar" aparece acinzentada.
- Nenhum nome de morador é guardado.
- Marcar ou desmarcar `naoVisitar` ajusta, no mesmo lote, os contadores do cartão (`totalCasas`, `resolvidas`) e da quadra (`totalCasas`, `faltam`). O ajuste leva em conta o status atual da casa.

### Contagem

Funções puras recebem a casa inteira (`status` e `naoVisitar`):

- `contaNoTotal(casa)` = `!casa.naoVisitar`
- `isResolvida(casa)` = conta no total e status em {`falado`, `carta`}
- `faltaVisitar(casa)` = conta no total e não é resolvida

`recalcularContadores` e a migração usam as mesmas funções.

### Voltas

- Todos os textos da interface dizem "volta" (abrir volta, encerrar volta, volta 1).
- Os nomes internos do código e do banco (`rodada`, `rodadasTotal`, `rodadaAtual`, coleção `rodadas`) **não mudam**: renomear alteraria cerca de 500 pontos e exigiria migrar o banco, sem ganho para o usuário.
- `abrirCartao` zera `rodadasTotal` e remove `rodadaAtual` de todas as quadras, no mesmo lote que muda o estado. Zerar na abertura dá o mesmo resultado que zerar no fechamento e fica num lugar só.
- O número da volta recomeça em 1. A lista de voltas do histórico do cartão passa a ser **ordenada por data** (`abertaEm` decrescente) em vez de por número.
- Fechamento comum: as casas mantêm o status. "Fechar e reiniciar": todas as casas voltam a `pendente`, o ciclo sobe, e as marcas permanecem. `idsParaReiniciar` passa a incluir todas as casas que não estão `pendente`.

### Fechar o cartão

- O botão **"Fechar cartão"** fica visível no topo da página do cartão e da página da quadra, **só para administradores**. As regras de segurança não mudam: só administradores mudam o estado do cartão.
- Confirmação em uma frase: "Fechar o cartão N? As voltas recomeçam na próxima abertura." Se houver volta aberta, avisa e oferece encerrar a volta junto.
- "Fechar e reiniciar" é a segunda opção no mesmo lugar, com a confirmação atual do reinício.
- Na administração, os dois botões continuam.
- Abrir o cartão continua como hoje e agora zera as voltas.

### Telas

**Tela principal da quadra:** barra fixa com 4 botões (Conversado, Não atendeu, Não em casa, Carta), cada um com cor, forma e nome. Sem campo de observação. Sem seção "Atenção". Selos de marca nas casas.

**Detalhes da casa:** sem botões de registro. Contém:

- identificação da casa e botão Editar (número e descrição);
- bloco "Sobre esta casa" com dois interruptores de 48 px: "Pediu para não ser visitado" e "Aqui há um estudo de alguém";
- **Observação**, com botão Salvar próprio, sem depender de registrar visita. Aviso acima do campo: "Não anote nenhum dado pessoal: nem nomes, telefones ou documentos de moradores.";
- histórico dos últimos 2 anos, com visitas e observações;
- Excluir casa, só para administradores.

Regras visuais do projeto continuam: status com cor + forma + nome, alvos de toque ≥ 48 px, texto ≥ 16 px, contraste AA, textos calmos e curtos copiados do protótipo quando houver.

### Observação

Cada observação salva é um documento em `visits` com `obs`, data, autor e `expiraEm`, e **sem `status`**. Não muda o status nem os contadores. As observações antigas (presas a uma visita) permanecem no histórico.

### Histórico de 2 anos

- Todo documento novo em `visits` (visita ou observação) grava `expiraEm` = data do registro + 2 anos, como `Timestamp`.
- Uma política de **TTL do Firestore** no campo `expiraEm`, grupo de coleções `visits`, apaga os vencidos sem intervenção de ninguém e sem código no servidor. Pode levar até cerca de 1 dia depois do vencimento.
- O app **filtra** o que passou de 2 anos (`expiraEm` ≤ agora), então o vencido some da tela na hora.
- O apagamento é definitivo, sem lixeira.
- A edição de data pelo administrador (já existente) recalcula `expiraEm`.

**Passo do usuário, uma vez:** no console do Firebase, Firestore, aba TTL, criar a política com grupo de coleções `visits` e campo `expiraEm`. Sem isso o app continua escondendo o vencido, mas os dados ficam no banco.

### Regras de segurança do Firestore

- Permitir `expiraEm` (timestamp) nas visitas e `naoVisitar`/`estudo` (com autor e data) nas casas.
- Permitir visita sem `status` quando for observação (`obs` obrigatório).
- Sem outras mudanças: visitas e cadastro só em cartão aberto continuam travados na interface, como no spec original. Fechar e reiniciar continuam só com administradores.

### Migração

Ação única no app, "Atualizar dados", só para administradores, sem chave nem senha no repositório. Repetível sem efeito duplo:

1. Casas com `estudo`: marca `estudo`, status `pendente`.
2. Casas com `nao_visitar`: marca `naoVisitar`, status `pendente`.
3. `falado` e `sem_resposta` não mudam.
4. Visitas sem `expiraEm` recebem data da visita + 2 anos.
5. Recalcula todos os contadores com as regras novas.

A migração só roda **depois** que o app novo estiver publicado, para a versão antiga não gravar status que não existem mais. As visitas antigas de `estudo` e `nao_visitar` continuam no histórico com o rótulo original.

## Ordem de implementação

Uma etapa por vez, cada uma com testes e um commit:

1. **Domínio (`src/domain/`):** tipos, status, contagem, ciclo/reinício, voltas, rótulos.
2. **Dados (`src/firebase/`, `src/demo/`, cache offline):** `registrarVisita` com `expiraEm`; marcar/desmarcar casa com ajuste de contadores; salvar observação; `abrirCartao` zera as voltas; voltas ordenadas por data; filtro de 2 anos no histórico.
3. **Regras do Firestore** e testes no emulador.
4. **Interface:** barra da tela principal, selos, detalhes, textos "volta", botão "Fechar cartão".
5. **Migração** e guia do TTL.
6. **Revisão de simplicidade** dos fluxos mais usados.

Os testes existentes que citam "rodada", Estudo e Não visitar são atualizados na etapa a que pertencem.

## Testes

- Vitest para as regras puras: contagem com "não visitar", reinício com marcas, reset das voltas, expiração, rótulos.
- Testes de tela (padrão do projeto) para a barra, os detalhes, os selos e o botão de fechar.
- Testes das regras de segurança no emulador do Firebase.

## Riscos

- Os contadores mudam de significado. A migração e o "Recalcular contadores" usam a mesma regra.
- Ordem de publicação: app novo primeiro, migração depois.
- O TTL do Firestore não é instantâneo. O filtro do app cobre a diferença.
- Visitas com mais de 2 anos somem na primeira passada do TTL depois da migração.

## Fora de escopo

- Renomear identificadores internos de `rodada` para `volta`.
- Permitir que publicadores fechem ou reiniciem o cartão.
- Seção de destaque para casas com marca.
- A revisão geral de simplicidade (etapa 6) é uma tarefa à parte, depois desta.
