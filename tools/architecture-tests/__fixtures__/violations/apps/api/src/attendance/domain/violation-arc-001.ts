// VIOLATION ARC-001 : le Domain importe un adaptateur concret.
import { PostgresAttendanceRepository } from '../infrastructure/postgres-attendance.repository.ts';
export const boom = PostgresAttendanceRepository;
