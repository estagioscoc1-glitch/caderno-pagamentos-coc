import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const WORKER_NAME = "caderno-pagamentos-coc-2026";
const DATABASE_NAME = "caderno-pagamentos-coc-db";
const CONFIG_FILE = resolve("wrangler.cloudflare.jsonc");
const INSTALL_FILE = resolve(".cloudflare-install.json");
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

function cleanAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function run(args, options = {}) {
  const result = spawnSync(NPX, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.capture ? ["inherit", "pipe", "pipe"] : "inherit",
  });
  if (options.capture) {
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) throw new Error(`O comando falhou: npx ${args.join(" ")}`);
    return cleanAnsi(result.stdout ?? "");
  }
  if (result.status !== 0) throw new Error(`O comando falhou: npx ${args.join(" ")}`);
  return "";
}

function parseJsonArray(output) {
  const start = output.indexOf("[");
  const end = output.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error("Não foi possível ler a lista de bancos da Cloudflare.");
  return JSON.parse(output.slice(start, end + 1));
}

function databaseId(database) {
  return database.uuid ?? database.id ?? database.database_id ?? null;
}

function writeConfig(id) {
  const config = {
    $schema: "./node_modules/wrangler/config-schema.json",
    name: WORKER_NAME,
    main: "dist/server/index.js",
    compatibility_date: "2026-05-15",
    compatibility_flags: ["nodejs_compat"],
    workers_dev: true,
    preview_urls: true,
    assets: { directory: "dist/client" },
    observability: { enabled: true },
    d1_databases: [{ binding: "DB", database_name: DATABASE_NAME, database_id: id, migrations_dir: "drizzle" }],
  };
  writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function printTitle(text) {
  console.log("\n============================================================");
  console.log(text);
  console.log("============================================================\n");
}

async function main() {
  printTitle("PUBLICAÇÃO SEGURA — CADERNO DE PAGAMENTOS COC");
  console.log(`Worker novo: ${WORKER_NAME}`);
  console.log(`Banco novo:  ${DATABASE_NAME}`);
  console.log("Nenhum Worker, site, domínio ou banco existente será excluído.\n");

  let installation = null;
  if (existsSync(INSTALL_FILE)) {
    installation = JSON.parse(readFileSync(INSTALL_FILE, "utf8"));
    if (installation.workerName !== WORKER_NAME || installation.databaseName !== DATABASE_NAME) {
      throw new Error("O registro local pertence a outro projeto. A publicação foi interrompida sem alterar a Cloudflare.");
    }
  }

  printTitle("1 de 4 — Conferindo a conta Cloudflare");
  run(["wrangler", "whoami"]);

  printTitle("2 de 4 — Preparando o banco de dados");
  let databases = parseJsonArray(run(["wrangler", "d1", "list", "--json"], { capture: true }));
  let database = databases.find((item) => item.name === DATABASE_NAME);
  if (!database) {
    if (databases.length >= 10) {
      throw new Error("Sua conta gratuita já possui 10 bancos D1. Nada foi alterado. Será necessário reutilizar um banco vazio ou remover manualmente um banco que você não usa.");
    }
    console.log("Criando um banco exclusivo para o Caderno de Pagamentos...");
    run(["wrangler", "d1", "create", DATABASE_NAME]);
    databases = parseJsonArray(run(["wrangler", "d1", "list", "--json"], { capture: true }));
    database = databases.find((item) => item.name === DATABASE_NAME);
  } else {
    console.log("Banco do Caderno encontrado. Ele será reutilizado sem apagar os dados.");
  }

  const id = database && databaseId(database);
  if (!id) throw new Error("O banco foi localizado, mas seu identificador não pôde ser confirmado.");
  if (installation?.databaseId && installation.databaseId !== id) {
    throw new Error("O identificador do banco mudou. A publicação foi interrompida para proteger os dados existentes.");
  }
  writeConfig(id);

  printTitle("3 de 4 — Instalando o sistema e as tabelas");
  run(["--yes", "pnpm@10.6.2", "build"]);
  if (!existsSync(resolve("dist/server/index.js")) || !existsSync(resolve("dist/client"))) {
    throw new Error("A montagem do sistema não gerou os arquivos esperados.");
  }
  run(["wrangler", "d1", "migrations", "apply", DATABASE_NAME, "--remote", "--config", CONFIG_FILE]);

  printTitle("4 de 4 — Publicando o novo Worker");
  const deployOutput = run(["wrangler", "deploy", "--config", CONFIG_FILE], { capture: true });
  process.stdout.write(deployOutput);
  const url = deployOutput.match(/https:\/\/[^\s]+\.workers\.dev/)?.[0] ?? "";
  writeFileSync(INSTALL_FILE, `${JSON.stringify({ workerName: WORKER_NAME, databaseName: DATABASE_NAME, databaseId: id, installedAt: new Date().toISOString(), url }, null, 2)}\n`, "utf8");

  printTitle("PUBLICAÇÃO CONCLUÍDA");
  if (url) console.log(`Abra o sistema em: ${url}`);
  else console.log("A publicação terminou. O endereço aparece logo acima e também no painel Workers & Pages da Cloudflare.");
  console.log("No primeiro acesso, crie sua senha administrativa.\n");
}

function selfTest() {
  const databases = parseJsonArray('aviso\n[{"name":"caderno-pagamentos-coc-db","uuid":"db-teste"}]\n');
  if (databases.length !== 1 || databaseId(databases[0]) !== "db-teste") throw new Error("Falha no teste da leitura do D1.");
  const sampleDeploy = "Published https://caderno-pagamentos-coc-2026.exemplo.workers.dev";
  if (!sampleDeploy.match(/https:\/\/[^\s]+\.workers\.dev/)?.[0]) throw new Error("Falha no teste do endereço publicado.");
  const source = readFileSync(new URL(import.meta.url), "utf8");
  if (/run\(\[[^\]]*"(delete|remove)"/i.test(source)) throw new Error("Foi encontrado um comando destrutivo.");
  console.log("SELF_TEST_OK");
}

const start = process.argv.includes("--self-test") ? Promise.resolve(selfTest()) : main();

start.catch((error) => {
  console.error("\nPUBLICAÇÃO INTERROMPIDA COM SEGURANÇA");
  console.error(error instanceof Error ? error.message : error);
  console.error("Nenhum projeto existente foi excluído.\n");
  process.exitCode = 1;
});
