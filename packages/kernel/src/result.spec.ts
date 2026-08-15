import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, isOk, isErr } from './result.ts';
import type { Result } from './result.ts';

describe('Result', () => {
  test('ok porte la valeur et se discrimine sur ok === true', () => {
    const r = ok(42);
    assert.equal(r.ok, true);
    assert.equal(r.value, 42);
  });

  test('err porte l’erreur et se discrimine sur ok === false', () => {
    const r = err('trop tard');
    assert.equal(r.ok, false);
    assert.equal(r.error, 'trop tard');
  });

  test('les gardes restreignent le type dans les deux sens', () => {
    const succes: Result<number, string> = ok(1);
    const echec: Result<number, string> = err('non');

    assert.equal(isOk(succes), true);
    assert.equal(isErr(succes), false);
    assert.equal(isOk(echec), false);
    assert.equal(isErr(echec), true);
  });

  test('une valeur falsy reste un succès — ok ne se déduit pas de la valeur', () => {
    // Le piège classique : traiter 0, '' ou false comme un échec.
    for (const valeur of [0, '', false, null, undefined]) {
      assert.equal(ok(valeur).ok, true, `${String(valeur)} doit rester un succès`);
    }
  });

  test('les deux formes sont sérialisables — elles traversent une frontière', () => {
    // Un Result peut voyager dans un job, une file ou un log structuré.
    assert.deepEqual(JSON.parse(JSON.stringify(ok({ n: 1 }))), { ok: true, value: { n: 1 } });
    assert.deepEqual(JSON.parse(JSON.stringify(err('x'))), { ok: false, error: 'x' });
  });
});
