# CRUD completo na Administração (Parte 1) — Design

Data: 2026-11-12. Esta é a Parte 1 de duas. A Parte 2 (rever as telas e o fluxo de trabalho dos administradores) é outro ciclo, depois desta.

## Objetivo

Hoje o administrador cria quase tudo, mas não corrige nem remove o que criou errado. Esta parte fecha as lacunas de criar, ver, editar e excluir nas telas de Administração **e define, para cada operação, como o app trata validação, falta de internet, erro, concorrência e acessibilidade**, sem perder histórico.

## Auditoria (estado antes desta parte)

Levantada lendo o código; nada foi executado.

| Elemento | Criar | Ver | Editar | Excluir |
|---|---|---|---|---|
| Membro | Sim | Sim | Só ativar e desativar | Não há na tela |
| Cartão | Sim (com PDF e link do Maps) | Sim | Não há tela (`atualizarCartao` só é usado na criação) | Não há função nem tela |
| Quadra | Sim | Sim | Nome e ruas (campo de texto) | Não há função nem tela |
| Rua | Sim | Sim | Só pelo texto da quadra | Só apagando a linha do texto |
| Casa | Sim (uma a uma e em faixa) | Sim | Número, descrição e ordem | Sim, só admin, na folha "Editar casa" |
| Visita e observação | Sim | Sim | Não | Não |
| Volta (rodada) | Sim | Sim | Encerrar | Não |
| Evento do cartão | Automático | Sim | Sim (admin) | Sim (admin) |

Defeitos já vistos no código (a confirmar com teste):

- Remover ou renomear uma rua pelo texto da quadra não mexe nas casas; `QuadraPage` junta as ruas da quadra com as das casas, e a rua antiga reaparece.
- `excluirCasa` na tela da casa termina com `.catch(() => {})`: se a exclusão falhar, ninguém é avisado.
- `CartaoForm` não recusa número de cartão repetido nem arquivo acima do limite do Storage (20 MB, nas regras).
- `QuadraPage` e `CasaPage` não tratam "a quadra não existe mais"; só o cartão tem essa tela.

## Decisões

1. Entram as quatro lacunas: editar cartão, excluir cartão e quadra, editar membro, ruas e ordem das quadras.
2. **Excluir cartão ou quadra só quando estiver vazio** (sem casas). Com casas, o app explica e não exclui. Não muda as regras de segurança e não perde histórico.
3. **Remover membro apaga também a conta do Firebase Authentication**, por uma Cloud Function. Isso muda a decisão da spec de 2026-11-06 ("sem Cloud Functions").
4. Visitas, observações e voltas continuam sem edição nem exclusão: é um registro que só cresce, e as regras proíbem apagar.
5. Tudo fica na Administração. Texto em português, tom calmo, alvos de 48px, textos de 16px, como no resto do app.

## Design

### Cartão

- Bloco novo "Dados do cartão" em `CartaoAdminPage`: número, título, link do Maps e trocar o PDF. Reaproveita `CartaoForm` em modo edição, chamando `atualizarCartao`.
- Bloco "Excluir cartão" no fim da tela, em botão de perigo. Só habilitado quando **todas** as condições valem:
  - o cartão está **fechado** (cartão novo já nasce fechado);
  - nenhuma quadra tem volta aberta;
  - nenhuma quadra tem casas. A checagem lê as casas no servidor (`getDocsFromServer`, uma casa basta) e **não** usa `totalCasas`, que pode estar errado e não conta casas marcadas como "não visitar".
- Excluir apaga, em lote, o cartão, as quadras e os eventos. Depois remove os arquivos do mapa do Storage.
- As subcoleções `rodadas` de cada quadra ficam sem pai, porque as regras proíbem apagá-las. Ficam inalcançáveis, sem efeito visível.

### Quadra

- Na folha "Editar quadra": "Excluir quadra" (vazia, sem volta aberta, com internet) e "Subir" e "Descer", que trocam o `ordem` com a quadra vizinha. O campo `ordem` já existe.

### Ruas

