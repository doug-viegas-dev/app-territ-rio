# Apagar o histórico vencido (Time to live)

O app já esconde as visitas com mais de 2 anos. Este passo faz o Firestore apagar de verdade esses registros. É um passo seu, no console do Firebase, feito uma vez.

1. Abra o [console do Firebase](https://console.firebase.google.com) e escolha o projeto.
2. Vá em **Firestore Database** e abra a aba **Time to live**.
3. Escolha **Criar política**.
4. Em **Grupo de coleções**, escreva `visits`. Em **Campo de carimbo de data/hora**, escreva `expiraEm`.
5. Confirme.

## O que esperar

- O apagamento não é imediato: pode levar cerca de 1 dia depois do vencimento.
- O apagamento é definitivo: não há como recuperar um registro apagado.
- Enquanto isso, o app não mostra o que já venceu.
- Só apaga documentos que têm o campo `expiraEm`. Visitas antigas ganham esse campo com **Atualizar dados** (veja abaixo).

## Ordem de publicação

1. Publicar o app novo.
2. Em cada cartão, abrir Administração e tocar em **Atualizar dados** (precisa de internet).
3. Só depois ligar o TTL.

Ligar o TTL antes do passo 2 não apaga visitas antigas por engano, pois elas ainda não têm `expiraEm`; mas ficariam sem prazo até a atualização.
