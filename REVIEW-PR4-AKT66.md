# Revue croisée hostile — PR #4 · `feat/akt-66-kernel` · commit `2793447`

> Revue Niveau 3 (REVIEW.md) — contrat noyau `packages/kernel` + standard de sécurité.
> Objectif : trouver ce qui est cassé, pas rassurer. Chaque affirmation est appuyée par
> une commande réellement exécutée. Statut final : **VERDICT BLOQUÉ**.

---

## 0. Vérification du commit (Règle Zéro)

`git log --oneline -1` initial sur `main` → `78bb077`. Le commit `2793447` **n'existait pas**
au premier `git cat-file -t 2793447` (branche non fetchée, « Not a valid object name »).

Après `git fetch origin feat/akt-66-kernel`, la branche a été **force-pushée** :
`4bd7d79...2793447`. Commit vérifié :

```
2793447 fix(kernel): le logger laissait fuir les noms de champs composés
```

⚠️ Le titre prouve que la fuite était **déjà connue** et partiellement corrigée — ce qui rend
la conclusion « MERGE » de la revue précédente d'autant plus injustifiable.

---

## 1. Gates — `pnpm verify` (exécuté, sortie réelle)

Format ✔ · Lint ✔ · Typecheck ✔ · **Tests 65 pass / 0 fail** · `scan:secrets` ✔ (« rien trouvé »)
· `check:registry` ✔ (« 18 fichier(s) suivi(s) »).

Décomposition par fichier spec (kernel) :

| fichier              | tests  |
| -------------------- | ------ |
| `clock.spec.ts`      | 5      |
| `errors.spec.ts`     | 6      |
| `ids.spec.ts`        | 6      |
| `logger.spec.ts`     | **20** |
| `pagination.spec.ts` | 7      |
| `result.spec.ts`     | 5      |
| **total kernel**     | **49** |

