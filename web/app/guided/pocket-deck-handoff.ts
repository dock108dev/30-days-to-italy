import {
  GUIDED_BEACH_CARD_ID,
  type PocketDeckPracticeEvidence,
} from "../pocket-deck/model";
import type { GuidedBeachSession } from "./model";

export function createGuidedBeachHandoff(
  session: GuidedBeachSession,
): PocketDeckPracticeEvidence | null {
  if (
    session.status !== "complete" ||
    !session.outcomeId ||
    session.attempt < 1 ||
    !session.practicedMoves.includes("request")
  ) {
    return null;
  }

  return {
    id: `guided-beach:attempt-${session.attempt}`,
    cardId: GUIDED_BEACH_CARD_ID,
    source: "guided-beach",
    episodeId: "day-04",
    attempt: session.attempt,
    outcomeId: session.outcomeId,
    practicedMoves: [...session.practicedMoves],
    refresherApplied: session.refresherApplied,
    refresherMethod: session.refresherApplied ? session.refresherMethod : null,
    quantityClarified: session.quantityClarified,
    priceConfirmed: session.priceConfirmed,
    normalReplayCount: session.normalReplayCount,
    carefulReplayCount: session.carefulReplayCount,
    transcriptRevealCount: session.transcriptRevealCount,
  };
}
