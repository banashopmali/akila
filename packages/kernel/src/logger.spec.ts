import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { jsonLogger, silentLogger } from './logger.ts';
import { fixedClock } from './clock.ts';

const INSTANT = new Date('2026-09-01T07:30:00.000Z');

function capture(minLevel?: 'debug' | 'info' | 'warn' | 'error') {
  const lignes: string[] = [];
  const logger = jsonLogger((l) => lignes.push(l), {
    clock: fixedClock(INSTANT),
    ...(minLevel === undefined ? {} : { minLevel }),
  });
  return { logger, lignes, json: () => lignes.map((l) => JSON.parse(l)) };
}

describe('journalisation structurée', () => {
  test('une ligne est du JSON valide et porte time, level et message', () => {
    const { logger, json } = capture();
    logger.info('élève arrivé', { classe: '6e A' });

    assert.deepEqual(json()[0], {
      time: '2026-09-01T07:30:00.000Z',
      level: 'info',
      message: 'élève arrivé',
      classe: '6e A',
    });
  });

  test('une ligne ne contient jamais de saut de ligne — un événement, une ligne', () => {
    const { logger, lignes } = capture();
    logger.error('message\navec\nsauts', { note: 'a\nb' });
    assert.equal(lignes[0]?.includes('\n'), false);
  });

  test('le seuil filtre ce qui est en dessous', () => {
    const { logger, lignes } = capture('warn');
    logger.debug('ignoré');
    logger.info('ignoré');
    logger.warn('retenu');
    logger.error('retenu');
    assert.equal(lignes.length, 2);
  });

  test('le seuil par défaut est info — debug ne sort pas', () => {
    const { logger, lignes } = capture();
    logger.debug('ignoré');
    logger.info('retenu');
    assert.equal(lignes.length, 1);
  });

  test('un champ sensible est masqué, quelle que soit son écriture', () => {
    const { logger, json } = capture();
    logger.info('connexion', {
      token: 'abc123',
      API_KEY: 'placeholder',
      'refresh-token': 'r-secret',
      motDePasse: 'hunter2',
      utilisateur: 'admin@ecole.ml',
    });

    const ligne = json()[0];
    assert.equal(ligne.token, '[secret]');
    assert.equal(ligne.API_KEY, '[secret]');
    assert.equal(ligne['refresh-token'], '[secret]');
    assert.equal(ligne.motDePasse, '[secret]');
    // Ce qui n'est pas sensible passe intact.
    assert.equal(ligne.utilisateur, 'admin@ecole.ml');
  });

  test('un nom COMPOSÉ est masqué comme le nom nu', () => {
    // Le cas réel : personne n'écrit « password », on écrit « userPassword ».
    // Une comparaison par égalité exacte laisserait tout ceci en clair.
    const { logger, lignes, json } = capture();
    logger.info('connexion', {
      userPassword: 'A',
      apiKeyV2: 'B',
      refreshTokenExpiry: 'C',
      adminOtpCode: 'D',
      xAuthorizationHeader: 'E',
    });

    const ligne = json()[0];
    for (const champ of [
      'userPassword',
      'apiKeyV2',
      'refreshTokenExpiry',
      'adminOtpCode',
      'xAuthorizationHeader',
    ]) {
      assert.equal(ligne[champ], '[secret]', `${champ} doit être masqué`);
    }
    for (const valeur of ['"A"', '"B"', '"C"', '"D"', '"E"']) {
      assert.equal(lignes[0]?.includes(valeur), false);
    }
  });

  test('les noms COURTS et réels sont masqués', () => {
    // Les noms composés étaient couverts ; ceux-ci ne l'étaient pas. Un JWT
    // complet et un « Bearer » brut sortaient en clair sous les noms sous
    // lesquels on les écrit vraiment.
    const { logger, lignes, json } = capture();
    logger.info('sonde', {
      jwt: 'A',
      auth: 'B',
      passwd: 'C',
      pwd: 'D',
      signature: 'E',
      hmac: 'F',
      salt: 'G',
    });

    const ligne = json()[0];
    for (const champ of ['jwt', 'auth', 'passwd', 'pwd', 'signature', 'hmac', 'salt']) {
      assert.equal(ligne[champ], '[secret]', `${champ} doit être masqué`);
    }
    for (const valeur of ['"A"', '"B"', '"C"', '"D"', '"E"', '"F"', '"G"']) {
      assert.equal(lignes[0]?.includes(valeur), false);
    }
  });

  test('author n’est pas auth — le nom d’une personne reste lisible', () => {
    // Faux positif à éviter : masquer l'auteur d'une correction de présence
    // rendrait le journal d'audit inutilisable.
    const { logger, json } = capture();
    logger.info('correction', { author: 'Fatoumata', authorId: 'e-12', authToken: 'X' });

    assert.equal(json()[0].author, 'Fatoumata');
    assert.equal(json()[0].authorId, 'e-12');
    assert.equal(json()[0].authToken, '[secret]');
  });

  test('un mot anodin contenant un terme court n’est pas masqué', () => {
    // « pin » est contenu dans mapping et shipping. Sur-masquer cacherait du
    // diagnostic utile sans rien protéger : égalité stricte pour ces termes-là.
    const { logger, json } = capture();
    logger.info('trajet', { mapping: 'ok', shipping: 'ok', pin: '1234' });

    assert.equal(json()[0].mapping, 'ok');
    assert.equal(json()[0].shipping, 'ok');
    assert.equal(json()[0].pin, '[secret]');
  });

  test('un secret enfoui est masqué comme un secret en surface', () => {
    const { logger, lignes, json } = capture();
    logger.info('appel fournisseur', {
      requete: { entetes: { authorization: 'Bearer xyz' }, corps: { ok: true } },
    });

    const requete = json()[0].requete as { entetes: Record<string, unknown> };
    assert.equal(requete.entetes.authorization, '[secret]');
    assert.equal(lignes[0]?.includes('Bearer xyz'), false);
  });

  test('un secret dans un tableau est masqué', () => {
    const { logger, lignes } = capture();
    logger.info('lot', { tentatives: [{ otp: '123456' }, { otp: '654321' }] });
    assert.equal(lignes[0]?.includes('123456'), false);
    assert.equal(lignes[0]?.includes('654321'), false);
  });

  test('une structure circulaire ne fait pas tomber le logger', () => {
    // Un logger qui lève est pire qu'un logger muet : il casse l'appelant
    // au moment précis où celui-ci essayait de signaler un problème.
    const { logger, lignes } = capture();
    const boucle: Record<string, unknown> = { nom: 'a' };
    boucle.soi = boucle;

    assert.doesNotThrow(() => logger.error('boucle', { boucle }));
    assert.equal(lignes.length, 1);
    assert.equal(lignes[0]?.includes('[cycle]'), true);
  });

  test('un objet référencé deux fois n’est pas un cycle', () => {
    // Le piège : mémoriser tout ce qui a été vu plutôt que la branche en cours.
    // { a: partagé, b: partagé } n'a aucun cycle — les deux doivent sortir entiers.
    const { logger, json } = capture();
    const partage = { classe: '6e A' };
    logger.info('deux références', { a: partage, b: partage });

    assert.deepEqual(json()[0].a, { classe: '6e A' });
    assert.deepEqual(json()[0].b, { classe: '6e A' });
  });

  test('un cycle imbriqué est coupé sans effacer ses voisins', () => {
    const { logger, json } = capture();
    const boucle: Record<string, unknown> = { nom: 'a' };
    boucle.soi = boucle;
    logger.info('mixte', { boucle, sain: { ok: true } });

    assert.deepEqual(json()[0].sain, { ok: true });
    assert.equal((json()[0].boucle as Record<string, unknown>).soi, '[cycle]');
  });

  test('une Date invalide ne fait pas lever', () => {
    // new Date('nawak').toISOString() lève un RangeError. Même piège que le
    // BigInt : la panne surviendrait à l'écriture, hors de portée de l'appelant.
    const { logger, lignes, json } = capture();
    assert.doesNotThrow(() => logger.info('daté', { quand: new Date('nawak') }));
    assert.equal(lignes.length, 1);
    assert.equal(json()[0].quand, '[date invalide]');
  });

  test('un champ ne peut pas usurper time, level ni message', () => {
    // Sans réservation, une erreur pouvait se déguiser en info et disparaître
    // des alertes. La collision est déplacée, pas supprimée.
    const { logger, json } = capture();
    logger.error('vrai message', { level: 'debug', time: 'faux', message: 'usurpé' });

    const ligne = json()[0];
    assert.equal(ligne.level, 'error');
    assert.equal(ligne.time, '2026-09-01T07:30:00.000Z');
    assert.equal(ligne.message, 'vrai message');

    // Rien n'est perdu : la valeur de l'appelant est déplacée.
    assert.equal(ligne['champ.level'], 'debug');
    assert.equal(ligne['champ.time'], 'faux');
    assert.equal(ligne['champ.message'], 'usurpé');
  });

  test('un child ne peut pas non plus usurper les métadonnées', () => {
    const { logger, json } = capture();
    logger.child({ level: 'debug' }).error('vrai');
    assert.equal(json()[0].level, 'error');
    assert.equal(json()[0]['champ.level'], 'debug');
  });

  test('un BigInt ne fait pas lever la sérialisation', () => {
    // JSON.stringify lève sur un BigInt. Sans traitement, la ligne casse au
    // moment de l'écriture — hors de portée de tout try de l'appelant.
    const { logger, lignes, json } = capture();
    assert.doesNotThrow(() => logger.info('grand nombre', { compteur: 9007199254740993n }));
    assert.equal(lignes.length, 1);
    assert.equal(json()[0].compteur, '9007199254740993n');
  });

  test('une Error devient lisible sans sa pile', () => {
    const { logger, json } = capture();
    logger.error('échec', { cause: new TypeError('mauvais type') });
    assert.deepEqual(json()[0].cause, { name: 'TypeError', message: 'mauvais type' });
  });

  test('une Date est sérialisée en ISO', () => {
    const { logger, json } = capture();
    logger.info('daté', { quand: new Date('2026-01-02T03:04:05.000Z') });
    assert.equal(json()[0].quand, '2026-01-02T03:04:05.000Z');
  });

  test('child ajoute ses champs à chaque ligne', () => {
    const { logger, json } = capture();
    logger.child({ correlationId: 'c-1' }).info('un');
    assert.equal(json()[0].correlationId, 'c-1');
  });

  test('child s’empile et le dernier champ gagne', () => {
    const { logger, json } = capture();
    logger.child({ a: 1, b: 1 }).child({ b: 2 }).info('deux');
    assert.equal(json()[0].a, 1);
    assert.equal(json()[0].b, 2);
  });

  test('les champs d’appel priment sur ceux du child', () => {
    const { logger, json } = capture();
    logger.child({ etape: 'base' }).info('trois', { etape: 'appel' });
    assert.equal(json()[0].etape, 'appel');
  });

  test('un child hérite du seuil de son parent', () => {
    const { logger, lignes } = capture('error');
    logger.child({ a: 1 }).warn('ignoré');
    assert.equal(lignes.length, 0);
  });

  test('silentLogger n’écrit rien et se dérive sans casser', () => {
    assert.doesNotThrow(() => {
      silentLogger.info('rien');
      silentLogger.child({ a: 1 }).error('rien non plus');
    });
  });
});
