import { EPISODE_IDS, isEpisodeId, type EpisodeId } from "../season/manifest";
import {
  IMPLEMENTED_EPISODE_DEFINITIONS,
  OUTCOME_EPISODE,
  SCENES,
  TURN_EPISODE,
  implementedEpisode,
  isValidPendingOutcome,
  ownsOutcome,
  ownsTurn,
} from "../season/registry";
import {
  OBSERVED_MOVES,
  type ObservedMove,
  type VerifiedEpisodeFacts,
} from "../season/types";
import {
  PHRASE_LESSONS,
  STORAGE_KEY,
  initialState,
  type EpisodeResult,
  type EpisodeRefresherEvidence,
  type Feedback,
  type GameState,
  type HistoryItem,
  type KeyCustody,
  type Outcome,
  type PhraseId,
  type RepairCommitment,
  type SeasonCompletion,
  type TransportPlan,
  type RelationshipDisposition,
  type SupportRecord,
} from "./model";
import { reportClientFailure } from "../observability/client-failures";

export type LocalGameStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PHRASE_IDS = new Set<PhraseId>(PHRASE_LESSONS.map((lesson) => lesson.id));
const STATUS_VALUES = new Set<GameState["status"]>(["active", "resolved", "complete"]);
const RENTAL_VALUES = new Set(["custom", "standard", "chair", null]);
const DISPOSITIONS = new Set<RelationshipDisposition>(["neutral", "efficient", "warm", "strained"]);
const LAUNDRY_VALUES = new Set<GameState["laundryStatus"]>(["not-started", "clean", "postponed"]);
const TRANSPORT_MODE_VALUES = new Set<GameState["transportMode"]>(["none", "bus", "ferry"]);
const TRANSPORT_STATUS_VALUES = new Set<GameState["transportStatus"]>(["none", "booked", "cancelled", "refunded", "replacement-bus", "rebooked", "completed"]);
const HOT_WATER_VALUES = new Set<GameState["hotWaterStatus"]>(["unknown", "reported", "temporary", "fixed"]);
const COMMITMENT_VALUES = new Set(["active", "fulfilled", "breached", "deferred"]);
const PARCEL_VALUES = new Set<GameState["parcelStatus"]>(["none", "pending", "collected", "redelivery"]);
const SECOND_PARCEL_VALUES = new Set<GameState["secondParcelStatus"]>(["none", "neighbor-held", "collected", "declined"]);
const BEACH_PLAN_VALUES = new Set<GameState["beachPlanStatus"]>(["none", "left-for-wind", "sheltered-chair"]);
const BEACH_WEATHER_VALUES = new Set<GameState["beachWeather"]>(["unknown", "windy-early-close"]);
const BEACH_REMEDY_VALUES = new Set<GameState["beachRemedy"]>(["none", "credit", "refund"]);
const INVITATION_VALUES = new Set<GameState["invitationResponse"]>(["none", "accepted", "maybe", "declined"]);
const ATTENDANCE_VALUES = new Set<GameState["eventAttendance"]>(["unknown", "attended", "did-not-attend"]);
const TABLE_VALUES = new Set<GameState["tablePreference"]>(["none", "quiet", "view"]);
const REPAIR_ELIGIBILITY_VALUES = new Set<GameState["repairCreditEligibility"]>(["unknown", "eligible", "ineligible"]);
const REPAIR_CREDIT_VALUES = new Set<GameState["repairCreditStatus"]>(["none", "issued", "declined"]);
const STAY_VALUES = new Set<GameState["stayResponse"]>(["unknown", "not-sure", "yes", "no"]);
const KEY_VALUES = new Set<KeyCustody>(["not-held", "held", "returned", "missing"]);
const DEPARTURE_VALUES = new Set<GameState["departureStatus"]>(["not-planned", "planned", "departed", "blocked"]);
const IMPLEMENTED_IDS = new Set(IMPLEMENTED_EPISODE_DEFINITIONS.map((definition) => definition.id));
const DAY_30_COMPLETION_OUTCOMES = new Set(implementedEpisode("day-30")?.completionOutcomeIds ?? []);
const REQUIRED_CHECKOUT_OBLIGATIONS = [
  "All held keys returned",
  "Repair and balance reviewed",
  "Departure plan confirmed",
] as const;
const SUPPORTED_COMPLETION_ISSUES = new Set([
  "Parcel follow-up remains open",
  "Traveler-reported checkout issue",
]);
const LEGACY_V1_SCENE_BY_INDEX: EpisodeId[] = ["day-00", "day-04", "day-13", "day-21"];
const LEGACY_V2_SCENE_BY_INDEX: EpisodeId[] = ["day-00", "day-01", "day-02", "day-03", "day-04", "day-05", "day-06", "day-07", "day-13", "day-21"];
const LEGACY_COMPLETED: Record<string, EpisodeId> = {
  hotel: "day-00",
  beach: "day-04",
  cafe: "day-13",
  bartender: "day-21",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function strings(value: unknown, limit = 40): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
  )].slice(0, limit);
}

