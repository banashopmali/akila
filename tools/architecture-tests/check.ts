/**
 * AKILA — Gate CI « tests d'architecture »
 * Scanne le dépôt et sort en erreur sur toute violation P0 ou P1.
 * Usage : node tools/architecture-tests/check.ts [racine]
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { scan, formatViolations } from './scanner.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? resolve(HERE, '../..');

const violations = scan(root);
console.log(formatViolations(violations));

const bloquantes = violations.filter((v) => v.severity === 'P0' || v.severity === 'P1');
if (bloquantes.length > 0) {
  console.error(
    `\n⛔ ${bloquantes.length} violation(s) bloquante(s). Merge impossible — CLAUDE.md §12.`,
  );
  process.exit(1);
}
const avertissements = violations.filter((v) => v.severity === 'P2');
if (avertissements.length > 0) {
  console.warn(`\n⚠️  ${avertissements.length} avertissement(s) P2 — non bloquant.`);
}
