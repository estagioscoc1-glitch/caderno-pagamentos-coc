# Caderno de Pagamentos COC

Novo sistema independente da Central de Cobrança, criado a partir da planilha
`Relacao_de_Alunos_2026_2_Completa(4).xlsx`.

## Base inicial

- 246 alunos com matrículas únicas
- 12 turmas
- 235 alunos ativos
- 11 desistentes identificados na planilha
- Setembro/2026: 175 pagamentos confirmados e 60 pendências entre ativos

## Controles por aluno

- Setembro/2026 a fevereiro/2027
- Seguro
- Kit inicial
- Matrícula
- Dependência

Todos os controles aceitam os estados `Pago` e `Pendente`. O sistema não
armazena valores financeiros.

## Recursos

- Login administrativo com senha criada no primeiro acesso
- Dashboard quantitativo com indicadores e gráficos
- Caderno por sala com busca e filtros
- Marcação e reativação de desistentes
- Relatórios por sala, mês/item e situação, prontos para impressão
- Central de WhatsApp com mensagem editável, variáveis e lote assistido
- Histórico de mensagens com data e hora
- Salvamento automático no banco de dados

## WhatsApp

O lote gratuito abre cada conversa com a mensagem pronta; o operador confirma o
envio e o sistema registra a data antes de passar ao próximo aluno. Envio sem
confirmação exige integração futura com a API oficial do WhatsApp.

## Desenvolvimento

```bash
pnpm install
pnpm db:generate
pnpm dev
```

O projeto usa Vinext/Next, React, D1, Drizzle e componentes shadcn.

## Publicação gratuita na Cloudflare

A forma recomendada é conectar este repositório privado ao **Workers Builds**
da Cloudflare. Não é necessário usar CMD: configure o comando de implantação
como `npm run deploy:cloudflare` na tela da Cloudflare.

O processo cria ou reutiliza somente o Worker
`caderno-pagamentos-coc-2026` e o banco D1
`caderno-pagamentos-coc-db`. Nenhum outro projeto da conta é removido ou
alterado. Veja o passo a passo em `GUIA_CLOUDFLARE_SEM_CMD.md`.

O instalador `PUBLICAR_NO_CLOUDFLARE.bat` continua disponível apenas como
alternativa para outro computador Windows.
