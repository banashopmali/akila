# Premier démarrage — à faire une seule fois

Ce dépôt a été construit dans un environnement qui bloque les paquets npm scopés
(`@eslint/js`, `@types/node` → HTTP 403). Conséquence : **il n'y a pas encore de
`pnpm-lock.yaml`**, et trois gates n'ont jamais été exercées.

La CI utilise `pnpm install --frozen-lockfile`, qui **exige** un lockfile.
Sans lui, six jobs sur huit échouent à l'installation.

## Les quatre commandes

```bash
pnpm install                 # génère pnpm-lock.yaml et installe tout
pnpm verify                  # les 8 gates en local, dans l'ordre de la CI
git add pnpm-lock.yaml && git commit -m "chore: verrouiller les dépendances"
git push -u origin main
```

Puis la branche de démonstration :

```bash
git push -u origin demo/ci-refuse-les-violations
```

Ouvre la PR depuis cette branche. **La CI doit la refuser** en nommant les
4 violations. Ferme sans merger, mets le lien dans `Preuve` d'AKT-12.

## Ce qui est déjà vérifié, et ce qui ne l'est pas

| Gate                     | État                              |
| ------------------------ | --------------------------------- |
| 1 · format               | ✅ exécutée, verte                |
| 6 · tests d'architecture | ✅ exécutée, 16/16, les deux sens |
| 7 · scan de secrets      | ✅ exécutée, verte                |
| 8 · File Registry        | ✅ exécutée, verte                |
| 2 · lint                 | ⚠️ jamais exécutée                |
| 3 · typecheck            | ⚠️ jamais exécutée                |
| 8 · build                | ⚠️ jamais exécutée                |

`pnpm verify` te dira la vérité en une minute. Si quelque chose casse, ce sera
là — probablement dans `tsconfig.base.json`, le seul fichier que je n'ai pas pu
exercer.

## Si `typecheck` refuse

Les causes probables, par ordre de vraisemblance :

1. **`allowImportingTsExtensions` + `rewriteRelativeImportExtensions`** exigent
   TypeScript 5.7 ou plus. Vérifie avec `pnpm tsc --version`.
2. **`verbatimModuleSyntax`** impose `import type` pour les imports de types.
   Le code respecte déjà cette règle, mais le compilateur est plus strict que moi.
3. **`noUnusedLocals`** — un import laissé derrière une modification.

Aucune de ces trois ne demande de toucher aux règles d'architecture.

## La ligne à ne pas franchir

Si une gate est rouge, on corrige le code. **On ne désactive pas la gate.**

C'est écrit dans `tools/architecture-tests/README.md` et ça vaut pour les huit :
un test d'architecture affaibli pour verdir un pipeline ne protège plus rien,
et personne ne se souvient six mois plus tard qu'il a été affaibli.
