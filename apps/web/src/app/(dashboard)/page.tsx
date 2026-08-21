import Link from "next/link";
import {
  Users,
  MapPin,
  Clock,
  ShieldCheck,
  QrCode,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  HelpCircle,
  TrendingUp,
  Sparkles,
  Zap,
  CalendarDays,
  Smartphone,
  Tablet,
} from "lucide-react";
import { prisma } from "@asistencias/db";
import { auth } from "@/auth";
import { startOfDay, endOfDay } from "date-fns";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

// ── Helpers ──────────────────────────────────────────────────
function avatarUrl(name: string) {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=a3e635&textColor=060e17`;
}

const quickLinks = [
  { href: "/asistencias", label: "Control de Asistencias", icon: Clock, desc: "Aperturas, cierres y justificantes", tag: "En vivo" },
  { href: "/usuarios",    label: "Gestión de Usuarios",     icon: Users, desc: "Altas, roles y credenciales QR", tag: "Colaboradores" },
  { href: "/sedes",       label: "Sedes y Ubicaciones",     icon: MapPin, desc: "Oficinas y sucursales activas", tag: "Locaciones" },
  { href: "/reportes",    label: "Métricas y Reportes",    icon: BarChart3, desc: "Exportar Excel / CSV y KPIs", tag: "Analítica" },
  { href: "/kiosks",      label: "Dispositivos Kiosk",     icon: QrCode, desc: "Tótems y tokens de emparejamiento", tag: "Hardware" },
];

// ─────────────────────────────────────────────────────────────
// Server Component — consulta la BD en tiempo real
// ─────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId;

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  // ── Conteos de estado del día de hoy (con fallback seguro) ──
  let presentes = 0;
  let tardes = 0;
  let ausentes = 0;
  let abandonos = 0;
  let justificados = 0;
  let recentRaw: any[] = [];
  let avgLate = 0;
  let totalEmpleados = 0;

  try {
    const [cPresentes, cTardes, cAusentes, cAbandonos, cJustificados, rawList, tardanzasDetalle, countEmpleados] =
      await Promise.all([
        prisma.attendance.count({
          where: {
            date: todayStart,
            status: "PRESENTE",
            ...(organizationId ? { user: { organizationId } } : {}),
          },
        }),
        prisma.attendance.count({
          where: {
            date: todayStart,
            status: "TARDE",
            ...(organizationId ? { user: { organizationId } } : {}),
          },
        }),
        prisma.attendance.count({
          where: {
            date: todayStart,
            status: "AUSENTE",
            ...(organizationId ? { user: { organizationId } } : {}),
          },
        }),
        prisma.attendance.count({
          where: {
            date: todayStart,
            status: "ABANDONO_PUESTO",
            ...(organizationId ? { user: { organizationId } } : {}),
          },
        }),
        prisma.attendance.count({
          where: {
            date: todayStart,
            status: "JUSTIFICADO",
            ...(organizationId ? { user: { organizationId } } : {}),
          },
        }),
        prisma.attendance.findMany({
          where: {
            date: todayStart,
            OR: [
              { entryTime: { gte: todayStart, lte: todayEnd } },
              { exitTime:  { gte: todayStart, lte: todayEnd } },
            ],
            ...(organizationId ? { user: { organizationId } } : {}),
          },
          orderBy: [
            { updatedAt: "desc" },
          ],
          take: 8,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                photoUrl: true,
              },
            },
          },
        }),
        prisma.attendance.aggregate({
          where: {
            date: todayStart,
            status: "TARDE",
            lateMinutes: { not: null },
            ...(organizationId ? { user: { organizationId } } : {}),
          },
          _avg: { lateMinutes: true },
        }),
        prisma.user.count({
          where: {
            isActive: true,
            role: { in: ["EMPLEADO", "ALUMNO"] },
            ...(organizationId ? { organizationId } : {}),
          },
        }),
      ]);

    presentes = cPresentes;
    tardes = cTardes;
    ausentes = cAusentes;
    abandonos = cAbandonos;
    justificados = cJustificados;
    recentRaw = rawList;
    avgLate = Math.round(tardanzasDetalle._avg.lateMinutes ?? 0);
    totalEmpleados = countEmpleados;
  } catch (error) {
    console.error("[DashboardPage] Error loading metrics from database:", error);
  }

  // Construir actividad reciente
  const recentActivity = recentRaw.map((att) => {
    const name = `${att.user.firstName} ${att.user.lastName}`;
    const lastTime = att.exitTime ?? att.entryTime;
    const timeStr = lastTime
      ? lastTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
      : "--:--";
    const action =
      att.status === "TARDE"           ? "Tardanza registrada"
      : att.status === "ABANDONO_PUESTO" ? "Excepción registrada"
      : att.exitTime                     ? "Salida de turno"
      : "Entrada registrada";

    return {
      name,
      photoUrl: att.user.photoUrl,
      action,
      time: timeStr,
      status: att.status as string,
      lateMinutes: att.lateMinutes,
      hasExit: Boolean(att.exitTime),
    };
  });

  const todayLabel = today.toLocaleDateString("es-PE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalProcesados = presentes + tardes + ausentes + abandonos + justificados;
  const totalAsistieron = presentes + tardes;
  const puntualidadRate = totalAsistieron > 0 ? Math.round((presentes / totalAsistieron) * 100) : 100;
  const tasaAsistencia = totalEmpleados > 0 ? Math.round((totalAsistieron / totalEmpleados) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">

      {/* ── Header Principal con Saludo Dinámico ──────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-surface-900/90 via-surface-800/80 to-surface-900/90 border border-primary-400/15 relative overflow-hidden shadow-xl shadow-surface-950/50">
        {/* Glow de fondo decorativo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-400/15 border border-primary-400/30 text-primary-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-400"></span>
              </span>
              Presenxa Live Engine
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Panel General de Control
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm capitalize flex items-center gap-2 font-medium">
            <CalendarDays className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
            <span>{todayLabel}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">{session?.user?.organizationName || "Organización"}</span>
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Link
            href="/kiosk"
            className="card-surface px-3.5 py-2.5 flex items-center gap-2 text-xs text-slate-300 hover:text-white hover:border-primary-400/30 transition-all font-semibold"
          >
            <Tablet className="w-4 h-4 text-primary-400" />
            <span>Abrir Kiosk</span>
          </Link>
          <Link
            href="/reportes"
            className="gradient-brand px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-surface-950 shadow-lg shadow-primary-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Ver Reportes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── Stat Cards Bento Grid ────────────────────────────── */}
      <section
        aria-label="Resumen del día"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        <StatCard
          label="Asistencia Hoy"
          value={totalAsistieron}
          sub={`${tasaAsistencia}% de ${totalEmpleados} colaboradores`}
          icon={CheckCircle2}
          variant="success"
          trend={{ value: `${puntualidadRate}% a tiempo`, isPositive: puntualidadRate >= 80 }}
        />
        <StatCard
          label="Puntuales"
          value={presentes}
          sub="Sin retraso respecto al turno"
          icon={Sparkles}
          variant="primary"
        />
        <StatCard
          label="Tardanzas"
          value={tardes}
          sub={avgLate > 0 ? `Promedio ${avgLate} min de demora` : "Sin retrasos hoy"}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          label="Ausencias / Justificados"
          value={ausentes}
          sub={justificados > 0 ? `${justificados} permisos aprobados` : "Sin permisos registrados"}
          icon={XCircle}
          variant="danger"
        />
      </section>

      {/* ── Distribución Visual de la Jornada ───────────────── */}
      {totalProcesados > 0 && (
        <section className="card-surface p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-400/10 border border-primary-400/20 flex items-center justify-center text-primary-300">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Distribución de Asistencias del Día
                </h3>
                <p className="text-[11px] text-slate-400">Proporción en tiempo real de marcaciones registradas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white bg-surface-950/60 px-3 py-1 rounded-xl border border-white/5">
                {totalProcesados} registros procesados
              </span>
            </div>
          </div>

          {/* Bar Segmented */}
          <div className="h-3.5 w-full bg-surface-950/70 rounded-full overflow-hidden flex gap-1 p-0.5 border border-white/5 shadow-inner">
            {presentes > 0 && (
              <div
                style={{ width: `${(presentes / totalProcesados) * 100}%` }}
                className="bg-lime-400 rounded-full transition-all duration-500 shadow-xs shadow-lime-400/50"
                title={`Presentes a tiempo: ${presentes}`}
              />
            )}
            {tardes > 0 && (
              <div
                style={{ width: `${(tardes / totalProcesados) * 100}%` }}
                className="bg-amber-400 rounded-full transition-all duration-500 shadow-xs shadow-amber-400/50"
                title={`Tardanzas: ${tardes}`}
              />
            )}
            {justificados > 0 && (
              <div
                style={{ width: `${(justificados / totalProcesados) * 100}%` }}
                className="bg-sky-400 rounded-full transition-all duration-500"
                title={`Justificados: ${justificados}`}
              />
            )}
            {abandonos > 0 && (
              <div
                style={{ width: `${(abandonos / totalProcesados) * 100}%` }}
                className="bg-rose-500 rounded-full transition-all duration-500"
                title={`Excepciones: ${abandonos}`}
              />
            )}
            {ausentes > 0 && (
              <div
                style={{ width: `${(ausentes / totalProcesados) * 100}%` }}
                className="bg-slate-600 rounded-full transition-all duration-500"
                title={`Ausentes: ${ausentes}`}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs text-slate-400 font-medium pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-lime-400 shadow-xs shadow-lime-400" />
              <span className="text-slate-300 font-semibold">Puntuales:</span> {presentes}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-slate-300 font-semibold">Tardanzas:</span> {tardes}
            </span>
            {justificados > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-slate-300 font-semibold">Justificados:</span> {justificados}
              </span>
            )}
            {abandonos > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-300 font-semibold">Excepciones:</span> {abandonos}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <span className="text-slate-300 font-semibold">Ausentes:</span> {ausentes}
            </span>
          </div>
        </section>
      )}

      {/* ── Actividad reciente + Accesos rápidos (Bento Grid) ─ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Actividad reciente en vivo */}
        <div className="lg:col-span-2 card-surface p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-400" />
                  <span>Actividad en Tiempo Real</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Últimos registros de entrada y salida hoy</p>
              </div>
              <Link
                href="/asistencias"
                className="text-xs text-primary-300 hover:text-primary-200 font-semibold transition-colors flex items-center gap-1.5 bg-primary-400/10 px-3 py-1.5 rounded-xl border border-primary-400/20 hover:border-primary-400/40"
              >
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-500 gap-3 border border-dashed border-white/5 rounded-2xl">
                <HelpCircle className="w-8 h-8 opacity-40 text-primary-400" />
                <p className="text-sm">Aún no hay marcaciones registradas para el día de hoy.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentActivity.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 hover:bg-white/[0.03] px-2.5 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar */}
                      <img
                        src={item.photoUrl ?? avatarUrl(item.name)}
                        alt={item.name}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-xl ring-1 ring-primary-400/30 object-cover flex-shrink-0 bg-surface-950"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white tracking-tight truncate">{item.name}</p>
                        <p className="text-xs text-slate-400 truncate">{item.action}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <span className="text-xs text-slate-300 font-mono bg-surface-950/70 px-2.5 py-1 rounded-lg border border-white/8">
                        {item.time}
                      </span>
                      <StatusBadge
                        status={item.status}
                        lateMinutes={item.lateMinutes}
                        hasExit={item.hasExit}
                        size="sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse-dot" />
              Sincronización instantánea
            </span>
            <span className="text-[11px] font-mono">Actualizado automáticamente</span>
          </div>
        </div>

        {/* Accesos rápidos & Hardware Status */}
        <div className="card-surface p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="mb-4">
              <h2 className="text-base font-bold text-white tracking-tight">Accesos Rápidos</h2>
              <p className="text-xs text-slate-400 mt-0.5">Módulos principales de administración</p>
            </div>

            <div className="space-y-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/[0.04] border border-transparent hover:border-primary-400/20 transition-all group cursor-pointer"
                  >
                    <div className="bg-primary-400/10 ring-1 ring-primary-400/20 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary-400/20 group-hover:scale-105 transition-all">
                      <Icon className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-200 group-hover:text-primary-300 transition-colors truncate">
                          {link.label}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono">{link.tag}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{link.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Banner de Estado del Sistema */}
          <div className="p-4 rounded-2xl bg-surface-950/60 border border-primary-400/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary-400/15 flex items-center justify-center text-primary-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Presenxa Engine</p>
                <p className="text-[10px] text-slate-400 font-medium">Validación QR & Kioskos</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary-400/15 text-primary-300 border border-primary-400/30 font-bold">
              ONLINE
            </span>
          </div>
        </div>
      </section>

    </div>
  );
}
