import type { GameState, PreparationActivity } from "../game/model";
import { implementedEpisode } from "../season/registry";

export type PreparationAction = { page: PreparationActivity["page"] } | { audio: "normal" | "careful" } | { initialize: true } | { continue: true } | { return: true };

export function preparationFor(game: GameState) {
  const definition = implementedEpisode(game.episodeId);
  const content = definition?.preparation;
  if (!content || game.pendingOutcome) return null;
  const saved = game.preparation;
  const valid = saved?.episodeId === game.episodeId && saved.contentVersion === content.version;
  const reviewing = valid && saved.mode === "reviewing" && saved.returnTo?.turnId === game.turnId && saved.returnTo.status === game.status;
  if (game.status !== "active" && !reviewing) return null;
  const segment = game.status !== "active" ? content.entry : content.entry.turnId === game.turnId ? content.entry : content.turns[game.turnId];
  if (!segment || (game.status === "active" && definition?.turns[game.turnId]?.terminal)) return null;
  const activity: PreparationActivity = valid && saved.segmentId === segment.id ? { ...saved } : {
    episodeId: game.episodeId, contentVersion: content.version, segmentId: segment.id,
    page: segment === content.entry ? "situation" : "turn-brief", mode: "preparing",
    revision: saved?.revision ?? 0,
    traversedSegmentIds: valid ? saved.traversedSegmentIds : [],
    visitedExampleIds: valid ? saved.visitedExampleIds : [],
    audioAttempts: valid ? saved.audioAttempts : {},
  };
  if (activity.mode === "reviewing" && !reviewing) { activity.mode = "preparing"; delete activity.returnTo; }
  if (segment !== content.entry) activity.page = "turn-brief";
  else if (activity.page === "turn-brief") activity.page = "situation";
  if (activity.mode !== "reviewing") {
    const traversed = activity.traversedSegmentIds.includes(segment.id) && activity.visitedExampleIds.includes(segment.id);
    if (traversed && activity.mode === "encounter") return null;
    activity.mode = "preparing";
    if (activity.page === "handoff" && !activity.visitedExampleIds.includes(segment.id)) activity.page = "pattern";
  }
  return { content, segment, activity };
}

export function preparationCursor(game: GameState): string | null {
  const prep = preparationFor(game);
  return prep ? `${game.episodeId}:${game.turnId}:${game.status}:${prep.content.version}:${prep.segment.id}:${prep.activity.mode}:${prep.activity.page}:${prep.activity.revision ?? 0}` : null;
}

export function openPreparationReview(game: GameState): GameState {
  if (preparationCursor(game)) return game;
  const content = implementedEpisode(game.episodeId)?.preparation;
  if (!content) return game;
  const segment = game.status !== "active" || content.entry.turnId === game.turnId ? content.entry : content.turns[game.turnId];
  if (!segment) return game;
  const saved = game.preparation?.contentVersion === content.version ? game.preparation : undefined;
  return { ...game, preparation: {
    episodeId: game.episodeId, contentVersion: content.version, segmentId: segment.id,
    mode: "reviewing", page: segment === content.entry ? "situation" : "turn-brief",
    revision: (saved?.revision ?? 0) + 1,
    traversedSegmentIds: saved?.traversedSegmentIds ?? [], visitedExampleIds: saved?.visitedExampleIds ?? [], audioAttempts: saved?.audioAttempts ?? {},
    returnTo: { turnId: game.turnId, status: game.status, mode: "encounter", page: saved?.page ?? "handoff" },
  } };
}

export function updatePreparation(game: GameState, expectedCursor: string, action: PreparationAction): GameState {
  const prep = preparationFor(game);
  if (!prep || preparationCursor(game) !== expectedCursor) return game;
  const activity = prep.activity;
  const next = { ...activity };
  const add = (ids: string[]) => [...new Set([...ids, prep.segment.id])];
  if ("return" in action) {
    if (activity.mode !== "reviewing" || activity.returnTo?.turnId !== game.turnId || activity.returnTo.status !== game.status) return game;
    next.mode = "encounter"; next.page = activity.returnTo.page; delete next.returnTo;
  } else if ("page" in action) {
    const edges: Record<string, string[]> = { situation: ["listen"], listen: ["situation", "pattern"], pattern: ["listen"], handoff: ["pattern"] };
    if (prep.segment !== prep.content.entry || !edges[activity.page]?.includes(action.page)) return game;
    next.page = action.page;
  } else if ("continue" in action) {
    if (activity.page === "pattern") {
      next.page = "handoff";
      if (game.status === "active") next.visitedExampleIds = add(activity.visitedExampleIds);
    } else if (activity.page === "handoff" || activity.page === "turn-brief") {
      if (game.status === "active") {
        next.visitedExampleIds = add(activity.visitedExampleIds);
        next.traversedSegmentIds = add(activity.traversedSegmentIds);
      }
      next.mode = "encounter"; delete next.returnTo;
    } else return game;
  } else if ("audio" in action) {
    if (game.status !== "active" || !["listen", "turn-brief"].includes(activity.page)) return game;
    const counts = activity.audioAttempts[prep.segment.id] ?? { normal: 0, careful: 0 };
    next.audioAttempts = { ...activity.audioAttempts, [prep.segment.id]: { ...counts, [action.audio]: Math.min(9999, counts[action.audio] + 1) } };
  } else return JSON.stringify(game.preparation) === JSON.stringify(activity) ? game : { ...game, preparation: activity };
  if (!("audio" in action)) next.revision = (activity.revision ?? 0) + 1;
  return { ...game, preparation: next };
}
