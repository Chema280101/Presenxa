/**
 * Utilidades de fecha y zona horaria para AsistControl / Presenxa.
 * Garantiza que en servidores en la nube (Vercel, Render, Docker con TZ=UTC)
 * las fechas y horas se calculen siempre con la zona horaria de la organización (por defecto America/Lima).
 */

export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || "America/Lima";

/**
 * Retorna la fecha local en formato 'YYYY-MM-DD' según la zona horaria especificada.
 * Ejemplo: Si en UTC son las 00:34 del 18 de agosto, pero en Lima son las 19:34 del 17 de agosto,
 * retornará '2026-08-17'.
 */
export function getLocalDateString(
  date: Date | string | number = new Date(),
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  
  // Usar el locale 'en-CA' para obtener formato ISO 'YYYY-MM-DD' garantizado
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(d);
}

/**
 * Retorna un objeto Date que representa la medianoche UTC del día local (para almacenar en columnas @db.Date de Prisma).
 * Ejemplo: '2026-08-17T00:00:00.000Z'
 */
export function getLocalTodayDate(
  date: Date | string | number = new Date(),
  timeZone: string = DEFAULT_TIMEZONE
): Date {
  const dateStr = getLocalDateString(date, timeZone);
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Extrae la hora, minuto y segundo locales exactos en la zona horaria especificada.
 */
export function getLocalTimeParts(
  date: Date | string | number = new Date(),
  timeZone: string = DEFAULT_TIMEZONE
): { hour: number; minute: number; second: number } {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || DEFAULT_TIMEZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(d);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const second = parseInt(parts.find((p) => p.type === "second")?.value || "0", 10);

  return { hour: hour === 24 ? 0 : hour, minute, second };
}

/**
 * Formatea una fecha u hora según la zona horaria local.
 * Soporta patrones comunes: 'HH:mm', 'HH:mm:ss', 'yyyy-MM-dd', 'dd/MM/yyyy HH:mm'.
 */
export function formatLocalTime(
  date: Date | string | number = new Date(),
  formatPattern: "HH:mm" | "HH:mm:ss" | "yyyy-MM-dd" | "dd/MM/yyyy" | "dd/MM/yyyy HH:mm" = "HH:mm:ss",
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const tz = timeZone || DEFAULT_TIMEZONE;

  const dateStr = getLocalDateString(d, tz); // YYYY-MM-DD
  const [year, month, day] = dateStr.split("-");
  const { hour, minute, second } = getLocalTimeParts(d, tz);

  const pad = (n: number) => String(n).padStart(2, "0");
  const hh = pad(hour);
  const mm = pad(minute);
  const ss = pad(second);

  switch (formatPattern) {
    case "HH:mm":
      return `${hh}:${mm}`;
    case "HH:mm:ss":
      return `${hh}:${mm}:${ss}`;
    case "yyyy-MM-dd":
      return dateStr;
    case "dd/MM/yyyy":
      return `${day}/${month}/${year}`;
    case "dd/MM/yyyy HH:mm":
      return `${day}/${month}/${year} ${hh}:${mm}`;
    default:
      return `${hh}:${mm}:${ss}`;
  }
}
