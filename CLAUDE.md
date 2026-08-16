# CLAUDE.md — AKILA School OS

> **Source unique des invariants.** Ce fichier remplace la lecture des 45 documents
> avant chaque modification. En cas de contradiction avec un autre document,
> **ce fichier fait foi** — et l'écart se corrige par un ADR, pas par une exception.
>
> Version 1.0 — 3 août 2026. Toute modification exige un ADR accepté.

---

## 1. Ce qu'est AKILA

Un School Operating System pour les écoles africaines. Modular Monolith orienté domaines,
multi-tenant, offline-first. Le premier parcours de valeur :

`arrivée de l'élève → décision de présence → SMS au parent → journal d'audit`

Stack : **TypeScript, NestJS, PostgreSQL, Redis** (backend) · **Next.js** (admin web) ·
**Flutter / Android** (capture tablette).

---

## 2. Périmètre actif — MVP-P (pilote du 1er octobre 2026)

**DANS :** 1 établissement · 1 année scolaire · 2 à 6 classes · import élèves/responsables par CSV ·
auth admin + enseignant · isolation `tenant_id` implémentée et testée · capture QR + saisie manuelle ·
règles présent/retard/absent avec seuil configurable · file offline durable + sync idempotente ·
SMS **sur exception uniquement** (retard, absence, sortie inhabituelle) avec statut de livraison ·
dashboard présence du jour + export CSV · journal d'audit immuable.

**HORS — prévu architecturalement, non implémenté :** biométrie · RFID/NFC · app Parent ·
app Enseignant · notifications push · Academic · Billing · Transport · Reporting · Inspector · AI ·
multi-pays · terminal sur mesure · Notification Platform multi-canal.

> **Règle dure :** n'ouvre aucun lot hors MVP-P avant le 31 octobre 2026.
> Une demande hors périmètre va au Backlog futur, sans discussion.

---

## 3. Direction des dépendances

```
UI / Clients → API (Interface Boundary) → Application → Domain → Ports → Infrastructure Adapters
```

Entre domaines, **jamais en direct** :

```
Domaine producteur → Contrat public ou Événement → Couche Application du consommateur
```

---

## 4. Les 11 interdictions universelles

Aucune exception, aucune dérogation temporaire.

1. `Domain` → UI
2. `Domain` → Controller / API
3. `Domain` → Infrastructure concrète
4. Domaine A → repository interne du domaine B
5. Domaine A → tables privées du domaine B
6. UI → base de données
7. Reporting → mutation des sources
8. Inspector → base de données d'une école
9. AI → bases opérationnelles, ou toute écriture directe
10. SDK fournisseur → `Domain`
11. Frontend → secrets

---

## 5. Politique `packages/`

`packages/` ne contient **que** : identifiants techniques, `Result`/`Error`, abstractions de temps,
enveloppe d'événement, contrat de pagination, primitives d'observabilité.

> `Student`, `School`, `Guardian`, `Attendance`, `Grade`, `Payment`, `Trip`
> **ne deviennent jamais des modèles partagés.** Jamais.

---

## 6. Multi-tenant

- Toute requête, toute écriture, tout événement porte un `tenantId`.
- Aucune requête ne franchit une frontière de tenant. C'est une violation **P0**.
- Une fonctionnalité correcte mais qui casse l'isolation multi-tenant **n'est pas livrable**.
- Tout nouveau domaine ajoute son test d'isolation. Pas de test, pas de merge.

---

## 7. Fiabilité — non négociable

**Outbox / Inbox.** Une mutation locale confirmée qui doit émettre un événement critique passe par
un Transactional Outbox. Tout consommateur critique déduplique via un Inbox.

**Idempotence.** Clé = `tenant + opération + idempotencyKey`.

- Même clé + même payload sémantique → **même résultat logique, aucun nouvel effet de bord**
- Même clé + payload différent → **conflit**, jamais de ré-exécution silencieuse
- Résultat externe inconnu → état `pending reconciliation`, jamais `success`

