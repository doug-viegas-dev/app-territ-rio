# Revisão de simplicidade (etapa 6): lista, sem implementação

Base: passe pelo modo demo no navegador, em 375x812 (registrar, abrir quadra, abrir/encerrar volta, detalhes); fechar cartão só pela leitura da tela.

- Registrar na rua: 2 toques (casa, resultado). Marcar "Não visitar" ou "Estudo" exige 3 (casa, Detalhes, interruptor) e fica fora da lista da quadra.
- A barra de registro ocupa cerca de 210px de 812 e, com o cabeçalho e a faixa da volta fixos, sobra pouco espaço para a lista.
- A faixa da volta quebra em 3 linhas ("Volta 1 · aberta por Visitante (demonstração) às 11:00"); o nome e a hora poderiam ir para uma segunda linha curta.
- O botão de adicionar casa cobre o status e a data da última linha visível da lista.
- Sem volta aberta, os 4 botões de registro aparecem apagados; o motivo está só na faixa acima, e a barra não o repete.
- "Abrir volta" e "Encerrar volta" aparecem em toda tela da quadra e da casa; o texto do status da volta é longo para quem só quer registrar.
- "Fechar cartão" fica abaixo do cabeçalho em duas telas; o aviso "Encerre as voltas abertas antes de fechar" só aparece depois do toque.
- Detalhes da casa: histórico e observação ficam abaixo da dobra; o aviso de dado pessoal ocupa três linhas antes do campo.
- Selos "Estudo" e "Não visitar" na lista dependem de ícone e texto pequenos; conferir leitura ao sol em aparelho real.
