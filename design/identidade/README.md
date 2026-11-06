# Identidade visual — Meu Território

Fonte: `identidade-visual.png` (nesta pasta). Conceito: "Casa, mapa e caminho". Azul-violeta sereno, âmbar para dar presença. Formas planas, sem gradientes nem sombras.

## Cores da marca (modo claro)

| Token | Nome | HEX | Uso |
|---|---|---|---|
| `--cor-principal` | Principal | `#55658C` | Botões primários, cabeçalho, ícone do app |
| `--cor-secundaria` | Secundária | `#D9DFF0` | Fundos de cartões, chips, áreas suaves |
| `--cor-destaque` | Destaque | `#E5AD50` | Detalhes e realces (ver aviso abaixo) |
| `--cor-fundo` | Fundo claro | `#F6F7FA` | Fundo das telas |
| `--cor-texto` | Texto | `#252C3B` | Texto principal |
| `--cor-fundo-escuro` | Fundo escuro | `#171C28` | Fundo do modo escuro |

Regras de contraste:
- Âmbar `#E5AD50` nunca como cor de texto nem de ícone pequeno sobre fundo claro (contraste baixo).
- Âmbar como **fundo** de um elemento: texto e ícone em `#252C3B`.
- Usos permitidos: preenchimento da barra de progresso, botão flutuante "+ casa" (ícone escuro), sublinhado do item ativo, o caminho do ícone do app.
- Texto branco só sobre `#55658C` ou mais escuro; texto `#252C3B` sobre `#D9DFF0`, `#F6F7FA` e âmbar.

## Status (cor + forma + nome, nunca só a cor)

| Status no app | Nome na identidade | HEX (claro) | Forma |
|---|---|---|---|
| `falado` | Conversado | `#27745B` | Círculo com visto |
| `sem_resposta` | Não atendeu | `#8A5B14` | Quadrado com relógio |
| `estudo` | Estudo | `#7950A5` | Losango com livro |
| `nao_visitar` | Não visitar | `#A84643` | Octógono com traço |

`pendente` não tem cor de status; usar neutro (borda cinza sobre `--cor-secundaria`).

Modo escuro: a imagem mostra versões mais claras destas quatro cores (verde-água, âmbar, lilás, salmão). Os HEX exatos não estão na imagem e devem ser definidos ao montar o tema escuro, mantendo contraste AA sobre `#171C28`.

## Tipografia

Nunito Sans (Google Fonts): títulos 600/700, texto 400, rótulos 600. Tamanho mínimo de apoio visto na imagem: 48 px para o ícone pequeno.

## Ícone

Casa com caminho âmbar sobre quadrado arredondado azul-violeta, com a casa e o mapa em tom claro. SVG-mestre nesta pasta: `icone.svg` (quadrado arredondado) e `icone-maskable.svg` (fundo sangrado, arte na zona segura de 80%). Foram redesenhados à mão a partir de `identidade-visual.png` e valem como ponto de partida: se o desenho final do ícone vier de um designer, substitua os dois SVG e rode o script da Tarefa 16, que gera os PNG (192, 512, maskable 512) e o favicon.

Tokens de interface (claro e escuro), componentes e telas: `design/prototipo/`.

## Texto de marca

- Nome: Meu Território. Nome curto no ícone: Território.
- Sem logos ou marcas de terceiros; identidade própria.
