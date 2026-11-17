# Cadastro de casas e ruas na própria tela da quadra, e teclado que não cobre o campo

Design curto. Aprovado na conversa, falta a aprovação deste texto.

## Intenção e porquê

Uma pessoa cadastra as casas na rua e marca o resultado de cada uma. Quando o par chega a uma casa (por exemplo a 232) que ainda não tem resultado, ela cadastra a casa, segue cadastrando as da frente e marca a 232 depois. Hoje isso obriga a sair da folha de cadastro, voltar à lista e abrir a casa. Isso quebra o ritmo de quem trabalha na rua, com uma mão.

Segundo problema, em todo o app: o teclado do celular cobre o campo que está sendo digitado, principalmente nas folhas de baixo (Nova rua, Nova casa).

## Objetivos

- Cadastrar casa e rua na tela da quadra, sem abrir outra tela.
- A casa recém-cadastrada fica em foco na barra de resultados já existente, e pode ser marcada agora ou depois com um toque nela.
- Nenhum campo de texto do app fica atrás do teclado.

## Não objetivos

- Não muda regras de negócio, modelo de dados nem regras de segurança. `criarCasa`, `criarCasasEmFaixa` e `adicionarRua` continuam como estão.
- Não mostra atividade de outras pessoas (marcas de novidade, painel de quem está trabalhando). Descartado nesta conversa.
- Não remove a folha de cadastro atual: ela fica para os casos raros.

## Anti-objetivos

- Alvos de toque menores que 48px ou texto menor que 16px, para caber mais na tela. Descartado explicitamente pelo usuário.
- Teclado aberto escondendo o campo, em qualquer tela.

## Abordagens consideradas

1. **Campo de cadastro na lista (escolhida, ideia do usuário).** Reaproveita a lista e a barra de resultados da quadra. Custo: a tela da quadra fica um pouco mais cheia.
2. Manter a folha e acrescentar "Cadastradas agora" com botão Marcar. Resolve o caso, mas tira a pessoa da lista.
3. Atalho "voltar à última sem resultado" na folha. Cobre uma casa só.

## Design

### Campo de cadastro na tela da quadra (`QuadraPage`)

- No fim de cada rua, uma linha: campo **Número** (só dígitos, `inputMode="numeric"`) e botão **Adicionar** (52px de altura). Enter também adiciona.
- Abaixo, dois botões de 48px: **Sem número** e **Mais opções**.
- **Sem número** troca o campo de número por **Descrição curta** (obrigatória neste modo; sem texto, avisa "Escreva uma descrição curta"). O modo continua até tocar em **Com número**.
- **Mais opções** abre a `NovaCasaSheet` atual (descrição junto com número, inserir depois de uma casa, faixa).
- Ao adicionar: a casa entra no fim da rua, vira a casa em foco (`focoId`), o campo esvazia e mantém o foco. Aviso de número repetido, como na folha atual ("Já existe um N nesta rua. Pode salvar mesmo assim.").
- Marcar o resultado de qualquer casa é tocar nela na lista e usar a barra, como hoje.
- No fim da lista, o botão **Nova rua** (48px) abre um campo de nome na própria tela (mesmas validações da folha atual: nome vazio e rua repetida).
- O botão "Adicionar casa" do topo sai. "Reordenar" continua.
- Quadra vazia: o mesmo campo no centro, abaixo do convite, no lugar de "Cadastrar a primeira casa".
- Só com o cartão aberto, como hoje. Resultado só com volta aberta, como hoje: sem volta, a casa entra Pendente.
- Em campanha, a barra mostra só os resultados da campanha (já é assim).
- As regras de escrita (`criarCasa`, offline sem esperar a escrita, erro de escrita) são as da `NovaCasaSheet`; a lógica comum vai para um hook ou função compartilhada, sem copiar.

### Teclado (todo o app)

1. `index.html`: `interactive-widget=resizes-content` no `viewport` (Chrome do Android).
2. Plano B para iPhone: um ajuste em `src/app/` lê `window.visualViewport` e grava a altura visível numa variável CSS; `.app`, `.veu` e `.tela-sobre` a usam no lugar de `100dvh` fixo, de modo que folhas e barras fiquem acima do teclado.
3. Em `focusin` de `input`, `textarea` e `select`, rola o campo para o centro da área visível (com atraso curto, depois de o teclado abrir). Um único ponto de código, sem mexer em cada formulário.
4. Na tela da quadra, a barra de resultados fica escondida enquanto um campo de texto da lista está focado e o teclado aberto, e volta ao fechar. Decisão do assistente, para o cadastro caber na área que sobra.

## Restrições

- Português do Brasil, tom calmo e curto, sem exclamação. Textos novos: "Número", "Adicionar", "Sem número", "Com número", "Descrição curta", "Mais opções", "Nova rua".
- Status com cor, forma e nome; âmbar só como fundo. Texto ≥ 16px, alvos ≥ 48px, contraste AA.
- Todo acesso ao Firebase fica em `src/firebase/`; regras de negócio em `src/domain/`. Nada disso muda.
- Modo demonstração (`src/demo/banco.ts`) continua espelhando as funções, que não mudam.

## Fica para quem constrói

- Nome e local do hook/função compartilhada com a `NovaCasaSheet`.
- Se a rua do campo é a última visitada ou a de cada grupo (o desenho usa o campo no fim de cada rua).
- Texto exato do aviso de repetido e dos erros, seguindo o protótipo.
- Como testar o teclado: testes em jsdom para o ajuste e para o `focusin`; a conferência final é no celular real (Chrome do Android e iPhone), nas telas Nova rua, Nova casa, cadastro na quadra, Entrar e formulários de Administração.