function strictStrings(value: unknown, limit: number, maximumLength = 160): string[] | null {
  if (!Array.isArray(value) || value.length > limit) return null;
  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const text = item.trim();
    if (!text || text.length > maximumLength || normalized.includes(text)) return null;
    normalized.push(text);
  }
  return normalized;
}

function normalizeSupport(value: unknown): Record<string, SupportRecord> {
  const defaults = initialState().support;
  if (!isRecord(value)) return defaults;
  const result = { ...defaults };
  for (const scene of SCENES) {
    const saved = value[scene.id];
    if (!isRecord(saved)) continue;
    result[scene.id] = {
      replay: safeCount(saved.replay),
      careful: safeCount(saved.careful),
      transcript: safeCount(saved.transcript),
    };
  }
  return result;
}

function normalizePhrasePractice(value: unknown): Record<PhraseId, number> {
  const result = initialState().phrasePractice;
  if (!isRecord(value)) return result;
  for (const [key, count] of Object.entries(value)) {
    if (PHRASE_IDS.has(key as PhraseId)) result[key as PhraseId] = safeCount(count);
  }
  return result;
}

function normalizeHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> =>
      isRecord(item) &&
      typeof item.id === "string" &&
      (item.kind === "player" || item.kind === "system") &&
      typeof item.text === "string",
    )
    .map((item) => ({
      id: item.id as string,
      kind: item.kind as HistoryItem["kind"],
      text: (item.text as string).slice(0, 500),
    }))
    .slice(-8);
}

function normalizeFeedback(value: unknown): Feedback {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    typeof value.understood !== "string" ||
    typeof value.natural !== "string" ||
    typeof value.variation !== "string" ||
    typeof value.automatic !== "boolean"
  ) return null;
  return {
    understood: value.understood.slice(0, 300),
    natural: value.natural.slice(0, 300),
    variation: value.variation.slice(0, 300),
    automatic: value.automatic,
  };
}

function legacyIndexEpisode(value: Record<string, unknown>): EpisodeId | null {
  if (typeof value.sceneIndex !== "number" || !Number.isInteger(value.sceneIndex)) return null;
  const source = value.schemaVersion === 2 ? LEGACY_V2_SCENE_BY_INDEX : LEGACY_V1_SCENE_BY_INDEX;
  return source[Math.max(0, Math.min(value.sceneIndex, source.length - 1))] ?? null;
}

function inferEpisode(value: Record<string, unknown>): EpisodeId {
  if (isEpisodeId(value.episodeId) && IMPLEMENTED_IDS.has(value.episodeId)) return value.episodeId;
  if (typeof value.turnId === "string") {
    const owner = TURN_EPISODE.get(value.turnId);
    if (owner) return owner;
  }
  return legacyIndexEpisode(value) ?? "day-00";
}

