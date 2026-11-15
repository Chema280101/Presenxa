/**
 * Formatea los estados de asistencia del enum AttendanceStatus a etiquetas legibles.
 */
export function formatAttendanceStatus(status: string): string {
  switch (status) {
    case "PRESENTE":
      return "Puntual";
    case "TARDE":
      return "Tardanza";
    case "AUSENTE":
      return "Falta";
    case "ABANDONO_PUESTO":
      return "Abandono";
    case "INCOMPLETO":
      return "Incompleto";
    case "JUSTIFICADO":
      return "Justificado";
    case "PERMISO":
      return "Permiso";
    case "FERIADO":
      return "Feriado";
    case "VACACIONES":
      return "Vacaciones";
    case "DESCANSO_MEDICO":
      return "Desc. Médico";
    case "DIA_LIBRE":
      return "Día Libre";
    case "PENDIENTE":
      return "Pendiente";
    default:
      return status;
  }
}

/**
 * Calcula el porcentaje de puntualidad sobre marcaciones efectivas (Puntuales + Tardanzas),
 * consistente con /api/reports/detailed.
 */
export function calculatePunctualityRate(presentCount: number, lateCount: number): number {
  const effective = presentCount + lateCount;
  if (effective <= 0) return presentCount > 0 ? 100 : 0;
  return Math.round((presentCount / effective) * 100);
}