- A folha da quadra mostra as ruas como lista, e não mais como texto. Cada linha tem "Renomear" e "Remover".
- A lista do administrador é a **união** das ruas da quadra com as ruas das casas, igual à que `QuadraPage` já mostra. Assim nenhuma rua com casas fica invisível.
- **Renomear** atualiza `rua` em todas as casas daquela rua (lotes de `LOTE` = 400) e depois o nome na lista da quadra. Exige internet.
- **Remover** só vale se a rua não tiver casas.

### Membro

- Tocar na linha abre "Editar membro": nome e papel.
- "Remover" aparece para qualquer membro, menos o próprio administrador. Pede confirmação e apaga o documento `members/{email}`; a função apaga a conta do Auth.

### Cloud Function

- Pasta nova `functions/`, com uma função disparada quando `members/{email}` é apagado: busca a conta pelo e-mail (`getUserByEmail`) e apaga com `deleteUser`.
- Antes de apagar, confere de novo se `members/{email}` continua inexistente. Se o administrador liberou o mesmo e-mail logo depois, a conta é preservada.
- Conta inexistente (`auth/user-not-found`) termina sem erro. Outro erro é registrado no log e a função tenta de novo (retentativa ativada). Se mesmo assim falhar, sobra uma conta sem acesso, inofensiva.
- Quem foi apagado pode entrar de novo com o Google: o Auth cria uma conta nova, mas sem documento em `members` não há acesso. É limite de Auth com Google.
- Exige o plano Blaze (já previsto no `AGENTS.md`). **Fica com o usuário:** o deploy e a conferência no console do Firebase. O código e o teste no emulador ficam com o agente.

## Tratamentos

### Regras gerais (valem para todas as operações abaixo)

**Falta de internet.** Há dois tipos de operação:

- *Texto simples em um documento* (editar cartão sem PDF, rótulo da quadra, ordem, nome ou papel do membro, criar quadra e rua): segue o padrão atual, em que a tela fecha na hora e a escrita entra na fila.
- *Operação que lê o servidor ou mexe em vários documentos* (trocar PDF, excluir cartão ou quadra, renomear ou remover rua, remover membro): exige internet. Sem rede, o botão fica `aria-disabled` e o texto "Precisa de internet." aparece junto, como em "Recalcular contadores". Nunca esconder o botão.

**Erro.** Nenhuma falha é silenciosa. Toda falha mostra um aviso `role="alert"` com título "Não foi possível …" e uma frase com o próximo passo, no formato já usado (`aviso erro`). Se a regra de segurança negar (`permission-denied`), a frase é "Você não tem permissão para fazer isso." e a tela não tenta de novo sozinha.

**Duplo toque.** Enquanto a operação roda, o botão fica desabilitado e o texto muda ("Excluindo…", "Salvando…"). Operações de texto simples fecham a folha na hora, como hoje.

**Confirmação.** Exclusão e remoção abrem folha de confirmação que escreve o efeito ("Não dá para desfazer"). O foco inicial vai para "Cancelar". Ao fechar, o foco volta ao botão que abriu a folha (padrão de `ListaCartoesAdmin`).

**Item apagado por outra pessoa.** Se o cartão, a quadra ou o membro deixar de existir com a folha aberta, a folha fecha com o aviso "Este item foi removido por outra pessoa." Nunca tenta recriar. Escrever em documento inexistente (`not-found`) cai nesse mesmo aviso.

**Edição simultânea.** Vale a última gravação, como no resto do app. Não há bloqueio de edição.

**Modo demonstração.** Cada função nova de `src/firebase/` tem o equivalente em `src/demo/banco.ts`. Na demonstração, remover membro só tira da lista.

**Acessibilidade.** Folhas com `role="dialog"` e `aria-label`; avisos de sucesso em `role="status"`; alvos ≥ 48px; texto ≥ 16px; ação de perigo com ícone e texto, nunca só cor.

### Validações

