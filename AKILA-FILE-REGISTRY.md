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

| Fichier                                | Rôle                                                   | Propriétaire |
| -------------------------------------- | ------------------------------------------------------ | ------------ |
| `package.json`                         | Scripts et devDependencies du workspace                | I            |
| `pnpm-workspace.yaml`                  | Périmètre du monorepo                                  | I            |
| `tsconfig.base.json`                   | TypeScript strict, alias `@akila/*`                    | I            |
| `eslint.config.js`                     | Lint + seconde ligne de défense sur les imports        | I            |
| `.prettierrc.json` / `.prettierignore` | Format                                                 | I            |
| `.editorconfig`                        | Fins de ligne, indentation                             | I            |
| `.gitignore`                           | Exclusions                                             | I            |
| `AKILA-FILE-REGISTRY.md`               | Ce fichier                                             | I            |
| `DEMARRAGE.md`                         | Premier démarrage — lockfile et gates non exercées     | I            |
| `CLAUDE.md`                            | Contrat de collaboration — les 11 interdictions        | I            |
| `REVIEW.md`                            | Relecture à 4 niveaux                                  | I            |
| `DECISIONS.md`                         | Journal des décisions — provisoire jusqu'à AKT-4       | I            |
| `REVIEW-PR4-AKT66.md`                  | Revue croisée de la PR #4 — **emplacement à trancher** | I            |

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

## `packages/kernel/` — AKT-66, propriétaire I

| Fichier                                  | Rôle                                                       |
| ---------------------------------------- | ---------------------------------------------------------- |
| `packages/kernel/package.json`           | Manifeste du workspace                                     |
| `packages/kernel/src/result.ts`          | `Result` — l'échec est une valeur, pas une exception       |
| `packages/kernel/src/result.spec.ts`     | Tests                                                      |
| `packages/kernel/src/errors.ts`          | Modèle d'erreurs — les 3 classes d'échec (CLAUDE.md §7)    |
| `packages/kernel/src/errors.spec.ts`     | Tests                                                      |
| `packages/kernel/src/ids.ts`             | Identifiants techniques marqués, validation aux frontières |
| `packages/kernel/src/ids.spec.ts`        | Tests                                                      |
| `packages/kernel/src/clock.ts`           | Port `Clock` — horloge système et horloge figée            |
| `packages/kernel/src/clock.spec.ts`      | Tests                                                      |
| `packages/kernel/src/pagination.ts`      | Contrat de pagination par curseur opaque                   |
| `packages/kernel/src/pagination.spec.ts` | Tests                                                      |
| `packages/kernel/src/logger.ts`          | Journalisation structurée, rédaction des champs sensibles  |
| `packages/kernel/src/logger.spec.ts`     | Tests                                                      |

> Se remplit une primitive à la fois, chacune justifiée par un besoin présent.
> Jamais d'entité métier — règle `ARC-004`.
>
> **Pas encore ici :**
>
> - **Event Envelope** — ses 10 champs sont fixés par CLAUDE.md §8. Rien ne la
>   bloque plus : elle est la prochaine primitive de ce dossier.
> - **Outbox et Inbox** — hors de la liste §5, et ils portent des enveloppes.
>   Où ils logent reste à décider.
> - **Configuration** — AKT-66 l'inscrit à son périmètre, mais §5 énumère ce que
>   `packages/` contient et la configuration n'y figure pas. Reportée le 16 août.
>
> Les trois sont consignés dans `DECISIONS.md`.
