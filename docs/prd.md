# PRD — NEWs, app de notícias (v1)

> PRD = "Documento de Requisitos do Produto": o que o app faz, para quem e o que fica de fora.
> Data: 13/11/2026 · Status: aguardando aprovação

## 1. Problema

Acompanhar o que realmente importa (política, economia, mercado e IA) exige pular entre muitos sites, e a maior parte do que aparece é ruído. O Angelo quer se manter atualizado de forma rápida e confiável, com fontes brasileiras e oficiais, para entender o país, as próprias finanças e a tecnologia, e evoluir pessoalmente.

## 2. Para quem

Uso pessoal do Angelo, principalmente no celular, alguns minutos por dia.

## 3. O que a v1 faz

### 3.1 Quatro abas

| Aba | Cobre | Fontes preferidas (a confirmar na construção) |
|---|---|---|
| **Política do Brasil** | O que o presidente e o governo fazem, decretos, votações na Câmara e no Senado, leis sancionadas, decisões do STF que mudam regras | Planalto/Gov.br, Agência Câmara de Notícias, Agência Senado, Portal do STF, Agência Brasil |
| **Economia** | Selic/Copom, inflação, PIB, câmbio, impostos, contas do governo | Banco Central, Agência IBGE de Notícias, Tesouro Nacional, Ministério da Fazenda, Receita Federal, Agência Brasil |
| **Mercado e bolsa** | Ibovespa, resultados de empresas, dividendos, renda fixa, FIIs, cenário internacional | B3, CVM, Tesouro Direto, além de veículos brasileiros de finanças reconhecidos |
| **Inteligência artificial** | Lançamentos, uso prático, regulação, mercado | Fontes brasileiras de tecnologia, órgãos oficiais (ANPD, MCTI, Senado no caso do marco legal da IA) e blogs oficiais das empresas de IA, que podem estar em inglês |

### 3.2 "Só o importante"
- **No máximo 5 notícias por aba**, das últimas 24 a 48 horas.
- Seleção **automática e gratuita**: o app lê as fontes, filtra pelas palavras-chave de cada tema, dá prioridade às fontes oficiais e remove notícias repetidas (a mesma notícia publicada em dois lugares aparece uma vez só).
- Cada notícia mostra: **título, fonte, data/hora e o resumo publicado pela própria fonte**.
- As notícias **se atualizam sozinhas algumas vezes ao dia**, mesmo com o app fechado. Quando você abre o app, tudo já está pronto.

### 3.3 Painel de números (abas Economia e Mercado)
- **Economia:** Selic, IPCA acumulado em 12 meses, dólar (PTAX) e PIB do último trimestre.
- **Mercado:** Ibovespa, CDI, IFIX e um índice internacional (ex.: S&P 500).
- Dados de fontes públicas e gratuitas (ex.: Banco Central). Se algum número não tiver uma fonte gratuita e confiável, ele sai do painel e a mudança fica registrada aqui.
- Cada número mostra a data da última atualização.

### 3.4 Recursos de leitura e evolução
- **Abrir a fonte original:** um botão em cada notícia abre o site de onde ela veio.
- **Marcar como lida:** a notícia lida fica apagada, e cada aba mostra um aviso "você está em dia" quando tudo foi lido.
- **Salvar para depois:** guarda a notícia numa lista de salvos para reler com calma.
- **Explicador de termos:** termos como Copom, IPCA, FII, PTAX, PEC e LLM aparecem destacados. Ao tocar, abre uma explicação curta do que é e por que importa. A v1 começa com uma lista de cerca de 40 termos.

### 3.5 Uso e visual
- Pensado para celular, com opção de **instalar na tela inicial** como um app comum, sem loja de aplicativos. Também funciona no computador.
- Visual **segue o celular**: fica claro ou escuro conforme a configuração do aparelho.
- **Sem login.** As notícias lidas e salvas ficam guardadas só no seu celular.

## 4. O que fica FORA da v1

- Abas de mercado digital, saúde, geopolítica e tecnologia em geral
- Resumo ou explicação escritos por IA (fica para a v2)
- Notificações no celular
- Login e sincronização entre aparelhos
- Busca, filtros personalizados e escolha de fontes pelo usuário
- Comentários, compartilhamento social e qualquer recurso para outras pessoas

## 5. Critérios de sucesso

1. Abrir o app no celular e ver as 4 abas carregadas em poucos segundos.
2. Cada aba mostra até 5 notícias recentes e relevantes, sem repetição.
3. O botão da fonte abre o site original.
4. Notícias lidas e salvas continuam marcadas ao fechar e abrir o app de novo.
5. O painel mostra números corretos e com data.
6. Dá para ler tudo do dia em 10 a 15 minutos.
7. Custo mensal: R$ 0.

## 6. Riscos e pontos de atenção

- **Fontes sem feed:** nem todo site oficial publica as notícias num formato que um programa consegue ler automaticamente. Nesses casos usamos a fonte alternativa mais confiável.
- **Qualidade do filtro:** filtrar por palavras-chave não é perfeito. Vamos ajustar as palavras de cada aba depois de alguns dias de uso real.
- **Aba de IA:** existem poucas fontes oficiais brasileiras sobre IA, então essa aba usa mais veículos de tecnologia e blogs das empresas.
