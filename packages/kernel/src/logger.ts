/**
 * AKILA — journalisation structurée.
 * ==================================
 *
 * CLAUDE.md §5 : le kernel porte les primitives d'observabilité.
 * Constitution §26 : « Les logs ne contiennent pas les secrets, clés, tokens ou
 * OTP en clair. » Interdiction 11.
 *
 * Deux partis pris.
 *
 * 1. La sortie est **injectée**. Un logger qui écrit lui-même sur `stdout` rend
 *    ses appelants intestables et impose un canal au déploiement. Ici, la
 *    destination est un paramètre.
 *
 * 2. La rédaction des champs sensibles est **structurelle**, pas contractuelle.
 *    Compter sur la discipline de chacun pour ne jamais journaliser un jeton
 *    échoue le jour où quelqu'un journalise un objet entier « pour déboguer ».
 *    Ici, le logger ne peut pas laisser fuir un champ nommé `token`.
 */

import { systemClock } from './clock.ts';
import type { Clock } from './clock.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const ORDRE: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Champs structurés joints à une ligne. `unknown` et non `any` — interdiction 8. */
export interface LogFields {
  readonly [key: string]: unknown;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /** Dérive un logger qui portera ces champs sur chaque ligne — corrélation, tenant. */
  child(fields: LogFields): Logger;
}

/**
 * Termes dont la présence dans un nom de champ suffit à masquer la valeur.
 *
 * Recherche par **inclusion**, pas par égalité. Un nom composé — `userPassword`,
 * `apiKeyV2`, `refreshTokenExpiry` — porte exactement le même secret que le nom
 * nu, et c'est sous cette forme qu'il apparaît en pratique. Une liste d'égalité
 * exacte donne l'illusion de la protection tout en laissant passer le cas courant.
 *
 * Comparés après normalisation : `apiKey`, `api_key`, `API-KEY` et `apikey` sont
 * le même nom.
 *
 * La liste s'allonge quand un nouveau cas apparaît ; elle ne se raccourcit jamais.
 */
const TERMES_INTERDITS = [
  'password',
  'motdepasse',
  'passphrase',
  'token',
  'secret',
  'apikey',
  'authorization',
  'bearer',
  'cookie',
  'sessionid',
  'credential',
  'privatekey',
  'otp',
];

/**
 * Termes trop courts pour l'inclusion : ils apparaissent dans des mots anodins.
 * `pin` est contenu dans `mapping` et `shipping` — masquer ces champs cacherait
 * du diagnostic utile sans rien protéger. Égalité stricte pour ceux-là.
 */
const TERMES_EXACTS = new Set(['pin', 'cvv', 'iban']);

const MASQUE = '[secret]';
const PROFONDEUR_MAX = 6;

function estInterdit(cle: string): boolean {
  const normalise = cle.toLowerCase().replace(/[_\-\s.]/g, '');
  return (
    TERMES_EXACTS.has(normalise) || TERMES_INTERDITS.some((terme) => normalise.includes(terme))
  );
}

/**
 * Recopie la valeur en masquant les champs sensibles.
 *
 * Traverse les objets et les tableaux : un jeton enfoui à trois niveaux fuit
 * exactement comme un jeton en surface.
 *
 * `chemin` contient les objets de la branche **en cours**, pas tous ceux déjà
 * vus : un même objet référencé deux fois côte à côte n'est pas un cycle, et le
 * signaler comme tel effacerait une donnée parfaitement lisible. On l'ajoute en
 * descendant, on le retire en remontant.
 *
 * La fonction est totale — elle ne lève jamais. Un logger qui lève casse
 * l'appelant au moment précis où celui-ci signalait un problème.
 */
function redact(valeur: unknown, profondeur = 0, chemin = new Set<object>()): unknown {
  // BigInt n'est pas sérialisable par JSON.stringify : il lèverait au moment
  // d'écrire la ligne, donc hors de portée de tout try local de l'appelant.
  if (typeof valeur === 'bigint') return `${valeur}n`;
  if (valeur === null || typeof valeur !== 'object') return valeur;
  if (profondeur >= PROFONDEUR_MAX) return '[trop profond]';
  if (chemin.has(valeur)) return '[cycle]';

  if (valeur instanceof Date) return valeur.toISOString();
  if (valeur instanceof Error) {
    return { name: valeur.name, message: valeur.message };
  }

  chemin.add(valeur);
  const sortie = Array.isArray(valeur)
    ? valeur.map((element) => redact(element, profondeur + 1, chemin))
    : Object.fromEntries(
        Object.entries(valeur).map(([cle, v]) => [
          cle,
          estInterdit(cle) ? MASQUE : redact(v, profondeur + 1, chemin),
        ]),
      );
  chemin.delete(valeur);
  return sortie;
}

export interface LoggerOptions {
  /** En dessous, rien n'est écrit. Par défaut `info`. */
  readonly minLevel?: LogLevel;
  /** Horloge — figée dans les tests, système en production. */
  readonly clock?: Clock;
  /** Champs portés par chaque ligne. */
  readonly base?: LogFields;
}

/**
 * Logger JSON — une ligne par événement, destination injectée.
 *
 * Le format tient en cinq clés : `time`, `level`, `message`, plus les champs.
 * Une ligne par événement se relit avec `grep` quand l'agrégateur est tombé, ce
 * qui arrive précisément le jour où on en a besoin.
 */
export function jsonLogger(write: (ligne: string) => void, options: LoggerOptions = {}): Logger {
  const clock = options.clock ?? systemClock;
  const seuil = ORDRE[options.minLevel ?? 'info'];
  const base = options.base ?? {};

  function ecrire(level: LogLevel, message: string, fields?: LogFields): void {
    if (ORDRE[level] < seuil) return;
    const ligne = {
      time: clock.now().toISOString(),
      level,
      message,
      ...(redact({ ...base, ...fields }) as Record<string, unknown>),
    };
    write(JSON.stringify(ligne));
  }

  return {
    debug: (m, f) => ecrire('debug', m, f),
    info: (m, f) => ecrire('info', m, f),
    warn: (m, f) => ecrire('warn', m, f),
    error: (m, f) => ecrire('error', m, f),
    child: (fields) => jsonLogger(write, { ...options, base: { ...base, ...fields } }),
  };
}

/** Logger muet — pour les tests qui n'observent pas la sortie. */
export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
};
