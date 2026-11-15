# Revisão e teste (etapa 5)

Data: 15/11/2026. Revisão feita antes da publicação, em duas frentes:
1. **Revisor independente:** um assistente que não participou da construção recebeu só o `prd.md`, o `tarefas.md` e o código, com um checklist (funcionalidade × PRD, bugs, segurança, uso sem internet, publicação, robô, acessibilidade, desempenho e qualidade).
2. **Testes no navegador:** todos os fluxos do PRD em largura de celular (360 px) e de computador (1280 px), no tema claro e no escuro, sem internet e com dados quebrados de propósito.

## Resultado geral
- **Funcionalidades do PRD:** todas presentes e funcionando. Nada fora do escopo entrou.
- **Segurança:** nenhum problema. Um teste com código malicioso dentro de uma notícia mostrou o código só como texto. Links e fotos perigosos (`javascript:`, `http:`) foram descartados. Nenhuma senha ou chave no repositório. `npm audit`: 0 vulnerabilidades.
- **Console do navegador:** zero erros em todos os testes.

## O que foi testado (e passou)
| Fluxo | Resultado |
|---|---|
| Primeira visita, troca entre as 4 abas, até 5 notícias por aba | ok |
| Painel de números em Economia e Mercado | ok (some sozinho se o arquivo de números faltar, sem afetar as notícias) |
| Marcar como lida → contador da aba → "Você está em dia" → desmarcar | ok |
| Salvar, ver em Salvos, remover; tudo continua depois de recarregar | ok |
| Explicador de termos (abre, fecha com Esc ou toque fora) | ok |
| "Abrir fonte" abre o site original numa aba nova e marca como lida | ok |
| Sem internet: notícias, fotos e aviso "Sem internet" | ok (abre em ~0,1 s) |
| Dados indisponíveis ou corrompidos: tela "Não foi possível carregar" com "Tentar de novo" | ok |
| Aba sem notícias: mensagem explicando | ok |
| Edição com mais de 12 h: aviso "pode estar desatualizado" | ok |
| Tema escuro, computador, sem rolagem lateral em 360 px | ok |
| Teclado: foco visível em todos os botões | ok |
| App dentro de uma subpasta (como no GitHub Pages) | ok (testado pelo revisor) |

## Corrigido nesta etapa
**Problemas médios (5):**
1. **App em branco com dado estranho guardado no celular.** Um valor inválido na lista de lidas travava o app. Agora é ignorado.
2. **App travado por um salvo com data inválida.** Agora o salvo aparece normalmente, sem a data.
3. **Notícia lida "voltava" como não lida** quando a mesma história trocava de link entre uma coleta e outra (ex.: chegou a versão de uma fonte oficial). O robô agora publica os endereços de todas as versões, e o app herda a marcação.
4. **Aba IA dominada por uma única busca:** 4 de 5 notícias eram da Anthropic, incluindo "Claude caiu?". Agora cada busca do Google Notícias entra no máximo 1 vez por aba, e "instável" e "caiu" pesam contra na IA. Continua havendo pelo menos 1 notícia sobre o Claude quando existir.
5. **Espera longa com sinal fraco:** se a internet demorar mais de 4 s ou responder com erro, o app mostra a última cópia guardada (e renova quando a resposta chegar).

**Detalhes pequenos (12, aprovados pelo Angelo):**
- Botões dos cartões com 44 px de altura (tamanho recomendado para o dedo), ainda numa linha só em 360 px.
- O app guarda só a foto grande da manchete e a miniatura das outras (antes guardava as duas de todas: ~350 KB a menos por edição).
- Cor da barra do celular e da tela de abertura atualizadas para o visual "Revista elegante".
- PIB passou a ter cor neutra (crescer menos do que antes não é queda).
- Quando a janela de notícias é ampliada para 96 h, o app diz "nos últimos dias" em vez de "hoje".
- Cartão lido: o contraste do texto agora fica acima do mínimo de acessibilidade (4,5:1).
- Leitores de tela: rótulos dos botões batem com o texto visível, a marca "✓" é lida como "Lida" e, ao trocar de aba, a leitura começa pelo conteúdo novo.
- Abrir o app por um atalho do ícone (ex.: Economia) também lembra essa aba.
- O service worker confere com o servidor ao renovar o app (evita guardar uma versão velha logo após uma atualização).
- Robô: se o acervo ou a memória de fotos corromperem, ele recomeça do zero em vez de parar (testado de propósito).
- Proteção extra para fotos com dados incompletos.

## Pendências
- **Robô pulando horários (importante):** em 22 h, o GitHub rodou o robô só 3 das 7 vezes previstas (intervalos de 8 e 10 h). Isso é comportamento do GitHub, não um erro do código. **Solução aprovada:** na etapa 6, configurar o cron-job.org (gratuito) para chamar o robô nos horários certos.
- **Publicação:** o GitHub Pages ainda não está ativado. Ele só publica a raiz ou a pasta `docs/`, e os commits do robô não disparam outros workflows. Por isso a publicação da pasta `app/` vai ser feita por um passo de deploy dentro do próprio robô, mais um workflow para as mudanças de código (etapa 6).
- **Detalhes menores adiados:** 8 itens em `docs/ideias-futuras.md`, seção "Detalhes da revisão".
