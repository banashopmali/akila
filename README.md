# AKILA — School OS

Monorepo. Modular Monolith. Les règles d'architecture sont exécutables : elles
vivent dans `tools/architecture-tests/rules.ts` et refusent le merge quand on les viole.

## Démarrer

```bash
pnpm install
pnpm verify        # les 8 gates en local, dans l'ordre de la CI
```

## Les 8 gates

| #   | Gate                     | Commande                            | Refuse quoi                                            |
| --- | ------------------------ | ----------------------------------- | ------------------------------------------------------ |
| 1   | format                   | `pnpm format`                       | Style non conforme                                     |
| 2   | lint                     | `pnpm lint`                         | `any` explicite, `catch` vide, `==`, imports interdits |
| 3   | typecheck                | `pnpm typecheck`                    | TypeScript strict, aucun `any` implicite               |
| 4   | tests unitaires          | `pnpm test:unit`                    | Régression                                             |
| 5   | tests d'intégration      | `pnpm test:integration`             | Régression avec PostgreSQL réel                        |
| 6   | **tests d'architecture** | `pnpm test:arch`                    | Violation des règles AKILA                             |
| 7   | scan de secrets          | `pnpm scan:secrets`                 | Secret commité                                         |
| 8   | build + registre         | `pnpm build && pnpm check:registry` | Compilation, fichier hors registre                     |

Les 8 tournent en parallèle sur GitHub Actions. On veut la liste complète des
problèmes en une passe, pas le premier qui tombe.

## La structure

```
apps/
  api/          Modular Monolith — un dossier par domaine, 4 couches chacun
  admin-web/    Console d'administration — parle à l'API, jamais à la base
packages/
  kernel/       Primitives techniques uniquement. Zéro entité métier.
tools/
  architecture-tests/   Les règles, le moteur, la preuve dans les deux sens
  ci/                   Scan de secrets, cohérence du File Registry
```

Le sens des flèches, à l'intérieur d'un domaine :

```
interfaces → application → domain ← infrastructure
```

Il ne s'inverse jamais. Le `domain` déclare un Port, `infrastructure` l'implémente.

## Les documents qui font foi

| Document                             | Rôle                                            |
| ------------------------------------ | ----------------------------------------------- |
| `CLAUDE.md`                          | Contrat de collaboration — les 11 interdictions |
| `REVIEW.md`                          | Relecture à 4 niveaux                           |
| `AKILA-FILE-REGISTRY.md`             | Aucun fichier n'existe sans y être inscrit      |
| `tools/architecture-tests/README.md` | Comment ajouter une règle                       |

## Ce qui n'est pas là, et pourquoi

`apps/api/src`, `apps/admin-web/src` et `packages/kernel/src` sont **vides**.

C'est une décision, pas un oubli. NestJS s'installe avec la première tranche
verticale réelle ; le kernel se remplit une primitive à la fois, chacune justifiée
par un besoin présent. Une abstraction créée « au cas où » finit par être supprimée
— ou pire, par être respectée.

Ce qui est là dès maintenant, c'est ce qui **empêche** : les règles, les gates, les
preuves. Le garde-fou avant la route.
