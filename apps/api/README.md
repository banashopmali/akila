# apps/api — Modular Monolith AKILA

Chaque domaine vit dans `src/<domaine>/` et respecte **exactement** ces quatre couches :

```
src/<domaine>/
  domain/           entités, valeurs, règles métier, PORTS (interfaces)
                    → ne dépend de rien d'autre que TypeScript et @akila/kernel
  application/      cas d'usage, orchestration, transactions
  infrastructure/   adaptateurs concrets : PostgreSQL, Redis, Twilio, Orange
  interfaces/       controllers HTTP, DTO d'entrée/sortie, mapping
```

**Le sens des flèches ne s'inverse jamais :**
`interfaces → application → domain ← infrastructure`

Le `domain` déclare un Port ; `infrastructure` l'implémente. Jamais l'inverse.
Ces règles sont exécutables — voir `tools/architecture-tests/rules.ts`.

**Entre domaines, jamais en direct.** Contrat public ou événement, vers la couche
`application` du consommateur. CLAUDE.md §3.

> Le framework (NestJS) s'installe avec la première tranche verticale réelle,
> pas avant. REVIEW.md : une abstraction créée « au cas où » se supprime.
