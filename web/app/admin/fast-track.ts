import { addLocalCalendarDays, parseLocalDate } from "../trip/date";
import type { AppMode } from "../lifecycle/model";
import { SEASON_01, type EpisodeId } from "../season/manifest";

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
  ...SEASON_01.map((episode) => ({
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
  const checkpoint = ADMIN_FAST_TRACK_CHECKPOINTS.find((candidate) => candidate.id === id);
  if (!checkpoint) throw new Error(`Unsupported Admin checkpoint: ${id}`);
  return checkpoint;
}

export function adminPreviewDate(departureDate: string, daysUntilDeparture: number): string | null {
  const departure = parseLocalDate(departureDate);
  if (!departure) return null;
  return addLocalCalendarDays(new Date(departure.year, departure.month - 1, departure.day, 12), -daysUntilDeparture);
}
