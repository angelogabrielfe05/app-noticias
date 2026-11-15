# NEWs — contexto do projeto

App pessoal do Angelo (estudante de Medicina, não é desenvolvedor) para acompanhar só o que importa em 4 abas: **Política do Brasil, Economia, Mercado e bolsa, Inteligência artificial**. Até 5 notícias por aba, fontes brasileiras e oficiais quando possível, painel de indicadores, marcar como lida, salvar para depois, explicador de termos e link para a fonte original. Mobile-first e instalável (PWA). Custo R$ 0.

## Stack
- Front: HTML/CSS/JS puros, sem framework e sem build; PWA (manifest + service worker).
- Coleta: script Node.js em `scripts/`, rodado pelo GitHub Actions (`coletar.yml`) a cada 3h; grava `app/data/*.json` e chama `publicar.yml`. Quem dispara nos horários certos é o cron-job.org (conta do Angelo, chave fine-grained só com Actions: write neste repositório); o `schedule` do GitHub é só reserva e pula se a última coleta tem menos de 2h.
- Indicadores: API SGS do Banco Central (+ fonte a definir para Ibovespa, IFIX e S&P 500).
- Hospedagem: GitHub Pages (modo "GitHub Actions", publica só a pasta `app/` via `publicar.yml`), repositório público na conta `angelogabrielfe05`. Link: https://angelogabrielfe05.github.io/app-noticias/
- Dados do usuário: `localStorage` (sem login).

## Documentos (ler antes de trabalhar)
- `docs/prd.md`: escopo da v1 (o que faz e não faz)
- `docs/stack.md`: tecnologias e motivos
- `docs/tarefas.md`: checklist da construção (a primeira caixa não marcada é onde continuar)
- `docs/revisao.md`, `docs/proximos-passos.md`: criados nas etapas 5 e 6
- `docs/ideias-futuras.md`: tudo que ficou fora da v1

## Regras do workflow (skill criar-web-app)
- 6 etapas com aprovação do Angelo ao fim de cada uma: PRD → stack → tarefas → construção → revisão → publicação.
- Construção: uma subtarefa por vez, conferir, marcar `[x]` e perguntar se segue. Nunca passar de uma tarefa principal para outra sem parar. Um commit por tarefa principal, com mensagem em português.
- Explicar sem jargão. Recomendar uma opção (no máximo uma alternativa). Tudo gratuito, salvo aprovação explícita.
- Escopo é sagrado: ideia nova vai para `docs/ideias-futuras.md`.
- Sempre em português do Brasil.

## Cuidados técnicos
- `app/sw.js` (service worker): ao adicionar ou renomear arquivos fixos do app, atualize `ARQUIVOS_APP` e aumente `VERSAO`. As partes fixas usam stale-while-revalidate (mudanças aparecem na 2ª abertura); `data/*.json` usa network-first.
- Fotos: `scripts/lib/imagens.js` (robô) acha a capa e monta os endereços do wsrv.nl; memória em `cache/imagens.json` (7 dias). No app, `midia()` mostra foto ou capa editorial; o service worker guarda as fotos em `news-fotos` e o app apaga as antigas.
- Ícones: os SVGs em `app/icones/` são a fonte; os PNGs foram gerados a partir deles (192, 512, maskable, apple-touch-icon, favicon-32).
- Tela montada só com `createElement`/`textContent`: nunca usar `innerHTML` com dados dos feeds.
- **Dados gerados (`app/data/*.json`, `cache/acervo.json`) são do robô.** Ao testar `npm run coletar` localmente, NÃO commitar esses arquivos: antes do commit, rode `git checkout -- app/data cache` (ou `git pull` antes de testar). Commitar dados locais gera conflito com os commits automáticos do robô.
