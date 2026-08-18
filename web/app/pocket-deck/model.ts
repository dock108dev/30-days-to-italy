import { isEpisodeId, type EpisodeId } from "../season/manifest";
import type { ObservedMove } from "../season/types";

export const POCKET_DECK_SCHEMA_VERSION = 3 as const;
export const POCKET_DECK_RECENT_LIMIT = 6;
export const POCKET_DECK_PRACTICE_HISTORY_LIMIT = 8;
export const GUIDED_BEACH_CARD_ID = "beach-one-chair-umbrella";

export type PocketDeckCategory = "hotel" | "beach" | "food-drink" | "paying" | "problems" | "polite-exit" | "understanding";
export type PocketDeckSource = "core" | "rehearsal" | "personal";
export type PocketDeckCard = {
  id: string; category: PocketDeckCategory; englishIntent: string; primaryItalian: string;
  shortItalian: string; variation?: string; likelyResponse: string; likelyResponseEnglish: string;
  listenFor: readonly string[]; searchTerms: readonly string[]; normalAudio: string; carefulAudio: string;
  audioTranscript: string; source: PocketDeckSource; personalReminder?: string;
};

export type PocketDeckPracticeMove = ObservedMove;

export type PocketDeckPracticeEvidence = {
  id: string;
  cardId: string;
  source: "guided-beach" | "season-episode";
  episodeId: EpisodeId;
  attempt: number;
  outcomeId: string;
  practicedMoves: PocketDeckPracticeMove[];
  refresherApplied: boolean;
  refresherMethod: "inserted" | "rebuilt" | null;
  quantityClarified: boolean;
  priceConfirmed: boolean;
  normalReplayCount: number;
  carefulReplayCount: number;
  transcriptRevealCount: number;
};

export type PocketDeckState = {
  schemaVersion: typeof POCKET_DECK_SCHEMA_VERSION;
  pinnedCardIds: string[];
  recentCardIds: string[];
  practiceEvidenceByCardId: Record<string, PocketDeckPracticeEvidence[]>;
};