| Campo | Regra | Mensagem |
|---|---|---|
| Cartão: número | Obrigatório, até 10 caracteres, único entre os cartões (sem diferenciar maiúsculas, espaços cortados) | "Informe o número do cartão." / "Já existe o cartão 12." |
| Cartão: título | Obrigatório, até 80 caracteres | "Informe o título do cartão." |
| Cartão: link do Maps | Opcional; se preenchido, começa com `http://` ou `https://` | "Cole o link completo, começando com https://." |
| Cartão: PDF | Até 20 MB (limite das regras do Storage); só PDF | "O arquivo passa de 20 MB. Escolha outro." |
| Quadra: nome | Obrigatório, até 40 caracteres, único no cartão | "Digite o nome da quadra." / "Já existe uma quadra com esse nome." |
| Rua: nome | Obrigatório, até 60 caracteres, único na quadra (sem diferenciar maiúsculas) | "Digite o nome da rua." / "Essa rua já existe nesta quadra." |
| Membro: e-mail | Formato válido, minúsculas, único | "Digite um e-mail válido." / "Esse e-mail já está na lista." |
| Membro: nome | Obrigatório, até 80 caracteres | "Digite o nome da pessoa." |

As validações ficam em funções puras em `src/domain/` (sem Firebase), com teste. O erro aparece na própria folha e apaga ao digitar, como em `FolhaQuadra`.

### Cartão

- **Editar sem PDF:** grava os campos e fecha. Se outro cartão já tem o número, recusa antes de gravar.
- **Trocar PDF:** envia primeiro os dois arquivos com **caminho novo** (`cards/{id}/mapa-<ms>.pdf` e `.webp`) e só então grava o cartão com os novos caminhos. Se o envio falhar, o cartão continua como estava: nada fica pela metade. Depois de gravar, apaga os arquivos antigos; se essa limpeza falhar, ignora (sobra um arquivo sem uso).
  - O motivo do caminho novo: a URL do mapa fica guardada no aparelho (`urlDaImagem`) e a imagem fica no cache do service worker. Com o mesmo caminho, os celulares continuariam mostrando o mapa antigo. A confirmação de que isso resolve fica no teste.
- **Excluir:**
  - Cartão aberto: botão desabilitado, com a frase "Feche o cartão para excluir."
  - Volta aberta: desabilitado, com "Encerre as voltas abertas antes."
  - Casas encontradas: desabilitado, com "Este cartão tem casas. Só é possível excluir um cartão vazio."
  - Sem rede: desabilitado, com "Precisa de internet."
  - A conferência de casas roda de novo ao confirmar, para pegar casa criada nesse meio tempo.
  - Ordem: apaga eventos e quadras, depois o cartão, depois os arquivos. Se falhar no meio, o cartão continua na lista com menos quadras e basta tentar de novo; a operação é repetível. Se só a limpeza dos arquivos falhar, o aviso é de sucesso: "Cartão excluído. Os arquivos do mapa ficaram guardados."
  - Quem estava com o cartão aberto em outro aparelho vê "Cartão não encontrado", tela que já existe.
  - Resta uma janela pequena: uma casa criada offline em outro aparelho antes de a exclusão chegar a ele é gravada depois, sem pai. Fica inalcançável e sem efeito visível. Registrado como limite aceito.

### Quadra

- **Criar e editar:** valida nome único. Editar o nome não altera casas.
- **Subir e Descer:** trocam o `ordem` das duas quadras em um único lote, para nunca ficar duas com a mesma ordem. A primeira não tem "Subir" e a última não tem "Descer" (desabilitado com o texto "Já é a primeira" ou "Já é a última"). Se a lista mudar entre o toque e a gravação, recalcula a partir da lista atual.
- **Excluir:** mesmas condições do cartão, no nível da quadra: sem casas (lidas do servidor), sem volta aberta, com internet. Quem estava na quadra vê "Quadra não encontrada" (tela nova em `QuadraPage` e `CasaPage`, com link de volta ao cartão).

### Ruas

- **Renomear:**
  1. Valida o novo nome (único na quadra; vazio é recusado). Trocar só maiúsculas e minúsculas é permitido.
  2. Lê do servidor as casas com a rua antiga.
  3. Atualiza em lotes de 400, depois o nome na lista da quadra.
  4. Se falhar no meio, mostra "Parte das casas foi atualizada. Toque em Renomear de novo para terminar." A repetição só toca as casas que ainda têm o nome antigo, então é segura. Enquanto isso, a lista une as duas grafias e nada some.
  - Uma casa criada por outro aparelho com o nome antigo durante a operação continua com a grafia antiga e aparece na lista de ruas. O administrador renomeia de novo. Nada se perde.
