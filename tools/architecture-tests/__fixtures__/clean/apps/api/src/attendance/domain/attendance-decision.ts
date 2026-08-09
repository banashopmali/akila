// Conforme : le Domain ne dépend que de TypeScript et du kernel.
import type { TenantId } from '@akila/kernel/ids.ts';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export interface ArrivalObservation {
  readonly tenantId: TenantId;
  readonly observedAt: Date;
}

export function decide(o: ArrivalObservation, threshold: Date): AttendanceStatus {
  return o.observedAt <= threshold ? 'PRESENT' : 'LATE';
}
