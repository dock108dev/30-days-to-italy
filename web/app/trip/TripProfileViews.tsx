import { FormEvent, useRef, useState } from "react";

import { departureCountdown, formatDepartureDate, isValidLocalDate } from "./date";
import {
  TRANSPORT_MODES,
  normalizeTripProfile,
  type BeachPlans,
  type LodgingType,
  type SocialPreference,
  type TransportMode,
  type TravelParty,
  type TripProfile,
} from "./model";

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  ferry: "Ferry",
  bus: "Bus",
  train: "Train",
  taxi: "Taxi",
  walking: "Walking",
};

type TripSetupProps = {
  initialProfile: TripProfile;
  editing?: boolean;
  onSave: (profile: TripProfile) => boolean;
  onCancel?: () => void;
};

export function TripSetup({ initialProfile, editing = false, onSave, onCancel }: TripSetupProps) {
  const preferences = useRef<HTMLDetailsElement>(null);
  const [draft, setDraft] = useState(initialProfile);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof TripProfile>(field: K, value: TripProfile[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleTransport(mode: TransportMode) {
    setDraft((current) => ({
      ...current,
      transport: current.transport.includes(mode)
        ? current.transport.filter((item) => item !== mode)
        : [...current.transport, mode],
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isValidLocalDate(draft.departureDate)) {
      setError("Choose a valid departure date.");
      return;
    }
    if (!draft.regionLabel.trim()) {
      setError("Add the region or home base you are preparing for.");
      return;
    }
    if (draft.transport.length === 0) {
      if (preferences.current) preferences.current.open = true;
      setError("Choose at least one likely way you will get around.");
      return;
    }
    const normalized = normalizeTripProfile(draft);
    if (!normalized || !onSave(normalized)) {
      setError("This browser could not save your trip details. Try again.");
      return;
    }
    setError(null);
  }

  const form = (
    <form className="trip-setup-card" onSubmit={submit} aria-label="Trip setup">
      <div className="trip-setup-heading">
        <div>
          <h1>{editing ? "Adjust your trip" : "Prepare for your trip"}</h1>
        </div>
        {editing && onCancel && (
          <button className="trip-close" type="button" onClick={onCancel} aria-label="Close trip details">×</button>
        )}
      </div>

      <p className="trip-setup-intro">
        Set your departure date to schedule the sessions. You can change these details later.
      </p>

      <section className="trip-form-section">
        <div className="trip-form-grid">
        <label className="trip-field">
          <span>Departure date</span>
          <input
            type="date"
            value={draft.departureDate}
            onChange={(event) => setField("departureDate", event.target.value)}
            required
          />
        </label>

        <label className="trip-field">
          <span>Trip length</span>
          <div className="number-field">
            <input
              type="number"
              min="3"
              max="30"
              value={draft.tripLengthDays}
              onChange={(event) => setField("tripLengthDays", Number(event.target.value))}
              required
            />
            <small>days</small>
          </div>
        </label>

        <label className="trip-field trip-field-wide">
          <span>Region or home base</span>
          <input
            type="text"
            maxLength={80}
            value={draft.regionLabel}
            onChange={(event) => setField("regionLabel", event.target.value)}
            placeholder="Campania / Amalfi Coast"
            required
          />
        </label>
        </div>
      </section>

      <p className="trip-preferences-summary">
          {draft.party === "solo" ? "Solo" : "With someone"} · {draft.lodging === "mixed" ? "Hotel or rental" : draft.lodging === "hotel" ? "Hotel" : "Rental"} · {draft.transport.map((mode) => TRANSPORT_LABELS[mode]).join(", ") || "Choose transport"}.
          {" "}{draft.beachPlans === "yes" ? "Beach planned." : draft.beachPlans === "maybe" ? "Beach possible." : "Beach unlikely."} {draft.socialPreference === "minimal" ? "Brief conversations." : "Open to more conversation."}
      </p>
      <details className="trip-preferences" ref={preferences} open={editing || undefined}>
        <summary>Travel preferences</summary>
        <section className="trip-form-section">
          <div className="trip-form-section-heading"><h2>How you’re traveling</h2></div>
          <div className="trip-choice-grid">
          <ChoiceGroup<TravelParty>
            legend="Who is traveling?"
            name="party"
            value={draft.party}
            options={[
              ["solo", "Solo"],
              ["accompanied", "With someone"],
            ]}
            onChange={(value) => setField("party", value)}
          />
          <ChoiceGroup<LodgingType>
            legend="Likely lodging"
            name="lodging"
            value={draft.lodging}
            options={[
              ["hotel", "Hotel"],
              ["rental", "Rental"],
              ["mixed", "A mix"],
            ]}
            onChange={(value) => setField("lodging", value)}
          />
          </div>

          <fieldset className="trip-fieldset transport-options">
          <legend>How will you likely get around?</legend>
          <div>
            {TRANSPORT_MODES.map((mode) => (
              <label key={mode} className={draft.transport.includes(mode) ? "selected" : ""}>
                <input
                  type="checkbox"
                  checked={draft.transport.includes(mode)}
                  onChange={() => toggleTransport(mode)}
                />
                <span>{TRANSPORT_LABELS[mode]}</span>
              </label>
            ))}
          </div>
          </fieldset>
        </section>
          <section className="trip-form-section">
          <div className="trip-form-section-heading"><h2>What matters to you</h2></div>
          <div className="trip-choice-grid final-choices">
          <ChoiceGroup<BeachPlans>
            legend="Beach plans"
            name="beachPlans"
            value={draft.beachPlans}
            options={[
              ["yes", "Definitely"],
              ["maybe", "Maybe"],
              ["no", "Not likely"],
            ]}
            onChange={(value) => setField("beachPlans", value)}
          />
          <ChoiceGroup<SocialPreference>
            legend="Conversation preference"
            name="socialPreference"
            value={draft.socialPreference}
            options={[
              ["minimal", "Keep it brief"],
              ["more", "Open to more"],
            ]}
            onChange={(value) => setField("socialPreference", value)}
          />
          </div>
        </section>
      </details>

      {error && <p className="trip-form-error" role="alert">{error}</p>}

      <div className="trip-setup-footer">
        <p>Saved in this browser only. No account or device sync.</p>
        <div>
          {editing && onCancel && <button type="button" className="trip-cancel" onClick={onCancel}>Cancel</button>}
          <button type="submit" className="trip-save">
            {editing ? "Save trip details" : "Use these trip details"} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </form>
  );

  if (editing) {
    return (
      <div className="modal-backdrop trip-edit-backdrop" role="presentation">
        <section className="trip-edit-modal" role="dialog" aria-modal="true" aria-label="Edit trip details">
          {form}
        </section>
      </div>
    );
  }

  return (
    <main className="trip-setup-shell">
      <div className="trip-setup-brand">
        <div className="brand-mark" aria-hidden="true"><span>30</span><i /></div>
        <div><p>30 Days to Italy</p></div>
      </div>
      {form}
    </main>
  );
}

function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="trip-fieldset choice-options">
      <legend>{legend}</legend>
      <div>
        {options.map(([option, label]) => (
          <label key={option} className={value === option ? "selected" : ""}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TripSummary({
  profile,
  onEdit,
  today,
}: {
  profile: TripProfile;
  onEdit: () => void;
  today?: string;
}) {
  const countdown = departureCountdown(profile.departureDate, today);
  return (
    <section className={`trip-summary ${countdown.status}`} aria-label="Saved trip">
      <div className="trip-countdown">
        <span>Your departure</span>
        <strong>{countdown.label}</strong>
      </div>
      <div className="trip-summary-details">
        <div><span>Preparing for</span><strong>{profile.regionLabel}</strong></div>
        <div><span>Departure</span><strong>{formatDepartureDate(profile.departureDate)}</strong></div>
        <div><span>Trip</span><strong>{profile.tripLengthDays} days · {profile.party === "solo" ? "solo" : "accompanied"}</strong></div>
      </div>
      <button type="button" onClick={onEdit}>Edit trip</button>
    </section>
  );
}