function outcomeEntry(value: unknown, episodeId: EpisodeId): [string, Outcome] | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") return null;
  const definition = implementedEpisode(episodeId);
  if (!definition) return null;
  return Object.entries(definition.outcomes).find(([, outcome]) =>
    outcome.id === value.id && outcome.title === value.title,
  ) ?? null;
}

function normalizePendingOutcome(value: unknown, episodeId: EpisodeId, turnId: string): string | null {
  return typeof value === "string" &&
    ownsOutcome(episodeId, value) &&
    isValidPendingOutcome(episodeId, value, turnId)
    ? value
    : null;
}

function normalizeCompleted(value: unknown): EpisodeId[] {
  if (!Array.isArray(value)) return [];
  const result: EpisodeId[] = [];
  for (const item of value) {
    const migrated = typeof item === "string" ? LEGACY_COMPLETED[item] ?? item : null;
    if (isEpisodeId(migrated) && IMPLEMENTED_IDS.has(migrated) && !result.includes(migrated)) {
      result.push(migrated);
    }
  }
  return result.sort((left, right) =>
    IMPLEMENTED_EPISODE_DEFINITIONS.findIndex((definition) => definition.id === left) -
    IMPLEMENTED_EPISODE_DEFINITIONS.findIndex((definition) => definition.id === right),
  );
}

function normalizeObservedMoves(value: unknown): ObservedMove[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(
    (move): move is ObservedMove =>
      typeof move === "string" && (OBSERVED_MOVES as readonly string[]).includes(move),
  ))].slice(0, OBSERVED_MOVES.length);
}

function normalizeVerifiedFacts(value: unknown): VerifiedEpisodeFacts {
  if (!isRecord(value)) return {};
  const result: VerifiedEpisodeFacts = {};
  if (value.quantityClarified === true) result.quantityClarified = true;
  if (value.priceConfirmed === true) result.priceConfirmed = true;
  if (value.destinationEstablished === true) result.destinationEstablished = true;
  if (value.problemReported === true) result.problemReported = true;
  if (value.alternativeSelected === true) result.alternativeSelected = true;
  if (value.commitmentConfirmed === true) result.commitmentConfirmed = true;
  if (value.routeConfirmed === true) result.routeConfirmed = true;
  if (value.correctionAccepted === true) result.correctionAccepted = true;
  if (value.refundConfirmed === true) result.refundConfirmed = true;
  if (typeof value.preferenceSelected === "string" && value.preferenceSelected.trim()) {
    result.preferenceSelected = value.preferenceSelected.trim().slice(0, 80);
  }
  return result;
}

function normalizeRefresher(value: unknown): EpisodeRefresherEvidence {
  const source = isRecord(value) ? value : {};
  const method: "inserted" | "rebuilt" | null =
    source.method === "inserted" || source.method === "rebuilt" ? source.method : null;
  const applied = method ? safeCount(source.applied) : 0;
  return {
    opened: safeCount(source.opened),
    applied,
    method: applied > 0 ? method : null,
  };
}

