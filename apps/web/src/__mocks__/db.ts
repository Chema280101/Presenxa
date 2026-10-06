import { vi } from "vitest";

// Mock for @asistencias/db — used by vitest alias
// Provides a minimal Prisma mock and re-exports enums

export const AttendanceStatus = {
  PENDIENTE: "PENDIENTE",
  PRESENTE: "PRESENTE",
  TARDE: "TARDE",
  AUSENTE: "AUSENTE",
  ABANDONO_PUESTO: "ABANDONO_PUESTO",
  INCOMPLETO: "INCOMPLETO",
  JUSTIFICADO: "JUSTIFICADO",
  FERIADO: "FERIADO",
  PERMISO: "PERMISO",
  DIA_LIBRE: "DIA_LIBRE",
  VACACIONES: "VACACIONES",
  DESCANSO_MEDICO: "DESCANSO_MEDICO",
} as const;

export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  SUPERVISOR: "SUPERVISOR",
  EMPLEADO: "EMPLEADO",
} as const;

export const AuditAction = {
  ATTENDANCE_SCANNED: "ATTENDANCE_SCANNED",
  ATTENDANCE_STATUS_CHANGED: "ATTENDANCE_STATUS_CHANGED",
  ATTENDANCE_JUSTIFIED: "ATTENDANCE_JUSTIFIED",
  ATTENDANCE_EDITED_MANUAL: "ATTENDANCE_EDITED_MANUAL",
  QR_GENERATED: "QR_GENERATED",
  QR_REGENERATED: "QR_REGENERATED",
  QR_INVALIDATED: "QR_INVALIDATED",
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DEACTIVATED: "USER_DEACTIVATED",
  JOB_EXECUTED: "JOB_EXECUTED",
  TIME_OFF_REQUESTED: "TIME_OFF_REQUESTED",
  TIME_OFF_APPROVED: "TIME_OFF_APPROVED",
  TIME_OFF_REJECTED: "TIME_OFF_REJECTED",
} as const;

export const PunchMethod = {
  QR: "QR",
  NFC: "NFC",
  PIN: "PIN",
  MANUAL: "MANUAL",
  BIOMETRICO: "BIOMETRICO",
} as const;

// Minimal prisma mock — individual tests should override with vi.mock
export const prisma = {
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  attendance: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  kiosk: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  notification: {
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  userSchedule: {
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  holiday: {
    findMany: vi.fn(),
  },
  shiftOverride: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  pushSubscription: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn((fn: any) => fn(prisma)),
};
