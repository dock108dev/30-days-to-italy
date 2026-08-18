import {
  seedEpisodeState,
  submitEpisodeResponse,
  type HistoryIdFactory,
} from "../game/engine";
import { initialState, type GameState } from "../game/model";
import { parseSavedGame } from "../game/persistence";
import { EPISODE_IDS, type EpisodeId } from "../season/manifest";
import { implementedEpisode } from "../season/registry";

export type CanonicalAdvanceResult = {
  state: GameState;
  applied: boolean;
};

function canonicalPrefix(episodeId: EpisodeId, includeCurrent = false): EpisodeId[] {
  const index = EPISODE_IDS.indexOf(episodeId);
  return EPISODE_IDS.slice(0, index + (includeCurrent ? 1 : 0));
}

function filteredEpisodeResults(
  state: GameState,
  allowed: readonly EpisodeId[],
): GameState["episodeResults"] {
  const allowedIds = new Set(allowed);
  return Object.fromEntries(
    Object.entries(state.episodeResults).filter(([episodeId]) => allowedIds.has(episodeId as EpisodeId)),
  );
}

export function canonicalPreEpisodeState(
  current: GameState,
  episodeId: EpisodeId,
): GameState {
  const prefix = canonicalPrefix(episodeId);
  const seeded = seedEpisodeState(current, episodeId);
  const state: GameState = {
    ...seeded,
    completed: [...prefix],
    keyCustody: {
      hotel: seeded.hotelKey ? "held" : "not-held",
      apartment: seeded.apartmentKey ? "held" : "not-held",
    },
    seasonCompletion: null,
    episodeResults: filteredEpisodeResults(current, prefix),
  };
  assertCanonicalCheckpoint(state, episodeId, false);
  return state;
}

export function assertCanonicalCheckpoint(
  state: GameState,
  episodeId: EpisodeId,
  completedCurrent: boolean,
): void {
  if (state.episodeId !== episodeId) throw new Error(`Canonical checkpoint mismatch for ${episodeId}.`);
  if (!Number.isInteger(state.money) || state.money < 0) throw new Error(`Invalid canonical money for ${episodeId}.`);
  const expectedCompleted = canonicalPrefix(episodeId, completedCurrent);
  if (
    state.completed.length !== expectedCompleted.length ||
    state.completed.some((id, index) => id !== expectedCompleted[index])
  ) throw new Error(`Invalid completed prefix for ${episodeId}.`);
  if (new Set(state.inventory).size !== state.inventory.length) {
    throw new Error(`Duplicate canonical inventory for ${episodeId}.`);
  }
  if (new Set(state.commitments).size !== state.commitments.length) {
    throw new Error(`Duplicate canonical commitment for ${episodeId}.`);
  }
  if (new Set(state.openIssues).size !== state.openIssues.length || state.openIssues.length > 8) {
    throw new Error(`Invalid canonical open issues for ${episodeId}.`);
  }
  if (!state.currentLocation.trim() || !state.currentTime.trim()) {
    throw new Error(`Missing canonical location or time for ${episodeId}.`);
  }
  if (state.hotelKey !== (state.keyCustody.hotel === "held")) {
    throw new Error(`Hotel key custody mismatch for ${episodeId}.`);
  }
  if (state.apartmentKey !== (state.keyCustody.apartment === "held")) {
    throw new Error(`Apartment key custody mismatch for ${episodeId}.`);
  }
  if (!completedCurrent && state.seasonCompletion !== null) {
    throw new Error(`Forged season completion before ${episodeId}.`);
  }
  if (
    ["booked", "replacement-bus", "rebooked"].includes(state.transportStatus) &&
    (state.transportMode === "none" || state.transportTicketPrice <= 0)
  ) throw new Error(`Invalid transport ticket facts for ${episodeId}.`);
  const parsed = parseSavedGame(JSON.stringify(state));
  if (
    parsed.episodeId !== state.episodeId ||
    parsed.turnId !== state.turnId ||
    parsed.completed.length !== state.completed.length ||
    parsed.money !== state.money ||
    JSON.stringify(parsed.inventory) !== JSON.stringify(state.inventory) ||
    JSON.stringify(parsed.commitments) !== JSON.stringify(state.commitments) ||
    JSON.stringify(parsed.openIssues) !== JSON.stringify(state.openIssues) ||
    JSON.stringify(parsed.keyCustody) !== JSON.stringify(state.keyCustody) ||
    parsed.transportMode !== state.transportMode ||
    parsed.transportStatus !== state.transportStatus ||
    parsed.transportTicketPrice !== state.transportTicketPrice
  ) throw new Error(`Persistence parser rejected canonical state for ${episodeId}.`);
}

