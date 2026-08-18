import { notFound } from "next/navigation";

import { GAME_BY_KEY } from "@/lib/constants";
import { GamePlayer } from "@/components/game/GamePlayer";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: Promise<{ gameKey: string }> }) {
  const { gameKey } = await params;
  const game = GAME_BY_KEY[gameKey];
  if (!game) notFound();

  return (
    <GamePlayer
      game={{
        key: game.key,
        name: game.name,
        shortName: game.shortName,
        description: game.description,
        renderer: game.renderer,
        iconKey: game.iconKey,
        durationSec: game.durationSec,
        questionCount: game.questionCount,
        theme: game.theme,
        variants: game.variants,
      }}
    />
  );
}
