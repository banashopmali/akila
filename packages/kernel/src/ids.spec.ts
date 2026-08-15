import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { newId, idFrom } from './ids.ts';
import { isOk, isErr } from './result.ts';

describe('identifiants techniques', () => {
  test('newId produit un UUID v4 valide et unique', () => {
    const a = newId<'tenant'>();
    const b = newId<'tenant'>();
    assert.notEqual(a, b);
    assert.equal(isOk(idFrom<'tenant'>(a)), true);
  });

  test('idFrom accepte un UUID v4 et rend la valeur normalisée', () => {
    const r = idFrom<'device'>('9F8E7D6C-5B4A-4321-8FED-CBA987654321');
    assert.equal(isOk(r), true);
    if (isOk(r)) {
      // Espaces retirés, minuscules imposées : une seule forme canonique en base.
      assert.equal(r.value, '9f8e7d6c-5b4a-4321-8fed-cba987654321');
    }
  });

  test('idFrom tolère les espaces autour — un CSV en apporte toujours', () => {
    assert.equal(isOk(idFrom<'tenant'>('  9f8e7d6c-5b4a-4321-8fed-cba987654321  ')), true);
  });

  test('idFrom refuse ce qui n’est pas un UUID v4', () => {
    const refuses = [
      '',
      '   ',
      'pas-un-uuid',
      '9f8e7d6c5b4a43218fedcba987654321', // sans tirets
      '9f8e7d6c-5b4a-1321-8fed-cba987654321', // version 1, pas 4
      '9f8e7d6c-5b4a-4321-7fed-cba987654321', // variante invalide
      '9f8e7d6c-5b4a-4321-8fed-cba98765432', // trop court
      '9f8e7d6c-5b4a-4321-8fed-cba9876543210', // trop long
    ];
    for (const brut of refuses) {
      assert.equal(isErr(idFrom<'tenant'>(brut)), true, `« ${brut} » doit être refusé`);
    }
  });

  test('le refus est permanent — rejouer la même chaîne ne changera rien', () => {
    const r = idFrom<'tenant'>('pas-un-uuid');
    assert.equal(isErr(r), true);
    if (isErr(r)) {
      assert.equal(r.error.failureClass, 'permanent');
      assert.equal(r.error.code, 'kernel.id.invalid');
    }
  });

  test('l’erreur ne recopie jamais la valeur reçue', () => {
    // Une frontière peut envoyer un jeton mal routé : il ne doit pas finir en log.
    const secretMalRoute = 'jeton-tres-sensible-arrive-par-erreur';
    const r = idFrom<'tenant'>(secretMalRoute);
    assert.equal(isErr(r), true);
    if (isErr(r)) {
      assert.equal(JSON.stringify(r.error).includes(secretMalRoute), false);
      assert.deepEqual(r.error.details, { longueur: secretMalRoute.length });
    }
  });
});
