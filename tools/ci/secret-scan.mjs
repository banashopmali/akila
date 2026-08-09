/**
 * AKILA — Gate CI « scan de secrets »
 * ===================================
 * CLAUDE.md, interdiction 11 : le frontend ne porte jamais de secret.
 * P0 — bloque le merge.
 *
 * Aucune dépendance : Node seul.
 * Usage : node tools/ci/secret-scan.mjs [racine]
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv[2] ?? process.cwd();

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'pnpm-lock.yaml',
]);

/** Les fichiers dont l'existence même est une fuite. */
const FORBIDDEN_FILES = [/^\.env$/, /^\.env\.(?!example$)/];

const PATTERNS = [
  { id: 'AWS_ACCESS_KEY', re: /\bAKIA[0-9A-Z]{16}\b/, label: 'clé AWS' },
  { id: 'TWILIO_SID', re: /\bAC[0-9a-fA-F]{32}\b/, label: 'Account SID Twilio' },
  { id: 'TWILIO_TOKEN', re: /\bSK[0-9a-fA-F]{32}\b/, label: 'API Key Twilio' },
  { id: 'GITHUB_TOKEN', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/, label: 'token GitHub' },
  {
    id: 'PRIVATE_KEY',
    re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
    label: 'clé privée',
  },
  {
    id: 'JWT',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    label: 'JWT en dur',
  },
  { id: 'SLACK', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/, label: 'token Slack' },
  {
    id: 'ASSIGNED_SECRET',
    // password/secret/token/api_key = "valeur littérale non vide et non factice"
    re: /\b(?:password|passwd|secret|api[_-]?key|apikey|auth[_-]?token|access[_-]?token)\s*[:=]\s*['"`]([^'"`\s]{8,})['"`]/i,
    label: 'secret affecté en dur',
  },
  {
    id: 'PG_URL',
    re: /\bpostgres(?:ql)?:\/\/[^\s'"`:]+:[^\s'"`@]+@/i,
    label: 'URL PostgreSQL avec mot de passe',
  },
];

/** Valeurs manifestement inoffensives — évite de bloquer sur des exemples. */
const PLACEHOLDERS =
  /^(?:x{3,}|\.{3,}|<[^>]+>|\$\{[^}]+\}|process\.env\..*|changeme|placeholder|example|your[_-].*|todo|dummy|test|fake|redacted|null|undefined|\*{3,})$/i;

const SCANNABLE = /\.(ts|tsx|js|jsx|mjs|cjs|json|ya?ml|env|sh|sql|md|txt|properties|toml)$/i;

const findings = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const rel = relative(ROOT, full).split('\\').join('/');
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (FORBIDDEN_FILES.some((re) => re.test(entry))) {
      findings.push({
        id: 'ENV_FILE',
        file: rel,
        line: 0,
        label: 'fichier .env commité',
        excerpt: entry,
      });
      continue;
    }
    if (!SCANNABLE.test(entry)) continue;

    const lines = readFileSync(full, 'utf8').split('\n');
    lines.forEach((text, idx) => {
      if (/akila-secret-scan:\s*ignore/.test(text)) return;
      for (const p of PATTERNS) {
        const m = p.re.exec(text);
        if (!m) continue;
        const captured = m[1] ?? m[0];
        if (PLACEHOLDERS.test(captured)) continue;
        findings.push({
          id: p.id,
          file: rel,
          line: idx + 1,
          label: p.label,
          excerpt: `${captured.slice(0, 6)}…(${captured.length} car.)`,
        });
      }
    });
  }
}

walk(ROOT);

if (findings.length === 0) {
  console.log('✅ Scan de secrets : rien trouvé.');
  process.exit(0);
}

console.error(`❌ ${findings.length} secret(s) potentiel(s) — P0, merge impossible :\n`);
for (const f of findings) {
  console.error(`  [P0] ${f.id} — ${f.file}:${f.line}`);
  console.error(`       ${f.label} : ${f.excerpt}`);
}
console.error(
  "\nUn secret ne se retire pas d'un commit en le supprimant : il est révoqué, puis remplacé.",
);
console.error(
  'Faux positif ? Ajoutez `// akila-secret-scan: ignore` sur la ligne, et expliquez en PR.',
);
process.exit(1);
