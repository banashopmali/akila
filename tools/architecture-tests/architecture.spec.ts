/**
 * AKILA — Tests d'architecture
 * ============================
 *
 * AKT-19 §4 : « Un test d'architecture qui ne peut pas échouer ne protège rien. »
 * Chaque règle est donc prouvée DANS LES DEUX SENS :
 *   1. elle passe sur l'arbre réel du dépôt
 *   2. elle échoue sur un arbre de violations volontaires (__fixtures__/violations)
 *
 * Ce fichier ne contient AUCUNE règle. Ajouter un domaine = une ligne dans rules.ts.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { RULES } from './rules.ts';
import {
  scan,
  formatViolations,
  globToRegExp,
  extractImports,
  resolveSpecifier,
} from './scanner.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const FIXTURE_VIOLATIONS = resolve(HERE, '__fixtures__/violations');
const FIXTURE_CLEAN = resolve(HERE, '__fixtures__/clean');

/* ── SENS 1 — le dépôt réel est propre ─────────────────────────────────────── */

describe('Sens 1 — le dépôt respecte les règles', () => {
  test('aucune violation dans le dépôt', () => {
    const violations = scan(REPO_ROOT);
    assert.equal(violations.length, 0, `\n${formatViolations(violations)}`);
  });

  test('un arbre conforme de référence ne produit aucune violation', () => {
    const violations = scan(FIXTURE_CLEAN);
    assert.equal(violations.length, 0, `\n${formatViolations(violations)}`);
  });
});

/* ── SENS 2 — chaque règle attrape sa violation ────────────────────────────── */

describe('Sens 2 — chaque règle échoue quand on la viole', () => {
  const violations = scan(FIXTURE_VIOLATIONS, RULES, [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
  ]);

  const attendu: Record<string, string> = {
    'ARC-001': 'apps/api/src/attendance/domain/violation-arc-001.ts',
    'ARC-002': 'apps/api/src/attendance/domain/violation-arc-002.ts',
    'ARC-003': 'apps/admin-web/src/violation-arc-003.ts',
    'ARC-004': 'packages/kernel/src/violation-arc-004.ts',
    'ARC-005': 'apps/api/src/attendance/domain/violation-arc-005.ts',
    'ARC-006': 'apps/api/src/attendance/domain/violation-arc-005.ts',
  };

  test('toute règle déclarée possède une violation de référence', () => {
    const sansFixture = RULES.map((r) => r.id).filter((id) => !(id in attendu));
    assert.deepEqual(
      sansFixture,
      [],
      `Règles sans preuve d'échec : ${sansFixture.join(', ')}. ` +
        'Ajoutez un fichier dans __fixtures__/violations avant de merger la règle.',
    );
  });

  for (const [ruleId, fichier] of Object.entries(attendu)) {
    test(`${ruleId} attrape ${fichier}`, () => {
      const trouvees = violations.filter((v) => v.ruleId === ruleId);
      assert.ok(
        trouvees.length > 0,
        `${ruleId} n'a rien détecté. La règle est inerte.\n${formatViolations(violations)}`,
      );
      assert.ok(
        trouvees.some((v) => v.file === fichier),
        `${ruleId} n'a pas nommé le fichier fautif ${fichier}.`,
      );
    });
  }

  test('le message nomme le fichier, la règle et la sévérité', () => {
    const rapport = formatViolations(violations);
    assert.match(rapport, /\[P[012]\] ARC-\d{3} — \S+:\d+/);
    assert.match(rapport, /Pourquoi :/);
  });

  test('les sévérités déclarées sont respectées', () => {
    for (const rule of RULES) {
      const v = violations.filter((x) => x.ruleId === rule.id);
      for (const one of v) assert.equal(one.severity, rule.severity);
    }
  });
});

/* ── Le moteur lui-même ────────────────────────────────────────────────────── */

describe('Moteur', () => {
  test('glob : ** traverse, * reste dans un segment', () => {
    assert.ok(
      globToRegExp('apps/api/src/*/domain/**').test('apps/api/src/attendance/domain/a/b.ts'),
    );
    assert.ok(!globToRegExp('apps/api/src/*/domain/**').test('apps/api/src/a/b/domain/x.ts'));
    assert.ok(globToRegExp('packages/kernel/**').test('packages/kernel/src/x.ts'));
  });

  test('glob : les alternatives {a,b} fonctionnent', () => {
    const re = globToRegExp('apps/api/src/*/{domain,application}/**');
    assert.ok(re.test('apps/api/src/x/domain/a.ts'));
    assert.ok(re.test('apps/api/src/x/application/a.ts'));
    assert.ok(!re.test('apps/api/src/x/infrastructure/a.ts'));
  });

  test('imports : couvre import, export-from, import() et require()', () => {
    const src = [
      "import a from 'x1';",
      "import 'x2';",
      "export { b } from 'x3';",
      "const c = await import('x4');",
      "const d = require('x5');",
    ].join('\n');
    const specs = extractImports(src)
      .map((i) => i.specifier)
      .sort();
    assert.deepEqual(specs, ['x1', 'x2', 'x3', 'x4', 'x5']);
  });

  test('résolution : relatif résolu, paquet npm ignoré, alias appliqué', () => {
    assert.equal(
      resolveSpecifier('apps/api/src/a/domain/x.ts', '../infrastructure/y.ts'),
      'apps/api/src/a/infrastructure/y.ts',
    );
    assert.equal(resolveSpecifier('apps/api/src/a/domain/x.ts', 'twilio'), null);
    assert.equal(
      resolveSpecifier('apps/api/src/a/domain/x.ts', '@akila/kernel/ids.ts'),
      'packages/kernel/src/ids.ts',
    );
  });

  test('la suite tourne en moins de 30 secondes', () => {
    const t0 = performance.now();
    scan(REPO_ROOT);
    assert.ok(performance.now() - t0 < 30_000);
  });
});
