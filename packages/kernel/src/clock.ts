/**
 * AKILA — abstraction de temps.
 * =============================
 *
 * CLAUDE.md §5 : le kernel porte les abstractions de temps.
 *
 * Pourquoi un port plutôt que `new Date()` : la présence se décide sur des seuils
 * horaires — arrivée, retard, absence. Un domaine qui lit l'horloge système
 * directement produit des tests qui passent le matin et échouent l'après-midi, et
 * rend intestable le seul comportement qui compte vraiment.
 *
 * Le `domain` déclare qu'il a besoin de l'heure ; `infrastructure` lui fournit
 * l'horloge système ; les tests fournissent une horloge figée. CLAUDE.md §3.
 */

/** Port. Une seule méthode : rien d'autre n'est justifié aujourd'hui. */
export interface Clock {
  /** Instant courant. Toujours une nouvelle `Date` — jamais une référence partagée. */
  now(): Date;
}

/** Adaptateur de production. */
export const systemClock: Clock = {
  now: () => new Date(),
};

/**
 * Horloge figée, pour les tests et pour rejouer un scénario daté.
 *
 * La date fournie est recopiée à la construction **et** à chaque lecture : `Date`
 * est muable, et un appelant qui ferait `clock.now().setHours(0)` décalerait
 * l'horloge de tous les autres.
 */
export function fixedClock(instant: Date): Clock {
  const fige = instant.getTime();
  return { now: () => new Date(fige) };
}
