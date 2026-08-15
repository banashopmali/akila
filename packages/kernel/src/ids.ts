/**
 * AKILA — identifiants techniques.
 * ================================
 *
 * CLAUDE.md §5 : `packages/kernel` porte les identifiants **techniques**. Les
 * identifiants métier appartiennent à leur domaine — `ARC-004` échoue sur leur
 * simple présence ici, dérivés compris.
 *
 * Pourquoi une marque de type : `string` accepte n'importe quel `string`. Sans
 * marque, passer un identifiant de terminal là où on attend un identifiant de
 * tenant compile parfaitement et se découvre en production. La marque n'existe
 * qu'à la compilation : à l'exécution, c'est une chaîne, rien de plus.
 */

import { randomUUID } from 'node:crypto';

import { ok, err } from './result.ts';
import { permanent } from './errors.ts';
import type { Result } from './result.ts';
import type { AkilaError } from './errors.ts';

declare const marque: unique symbol;

/**
 * Identifiant marqué. `Id<'tenant'>` et `Id<'device'>` sont tous deux des chaînes
 * à l'exécution, mais le compilateur refuse de les confondre.
 */
export type Id<TMarque extends string> = string & { readonly [marque]: TMarque };

/** UUID v4 en minuscules, forme canonique. */
const FORME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Fabrique un identifiant neuf.
 *
 * La marque est fournie par l'appelant : `newId<'tenant'>()`. Le hasard vient de
 * `node:crypto`, donc d'aucune dépendance externe — le kernel n'en a aucune.
 */
export function newId<TMarque extends string>(): Id<TMarque> {
  return randomUUID() as Id<TMarque>;
}

/**
 * Valide une chaîne venue d'une frontière non fiable — HTTP, CSV, file, terminal.
 *
 * Rend un `Result` plutôt que de lever : un identifiant mal formé est une donnée
 * d'entrée invalide, pas un bug. La classe est `permanent` — le même texte
 * échouera identiquement au prochain essai, le rejouer ne sert à rien.
 */
export function idFrom<TMarque extends string>(brut: string): Result<Id<TMarque>, AkilaError> {
  const normalise = brut.trim().toLowerCase();
  if (!FORME_UUID.test(normalise)) {
    return err(
      permanent('kernel.id.invalid', 'Identifiant mal formé : UUID v4 attendu.', {
        details: { longueur: brut.length },
      }),
    );
  }
  return ok(normalise as Id<TMarque>);
}

/*
 * `details` ne porte pas la valeur reçue, seulement sa longueur.
 *
 * Une chaîne arrivant d'une frontière peut contenir un jeton mal routé ; la
 * recopier dans un log ou une réponse d'erreur la propage. La longueur suffit
 * au diagnostic. CLAUDE.md §11 · Constitution §26.
 */
