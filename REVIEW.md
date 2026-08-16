# REVIEW.md — Comment on se relit chez AKILA

> Trois développeurs rapides, assistés par IA, sans le temps de tout relire.
> Ce fichier est le compromis : **la machine relit tout, l'humain relit ce qui est irréversible.**

---

## Les 4 niveaux de relecture

| Niveau                         | Qui          | Quand                                       | Bloque le merge ?              |
| ------------------------------ | ------------ | ------------------------------------------- | ------------------------------ |
| **1. CI**                      | La machine   | À chaque push                               | **Oui**                        |
| **2. Auto-relecture IA**       | L'auteur     | Avant d'ouvrir la PR                        | Non, mais obligatoire          |
| **3. Revue croisée**           | Un autre dev | Uniquement sur les changements de frontière | **Oui**                        |
| **4. Relecteur de la semaine** | Rotation     | Vendredi, 30 min, **après** les merges      | Non — il signale des tendances |

**Règle de latence :** si la CI est verte et que le changement n'est pas de frontière, on merge. On n'attend personne.

---

## Niveau 2 — Le prompt d'auto-relecture

À lancer sur son propre diff **avant** d'ouvrir la PR. Copier tel quel.

```
Relis ce diff comme un relecteur hostile. Ton but est de trouver ce qui est
cassé, pas de me rassurer. Ne commente pas le style.

Contexte : projet AKILA, modular monolith TypeScript/NestJS, multi-tenant,
offline-first. Les règles sont dans CLAUDE.md à la racine — lis-le d'abord.

Vérifie dans cet ordre, et pour chaque point réponds VIOLATION ou OK :

BLOQUANT (P0)
1. Une requête ou une écriture qui ne porte pas de tenantId
2. Un import de domain/ vers infrastructure/ ou interfaces/
3. Un accès direct à la base depuis le front
4. Un secret, une clé ou un token côté frontend ou en dur dans le code
5. Un SDK fournisseur importé ailleurs que dans un adaptateur

BLOQUANT (P1)
6. Une entité métier ajoutée dans packages/
7. Un domaine qui appelle le repository ou les tables d'un autre domaine
8. Un contrat public modifié sans version
9. Un handler d'événement non idempotent
10. Un last-write-wins silencieux sur un agrégat critique

QUALITÉ
11. Un catch qui avale l'erreur sans la classer TRANSIENT / PERMANENT / UNKNOWN
12. Une valeur en dur qui devrait venir de la configuration
13. Du code mort, ou une abstraction créée « au cas où »
14. Un dossier ou un fichier absent de la structure approuvée

TESTS — le point le plus important
15. Les tests testent-ils le COMPORTEMENT ou l'IMPLÉMENTATION ?
16. Existe-t-il un test qui échouerait si la logique était fausse ?
    Si tous les tests passeraient encore avec une implémentation naïve,
    ils ne prouvent rien.
17. Le cas d'erreur est-il testé, ou seulement le chemin heureux ?

Termine par : VERDICT MERGE / VERDICT BLOQUÉ, et la liste des violations.
Si tu n'es pas sûr, dis BLOQUÉ. Ne sois pas complaisant.
```

---

## Niveau 3 — Ce qui exige une revue humaine croisée

**Seulement ces cinq cas.** Partout ailleurs, CI verte = merge.

1. Un **contrat public** créé ou modifié
2. Un changement dans **`packages/kernel`** ou dans l'**Event Envelope**
3. Un **ownership de domaine** qui bouge
4. Une **règle de dépendance** ou un test d'architecture modifié
5. Tout ce qui touche la **sécurité** ou un **standard de fiabilité** (Outbox, idempotence, classes d'échec)

> Ces cinq cas ont un point commun : **ils sont difficiles à défaire une fois mergés.**
> Le reste se corrige en une PR, donc ne mérite pas d'attendre un humain.

---

## Niveau 4 — Le relecteur de la semaine

Chaque semaine, une personne différente. **Trente minutes le vendredi, avant la démo.**

Il lit **tous les commits mergés de la semaine** — pas pour bloquer, c'est déjà mergé — mais pour répondre à trois questions :

1. Est-ce que quelqu'un a pris une habitude qu'on ne veut pas ?
2. Est-ce qu'un test a été affaibli, contourné ou supprimé ?
3. Est-ce que je comprendrais ce code si son auteur disparaissait demain ?

Ce qu'il trouve devient une ligne dans le journal de décisions, ou une règle de plus dans la CI. **Jamais un reproche.**

> Ce niveau existe pour deux raisons : il fait lire à chacun le code des deux autres (bus factor), et il rattrape la dérive de style — sans jamais ajouter de latence au merge.

---

## Les pièges propres au code généré par IA

Ce sont les défauts que la CI ne voit pas et qu'un relecteur pressé laisse passer.

| Piège                                           | Comment il se présente                                          | Le réflexe                                                               |
| ----------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Test tautologique**                           | Le test rejoue la logique de l'implémentation                   | Casser volontairement la logique : si le test passe encore, il est faux  |
| **Test écrit dans la même passe que le code**   | Tout est vert, par construction                                 | Faire écrire les critères d'acceptation **avant**, par quelqu'un d'autre |
| **Abstraction spéculative**                     | Une interface avec une seule implémentation, « pour plus tard » | Supprimer. On l'ajoutera au deuxième cas d'usage réel                    |
| **Gestion d'erreur optimiste**                  | Le chemin heureux est parfait, l'échec est un `catch` vide      | Exiger les trois classes TRANSIENT / PERMANENT / UNKNOWN                 |
| **Motif importé d'un autre écosystème**         | Du code élégant qui viole une règle AKILA                       | C'est exactement ce que les tests d'architecture attrapent               |
| **`tenantId` oublié dans un chemin secondaire** | Le cas principal est correct, un cas limite ne l'est pas        | Le test d'isolation doit couvrir chaque nouvelle requête                 |
| **Volume plausible**                            | 400 lignes propres là où 80 suffisaient                         | Demander : quelle ligne saute si je retire cette exigence ?              |

---

## La règle qui vaut toutes les autres

> **Celui qui écrit les critères d'acceptation ne devrait pas être celui qui implémente.**

C'est vrai pour un humain et **doublement vrai pour du code généré**. Un modèle à qui l'on demande le code _et_ sa preuve produira les deux en accord parfait, y compris quand les deux sont faux.

Comme nous sommes trois, c'est gratuit : **un dev valide les critères d'acceptation d'un autre avant qu'il commence.** Cinq minutes, avant. Pas trente minutes de relecture, après.

---

## Ce qu'on ne relit pas

Pour que la relecture reste tenable, il faut assumer ce qu'on laisse passer :

- Le formatage — c'est le travail de prettier
- Les préférences de nommage, tant que c'est lisible
- Le choix entre deux façons également correctes de faire
- La performance, tant qu'aucun seuil mesuré n'est dépassé

**Une remarque de relecture qui ne correspond à aucune règle écrite est une préférence personnelle.**
Si elle compte vraiment : elle devient une règle dans `CLAUDE.md` ou un test dans la CI. Sinon, on la laisse tomber.
