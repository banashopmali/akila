// VIOLATION ARC-002 : le Domain importe un DTO HTTP.
import type { CheckInHttpDto } from '../interfaces/check-in.dto.ts';
export type Boom = CheckInHttpDto;
