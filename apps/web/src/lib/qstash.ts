import { Client } from "@upstash/qstash";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dateUtils";

// Inicializamos el cliente de QStash de forma segura
export const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

/**
 * Programa una notificación Push para enviarse antes de que inicie el turno.
 * @param userId - El ID del usuario que recibirá la notificación.
 * @param sedeName - El nombre de la sede a la que fue asignado.
 * @param entryHour - La hora a la que inicia su turno (0-23).
 * @param entryMinute - El minuto al que inicia su turno (0-59).
 * @param date - La fecha en la que aplica este horario.
 * @param minutesBefore - Cuántos minutos antes enviar la alerta (por defecto 30).
 * @param timezone - Zona horaria de la sede/organización (ej: "America/Lima").
 */
export async function scheduleSedeNotification(
  userId: string,
  sedeName: string,
  entryHour: number,
  entryMinute: number,
  date: Date,
  minutesBefore: number = 30,
  timezone: string = DEFAULT_TIMEZONE
) {
  // Obtener fecha calendario local YYYY-MM-DD
  const dateStr = getLocalDateString(date, timezone);
  const hh = entryHour.toString().padStart(2, "0");
  const mm = entryMinute.toString().padStart(2, "0");

  // Crear timestamp exacto considerando offset horario de la zona
  // Por ejemplo para Lima (UTC-5): "2026-11-14T08:00:00-05:00"
  // Para generalizar con IANA timezone, usamos constructor Date con formateador
  const tempLocalIso = `${dateStr}T${hh}:${mm}:00`;
  // Creamos la fecha interpretada en la zona horaria destino
  const localDateForTz = new Date(new Date(tempLocalIso).toLocaleString("en-US", { timeZone: timezone }));
  const diffTz = new Date(tempLocalIso).getTime() - localDateForTz.getTime();
  const entryDate = new Date(new Date(tempLocalIso).getTime() + diffTz);

  // Restamos los minutos indicados
  const sendAtDate = new Date(entryDate.getTime() - minutesBefore * 60000);
  const notBeforeUnix = Math.floor(sendAtDate.getTime() / 1000);

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/webhooks/qstash`;

  try {
    const res = await qstashClient.publishJSON({
      url: webhookUrl,
      notBefore: notBeforeUnix,
      body: {
        userId,
        sedeName,
        entryTime: `${hh}:${mm}`,
      },
    });
    
    console.log(`[QStash] Notificación programada exitosamente para el usuario ${userId} en ${sendAtDate.toISOString()}. MsgId: ${res.messageId}`);
    return res;
  } catch (error) {
    console.error("[QStash] Error programando la notificación:", error);
    throw error;
  }
}
