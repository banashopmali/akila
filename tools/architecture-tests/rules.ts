/**
 * AKILA — Règles d'architecture exécutables
 * =========================================
 *
 * SOURCE : CLAUDE.md §3 (direction des dépendances) et §4 (les 11 interdictions).
 * Ce fichier est le SEUL endroit à modifier pour ajouter une règle ou un domaine.
 * Les tests (architecture.spec.ts) et le moteur (scanner.ts) ne bougent jamais.
 *
 * Sévérités — CLAUDE.md §12 :
 *   P0 → bloque le merge
 *   P1 → bloque la release (durci en P0 tant qu'il n'y a pas de release à protéger)
 *   P2 → avertit
 */

export type Severity = 'P0' | 'P1' | 'P2';

/** Règle de dépendance : un fichier de `from` ne doit importer aucun fichier de `cannotImport`. */
export interface DependencyRule {
  id: string;
  kind: 'dependency';
  severity: Severity;
  /** Ce que la règle protège, en français, affiché tel quel dans le message d'échec. */
  because: string;
  /** Glob repo-relatif. `*` = un segment, `**` = plusieurs. */
  from: string;
  cannotImport: string[];
}

/** Règle de contenu : un fichier de `in` ne doit contenir aucun des identifiants interdits. */
export interface ContentRule {
  id: string;
  kind: 'content';
  severity: Severity;
  because: string;
  in: string;
  forbiddenIdentifiers: string[];
}

/** Règle d'étanchéité : un fichier de `in` ne doit importer aucun paquet npm hors allowlist. */
export interface ExternalRule {
  id: string;
  kind: 'external';
  severity: Severity;
  because: string;
  in: string;
  allowedPackages: string[];
}

export type Rule = DependencyRule | ContentRule | ExternalRule;

/**
 * Les entités métier qui ne deviennent JAMAIS des modèles partagés — CLAUDE.md §5.
 * Le scanner les détecte aussi préfixées/suffixées (Student, StudentId, StudentRepository…).
 */
export const BUSINESS_ENTITIES = [
  'Student',
  'School',
  'Guardian',
  'Attendance',
  'Grade',
  'Payment',
  'Trip',
] as const;

export const RULES: Rule[] = [
  // ── Les 4 règles obligatoires de la v1 (AKT-12 §5) ───────────────────────────
  {
    id: 'ARC-001',
    kind: 'dependency',
    severity: 'P0',
    because:
      "Interdiction 3 — le Domain ne connaît jamais l'Infrastructure concrète. " +
      'Il déclare des Ports ; les adaptateurs les implémentent.',
    from: 'apps/api/src/*/domain/**',
    cannotImport: ['apps/api/src/*/infrastructure/**'],
  },
  {
    id: 'ARC-002',
    kind: 'dependency',
    severity: 'P0',
    because:
      'Interdictions 1 et 2 — le Domain ne connaît ni UI ni Controller/API. ' +
      'Les DTO HTTP appartiennent à interfaces/, pas au métier.',
    from: 'apps/api/src/*/domain/**',
    cannotImport: ['apps/api/src/*/interfaces/**'],
  },
  {
    id: 'ARC-003',
    kind: 'dependency',
    severity: 'P0',
    because:
      "Interdiction 6 — l'UI ne touche jamais la base ni le code serveur. " +
      "Elle passe par l'API (Interface Boundary).",
    from: 'apps/admin-web/**',
    cannotImport: ['apps/api/src/**'],
  },
  {
    id: 'ARC-004',
    kind: 'content',
    severity: 'P1',
    because:
      'CLAUDE.md §5 — packages/ ne contient que des primitives techniques. ' +
      'Student, School, Guardian, Attendance, Grade, Payment, Trip ne deviennent jamais partagés.',
    in: 'packages/kernel/**',
    forbiddenIdentifiers: [...BUSINESS_ENTITIES],
  },

  // ── Extensions — ajouter une ligne ici suffit, ne touchez pas aux tests ───────
  {
    id: 'ARC-005',
    kind: 'external',
    severity: 'P0',
    because:
      "Interdiction 10 — un SDK fournisseur ne vit que dans un adaptateur d'infrastructure. " +
      'Le Domain reste en TypeScript nu : aucun paquet npm hors allowlist.',
    in: 'apps/api/src/*/domain/**',
    allowedPackages: ['@akila/kernel'],
  },
  {
    id: 'ARC-006',
    kind: 'content',
    severity: 'P0',
    because:
      "Interdiction 10 — le nom d'un fournisseur ne doit apparaître nulle part hors adaptateur.",
    in: 'apps/api/src/*/{domain,application}/**',
    forbiddenIdentifiers: ['twilio', 'Twilio', 'OrangeSms', 'orange-sms'],
  },
];

/**
 * Alias de résolution — doivent rester alignés avec tsconfig.base.json.
 * Clé = préfixe d'import, valeur = chemin repo-relatif.
 */
export const IMPORT_ALIASES: Record<string, string> = {
  '@akila/kernel': 'packages/kernel/src',
  '@/': 'apps/admin-web/src/',
};

/** Répertoires jamais scannés. */
export const IGNORED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '__fixtures__',
];