export function createDefaultPocketDeckState(): PocketDeckState {
  return { schemaVersion: POCKET_DECK_SCHEMA_VERSION, pinnedCardIds: [], recentCardIds: [], practiceEvidenceByCardId: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function safeCount(value: unknown): number | null { return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null; }

function normalizeCardIds(value: unknown, validCardIds: ReadonlySet<string>, limit?: number): string[] {
  if (!Array.isArray(value)) return [];
  const normalized: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string" || !validCardIds.has(candidate) || normalized.includes(candidate)) continue;
    normalized.push(candidate);
    if (limit !== undefined && normalized.length >= limit) break;
  }
  return normalized;
}

const PRACTICE_MOVES: PocketDeckPracticeMove[] = ["identify", "request", "quantity", "preference", "location", "price", "recovery", "confirm", "decline", "pay", "boundary", "problem"];

function normalizePracticeEvidence(value: unknown, validCardIds: ReadonlySet<string>): PocketDeckPracticeEvidence | null {
  if (!isRecord(value) || typeof value.cardId !== "string" || !validCardIds.has(value.cardId)) return null;
  if (value.source !== "guided-beach" && value.source !== "season-episode") return null;
  const episodeId = value.source === "guided-beach" && value.episodeId === undefined ? "day-04" : value.episodeId;
  if (!isEpisodeId(episodeId) || typeof value.outcomeId !== "string" || !value.outcomeId) return null;
  const attempt = safeCount(value.attempt);
  const normalReplayCount = safeCount(value.normalReplayCount);
  const carefulReplayCount = safeCount(value.carefulReplayCount);
  const transcriptRevealCount = safeCount(value.transcriptRevealCount);
  if (attempt === null || attempt < 1 || normalReplayCount === null || carefulReplayCount === null || transcriptRevealCount === null) return null;
  const expectedId = value.source === "guided-beach"
    ? `guided-beach:attempt-${attempt}`
    : `season:${episodeId}:attempt-${attempt}:${value.cardId}`;
  if (value.id !== expectedId) return null;
  const practicedMoves = Array.isArray(value.practicedMoves)
    ? [...new Set(value.practicedMoves.filter((move): move is PocketDeckPracticeMove => typeof move === "string" && PRACTICE_MOVES.includes(move as PocketDeckPracticeMove)))]
    : [];
  if (practicedMoves.length === 0) return null;
  if (value.source === "guided-beach" && !practicedMoves.includes("request")) return null;
  const refresherApplied = value.refresherApplied === true;
  const refresherMethod = value.refresherMethod === "inserted" || value.refresherMethod === "rebuilt" ? value.refresherMethod : null;
  if (refresherApplied !== (refresherMethod !== null)) return null;
  return {
    id: expectedId, cardId: value.cardId, source: value.source, episodeId, attempt, outcomeId: value.outcomeId,
    practicedMoves, refresherApplied, refresherMethod, quantityClarified: value.quantityClarified === true,
    priceConfirmed: value.priceConfirmed === true, normalReplayCount, carefulReplayCount, transcriptRevealCount,
  };
}

function normalizePracticeEvidenceByCardId(value: unknown, validCardIds: ReadonlySet<string>): Record<string, PocketDeckPracticeEvidence[]> {
  if (!isRecord(value)) return {};
  const result: Record<string, PocketDeckPracticeEvidence[]> = {};
  const seen = new Set<string>();
  for (const [cardId, candidates] of Object.entries(value)) {
    if (!validCardIds.has(cardId) || !Array.isArray(candidates)) continue;
    const evidence: PocketDeckPracticeEvidence[] = [];
    for (const candidate of candidates) {
      const normalized = normalizePracticeEvidence(candidate, validCardIds);
      if (!normalized || normalized.cardId !== cardId || seen.has(normalized.id)) continue;
      seen.add(normalized.id); evidence.push(normalized);
      if (evidence.length >= POCKET_DECK_PRACTICE_HISTORY_LIMIT) break;
    }
    if (evidence.length) result[cardId] = evidence;
  }
  return result;
}

export function normalizePocketDeckState(value: unknown, validCardIds: ReadonlySet<string>): PocketDeckState {
  const defaults = createDefaultPocketDeckState();
  if (!isRecord(value)) return defaults;
  if (value.schemaVersion === 1) return { ...defaults, pinnedCardIds: normalizeCardIds(value.pinnedCardIds, validCardIds), recentCardIds: normalizeCardIds(value.recentCardIds, validCardIds, POCKET_DECK_RECENT_LIMIT) };
  if (value.schemaVersion !== 2 && value.schemaVersion !== 3) return defaults;
  return {
    schemaVersion: POCKET_DECK_SCHEMA_VERSION,
    pinnedCardIds: normalizeCardIds(value.pinnedCardIds, validCardIds),
    recentCardIds: normalizeCardIds(value.recentCardIds, validCardIds, POCKET_DECK_RECENT_LIMIT),
    practiceEvidenceByCardId: normalizePracticeEvidenceByCardId(value.practiceEvidenceByCardId, validCardIds),
  };
}

export function togglePocketDeckPin(state: PocketDeckState, cardId: string, validCardIds: ReadonlySet<string>): PocketDeckState {
  if (!validCardIds.has(cardId)) return state;
  return { ...state, pinnedCardIds: state.pinnedCardIds.includes(cardId) ? state.pinnedCardIds.filter((id) => id !== cardId) : [...state.pinnedCardIds, cardId] };
}

export function recordRecentPocketDeckCard(state: PocketDeckState, cardId: string, validCardIds: ReadonlySet<string>): PocketDeckState {
  if (!validCardIds.has(cardId)) return state;
  return { ...state, recentCardIds: [cardId, ...state.recentCardIds.filter((id) => id !== cardId)].slice(0, POCKET_DECK_RECENT_LIMIT) };
}

export function pocketDeckEvidenceForCard(state: PocketDeckState, cardId: string): readonly PocketDeckPracticeEvidence[] { return state.practiceEvidenceByCardId[cardId] ?? []; }
export function hasPocketDeckEvidence(state: PocketDeckState, evidenceId: string): boolean { return Object.values(state.practiceEvidenceByCardId).some((items) => items.some((item) => item.id === evidenceId)); }

export function applyPocketDeckPracticeEvidence(state: PocketDeckState, evidence: PocketDeckPracticeEvidence, validCardIds: ReadonlySet<string>): PocketDeckState {
  if (!validCardIds.has(evidence.cardId)) return state;
  const normalized = normalizePracticeEvidence(evidence, validCardIds);
  if (!normalized || hasPocketDeckEvidence(state, normalized.id)) return state;
  const existing = pocketDeckEvidenceForCard(state, normalized.cardId);
  return { ...state, schemaVersion: 3, practiceEvidenceByCardId: { ...state.practiceEvidenceByCardId, [normalized.cardId]: [normalized, ...existing].slice(0, POCKET_DECK_PRACTICE_HISTORY_LIMIT) } };
}