function normalizeEpisodeResults(value: unknown): Partial<Record<EpisodeId, EpisodeResult[]>> {
  if (!isRecord(value)) return {};
  const result: Partial<Record<EpisodeId, EpisodeResult[]>> = {};
  for (const [key, candidates] of Object.entries(value)) {
    if (!isEpisodeId(key) || !IMPLEMENTED_IDS.has(key) || !Array.isArray(candidates)) continue;
    const valid: EpisodeResult[] = [];
    const attempts = new Set<number>();
    for (const candidate of candidates) {
      if (
        !isRecord(candidate) ||
        candidate.episodeId !== key ||
        typeof candidate.outcomeId !== "string" ||
        OUTCOME_EPISODE.get(candidate.outcomeId) !== key ||
        typeof candidate.response !== "string"
      ) continue;
      const attempt = Math.max(1, safeCount(candidate.attempt));
      if (attempts.has(attempt)) continue;
      const support = isRecord(candidate.support) ? candidate.support : {};
      valid.push({
        episodeId: key,
        attempt,
        outcomeId: candidate.outcomeId,
        observedMoves: normalizeObservedMoves(candidate.observedMoves),
        verifiedFacts: normalizeVerifiedFacts(candidate.verifiedFacts),
        response: candidate.response.slice(0, 500),
        support: {
          replay: safeCount(support.replay),
          careful: safeCount(support.careful),
          transcript: safeCount(support.transcript),
        },
        refresher: normalizeRefresher(candidate.refresher),
      });
      attempts.add(attempt);
    }
    valid.sort((left, right) => right.attempt - left.attempt);
    if (valid.length) result[key] = valid.slice(0, 8);
  }
  return result;
}

function normalizeEpisodeRefreshers(value: unknown): GameState["episodeRefreshers"] {
  if (!isRecord(value)) return {};
  const result: GameState["episodeRefreshers"] = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (!isEpisodeId(key) || !IMPLEMENTED_IDS.has(key)) continue;
    result[key] = normalizeRefresher(candidate);
  }
  return result;
}

function normalizeRelationships(
  value: unknown,
  schemaVersion: unknown,
): { relationships: GameState["relationships"]; migratedFacts: string[] } {
  if (!isRecord(value)) return { relationships: {}, migratedFacts: [] };
  const relationships: GameState["relationships"] = {};
  const migratedFacts: string[] = [];
  for (const [character, raw] of Object.entries(value).slice(0, 20)) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const normalized = raw.trim().toLowerCase();
    if (schemaVersion === 3 || schemaVersion === 4 || schemaVersion === 5 || schemaVersion === 6) {
      if (DISPOSITIONS.has(normalized as RelationshipDisposition)) {
        relationships[character] = normalized as RelationshipDisposition;
      }
      continue;
    }
    if (["neutral", "efficient", "warm", "strained"].includes(normalized)) {
      relationships[character] = normalized as RelationshipDisposition;
    } else {
      relationships[character] = "neutral";
      migratedFacts.push(`${character}: ${raw.trim().slice(0, 160)}`);
    }
  }
  return { relationships, migratedFacts };
}

function normalizeRepairCommitment(value: unknown): RepairCommitment {
  if (!isRecord(value) || typeof value.window !== "string" || !value.window.trim()) return null;
  if (typeof value.status !== "string" || !COMMITMENT_VALUES.has(value.status)) return null;
  return { window: value.window.trim().slice(0, 120), status: value.status as NonNullable<RepairCommitment>["status"] };
}

function normalizeTransportPlan(value: unknown): TransportPlan {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.firstDeparture !== "string" ||
    typeof value.changeAt !== "string" ||
    typeof value.connectionTime !== "string" ||
    typeof value.stand !== "string" ||
    typeof value.fare !== "number" ||
    !Number.isFinite(value.fare) ||
    !["quoted", "paid", "cancelled"].includes(String(value.status))
  ) return null;
  return {
    id: value.id.slice(0, 80),
    firstDeparture: value.firstDeparture.slice(0, 40),
    changeAt: value.changeAt.slice(0, 80),
    connectionTime: value.connectionTime.slice(0, 40),
    stand: value.stand.slice(0, 40),
    fare: Math.max(0, Math.round(value.fare)),
    status: value.status as NonNullable<TransportPlan>["status"],
  };
}

function normalizeKeyCustody(value: unknown, hotelKey: boolean, apartmentKey: boolean): GameState["keyCustody"] {
  const source = isRecord(value) ? value : {};
  const hotel = KEY_VALUES.has(source.hotel as KeyCustody)
    ? source.hotel as KeyCustody
    : hotelKey ? "held" : "not-held";
  const apartment = KEY_VALUES.has(source.apartment as KeyCustody)
    ? source.apartment as KeyCustody
    : apartmentKey ? "held" : "not-held";
  return { hotel, apartment };
}

