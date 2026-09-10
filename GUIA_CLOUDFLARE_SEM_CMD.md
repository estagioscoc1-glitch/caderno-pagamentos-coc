# Publicar pela tela da Cloudflare (sem CMD)

Este repositório deve permanecer **privado**, pois contém a base inicial com
nomes e telefones dos alunos.

## Recursos exclusivos do Caderno

- Worker: `caderno-pagamentos-coc-2026`
- Banco D1: `caderno-pagamentos-coc-db`

O processo apenas cria ou atualiza esses dois recursos. Os outros Workers,
sites, domínios e bancos da conta não são alterados.

## Primeira publicação

1. Abra o painel da Cloudflare e entre em **Workers & Pages**.
2. Clique em **Create application**.
3. Em **Import a repository**, clique em **Get started**.
4. Conecte a conta do GitHub e autorize somente o repositório
   `estagioscoc1-glitch/caderno-pagamentos-coc`.
5. Escolha esse repositório e mantenha a branch `main`.
6. Use o nome `caderno-pagamentos-coc-2026` para o Worker.
7. Deixe **Root directory** vazio.
8. Deixe **Build command** vazio.
9. Em **Deploy command**, informe `npm run deploy:cloudflare`.
10. Em **API token**, selecione um token da conta que tenha estas permissões:
    - Account / Workers Scripts / Edit
    - Account / D1 / Edit
    - Account / Account Settings / Read
11. Clique em **Save and Deploy**.

Na primeira publicação, o processo cria o banco exclusivo, aplica as tabelas e
publica o Worker. Depois, abra o endereço terminado em `workers.dev` e crie a
senha administrativa.

## Atualizações futuras

Cada nova atualização enviada à branch `main` será publicada automaticamente.
O banco existente será reutilizado e os pagamentos já registrados serão
preservados.

## Se a Cloudflare não mostrar o repositório

Abra as configurações do aplicativo **Cloudflare Workers and Pages** no GitHub,
marque **Only select repositories** e selecione
`caderno-pagamentos-coc`. Volte à Cloudflare e atualize a lista.

## Se a publicação parar no banco D1

Confirme que o token escolhido no projeto possui a permissão
**Account / D1 / Edit**. O token automático padrão pode não incluir essa
permissão.
