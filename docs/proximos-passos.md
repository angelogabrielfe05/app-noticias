# Próximos passos — NEWs

## O app
**Link:** https://angelogabrielfe05.github.io/app-noticias/

Publicado em 15/11/2026. Custo: R$ 0.

## Como usar
- **Instalar:**
  - **Android:** abra o link no Chrome → menu ⋮ → **Instalar app**.
  - **iPhone:** abra no Safari → Compartilhar → **Adicionar à Tela de Início**.
- **Abas:** Política, Economia, Mercado e IA, com até 5 notícias cada. Economia e Mercado têm o painel "Números do dia".
- **Em cada notícia:**
  - **Abrir fonte ↗** leva ao site original e marca a notícia como lida.
  - **Já li** marca como lida. Quando todas da aba estão lidas, aparece "Você está em dia".
  - **☆ Salvar** guarda a notícia no ícone de marcador, no topo.
  - **Palavras sublinhadas** (Copom, IPCA, FII…): toque para ver a explicação.
- **Atualização:** o app se atualiza sozinho. O botão ↻ no topo busca na hora. Sem internet, mostra a última edição com as fotos.
- **Dados pessoais:** lidas e salvas ficam só neste celular, sem login. Limpar os dados do navegador apaga essas listas.

## Como funciona por trás
1. A cada 3 horas (00:17, 03:17, 06:17… no horário de Brasília), o **cron-job.org** acorda o robô no GitHub.
2. O robô (`.github/workflows/coletar.yml`):
   - lê as 29 fontes;
   - escolhe as notícias;
   - busca os números e as fotos;
   - salva tudo em `app/data/`;
   - chama a publicação (`publicar.yml`).
3. Em cerca de 1 minuto, o link mostra a edição nova.

O agendamento do próprio GitHub continua como **reserva**. Se o cron-job.org falhar, o GitHub roda sozinho, só que de forma irregular.

## Como atualizar o app
- **Mudar algo no app:** abra o Claude Code nesta pasta (`Desktop/app-noticias`) e peça a mudança. O `CLAUDE.md` e os `docs/` guardam todo o contexto. Quando a mudança é enviada ao GitHub, o app publica sozinho. No celular, a nova versão aparece **na segunda vez que você abrir o app**.
- **Rodar o robô na hora:**
  - **No GitHub:** aba **Actions** → "Coletar notícias" → **Run workflow**;
  - **no cron-job.org:** "Test run" no job "NEWs robô";
  - **ou pelo botão ↻ do app**, que só busca a edição mais recente já publicada.
- **Ajustar fontes ou palavras-chave:** `scripts/fontes.json` e `scripts/temas.json`. O mais simples é pedir ao Claude Code.

## Manutenção (anote na agenda)
| Quando | O quê |
|---|---|
| **Quando a chave do GitHub vencer** (data escolhida na criação; o cron-job.org avisa por e-mail se as execuções começarem a falhar) | Criar uma chave nova, igual à primeira (fine-grained, só o repositório app-noticias, Actions: Read and write), e trocar no cron-job.org: job "NEWs robô" → Advanced → cabeçalho `Authorization` → `Bearer` + a chave nova. |
| **Antes de 10/03/2028** | O GitHub encerra a versão `2022-11-28` da API. No cron-job.org, trocar o valor do cabeçalho `X-GitHub-Api-Version` pela versão atual (veja em docs.github.com → REST API → API versions). |
| A cada alguns meses | Abrir o app e conferir se o "Atualizado às…" está recente. Se aparecer "pode estar desatualizado", olhar a aba Actions do GitHub e o histórico do cron-job.org. |

## Limitações conhecidas
- Notícias que vêm das buscas do Google Notícias (ex.: as sobre o Claude) aparecem **sem foto** e usam a capa editorial colorida.
- A API de notícias do IBGE não responde para servidores fora do Brasil. O robô usa a busca do Google Notícias no site do IBGE como reserva.
- Em dias fracos (fim de semana), uma aba pode ter menos de 5 notícias. Isso é proposital: só entra o que passa da nota mínima.
- Mudanças no visual do app aparecem na **segunda abertura** depois da publicação.
- Lidas e salvas não passam de um aparelho para outro (não há login).

## Versão 2 — lista priorizada
Puxada de `docs/ideias-futuras.md`. A ordem leva em conta o quanto ajuda no dia a dia e o quanto custa.
1. **Resumo por IA de 2 linhas**, com "o que mudou e por que importa". É o maior ganho para entender rápido. Custa poucos reais por mês e **precisa de aprovação**.
2. **Variedade de assuntos:** no máximo 2 notícias sobre o mesmo tema por aba (ex.: dias de "ajuste fiscal").
3. **Notificação diária:** "Seu resumo de hoje está pronto".
4. **Abas novas:** mercado digital, saúde, geopolítica, tecnologia em geral.
5. **Busca e escolha de fontes** pelo usuário.
6. **Login** para sincronizar lidas e salvas entre aparelhos. É o mais trabalhoso e só compensa se você usar em mais de um aparelho.
7. Detalhes técnicos da revisão (fotos que são logotipos, S&P 500 durante o pregão etc.). Ver `docs/ideias-futuras.md`.

## Ajustes no workflow
**Angelo (15/11/2026):** nenhuma etapa travou. Instalou no celular, o app abriu normalmente, sem lentidão nem erro.

Aprendizados para os próximos apps (observados durante a construção):
- **Pasta `references/` da skill não encontrada:** a skill `criar-web-app` cita arquivos de apoio (entrevista, modelos, checklist de revisão, publicação) que não estavam disponíveis. O trabalho seguiu sem eles; vale conferir a instalação da skill.
- **Agendamento do GitHub Actions é irregular** (3 de 7 execuções em 22 h). Em apps com robô agendado, já planejar o despertador externo (cron-job.org) desde a etapa 2.
- **GitHub Pages com pasta própria e robô:** commits do robô não disparam outros workflows. O padrão que funcionou foi um `publicar.yml` (deploy por Actions), chamado também pelo robô depois de cada coleta.
- **Telas de configuração em sites de terceiros** (GitHub, cron-job.org) foram a parte mais trabalhosa para o Angelo. Pedir prints a cada passo funcionou bem.
