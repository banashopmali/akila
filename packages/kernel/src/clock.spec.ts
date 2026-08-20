import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { systemClock, fixedClock } from './clock.ts';

describe('horloge', () => {
  test('fixedClock rend toujours le même instant', () => {
    const horloge = fixedClock(new Date('2026-09-01T07:30:00.000Z'));
    assert.equal(horloge.now().toISOString(), '2026-09-01T07:30:00.000Z');
    assert.equal(horloge.now().toISOString(), '2026-09-01T07:30:00.000Z');
  });

  test('muter la Date rendue ne décale pas l’horloge', () => {
    // Date est muable : sans recopie, un appelant décalerait l’horloge des autres.
    const horloge = fixedClock(new Date('2026-09-01T07:30:00.000Z'));
    horloge.now().setUTCFullYear(1999);
    assert.equal(horloge.now().toISOString(), '2026-09-01T07:30:00.000Z');
  });

  test('muter la Date source après construction ne décale pas l’horloge', () => {
    const source = new Date('2026-09-01T07:30:00.000Z');
    const horloge = fixedClock(source);
    source.setUTCFullYear(1999);
    assert.equal(horloge.now().toISOString(), '2026-09-01T07:30:00.000Z');
  });

  test('systemClock avance et rend une Date valide', () => {
    const avant = Date.now();
    const lu = systemClock.now();
    const apres = Date.now();
    assert.ok(lu instanceof Date);
    assert.ok(lu.getTime() >= avant && lu.getTime() <= apres);
  });

  test('systemClock ne partage pas la Date qu’elle rend', () => {
    const a = systemClock.now();
    const b = systemClock.now();
    assert.notEqual(a, b);
  });
});