**Classes d'échec — toujours l'une des trois :**
`TRANSIENT` (rejouable) · `PERMANENT` (non rejouable, état terminal) · `UNKNOWN` (réconciliation requise)

**Concurrence.** Le silent last-write-wins est **interdit** sur les agrégats critiques.

**Offline ≠ Authority.** La tablette produit des observations. Le serveur décide. Toujours.

---

## 8. Event Envelope — exactement 10 champs

```ts
{
  (eventId,
    eventType,
    schemaVersion,
    tenantId,
    aggregateId,
    occurredAt,
    correlationId,
    causationId,
    producer,
    payload);
}
```

Trois horloges distinctes, jamais confondues : `occurredAt` · `receivedAt` · `persistedAt`.

---

## 9. Règles de responsabilité

- **Configuration** fournit des valeurs ; les **domaines** décident de leur signification métier.
- **Parent Communication** décide qui, pourquoi et quand ; **Notification Platform** décide comment transporter.
- **Reporting** dérive ; il ne possède jamais la vérité opérationnelle.
- Un **cache** n'est jamais source de vérité.

---

## 10. Comment travailler

**Une tranche verticale à la fois** — contrat + cas d'usage + adaptateur + test, livrés ensemble.
Pas un fichier isolé : un fichier isolé n'est pas prouvable.

Cycle : `planifier → implémenter la tranche → formater → linter → tester → documenter → s'arrêter au périmètre`

**Interdits d'exécution :**

- Ne pas inventer de dossier, d'abstraction ou de dépendance non approuvés
- Ne jamais affaiblir ni supprimer un test pour verdir un pipeline
- Ne jamais continuer sur un pipeline rouge
- Ne pas créer de fichier absent du File Registry
- Ne pas produire de document normatif sans tâche associée
- **Si une information manque dans les sources normatives : s'arrêter et signaler le gap. Ne pas inventer.**

**Ownerships encore OUVERTS — interdiction de créer les fichiers autoritatifs :**
`Timetable / Course Schedule` (A-002) · `StaffProfile / Staff Management` (A-006)

---

## 11. Definition of Done

- [ ] Format, lint, typecheck verts
- [ ] Tests unitaires et d'intégration verts
- [ ] Tests d'architecture verts
- [ ] Isolation multi-tenant validée si le domaine touche des données d'école
- [ ] File Registry à jour
- [ ] Contrats publics versionnés
- [ ] PR ouverte avec Evidence Pack généré par la CI

**Le gate porte sur le merge, pas sur le démarrage.** Deux voies peuvent avancer en parallèle
sur des branches, contre des contrats figés. Rien n'atteint `main` sans preuve.

**Revue humaine croisée obligatoire uniquement pour :** contrat public · ownership de domaine ·
règle de dépendance · baseline sécurité · standard de fiabilité.
Partout ailleurs : **CI verte = merge.**

---

## 12. Sévérité des violations

| Niveau | Exemples                                                                                                                          | Conséquence           |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **P0** | Franchissement cross-tenant · `Domain`→Infrastructure · UI→DB · Inspector→DB école · écriture directe AI · dépendance à un secret | **Bloque le merge**   |
| **P1** | Repository cross-domaine direct · cycle de dépendances · SDK fournisseur dans le cœur · contrat public non versionné              | **Bloque la release** |
| **P2** | Import feature-to-feature non approuvé · fuite de DTO · query boundary mal placée                                                 | **Avertit**           |

---

## 13. Quand s'arrêter et demander

- La source normative ne tranche pas
- La tâche touche un ownership `OPEN`
- La tâche exige de créer un fichier hors structure approuvée
- La tâche demande d'ouvrir un lot hors MVP-P
- Respecter le périmètre demandé obligerait à violer une règle de ce fichier

**Dans tous ces cas : s'arrêter, signaler, ne pas inventer.**
