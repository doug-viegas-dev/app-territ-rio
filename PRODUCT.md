# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Membros de uma congregação, de 20 a 80 anos, na rua, com o celular em uma mão. Não são técnicos. Registram o resultado de cada visita nas casas de uma quadra. Administradores (poucos) criam cartões de território, liberam membros e fecham o ciclo.

## Product Purpose
PWA em português do Brasil para registrar casas por quadra e por cartão de território, com histórico de visitas, funcionando offline (Firebase). Sucesso: registrar uma visita em poucos toques, sem dúvida sobre o estado da casa e sem perder dados sem internet.

## Positioning
Ferramenta feita pela e para a congregação (não é app oficial); feita para uso de campo com uma mão, não para escritório.

## Operating Context
Uso na rua, sol, uma mão, conexão instável. Cartões só abrem por administradores; visitas e cadastro só em cartão aberto (travado na interface). Tema claro/escuro segue o sistema.

## Capabilities and Constraints
- Status de casa sempre cor + forma + nome (nunca só cor); rótulos em `src/domain/rotulos.ts`.
- Alvos de toque ≥ 48px, texto ≥ 16px, contraste AA. Âmbar só como fundo, nunca como cor de texto.
- Nunito Sans hospedada (400, 500, 600; nunca 700).
- Dados sensíveis (quem pediu para não ser visitado, estudos) nunca em destaque público, sem nomes de moradores.
- Todo acesso ao Firebase fica em `src/firebase/`.

## Brand Commitments
Nome: Meu Território. Tom calmo, curto e respeitoso, sem gíria nem exclamações. Ícone: casa com caminho âmbar (`design/identidade/`).

## Product Principles
1. Uma tarefa por tela, com uma ação principal evidente.
2. O estado da casa se entende de relance, sem depender de cor.
3. Calmo e respeitoso: nada pede atenção sem precisar.
4. Offline é normal, não erro.

## Accessibility & Inclusion
WCAG AA, texto grande, alvos grandes, `prefers-reduced-motion` respeitado, tema escuro pelo sistema.

<!-- Inferido de AGENTS.md e do código; não houve entrevista de produto. A direção visual desta rodada (leve, organizada, clean, a partir de 3 referências em roxo/azul suave) veio do usuário. -->
