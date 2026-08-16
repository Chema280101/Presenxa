import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Doble verificación server-side (el middleware ya protege, pero por seguridad)
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — navegación lateral */}
      <Sidebar />

      {/* Área principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar session={session} />

        {/* Contenido con scroll */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
