import Link from "next/link";
import { prisma } from "@asistencias/db";
import { auth } from "@/auth";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { Activity, Clock, ShieldCheck, MapPin, ChevronRight, Fingerprint, ScanFace, FileSignature, ArrowRight, UserCheck, Smartphone, Watch, Users, AlertTriangle, Cpu } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { StatCard } from "@/components/ui/StatCard";

// Componentes del nuevo Command Center Pro
import { DashboardGreetingHeader } from "@/components/dashboard/DashboardGreetingHeader";
import { PendingApprovalBanner } from "@/components/dashboard/PendingApprovalBanner";
import { KpiCardsSection } from "@/components/dashboard/KpiCardsSection";
import { KioskTrafficChart } from "@/components/dashboard/KioskTrafficChart";
import { OperationalCompliance } from "@/components/dashboard/OperationalCompliance";
import { LiveAttendanceStream } from "@/components/dashboard/LiveAttendanceStream";

// ─────────────────────────────────────────────────────────────
// Server Component — consulta la BD en tiempo real
// ─────────────────────────────────────────────────────────────
export default async function DashboardPage(props: { searchParams?: Promise<{ range?: string }> }) {
  const session = await auth();
  const organizationId = session?.user?.organizationId;

  const searchParams = await props.searchParams;
  const range = searchParams?.range || "hoy";
  
  let targetDate = new Date();
  if (range === "ayer") {
    targetDate = subDays(new Date(), 1);
  }
  
  const todayStart = startOfDay(targetDate);
  const todayEnd = endOfDay(targetDate);
  const lastWeekStart = startOfDay(subDays(targetDate, 7));

  let userDb: any = null;
  if (session?.user?.id) {
    userDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true, location: true }
    });
  }

  // ── Conteos de estado del día de hoy ──
  let presentes = 0;
  let tardes = 0;
  let ausentes = 0;
  let abandonos = 0;
  let justificados = 0;
  let avgLate = 0;
  let totalEmpleados = 0;
  let statusCountsLastWeek: any[] = [];
  
  let rawAttendances: any[] = [];
  let pendingException: any = null;
  let trafficSlots: any[] = [];
  let peakCount = 0;
  let methodsDist = { qr: 0, nfc: 0, pin: 0 };
  let departmentData: any[] = [];
  let totalKiosksCount = 0;
  let onlineKiosksCount = 0;

  try {
    const [
      statusCounts, 
      tardanzasDetalle, 
      countEmpleados,
      recentActivity,
      pendingRecord,
      trafficRaw,
      methodsCount,
      depts,
      kiosks,
      lastWeekStats
    ] = await Promise.all([
      prisma.attendance.groupBy({
        by: ["status"],
        where: { date: todayStart, ...(organizationId ? { user: { organizationId } } : {}) },
        _count: { _all: true },
      }),
      prisma.attendance.aggregate({
        where: { date: todayStart, status: "TARDE", lateMinutes: { not: null }, ...(organizationId ? { user: { organizationId } } : {}) },
        _avg: { lateMinutes: true },
      }),
      prisma.user.count({
        where: { isActive: true, role: "EMPLEADO", ...(organizationId ? { organizationId } : {}) },
      }),
      // Stream en Vivo (últimas 8 marcaciones)
      prisma.attendance.findMany({
        where: { date: todayStart, entryTime: { not: null }, ...(organizationId ? { user: { organizationId } } : {}) },
        orderBy: { entryTime: 'desc' },
        take: 8,
        include: { user: { include: { department: true } }, kiosk: true }
      }),
      // Excepción pendiente de aprobación
      prisma.attendance.findFirst({
        where: { date: todayStart, requiresManagerApproval: true, ...(organizationId ? { user: { organizationId } } : {}) },
        include: { user: true, kiosk: true }
      }),
      // Histograma 15 mins (RAW SQL)
      prisma.$queryRaw`
        SELECT 
          date_trunc('hour', "entryTime") + 
          (((extract(minute from "entryTime")::integer / 15)) * 15) * interval '1 minute' as interval,
          count(*)::integer as count
        FROM attendances
        WHERE "date" = ${todayStart} AND "entryTime" IS NOT NULL
        GROUP BY interval
        ORDER BY interval ASC
      `,
      // Distribución de métodos
      prisma.attendance.groupBy({
        by: ["entryMethod"],
        where: { date: todayStart, entryTime: { not: null }, ...(organizationId ? { user: { organizationId } } : {}) },
        _count: { _all: true }
      }),
      // Departamentos (Para compliance)
      prisma.department.findMany({
        where: { organizationId },
        include: { _count: { select: { users: true } } }
      }),
      // Kioskos (para estado online)
      prisma.kiosk.findMany({
        where: { location: { organizationId } },
        select: { lastSeenAt: true }
      }),
      // Asistencia hace 7 días
      prisma.attendance.groupBy({
        by: ["status"],
        where: { date: lastWeekStart, ...(organizationId ? { user: { organizationId } } : {}) },
        _count: { _all: true },
      })
    ]);

    // Asignaciones base
    const getStatusCount = (statusName: string) => statusCounts.find((s) => s.status === statusName as any)?._count._all ?? 0;
    presentes = getStatusCount("PRESENTE");
    tardes = getStatusCount("TARDE");
    ausentes = getStatusCount("AUSENTE");
    abandonos = getStatusCount("ABANDONO_PUESTO");
    justificados = getStatusCount("JUSTIFICADO");
    avgLate = Math.round(tardanzasDetalle._avg.lateMinutes ?? 0);
    totalEmpleados = countEmpleados;

    // Stream en Vivo
    rawAttendances = recentActivity.map(att => {
      const initials = `${att.user.firstName.charAt(0)}${att.user.lastName.charAt(0)}`;
      return {
        id: att.id,
        initials,
        name: `${att.user.firstName} ${att.user.lastName}`,
        method: att.entryMethod || "KIOSK",
        area: att.user.department?.name || "General",
        kiosk: att.kiosk?.name || "Terminal",
        status: att.status,
        lateDetail: att.lateMinutes ? `+${att.lateMinutes}m` : undefined,
        timeStr: att.entryTime ? att.entryTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " AM" : "",
        avatarColor: att.status === "PRESENTE" ? "emerald" : att.status === "TARDE" ? "rose" : "slate"
      };
    });

    // Exception Banner
    pendingException = pendingRecord;

    // Traffic Chart (Histograma)
    const validTraffic = (trafficRaw as any[]).filter(t => t.interval);
    const maxPico = Math.max(...validTraffic.map(t => t.count), 1);
    peakCount = maxPico;
    
    trafficSlots = validTraffic.map(t => {
      const d = new Date(t.interval);
      const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      return {
        time,
        count: t.count,
        isPeak: t.count === maxPico,
        heightPercent: Math.round((t.count / maxPico) * 100)
      };
    });
    
    // Distribución de métodos
    const totalMethods = methodsCount.reduce((acc, curr) => acc + curr._count._all, 0);
    if (totalMethods > 0) {
      methodsDist.qr = Math.round(((methodsCount.find(m => m.entryMethod === "QR")?._count._all || 0) / totalMethods) * 100);
      methodsDist.nfc = Math.round(((methodsCount.find(m => m.entryMethod === "NFC")?._count._all || 0) / totalMethods) * 100);
      methodsDist.pin = Math.round(((methodsCount.find(m => m.entryMethod === "PIN")?._count._all || 0) / totalMethods) * 100);
    }

    // Cumplimiento por Area
    const attendanceByDept = await prisma.attendance.groupBy({
      by: ["userId"],
      where: { date: todayStart, ...(organizationId ? { user: { organizationId } } : {}) }
    });
    const presentUserIds = new Set(attendanceByDept.map(a => a.userId));

    const allUsers = await prisma.user.findMany({
      where: { isActive: true, role: "EMPLEADO", ...(organizationId ? { organizationId } : {}) },
      select: { id: true, departmentId: true }
    });
    
    departmentData = depts.map((d, index) => {
      const required = d._count.users;
      const usersInDept = allUsers.filter(u => u.departmentId === d.id);
      const current = usersInDept.filter(u => presentUserIds.has(u.id)).length;
      const percentage = required > 0 ? Math.round((current / required) * 100) : 100;
      
      const colors = ["emerald", "cyan", "amber", "rose"];
      const color = colors[index % colors.length];

      return {
        id: d.id,
        code: d.name.substring(0, 2).toUpperCase(),
        name: d.name,
        current,
        required,
        percentage,
        accentColor: color
      };
    });

    // Kioskos Online (vistos en los últimos 5 mins)
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    totalKiosksCount = kiosks.length;
    onlineKiosksCount = kiosks.filter(k => k.lastSeenAt && k.lastSeenAt > fiveMinsAgo).length;
    
    statusCountsLastWeek = lastWeekStats;

  } catch (error) {
    console.error("[DashboardPage] Error loading metrics from database:", error);
  }

  const totalAsistieron = presentes + tardes;
  const puntualidadRate = totalAsistieron > 0 ? Math.round((presentes / totalAsistieron) * 100) : 0;
  const tasaAsistencia = totalEmpleados > 0 ? Math.round((totalAsistieron / totalEmpleados) * 100) : 0;
  
  // Cálculo de tendencia vs semana anterior
  const getStatusCountLastWeek = (statusName: string) => statusCountsLastWeek?.find((s: any) => s.status === statusName as any)?._count._all ?? 0;
  const presentesLastWeek = getStatusCountLastWeek("PRESENTE");
  const tardesLastWeek = getStatusCountLastWeek("TARDE");
  const totalAsistieronLastWeek = presentesLastWeek + tardesLastWeek;
  const tasaAsistenciaLastWeek = totalEmpleados > 0 ? Math.round((totalAsistieronLastWeek / totalEmpleados) * 100) : 0;
  const diffAsistencia = tasaAsistencia - tasaAsistenciaLastWeek;

  const userFirstName = userDb?.firstName || session?.user?.name?.split(" ")[0] || "Administrador";
  const userRoleTitle = userDb?.role === "SUPERADMIN" 
    ? "Super Admin" 
    : userDb?.role === "ADMIN" 
    ? "Administrador" 
    : userDb?.role === "SUPERVISOR" 
    ? "Supervisor" 
    : "Administrador";
  const orgName = userDb?.organization?.name || "Hotel Italia";
  const locName = userDb?.location?.name || "Sede Central";

  const totalMarcacionesHoy = totalAsistieron + ausentes + abandonos + justificados; // Estimado

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-10 text-surface-900 dark:text-surface-100 font-sans transition-colors">
      {/* 0. Executive Greeting & Live Telemetry Header */}
      <DashboardGreetingHeader
        userName={userFirstName}
        userRole={userRoleTitle}
        organizationName={orgName}
        locationName={locName}
      />

      {/* 1. Live Alert Banner (Only if pendingException) */}
      {pendingException && (
        <div className="relative overflow-hidden rounded-2xl bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 p-5 group flex items-start gap-4 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-24 h-24 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <div className="w-10 h-10 rounded-full bg-danger-100 dark:bg-danger-500/20 border border-danger-300 dark:border-danger-500/30 flex items-center justify-center shrink-0">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-danger-500"></span>
            </span>
          </div>
          <div className="flex-1 relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-bold text-danger-700 dark:text-danger-400 text-sm tracking-tight">ALERTA OPERATIVA • EXCEPCIÓN DETECTADA</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-danger-100 dark:bg-danger-500/20 text-danger-700 dark:text-danger-300 border border-danger-300 dark:border-danger-500/30">PRIORIDAD ALTA</span>
            </div>
            <p className="text-surface-700 dark:text-surface-300 text-sm mb-3">
              <span className="font-semibold text-surface-900 dark:text-white">{pendingException.user?.firstName} {pendingException.user?.lastName}</span> ha registrado un intento fallido de acceso biométrico en <span className="font-mono text-primary-600 dark:text-primary-400">Terminal {pendingException.kiosk?.name || 'Kiosk'}</span> a las {pendingException.entryTime?.toLocaleTimeString("es-PE")}. Requiere verificación del supervisor de turno.
            </p>
            <div className="flex items-center gap-3">
              <button className="px-4 py-1.5 rounded-lg bg-danger-500 hover:bg-danger-600 text-white text-xs font-bold transition-colors shadow-md">Resolver Incidencia</button>
              <button className="px-4 py-1.5 rounded-lg bg-surface-200 dark:bg-white/5 hover:bg-surface-300 dark:hover:bg-white/10 text-surface-700 dark:text-surface-300 text-xs font-semibold transition-colors">Ver Registro en CCTV</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          label="Asistencia Global"
          value={`${tasaAsistencia}%`}
          subLabel="Población Activa"
          subValue={`${totalAsistieron} / ${totalEmpleados}`}
          icon={Users}
          variant="emerald"
          trend={totalAsistieronLastWeek > 0 || diffAsistencia !== 0 ? {
            value: `${Math.abs(diffAsistencia)}%`,
            label: "vs semana anterior",
            isPositive: diffAsistencia > 0,
            isNeutral: diffAsistencia === 0
          } : undefined}
        />
        <StatCard
          label="Índice Puntualidad"
          value={`${puntualidadRate}%`}
          subLabel="Incidencias (Tardanzas)"
          subValue={`${tardes} regs`}
          icon={Clock}
          variant="cyan"
          trend={tardes > 0 ? { value: `${avgLate} min`, label: "retraso promedio", isNeutral: true } : undefined}
        />
        <StatCard
          label="Incidencias Críticas"
          value={ausentes + abandonos}
          subLabel="Ausentes / Abandonos"
          subValue={`${ausentes} / ${abandonos}`}
          icon={AlertTriangle}
          variant="amber"
          trend={{ value: `${justificados}`, label: "Justificados", isNeutral: true }}
        />
        <StatCard
          label="Red de Kioscos"
          value={`${onlineKiosksCount}/${totalKiosksCount}`}
          subLabel="Kioscos Inactivos"
          subValue={totalKiosksCount - onlineKiosksCount}
          icon={Cpu}
          variant="indigo"
          trend={{ value: "Online", label: "Monitoreo Activo", isPositive: true }}
        />
      </div>

      {/* 3. Operational Core (Charts & Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* Left Col: Analytics */}
        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
          
          {/* Chart Section */}
          <div className="command-card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 relative z-10">
              <div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white tracking-tight flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                  Curva de Tráfico & Accesos
                </h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Densidad de marcaciones biométricas en intervalos de 15 min.</p>
              </div>
              <div className="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-1 border border-surface-200 dark:border-surface-700 shrink-0">
                <Link href="?range=hoy" className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${range === 'hoy' ? 'bg-white shadow-sm text-surface-900 dark:bg-surface-600 dark:text-white font-semibold' : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'}`}>Hoy</Link>
                <Link href="?range=ayer" className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${range === 'ayer' ? 'bg-white shadow-sm text-surface-900 dark:bg-surface-600 dark:text-white font-semibold' : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'}`}>Ayer</Link>
                <Link href="?range=semana" className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${range === 'semana' ? 'bg-white shadow-sm text-surface-900 dark:bg-surface-600 dark:text-white font-semibold' : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'}`}>Semana</Link>
              </div>
            </div>

            {/* Histogram Mock/Dynamic */}
            <div className="h-56 flex items-end justify-between gap-1 mt-6 border-b border-surface-200 dark:border-surface-700 pb-2 relative z-10">
               {trafficSlots.length > 0 ? trafficSlots.map((slot, i) => (
                 <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    {slot.isPeak && (
                       <div className="absolute -top-8 bg-surface-100 dark:bg-surface-800 border border-info-500/30 text-info-600 dark:text-info-400 text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap shadow-xl">
                         Pico: {slot.count} accesos
                       </div>
                    )}
                    <div 
                      className={`w-full rounded-t-sm transition-all duration-500 ${slot.isPeak ? 'bg-gradient-to-t from-info-500/20 to-info-500 dark:to-info-400 shadow-[0_0_10px_rgba(14,165,233,0.4)] relative' : 'bg-surface-200 dark:bg-surface-700 group-hover:bg-primary-500/40'}`} 
                      style={{ height: `${slot.heightPercent}%` }}
                    >
                      {slot.isPeak && <div className="absolute inset-0 bg-info-400/20 animate-pulse rounded-t-sm"></div>}
                    </div>
                 </div>
               )) : (
                 <div className="w-full flex items-center justify-center text-surface-500 text-sm font-mono pb-10">Sin datos para graficar</div>
               )}
            </div>
            
            <div className="flex justify-between mt-3 text-[10px] font-mono text-surface-500 px-1">
               <span>06:00</span>
               <span>09:00</span>
               <span>12:00</span>
               <span>15:00</span>
               <span>18:00</span>
               <span>21:00</span>
            </div>
          </div>

          {/* Compliance Area Table */}
          <div className="command-card p-6">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-surface-900 dark:text-white tracking-tight">Cumplimiento Operativo por Áreas</h3>
                <Link href="/reportes" className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:text-primary-700 dark:hover:text-primary-300">Ver Reporte →</Link>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-surface-200 dark:border-surface-700 text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wider font-semibold">
                     <th className="pb-3 px-2 font-medium">Departamento</th>
                     <th className="pb-3 px-2 font-medium text-right">Cobertura</th>
                     <th className="pb-3 px-2 font-medium text-center">Status</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm">
                   {departmentData.map((d, i) => (
                     <tr key={i} className="border-b border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                       <td className="py-3 px-2">
                         <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-lg bg-${d.accentColor}-500/10 border border-${d.accentColor}-500/20 flex items-center justify-center text-${d.accentColor}-600 dark:text-${d.accentColor}-400 font-bold text-xs`}>
                             {d.code}
                           </div>
                           <span className="font-semibold text-surface-800 dark:text-surface-200">{d.name}</span>
                         </div>
                       </td>
                       <td className="py-3 px-2">
                         <div className="flex items-center gap-3 justify-end">
                           <span className="font-mono text-surface-600 dark:text-surface-300 text-xs">{d.current} / {d.required}</span>
                           <div className="w-24 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                             <div className={`h-full bg-${d.accentColor}-500 dark:bg-${d.accentColor}-400 rounded-full`} style={{ width: `${d.percentage}%` }}></div>
                           </div>
                         </div>
                       </td>
                       <td className="py-3 px-2 text-center">
                         <span className={`badge-${d.percentage >= 90 ? 'presente' : 'tarde'}`}>
                           {d.percentage >= 90 ? 'ÓPTIMO' : 'ALERTA'}
                         </span>
                       </td>
                     </tr>
                   ))}
                   {departmentData.length === 0 && (
                     <tr>
                       <td colSpan={3} className="py-8 text-center text-surface-500 text-xs font-mono">Sin departamentos configurados</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* Right Col: Live Feed */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="command-card flex flex-col overflow-hidden h-[600px]">
            <div className="p-5 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 flex items-center justify-between sticky top-0 z-20">
               <div>
                 <h3 className="text-base font-bold text-surface-900 dark:text-white tracking-tight flex items-center gap-2">
                   <div className="relative flex h-2.5 w-2.5">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500"></span>
                   </div>
                   Stream en Vivo
                 </h3>
                 <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">Terminales Biométricos</p>
               </div>
               <div className="text-right">
                 <p className="text-xl font-black text-surface-900 dark:text-white">{totalAsistieron + ausentes + tardes}</p>
                 <p className="text-[10px] uppercase font-bold text-surface-500">Transacciones</p>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 scrollbar-subtle space-y-1 relative">
               <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface-50 dark:from-surface-900 to-transparent pointer-events-none z-10"></div>
               
               {rawAttendances.map((att: any, i: number) => (
                 <div key={i} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-surface-100 dark:hover:bg-white/[0.03] transition-colors relative">
                    {i === 0 && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-500 dark:bg-primary-400 rounded-r-full"></div>}
                    <div className="w-9 h-9 rounded-full bg-surface-200 dark:bg-surface-800 border border-surface-300 dark:border-white/10 flex items-center justify-center shrink-0">
                       <span className="text-xs font-bold text-surface-600 dark:text-surface-300">{att.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-semibold text-surface-900 dark:text-white truncate pr-2">{att.name}</p>
                          <span className="text-[10px] font-mono text-surface-500 whitespace-nowrap">{att.timeStr}</span>
                       </div>
                       <div className="flex items-center gap-2 mt-1">
                          <span className={`badge-${att.status.toLowerCase()}`}>
                            {att.status}
                          </span>
                          {att.lateDetail && <span className="text-[10px] font-mono text-warning-600 dark:text-warning-400 font-medium">{att.lateDetail}</span>}
                          <span className="text-[10px] text-surface-500 flex items-center gap-1 ml-auto">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                            {att.kiosk}
                          </span>
                       </div>
                    </div>
                 </div>
               ))}
               
               {rawAttendances.length === 0 && (
                 <div className="text-center py-10 text-sm font-mono text-surface-500">
                   A la espera de marcaciones...
                 </div>
               )}
            </div>
            
            <div className="p-3 border-t border-surface-200 dark:border-white/5 bg-surface-50 dark:bg-surface-900 shrink-0 text-center">
              <Link href="/asistencias" className="inline-block text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors w-full py-1.5 rounded-lg hover:bg-primary-500/10 cursor-pointer">Ver Histórico Completo</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
