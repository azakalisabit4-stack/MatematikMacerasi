import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { Logo } from "@/components/app/Logo";
import { Climber, CloudShape } from "@/components/visuals/Scenes";
import { LeagueBadge } from "@/components/visuals/LeagueBadge";
import { ROLE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (user) redirect(user.roleKey === ROLE.HOCAEFENDI ? "/hocaefendi" : "/panel");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ------------------------------------------------ GÖRSEL PANEL */}
      <section className="relative hidden overflow-hidden lg:block">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(160deg,#2B3A5E 0%,#1D3EB1 45%,#3568F0 100%)" }}
        />
        <CloudShape className="absolute left-[8%] top-[14%] w-44 opacity-25" />
        <CloudShape className="absolute right-[12%] top-[32%] w-32 opacity-20" />
        <CloudShape className="absolute left-[26%] bottom-[22%] w-52 opacity-15" />

        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo size={44} />

          <div className="max-w-md">
            <h1 className="text-4xl font-black leading-tight text-white">
              Oyun oyna,
              <br />
              farkında olmadan
              <br />
              <span className="text-sun-300">matematik öğren.</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-200">
              Ritmik sayma tırmanışları, çarpım tablosu yarışları, gerçek zamanlı düellolar,
              ligler, başarımlar ve günlük görevler. Hepsi tek bir macerada.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {["pirinc", "bronz", "gumus", "altin", "elmas", "sampiyon"].map((k) => (
                <LeagueBadge key={k} leagueKey={k} size={34} />
              ))}
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div className="flex items-end gap-4">
              <Climber size={92} mood="cheer" className="anim-bob" />
              <div className="mb-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-sm font-bold text-white">7&apos;şer ritmik say, zirveye tırman!</p>
                <p className="text-xs text-ink-200">20 soru · 75 saniye · süre bonusu</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ FORM */}
      <section className="flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/">
              <span className="inline-flex items-center gap-2.5 rounded-2xl bg-ink-800 px-3 py-2">
                <Logo size={34} />
              </span>
            </Link>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
