# App de Territórios — Design

Data: 2026-11-06 · Status: aprovado; atualizado após o protótipo (`design/prototipo/`), que passa a ser a referência visual e de estados de cada tela

## 1. Objetivo e contexto

PWA para uma congregação (~30 usuários, ~20 cartões, ~2.000 casas) registrar as casas de cada quadra de cada cartão de território e o histórico de visitas de cada casa. Prioridades: **muito fácil de usar**, **funciona offline**, **fica dentro da cota gratuita do Firebase**.

Fora de escopo: mapa embutido, extração de texto do PDF, notificações, Cloud Functions, relatórios estatísticos.

## 2. Decisões já tomadas

| Tema | Decisão |
|---|---|
| Stack | React + Vite + TypeScript, `vite-plugin-pwa`, Firebase (Auth, Firestore, Storage, Hosting) |
| Login | Google; só entra quem o admin liberou |
| Papéis | `admin` e `publicador` |
| PDF | Mapa desenhado do cartão; usado como imagem de referência. Original no Firebase Storage (plano Blaze, sem cobrança dentro da cota) |
| Google Maps | Apenas link "Abrir no Google Maps" por cartão (My Maps). Não funciona offline |
| Quadra | Tem várias ruas; o admin cria a quadra e **qualquer publicador acrescenta uma rua nova** (chip "Nova rua"); casa = rua + número |
| Cadastro de casas | Qualquer publicador cria casas; admin corrige |
| Histórico | Cada visita: status, data, quem, ciclo, observação opcional |
| Offline | Tudo que o publicador faz funciona sem internet |
| Tela inicial | Cartões em andamento primeiro, depois fechados |
| Fechamento | Automático quando todas as casas estão resolvidas; admin pode fechar antes |
| Novo ciclo | Mostra só casas não resolvidas |
| Reinício | Admin reinicia o cartão: tudo volta a pendente, exceto "não visitar"; histórico fica |
| Abertura | Cartão novo nasce **fechado**. **Só o admin abre**, e fica registrado quem abriu e quando. Visitas e cadastro de casas só em cartão aberto |
| Histórico de abertura | O admin vê os últimos 10 registros de abertura e fechamento de cada cartão, com quem fez (ou "Automático" + quem registrou a última casa) |
| Instalação | Android: botão "Instalar app" (evento `beforeinstallprompt`; o Chrome ainda pede uma confirmação). iPhone: passo a passo (instalação com um toque não existe no iOS) |
| Visual | Protótipo aprovado em `design/prototipo/`: direção "barra fixa na base" na Quadra, claro e escuro (segue o sistema), Nunito Sans 400/500/600 |

## 3. Status de uma casa

`pendente` (nunca visitada) · `sem_resposta` (visitada, ninguém atendeu) · `falado` · `estudo` · `nao_visitar`

Rótulos na interface: "Conversado", "Não atendeu", "Estudo", "Não visitar", "Pendente" (valores internos acima não mudam).

**Resolvida** = `falado`, `estudo` ou `nao_visitar`. `pendente` e `sem_resposta` são "casas que ficaram para trás".

## 4. Modelo de dados (Firestore)

```
members/{email}                      { nome, papel: "admin"|"publicador", ativo }
cards/{cardId}                       { numero, titulo, mapsUrl, imagemPath, pdfPath,
                                       estado: "aberto"|"fechado", ciclo: number,
                                       totalCasas, resolvidas, atualizadoEm,
                                       abertoPorNome?, abertoEm? }
cards/{c}/eventos/{e}                { tipo: "aberto"|"fechado",
                                       motivo: "criacao"|"abertura"|"fechamento_manual"|
                                               "fechamento_automatico"|"reinicio",
                                       em, porUid, porNome }
cards/{c}/blocks/{b}                 { rotulo, ruas: string[], ordem }
cards/{c}/blocks/{b}/houses/{h}      { rua, numero?, descricao?, ordem: number, status,
                                       ultimaVisitaEm, ultimoPor, criadoEm }
cards/{c}/blocks/{b}/houses/{h}/visits/{v}
                                     { status, em, porUid, porNome, ciclo, obs? }
```

