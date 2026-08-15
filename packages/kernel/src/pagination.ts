/**
 * AKILA — contrat de pagination.
 * ==============================
 *
 * CLAUDE.md §5 : le kernel porte le contrat de pagination.
 *
 * Curseur opaque, pas numéro de page. Une école importe ses élèves pendant qu'un
 * administrateur parcourt la liste : avec `?page=2`, une insertion décale tout et
 * une ligne est sautée sans que personne ne le voie. Le curseur désigne une
 * position stable, pas un rang.
 *
 * Opaque veut dire opaque : le client le renvoie tel quel et n'en déduit rien.
 * Sa forme appartient à l'adaptateur qui l'a produit et peut changer sans préavis.
 */

import { ok, err } from './result.ts';
import { permanent } from './errors.ts';
import type { Result } from './result.ts';
import type { AkilaError } from './errors.ts';

export const LIMITE_PAR_DEFAUT = 50;
export const LIMITE_MAX = 200;

export interface PageRequest {
  readonly limit: number;
  /** Absent au premier appel. Ensuite : le `nextCursor` de la page précédente. */
  readonly cursor?: string;
}

export interface Page<T> {
  readonly items: readonly T[];
  /** Absent quand il n'y a plus rien après — c'est le seul signal de fin. */
  readonly nextCursor?: string;
}

/**
 * Valide une demande de pagination venue d'une frontière non fiable.
 *
 * Le plafond n'est pas cosmétique : sans lui, `?limit=1000000` transforme une
 * liste en déni de service, et sur une connexion malienne instable une réponse
 * démesurée ne finit jamais d'arriver.
 */
export function pageRequest(
  limit: number = LIMITE_PAR_DEFAUT,
  cursor?: string,
): Result<PageRequest, AkilaError> {
  if (!Number.isInteger(limit)) {
    return err(permanent('kernel.pagination.limit_invalid', 'La limite doit être un entier.'));
  }
  if (limit < 1 || limit > LIMITE_MAX) {
    return err(
      permanent(
        'kernel.pagination.limit_invalid',
        `La limite doit être comprise entre 1 et ${LIMITE_MAX}.`,
        { details: { recu: limit, max: LIMITE_MAX } },
      ),
    );
  }
  if (cursor !== undefined && cursor.trim() === '') {
    // Un curseur vide n'est pas « pas de curseur » : c'est un appelant qui a
    // recopié une chaîne vide. Le confondre avec le premier appel repartirait
    // silencieusement du début et rejouerait toute la liste.
    return err(permanent('kernel.pagination.cursor_invalid', 'Curseur vide.'));
  }
  return ok({ limit, ...(cursor === undefined ? {} : { cursor }) });
}

/** Page terminale — aucun `nextCursor`, donc plus rien à demander. */
export function lastPage<T>(items: readonly T[]): Page<T> {
  return { items };
}
