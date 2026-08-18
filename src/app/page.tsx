import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { ROLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  if (user.roleKey === ROLE.HOCAEFENDI) redirect("/hocaefendi");
  redirect("/panel");
}
