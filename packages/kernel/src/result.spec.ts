import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { ok, err, isOk, isErr } from './result.ts';
import type { Result } from './result.ts';

/*
 * Preuve à la COMPILATION — le narrowing et le refus de `null`.
 *
 * Les assertions d'exécution plus bas vérifient que isOk/isErr renvoient les bons
 * booléens. Elles passeraient encore si ces fonctions renvoyaient un simple
 * `boolean` sans restreindre le type : le narrowing, lui, n'existe qu'à la
 * compilation. Sans ce bloc, la propriété annoncée n'est prouvée nulle part.
 *
 * `@ts-expect-error` échoue le typecheck quand l'erreur attendue n'a PAS lieu :
 * la gate 3 tombe si le narrowing disparaît, et si `err` cesse de refuser `null`.
 */
function accede(_valeur: unknown): void {}

function preuveDeNarrowing(r: Result<number, string>): void {
  // @ts-expect-error — avant toute garde, value n'est pas accessible
  accede(r.value);

  if (isOk(r)) {
    accede(r.value satisfies number);
    // @ts-expect-error — dans la branche Ok, error n'existe pas
    accede(r.error);
  } else {
    accede(r.error satisfies string);
    // @ts-expect-error — dans la branche Err, value n'existe pas
    accede(r.value);
  }

  if (isErr(r)) {
    accede(r.error satisfies string);
  }
}
preuveDeNarrowing(ok(1));

// @ts-expect-error — un échec sans raison n'est pas un échec exploitable
err(null);
// @ts-expect-error — idem pour undefined
err(undefined);

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

  test('l’enveloppe n’altère pas un contenu déjà sérialisable', () => {
    // Portée exacte de ce test : `Result` n'ajoute ni ne perd rien autour de ce
    // qu'on lui confie. Il ne dit RIEN de la sérialisabilité de T ou de E — un
    // BigInt, un cycle ou un Error passés en value resteraient problématiques,
    // et c'est la responsabilité de l'appelant, pas de l'enveloppe.
    assert.deepEqual(JSON.parse(JSON.stringify(ok({ n: 1 }))), { ok: true, value: { n: 1 } });
    assert.deepEqual(JSON.parse(JSON.stringify(err('x'))), { ok: false, error: 'x' });
  });
});
