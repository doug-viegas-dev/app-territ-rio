# Meu Território

PWA em português do Brasil para uma congregação registrar as casas de cada quadra e cartão de território, com histórico de visitas, funcionamento offline e Firebase (Auth, Firestore, Storage, Hosting).

## Rodar no computador

Pré-requisitos: Node 22 e Java 21 (os emuladores do Firebase precisam dele).

```bash
npm install
cp .env.example .env
npm run dev
```

O `.env.example` já aponta para os emuladores (`VITE_USE_EMULATORS=true`). Para usar o app com dados de teste, suba os emuladores em outro terminal:

```bash
npx firebase emulators:start --only auth,firestore,storage
```

## Testes

```bash
npm test                 # unidade (domínio e telas)
npm run lint
npx firebase emulators:exec --only firestore,storage "npx vitest run tests/rules"   # regras de segurança
npm run e2e              # fluxos completos no navegador, contra os emuladores
```

O `npm run e2e` precisa do Chromium do Playwright. Na primeira vez, rode `npx playwright install chromium`. Se preferir usar o Chrome já instalado, defina `E2E_CANAL=chrome` antes do comando.

## Publicar (Firebase)

Estes passos são feitos uma única vez, no console do Firebase e no terminal.

1. **Criar o projeto** em <https://console.firebase.google.com>.
2. **Plano Blaze.** Faça o upgrade para o plano Blaze (pago conforme o uso). O Cloud Storage exige esse plano. O uso esperado de uma congregação fica dentro da cota gratuita.
3. **Alerta de orçamento.** No console do Google Cloud, em Faturamento > Orçamentos e alertas, crie um orçamento baixo (por exemplo, R$ 20 por mês) com alertas por e-mail. Assim qualquer gasto inesperado é avisado cedo.
4. **Ativar o login.** Em Authentication > Método de login, ative **Google**.
5. **Criar o Firestore e o Storage** pelo console (modo produção; as regras vêm deste repositório).
6. **Registrar o app web** (Configurações do projeto > Seus apps) e copiar as chaves para um arquivo `.env` com `VITE_USE_EMULATORS=false`. Use o `.env.example` como modelo. Nunca envie o `.env` para o repositório.
7. **Apontar o projeto:** `npx firebase use --add` e escolha o projeto criado (isso atualiza `.firebaserc`).
8. **Criar o primeiro administrador** à mão, no console do Firestore. Em `members`, crie um documento cujo ID seja o seu e-mail Google, **em minúsculas**, com os campos:
   - `nome` (texto): seu nome
   - `papel` (texto): `admin`
   - `ativo` (booleano): `true`

   Depois disso, os demais membros são liberados pela tela Administração do app.
9. **Publicar:**

   ```bash
   npm run deploy
   ```

   Isso gera o build e publica o Hosting, as regras do Firestore e as regras do Storage (`firebase deploy --only hosting,firestore:rules,storage`).
10. Em Authentication > Configurações > Domínios autorizados, confirme que o endereço do Hosting (`seu-projeto.web.app`) está na lista.

## Instalar no celular

**Android (Chrome):** abra o endereço do app, toque em **Instalar app** (aviso no topo da lista de cartões) e confirme. Se o botão não aparecer, abra o menu do Chrome (três pontos) e escolha **Instalar app** ou **Adicionar à tela inicial**. O ícone "Território" aparece na tela inicial.

**iPhone (Safari):** a instalação só funciona no Safari.
1. Abra o endereço do app no Safari.
2. Toque em **Compartilhar**.
3. Toque em **Adicionar à Tela de Início**.
4. Toque em **Adicionar**.

## Como o offline funciona

Depois do primeiro acesso com internet, o app abre sem rede. Visitas e casas cadastradas sem internet ficam guardadas no aparelho e são enviadas sozinhas quando a conexão volta. Enquanto isso, o topo mostra "Sem internet".

## Estrutura

- `src/domain/`: regras de negócio, funções puras, sem Firebase.
- `src/firebase/`: único lugar que usa o SDK do Firebase.
- `src/features/`: telas por área (auth, cards, houses, admin).
- `src/pwa/`: instalação e aviso de conexão.
- `tests/rules/`: testes das regras de segurança.
- `tests/e2e/`: testes de ponta a ponta (Playwright + emuladores).