- Registrar uma visita é um **batch**: cria o documento em `visits` e atualiza `status`, `ultimaVisitaEm` e `ultimoPor` da casa. Visitas são sempre novos documentos, então dois publicadores no mesmo cartão não geram conflito de histórico.
- O status atual da casa é o da visita com maior `em`. Se duas escritas offline colidirem, vale a última a sincronizar; o histórico em `visits` permanece correto.
- Todo **evento de abertura ou fechamento** (criação, abertura pelo admin, fechamento manual ou automático, reinício) grava um documento em `eventos` no **mesmo batch** que muda `estado`. A tela de histórico lê os 10 mais recentes (`orderBy em desc, limit 10`). `abertoPorNome` e `abertoEm` no cartão evitam uma leitura extra para mostrar "Aberto por … em …".
- `totalCasas` e `resolvidas` no documento do cartão alimentam a lista inicial sem ler as casas. São atualizados com `increment()` no mesmo batch da visita ou do cadastro. O admin tem uma ação "recalcular contadores" para corrigir eventual desvio.

## 5. Regras de negócio

1. **Fechamento automático.** Quando `resolvidas == totalCasas` após registrar uma visita, o aparelho grava `estado = "fechado"`. A gravação é idempotente.
2. **Abertura e fechamento manual.** O cartão novo nasce `fechado` (`ciclo` 1). **Só o admin abre** um cartão (`estado = "aberto"`, `ciclo` não muda, grava `abertoPorNome`/`abertoEm` e um evento), depois de uma confirmação ("Fica registrado que foi você, …, em …"). O admin pode fechar o cartão a qualquer momento. Ao fechar (automática ou manualmente), `ciclo` incrementa. Para trabalhar as casas que sobraram, o admin **abre** o cartão de novo; a lista de trabalho mostra só as não resolvidas. **Cartão fechado não recebe visitas nem novas casas:** a interface desativa os botões e mostra "Cartão fechado" (admin: link "Abrir cartão"; publicador: "Só um administrador pode abrir o cartão. Peça a um deles."). Essa trava fica **só na interface**, não nas regras de segurança, para que uma visita registrada offline antes do fechamento nunca seja perdida ao sincronizar.
3. **Novo ciclo.** A lista de trabalho de um cartão aberto mostra apenas casas não resolvidas. Casas `estudo` e `nao_visitar` aparecem em seção própria, destacadas.
4. **Reinício.** O admin escolhe "Reiniciar território": todas as casas voltam a `pendente`, exceto `nao_visitar`; `ciclo` continua incrementando (nunca volta a 1, para que as visitas antigas mantenham o número do ciclo em que ocorreram), o cartão fica `aberto` (evento `reinicio`, com o nome do admin) e `resolvidas` é recalculado; o histórico antigo permanece. A ação pede confirmação com o efeito explícito.
5. **Cadastro.** Casa nova nasce `pendente`. Cadastro por rua (chip) + número e/ou descrição curta (ex.: "portão azul", "ao lado da padaria"), ou por faixa numérica (ex.: 100 a 130, só pares/ímpares). `numero` é opcional, pois a maioria das casas não tem número; nesse caso `descricao` é obrigatória, e se houver número a descrição é opcional. **Números repetidos na mesma rua são permitidos** (existem na cidade): nenhuma validação de unicidade. Na lista, a casa aparece como "120 · portão azul" ou só pela descrição; dentro de cada rua a ordem de exibição é a do campo `ordem` (ver item 6), nunca o número. Um aviso discreto ("já existe um 120 nesta rua") pode aparecer ao cadastrar, mas não bloqueia.

