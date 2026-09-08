import { Client } from "@upstash/qstash";

// Inicializamos el cliente de QStash de forma segura
// Asegúrate de definir QSTASH_TOKEN en tus variables de entorno (.env.local)
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
 */
export async function scheduleSedeNotification(
  userId: string,
  sedeName: string,
  entryHour: number,
  entryMinute: number,
  date: Date,
  minutesBefore: number = 30
) {
  // Calculamos la hora de entrada
  const entryDate = new Date(date);
  entryDate.setHours(entryHour, entryMinute, 0, 0);

  // Restamos los minutos indicados
  const sendAtDate = new Date(entryDate.getTime() - minutesBefore * 60000);
  
  // Si la hora de envío ya pasó (ej. el admin hizo el cambio a las 8:45 para un turno de 9:00),
  // Upstash lo enviará inmediatamente de todas formas, pero para ser correctos, definimos la hora.
  const notBeforeUnix = Math.floor(sendAtDate.getTime() / 1000);

  // La URL a la que Upstash va a llamar (tu webhook en Vercel)
  // NEXTAUTH_URL suele ser la URL base del proyecto
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/webhooks/qstash`;

  try {
    const res = await qstashClient.publishJSON({
      url: webhookUrl,
      // Usamos notBefore para decirle a Upstash que lo retenga en cola hasta esa hora
      notBefore: notBeforeUnix,
      body: {
        userId,
        sedeName,
        entryTime: `${entryHour.toString().padStart(2, "0")}:${entryMinute.toString().padStart(2, "0")}`,
      },
    });
    
    console.log(`[QStash] Notificación programada exitosamente para el usuario ${userId} en ${sendAtDate.toISOString()}. MsgId: ${res.messageId}`);
    return res;
  } catch (error) {
    console.error("[QStash] Error programando la notificación:", error);
    throw error;
  }
}
