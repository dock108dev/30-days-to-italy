import {
  createFeedback,
  detectTeachingPhrase,
  initialPhrasePractice,
  initialState,
  normalize,
  type Feedback,
  type GameState,
  type HistoryItem,
  type PhraseId,
  type SceneId,
  type SupportRecord,
} from "./model";
import {
  IMPLEMENTED_EPISODE_DEFINITIONS,
  implementedEpisode,
  nextImplementedEpisode,
} from "../season/registry";
import {
  mergeVerifiedFacts,
  type EpisodeDefinition,
  type EpisodeRuntime,
  type HistoryIdFactory,
} from "../season/types";
import { EPISODE_IDS, type EpisodeId } from "../season/manifest";

export type { HistoryIdFactory } from "../season/types";

export type ResponseResult =
  | { kind: "teaching"; phraseId: PhraseId; state: GameState }
  | { kind: "advanced"; state: GameState };

export type EpisodeCoordinator = {
  applyResponse(
    state: GameState,
    rawResponse: string,
    createId?: HistoryIdFactory,
  ): ResponseResult;
};

const defaultHistoryId: HistoryIdFactory = () => {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `history-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function appendHistory(
  state: GameState,
  kind: HistoryItem["kind"],
  text: string,
  createId: HistoryIdFactory,
): HistoryItem[] {
  return [...state.history, { id: createId(), kind, text }].slice(-8);
}

export function moveToTurn(
  state: GameState,
  turnId: string,
  updates: Partial<GameState> = {},
  systemText?: string,
  createId: HistoryIdFactory = defaultHistoryId,
): GameState {
  return {
    ...state,
    ...updates,
    turnId,
    attempts: turnId === state.turnId ? state.attempts + 1 : 0,
    history: systemText ? appendHistory(state, "system", systemText, createId) : state.history,
  };
}

export function queueTerminal(
  state: GameState,
  turnId: string,
  outcomeId: string,
  updates: Partial<GameState> = {},
  createId: HistoryIdFactory = defaultHistoryId,
): GameState {
  const definition = implementedEpisode(state.episodeId);
  if (!definition?.turns[turnId]?.terminal || !definition.outcomes[outcomeId]) return state;
  return moveToTurn(state, turnId, { ...updates, pendingOutcome: outcomeId }, undefined, createId);
}

function withEpisodeResult(state: GameState, outcomeId: string): GameState {
  const definition = implementedEpisode(state.episodeId);
  if (!definition) return state;
  const result = definition.buildResult({ state, definition, outcomeId });
  const existing = state.episodeResults[state.episodeId] ?? [];
  return {
    ...state,
    episodeResults: {
      ...state.episodeResults,
      [state.episodeId]: [result, ...existing.filter((candidate) => candidate.attempt !== result.attempt)]
        .sort((left, right) => right.attempt - left.attempt)
        .slice(0, 8),
    },
  };
}

export function resolveOutcome(
  state: GameState,
  outcomeId: string,
  updates: Partial<GameState> = {},
  feedback?: Feedback,
  createId: HistoryIdFactory = defaultHistoryId,
): GameState {
  const definition = implementedEpisode(state.episodeId);
  const outcome = definition?.outcomes[outcomeId];
  if (!definition || !outcome) return state;
  const completed = state.completed.includes(definition.id)
    ? state.completed
    : [...state.completed, definition.id];
  const keyResolution = updates.keyCustody ?? state.keyCustody;
  const obligations = updates.checkoutObligations ?? state.checkoutObligations;
  const openIssues = updates.openIssues ?? state.openIssues;
  const departurePlan = updates.departurePlan ?? state.departurePlan;
  const keysResolved = [keyResolution.hotel, keyResolution.apartment]
    .every((custody) => custody === "returned" || custody === "not-held");
  const allEpisodesCompleted = EPISODE_IDS.every((episodeId) => completed.includes(episodeId)) &&
    new Set(completed).size === EPISODE_IDS.length;
  const requiredObligations = [
    "All held keys returned",
    "Repair and balance reviewed",
    "Departure plan confirmed",
  ];
  const issuesValid = openIssues.length <= 8 && new Set(openIssues).size === openIssues.length && openIssues.every((issue) =>
    (issue === "Parcel follow-up remains open" || issue === "Traveler-reported checkout issue") &&
    obligations.includes(`Open issue acknowledged: ${issue}`),
  );
  const issueShapeMatchesOutcome = outcomeId === "D30-O1"
    ? openIssues.length === 0
    : outcomeId === "D30-O2" && openIssues.length > 0;
  const completesSeason = definition.id === "day-30" &&
    definition.completionOutcomeIds?.includes(outcomeId) === true &&
    keysResolved &&
    allEpisodesCompleted &&
    requiredObligations.every((obligation) => obligations.includes(obligation)) &&
    issuesValid &&
    issueShapeMatchesOutcome &&
    typeof departurePlan === "string" && departurePlan.trim().length > 0 && departurePlan.trim().length <= 160;
  const priorAttempts = state.episodeResults[definition.id] ?? [];
  const completionAttempt = priorAttempts.reduce(
    (maximum, result) => Math.max(maximum, result.attempt),
    0,
  ) + 1;
  const resolved: GameState = {
    ...state,
    ...updates,
    status: completesSeason ? "complete" : "resolved",
    pendingOutcome: null,
    outcome,
    feedback: feedback === undefined
      ? state.feedback ?? createFeedback(definition.scene.id, state.lastResponse)
      : feedback,
    completed,
    seasonCompletion: completesSeason ? {
      attempt: completionAttempt,
      outcomeId,
      keyResolution: { ...keyResolution },
      obligations: [...obligations].slice(0, 12),
      openIssues: [...openIssues].slice(0, 8),
      departurePlan: departurePlan as string,
      completedEpisodeIds: [...completed],
      reflectionInputs: {
        vendorPreference: updates.vendorPreference ?? state.vendorPreference,
        tablePreference: updates.tablePreference ?? state.tablePreference,
        stayResponse: updates.stayResponse ?? state.stayResponse,
      },
    } : state.seasonCompletion,
    history: appendHistory(state, "system", `${outcome.title} · ${outcome.consequence}`, createId),
  };
  return withEpisodeResult(resolved, outcomeId);
}

const runtime: EpisodeRuntime = { moveToTurn, queueTerminal, resolveOutcome };

function synchronizeLatestResult(state: GameState): GameState {
  if (state.status === "active" || !state.outcome) return state;
  const definition = implementedEpisode(state.episodeId);
  const results = state.episodeResults[state.episodeId] ?? [];
  if (!definition || results.length === 0) return state;
  const latestAttempt = results.reduce((maximum, result) => Math.max(maximum, result.attempt), 0);
  return {
    ...state,
    episodeResults: {
      ...state.episodeResults,
      [state.episodeId]: results.map((result) =>
        result.attempt === latestAttempt
          ? {
              ...result,
              observedMoves: [...state.observedMoves],
              verifiedFacts: { ...state.verifiedFacts },
            }
          : result,
      ),
    },
  };
}

export function finishPendingOutcome(
  state: GameState,
  createId: HistoryIdFactory = defaultHistoryId,
): GameState {
  const definition = implementedEpisode(state.episodeId);
  const turn = definition?.turns[state.turnId];
  if (!definition || !state.pendingOutcome || !turn?.terminal) return state;
  if (!definition.terminalOutcomeTurns[state.pendingOutcome]?.includes(state.turnId)) return state;
  const updates: Partial<GameState> = {};
  if (state.pendingOutcome === "E2-O4") updates.rental = null;
  if (state.pendingOutcome === "E3-O5") updates.cafeOutcome = "€7.50 bill disputed and open";
  return resolveOutcome(state, state.pendingOutcome, updates, undefined, createId);
}

export function applyResponse(
  state: GameState,
  rawResponse: string,
  createId: HistoryIdFactory = defaultHistoryId,
): ResponseResult {
  return registeredEpisodeCoordinator.applyResponse(state, rawResponse, createId);
}

export function createEpisodeCoordinator(
  definitions: readonly EpisodeDefinition[],
): EpisodeCoordinator {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  return {
    applyResponse(state, rawResponse, createId = defaultHistoryId) {
      const definition = byId.get(state.episodeId);
      return definition
        ? coordinateEpisodeResponse(definition, state, rawResponse, createId)
        : { kind: "advanced", state };
    },
  };
}

export const registeredEpisodeCoordinator = createEpisodeCoordinator(
  IMPLEMENTED_EPISODE_DEFINITIONS,
);

export function coordinateEpisodeResponse(
  definition: EpisodeDefinition,
  state: GameState,
  rawResponse: string,
  createId: HistoryIdFactory = defaultHistoryId,
): ResponseResult {
  const raw = rawResponse.trim();
  if (!raw || state.status !== "active" || state.episodeId !== definition.id) {
    return { kind: "advanced", state };
  }
  const teachingPhrase = detectTeachingPhrase(raw, definition.scene.id, state.turnId, definition.id);
  if (teachingPhrase) return { kind: "teaching", phraseId: teachingPhrase, state };

  const withResponse: GameState = {
    ...state,
    lastResponse: raw,
    history: appendHistory(state, "player", raw, createId),
  };
  const normalized = normalize(raw);
  const evaluated = definition.evaluateResponse({
    state: withResponse,
    normalized,
    raw,
    createId,
    runtime,
  });
  const evidence = definition.observeResponse({
    before: withResponse,
    after: evaluated,
    normalized,
    raw,
  });
  const observedMoves = [
    ...withResponse.observedMoves,
    ...evidence.moves.filter((move) => !withResponse.observedMoves.includes(move)),
  ];
  const withEvidence = {
    ...evaluated,
    observedMoves,
    verifiedFacts: mergeVerifiedFacts(withResponse.verifiedFacts, evidence.facts),
  };
  return { kind: "advanced", state: synchronizeLatestResult(withEvidence) };
}

export function recordSupport(
  state: GameState,
  sceneId: SceneId,
  kind: keyof SupportRecord,
): GameState {
  const current = state.support[sceneId] ?? { replay: 0, careful: 0, transcript: 0 };
  return {
    ...state,
    support: {
      ...state.support,
      [sceneId]: { ...current, [kind]: current[kind] + 1 },
    },
  };
}

export function recordPhrasePractice(state: GameState, phraseId: PhraseId): GameState {
  return {
    ...state,
    phrasePractice: {
      ...initialPhrasePractice(),
      ...(state.phrasePractice ?? {}),
      [phraseId]: (state.phrasePractice?.[phraseId] ?? 0) + 1,
    },
  };
}

export function recordEpisodeRefresher(
  state: GameState,
  action: "opened" | "inserted" | "rebuilt",
): GameState {
  const current = state.episodeRefreshers[state.episodeId] ?? {
    opened: 0,
    applied: 0,
    method: null,
  };
  const applied = action === "inserted" || action === "rebuilt";
  return {
    ...state,
    episodeRefreshers: {
      ...state.episodeRefreshers,
      [state.episodeId]: {
        opened: current.opened + (action === "opened" ? 1 : 0),
        applied: current.applied + (applied ? 1 : 0),
        method: applied ? action : current.method,
      },
    },
  };
}

function resetInteraction(state: GameState, episodeId: EpisodeId): GameState {
  const definition = implementedEpisode(episodeId);
  if (!definition) return state;
  const retainedRefreshers = { ...state.episodeRefreshers };
  delete retainedRefreshers[episodeId];
  return {
    ...state,
    episodeId,
    turnId: definition.initialTurn?.(state) ?? definition.scene.firstTurn,
    status: "active",
    pendingOutcome: null,
    outcome: null,
    feedback: null,
    history: [],
    episodeRefreshers: retainedRefreshers,
    observedMoves: [],
    verifiedFacts: {},
    attempts: 0,
    lastResponse: "",
  };
}

export function nextEpisodeState(state: GameState): GameState {
  const next = nextImplementedEpisode(state.episodeId);
  return next ? resetInteraction(state, next.id) : state;
}

export function seedEpisodeState(state: GameState, episodeId: EpisodeId): GameState {
  const definition = implementedEpisode(episodeId);
  if (!definition) return state;
  const base = initialState();
  const seeded: GameState = {
    ...base,
    ...definition.adminSeed(),
    support: state.support,
    episodeResults: state.episodeResults,
    episodeRefreshers: state.episodeRefreshers,
    seasonCompletion: state.seasonCompletion,
    phrasePractice: {
      ...initialPhrasePractice(),
      ...(state.phrasePractice ?? {}),
    },
  };
  return resetInteraction(seeded, episodeId);
}

const LEGACY_ANCHORS: EpisodeId[] = ["day-00", "day-04", "day-13", "day-21"];

export function seedLegacyAnchorState(anchorIndex: number): GameState {
  const safe = Math.max(0, Math.min(anchorIndex, LEGACY_ANCHORS.length - 1));
  const episodeId = LEGACY_ANCHORS[safe];
  const state = seedEpisodeState(initialState(), episodeId);
  const legacySeeds: Partial<GameState>[] = [
    {},
    { money: 10000, hotelKey: true, completed: ["day-00"] },
    { money: 7800, hotelKey: true, rental: "custom", completed: ["day-00", "day-04"] },
    { money: 7550, hotelKey: true, rental: "custom", cafeOutcome: "Both errors corrected", completed: ["day-00", "day-04", "day-13"] },
  ];
  return { ...state, ...legacySeeds[safe], episodeId };
}

export function restartEpisodeState(state: GameState): GameState {
  const restarted = seedEpisodeState(state, state.episodeId);
  const day24RemedyResolved = state.episodeId === "day-24" && (
    state.beachRemedy !== "none" ||
    state.worldEvents.includes("day24-beach-credit-issued") ||
    state.worldEvents.includes("day24-beach-refund-issued")
  );
  if (!day24RemedyResolved) return restarted;
  return {
    ...restarted,
    money: state.money,
    beachDayPassPaid: false,
    beachDayPassPrice: state.beachDayPassPrice,
    beachRemedy: state.beachRemedy,
    beachWeather: state.beachWeather,
    beachPlanStatus: state.beachPlanStatus,
    knownFacts: state.knownFacts,
    worldEvents: state.worldEvents,
  };
}

export function possessionsFor(state: GameState): string[] {
  const items: string[] = [];
  if (state.hotelKey) items.push("Hotel key · room 12");
  if (state.apartmentKey) items.push("Casa Limone key · green door");
  if (state.rental === "custom") items.push("Chair + umbrella · until 18:00");
  if (state.rental === "standard") items.push("Two chairs + umbrella · until 18:00");
  if (state.rental === "chair") items.push("Beach chair · until 18:00");
  if (state.laundryStatus === "clean") items.push("Clean clothes");
  if (state.parcelStatus === "collected") items.push("Collected parcel");
  if (state.transportStatus === "booked" && state.transportMode !== "none") {
    items.push(`${state.transportMode === "ferry" ? "Ferry" : "Bus"} ticket`);
  }
  if (state.transportStatus === "replacement-bus") items.push("Replacement bus ticket");
  for (const item of state.inventory) if (!items.includes(item)) items.push(item);
  return items;
}
