# DECISIONS.md — journal des décisions

> Une ligne par décision qui engage l'équipe et que le code seul n'explique pas.
> Ce journal est **provisoire** : il tient jusqu'à l'ouverture du registre d'ADR
> (AKT-4). Les décisions structurantes y migreront alors, sans être réécrites.
>
> `REVIEW.md` niveau 4 y renvoie : ce que le relecteur de la semaine trouve devient
> une ligne ici, ou une règle de plus dans la CI.

**À lire avant de contribuer, humain ou assistant IA.** Une décision consignée ici
explique pourquoi le dépôt est dans l'état où vous le trouvez. L'ignorer conduit à
« corriger » ce qui a été choisi.

---

## 2026-08-16 · Restauration de `CLAUDE.md` et `REVIEW.md` dans leur version du 3 août

**Décidé par :** I · **Portée :** les deux documents normatifs de la racine

Les brouillons du 3 août étaient réputés perdus. Le 13 août, faute de source, ils
ont été **reconstruits** depuis la Constitution et depuis les renvois que le code
contenait déjà. Cette reconstruction a été mergée dans `main` par la PR #2.

Les originaux ont été retrouvés le 16 août. La reconstruction est remplacée par eux.

**Ce que la reconstruction avait faux** — à savoir, parce que ces versions ont
circulé trois jours :

- **Cinq des onze interdictions.** Les 4, 5, 7, 8 et 9 authentiques sont : repository
  interne d'un autre domaine · tables privées d'un autre domaine · Reporting qui mute
  ses sources · Inspector qui touche la base d'une école · AI qui écrit directement.
  La reconstruction y avait placé des règles de lint et de tenant. Les interdictions
  1, 2, 3, 6, 10 et 11 étaient correctes — ce sont celles que le code citait déjà.
- **L'Event Envelope.** Ses 10 champs étaient fixés depuis le 3 août
  (`CLAUDE.md §8`). La reconstruction les déclarait indécidés et interdisait de les
  inventer. La prudence était juste ; la prémisse était fausse.
- **La numérotation des sections.** Les 3 classes d'échec sont en **§7**
  (Fiabilité), pas en §8. Tout renvoi à « `CLAUDE.md §8` » pour les classes d'échec
  est à corriger.

**Ce que la reconstruction avait bon**, et qui n'est pas perdu : les défauts qu'elle
a fait apparaître restent vrais — la faille de l'Evidence Pack sur les jobs annulés,
l'absence de contrat d'écran pour l'import CSV, et le fait que la gate 8 ne surveille
pas les documents de la racine.

**Leçon retenue.** Un document reconstruit de bonne foi, signalé comme tel et marqué
`À VALIDER` aux endroits incertains, reste faux là où personne ne pensait à douter.
La reconstruction ne remplace pas la source : elle tient jusqu'à ce que la source
revienne, et pas au-delà.

---

## 2026-08-16 · PR #2 mergée sans revue croisée, par une seule personne

**Décidé par :** I · **Portée :** `CLAUDE.md`, `REVIEW.md`, correctif Evidence Pack

La PR #2 a été mergée par I seul, sans attendre la lecture de N et A, pour ne pas
bloquer la suite. C'est une **décision assumée, pas un oubli**.

**Pourquoi c'était défendable.** Les 9 checks étaient verts. Le contenu était
documentaire, et ses deux points incertains étaient marqués `À VALIDER` dans le
fichier lui-même — visibles de quiconque l'ouvrait. Le correctif de l'Evidence Pack,
lui, refermait une faille par laquelle un run annulé produisait un verdict favorable.

**Pourquoi ce n'est pas un précédent.** `REVIEW.md` niveau 3 énumère cinq cas qui
exigent une revue humaine croisée, et ces cinq cas ont un point commun : ils sont
difficiles à défaire une fois mergés. Modifier les règles de dépendance en fait
partie. La règle de latence — CI verte plus changement hors frontière égale merge
immédiat — ne couvrait donc pas tout à fait cette PR.

**Ce que ça coûte, concrètement.** Trois jours durant, `main` a porté cinq
interdictions fausses comme source de vérité, lues par l'équipe et par les
assistants IA. Aucun code ne s'y est appuyé, l'erreur n'a donc rien cassé — mais
c'est de la chance, pas de la méthode. Une revue croisée par quelqu'un connaissant
la liste d'origine l'aurait vue en trente secondes.

**Ce qu'on en fait.** Rien de rétroactif. Pour la suite, les cinq cas du niveau 3
gardent leur revue croisée, et `packages/kernel` en fait partie — ce qui vise
directement le travail AKT-66 en cours.

---

## 2026-08-16 · Configuration, Outbox et Inbox hors de `packages/kernel`

**Décidé par :** I · **Portée :** périmètre d'AKT-66

`CLAUDE.md §5` énumère ce que `packages/` contient et dit **« que »**. La
configuration n'y figure pas ; l'Outbox et l'Inbox non plus. Or AKT-66 les inscrit
tous trois à son périmètre.

Ils sont donc **reportés** plutôt que glissés dans le kernel : les y mettre
élargirait le Shared Kernel en silence, ce que la politique existe pour empêcher.
Aucun n'est bloquant aujourd'hui.

Reste à décider où ils logent. Aucun paquet d'infrastructure partagé n'existe, et
en créer un est une décision de structure — donc un ADR, pas un choix
d'implémentation.