6. **Ordem física das casas.** As casas de cada rua aparecem na ordem em que foram cadastradas e podem ser movidas para refletir a ordem física na rua. Qualquer publicador pode reordenar.
   - `ordem` é um número decimal. Casa nova recebe `ordem` maior que a última da rua (entra no fim). Pelo botão "adicionar depois desta" a casa nova entra logo após a escolhida, com `ordem` igual à média entre a casa escolhida e a seguinte.
   - Mover uma casa (arrastar pela alça, ou botões subir/descer como alternativa para quem tem dificuldade em arrastar) grava só o `ordem` da casa movida, calculado como a média entre os vizinhos de destino. Não reescreve as outras casas, o que mantém offline e custo de escrita baixos.
   - Se duas pessoas inserirem no mesmo ponto offline e obtiverem `ordem` igual, o desempate é por data de cadastro; nunca se perde casa. Se a diferença entre vizinhos ficar pequena demais, o app renumera a rua inteira em um batch.
   - A ordem vale por rua dentro da quadra; mover uma casa para outra rua da mesma quadra também é permitido (altera `rua` e `ordem`).
   - Faixa numérica (ex.: 100 a 130) cadastra as casas já na ordem do intervalo, crescente.

7. **Ruas.** As ruas de uma quadra são a lista `ruas` do documento da quadra. Qualquer publicador pode **acrescentar** uma rua pelo chip "Nova rua" (na tela Nova casa) ou o admin em "Adicionar rua" (Administração). Nome com espaços cortados; vazio ou repetido (sem diferenciar maiúsculas) é ignorado. Publicador não remove nem renomeia rua; isso é do admin.

## 6. Telas

Cada tela tem protótipo navegável em `design/prototipo/` (arquivo indicado), com os estados vazio, carregando, sem internet, erro, cartão fechado, casa sem número e quadra sem casas.

1. **Entrar** (`01-entrar.html`) — logo, "Entrar com Google", "Ferramenta feita pela e para a congregação. Não é um app oficial."
2. **Aguardando liberação** (`02-aguardando.html`) — para quem entrou com Google mas não está em `members`; "Verificar de novo" e "Sair".
3. **Cartões** (`03-cartoes.html`) — em andamento primeiro, com progresso "12/30"; depois fechados; aviso dispensável de instalação.
4. **Cartão** (`04-cartao.html`) — imagem do PDF (zoom), botão "Abrir no Google Maps", lista de quadras com progresso; "Aberto por … em …"; cartão fechado com "Abrir cartão" (admin) ou "Peça a um administrador" (publicador).
5. **Quadra** (`05-quadra.html`) — casas agrupadas por rua, na ordem física (campo `ordem`); lista de leitura com a casa em foco e **barra fixa na base** com os 4 botões (Conversado, Não atendeu, Estudo, Não visitar): um toque registra e o foco passa para a próxima casa. "Trabalho/Todas", seção "Atenção" (estudo e não visitar), "Reordenar" e "+ casa". A descrição pode ser editada depois por qualquer publicador.
6. **Nova casa** (`06-nova-casa.html`) — chips de rua e chip "Nova rua", número opcional, descrição curta, "Salvar e adicionar outra"; aba "Faixa".
7. **Reordenar** (`07-reordenar.html`) — alça de arrastar, subir/descer, "Mover para outra rua", "Adicionar depois desta".
8. **Casa** (`08-casa.html`) — status atual, 4 botões, observação, editar número/descrição, histórico em linha do tempo.
9. **Admin** (`09-admin.html`) — membros, novo cartão (PDF com aviso de várias páginas), quadras e ruas, ciclo (abrir, fechar, reiniciar com confirmação, recalcular).
10. **Instalar o app** (`10-instalar.html`) — Android: botão "Instalar app"; iPhone: passo a passo.
11. **Histórico do cartão** (`11-historico.html`, só admin) — últimos 10 registros de abertura e fechamento de cada cartão, com quem.

Princípio de UI: ações frequentes em um toque, alvos grandes (≥ 48px), texto ≥ 16px, status sempre com cor + forma + nome, sem digitação de rua (só ao criar uma rua nova), indicador discreto de conexão (ícone sozinho quando sincronizado; ícone e palavra em "Sem internet", "Sincronizando", "Não enviado").

## 7. Offline e PWA

