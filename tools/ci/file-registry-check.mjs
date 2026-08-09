/**
 * AKILA — Gate CI « File Registry à jour »
 * ========================================
 * CLAUDE.md §10 : « Ne pas créer de fichier absent du File Registry. »
 * CLAUDE.md §11 : le File Registry à jour fait partie de la Definition of Done.
 *
 * Cette gate est ce qui empêche l'arborescence de dériver silencieusement —
 * le mode d'échec le plus courant du code généré par IA (REVIEW.md).
 *
 * Usage : node tools/ci/file-registry-check.mjs [racine]
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv[2] ?? process.cwd();
const REGISTRY = join(ROOT, 'AKILA-FILE-REGISTRY.md');

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
const TRACKED_ROOTS = ['apps', 'packages', 'tools'];
const TRACKED_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
/** Les fixtures existent pour être fausses : elles ne sont pas du code de production. */
const EXEMPT = /(^|\/)__fixtures__\//;

if (!existsSync(REGISTRY)) {
  console.error("❌ AKILA-FILE-REGISTRY.md est absent. CLAUDE.md §11 l'exige.");
  process.exit(1);
}

const registry = readFileSync(REGISTRY, 'utf8');

const onDisk = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (TRACKED_EXT.test(entry)) {
      const rel = relative(ROOT, full).split('\\').join('/');
      if (!EXEMPT.test(rel)) onDisk.push(rel);
    }
  }
}
for (const r of TRACKED_ROOTS) {
  const dir = join(ROOT, r);
  if (existsSync(dir)) walk(dir);
}

const manquants = onDisk.filter((f) => !registry.includes(f));

// Sens inverse : un fichier listé mais supprimé, hors lignes marquées PLANNED.
const listes = [
  ...registry.matchAll(/`((?:apps|packages|tools)\/[^`]+\.(?:ts|tsx|js|jsx|mjs|cjs))`/g),
]
  .map((m) => m[1])
  .filter((f) => !EXEMPT.test(f));
const fantomes = [...new Set(listes)].filter(
  (f) => !onDisk.includes(f) && !existsSync(join(ROOT, f)),
);

if (manquants.length === 0 && fantomes.length === 0) {
  console.log(`✅ File Registry à jour — ${onDisk.length} fichier(s) suivi(s).`);
  process.exit(0);
}

if (manquants.length > 0) {
  console.error(`❌ ${manquants.length} fichier(s) sur le disque mais absent(s) du registre :\n`);
  for (const f of manquants) console.error(`  + ${f}`);
  console.error('\nAjoutez-les à AKILA-FILE-REGISTRY.md, ou supprimez-les.');
}
if (fantomes.length > 0) {
  console.error(`\n❌ ${fantomes.length} fichier(s) au registre mais absent(s) du disque :\n`);
  for (const f of fantomes) console.error(`  - ${f}`);
}
process.exit(1);
