"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Card, PageLoader, ProgressBar, SectionTitle } from "@/components/ui";
import { IconTile } from "@/components/visuals/Icon";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  key: string;
  title: string;
  description: string;
  iconKey: string;
  progress: number;
  target: number;
  completed: boolean;
  rewardXp: number;
  rewardPoints: number;
  rewardCoins: number;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (res.ok) setTasks((await res.json()).tasks);
    })();
  }, []);

  if (!tasks) return <PageLoader />;

  const done = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden" padded={false}>
        <div
          className="p-5 sm:p-7"
          style={{ background: "linear-gradient(140deg,#DCFCE7 0%,#F0FDF4 50%,#EEF4FF 100%)" }}
        >
          <h1 className="text-2xl font-black text-ink-900 sm:text-3xl">Günlük Görevler</h1>
          <p className="mt-1 text-sm text-ink-600">
            Her gece yenilenir. Tamamladığın görevler XP, puan ve jeton kazandırır.
          </p>
          <div className="mt-4 max-w-sm">
            <ProgressBar
              value={done}
              max={tasks.length}
              gradient="linear-gradient(90deg,#34D399,#059669)"
            />
            <p className="mt-2 text-sm font-bold text-ink-600">
              {done} / {tasks.length} görev tamamlandı
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Bugünün görevleri" />
        <div className="space-y-3">
          {tasks.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex gap-4 rounded-2xl border p-4 transition",
                t.completed ? "border-mint-200 bg-mint-100/40" : "border-ink-100 bg-white",
              )}
            >
              <IconTile name={t.iconKey} tier={t.completed ? "gold" : "neutral"} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-extrabold text-ink-900">{t.title}</p>
                  {t.completed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-mint-500 px-2 py-0.5 text-[11px] font-black text-white">
                      <CheckCircle2 size={12} /> Tamamlandı
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-ink-400">{t.description}</p>
                <ProgressBar
                  className="mt-3"
                  value={t.progress}
                  max={t.target}
                  gradient={
                    t.completed
                      ? "linear-gradient(90deg,#34D399,#059669)"
                      : "linear-gradient(90deg,#8FB6FF,#3568F0)"
                  }
                />
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold">
                  <span className="text-ink-500">
                    {t.progress} / {t.target}
                  </span>
                  <span className="text-brand-600">+{t.rewardXp} XP</span>
                  {t.rewardPoints > 0 && <span className="text-mint-600">+{t.rewardPoints} puan</span>}
                  {t.rewardCoins > 0 && <span className="text-sun-600">+{t.rewardCoins} jeton</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
