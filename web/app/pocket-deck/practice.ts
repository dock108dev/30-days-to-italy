import type { PocketDeckPracticeEvidence } from "./model";

export type PocketDeckPracticeSummary = {
  reminder: string;
  support: string;
};

function outcomeReminder(evidence: PocketDeckPracticeEvidence): string {
  if (evidence.source === "season-episode" || evidence.episodeId !== "day-04") {
    const moves = evidence.practicedMoves.slice(0, 3).join(", ");
    return `You completed Day ${Number(evidence.episodeId.slice(4))} using ${moves || "a practical response"}.`;
  }
  if (evidence.outcomeId === "E2-O4") {
    return "You left cleanly without accepting a beach rental or charge.";
  }
  if (evidence.outcomeId === "E2-O3") {
    return "You kept the request to one beach chair and completed the smaller rental.";
  }
  if (evidence.outcomeId === "E2-O2") {
    return "The two-chair package went through. Next time, listen for una or due before confirming.";
  }
  if (evidence.quantityClarified && evidence.priceConfirmed) {
    return "You clarified one chair, not two, and confirmed the €22 option before paying.";
  }
  if (evidence.quantityClarified) {
    return "You clarified one chair, not two, before the beach rental moved forward.";
  }
  if (evidence.priceConfirmed) {
    return "You confirmed the quoted beach option before paying.";
  }
  return "You used the beach request and completed the rental conversation.";
}

function supportReminder(evidence: PocketDeckPracticeEvidence): string {
  const refreshedPhrase = evidence.source === "guided-beach"
    ? "Mi servono"
    : "the Italian for this situation";
  if (evidence.refresherMethod === "rebuilt") {
    return `You reached for an English refresher, rebuilt ${refreshedPhrase} yourself, and returned to the same conversation.`;
  }
  if (evidence.refresherMethod === "inserted") {
    return `You reached for an English refresher, used ${refreshedPhrase}, and returned to the same conversation.`;
  }

  const listeningSupport =
    evidence.normalReplayCount + evidence.carefulReplayCount + evidence.transcriptRevealCount;
  if (listeningSupport === 0) {
    return "You formed the request without a language refresher or listening support.";
  }
  return "You formed the request without a language refresher and used listening support when needed.";
}

export function summarizePocketDeckPractice(
  evidence: PocketDeckPracticeEvidence,
): PocketDeckPracticeSummary {
  return {
    reminder: outcomeReminder(evidence),
    support: supportReminder(evidence),
  };
}