function normalizeCompletionEpisodeIds(value: unknown): EpisodeId[] | null {
  if (!Array.isArray(value) || value.length !== EPISODE_IDS.length) return null;
  const ids = value.filter((item): item is EpisodeId => isEpisodeId(item));
  if (ids.length !== EPISODE_IDS.length || new Set(ids).size !== EPISODE_IDS.length) return null;
  if (!EPISODE_IDS.every((episodeId) => ids.includes(episodeId))) return null;
  return [...EPISODE_IDS];
}

function normalizeSeasonCompletion(value: unknown): SeasonCompletion | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.attempt !== "number" || !Number.isInteger(value.attempt) || value.attempt < 1 ||
    typeof value.outcomeId !== "string" || !DAY_30_COMPLETION_OUTCOMES.has(value.outcomeId) ||
    typeof value.departurePlan !== "string" || !value.departurePlan.trim() || value.departurePlan.trim().length > 160 ||
    !isRecord(value.keyResolution) ||
    !["returned", "not-held"].includes(String(value.keyResolution.hotel)) ||
    !["returned", "not-held"].includes(String(value.keyResolution.apartment)) ||
    !isRecord(value.reflectionInputs)
  ) return null;
  const completedEpisodeIds = normalizeCompletionEpisodeIds(value.completedEpisodeIds);
  const obligations = strictStrings(value.obligations, 12);
  const openIssues = strictStrings(value.openIssues, 8);
  if (!completedEpisodeIds || !obligations || !openIssues) return null;
  if (!REQUIRED_CHECKOUT_OBLIGATIONS.every((obligation) => obligations.includes(obligation))) return null;
  if (openIssues.some((issue) => !SUPPORTED_COMPLETION_ISSUES.has(issue))) return null;
  if (value.outcomeId === "D30-O1" && openIssues.length !== 0) return null;
  if (value.outcomeId === "D30-O2" && (
    openIssues.length === 0 ||
    openIssues.some((issue) => !obligations.includes(`Open issue acknowledged: ${issue}`))
  )) return null;
  if (!TABLE_VALUES.has(value.reflectionInputs.tablePreference as GameState["tablePreference"])) return null;
  if (!STAY_VALUES.has(value.reflectionInputs.stayResponse as GameState["stayResponse"])) return null;
  const vendorPreference = value.reflectionInputs.vendorPreference;
  if (
    vendorPreference !== null &&
    (typeof vendorPreference !== "string" || !vendorPreference.trim() || vendorPreference.trim().length > 120)
  ) return null;
  return {
    attempt: value.attempt,
    outcomeId: value.outcomeId,
    keyResolution: {
      hotel: value.keyResolution.hotel as KeyCustody,
      apartment: value.keyResolution.apartment as KeyCustody,
    },
    obligations,
    openIssues,
    departurePlan: value.departurePlan.trim(),
    completedEpisodeIds,
    reflectionInputs: {
      vendorPreference: typeof vendorPreference === "string" ? vendorPreference.trim() : null,
      tablePreference: value.reflectionInputs.tablePreference as GameState["tablePreference"],
      stayResponse: value.reflectionInputs.stayResponse as GameState["stayResponse"],
    },
  };
}

