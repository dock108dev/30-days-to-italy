export const GUIDED_SESSION_SCHEMA_VERSION = 1 as const;

export const BEACH_OUTCOME_IDS = ["E2-O1", "E2-O2", "E2-O3", "E2-O4"] as const;
export type BeachOutcomeId = (typeof BEACH_OUTCOME_IDS)[number];

export type GuidedSessionStatus = "not_started" | "in_progress" | "complete";
export type RefresherMethod = "inserted" | "rebuilt" | null;
export type BeachPracticeMove = "request" | "quantity" | "price" | "recovery" | "confirm";

export type GuidedBeachSession = {
  schemaVersion: typeof GUIDED_SESSION_SCHEMA_VERSION;
  status: GuidedSessionStatus;
  attempt: number;
  refresherOpened: boolean;
  refresherApplied: boolean;
  refresherMethod: RefresherMethod;
  awaitingRebuiltResponse: boolean;
  normalReplayCount: number;
  carefulReplayCount: number;
  transcriptRevealCount: number;
  outcomeId: BeachOutcomeId | null;
  quantityClarified: boolean;
  priceConfirmed: boolean;
  practicedMoves: BeachPracticeMove[];
};

export function createDefaultGuidedBeachSession(): GuidedBeachSession {
  return {
    schemaVersion: GUIDED_SESSION_SCHEMA_VERSION,
    status: "not_started",
    attempt: 0,
    refresherOpened: false,
    refresherApplied: false,
    refresherMethod: null,
    awaitingRebuiltResponse: false,
    normalReplayCount: 0,
    carefulReplayCount: 0,
    transcriptRevealCount: 0,
    outcomeId: null,
    quantityClarified: false,
    priceConfirmed: false,
    practicedMoves: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

export function isBeachOutcomeId(value: unknown): value is BeachOutcomeId {
  return typeof value === "string" && BEACH_OUTCOME_IDS.includes(value as BeachOutcomeId);
}

const PRACTICE_MOVES: BeachPracticeMove[] = ["request", "quantity", "price", "recovery", "confirm"];

export function normalizeGuidedBeachSession(value: unknown): GuidedBeachSession {
  const defaults = createDefaultGuidedBeachSession();
  if (!isRecord(value) || value.schemaVersion !== GUIDED_SESSION_SCHEMA_VERSION) return defaults;

  const requestedStatus =
    value.status === "in_progress" || value.status === "complete" || value.status === "not_started"
      ? value.status
      : "not_started";
  const outcomeId = isBeachOutcomeId(value.outcomeId) ? value.outcomeId : null;
  const attempt = safeCount(value.attempt);
  const practicedMoves = Array.isArray(value.practicedMoves)
    ? [
        ...new Set(
          value.practicedMoves.filter(
            (move): move is BeachPracticeMove =>
              typeof move === "string" && PRACTICE_MOVES.includes(move as BeachPracticeMove),
          ),
        ),
      ]
    : [];

  if (requestedStatus === "not_started" || attempt < 1) return defaults;

  const status: GuidedSessionStatus = requestedStatus === "complete" && outcomeId
    ? "complete"
    : "in_progress";
  const refresherOpened = value.refresherOpened === true;
  const requestedApplied = refresherOpened && value.refresherApplied === true;
  const requestedMethod = value.refresherMethod === "inserted" || value.refresherMethod === "rebuilt"
    ? value.refresherMethod
    : null;
  const refresherApplied = requestedApplied && requestedMethod !== null;

  return {
    schemaVersion: GUIDED_SESSION_SCHEMA_VERSION,
    status,
    attempt,
    refresherOpened,
    refresherApplied,
    refresherMethod: refresherApplied ? requestedMethod : null,
    awaitingRebuiltResponse:
      status === "in_progress" &&
      refresherOpened &&
      !refresherApplied &&
      value.awaitingRebuiltResponse === true,
    normalReplayCount: safeCount(value.normalReplayCount),
    carefulReplayCount: safeCount(value.carefulReplayCount),
    transcriptRevealCount: safeCount(value.transcriptRevealCount),
    outcomeId: status === "complete" ? outcomeId : null,
    quantityClarified: value.quantityClarified === true,
    priceConfirmed: value.priceConfirmed === true,
    practicedMoves,
  };
}