- **Remover:** desabilitado se houver casas, com "Esta rua tem casas. Mude ou exclua as casas antes." Depois de remover da lista, uma casa criada offline com esse nome faz a rua reaparecer; é o comportamento da união e não perde dado.
- **Adicionar rua** (já existe): sem mudança, só a validação de tamanho.

### Membro

- **Liberar** (já existe): ganha o limite de nome.
- **Editar:** nome e papel. Rebaixar outro administrador é permitido (o próprio administrador continua, então o app nunca fica sem administrador). O administrador não muda o próprio papel: o controle de papel fica desabilitado na própria linha, com "Você não pode mudar o seu próprio papel."
- **Ativar e desativar** (já existe): inalterado.
- **Remover:** confirmação com "A conta de {nome} deixa de existir. Se a pessoa entrar de novo com o Google, não terá acesso até você liberar o e-mail." Para o próprio administrador o botão nem aparece. Com sessão ativa, a pessoa vê "Aguardando liberação" assim que o documento some (o `AuthProvider` já observa `members`). O histórico de visitas e eventos guarda `porNome` e `porUid` como texto e não muda.
- **Falha da função:** não aparece para o administrador, porque o documento já foi apagado. A falha fica no log do Firebase; a conta que sobra não dá acesso a nada.

### Casa (CRUD já existente, ajustes de tratamento)

- `excluirCasa`: deixa de engolir o erro. A tela só volta para a lista depois do sucesso ou da gravação na fila; em falha, mostra "Não foi possível excluir" na própria tela.
- Quadra apagada por outra pessoa com a casa aberta: "Quadra não encontrada" (acima).
- Visitas da casa excluída ficam sem pai (as regras proíbem apagá-las). Já avisado no texto da folha; sem mudança.

### Evento do cartão, visita, observação e volta

Sem mudança. `ExcluirEvento` e `EditarEvento` já mostram erro e desabilitam o botão durante o envio; visita, observação e volta continuam imutáveis por desenho.

## Testes

Seguem o padrão do projeto: teste falhando, implementação, teste passando.

- **Funções puras de validação** (`src/domain/`): todas as linhas da tabela de validações, incluindo espaços, maiúsculas e limites exatos.
- **Cartão:** editar sem PDF; número repetido; trocar PDF com sucesso, com falha no envio (cartão intacto) e com falha na limpeza; PDF acima de 20 MB; excluir vazio; recusar aberto, com volta aberta, com casas e sem internet; recusar quando uma casa aparece entre o toque e a confirmação.
- **Quadra:** nome repetido; excluir vazia; recusar com casas e com volta aberta; subir e descer, incluindo as pontas; "Quadra não encontrada" em `QuadraPage` e `CasaPage`.
- **Rua:** renomear com mais de um lote; renomear com falha no meio e repetir; trocar só maiúsculas; remover sem casas; recusar com casas; recusar duplicada.
- **Membro:** editar nome e papel; o administrador não muda o próprio papel nem vê "Remover"; remover com sessão ativa; e-mail repetido.
- **Casa:** `excluirCasa` com falha mostra o erro.
- **Função (emulador de Auth e Firestore):** apaga a conta existente; não falha se a conta não existe; não apaga se o e-mail foi liberado de novo; tenta de novo após erro temporário.
- **Demonstração:** uma passada por operação nova.
- **Acessibilidade:** foco inicial em "Cancelar" e foco de volta ao botão de origem nas folhas de confirmação.

## Pontos que cruzam as partes

- **Todo acesso ao SDK do Firebase fica em `src/firebase/`** (há teste que verifica). As funções novas entram lá. A pasta `functions/` fica fora de `src/`.
- **Regras de segurança:** as atuais já permitem ao administrador criar, editar e apagar `cards`, `blocks` e `members`, e escrever e apagar arquivos no Storage. Não se espera mudança; se a implementação achar uma exceção, ela pára e relata.
- **Limites já existentes na casa** (tamanho de número e descrição) não foram levantados nesta spec. O plano começa conferindo e, se faltarem, aplica o mesmo padrão da tabela de validações.

## Fora desta parte

- Editar ou apagar visitas, observações e voltas.
- Arquivar cartões e quadras.
- Rever as telas e o fluxo de trabalho dos administradores: Parte 2.