export function hydrateGameState(value: unknown): GameState {
  const defaults = initialState();
  if (!isRecord(value)) return defaults;
  const episodeId = inferEpisode(value);
  const definition = implementedEpisode(episodeId);
  if (!definition) return defaults;
  const requestedTurn = typeof value.turnId === "string" ? value.turnId : "";
  let turnId = ownsTurn(episodeId, requestedTurn) ? requestedTurn : definition.scene.firstTurn;
  const requestedStatus = STATUS_VALUES.has(value.status as GameState["status"])
    ? value.status as GameState["status"]
    : "active";
  const matchedOutcomeEntry = outcomeEntry(value.outcome, episodeId);
  const matchedOutcome = matchedOutcomeEntry?.[1] ?? null;
  const matchedOutcomeId = matchedOutcomeEntry?.[0] ?? null;
  const currentOutcomeCompletesSeason = episodeId === "day-30" && matchedOutcomeId !== null &&
    definition.completionOutcomeIds?.includes(matchedOutcomeId) === true;
  const seasonCompletion = normalizeSeasonCompletion(value.seasonCompletion);
  const pendingOutcome = normalizePendingOutcome(value.pendingOutcome, episodeId, turnId);
  let status: GameState["status"] = "active";
  let outcome: Outcome | null = null;
  let safePending = pendingOutcome;
  let feedback = normalizeFeedback(value.feedback);

  if ((requestedStatus === "resolved" || requestedStatus === "complete") && matchedOutcome) {
    status = requestedStatus === "complete" && currentOutcomeCompletesSeason &&
      seasonCompletion?.outcomeId === matchedOutcomeId
      ? "complete"
      : "resolved";
    outcome = matchedOutcome;
    safePending = null;
  } else if (requestedStatus === "active") {
    if (definition.turns[turnId]?.terminal && !safePending) turnId = definition.scene.firstTurn;
  } else {
    turnId = definition.scene.firstTurn;
    safePending = null;
    feedback = null;
  }

  const relationshipMigration = normalizeRelationships(value.relationships, value.schemaVersion);
  const knownFacts = strings([
    ...strings(value.knownFacts),
    ...relationshipMigration.migratedFacts,
  ]);
  const hotelKey = value.hotelKey === true;
  const apartmentKey = value.apartmentKey === true;
  const keyCustody = normalizeKeyCustody(value.keyCustody, hotelKey, apartmentKey);
  const checkoutIssueSourceValid = value.openIssues === undefined || (
    Array.isArray(value.openIssues) &&
    value.openIssues.length <= 8 &&
    value.openIssues.every((issue) => typeof issue === "string" && issue.trim().length > 0 && issue.trim().length <= 160) &&
    new Set(value.openIssues.map((issue) => (issue as string).trim())).size === value.openIssues.length
  );
  const openIssues = checkoutIssueSourceValid
    ? strings(value.openIssues, 8)
    : ["Unsupported checkout issue state"];
  const worldEvents = strings(value.worldEvents, 40);
  const savedBeachRemedy = BEACH_REMEDY_VALUES.has(value.beachRemedy as GameState["beachRemedy"])
    ? value.beachRemedy as GameState["beachRemedy"]
    : defaults.beachRemedy;
  const hasCreditEvent = worldEvents.includes("day24-beach-credit-issued");
  const hasRefundEvent = worldEvents.includes("day24-beach-refund-issued");
  const beachRemedy = savedBeachRemedy !== "none"
    ? savedBeachRemedy
    : hasRefundEvent ? "refund" : hasCreditEvent ? "credit" : "none";
  const beachDayPassPrice = typeof value.beachDayPassPrice === "number" && Number.isFinite(value.beachDayPassPrice)
    ? Math.max(0, Math.round(value.beachDayPassPrice))
    : 0;
  const beachDayPassPaid = beachRemedy === "none" && !hasCreditEvent && !hasRefundEvent &&
    value.beachDayPassPaid === true && beachDayPassPrice > 0;

  return {
    ...defaults,
    schemaVersion: 6,
    episodeId,
    turnId,
    status,
    money: typeof value.money === "number" && Number.isFinite(value.money)
      ? Math.max(0, Math.round(value.money))
      : defaults.money,
    hotelKey,
    breakfastKnown: value.breakfastKnown === true,
    apartmentKey,
    inventory: strings(value.inventory),
    busTicket: value.busTicket === true,
    routeFact: typeof value.routeFact === "string" ? value.routeFact.slice(0, 200) : null,
    pharmacyItem: typeof value.pharmacyItem === "string" ? value.pharmacyItem.slice(0, 120) : null,
    knownFacts,
    commitments: strings(value.commitments),
    relationships: relationshipMigration.relationships,
    rental: RENTAL_VALUES.has(value.rental as GameState["rental"])
      ? value.rental as GameState["rental"]
      : null,
    cafeOutcome: typeof value.cafeOutcome === "string" ? value.cafeOutcome.slice(0, 200) : null,
    ferryMemory: typeof value.ferryMemory === "string" ? value.ferryMemory.slice(0, 200) : null,
    currentLocation: typeof value.currentLocation === "string" && value.currentLocation.trim()
      ? value.currentLocation.trim().slice(0, 160)
      : definition.scene.location,
    currentTime: typeof value.currentTime === "string" && /^\d{2}:\d{2}$/.test(value.currentTime)
      ? value.currentTime
      : definition.scene.time,
    laundryStatus: LAUNDRY_VALUES.has(value.laundryStatus as GameState["laundryStatus"])
      ? value.laundryStatus as GameState["laundryStatus"]
      : defaults.laundryStatus,
    transportMode: TRANSPORT_MODE_VALUES.has(value.transportMode as GameState["transportMode"])
      ? value.transportMode as GameState["transportMode"]
      : value.busTicket === true ? "bus" : defaults.transportMode,
    transportStatus: TRANSPORT_STATUS_VALUES.has(value.transportStatus as GameState["transportStatus"])
      ? value.transportStatus as GameState["transportStatus"]
      : value.busTicket === true ? "booked" : defaults.transportStatus,
    transportTicketPrice: typeof value.transportTicketPrice === "number" && Number.isFinite(value.transportTicketPrice)
      ? Math.max(0, Math.round(value.transportTicketPrice))
      : 0,
    hotWaterStatus: HOT_WATER_VALUES.has(value.hotWaterStatus as GameState["hotWaterStatus"])
      ? value.hotWaterStatus as GameState["hotWaterStatus"]
      : defaults.hotWaterStatus,
    repairCommitment: normalizeRepairCommitment(value.repairCommitment),
    parcelStatus: PARCEL_VALUES.has(value.parcelStatus as GameState["parcelStatus"])
      ? value.parcelStatus as GameState["parcelStatus"]
      : defaults.parcelStatus,
    vendorPreference: typeof value.vendorPreference === "string" && value.vendorPreference.trim()
      ? value.vendorPreference.trim().slice(0, 120)
      : null,
    secondParcelStatus: SECOND_PARCEL_VALUES.has(value.secondParcelStatus as GameState["secondParcelStatus"])
      ? value.secondParcelStatus as GameState["secondParcelStatus"]
      : defaults.secondParcelStatus,
    beachPlanStatus: BEACH_PLAN_VALUES.has(value.beachPlanStatus as GameState["beachPlanStatus"])
      ? value.beachPlanStatus as GameState["beachPlanStatus"]
      : defaults.beachPlanStatus,
    beachWeather: BEACH_WEATHER_VALUES.has(value.beachWeather as GameState["beachWeather"])
      ? value.beachWeather as GameState["beachWeather"]
      : defaults.beachWeather,
    beachDayPassPaid,
    beachDayPassPrice,
    beachRemedy,
    invitationResponse: INVITATION_VALUES.has(value.invitationResponse as GameState["invitationResponse"])
      ? value.invitationResponse as GameState["invitationResponse"]
      : defaults.invitationResponse,
    eventAttendance: ATTENDANCE_VALUES.has(value.eventAttendance as GameState["eventAttendance"])
      ? value.eventAttendance as GameState["eventAttendance"]
      : defaults.eventAttendance,
    tablePreference: TABLE_VALUES.has(value.tablePreference as GameState["tablePreference"])
      ? value.tablePreference as GameState["tablePreference"]
      : defaults.tablePreference,
    repairCreditEligibility: REPAIR_ELIGIBILITY_VALUES.has(value.repairCreditEligibility as GameState["repairCreditEligibility"])
      ? value.repairCreditEligibility as GameState["repairCreditEligibility"]
      : defaults.repairCreditEligibility,
    repairCreditStatus: REPAIR_CREDIT_VALUES.has(value.repairCreditStatus as GameState["repairCreditStatus"])
      ? value.repairCreditStatus as GameState["repairCreditStatus"]
      : defaults.repairCreditStatus,
    transportPlan: normalizeTransportPlan(value.transportPlan),
    stayResponse: STAY_VALUES.has(value.stayResponse as GameState["stayResponse"])
      ? value.stayResponse as GameState["stayResponse"]
      : defaults.stayResponse,
    keyCustody,
    checkoutObligations: strings(value.checkoutObligations, 12),
    openIssues,
    departurePlan: typeof value.departurePlan === "string" && value.departurePlan.trim()
      ? value.departurePlan.trim().slice(0, 160)
      : null,
    departureStatus: DEPARTURE_VALUES.has(value.departureStatus as GameState["departureStatus"])
      ? value.departureStatus as GameState["departureStatus"]
      : defaults.departureStatus,
    worldEvents,
    seasonCompletion,
    pendingOutcome: safePending,
    completed: normalizeCompleted(value.completed),
    outcome,
    feedback,
    guidance: status === "active" && typeof value.guidance === "string" && value.guidance.trim()
      ? value.guidance.trim().slice(0, 500)
      : null,
    history: normalizeHistory(value.history),
    support: normalizeSupport(value.support),
    phrasePractice: normalizePhrasePractice(value.phrasePractice),
    episodeResults: normalizeEpisodeResults(value.episodeResults),
    episodeRefreshers: normalizeEpisodeRefreshers(value.episodeRefreshers),
    observedMoves: normalizeObservedMoves(value.observedMoves),
    verifiedFacts: normalizeVerifiedFacts(value.verifiedFacts),
    attempts: safeCount(value.attempts),
    lastResponse: typeof value.lastResponse === "string" ? value.lastResponse.slice(0, 500) : "",
  };
}

