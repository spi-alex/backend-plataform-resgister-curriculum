#!/usr/bin/env node
/**
 * Troca os placeholders de domínio pelos domínios reais.
 *
 *   node scripts/definir-dominio.mjs prisma.exemplo.br api.prisma.exemplo.br
 *   node scripts/definir-dominio.mjs prisma.exemplo.br            (API = mesmo domínio)
 *
 * Por que existe: o domínio aparece em 15 lugares espalhados por 4
 * arquivos (index.html, robots.txt, sitemap.xml, _headers). Trocar na mão
 * quase garante esquecer um — e cada esquecimento tem uma consequência
 * silenciosa e diferente:
 *
 *   - og:image errada  -> link compartilhado no WhatsApp sai sem imagem;
 *   - canonical errada -> o Google indexa o domínio errado;
 *   - sitemap errado   -> o Search Console rejeita o arquivo inteiro;
 *   - CSP errada       -> o LOGIN PARA DE FUNCIONAR, porque o navegador
 *                         bloqueia a chamada para a API.
 *
 * O script é idempotente: rodar duas vezes com o mesmo valor não muda
 * nada. Para trocar de domínio depois, edite os arquivos ou rode de novo
 * passando `--de <dominio-atual>`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ARQUIVOS = [
  "index.html",
  "public/robots.txt",
  "public/sitemap.xml",
  "public/_headers",
];

const args = process.argv.slice(2);
let placeholderSite = "SEU-DOMINIO.com.br";
let placeholderApi = "api.SEU-DOMINIO.com.br";

const idxDe = args.indexOf("--de");
if (idxDe !== -1) {
  placeholderSite = args[idxDe + 1];
  placeholderApi = `api.${args[idxDe + 1]}`;
  args.splice(idxDe, 2);
}

const [site, api = site] = args;

if (!site) {
  console.error(
    "Uso: node scripts/definir-dominio.mjs <dominio-do-site> [dominio-da-api]\n" +
      "Ex.:  node scripts/definir-dominio.mjs prisma.exemplo.br api.prisma.exemplo.br",
  );
  process.exit(1);
}

// Um domínio com esquema ou barra quebraria as URLs montadas nos arquivos
// (viraria "https://https://..."), e o erro só apareceria em produção.
for (const [nome, valor] of [["site", site], ["api", api]]) {
  if (/^https?:\/\//.test(valor) || valor.includes("/")) {
    console.error(
      `Domínio da ${nome} inválido: "${valor}". Passe só o host, ` +
        "sem https:// e sem barra. Ex.: prisma.exemplo.br",
    );
    process.exit(1);
  }
}

let totalTrocas = 0;

for (const rel of ARQUIVOS) {
  const caminho = join(RAIZ, rel);
  let texto;

  try {
    texto = readFileSync(caminho, "utf8");
  } catch {
    console.warn(`  (ignorado, não encontrado) ${rel}`);
    continue;
  }

  const antes = texto;

  // A API primeiro: "api.SEU-DOMINIO.com.br" contém "SEU-DOMINIO.com.br"
  // como substring. Na ordem inversa, o placeholder da API já teria sido
  // parcialmente substituído e o resultado sairia como "api.dominio-real".
  const trocasApi = texto.split(placeholderApi).length - 1;
  texto = texto.split(placeholderApi).join(api);

  // Contado DEPOIS da troca da API: "api.SEU-DOMINIO.com.br" contém
  // "SEU-DOMINIO.com.br", então contar antes somaria a mesma ocorrência
  // duas vezes e o total impresso ficaria maior que a realidade.
  const trocasSite = texto.split(placeholderSite).length - 1;
  texto = texto.split(placeholderSite).join(site);

  if (texto !== antes) {
    const trocas = trocasApi + trocasSite;
    totalTrocas += trocas;
    writeFileSync(caminho, texto, "utf8");
    console.log(`  ${rel}: ${trocas} ocorrência(s) atualizada(s)`);
  } else {
    console.log(`  ${rel}: nada a trocar`);
  }
}

console.log(`\nTotal: ${totalTrocas} ocorrência(s).`);
console.log(`Site: https://${site}`);
console.log(`API:  https://${api}`);

if (totalTrocas === 0) {
  console.log(
    "\nNenhuma troca. Ou já foi rodado antes, ou o placeholder atual é " +
      "outro — nesse caso use: --de <dominio-atual>",
  );
}

console.log(
  "\nFalta ainda (não são placeholders, são configuração de ambiente):\n" +
    "  - Prisma_frontend/.env        -> VITE_API_URL=https://" + api + "/api/\n" +
    "  - PRISMA_backend/.env         -> ALLOWED_HOSTS e CORS_ALLOWED_ORIGINS\n" +
    "  - src/components/Layout/SiteFooter/dadosInstitucionais.ts (dados do rodapé)",
);
