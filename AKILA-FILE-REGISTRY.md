# AKILA — File Registry

> **Règle.** Aucun fichier source n'est créé sans être inscrit ici, dans le même commit.
> La gate 8 de la CI refuse le merge dans les deux sens : fichier non inscrit, ou
> fichier inscrit mais absent du disque.
>
> Pourquoi cette gate existe : l'arborescence qui dérive silencieusement est le mode
> d'échec numéro un du code généré. Un fichier qu'on n'a pas décidé d'écrire est un
> fichier que personne ne maintient.

Exempté : `**/__fixtures__/**` — les fixtures existent pour être fausses.

---

## Racine — configuration

| Fichier                                | Rôle                                               | Propriétaire |
| -------------------------------------- | -------------------------------------------------- | ------------ |
| `package.json`                         | Scripts et devDependencies du workspace            | I            |
| `pnpm-workspace.yaml`                  | Périmètre du monorepo                              | I            |
| `tsconfig.base.json`                   | TypeScript strict, alias `@akila/*`                | I            |
| `eslint.config.js`                     | Lint + seconde ligne de défense sur les imports    | I            |
| `.prettierrc.json` / `.prettierignore` | Format                                             | I            |
| `.editorconfig`                        | Fins de ligne, indentation                         | I            |
| `.gitignore`                           | Exclusions                                         | I            |
| `AKILA-FILE-REGISTRY.md`               | Ce fichier                                         | I            |
| `DEMARRAGE.md`                         | Premier démarrage — lockfile et gates non exercées | I            |
| `CLAUDE.md`                            | Contrat de collaboration — les 11 interdictions    | I            |
| `REVIEW.md`                            | Relecture à 4 niveaux                              | I            |

## `.github/`

| Fichier                    | Rôle                        |
| -------------------------- | --------------------------- |
| `.github/workflows/ci.yml` | Les 8 gates + Evidence Pack |

## `tools/architecture-tests/` — AKT-19

| Fichier                                         | Rôle                                                            |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `tools/architecture-tests/rules.ts`             | **Les règles. Le seul fichier à modifier pour en ajouter une.** |
| `tools/architecture-tests/scanner.ts`           | Moteur — ne connaît aucune règle                                |
| `tools/architecture-tests/check.ts`             | Entrée CLI de la gate 6                                         |
| `tools/architecture-tests/architecture.spec.ts` | Preuve dans les deux sens                                       |
| `tools/architecture-tests/README.md`            | Comment ajouter une règle                                       |

## `tools/ci/` — AKT-12

| Fichier                            | Rôle                              |
| ---------------------------------- | --------------------------------- |
| `tools/ci/secret-scan.mjs`         | Gate 7 — interdiction 11          |
| `tools/ci/file-registry-check.mjs` | Gate 8 — cohérence de ce registre |

## `apps/api/` — Modular Monolith

| Fichier                 | Rôle                   |
| ----------------------- | ---------------------- |
| `apps/api/package.json` | Manifeste du workspace |

> `src/` est **volontairement vide**. Chaque domaine y arrive avec sa première
> tranche verticale complète : `domain/`, `application/`, `infrastructure/`, `interfaces/`.
> Le framework NestJS s'installe avec cette première tranche, pas avant.

## `apps/admin-web/` — Console d'administration

| Fichier                       | Rôle                   |
| ----------------------------- | ---------------------- |
| `apps/admin-web/package.json` | Manifeste du workspace |

## `packages/kernel/` — AKT-66, propriétaire N

| Fichier                        | Rôle                   |
| ------------------------------ | ---------------------- |
| `packages/kernel/package.json` | Manifeste du workspace |

> Vide par décision. Se remplit une primitive à la fois, chacune justifiée par un
> besoin présent. Jamais d'entité métier — règle `ARC-004`.
