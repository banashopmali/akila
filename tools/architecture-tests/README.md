# Tests d'architecture AKILA

Ces tests transforment les règles écrites de CLAUDE.md en une machine qui les
vérifie à chaque pull request. Une règle qui n'est pas ici n'existe pas.

## Ajouter une règle

Un seul fichier bouge : **`rules.ts`**. Ni `scanner.ts`, ni `architecture.spec.ts`.

```ts
{
  id: 'ARC-007',
  kind: 'dependency',
  severity: 'P0',
  because: "Interdiction 4 — un domaine ne lit jamais les tables d'un autre.",
  from: 'apps/api/src/facturation/**',
  cannotImport: ['apps/api/src/scolarite/**'],
}
```

Puis **ajoutez une violation de référence** dans `__fixtures__/violations/` et sa
ligne dans la table `attendu` de `architecture.spec.ts`. Le test
« toute règle déclarée possède une preuve d'échec » refuse une règle sans fixture.

C'est volontaire. AKT-19 §4 : _« un test d'architecture qui ne peut pas échouer ne
protège rien. »_ Une règle sans preuve d'échec est une règle décorative.

## Ajouter un domaine

Rien à faire. Les globs utilisent `apps/api/src/*/domain/**` : tout nouveau domaine
est couvert par ARC-001, ARC-002 et ARC-005 dès sa création.

## Les trois formes de règle

| `kind`       | Vérifie                          | Champs                       |
| ------------ | -------------------------------- | ---------------------------- |
| `dependency` | Qui importe qui                  | `from`, `cannotImport`       |
| `content`    | Quels identifiants apparaissent  | `in`, `forbiddenIdentifiers` |
| `external`   | Quels paquets npm sont autorisés | `in`, `allowedPackages`      |

## Sévérités

|      | Effet                                                                               |
| ---- | ----------------------------------------------------------------------------------- |
| `P0` | Le job échoue. Merge impossible.                                                    |
| `P1` | Le job échoue. Merge impossible — durci tant qu'il n'y a pas de release à protéger. |
| `P2` | Avertissement annoté.                                                               |

## Lancer

```bash
pnpm test:arch                                  # scanne le dépôt (gate 6)
node --test "tools/architecture-tests/*.spec.ts"  # preuve dans les deux sens
```

## Ce que le rapport doit toujours contenir

```
  [P0] ARC-001 — apps/api/src/attendance/domain/decision.ts:3
       importe « ../infrastructure/postgres.repository.ts » → …
       Pourquoi : Interdiction 3 — le Domain ne connaît jamais l'Infrastructure concrète.
```

Fichier, ligne, règle, sévérité, **et la raison**. Un message d'échec qui n'explique
pas pourquoi la règle existe finit par être contourné.

## La ligne rouge

> Un test d'architecture ne doit **jamais** être affaibli, ignoré ou supprimé pour
> verdir un pipeline. Si une règle vous bloque, c'est soit votre code qui a tort,
> soit la règle qui doit changer — par décision explicite, dans `rules.ts`, avec
> la raison mise à jour. Jamais en silence.

## Choix techniques

- **Aucune dépendance externe.** Node seul. AKT-19 §6 interdit tout outil propriétaire.
- **Analyse textuelle, pas AST.** Un AST serait plus précis mais introduit une dépendance
  et de la lenteur. Le compromis assumé : on peut produire un faux positif sur une chaîne
  en commentaire, jamais un faux négatif sur un import réel. Pour un garde-fou, se
  tromper du côté strict est le bon sens de l'erreur.
- **< 30 s**, vérifié par un test.
