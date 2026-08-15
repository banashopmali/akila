import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { pageRequest, lastPage, LIMITE_PAR_DEFAUT, LIMITE_MAX } from './pagination.ts';
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

  test('un curseur non vide est conservé tel quel — il est opaque', () => {
    const r = pageRequest(10, 'eyJvZmZzZXQiOjQyfQ==');
    assert.equal(isOk(r), true);
    if (isOk(r)) assert.equal(r.value.cursor, 'eyJvZmZzZXQiOjQyfQ==');
  });

  test('le refus est permanent — la même demande échouera identiquement', () => {
    const r = pageRequest(LIMITE_MAX + 1);
    assert.equal(isErr(r), true);
    if (isErr(r)) {
      assert.equal(r.error.failureClass, 'permanent');
      assert.deepEqual(r.error.details, { recu: LIMITE_MAX + 1, max: LIMITE_MAX });
    }
  });

  test('lastPage ne porte pas de nextCursor — c’est le signal de fin', () => {
    const page = lastPage([1, 2, 3]);
    assert.deepEqual(page.items, [1, 2, 3]);
    assert.equal('nextCursor' in page, false);
  });

  test('une page vide reste une page terminale valide', () => {
    assert.deepEqual(lastPage([]).items, []);
  });
});
