# Tarefas — App de Notícias (v1)

> A primeira caixa não marcada mostra onde continuar.
> Ao fim de cada tarefa principal: um commit no git e uma pausa para aprovação.

## 1.0 Estrutura do projeto
- [x] 1.1 Criar as pastas (`app/`, `app/data/`, `scripts/`, `.github/workflows/`) e o `.gitignore`
- [x] 1.2 Iniciar o git e criar o `package.json` com os comandos do projeto
- [x] 1.3 Criar a casca do app (`index.html`, `style.css`, `app.js`) com o título e as 4 abas vazias
- [x] 1.4 Configurar um servidor local e conferir que a casca abre em `http://localhost`
- [x] 1.5 Criar o repositório público no GitHub e enviar o primeiro commit

## 2.0 Fontes e coleta de notícias
- [ ] 2.1 Levantar e testar os feeds RSS da aba Política (Planalto/Gov.br, Agência Câmara, Agência Senado, STF, Agência Brasil)
- [ ] 2.2 Levantar e testar os feeds da aba Economia (BCB, IBGE, Tesouro, Fazenda, Receita, Agência Brasil)
- [ ] 2.3 Levantar e testar os feeds da aba Mercado (B3, CVM, Tesouro Direto, veículos de finanças)
- [ ] 2.4 Levantar e testar os feeds da aba IA (veículos BR de tecnologia, ANPD/MCTI, blogs oficiais das empresas)
- [ ] 2.5 Registrar as fontes aprovadas em `scripts/fontes.json` (URL, aba, se é oficial ou não)
- [ ] 2.6 Script que baixa e lê todos os feeds, sem quebrar se uma fonte estiver fora do ar
- [ ] 2.7 Filtro por palavras-chave de cada aba e por data (últimas 24 a 48h)
- [ ] 2.8 Remoção de repetidas e pontuação (prioridade para fontes oficiais), ficando com as 5 melhores por aba
- [ ] 2.9 Gravar `app/data/noticias.json` e conferir o resultado com você (as notícias fazem sentido?)

## 3.0 Painel de números
- [ ] 3.1 Buscar no Banco Central (SGS): Selic, IPCA 12 meses, dólar PTAX, PIB trimestral e CDI
- [ ] 3.2 Testar fontes grátis para Ibovespa, IFIX e S&P 500 e escolher a mais confiável (ou tirar do painel e registrar no PRD)
- [ ] 3.3 Gravar `app/data/indicadores.json` com valor, data e fonte de cada número
- [ ] 3.4 Juntar a coleta de notícias e de indicadores num único comando (`npm run coletar`)

## 4.0 Telas do app
- [ ] 4.1 Navegação entre as 4 abas (barra embaixo, fácil de alcançar com o polegar)
- [ ] 4.2 Cartão de notícia: título, fonte, selo "oficial", data/hora, resumo e botão "Abrir fonte"
- [ ] 4.3 Painel de números no topo de Economia e Mercado, com a data de cada número
- [ ] 4.4 Marcar como lida (cartão apagado) e aviso "Você está em dia" na aba
- [ ] 4.5 Salvar para depois e a tela "Salvos"
- [ ] 4.6 Escrever o glossário com cerca de 40 termos (`app/glossario.json`) e conferir com você
- [ ] 4.7 Destacar os termos nas notícias e abrir a explicação ao tocar
- [ ] 4.8 Mostrar "Atualizado às HH:MM" e mensagens para quando não houver notícia ou faltar internet

## 5.0 Visual e instalação
- [ ] 5.1 Cores e tipografia legíveis, com claro/escuro automático
- [ ] 5.2 Ajuste fino em tela de celular (360 px) e no computador
- [ ] 5.3 Ícone do app e `manifest.json` (nome, cores, instalação)
- [ ] 5.4 Service worker: abrir sem internet com as últimas notícias baixadas
- [ ] 5.5 Testar a instalação (o navegador oferece "Adicionar à tela inicial")

## 6.0 Robô de atualização
- [ ] 6.1 Criar o workflow do GitHub Actions (a cada 3h e com botão para rodar manualmente)
- [ ] 6.2 Fazer o robô rodar `npm run coletar` e salvar os JSON novos com um commit automático
- [ ] 6.3 Rodar manualmente no GitHub e conferir que os dados foram atualizados
- [ ] 6.4 Conferir as primeiras execuções automáticas
