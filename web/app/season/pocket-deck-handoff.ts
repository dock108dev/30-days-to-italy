import type { GameState } from "../game/model";
import type { PocketDeckPracticeEvidence } from "../pocket-deck/model";
import { EPISODE_BY_ID } from "./manifest";
import { episodeResultFor } from "./types";

export function createSeasonEpisodeHandoff(game: GameState): PocketDeckPracticeEvidence | null {
  if (game.episodeId === "day-04") return null;
  const episode = EPISODE_BY_ID.get(game.episodeId);
  const result = episodeResultFor(game.episodeResults, game.episodeId);
  if (!episode?.pocketCardId || !result || !game.outcome || game.status === "active") return null;
  if (result.observedMoves.length === 0) return null;
  const practicedMoves = result.observedMoves;
  const refresher = result.refresher;
  return {
    id: `season:${game.episodeId}:attempt-${result.attempt}:${episode.pocketCardId}`,
    cardId: episode.pocketCardId,
    source: "season-episode",
    episodeId: game.episodeId,
    attempt: result.attempt,
    outcomeId: result.outcomeId,
    practicedMoves,
    refresherApplied: (refresher?.applied ?? 0) > 0,
    refresherMethod: (refresher?.applied ?? 0) > 0 ? refresher?.method ?? null : null,
    quantityClarified: result.verifiedFacts.quantityClarified === true,
    priceConfirmed: result.verifiedFacts.priceConfirmed === true,
    preferenceSelected: result.verifiedFacts.preferenceSelected ?? null,
    normalReplayCount: result.support.replay,
    carefulReplayCount: result.support.careful,
    transcriptRevealCount: result.support.transcript,
  };
}
