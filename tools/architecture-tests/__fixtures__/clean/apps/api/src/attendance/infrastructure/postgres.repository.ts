// Conforme : l'adaptateur peut dépendre du domaine, jamais l'inverse.
import { decide } from '../domain/attendance-decision.ts';
export const use = decide;
