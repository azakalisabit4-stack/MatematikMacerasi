import { ok, requireUser, route } from "@/lib/api";
import { GAMES, MAP_REGIONS } from "@/lib/constants";
import { listRecords } from "@/lib/games/engine";
import { getProfile } from "@/lib/progress";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const profile = getProfile(user.id);
  const records = listRecords(user.id);

  return ok({
    level: profile.level,
    games: GAMES.map((g) => ({
      key: g.key,
      name: g.name,
      shortName: g.shortName,
      description: g.description,
      renderer: g.renderer,
      category: g.category,
      iconKey: g.iconKey,
      region: g.region,
      durationSec: g.durationSec,
      questionCount: g.questionCount,
      variants: g.variants,
      theme: g.theme,
      minLevel: g.minLevel,
      locked: profile.level < g.minLevel,
      duelable: g.duelable,
      record: records.find((r) => r.gameKey === g.key)?.bestScore ?? 0,
    })),
    regions: MAP_REGIONS,
    records,
  });
});
