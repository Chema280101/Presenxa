import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@asistencias/db";
import { DashboardShell, type ShellOrganizationData } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Doble verificación server-side (el middleware ya protege, pero por seguridad)
  if (!session) redirect("/login");

  let organization: ShellOrganizationData | null = null;
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;

  if (orgId) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          name: true,
          logoUrl: true,
          settings: true,
          locations: {
            where: { isActive: true },
            select: { id: true, name: true },
            take: 1,
          },
        },
      });

      if (org) {
        const settings = org.settings as { address?: string | null } | null;
        const firstLoc = org.locations?.[0];
        organization = {
          name: org.name,
          logoUrl: org.logoUrl,
          subtitle: settings?.address ?? null,
          locationName: firstLoc?.name ?? null,
          locationCode: firstLoc?.id ? firstLoc.id.substring(0, 8).toUpperCase() : null,
        };
      }
    } catch {
      // Fallback silencioso a datos de sesión en caso de error transitorio
    }
  }

  return (
    <DashboardShell session={session} organization={organization}>
      {children}
    </DashboardShell>
  );
}

