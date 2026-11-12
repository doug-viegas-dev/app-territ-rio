# Meu Território

PWA em português do Brasil para uma congregação registrar as casas de cada quadra e cartão de território, com histórico de visitas, funcionamento offline e sincronização automática. Pensado para quem usa na rua, de 20 a 80 anos, com o celular em uma mão e conexão instável.

> Projeto pessoal feito de ponta a ponta com auxilio do Claude Code: produto, design, front-end, regras de segurança e testes.

**Stack:** React 18 · TypeScript · Vite · Firebase (Auth, Firestore, Storage) · PWA com service worker · Vitest · Playwright · Vercel

> ### 👉 [Experimente a demonstração](https://meu-territorio.vercel.app/)
> Sem cadastro: toque em **Explorar demonstração** na tela de entrada. Os dados ficam só no seu aparelho.

## Por que este projeto

O público não é técnico e usa o app em pé, sob sol, muitas vezes sem internet. Isso guiou as decisões:

- **Offline é normal, não erro.** Visitas e casas cadastradas sem rede ficam no aparelho e sobem sozinhas quando a conexão volta.
- **Estado da casa entendido de relance.** Todo status combina cor, forma e nome, nunca só cor (acessível para daltonismo e sol forte).
- **Acessibilidade como requisito.** Alvos de toque de 48 px ou mais, texto de 16 px ou mais, contraste AA, tema claro e escuro conforme o sistema, `prefers-reduced-motion` respeitado.
- **Uma tarefa por tela**, com uma ação principal evidente.
- **Privacidade.** Dados sensíveis nunca aparecem em destaque público nem com nome de morador.

## Funcionalidades

- Login com Google e liberação de membros por administradores
- Cartões de território com quadras, ruas e casas, com reordenação por arrastar
- Registro de visita em poucos toques, com histórico por casa e por cartão
- Ciclo do cartão: abertura, fechamento automático ao resolver a última casa e novo ciclo
- Importação de mapa (imagem ou PDF) para o cartão
- Painel de administração: membros, quadras, cartões e fechamento de ciclo
- Instalável no Android e no iPhone, com aviso claro de "Sem internet"
- **Modo demonstração** na tela de login: explore o app sem conta, com dados em memória e sem tocar no banco real

## Arquitetura

```
src/
  domain/     regras de negócio como funções puras (status, ciclo, ordem, faixas), sem Firebase
  firebase/   único lugar que importa o SDK do Firebase
  features/   telas por área: auth, cards, houses, admin
  demo/       banco em memória para o modo demonstração
  pwa/        instalação e aviso de conexão
tests/
  rules/      testes das regras de segurança (emulador)
  e2e/        fluxos completos no navegador (Playwright + emuladores)
```

Decisões de engenharia que valem destaque:

- **Domínio puro e testável.** As regras de negócio não conhecem Firebase nem React; são testadas isoladamente.
- **Fronteira verificada por teste.** Um teste de arquitetura (`tests/arquitetura.test.ts`) falha se qualquer arquivo fora de `src/firebase/` importar o SDK.
- **Regras de segurança testadas.** `firestore.rules` e `storage.rules` têm testes com `@firebase/rules-unit-testing`, separando papéis de administrador e publicador.
- **Modo demo isolado.** A mesma interface roda sobre um banco em memória, o que também permite demonstrar o app sem expor dados reais.

## Testes

```bash
npm test         # unidade: domínio e telas (180 testes)
npm run lint
npm run build    # checagem de tipos + build de produção
```

Testes que dependem dos emuladores do Firebase (precisam de Java 21):

```bash
npx firebase emulators:exec --only firestore,storage "npx vitest run tests/rules"   # regras de segurança
npm run e2e                                                                          # ponta a ponta
```

O `npm run e2e` precisa do Chromium do Playwright. Na primeira vez, rode `npx playwright install chromium`. Para usar o Chrome já instalado, defina `E2E_CANAL=chrome`.

## Rodar localmente

Pré-requisitos: Node 22 e Java 21 (só para os emuladores).

```bash
npm install
cp .env.example .env     # já aponta para os emuladores
npm run dev
```

Para ter login e dados de teste, suba os emuladores em outro terminal:

```bash
npx firebase emulators:start --only auth,firestore,storage
```

Ou, mais simples, use o **modo demonstração** na tela de login, que dispensa emuladores.

## Publicar

O app roda na Vercel (preset Vite, build `npm run build`, saída `dist`; o `vercel.json` cuida das rotas). Firebase fornece Auth, Firestore e Storage.

1. Crie o projeto no [console do Firebase](https://console.firebase.google.com), ative o plano Blaze (exigido pelo Storage) e crie um alerta de orçamento baixo.
2. Ative o login com **Google** em Authentication e crie o Firestore e o Storage em modo produção.
3. Registre o app web e copie as chaves para um `.env` com `VITE_USE_EMULATORS=false`, usando o `.env.example` como modelo. O `.env` nunca vai para o repositório.
4. Aponte o projeto com `npx firebase use --add` e publique as regras: `npm run deploy:regras`.
5. Crie o primeiro administrador no console do Firestore: em `members`, um documento com ID igual ao seu e-mail Google em minúsculas e os campos `nome`, `papel: "admin"` e `ativo: true`. Os demais membros são liberados pela tela de Administração.
6. Na Vercel, cadastre as variáveis `VITE_FIREBASE_*` e `VITE_USE_EMULATORS=false`, e adicione o domínio da Vercel em Authentication > Domínios autorizados.

### Ordem de publicação de uma versão com mudança nos dados

1. Publicar o app novo.
2. Rodar **Atualizar dados** em cada cartão (Administração, com internet).
3. Ligar o TTL do histórico, conforme [`docs/ttl-historico.md`](docs/ttl-historico.md).

## Instalar no celular

- **Android (Chrome):** toque em **Instalar app** (aviso no topo da lista de cartões) ou use o menu do Chrome > **Instalar app**.
- **iPhone (Safari):** Compartilhar > **Adicionar à Tela de Início** > **Adicionar**.

## Cloud Function

A função `apagarContaAoRemoverMembro` (em `functions/`) apaga a conta do Auth quando um membro é removido.

```bash
npm run build:funcoes   # compila a função
npm run test:funcoes    # testa com os emuladores de Auth, Firestore e Functions
npm run deploy:funcoes  # publica a função
```

O plano Blaze e o deploy são feitos pelo usuário no console do Firebase.

## Design e documentação

- [`design/`](design/): briefing, identidade visual e protótipo estático das telas
- [`PRODUCT.md`](PRODUCT.md): usuários, propósito e princípios do produto
- [`docs/superpowers/`](docs/superpowers/): especificação e plano de implementação, tarefa por tarefa

As chaves do Firebase de um app web não são segredos (o acesso é protegido pelas regras de segurança), mas este repositório não contém nenhuma: só o `.env.example` com valores de emulador.

## Aviso

Ferramenta feita pela e para uma congregação. Não é um app oficial.

## Autor

**Douglas Xavier Viégas** · [GitHub](https://github.com/doug-viegas-dev)
