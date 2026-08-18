import { ok, requireUser, route } from "@/lib/api";
import { leagueDistribution, leagueLeaderboard, myRanks, pointsLeaderboard } from "@/lib/leaderboards";

export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const user = await requireUser();
  const type = new URL(req.url).searchParams.get("type") ?? "points";
  // Hocaefendi hesapları bu listelerde ASLA yer almaz (sorgu seviyesinde filtrelenir).
  return ok({
    type,
    rows: type === "league" ? leagueLeaderboard(100) : pointsLeaderboard(100),
    distribution: leagueDistribution(),
    me: myRanks(user.id),
  });
});