function canonicalHistoryId(episodeId: EpisodeId): HistoryIdFactory {
  let index = 0;
  return () => `demo-${episodeId}-${index += 1}`;
}

function synchronizeCanonicalKeyCustody(state: GameState): GameState {
  return {
    ...state,
    keyCustody: {
      hotel: state.hotelKey
        ? "held"
        : state.keyCustody.hotel === "returned"
          ? "returned"
          : "not-held",
      apartment: state.apartmentKey
        ? "held"
        : state.keyCustody.apartment === "returned"
          ? "returned"
          : "not-held",
    },
  };
}

export function advanceWithCanonicalResult(
  current: GameState,
  episodeId: EpisodeId,
): CanonicalAdvanceResult {
  const definition = implementedEpisode(episodeId);
  if (!definition) throw new Error(`Missing episode definition for ${episodeId}.`);
  if (
    current.episodeId === episodeId &&
    current.status !== "active" &&
    current.outcome?.id === definition.canonicalDemo.expectedOutcomeId &&
    current.completed.includes(episodeId)
  ) return { state: current, applied: false };

  const before = canonicalPreEpisodeState(current, episodeId);
  let state = before;
  const createId = canonicalHistoryId(episodeId);
  for (const response of definition.canonicalDemo.responses) {
    if (state.status !== "active") {
      throw new Error(`Canonical response follows terminal resolution for ${episodeId}.`);
    }
    const previous = state;
    const result = submitEpisodeResponse(state, response, createId);
    if (result.kind === "teaching") {
      throw new Error(`Canonical response opened teaching for ${episodeId}.`);
    }
    state = result.state;
    if (state === previous) throw new Error(`Canonical response was a no-op for ${episodeId}.`);
  }
  state = synchronizeCanonicalKeyCustody(state);
  if (state.status === "active") throw new Error(`Canonical path did not resolve ${episodeId}.`);
  if (state.outcome?.id !== definition.canonicalDemo.expectedOutcomeId) {
    throw new Error(`Canonical outcome mismatch for ${episodeId}: ${state.outcome?.id ?? "none"}.`);
  }
  if (state.completed.length !== before.completed.length + 1) {
    throw new Error(`Canonical path did not add exactly one checkpoint for ${episodeId}.`);
  }
  assertCanonicalCheckpoint(state, episodeId, true);
  if (episodeId === "day-30") assertValidDemoSeasonCompletion(state);
  return { state, applied: true };
}

export function assertValidDemoSeasonCompletion(state: GameState): void {
  const completion = state.seasonCompletion;
  if (!completion || state.status !== "complete") throw new Error("Day 30 did not create season completion.");
  if (
    completion.completedEpisodeIds.length !== EPISODE_IDS.length ||
    completion.completedEpisodeIds.some((id, index) => id !== EPISODE_IDS[index]) ||
    state.completed.length !== EPISODE_IDS.length ||
    state.completed.some((id, index) => id !== EPISODE_IDS[index])
  ) {
    throw new Error("Season completion does not contain all checkpoints.");
  }
  if (
    ![completion.keyResolution.hotel, completion.keyResolution.apartment].every((key) => key === "returned" || key === "not-held") ||
    state.hotelKey ||
    state.apartmentKey ||
    state.keyCustody.hotel !== completion.keyResolution.hotel ||
    state.keyCustody.apartment !== completion.keyResolution.apartment
  ) {
    throw new Error("Season completion retained a held or missing key.");
  }
  for (const obligation of [
    "All held keys returned",
    "Repair and balance reviewed",
    "Departure plan confirmed",
  ]) {
    if (!completion.obligations.includes(obligation) || !state.checkoutObligations.includes(obligation)) {
      throw new Error(`Missing checkout obligation: ${obligation}.`);
    }
  }
  const supportedIssues = new Set(["Parcel follow-up remains open", "Traveler-reported checkout issue"]);
  if (
    completion.openIssues.length !== state.openIssues.length ||
    completion.openIssues.some((issue, index) => issue !== state.openIssues[index]) ||
    completion.openIssues.some((issue) => !supportedIssues.has(issue)) ||
    completion.openIssues.some((issue) => !completion.obligations.includes(`Open issue acknowledged: ${issue}`))
  ) throw new Error("Season completion has an unsupported or unacknowledged open issue.");
  if (
    !completion.departurePlan.trim() ||
    state.departurePlan !== completion.departurePlan ||
    (state.departureStatus !== "planned" && state.departureStatus !== "departed")
  ) throw new Error("Season completion has no valid departure plan.");
}

export function canOpenDemoTripMode(state: GameState): boolean {
  try {
    assertValidDemoSeasonCompletion(state);
    return true;
  } catch {
    return false;
  }
}

export function canonicalStateForFreshDemo(): GameState {
  return canonicalPreEpisodeState(initialState(), "day-00");
}