export function parseSavedGame(serialized: string | null): GameState {
  if (!serialized) return initialState();
  try {
    return hydrateGameState(JSON.parse(serialized));
  } catch (error) {
    reportClientFailure({
      code: "PERSISTENCE_DATA_INVALID",
      domain: "game",
      operation: "parse",
      severity: "error",
      userMessage: "Saved rehearsal progress could not be read. The app opened a safe new session without replacing the saved record.",
    }, error);
    return initialState();
  }
}

export function loadGame(storage: LocalGameStorage): GameState {
  try {
    return parseSavedGame(storage.getItem(STORAGE_KEY));
  } catch (error) {
    reportClientFailure({
      code: "PERSISTENCE_READ_FAILED",
      domain: "game",
      operation: "load",
      severity: "error",
      userMessage: "Rehearsal progress could not be read from this browser. Keep this tab open and check browser storage settings.",
    }, error);
    return initialState();
  }
}

export function saveGame(storage: LocalGameStorage, state: GameState): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    reportClientFailure({
      code: "PERSISTENCE_WRITE_FAILED",
      domain: "game",
      operation: "save",
      severity: "error",
      userMessage: "Your latest rehearsal progress was not saved. Keep this tab open and free browser storage before continuing.",
    }, error);
    return false;
  }
}

export function clearSavedGame(storage: LocalGameStorage): boolean {
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    reportClientFailure({
      code: "PERSISTENCE_CLEAR_FAILED",
      domain: "game",
      operation: "clear",
      severity: "error",
      userMessage: "The saved rehearsal could not be cleared completely. Reload before starting another journey.",
    }, error);
    return false;
  }
}
