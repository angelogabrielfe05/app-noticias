# Stack — App de Notícias (v1)

> Aprovada em 13/11/2026.

## Visão geral

Um robô (GitHub Actions) roda a cada ~3 horas: lê os feeds RSS das fontes, filtra, escolhe até 5 notícias por aba, busca os indicadores e grava tudo em arquivos JSON em `app/data/`. O app (PWA estático no GitHub Pages) só lê esses arquivos. Assim ele abre rápido, se atualiza mesmo fechado e não esbarra em bloqueios de CORS dos sites das fontes.

```
Fontes (RSS + API BCB) ──► GitHub Actions (script Node.js, cron 3h)
                               └─► app/data/*.json (commit no repo)
                                        └─► GitHub Pages ──► PWA no celular
                                                              └─ localStorage (lidas/salvas)
```

## Escolhas

| Camada | Escolha | Motivo |
|---|---|---|
| Front-end | HTML + CSS + JavaScript puros, sem framework e sem build | Leve, rápido e fácil de manter |
| Instalação/offline | PWA (manifest + service worker) | Ícone na tela inicial e leitura offline |
| Coleta | Script Node.js (`scripts/`), dependências mínimas (parser de RSS/XML) | Roda no GitHub Actions |
| Indicadores | API SGS do Banco Central (Selic, IPCA 12m, PTAX, PIB, CDI); Ibovespa, IFIX e S&P 500 a definir na construção | Oficial e gratuito |
| Agendamento | GitHub Actions com `schedule` (cron a cada 3h) e `workflow_dispatch` (rodar manualmente) | Grátis |
| Código | Repositório **público** no GitHub (conta `angelogabrielfe05`) | Exigência do Pages grátis |
| Hospedagem | GitHub Pages | Grátis, mesma conta |
| Fotos | Capa da página da notícia (og:image) achada pelo robô; reduzida pelo wsrv.nl (serviço gratuito e de código aberto) para WebP 800×450 e 192×192 | 5 MB viram ~90 KB; libera CORS para guardar offline |
| Dados do usuário | `localStorage` (lidas, salvas) | Sem login e sem banco de dados |

## Custos e contas
- Custo: R$ 0 por mês.
- Contas: só o GitHub (já existe e já está autenticada no `gh`).

## Limitações conhecidas
- O cron do GitHub Actions pode atrasar alguns minutos ou mais.
- Workflows agendados de repositório público são desativados depois de 60 dias sem atividade no repositório. Os commits automáticos de dados devem manter o repositório ativo. Conferir na revisão.
- Lidas e salvas se perdem se os dados do navegador forem limpos ou se você trocar de aparelho.

## Ambiente local
- Node v24, npm 11, git 2.56, gh 2.102 (logado como `angelogabrielfe05`).
