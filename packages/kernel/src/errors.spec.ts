import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { transient, permanent, unknown, isRetryable } from './errors.ts';
import type { FailureClass } from './errors.ts';

describe('modèle d’erreurs', () => {
  test('chaque fabrique pose sa classe d’échec', () => {
    assert.equal(transient('net.timeout', 'délai dépassé').failureClass, 'transient');
    assert.equal(permanent('auth.forbidden', 'accès refusé').failureClass, 'permanent');
    assert.equal(unknown('sms.unclear', 'réponse illisible').failureClass, 'unknown');
  });

  test('seul transient est rejouable — unknown ne l’est pas', () => {
    assert.equal(isRetryable(transient('net.timeout', 'x')), true);
    assert.equal(isRetryable(permanent('auth.forbidden', 'x')), false);

    // Le cœur de la règle : rejouer une opération dont on ignore l’issue crée
    // le doublon qu’on cherche à éviter. CLAUDE.md §7.
    assert.equal(isRetryable(unknown('sms.unclear', 'x')), false);
  });

  test('les champs optionnels restent absents quand ils ne sont pas fournis', () => {
    const e = permanent('code', 'message');
    assert.equal('details' in e, false);
    assert.equal('cause' in e, false);
  });

  test('details et cause sont conservés pour le diagnostic', () => {
    const origine = new Error('socket fermée');
    const e = transient('net.reset', 'connexion coupée', {
      details: { tentative: 3 },
      cause: origine,
    });
    assert.deepEqual(e.details, { tentative: 3 });
    assert.equal(e.cause, origine);
  });

  test('une erreur sans cause traverse JSON sans rien perdre', () => {
    // Elle doit pouvoir vivre dans un log structuré ou une file.
    const e = permanent('domain.invalid', 'refusé', { details: { champ: 'limite' } });
    assert.deepEqual(JSON.parse(JSON.stringify(e)), {
      code: 'domain.invalid',
      message: 'refusé',
      failureClass: 'permanent',
      details: { champ: 'limite' },
    });
  });

  test('les trois classes sont exhaustives — le compilateur le vérifie', () => {
    // Ajouter une quatrième classe sans traiter ce switch casse le typecheck.
    const decision = (c: FailureClass): string => {
      switch (c) {
        case 'transient':
          return 'rejouer';
        case 'permanent':
          return 'échouer';
        case 'unknown':
          return 'réconcilier';
      }
    };
    assert.equal(decision('transient'), 'rejouer');
    assert.equal(decision('permanent'), 'échouer');
    assert.equal(decision('unknown'), 'réconcilier');
  });
});
