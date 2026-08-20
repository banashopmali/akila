import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { pageRequest, LIMITE_PAR_DEFAUT, LIMITE_MAX } from './pagination.ts';
import { isOk, isErr } from './result.ts';

describe('pagination', () => {
  test('sans argument, la limite par défaut s’applique et aucun curseur n’est posé', () => {
    const r = pageRequest();
    assert.equal(isOk(r), true);
    if (isOk(r)) {
      assert.equal(r.value.limit, LIMITE_PAR_DEFAUT);
      assert.equal('cursor' in r.value, false);
    }
  });

  test('le plafond vaut 200 — valeur protectrice, pas réglage', () => {
    // Les autres tests bornent avec LIMITE_MAX + 1 : une borne RELATIVE, qui
    // se déplace avec la constante. Porter le plafond à 10 000 les laissait
    // tous verts, et la protection anti-déni de service disparaissait sans
    // qu'aucune gate ne bronche. Seul un littéral verrouille la valeur.
    assert.equal(LIMITE_MAX, 200);
    assert.equal(isErr(pageRequest(201)), true);
    assert.equal(isOk(pageRequest(200)), true);
  });

  test('les bornes 1 et LIMITE_MAX sont acceptées', () => {
    assert.equal(isOk(pageRequest(1)), true);
    assert.equal(isOk(pageRequest(LIMITE_MAX)), true);
  });

  test('une limite hors bornes est refusée', () => {
    for (const limite of [0, -1, LIMITE_MAX + 1, 1_000_000]) {
      assert.equal(isErr(pageRequest(limite)), true, `${limite} doit être refusé`);
    }
  });

  test('une limite non entière est refusée', () => {
    for (const limite of [1.5, NaN, Infinity]) {
      assert.equal(isErr(pageRequest(limite)), true, `${String(limite)} doit être refusé`);
    }
  });

  test('un curseur vide est refusé, pas confondu avec l’absence de curseur', () => {
    // Le confondre repartirait du début et rejouerait toute la liste en silence.
    assert.equal(isErr(pageRequest(10, '')), true);
    assert.equal(isErr(pageRequest(10, '   ')), true);
    assert.equal(isOk(pageRequest(10)), true);
  });

  test('un curseur est conservé octet pour octet — aucune normalisation', () => {
    // Sentinelle choisie pour détecter toute transformation silencieuse : espaces
    // aux deux bouts, casse mixte, accents, symboles. Avec une valeur « propre »,
    // une implémentation qui ferait cursor.trim() passerait le test sans qu'on
    // le voie — et un curseur amputé désigne une autre position dans la liste.
    const sentinelle = '  eyJvZmZzZXQiOjQyfQ==  Éé/+ \t ';
    const r = pageRequest(10, sentinelle);

    assert.equal(isOk(r), true);
    if (isOk(r)) {
      assert.equal(r.value.cursor, sentinelle);
      assert.equal(r.value.cursor?.length, sentinelle.length);
    }
  });

  test('le refus est permanent — la même demande échouera identiquement', () => {
    const r = pageRequest(LIMITE_MAX + 1);
    assert.equal(isErr(r), true);
    if (isErr(r)) {
      assert.equal(r.error.failureClass, 'permanent');
      assert.deepEqual(r.error.details, { recu: LIMITE_MAX + 1, max: LIMITE_MAX });
    }
  });
});
