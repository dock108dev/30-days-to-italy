import { departureCountdown } from "../trip/date";
import type { TripProfile } from "../trip/model";
import type { GuidedSessionStatus } from "../guided/model";
import type { SeasonEpisode } from "../season/manifest";
import type { AppMode } from "./model";

export function ModeNavigation({
  mode,
  onChange,
}: {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}) {
  return (
    <nav className="mode-navigation" aria-label="Product mode">
      <div role="group" aria-label="Prepare or Trip">
        <button
          type="button"
          className={mode === "prepare" ? "active" : ""}
          aria-current={mode === "prepare" ? "page" : undefined}
          onClick={() => onChange("prepare")}
        >
          <strong>Prepare</strong>
        </button>
        <button
          type="button"
          className={mode === "trip" ? "active" : ""}
          aria-current={mode === "trip" ? "page" : undefined}
          onClick={() => onChange("trip")}
        >
          <strong>Trip</strong>
        </button>
      </div>
    </nav>
  );
}

export function PrepareFocus({
  profile,
  episode,
  isCurrent,
  sessionStatus,
  onStart,
  onEditTrip,
  today,
}: {
  profile: TripProfile;
  episode: SeasonEpisode;
  isCurrent: boolean;
  sessionStatus: GuidedSessionStatus;
  onStart: () => void;
  onEditTrip?: () => void;
  today?: string;
}) {
  const countdown = departureCountdown(profile.departureDate, today);
  return (
    <section className="prepare-focus" aria-labelledby="prepare-focus-title">
      <div className="prepare-focus-art" aria-hidden="true" />
      <div className="prepare-focus-intro">
        <p>{countdown.label}</p>
        <span>{episode.day === 0 ? "Arrival calibration" : `Session ${episode.day} of 30`}</span>
        <h2 id="prepare-focus-title">{episode.title}</h2>
        <p className="prepare-focus-copy">{episode.practicalObjective}</p>
        <small>About 8 minutes</small>
        <button type="button" onClick={onStart}>
          {episode.id === "day-04" && sessionStatus === "complete"
            ? "Review rehearsal"
            : (episode.id === "day-04" && sessionStatus === "in_progress") || isCurrent
              ? "Continue rehearsal"
              : "Start rehearsal"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <details className="prepare-trip-details">
        <summary>Trip details</summary>
        <div>
          <p><span>Region</span><strong>{profile.regionLabel}</strong></p>
          <p><span>Trip</span><strong>{profile.tripLengthDays} days · {profile.party === "solo" ? "solo" : "accompanied"}</strong></p>
          {onEditTrip && <button type="button" onClick={onEditTrip}>Edit trip</button>}
        </div>
      </details>
    </section>
  );
}
