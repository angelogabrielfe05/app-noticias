# Ideias futuras (fora da v1)

Ideias que surgiram durante o projeto e ficaram para depois.

## Já decididas para depois da v1
- Resumo por IA de 2 linhas, "o que mudou e por que importa" (custo de poucos reais por mês; precisa de aprovação)
- Notificação diária: "Seu resumo de hoje está pronto"
- Abas novas: mercado digital, saúde, geopolítica, tecnologia em geral
- Login para sincronizar lidas e salvas entre aparelhos
- Busca e escolha de fontes pelo usuário

## Detalhes da revisão (etapa 5), deixados para depois
Pequenos, sem impacto no uso diário. Vieram do revisor independente em 15/11/2026.
- **Variedade de assuntos:** num dia de notícia muito grande (ex.: "ajuste fiscal"), até 4 das 5 notícias de uma aba podem ser sobre o mesmo tema. Ideia: limite de 2 por assunto.
- **"Também em" entre abas:** a mesma história barrada numa aba (porque já apareceu em outra) não entra na lista de "também noticiaram".
- **Foto que é logotipo:** algumas fontes (ex.: Receita Federal) usam o logotipo do órgão como capa da página, e o filtro não pega todos os casos. Também: se a página estava fora do ar na hora da coleta, a notícia fica sem foto por 7 dias.
- **S&P 500 durante o pregão:** o valor pode ser parcial do dia, sem aviso de que ainda não é o fechamento.
- **Fonte itálica (147 KB):** só aparece em "Você está em dia" e nas telas vazias; dá para tirá-la da cópia para uso sem internet ou reduzir o arquivo.
- **Recarregar ao voltar ao app:** hoje ele busca dados novos sempre que a última edição tem mais de 30 min; o ideal é contar a partir da última busca.
- **Ícones grandes fora da cópia sem internet:** `icone-512.png` e os ícones maskable não são guardados pelo service worker (não afeta o uso).
- **Tamanho do repositório:** cada coleta faz um commit (inclui o acervo de ~0,5 MB). O git comprime bem, mas vale olhar o tamanho a cada alguns meses.
