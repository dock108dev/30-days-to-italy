import type {
  EpisodeRefresherEvidence,
  EpisodeResult,
  Feedback,
  GameState,
  Outcome,
  PhraseExample,
  PhraseId,
  Scene,
  SupportRecord,
  Turn,
} from "../game/model";
import type { EpisodeId, SeasonEpisode } from "./manifest";

export const OBSERVED_MOVES = [
  "identify",
  "request",
  "quantity",
  "preference",
  "location",
  "price",
  "recovery",
  "confirm",
  "decline",
  "pay",
  "boundary",
  "problem",
] as const;

export type ObservedMove = (typeof OBSERVED_MOVES)[number];

export type VerifiedEpisodeFacts = {
  quantityClarified?: boolean;
  priceConfirmed?: boolean;
  destinationEstablished?: boolean;
  preferenceSelected?: string;
  problemReported?: boolean;
  alternativeSelected?: boolean;
  commitmentConfirmed?: boolean;
  routeConfirmed?: boolean;
  correctionAccepted?: boolean;
  refundConfirmed?: boolean;
};

export type EpisodeObservation = {
  moves: readonly ObservedMove[];
  facts?: VerifiedEpisodeFacts;
};

export type HistoryIdFactory = () => string;

export type EpisodeRuntime = {
  moveToTurn(
    state: GameState,
    turnId: string,
    updates?: Partial<GameState>,
    systemText?: string,
    createId?: HistoryIdFactory,
  ): GameState;
  queueTerminal(
    state: GameState,
    turnId: string,
    outcomeId: string,
    updates?: Partial<GameState>,
    createId?: HistoryIdFactory,
  ): GameState;
  resolveOutcome(
    state: GameState,
    outcomeId: string,
    updates?: Partial<GameState>,
    feedback?: Feedback,
    createId?: HistoryIdFactory,
  ): GameState;
};

export type EpisodeResponseContext = {
  state: GameState;
  normalized: string;
  raw: string;
  createId: HistoryIdFactory;
  runtime: EpisodeRuntime;
};

export type EpisodeObservationContext = {
  before: GameState;
  after: GameState;
  normalized: string;
  raw: string;
};

export type EpisodeResultContext = {
  state: GameState;
  definition: EpisodeDefinition;
  outcomeId: string;
};

export type EpisodeDefinition = SeasonEpisode & {
  status: "implemented";
  sceneId: NonNullable<SeasonEpisode["sceneId"]>;
  scene: Scene;
  turns: Readonly<Record<string, Turn>>;
  outcomes: Readonly<Record<string, Outcome>>;
  terminalOutcomeTurns: Readonly<Record<string, readonly string[]>>;
  defaultPhrase?: PhraseId;
  phraseExamples?: Partial<Record<PhraseId, PhraseExample>>;
  initialTurn?(state: GameState): string;
  evaluateResponse(context: EpisodeResponseContext): GameState;
  observeResponse(context: EpisodeObservationContext): EpisodeObservation;
  adminSeed(): Partial<GameState>;
  buildResult(context: EpisodeResultContext): EpisodeResult;
  /** Legacy episode-level marker; completion is governed only by completionOutcomeIds. */
  terminalBehavior?: "resolve";
  completionOutcomeIds?: readonly string[];
};

export function mergeVerifiedFacts(
  current: VerifiedEpisodeFacts,
  incoming: VerifiedEpisodeFacts = {},
): VerifiedEpisodeFacts {
  return {
    ...current,
    ...incoming,
    preferenceSelected:
      typeof incoming.preferenceSelected === "string"
        ? incoming.preferenceSelected.slice(0, 80)
        : current.preferenceSelected,
  };
}

export function buildObservedEpisodeResult({
  state,
  definition,
  outcomeId,
}: EpisodeResultContext): EpisodeResult {
  const prior = state.episodeResults[definition.id] ?? [];
  const attempt = prior.reduce((maximum, result) => Math.max(maximum, result.attempt), 0) + 1;
  const support: SupportRecord = state.support[definition.scene.id] ?? {
    replay: 0,
    careful: 0,
    transcript: 0,
  };
  const refresher: EpisodeRefresherEvidence =
    state.episodeRefreshers[definition.id] ?? { opened: 0, applied: 0, method: null };
  return {
    episodeId: definition.id,
    attempt,
    outcomeId,
    observedMoves: [...state.observedMoves],
    verifiedFacts: { ...state.verifiedFacts },
    response: state.lastResponse.slice(0, 500),
    support,
    refresher,
  };
}

export function observation(
  moves: readonly ObservedMove[],
  facts?: VerifiedEpisodeFacts,
): EpisodeObservation {
  return { moves, facts };
}

export function noObservation(): EpisodeObservation {
  return { moves: [] };
}

export function authoredTurn(
  id: string,
  npc: string,
  text: string,
  cue: string,
  terminal = false,
): Turn {
  return {
    id,
    npc,
    text,
    normal: `/audio/normal/${id}.m4a`,
    careful: `/audio/careful/${id}.m4a`,
    cue,
    ...(terminal ? { terminal: true } : {}),
  };
}

export function isAcceptedTransition(before: GameState, after: GameState): boolean {
  return (
    after.turnId !== before.turnId ||
    after.status !== before.status ||
    after.pendingOutcome !== before.pendingOutcome
  );
}

export function episodeResultFor(
  results: Partial<Record<EpisodeId, EpisodeResult[]>>,
  episodeId: EpisodeId,
): EpisodeResult | null {
  return (results[episodeId] ?? []).reduce<EpisodeResult | null>(
    (latest, candidate) => (!latest || candidate.attempt > latest.attempt ? candidate : latest),
    null,
  );
}
