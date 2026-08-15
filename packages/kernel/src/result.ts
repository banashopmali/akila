/**
 * AKILA — `Result` : l'échec est une valeur, pas une exception.
 * ============================================================
 *
 * CLAUDE.md §5 : `packages/kernel` ne contient que des primitives techniques.
 *
 * Pourquoi ce type existe : une exception traverse silencieusement les couches et
 * finit par être avalée quelque part (interdiction 7). Un `Result` rendu par une
 * signature oblige l'appelant à décider quoi faire de l'échec — le compilateur ne
 * le laisse pas l'ignorer.
 *
 * Les exceptions restent légitimes pour ce qui n'est pas un cas métier : bug de
 * programmation, invariant interne rompu, panne d'infrastructure non modélisée.
 */

/** Succès. `value` porte le résultat utile. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Échec. `error` porte la raison, jamais `null`. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * Union discriminée sur `ok`. TypeScript restreint le type dans chaque branche :
 * après `if (r.ok)`, `r.value` existe et `r.error` n'existe pas.
 */
export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/** Garde de type — restreint `Result<T, E>` à `Ok<T>`. */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/** Garde de type — restreint `Result<T, E>` à `Err<E>`. */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/*
 * Volontairement absents : `map`, `flatMap`, `unwrap`, `match`.
 *
 * Le README du kernel fixe la règle : une primitive à la fois, chacune justifiée
 * par un besoin présent. Aucun appelant n'existe encore pour ces combinateurs.
 * Une abstraction créée « au cas où » finit supprimée — ou pire, respectée.
 * Ajoutez-les le jour où un cas d'usage réel les réclame, pas avant.
 */
