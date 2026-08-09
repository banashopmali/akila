// VIOLATION 3 (ARC-003) : l'UI importe du code serveur.
import { decide } from '../../api/src/attendance/domain/decision.ts';
export const render = decide;
