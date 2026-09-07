import type { GameState, PreparationActivity } from "../game/model";
import { implementedEpisode } from "../season/registry";

export function preparationFor(game: GameState) {
  if (game.status !== "active" || game.pendingOutcome) return null;
  const definition = implementedEpisode(game.episodeId);
  const content = definition?.preparation;
  if (!content || definition?.turns[game.turnId]?.terminal) return null;
  const segment = content.entry.turnId === game.turnId ? content.entry : content.turns[game.turnId];
  if (!segment) return null;
  const saved = game.preparation;
  const valid = saved?.episodeId === game.episodeId && saved.contentVersion === content.version;
  const activity: PreparationActivity = valid && saved.segmentId === segment.id ? saved : {
    episodeId: game.episodeId,
    contentVersion: content.version,
    segmentId: segment.id,
    page: segment === content.entry ? "situation" : "turn-brief",
    mode: "preparing",
    traversedSegmentIds: valid ? saved.traversedSegmentIds : [],
    visitedExampleIds: valid ? saved.visitedExampleIds : [],
    audioAttempts: valid ? saved.audioAttempts : {},
  };
  // T2 deliberately cannot unlock the live handoff, including via saved future pages.
  const page = segment !== content.entry ? "turn-brief" : activity.page === "situation" ? "situation" : "listen";
  return { content, segment, activity: { ...activity, page, mode: "preparing" } as PreparationActivity };
}

export function preparationCursor(game: GameState): string | null {
  const prep = preparationFor(game);
  return prep ? `${game.episodeId}:${game.turnId}:${prep.content.version}:${prep.activity.page}` : null;
}

export function updatePreparation(
  game: GameState,
  expectedCursor: string,
  action: { page: "situation" | "listen" } | { audio: "normal" | "careful" } | { initialize: true },
): GameState {
  const prep = preparationFor(game);
  if (!prep || preparationCursor(game) !== expectedCursor) return game;
  const activity = prep.activity;
  if ("page" in action) {
    if (prep.segment !== prep.content.entry || action.page === activity.page) return game;
    return { ...game, preparation: { ...activity, page: action.page } };
  }
  if ("audio" in action) {
    if (activity.page === "situation") return game;
    const counts = activity.audioAttempts[prep.segment.id] ?? { normal: 0, careful: 0 };
    return { ...game, preparation: { ...activity, audioAttempts: {
      ...activity.audioAttempts,
      [prep.segment.id]: { ...counts, [action.audio]: Math.min(9999, counts[action.audio] + 1) },
    } } };
  }
  return JSON.stringify(game.preparation) === JSON.stringify(activity) ? game : { ...game, preparation: activity };
}
