import { calendarDayDifference, localDateString } from "../trip/date";
import type { TripProfile } from "../trip/model";
import { SEASON_01, type EpisodeId, type SeasonEpisode } from "./manifest";

export type ScheduledEpisode = SeasonEpisode & {
  unlocked: boolean;
  completed: boolean;
  playable: boolean;
};

export function daysUntilDeparture(profile: Pick<TripProfile, "departureDate">, today = localDateString(new Date())): number {
  return calendarDayDifference(profile.departureDate, today);
}

function isEpisodeUnlocked(
  episode: SeasonEpisode,
  profile: Pick<TripProfile, "departureDate">,
  today = localDateString(new Date()),
  adminBypass = false,
): boolean {
  if (adminBypass || episode.day === 0) return true;
  if (episode.unlockDaysBeforeDeparture === null) return true;
  return daysUntilDeparture(profile, today) <= episode.unlockDaysBeforeDeparture;
}

export function scheduleSeason(
  profile: Pick<TripProfile, "departureDate">,
  completed: readonly EpisodeId[],
  today = localDateString(new Date()),
  adminBypass = false,
): ScheduledEpisode[] {
  const completedSet = new Set(completed);
  return SEASON_01.map((episode) => {
    const unlocked = isEpisodeUnlocked(episode, profile, today, adminBypass);
    return {
      ...episode,
      unlocked,
      completed: completedSet.has(episode.id),
      playable: unlocked,
    };
  });
}
