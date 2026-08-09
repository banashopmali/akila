/**
 * AKILA — Moteur des tests d'architecture
 * =======================================
 *
 * Ce fichier ne connaît AUCUNE règle. Il applique ce que rules.ts déclare.
 * Ajouter un domaine ou une règle ne doit jamais obliger à toucher ce fichier.
 *
 * Aucune dépendance externe : Node seul. AKT-19 §6 interdit tout outil propriétaire.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, posix } from 'node:path';
import { RULES, IMPORT_ALIASES, IGNORED_DIRS, type Rule, type Severity } from './rules.ts';

export interface Violation {
  ruleId: string;
  severity: Severity;
  file: string;
  line: number;
  detail: string;
  because: string;
}

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

/* ── Globs ────────────────────────────────────────────────────────────────── */

/**
 * Convertit un glob en RegExp.
 * `**` traverse les répertoires · `*` reste dans un segment · `{a,b}` alterne.
 */
export function globToRegExp(glob: string): RegExp {
  let out = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**/` consomme zéro ou plusieurs segments ; `**` en fin consomme tout.
        if (glob[i + 2] === '/') {
          out += '(?:[^/]*\\/)*';
          i += 3;
        } else {
          out += '.*';
          i += 2;
        }
      } else {
        out += '[^/]*';
        i += 1;
      }
    } else if (c === '{') {
      const end = glob.indexOf('}', i);
      const alts = glob.slice(i + 1, end).split(',');
      out += `(?:${alts.map(escapeLiteral).join('|')})`;
      i = end + 1;
    } else {
      out += escapeLiteral(c);
      i += 1;
    }
  }
  return new RegExp(`^${out}$`);
}

function escapeLiteral(s: string): string {
  return s.replace(/[.+^${}()|[\]\\?]/g, '\\$&');
}

function matches(path: string, glob: string): boolean {
  return globToRegExp(glob).test(path);
}

/* ── Collecte des fichiers ────────────────────────────────────────────────── */

export function collectSourceFiles(root: string, ignored: string[] = IGNORED_DIRS): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignored.includes(entry)) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (SOURCE_EXT.test(entry)) found.push(full);
    }
  };
  walk(root);
  return found.map((f) => relative(root, f).split('\\').join('/')).sort();
}

/* ── Extraction des imports ───────────────────────────────────────────────── */

export interface ImportRef {
  specifier: string;
  line: number;
}

/**
 * Couvre : import x from 'y' · import 'y' · export … from 'y' · import('y') · require('y').
 * Les chaînes en commentaire produisent des faux positifs négligeables et jamais des faux négatifs :
 * pour un test d'architecture, se tromper du côté strict est le bon sens de l'erreur.
 */
export function extractImports(source: string): ImportRef[] {
  const refs: ImportRef[] = [];
  const patterns = [
    /(?:^|\s)(?:import|export)\s[\s\S]*?from\s*['"]([^'"]+)['"]/g,
    /(?:^|\s)import\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  const seen = new Set<string>();
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      // Position du specifier lui-même, pas du début du match : les patterns
      // commencent par (?:^|\s) et absorberaient le saut de ligne précédent.
      const at = m.index + m[0].lastIndexOf(m[1]);
      const line = source.slice(0, at).split('\n').length;
      const key = `${m[1]}@${line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({ specifier: m[1], line });
    }
  }
  return refs.sort((a, b) => a.line - b.line);
}

/** Résout un specifier en chemin repo-relatif, ou `null` si c'est un paquet externe. */
export function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith('.')) {
    return posix.normalize(posix.join(posix.dirname(fromFile), specifier));
  }
  for (const [alias, target] of Object.entries(IMPORT_ALIASES)) {
    if (specifier === alias || specifier.startsWith(alias.endsWith('/') ? alias : `${alias}/`)) {
      const rest = specifier.slice(alias.length).replace(/^\//, '');
      return posix.normalize(rest ? posix.join(target, rest) : target);
    }
  }
  return null; // paquet npm
}

function isAllowedPackage(specifier: string, allowed: string[]): boolean {
  if (specifier.startsWith('node:')) return true;
  return allowed.some((p) => specifier === p || specifier.startsWith(`${p}/`));
}

/* ── Application des règles ───────────────────────────────────────────────── */

function checkFile(file: string, source: string, rules: Rule[]): Violation[] {
  const out: Violation[] = [];
  const imports = extractImports(source);

  for (const rule of rules) {
    if (rule.kind === 'dependency') {
      if (!matches(file, rule.from)) continue;
      for (const imp of imports) {
        const target = resolveSpecifier(file, imp.specifier);
        if (!target) continue;
        for (const forbidden of rule.cannotImport) {
          if (matches(target, forbidden)) {
            out.push({
              ruleId: rule.id,
              severity: rule.severity,
              file,
              line: imp.line,
              detail: `importe « ${imp.specifier} » → ${target} (interdit : ${forbidden})`,
              because: rule.because,
            });
          }
        }
      }
    } else if (rule.kind === 'external') {
      if (!matches(file, rule.in)) continue;
      for (const imp of imports) {
        if (resolveSpecifier(file, imp.specifier) !== null) continue;
        if (isAllowedPackage(imp.specifier, rule.allowedPackages)) continue;
        out.push({
          ruleId: rule.id,
          severity: rule.severity,
          file,
          line: imp.line,
          detail: `importe le paquet externe « ${imp.specifier} » (autorisés : ${rule.allowedPackages.join(', ') || 'aucun'})`,
          because: rule.because,
        });
      }
    } else {
      if (!matches(file, rule.in)) continue;
      const lines = source.split('\n');
      for (const ident of rule.forbiddenIdentifiers) {
        // Capte l'entité nue et ses dérivés : Student, StudentId, StudentRepository…
        const re = new RegExp(`\\b${escapeLiteral(ident)}[A-Za-z0-9_]*\\b`);
        lines.forEach((text, idx) => {
          const m = re.exec(text);
          if (m) {
            out.push({
              ruleId: rule.id,
              severity: rule.severity,
              file,
              line: idx + 1,
              detail: `contient l'identifiant métier « ${m[0]} »`,
              because: rule.because,
            });
          }
        });
      }
    }
  }
  return out;
}

export function scan(root: string, rules: Rule[] = RULES, ignored = IGNORED_DIRS): Violation[] {
  const files = collectSourceFiles(root, ignored);
  const violations: Violation[] = [];
  for (const file of files) {
    const source = readFileSync(join(root, file), 'utf8');
    violations.push(...checkFile(file, source, rules));
  }
  return violations.sort(
    (a, b) =>
      a.severity.localeCompare(b.severity) || a.file.localeCompare(b.file) || a.line - b.line,
  );
}

/** Rapport lisible par un humain — AKT-19 §5 : nomme le fichier, la règle et la sévérité. */
export function formatViolations(violations: Violation[]): string {
  if (violations.length === 0) return "✅ Aucune violation d'architecture.";
  const lines = [`❌ ${violations.length} violation(s) d'architecture :`, ''];
  for (const v of violations) {
    lines.push(`  [${v.severity}] ${v.ruleId} — ${v.file}:${v.line}`);
    lines.push(`         ${v.detail}`);
    lines.push(`         Pourquoi : ${v.because}`);
    lines.push('');
  }
  return lines.join('\n');
}
