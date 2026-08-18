import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { buildSummary } from "@/lib/summary";
import { SessionProvider } from "@/components/app/SessionProvider";
import { AppShell } from "@/components/app/AppShell";
import { ensureTodayTasks } from "@/lib/tasks";
import { boot } from "@/lib/boot";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  boot();
  const user = await getSessionUser();
  if (!user) redirect("/giris");

  ensureTodayTasks(user.id);
  const summary = buildSummary(user);

  return (
    <SessionProvider initial={summary}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
