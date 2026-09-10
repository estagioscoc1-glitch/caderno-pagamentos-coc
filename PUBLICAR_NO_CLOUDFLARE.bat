@echo off
chcp 65001 >nul
title Publicar Caderno de Pagamentos COC
cd /d "%~dp0"

echo ============================================================
echo   CADERNO DE PAGAMENTOS COC - PUBLICACAO NO CLOUDFLARE
echo ============================================================
echo.
echo Este instalador cria recursos exclusivos com estes nomes:
echo   Worker: caderno-pagamentos-coc-2026
echo   Banco:  caderno-pagamentos-coc-db
echo.
echo Seus outros sites e Workers nao serao excluidos ou alterados.
echo.

where node >nul 2>nul
if errorlevel 1 goto SEM_NODE

echo [1/3] Instalando os componentes necessarios...
call npx --yes pnpm@10.6.2 install --frozen-lockfile
if errorlevel 1 goto ERRO

echo.
echo [2/3] Entrando na sua conta Cloudflare...
echo O navegador sera aberto. Autorize a conta correta e volte aqui.
call npx wrangler login
if errorlevel 1 goto ERRO

echo.
echo [3/3] Criando o banco e publicando o sistema...
call node scripts\deploy-cloudflare.mjs
if errorlevel 1 goto ERRO

echo.
echo Pronto. Guarde esta pasta para fazer futuras atualizacoes.
pause
exit /b 0

:SEM_NODE
echo.
echo O Node.js ainda nao esta instalado neste computador.
echo Sera aberta a pagina oficial. Instale a versao LTS, reinicie o
echo computador e execute este arquivo novamente.
start "" "https://nodejs.org/pt/download"
pause
exit /b 1

:ERRO
echo.
echo A publicacao nao foi concluida. Leia a mensagem mostrada acima.
echo Seus outros sites nao foram apagados ou substituidos.
pause
exit /b 1