(16 sous-tests restants = moteur de tests d'architecture.)

`node --test packages/kernel/src/logger.spec.ts` → 20/20 vert.

---

## 2. Tests de mutation (REVIEW.md point 16)

Chaque mutation a été **appliquée**, la gate relancée, puis **annulée** (`git status` propre
après la dernière annulation).

| #   | Mutation                                                      | Gate             | Résultat          | Preuve                                                                   |
| --- | ------------------------------------------------------------- | ---------------- | ----------------- | ------------------------------------------------------------------------ |
| 1   | `ids.ts` : `Id<T> = string & {...}` → `Id<T> = string`        | `pnpm typecheck` | **ROUGE**         | `ids.spec.ts(22,1): error TS2578: Unused '@ts-expect-error'` + `TS6133`  |
| 2   | `errors.ts` : `isRetryable` → `true` pour `'unknown'`         | `pnpm test:unit` | **ROUGE**         | `✖ seul transient est rejouable — unknown ne l’est pas` (AssertionError) |
| 3   | `ids.ts` : retirer `.trim().toLowerCase()` dans `idFrom`      | `pnpm test:unit` | **ROUGE**         | 2 fail : « rend la valeur normalisée » + « tolère les espaces autour »   |
| 4   | `pagination.ts` : `LIMITE_MAX` → 10000                        | `pnpm test:unit` | **VERT (0 fail)** | ⚠️ **VIOLATION** — voir §4                                               |
| 5   | `clock.ts` : `fixedClock` renvoie la `Date` reçue             | `pnpm test:unit` | **ROUGE**         | 2 fail : « muter la Date rendue… » + « muter la Date source… »           |
| 6   | `logger.ts` : retirer la garde de cycle `chemin.has(valeur)`  | `pnpm test:unit` | **ROUGE**         | 2 fail : structure circulaire + cycle imbriqué                           |
| 7   | `logger.ts` : `estInterdit` → `false`                         | `pnpm test:unit` | **ROUGE**         | 5 fail (tous les masquages)                                              |
| 8   | `logger.ts` : retirer la branche `typeof valeur === 'bigint'` | `pnpm test:unit` | **ROUGE**         | `✖ un BigInt ne fait pas lever la sérialisation`                         |

**VIOLATION mutation 4** : porter le plafond de pagination à 10000 (voire 999999) ne casse
**aucun** test. Le spec ne teste que `LIMITE_MAX + 1` et `1_000_000`, tous deux encore refusés.
La valeur protectrice **réelle** (`200`, anti-DoS, §pagination) n'est **pas prouvée** — un
relecteur peut la monter sans rien voir au rouge. C'est exactement le test tautologique décrit
au point 16 de REVIEW.md.

---

## 3. Attaque du logger (Étape 3 — exécutée)

Script jetable (`attack-logger.ts`) journalisant un objet à noms de champs **réalistes**.
Sortie JSON réelle (extrait) :

```json
{
  "passwd": "rootpw123",
  "pwd": "s3cret-pwd",
  "jwt": "<JWT complet, 85 caractères — tronqué : voir note ci-dessous>",
  "auth": "Bearer xyz",
  "bearerToken": "[secret]",
  "x-api-key": "[secret]",
  "clientSecret": "[secret]",
  "sessionToken": "[secret]",
  "signature": "sig-abcdef0123456789",
  "hmac": "hmac-sha256-value",
  "salt": "saltpepper123",
  "telephoneParent": "+22376123456",
  "phoneNumber": "+22376123456",
  "numeroTuteur": "+22376123999",
  "request": {
    "headers": { "authorization": "[secret]", "x-api-key": "[secret]", "cookie": "[secret]" },
    "body": { "ok": true }
  },
  "attempts": [{ "otp": "[secret]" }, { "resetToken": "[secret]" }],
  "l1": { "l2": { "l3": { "l4": { "l5": { "privateKey": "[secret]" } } } } }
}
```

> **Note ajoutée le 20 août — la valeur du JWT a été tronquée.** Telle quelle, la
> ligne faisait échouer la gate 7 : `[P0] JWT — REVIEW-PR4-AKT66.md:82`, merge
> impossible. C'était le jeton d'exemple public de `jwt.io`, pas un secret réel,
> mais le scanner ne peut pas faire la différence — et il a raison de ne pas la
> faire. Corriger le contenu plutôt que la gate, conformément à `CLAUDE.md`.
>
> Le point mérite d'être noté : une revue qui démontre une fuite en recopiant la
> valeur fuitée reproduit exactement le geste qu'elle dénonce. La gate l'a vu.

### Champs QUI FUITENT en clair

| champ             | valeur vue             | gravité                                                 |
| ----------------- | ---------------------- | ------------------------------------------------------- |
| `jwt`             | JWT complet            | **critique** — token porteur                            |
| `auth`            | `Bearer xyz`           | **critique** — token porteur dans un champ nommé `auth` |
| `passwd`          | `rootpw123`            | mot de passe                                            |
| `pwd`             | `s3cret-pwd`           | mot de passe                                            |
| `signature`       | `sig-abcdef0123456789` | HMAC / signature                                        |
| `hmac`            | `hmac-sha256-value`    | secret de hachage                                       |
| `salt`            | `saltpepper123`        | sel de hachage                                          |
| `telephoneParent` | `+22376123456`         | donnée personnelle                                      |
| `phoneNumber`     | `+22376123456`         | donnée personnelle                                      |
| `numeroTuteur`    | `+22376123999`         | donnée personnelle                                      |

### Champs correctement masqués

`bearerToken`, `x-api-key`, `clientSecret`, `sessionToken`, `authorization`/`cookie` imbriqués,
`otp`/`resetToken` en tableau, `privateKey` à 5 niveaux.

### Conclusion de l'attaque

La revue précédente a écrit « les secrets ne sortent jamais, quel que soit le chemin ».
**Faux.** La liste `TERMES_INTERDITS` (`logger.ts:55`) est curée et **incomplète** :
`jwt`, `auth`, `signature`, `hmac`, `salt`, `passwd`, `pwd` en sont absents. Un JWT complet et
un `Bearer` brut sortent en clair. C'est précisément ce que la revue Niveau 3 était censée
attraper — CLAUDE.md §5 : « un défaut ici se propage partout et se défait mal ».

### Jugement — numéro de téléphone de parent (décision, pas constat)

**À masquer.** C'est une donnée personnelle (Constitution §24, protection des données ; §26,
logs sans données sensibles). Mon avis : le logger doit le masquer par défaut.

