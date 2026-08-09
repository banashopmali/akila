// VIOLATION ARC-003 : l'UI importe du code serveur.
import { AttendanceService } from '../../../apps/api/src/attendance/application/attendance.service.ts';
export const boom = AttendanceService;
