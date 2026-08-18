import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { buildSummary } from "@/lib/summary";
import { SessionProvider } from "@/components/app/SessionProvider";
import { AdminShell } from "@/components/admin/AdminShell";
import { ROLE } from "@/lib/constants";
import { boot } from "@/lib/boot";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  boot();
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  // Yetkilendirme SUNUCU tarafında. Arayüzde gizleme yeterli değildir.
  if (user.roleKey !== ROLE.HOCAEFENDI) redirect("/panel");

  return (
    <SessionProvider initial={buildSummary(user)}>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
