import { day00Episode } from "./episodes/day-00";
import { day01Episode } from "./episodes/day-01";
import { day02Episode } from "./episodes/day-02";
import { day03Episode } from "./episodes/day-03";
import { day04Episode } from "./episodes/day-04";
import { day05Episode } from "./episodes/day-05";
import { day06Episode } from "./episodes/day-06";
import { day07Episode } from "./episodes/day-07";
import { day08Episode } from "./episodes/day-08";
import { day09Episode } from "./episodes/day-09";
import { day10Episode } from "./episodes/day-10";
import { day11Episode } from "./episodes/day-11";
import { day12Episode } from "./episodes/day-12";
import { day13Episode } from "./episodes/day-13";
import { day14Episode } from "./episodes/day-14";
import { day15Episode } from "./episodes/day-15";
import { day16Episode } from "./episodes/day-16";
import { day17Episode } from "./episodes/day-17";
import { day18Episode } from "./episodes/day-18";
import { day19Episode } from "./episodes/day-19";
import { day20Episode } from "./episodes/day-20";
import { day21Episode } from "./episodes/day-21";
import { day22Episode } from "./episodes/day-22";
import { day23Episode } from "./episodes/day-23";
import { day24Episode } from "./episodes/day-24";
import { day25Episode } from "./episodes/day-25";
import { day26Episode } from "./episodes/day-26";
import { day27Episode } from "./episodes/day-27";
import { day28Episode } from "./episodes/day-28";
import { day29Episode } from "./episodes/day-29";
import { day30Episode } from "./episodes/day-30";
import { SEASON_01, type EpisodeId } from "./manifest";
import { CANONICAL_DEMO_PATHS } from "./canonical-demo-fixtures";
import type { DemoEpisodeDefinition, EpisodeDefinition } from "./types";

const AUTHORED_EPISODE_DEFINITIONS: readonly EpisodeDefinition[] = [
  day00Episode,
  day01Episode,
  day02Episode,
  day03Episode,
  day04Episode,
  day05Episode,
  day06Episode,
  day07Episode,
  day08Episode,
  day09Episode,
  day10Episode,
  day11Episode,
  day12Episode,
  day13Episode,
  day14Episode,
  day15Episode,
  day16Episode,
  day17Episode,
  day18Episode,
  day19Episode,
  day20Episode,
  day21Episode,
  day22Episode,
  day23Episode,
  day24Episode,
  day25Episode,
  day26Episode,
  day27Episode,
  day28Episode,
  day29Episode,
  day30Episode,
];

export const IMPLEMENTED_EPISODE_DEFINITIONS: readonly DemoEpisodeDefinition[] =
  AUTHORED_EPISODE_DEFINITIONS.map((definition) => ({
    ...definition,
    canonicalDemo: CANONICAL_DEMO_PATHS[definition.id],
  }));

export const EPISODE_DEFINITION_BY_ID = new Map<EpisodeId, DemoEpisodeDefinition>(
  IMPLEMENTED_EPISODE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const SCENES = IMPLEMENTED_EPISODE_DEFINITIONS.map((definition) => definition.scene);

export const TURNS = Object.fromEntries(
  IMPLEMENTED_EPISODE_DEFINITIONS.flatMap((definition) => Object.entries(definition.turns)),
);

export const OUTCOMES = Object.fromEntries(
  IMPLEMENTED_EPISODE_DEFINITIONS.flatMap((definition) => Object.entries(definition.outcomes)),
);

export const TURN_EPISODE = new Map(
  IMPLEMENTED_EPISODE_DEFINITIONS.flatMap((definition) =>
    Object.keys(definition.turns).map((turnId) => [turnId, definition.id] as const),
  ),
);

export const OUTCOME_EPISODE = new Map(
  IMPLEMENTED_EPISODE_DEFINITIONS.flatMap((definition) =>
    Object.keys(definition.outcomes).map((outcomeId) => [outcomeId, definition.id] as const),
  ),
);

export const PENDING_TERMINAL_TURNS = new Map(
  IMPLEMENTED_EPISODE_DEFINITIONS.flatMap((definition) =>
    Object.entries(definition.terminalOutcomeTurns).flatMap(([outcomeId, turnIds]) =>
      turnIds.map((turnId) => [`${definition.id}:${outcomeId}:${turnId}`, true] as const),
    ),
  ),
);

export function implementedEpisode(id: EpisodeId): EpisodeDefinition | null {
  return EPISODE_DEFINITION_BY_ID.get(id) ?? null;
}

export function nextImplementedEpisode(id: EpisodeId): EpisodeDefinition | null {
  const currentDay = SEASON_01.find((episode) => episode.id === id)?.day ?? -1;
  return IMPLEMENTED_EPISODE_DEFINITIONS.find((definition) => definition.day > currentDay) ?? null;
}

export function sceneForEpisode(id: EpisodeId) {
  return implementedEpisode(id)?.scene ?? null;
}

export function ownsTurn(episodeId: EpisodeId, turnId: string): boolean {
  return TURN_EPISODE.get(turnId) === episodeId;
}

export function ownsOutcome(episodeId: EpisodeId, outcomeId: string): boolean {
  return OUTCOME_EPISODE.get(outcomeId) === episodeId;
}

export function isValidPendingOutcome(
  episodeId: EpisodeId,
  outcomeId: string,
  turnId: string,
): boolean {
  return PENDING_TERMINAL_TURNS.has(`${episodeId}:${outcomeId}:${turnId}`);
}

export function assertSeasonRegistry(): void {
  if (SEASON_01.length !== 31 || new Set(SEASON_01.map((episode) => episode.id)).size !== 31) {
    throw new Error("Season 01 must contain 31 unique slots.");
  }
  if (IMPLEMENTED_EPISODE_DEFINITIONS.length !== 31) {
    throw new Error("Season 01 must register all thirty-one implemented episodes.");
  }
  for (const definition of IMPLEMENTED_EPISODE_DEFINITIONS) {
    if (definition.scene.episodeId !== definition.id || definition.scene.firstTurn !== Object.values(definition.turns).find((turn) => turn.id === definition.scene.firstTurn)?.id) {
      throw new Error(`Invalid scene ownership for ${definition.id}.`);
    }
    if (!definition.contentVersion || definition.authoringStatus !== "reviewed") {
      throw new Error(`Incomplete review metadata for ${definition.id}.`);
    }
    if (!definition.canonicalDemo.responses.length || !definition.outcomes[definition.canonicalDemo.expectedOutcomeId]) {
      throw new Error(`Invalid canonical demo path for ${definition.id}.`);
    }
    for (const turnId of Object.keys(definition.turns)) {
      if (TURN_EPISODE.get(turnId) !== definition.id) throw new Error(`Duplicate turn ${turnId}.`);
    }
    for (const outcomeId of Object.keys(definition.outcomes)) {
      if (OUTCOME_EPISODE.get(outcomeId) !== definition.id) throw new Error(`Duplicate outcome ${outcomeId}.`);
    }
    for (const outcomeId of definition.completionOutcomeIds ?? []) {
      if (definition.id !== "day-30" || !definition.outcomes[outcomeId]) {
        throw new Error(`Invalid season-completion outcome ${definition.id}:${outcomeId}.`);
      }
    }
    if (definition.id !== "day-30" && (definition.completionOutcomeIds?.length ?? 0) > 0) {
      throw new Error(`Only Day 30 may define season-completion outcomes.`);
    }
  }
}

assertSeasonRegistry();
