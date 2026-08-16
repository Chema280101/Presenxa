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
} from "lucide-react";
import { prisma } from "@asistencias/db";
import { auth } from "@/auth";
import { startOfDay, endOfDay } from "date-fns";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

// ── Helpers ──────────────────────────────────────────────────
function avatarUrl(name: string) {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=16a34a&textColor=ffffff`;
}

const quickLinks = [
  { href: "/asistencias", label: "Registro de Asistencias", icon: Clock, desc: "Aperturas, cierres y justificantes" },
  { href: "/usuarios",    label: "Gestionar Usuarios",     icon: Users, desc: "Altas, roles y credenciales QR" },
  { href: "/sedes",       label: "Configurar Sedes",       icon: MapPin, desc: "Geocercas GPS y perímetros" },
  { href: "/reportes",    label: "Métricas y Reportes",    icon: BarChart3, desc: "Exportar Excel / CSV y KPIs" },
  { href: "/kiosks",      label: "Dispositivos Kiosk",     icon: QrCode, desc: "Totems y tokens de emparejamiento" },
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

  // ── Conteos de estado del día de hoy ────────────────────────
  const [presentes, tardes, ausentes, abandonos, justificados, recentRaw] = await Promise.all([
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
    // Últimas 8 actividades con entrada o salida hoy
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
  ]);

  // Calcular tardanzas promedio
  const tardanzasDetalle = await prisma.attendance.aggregate({
    where: {
      date: todayStart,
      status: "TARDE",
      lateMinutes: { not: null },
      ...(organizationId ? { user: { organizationId } } : {}),
    },
    _avg: { lateMinutes: true },
  });

  const avgLate = Math.round(tardanzasDetalle._avg.lateMinutes ?? 0);

  // Total empleados activos en la org
  const totalEmpleados = await prisma.user.count({
    where: {
      isActive: true,
      role: { in: ["EMPLEADO", "ALUMNO"] },
      ...(organizationId ? { organizationId } : {}),
    },
  });

  // Construir actividad reciente
  const recentActivity = recentRaw.map((att) => {
    const name = `${att.user.firstName} ${att.user.lastName}`;
    const lastTime = att.exitTime ?? att.entryTime;
    const timeStr = lastTime
      ? lastTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
      : "--:--";
    const action =
      att.status === "TARDE"           ? "Tardanza registrada"
      : att.status === "ABANDONO_PUESTO" ? "Fuera de zona"
      : att.exitTime                     ? "Salida registrada"
      : "Entrada registrada";

    return {
      name,
      photoUrl: att.user.photoUrl,
      action,
      time: timeStr,
      status: att.status as string,
      lateMinutes: att.lateMinutes,
    };
  });

  const todayLabel = today.toLocaleDateString("es-PE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalProcesados = presentes + tardes + ausentes + abandonos + justificados;
  const puntualidadRate = totalProcesados > 0 ? Math.round((presentes / (presentes + tardes || 1)) * 100) : 100;

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="gradient-brand w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Panel General de Control
              </h1>
            </div>
          </div>
          <p className="text-slate-400 text-sm capitalize flex items-center gap-2">
            <span>{todayLabel}</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400 font-medium">Tiempo real activo</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="card-surface px-3.5 py-2 flex items-center gap-2.5 text-xs text-slate-300">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-medium">Geofencing & Biometría Online</span>
          </div>
          <Link
            href="/reportes"
            className="gradient-brand px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            Reporte Mensual
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── Stat Cards ──────────────────────────────────────── */}
      <section
        aria-label="Resumen del día"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        <StatCard
          label="Presentes Hoy"
          value={presentes + tardes}
          sub={`de ${totalEmpleados} colaboradores`}
          icon={CheckCircle2}
          variant="success"
          trend={{ value: `${puntualidadRate}% a tiempo`, isPositive: puntualidadRate >= 80 }}
        />
        <StatCard
          label="Tardanzas"
          value={tardes}
          sub={avgLate > 0 ? `Promedio ${avgLate} min tarde` : "Sin demoras registradas"}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          label="Ausencias"
          value={ausentes}
          sub={justificados > 0 ? `${justificados} justificadas` : "Sin justificar"}
          icon={XCircle}
          variant="danger"
        />
        <StatCard
          label="Fuera de Zona"
          value={abandonos}
          sub={abandonos === 1 ? "1 alerta de perímetro" : `${abandonos} alertas de perímetro`}
          icon={AlertTriangle}
          variant={abandonos > 0 ? "warning" : "default"}
        />
      </section>

      {/* ── Barra de Distribución del Día ───────────────────── */}
      {totalProcesados > 0 && (
        <section className="card-surface p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Distribución de Asistencias de la Jornada
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total procesados: {totalProcesados}
            </span>
          </div>

          {/* Bar Segmented */}
          <div className="h-3 w-full bg-surface-600 rounded-full overflow-hidden flex gap-0.5 p-0.5">
            {presentes > 0 && (
              <div
                style={{ width: `${(presentes / totalProcesados) * 100}%` }}
                className="bg-emerald-500 rounded-full transition-all duration-500"
                title={`Presentes a tiempo: ${presentes}`}
              />
            )}
            {tardes > 0 && (
              <div
                style={{ width: `${(tardes / totalProcesados) * 100}%` }}
                className="bg-amber-500 rounded-full transition-all duration-500"
                title={`Tardanzas: ${tardes}`}
              />
            )}
            {justificados > 0 && (
              <div
                style={{ width: `${(justificados / totalProcesados) * 100}%` }}
                className="bg-sky-500 rounded-full transition-all duration-500"
                title={`Justificados: ${justificados}`}
              />
            )}
            {abandonos > 0 && (
              <div
                style={{ width: `${(abandonos / totalProcesados) * 100}%` }}
                className="bg-rose-600 rounded-full transition-all duration-500"
                title={`Fuera de zona: ${abandonos}`}
              />
            )}
            {ausentes > 0 && (
              <div
                style={{ width: `${(ausentes / totalProcesados) * 100}%` }}
                className="bg-rose-500 rounded-full transition-all duration-500"
                title={`Ausentes: ${ausentes}`}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Puntuales ({presentes})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Tardanzas ({tardes})
            </span>
            {justificados > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Justificados ({justificados})
              </span>
            )}
            {abandonos > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Fuera de Zona ({abandonos})
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Ausentes ({ausentes})
            </span>
          </div>
        </section>
      )}

      {/* ── Actividad reciente + Accesos rápidos ────────────── */}
      <section className="grid lg:grid-cols-3 gap-6">

        {/* Actividad reciente */}
        <div className="lg:col-span-2 card-surface p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white">Actividad en Tiempo Real</h2>
              <p className="text-xs text-slate-400 mt-0.5">Últimos registros de entrada y salida hoy</p>
            </div>
            <Link
              href="/asistencias"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3 border border-dashed border-white/5 rounded-2xl">
              <HelpCircle className="w-8 h-8 opacity-40 text-emerald-400" />
              <p className="text-sm">Aún no hay marcaciones registradas para el día de hoy.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentActivity.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3.5 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Avatar */}
                    <img
                      src={item.photoUrl ?? avatarUrl(item.name)}
                      alt={item.name}
                      width={38}
                      height={38}
                      className="w-9 h-9 rounded-xl ring-1 ring-emerald-500/30 object-cover flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white tracking-tight">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.action}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <span className="text-xs text-slate-400 font-mono bg-black/30 px-2.5 py-1 rounded-lg border border-white/5">
                      {item.time}
                    </span>
                    <StatusBadge status={item.status} lateMinutes={item.lateMinutes} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="card-surface p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-1">Accesos Rápidos</h2>
            <p className="text-xs text-slate-400 mb-5">Módulos principales de gestión</p>
            <div className="space-y-2.5">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-emerald-500/20 transition-all group"
                >
                  <div className="bg-emerald-500/10 ring-1 ring-emerald-500/20 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                    <link.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors truncate">
                      {link.label}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{link.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 ml-auto transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <p className="text-[11px] text-slate-500">
              AsistControl Enterprise v1.0.0
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
