import { addLocalCalendarDays, parseLocalDate } from "../trip/date";
import type { AppMode } from "../lifecycle/model";
import { IMPLEMENTED_EPISODES, type EpisodeId } from "../season/manifest";

export type AdminFastTrackCheckpointId = EpisodeId | "trip";
export type AdminFastTrackCheckpoint = {
  id: AdminFastTrackCheckpointId;
  eyebrow: string;
  title: string;
  detail: string;
  mode: AppMode;
  episodeId: EpisodeId | null;
  daysUntilDeparture: number;
};

export const ADMIN_FAST_TRACK_CHECKPOINTS: readonly AdminFastTrackCheckpoint[] = [
  ...IMPLEMENTED_EPISODES.map((episode) => ({
    id: episode.id,
    eyebrow: episode.day === 0 ? "Arrival calibration" : `${episode.unlockDaysBeforeDeparture} days out`,
    title: episode.title,
    detail: `Day ${episode.day} · ${episode.primaryMove}`,
    mode: "prepare" as const,
    episodeId: episode.id,
    daysUntilDeparture: episode.unlockDaysBeforeDeparture ?? 30,
  })),
  {
    id: "trip",
    eyebrow: "Trip underway",
    title: "Pocket Deck",
    detail: "Open the real Trip Mode deck and carried rehearsal material",
    mode: "trip",
    episodeId: null,
    daysUntilDeparture: -1,
  },
];

export function adminFastTrackCheckpoint(id: AdminFastTrackCheckpointId): AdminFastTrackCheckpoint {
  return ADMIN_FAST_TRACK_CHECKPOINTS.find((checkpoint) => checkpoint.id === id) ?? ADMIN_FAST_TRACK_CHECKPOINTS[0];
}

export function nextAdminFastTrackCheckpoint(currentId: AdminFastTrackCheckpointId | null): AdminFastTrackCheckpoint | null {
  if (currentId === null) return ADMIN_FAST_TRACK_CHECKPOINTS[0];
  const index = ADMIN_FAST_TRACK_CHECKPOINTS.findIndex((checkpoint) => checkpoint.id === currentId);
  return ADMIN_FAST_TRACK_CHECKPOINTS[index + 1] ?? null;
}

export function inferAdminFastTrackCheckpoint(mode: AppMode, episodeId: EpisodeId): AdminFastTrackCheckpoint {
  if (mode === "trip") return adminFastTrackCheckpoint("trip");
  return ADMIN_FAST_TRACK_CHECKPOINTS.find((checkpoint) => checkpoint.mode === "prepare" && checkpoint.episodeId === episodeId) ?? ADMIN_FAST_TRACK_CHECKPOINTS[0];
}

export function adminPreviewDate(departureDate: string, daysUntilDeparture: number): string | null {
  const departure = parseLocalDate(departureDate);
  if (!departure) return null;
  return addLocalCalendarDays(new Date(departure.year, departure.month - 1, departure.day, 12), -daysUntilDeparture);
}
