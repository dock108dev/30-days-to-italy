import { normalize, type GameState, type PhraseId } from "../game/model";
import {
  GUIDED_SESSION_SCHEMA_VERSION,
  createDefaultGuidedBeachSession,
  isBeachOutcomeId,
  type BeachOutcomeId,
  type BeachPracticeMove,
  type GuidedBeachSession,
} from "./model";

function addMove(state: GuidedBeachSession, move: BeachPracticeMove): GuidedBeachSession {
  return state.practicedMoves.includes(move)
    ? state
    : { ...state, practicedMoves: [...state.practicedMoves, move] };
}

export function beginGuidedBeachSession(state: GuidedBeachSession): GuidedBeachSession {
  return {
    ...createDefaultGuidedBeachSession(),
    status: "in_progress",
    attempt: Math.max(1, state.attempt + 1),
  };
}

export function recordGuidedSupport(
  state: GuidedBeachSession,
  kind: "normalReplayCount" | "carefulReplayCount" | "transcriptRevealCount",
): GuidedBeachSession {
  if (state.status !== "in_progress") return state;
  return { ...state, [kind]: state[kind] + 1 };
}

export function recordGuidedRefresherOpened(
  state: GuidedBeachSession,
  phraseId: PhraseId,
): GuidedBeachSession {
  if (state.status !== "in_progress" || phraseId !== "need") return state;
  return { ...state, refresherOpened: true };
}

export function applyInsertedGuidedRefresher(
  state: GuidedBeachSession,
  phraseId: PhraseId,
): GuidedBeachSession {
  if (state.status !== "in_progress" || phraseId !== "need") return state;
  return {
    ...state,
    refresherOpened: true,
    refresherApplied: true,
    refresherMethod: "inserted",
    awaitingRebuiltResponse: false,
  };
}

export function beginRebuiltGuidedRefresher(
  state: GuidedBeachSession,
  phraseId: PhraseId,
): GuidedBeachSession {
  if (state.status !== "in_progress" || phraseId !== "need") return state;
  return {
    ...state,
    refresherOpened: true,
    awaitingRebuiltResponse: true,
  };
}

function hasItalianRequestFrame(raw: string): boolean {
  const value = normalize(raw);
  return ["mi serve", "mi servono", "vorrei", "lettino", "ombrellone"].some((term) =>
    value.includes(term),
  );
}

function hasRecoveryFrame(raw: string): boolean {
  const value = normalize(raw);
  return ["non capisco", "non ho capito", "puo ripetere", "uno o due"].some((term) =>
    value.includes(term),
  );
}

function hasPriceFrame(raw: string): boolean {
  const value = normalize(raw);
  return ["quanto costa", "quanto costano", "prezzo"].some((term) => value.includes(term));
}

export function observeGuidedBeachResponse(
  state: GuidedBeachSession,
  before: GameState,
  raw: string,
  after: GameState,
): GuidedBeachSession {
  if (state.status !== "in_progress" || before.episodeId !== "day-04" || after.episodeId !== "day-04") {
    return state;
  }

  let next = state;
  if (
    before.turnId === "e02_01_need" &&
    after.turnId !== before.turnId &&
    after.turnId !== "e02_08_exit"
  ) {
    next = addMove(next, "request");
  }
  if (
    (before.turnId === "e02_02_standard_offer" || before.turnId === "e02_03_quantity") &&
    after.turnId === "e02_04_custom"
  ) {
    next = addMove({ ...next, quantityClarified: true }, "quantity");
  }
  if (hasPriceFrame(raw)) next = addMove(next, "price");
  if (!before.pendingOutcome && after.pendingOutcome?.startsWith("E2-")) {
    if (after.pendingOutcome !== "E2-O4") {
      next = addMove({ ...next, priceConfirmed: true }, "confirm");
    }
  }
  if (hasRecoveryFrame(raw)) next = addMove(next, "recovery");

  if (next.awaitingRebuiltResponse && hasItalianRequestFrame(raw)) {
    next = addMove(
      {
        ...next,
        refresherApplied: true,
        refresherMethod: "rebuilt",
        awaitingRebuiltResponse: false,
      },
      "request",
    );
  }
  return next;
}

export function completeGuidedBeachSession(
  state: GuidedBeachSession,
  outcomeId: BeachOutcomeId,
): GuidedBeachSession {
  if (state.status !== "in_progress") return state;
  return {
    ...state,
    schemaVersion: GUIDED_SESSION_SCHEMA_VERSION,
    status: "complete",
    outcomeId,
    awaitingRebuiltResponse: false,
  };
}

export function reconcileGuidedBeachSession(
  state: GuidedBeachSession,
  game: GameState,
): GuidedBeachSession {
  if (
    state.status === "in_progress" &&
    game.episodeId === "day-04" &&
    game.status === "resolved" &&
    isBeachOutcomeId(game.outcome?.id)
  ) {
    return completeGuidedBeachSession(state, game.outcome.id);
  }
  return state;
}
