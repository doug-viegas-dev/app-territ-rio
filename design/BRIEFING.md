# Briefing de design — Meu Território

Leia antes: `design/identidade/README.md` e `design/identidade/identidade-visual.png` (cores, fonte, status, ícone) e a seção 6 do spec `docs/superpowers/specs/2026-11-06-app-territorios-design.md`.

## Quem usa e como

- Publicadores de uma congregação, de ~20 a 80 anos, a maioria no celular, **em pé na rua, sob sol, com uma mão**, muitas vezes sem internet.
- Não são técnicos. O app precisa ser óbvio sem explicação.
- Dados sensíveis (quem pediu para não ser visitado, estudos): nunca em destaque público, sem nomes de moradores.

## Princípios

1. **Um toque para registrar uma visita.** É a ação mais frequente.
2. Alvos de toque ≥ 48px, texto base ≥ 16px, contraste AA.
3. Status sempre com **cor + forma + nome** (círculo/visto, quadrado/relógio, losango/livro, octógono/traço). Nunca só cor.
4. Mobile primeiro (390px de largura). Sem menus escondidos; no máximo 3 itens de navegação.
5. Tom dos textos: calmo, curto, respeitoso, em português do Brasil, sem gíria e sem exclamações.
6. Estados visíveis: offline ("Sem internet — suas anotações serão enviadas depois"), sincronizando e sincronizado, de forma discreta.

## Telas a desenhar (modo claro e escuro)

1. **Entrar** — logo, botão "Entrar com Google". Linha: "Ferramenta feita pela e para a congregação. Não é um app oficial."
2. **Aguardando liberação** — explica que o administrador precisa liberar o e-mail; botão "Sair".
3. **Cartões** — seções "Em andamento" e "Fechados"; cada cartão: número, título, barra de progresso e "12/30". Estado vazio: "Nenhum cartão ainda".
4. **Cartão** — imagem do mapa (toque para ampliar), botão "Abrir no Google Maps", lista de quadras com progresso. Cartão fechado mostra aviso "Cartão fechado".
5. **Quadra** — casas agrupadas por rua, **na ordem física**. Cada casa: rótulo ("120 · portão azul" ou só a descrição), status atual e 4 botões grandes: Conversado, Não atendeu, Estudo, Não visitar. Alternância "Trabalho / Todas". Seção "Atenção" para Estudo e Não visitar. Botão "+ casa" e botão "Reordenar".
6. **Nova casa** — chips de ruas, número (opcional), descrição curta, "Salvar e adicionar outra"; aba "Faixa" (início, fim, pares/ímpares). Aviso suave de número repetido.
7. **Reordenar** — lista com alça de arrastar e botões Subir/Descer, "Mover para outra rua", "Adicionar depois desta".
8. **Casa** — status atual, 4 botões, observação opcional, editar número/descrição, histórico em linha do tempo (status, data, quem, ciclo, observação).
9. **Admin** — membros (e-mail, nome, papel, ativo), criar cartão (número, título, link do Maps, enviar PDF com aviso de várias páginas), quadras e ruas, ciclo (Fechar, Reabrir, Reiniciar com confirmação explícita, Recalcular contadores).
10. **Instalar o app** — aviso dispensável com passo a passo para iPhone ("Compartilhar" → "Adicionar à Tela de Início") e Android.

## Estados a mostrar em cada tela quando fizer sentido

Vazio · carregando · offline · erro ao enviar · cartão fechado · casa sem número · quadra sem casas.

## Entrega esperada

- Protótipo HTML/CSS estático e navegável em 390px, com as 10 telas, claro e escuro, usando variáveis CSS com os tokens do README da identidade.
- Uma página de "componentes": botão de status (4 estados + selecionado), linha de casa, chip de rua, barra de progresso, aviso de offline.
- Nada de bibliotecas pesadas: CSS puro, fonte Nunito Sans.

## Prompt para colar na nova conversa

```
Vou desenhar as telas do app "Meu Território" (PWA). Leia design/BRIEFING.md, design/identidade/README.md, olhe design/identidade/identidade-visual.png e a seção 6 de docs/superpowers/specs/2026-11-06-app-territorios-design.md. Siga a identidade visual à risca (cores, fonte, formas de status). Comece mostrando 3 direções de layout para a tela da Quadra (a mais importante) e espere eu escolher; depois desenhe as outras telas na direção escolhida. Não implemente o app, só o protótipo em design/prototipo/.
```
