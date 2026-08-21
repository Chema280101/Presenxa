import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Doble verificación server-side (el middleware ya protege, pero por seguridad)
  if (!session) redirect("/login");

  return <DashboardShell session={session}>{children}</DashboardShell>;
}

