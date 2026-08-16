# CLAUDE.md — contrat de collaboration AKILA

> **v1.0 — à valider par le Delivery Owner avant de faire autorité.**
> Deux points sont marqués `À VALIDER` : ils n'ont pas de source normative dans le
> corpus. Constitution §28 : quand une décision manque, on s'arrête et on signale.

Ce fichier suffit pour coder. Si vous devez ouvrir un autre document avant d'écrire
une ligne, c'est que ce fichier a échoué — signalez-le.

Autorité : ce document applique **AKILA-ACRB-001** (Constitution). En cas de
contradiction, la Constitution gagne et l'implémentation s'arrête.

---

## §1 — Avant toute modification

Identifier : la tâche (AKT-n), le domaine, les fichiers autorisés, les contrats
touchés, les tests attendus. Puis lire le README du domaine cible.

**S'il manque une décision normative, s'arrêter et signaler le manque.** Ne jamais
l'inventer. Claude Code est un contributeur gouverné, pas une autorité d'architecture.

## §2 — Le cycle

Planifier → **un seul fichier de production à la fois** → formater → linter →
typer → tester → documenter → mettre à jour le registre → s'arrêter au périmètre demandé.

Dépasser le périmètre demandé est une violation, même quand le code produit est bon.

## §3 — Direction des dépendances

À l'intérieur d'un domaine (`apps/api/src/<domaine>/`) :

```
interfaces → application → domain ← infrastructure
```

Le sens ne s'inverse **jamais**. Le `domain` déclare un Port ; `infrastructure`
l'implémente. Le `domain` ne dépend que de TypeScript et de `@akila/kernel`.

**Entre domaines, jamais en direct.** Contrat public ou événement, consommé par la
couche `application`. Jamais le repository, jamais les tables, jamais l'entité de l'autre.

## §4 — Les 11 interdictions

| #   | Interdiction                                                                              | Gate              |
| --- | ----------------------------------------------------------------------------------------- | ----------------- |
| 1   | Le Domain ne connaît pas l'UI                                                             | ARC-002           |
| 2   | Le Domain ne connaît ni Controller ni DTO HTTP                                            | ARC-002           |
| 3   | Le Domain ne connaît pas l'Infrastructure concrète                                        | ARC-001           |
| 4   | Un domaine ne lit jamais les tables ni les repositories d'un autre                        | à écrire          |
| 5   | La logique métier centrale ne vit ni dans un controller ni dans un widget · **À VALIDER** | relecture         |
| 6   | L'UI ne touche jamais la base ni le code serveur — elle passe par l'API HTTP              | ARC-003           |
| 7   | Aucune erreur avalée : pas de `catch` vide                                                | lint `no-empty`   |
| 8   | Aucun `any` silencieux                                                                    | lint + typecheck  |
| 9   | Aucun contournement du tenant, de l'autorisation ou de l'audit · **À VALIDER**            | tests d'isolation |
| 10  | Un SDK ou un nom de fournisseur ne vit que dans un adaptateur d'infrastructure            | ARC-005 · ARC-006 |
| 11  | Aucun secret dans le dépôt — ni code, ni fixture, ni historique                           | scan de secrets   |

Les interdictions 5 et 9 sont dérivées de la Constitution §8 mais leur **numérotation**
n'est pas sourcée : le brouillon du 3 août qui la fixait est perdu. Le Delivery Owner
tranche. Tout le reste est cité tel quel par `tools/architecture-tests/rules.ts`.

## §5 — `packages/` — politique du Shared Kernel

`packages/kernel` contient **uniquement** : identifiants techniques, `Result`/`Error`,
abstractions de temps, enveloppe d'événement, contrat de pagination, primitives
d'observabilité.

N'y entrent **jamais** : `Student` · `School` · `Guardian` · `Attendance` · `Grade` ·
`Payment` · `Trip`. Pas « pas encore » : jamais. Une entité métier partagée est le
point de départ du couplage que l'architecture refuse par construction.

`ARC-004` échoue sur la simple présence de ces identifiants, dérivés compris
(`StudentId`, `AttendanceRepository`).

## §6 — Multi-tenant

L'isolation tenant est un invariant. **Une fonctionnalité qui permet une fuite
cross-tenant n'est pas livrable** — ce n'est pas un bug à corriger plus tard.

Le tenant est dérivé et vérifié **côté backend**, propagé dans les contrats, appliqué
aux données, aux caches, aux exports et aux médias, testé et audité.

Un `tenantId` fourni par le client n'est jamais une preuve d'autorisation.

## §7 — Event Envelope — 10 champs

Tout événement public porte l'enveloppe commune. Elle appartient au Lot 1 (AKT-66).

**À VALIDER — les 10 champs ne sont fixés nulle part.** La Constitution §16 n'en donne
que le socle : identité d'événement, type, version, timestamp du fait, corrélation,
contexte tenant. Les quatre champs restants doivent être décidés avec AKT-66, avant
le premier événement publié. Ne pas en inventer la liste ici.

Règle qui tient déjà : **l'event bus n'est jamais un RPC déguisé.** Le producteur
possède la sémantique de ce qu'il publie ; le consommateur possède sa projection,
jamais la vérité.

## §8 — Les 3 classes d'échec

Toute intégration classe ses erreurs :

1. **transitoire / rejouable** — retry borné, avec backoff.
2. **permanente / non rejouable** — échec explicite, pas de retry.
3. **inconnue / à réconcilier** — n'invente pas d'issue, ouvre un cas.

**Le retry n'est jamais une stratégie de cohérence.** Toute opération rejouable est
idempotente. Le dernier écrivain silencieux (`last-write-wins`) est interdit sur les
agrégats critiques.

## §9 — Ownerships OUVERTS

Deux propriétés ne sont **pas** décidées :

- **Timetable / Course Schedule**
- **StaffProfile / Staff Management**

Aucun agrégat autoritatif correspondant ne peut être créé tant que la décision n'est
pas prise. Si votre tâche en a besoin : arrêt, signalement, décision — pas de contournement.

## §10 — File Registry

**Ne créez pas un fichier absent de `AKILA-FILE-REGISTRY.md`.** Inscrivez-le d'abord,
dans le même commit.

Un fichier hors registre est une violation d'architecture, pas un oubli administratif :
l'arborescence qui dérive en silence est le premier mode d'échec du code généré.

## §11 — Definition of Done

Chemin conforme · responsabilité unique · dépendances autorisées · format, lint et
types verts · tests pertinents verts · tests d'architecture verts · registre à jour ·
multi-tenancy respectée · audit appliqué où il le faut · aucun secret exposé.

**Le gate porte sur le merge, pas sur le démarrage.** Deux voies avancent en parallèle
sur des branches ; rien n'atteint `main` sans preuve.

Ne jamais déclarer verte une vérification qui n'a pas été exécutée. Citez les commandes
que vous avez réellement lancées.

## §12 — Sévérités

| Niveau | Effet                                                                       |
| ------ | --------------------------------------------------------------------------- |
| **P0** | Bloque le merge.                                                            |
| **P1** | Bloque la release — durci en P0 tant qu'il n'y a pas de release à protéger. |
| **P2** | Avertit.                                                                    |

---

## La ligne à ne pas franchir

**Si une gate est rouge, on corrige le code. On ne désactive pas la gate.**

Un test d'architecture affaibli pour verdir un pipeline ne protège plus rien, et
personne ne se souvient six mois plus tard qu'il a été affaibli.