- Firestore com `persistentLocalCache` e `persistentMultipleTabManager`; escritas offline ficam na fila e sincronizam ao voltar o sinal.
- Service worker (Workbox via `vite-plugin-pwa`): precache do app shell; `CacheFirst` para a imagem do cartão.
- O PDF original é convertido em imagem leve (WebP) no navegador no momento do envio pelo admin, que sobe imagem e PDF; o app usa a imagem.
- iOS: dados de sites sem uso por ~7 dias podem ser apagados pelo Safari, a menos que o app esteja instalado na tela inicial. O aviso de instalação orienta: no Android há o botão "Instalar app" (usa o evento `beforeinstallprompt`, que só dispara quando o Chrome considera o app instalável, e o Chrome ainda pede uma confirmação); no iPhone só existe o passo a passo "Compartilhar" → "Adicionar à Tela de Início", no Safari.
- Cartões abertos pelo usuário ficam em cache; abrir um cartão uma vez com internet garante uso offline.

## 8. Cota gratuita

| Recurso | Limite diário | Uso estimado |
|---|---|---|
| Leituras Firestore | 50.000 | ~3.000 (30 usuários × 1 cartão de ~100 casas); cache evita releituras |
| Escritas | 20.000 | centenas |
| Armazenamento Firestore | 1 GB | poucos MB |

Mitigações: lista inicial lê só `cards`; casas são lidas apenas ao abrir uma quadra; histórico (`visits`) só ao abrir a casa. Regras de segurança fazem `get()` em `members/{email}`, o que soma 1 leitura por consulta.

## 9. Segurança (Firestore/Storage Rules)

- Leitura e escrita exigem `request.auth` com e-mail em `members` e `ativo == true`.
- Só `admin` escreve em `members`, `cards` (exceto contadores/estado via visita), `blocks` (exceto `ruas`, abaixo), e envia arquivos ao Storage.
- `publicador` pode criar `houses` e `visits` e atualizar os campos de status da casa e contadores do cartão. No cartão, o `estado` do publicador só pode ficar igual ou passar a `fechado` (fechamento automático): **publicador nunca abre cartão**. Em `blocks`, o publicador só altera a chave `ruas` e só **acrescentando** (nunca removendo) ruas.
- `eventos` (abertura e fechamento): leitura só admin; criação pelo admin, ou pelo publicador apenas com `tipo == "fechado"`, `motivo == "fechamento_automatico"` e `porUid == request.auth.uid`; ninguém atualiza nem apaga.
- Dados de "não visitar" e "estudo" são pessoais: nunca públicos, sem leitura anônima.
- Sem Cloud Functions; liberação de membros é um documento criado pelo admin no app.

## 10. Estrutura do projeto (alto nível)

```
src/
  app/            roteamento, layout, tema
  firebase/       init, auth, cache offline
  features/cards/ lista, detalhe, admin do cartão
  features/blocks/
  features/houses/ cadastro rápido, registro de visita, histórico
  features/admin/ membros, importação de PDF, ciclo, histórico de abertura e fechamento
  pwa/            registro do service worker, instalação (Android e iPhone), conexão
firestore.rules · storage.rules · firebase.json
```

Cada feature expõe hooks (`useCards`, `useHouses`, `registrarVisita`) e componentes; a camada `firebase/` é o único lugar que importa o SDK.

## 11. Testes

- **Regras de negócio** (resolvida, fechamento, novo ciclo, reinício, contadores) como funções puras com testes unitários (Vitest).
- **Regras de segurança** com Firebase Emulator Suite.
- **Fluxos principais** (registrar visita offline e sincronizar, cadastrar por faixa, fechar cartão) com Playwright contra o emulador.
- Verificação manual em um Android e um iPhone reais, instalados como PWA.

## 12. Riscos conhecidos

- Contadores denormalizados podem divergir após falhas parciais; mitigado pela ação de recalcular.
- Last-writer-wins no status atual quando dois aparelhos registram a mesma casa offline; histórico preservado.
- Safari/iOS pode limpar o cache; mitigado pela instalação na tela inicial.
- Storage exige plano Blaze (cartão cadastrado); sem cobrança dentro da cota, mas é preciso configurar alerta de orçamento.
- A trava "só cartão aberto recebe visitas" está só na interface. Um aparelho com cache antigo pode ainda mostrar o cartão aberto e gravar uma visita offline; ela sincroniza normalmente (decisão consciente: perder uma visita é pior que aceitar uma a mais).
- O botão "Instalar app" não aparece em todo Android (depende do Chrome achar o app instalável) e não existe no iPhone; nesses casos o passo a passo é o caminho.
