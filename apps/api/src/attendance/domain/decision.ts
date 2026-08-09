// VIOLATION 1 (ARC-001) : le Domain importe un adaptateur concret.
import { PostgresAttendanceRepository } from '../infrastructure/postgres-attendance.repository.ts';
// VIOLATION 2 (ARC-002) : le Domain importe un DTO HTTP.
import type { CheckInHttpDto } from '../interfaces/check-in.dto.ts';

export function decide(dto: CheckInHttpDto) {
  return PostgresAttendanceRepository.find();
}
