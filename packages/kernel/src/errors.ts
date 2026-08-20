/**
 * AKILA — modèle d'erreurs partagé.
 * =================================
 *
 * CLAUDE.md §7 : toute intégration classe ses erreurs en trois familles.
 * Constitution §19 : « Le retry n'est jamais une stratégie de cohérence. »
 *
 * La classe d'échec n'est pas décorative : c'est elle qui décide si l'appelant a
 * le droit de rejouer. Une erreur sans classe oblige chaque appelant à deviner,
 * et un appelant qui devine rejoue une opération non idempotente.
 *
 * Ce fichier ne contient AUCUN code métier — seulement la forme d'une erreur.
 * Les codes d'erreur appartiennent aux domaines qui les émettent.
 */

/**
 * Les trois classes, et rien d'autre.
 *
 * - `transient`  — la même opération peut réussir plus tard. Retry borné, backoff.
 * - `permanent`  — elle échouera identiquement. Aucun retry ; échec explicite.
 * - `unknown`    — on ne sait pas si l'effet a eu lieu. On n'invente pas d'issue :
 *                  on ouvre un cas de réconciliation.
 */
export type FailureClass = 'transient' | 'permanent' | 'unknown';

/**
 * Forme d'une erreur AKILA. Données pures, sans méthode.
 *
 * **Portée de la garantie.** `code`, `message`, `failureClass` et `details`
 * traversent un log, une file ou une frontière HTTP sans rien perdre. `cause` en
 * est exclue **volontairement** : elle accepte n'importe quoi, et `JSON.stringify`
 * réduit un `Error` à `{}` — message et pile disparaissent en silence.
 *
 * Ce n'est pas un oubli. `cause` existe pour le traitement local, où l'objet
 * d'origine a encore de la valeur : `instanceof`, code d'erreur d'un pilote,
 * réponse d'un fournisseur. C'est le logger qui sait l'aplatir au moment d'écrire
 * — il normalise un `Error` en `{ name, message }`.
 *
 * Qui sérialise une erreur autrement que par le logger doit traiter `cause`
 * lui-même, ou l'omettre.
 */
export interface AkilaError {
  /** Identifiant stable, propriété du domaine émetteur. Ex. : `attendance.already_checked_in`. */
  readonly code: string;
  /** Message destiné au diagnostic, jamais affiché tel quel à un parent ou un élève. */
  readonly message: string;
  readonly failureClass: FailureClass;
  /** Contexte de diagnostic. Jamais de secret, de jeton ni de donnée personnelle inutile. */
  readonly details?: Readonly<Record<string, unknown>>;
  /** Cause d'origine, conservée pour la trace. `unknown` et non `any` — interdiction 8. */
  readonly cause?: unknown;
}

interface ErrorOptions {
  readonly details?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
}

function build(
  failureClass: FailureClass,
  code: string,
  message: string,
  options?: ErrorOptions,
): AkilaError {
  return {
    code,
    message,
    failureClass,
    ...(options?.details === undefined ? {} : { details: options.details }),
    ...(options?.cause === undefined ? {} : { cause: options.cause }),
  };
}

/** Rejouable : coupure réseau, verrou momentané, dépendance saturée. */
export function transient(code: string, message: string, options?: ErrorOptions): AkilaError {
  return build('transient', code, message, options);
}

/** Non rejouable : validation refusée, autorisation refusée, invariant métier violé. */
export function permanent(code: string, message: string, options?: ErrorOptions): AkilaError {
  return build('permanent', code, message, options);
}

/** Issue indéterminée : timeout après envoi, réponse illisible d'un fournisseur. */
export function unknown(code: string, message: string, options?: ErrorOptions): AkilaError {
  return build('unknown', code, message, options);
}

/**
 * Seule la classe `transient` autorise le retry.
 *
 * `unknown` en est exclue **volontairement** : rejouer une opération dont on ignore
 * si elle a abouti est le mécanisme exact qui produit un doublon. Elle se réconcilie,
 * elle ne se rejoue pas.
 */
export function isRetryable(error: AkilaError): boolean {
  return error.failureClass === 'transient';
}
