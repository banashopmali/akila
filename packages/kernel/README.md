# packages/kernel — la limite, écrite avant le code

`packages/kernel` ne contient **que** ceci — CLAUDE.md §5 :

- identifiants techniques
- `Result` / `Error`
- abstractions de temps
- enveloppe d'événement (Event Envelope, 10 champs)
- contrat de pagination
- primitives d'observabilité

## Ce qui n'y entre jamais

`Student` · `School` · `Guardian` · `Attendance` · `Grade` · `Payment` · `Trip`

**Jamais.** Pas « pas encore » : jamais. Une entité métier partagée est le point
de départ du couplage entre domaines qu'AKILA refuse par construction.

La règle `ARC-004` échoue le pipeline sur la simple présence de ces identifiants,
y compris dérivés (`StudentId`, `AttendanceRepository`…).

> Ce dossier est **volontairement vide**. Il se remplit avec AKT-66 (Lot 1),
> une primitive à la fois, chacune justifiée par un besoin réel et présent.
