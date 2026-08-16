# REVIEW.md — la relecture à 4 niveaux

> **v1.0 — à valider par le Delivery Owner.** Le brouillon du 3 août est perdu ;
> ce document le reconstruit depuis la Constitution et depuis le dispositif en place.
> Les trois développeurs doivent l'avoir lu avant la première PR.

Les gates automatiques attrapent ce qui est mécanique. Elles n'attrapent pas le code
qui compile, passe les tests, respecte les règles — et résout le mauvais problème.
C'est ce que cette relecture cherche.

**Règle d'ordre : on ne monte pas d'un niveau tant que le précédent n'est pas propre.**
Discuter du nommage d'une fonction qui viole une frontière est du temps perdu.

---

## Niveau 1 — Conformité

_Le changement a-t-il le droit d'exister sous cette forme ?_ La CI répond en partie ;
le relecteur répond au reste.

- Le périmètre correspond-il à la tâche, sans débordement ? Un « tant que j'y étais »
  est un changement non demandé, donc non relu.
- Chaque fichier créé est-il inscrit au File Registry, dans **ce** commit ?
- Le chemin respecte-t-il la structure approuvée ? Aucun dossier inventé.
- Une dépendance a-t-elle été ajoutée ? Si oui, où est la justification écrite ?
- Le changement touche-t-il un ownership OUVERT (Timetable, StaffProfile) ? Alors il
  s'arrête ici.

## Niveau 2 — Correction

_Le code fait-il ce qu'il annonce, y compris quand tout va mal ?_

- Le cas nominal est-il testé, et les cas d'erreur aussi ? Un test qui ne peut pas
  échouer ne prouve rien — la même exigence que pour les règles d'architecture.
- Les frontières : zéro, vide, absent, très grand, doublon, arrivée hors ordre.
- Une opération rejouable est-elle idempotente ? Que se passe-t-il au second appel ?
- Les erreurs sont-elles classées selon les 3 classes (CLAUDE.md §8) ? Un `catch`
  qui avale est un défaut, pas un style.
- Le nom dit-il l'intention métier ? `data`, `manager`, `helper`, `temp` cachent
  presque toujours une responsabilité mal découpée.

## Niveau 3 — Frontières

_Le changement affaiblit-il une frontière que rien ne rétablira ensuite ?_ **C'est le
niveau le plus important, et le plus facile à sauter.**

- La direction des dépendances tient-elle ? `interfaces → application → domain ←
infrastructure`, jamais l'inverse.
- Un domaine touche-t-il un autre autrement que par contrat public ou événement ?
- Le tenant est-il propagé sur **chaque** nouveau chemin d'accès : requête, cache,
  export, événement, job ? L'absence d'isolation ne se voit pas en relisant le
  happy path.
- Une entité métier a-t-elle glissé dans `packages/` ?
- Un nom de fournisseur apparaît-il hors adaptateur ?
- Un contrat publié change-t-il de sémantique sans versionnement ?

## Niveau 4 — Exploitation

_Que se passe-t-il à 7h du matin dans une école, avec un réseau qui tombe ?_

- Un appel externe sans timeout explicite est un incident qui attend son jour.
- L'échec est-il observable ? Peut-on diagnostiquer sans reproduire ?
- Les logs contiennent-ils un secret, un token, un numéro de parent ?
- Le chemin critique fonctionne-t-il hors ligne, ou dégrade-t-il proprement ?
- L'opération est-elle auditée quand elle touche un fait métier ?

---

## Avant d'ouvrir une PR — l'auto-relecture

Relisez votre propre diff en entier. Vous y trouverez du code de debug, un fichier
arrivé par accident, un commentaire devenu faux. C'est normal ; c'est pour ça qu'on relit.

Puis lancez ceci sur votre diff :

```
Relis ce diff selon REVIEW.md, dans l'ordre des 4 niveaux.

Pour chaque constat : le niveau, le fichier:ligne, ce qui casse, et pourquoi
ça casse — pas seulement quoi changer.

Contraintes :
- Ne propose aucune amélioration hors du périmètre de la tâche.
- Si une gate est rouge, propose de corriger le code, jamais d'affaiblir la gate.
- Si tu ne peux pas vérifier une affirmation, dis-le au lieu de l'affirmer.
- Termine par les frontières que ce diff déplace, s'il en déplace.
```

La dernière question est celle qui compte. Un diff qui ne déplace aucune frontière
se relit vite. Un diff qui en déplace une mérite qu'on s'arrête.

## Sévérité des commentaires

| Étiquette      | Sens                                                  |
| -------------- | ----------------------------------------------------- |
| **bloquant**   | Ne peut pas être mergé ainsi. Nommez la règle violée. |
| **important**  | À corriger, mais ne bloque pas si c'est tracé.        |
| **suggestion** | Améliore le code. L'auteur décide.                    |
| **détail**     | Préférence personnelle. Assumée comme telle.          |

Un relecteur qui n'étiquette pas ses commentaires oblige l'auteur à deviner ce qui
est négociable. Distinguez une exigence normative d'une préférence — et dites laquelle.

## Ce que la relecture ne fait pas

Elle ne discute pas de formatage : Prettier a déjà tranché. Elle n'approuve pas son
propre code. Et elle ne remplace pas les gates — **une PR verte reste relue, une PR
rouge ne se relit pas encore.**
