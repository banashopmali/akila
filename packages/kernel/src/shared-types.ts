// VIOLATION 4 (ARC-004) : entité métier dans le kernel partagé.
export interface Student { id: string; schoolId: string }
export interface Guardian { id: string; phone: string }