**C'est une décision à trancher par ADR, pas un constat :** la fonction SMS a légitimement
besoin du numéro, et masquer tous les numéros réduit le diagnostique. Le comportement ne doit
pas dépendre du hasard de la liste de termes interdits.

⚠️ **Gap** : la Constitution n'est **pas** présente dans le dépôt (seulement citée en commentaire
dans `logger.ts:6` et `ids.ts:62`). Impossible de citer le texte exact de §24/§26 — à signaler.

---

## 4. Grille REVIEW.md (4 niveaux, racine)

- **Niveau 1 — CI** : OK. `pnpm verify` vert (65 tests, scan propre, registry ok).
- **Niveau 2 — auto-revue** : partiellement OK. La mutation 4 révèle un test non prouvant
  (point 16).
- **Niveau 3 — cross-review (OBLIGATOIRE ici)** : ce diff touche `packages/kernel` **et** un
  standard de sécurité → revue humaine requise. La fuite de secrets (§3) est précisément ce
  qui a été manqué. **Bloquant.**
- **Niveau 4 — relecteur de la semaine** : N/A (on bloque avant merge).

### Violations par sévérité

**P1 — bloque la release**

- Fuite de secrets dans `packages/kernel/src/logger.ts` : `jwt`, `auth` (Bearer), `passwd`,
  `pwd`, `signature`, `hmac`, `salt` sortent en clair. Violation Constitution §26 /
  interdiction 11 (logs sans secrets/tokens/OTP en clair). Contrat dont **tous** les domaines
  dépendront (Niveau 3) → propagation garantie.

**P2 — avertit**

- (a) Cap `LIMITE_MAX = 200` non prouvé (mutation 4) — l'anti-DoS ne tient que par une valeur
  non testée.
- (b) Numéros de téléphone parent (`telephoneParent` / `phoneNumber` / `numeroTuteur`) non
  masqués — décision §24/§26 en attente.
- (c) Liste `TERMES_INTERDITS` non exhaustive et non couverte par des tests de noms courts
  réalistes (`jwt`, `auth`, `signature`, `hmac`, `salt`, `passwd`, `pwd`).

**P0 — aucune** dans ce diff : pas de franchissement cross-tenant, pas de `Domain`→infra,
pas de secret en frontend.

---

## 5. VERDICT

# VERDICT BLOQUÉ

Le pipeline est vert, mais la revue précédente a conclu **MERGE** sur une base fausse
(« aucun secret ne sort »). L'attaque prouve que des secrets réels (`jwt`, `Bearer` dans `auth`,
mots de passe, signatures, hmac, salt) fuient encore, et le plafond anti-DoS n'est pas prouvé
par les tests.

**Actions avant merge (bloquantes) :**

1. `logger.ts` : ajouter `jwt`, `auth`, `signature`, `hmac`, `salt`, `passwd`, `pwd` (et
   variants) à `TERMES_INTERDITS` ; ajouter des tests de **noms courts réalistes** (pas
   seulement les noms composés déjà corrigés).
2. `pagination.ts` : ajouter un test qui échoue si `LIMITE_MAX` dépasse une borne de sécurité
   (ex. refuser `> 200` explicitement, pas seulement `> LIMITE_MAX`).
3. Tr ancher par ADR le masquage des numéros de téléphone parent (§24/§26).
4. Publier / référencer la Constitution (§24/§26 introuvables dans le dépôt).

---

_Revue générée le 2026-08-20. Toutes les commandes (verify, 8 mutations, script d'attaque)
ont été exécutées sur le commit `2793447`. Aucune mutation n'a été laissée en place
(`git status` propre)._
