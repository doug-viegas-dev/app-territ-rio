# Meu Território — instruções para agentes de código

PWA em português do Brasil para uma congregação registrar casas por quadra e cartão de território, com histórico de visitas, offline, Firebase. Usuários não técnicos, de 20 a 80 anos, no celular, na rua, com uma mão.

## Fontes da verdade (já aprovadas: não faça brainstorming nem proponha novo design)

- Plano, tarefa por tarefa: `docs/superpowers/plans/2026-11-06-app-territorios.md` (leia o cabeçalho, Global Constraints, Review Focus, a tabela de referência visual e a tarefa pedida).
- Spec: `docs/superpowers/specs/2026-11-06-app-territorios-design.md` (só a seção relevante).
- Visual e textos: protótipo estático em `design/prototipo/` (abra `index.html`; cada tarefa de tela indica o arquivo) e `design/identidade/README.md`.
- Prompts e ordem das tarefas: `docs/superpowers/plans/prompts-codex.md`.

## Como trabalhar

- Faça **somente a tarefa pedida**, seguindo os steps na ordem: teste falhando, implementação, teste passando, commit. Não adiante tarefas seguintes nem refatore o que é de tarefas anteriores.
- Para nomes e assinaturas de tarefas anteriores, **leia o código existente** em vez de supor.
- Antes de começar, confira os pré-requisitos da tarefa. Se faltar algum, pare e diga qual.
- No fim: rode os testes da tarefa, informe o resultado real (inclusive falhas) e liste o que ficou pendente ou não foi verificado. Não declare "pronto" sem ter rodado os comandos.
- Um commit por tarefa, com a mensagem indicada no plano. Não altere `docs/` nem `design/`, salvo se a tarefa mandar; se achar erro no plano ou no spec, pare e relate.
- Nunca coloque chaves, senhas ou `.env` real no repositório (só `.env.example`).

## Regras que valem em todo o código

- Interface e textos em português do Brasil, tom calmo, curto e respeitoso, sem gíria e sem exclamações; copie os textos do protótipo.
- Status de casa sempre com **cor + forma + nome**, nunca só cor. Rótulos em `src/domain/rotulos.ts`.
- Alvos de toque ≥ 48px, texto ≥ 16px, contraste AA. Âmbar só como fundo (nunca como cor de texto).
- Fonte Nunito Sans hospedada no app (pesos 400, 500, 600; nunca 700). Tema claro/escuro segue o sistema.
- Todo acesso ao SDK do Firebase fica em `src/firebase/` (há teste que verifica).
- Regras de negócio são funções puras em `src/domain/`, sem Firebase.
- Só administradores abrem cartões; visitas e cadastro só em cartão aberto, travado na **interface**, não nas regras de segurança.
- Dados sensíveis (quem pediu para não ser visitado, estudos): nunca em destaque público, sem nomes de moradores.

## Ambiente

- Windows 11. Node 22 e Java 21 (para os emuladores do Firebase) já instalados. Use comandos que funcionem em PowerShell.
- O repositório git ainda não existe: a Tarefa 1 faz `git init`.
- Os passos no console do Firebase (criar projeto, plano Blaze, Auth com Google) e os testes em celular real são do usuário; não tente fazê-los.
