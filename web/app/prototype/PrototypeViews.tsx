import { Fragment, type FormEvent, type RefObject } from "react";
import {
  ADMIN_FAST_TRACK_CHECKPOINTS,
  type AdminFastTrackCheckpointId,
} from "../admin/fast-track";
import {
  ADMIN_TRUTH_PREVIEWS,
  type AdminTruthPreviewId,
} from "../admin/truth-previews";
import type { AppMode } from "../lifecycle/model";
import type { TripProfile } from "../trip/model";
import { scheduleSeason } from "../season/schedule";
import { IMPLEMENTED_EPISODES, type EpisodeId } from "../season/manifest";
import { nextImplementedEpisode, sceneForEpisode } from "../season/registry";
import type { PocketDeckPracticeEvidence } from "../pocket-deck/model";

import {
  PHRASE_LESSONS,
  money,
  sceneTime,
  type GameState,
  type PhraseExample,
  type PhraseId,
  type PhraseLesson,
  type Scene,
  type TeachingMoment,
  type Turn,
} from "../game/model";

export function PrototypeHeader({
  mode,
  onOpenAdmin,
}: {
  mode: AppMode;
  onOpenAdmin?: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true"><span>30</span><i /></div>
        <div>
          <h1>30 Days to Italy</h1>
          <p className="eyebrow">{mode === "trip" ? "Pocket guide" : "Trip rehearsal"}</p>
        </div>
      </div>
      <div className="topbar-actions">
        <span className="prototype-badge"><i /> Private</span>
        {onOpenAdmin && (
          <button className="quiet-button" type="button" onClick={onOpenAdmin}>
            <span aria-hidden="true">•••</span> Admin
          </button>
        )}
      </div>
    </header>
  );
}

export function DayRail({
  game,
  profile,
  today,
  adminBypass = false,
  onSelect,
}: {
  game: GameState;
  profile: TripProfile;
  today?: string;
  adminBypass?: boolean;
  onSelect: (episodeId: EpisodeId) => void;
}) {
  const schedule = scheduleSeason(profile, game.completed, today, adminBypass).filter(
    (episode) => episode.status === "implemented",
  );
  const currentIndex = Math.max(0, schedule.findIndex((episode) => episode.id === game.episodeId));
  const start = Math.max(0, Math.min(currentIndex - 2, schedule.length - 5));
  const visibleSchedule = schedule.slice(start, start + 5);

  function dayNode(episode: (typeof schedule)[number], compact = false) {
    const item = sceneForEpisode(episode.id)!;
    const isCurrent = episode.id === game.episodeId;
    const isDone = episode.completed;
    const isAvailable = episode.playable || isDone;
    return (
      <button
        type="button"
        key={`${compact ? "all" : "focus"}-${item.id}`}
        className={`day-node ${compact ? "compact" : ""} ${isCurrent ? "current" : ""} ${isDone ? "done" : ""}`}
        disabled={!isAvailable}
        onClick={() => isAvailable && onSelect(episode.id)}
        aria-label={`${item.day}, ${item.title}${isDone ? ", completed" : ""}`}
      >
        <span className="day-dot">{isDone ? "✓" : episode.day}</span>
        <span className="day-copy"><strong>{item.day}</strong><small>{compact ? item.title : item.dateLabel}</small></span>
      </button>
    );
  }

  return (
    <section className="day-rail-wrap" aria-label="Prototype episode progress">
      <div className="day-rail-summary">
        <span>{game.completed.length} of {schedule.length} complete</span>
        <small>Showing the sessions around today</small>
      </div>
      <div className="day-rail">
        {visibleSchedule.map((episode) => dayNode(episode))}
        <div className="rail-line" aria-hidden="true" />
      </div>
      <details className="day-rail-all">
        <summary>All {schedule.length} playable sessions</summary>
        <div>{schedule.map((episode) => dayNode(episode, true))}</div>
      </details>
    </section>
  );
}

export function SceneIntroduction({ scene, status }: { scene: Scene; status: GameState["status"] }) {
  return (
    <>
      <div className="scene-heading">
        <div>
          <p className="scene-kicker">{scene.kicker}</p>
          <h2>{scene.title}</h2>
          <div className="location-line">
            <span>{scene.location}</span><i /> <span>{scene.time}</span>
          </div>
        </div>
        <div className="day-stamp"><span>{scene.day}</span><small>{scene.dateLabel}</small></div>
      </div>

      <div className="scene-objective">
        <span>Your objective</span>
        <strong>{scene.objective}</strong>
      </div>

      {scene.id === "cafe" && status === "active" && (
        <div className="receipt" aria-label="Bar Gabbiano unpaid receipt">
          <div><span>BAR GABBIANO</span><small>NON PAGATO</small></div>
          <p><span>Latte macchiato</span><strong>€3,00</strong></p>
          <p><span>Spremuta</span><strong>€4,50</strong></p>
          <div className="receipt-total"><span>Totale</span><strong>€7,50</strong></div>
        </div>
      )}
    </>
  );
}

export function EncounterStage({
  turn,
  scene,
  game,
  isPlaying,
  hasPlayed,
  transcriptVisible,
  onPlay,
  onRevealTranscript,
}: {
  turn: Turn;
  scene: Scene;
  game: GameState;
  isPlaying: boolean;
  hasPlayed: boolean;
  transcriptVisible: boolean;
  onPlay: (speed: "normal" | "careful") => void;
  onRevealTranscript: () => void;
}) {
  return (
    <>
      <div className={`audio-stage ${isPlaying ? "playing" : ""}`}>
        <div className="speaker-row">
          <div className="avatar">{turn.npc.slice(0, 1)}</div>
          <div><strong>{turn.npc}</strong><span>{scene.role}</span></div>
          <div className="live-line"><i /> Italian audio</div>
        </div>

        <button
          type="button"
          className="play-button"
          onClick={() => onPlay("normal")}
          aria-label={hasPlayed ? `Replay ${turn.npc}` : `Play ${turn.npc}`}
        >
          <span className="play-icon" aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
          <span className="wave" aria-hidden="true">
            {[2, 5, 8, 4, 10, 6, 3, 8, 5, 9, 4, 7, 3, 6, 2].map((height, index) => (
              <i key={index} style={{ height: `${height * 3}px` }} />
            ))}
          </span>
          <span>{hasPlayed ? "Replay line" : "Play the line"}</span>
        </button>

        <div className={`support-row ${hasPlayed ? "available" : ""}`}>
          {hasPlayed && (
            <>
              <button type="button" onClick={() => onPlay("careful")}>
                <span aria-hidden="true">◌</span> Slower
              </button>
              <button type="button" onClick={onRevealTranscript}>
                <span aria-hidden="true">Aa</span> Transcript
              </button>
            </>
          )}
          <p>{turn.cue}</p>
        </div>

        {transcriptVisible && (
          <div className="transcript" role="status">
            <span>Italian transcript</span>
            <p>{turn.text}</p>
          </div>
        )}
      </div>

      {game.history.length > 0 && (
        <div className="history-strip" aria-label="Recent encounter actions">
          {game.history.slice(-1).map((item) => (
            <div key={item.id} className={item.kind}>
              <span>{item.kind === "player" ? "You" : "World"}</span>
              <p>{item.text}</p>
            </div>
          ))}
          {game.history.length > 1 && (
            <details>
              <summary>Earlier actions ({game.history.length - 1})</summary>
              {game.history.slice(-4, -1).map((item) => (
                <div key={item.id} className={item.kind}>
                  <span>{item.kind === "player" ? "You" : "World"}</span>
                  <p>{item.text}</p>
                </div>
              ))}
            </details>
          )}
        </div>
      )}
    </>
  );
}

export function TeachingCard({
  teachingMoment,
  lesson,
  example,
  npc,
  hasPlayed,
  onClose,
  onUse,
  onBuild,
}: {
  teachingMoment: TeachingMoment;
  lesson: PhraseLesson;
  example: PhraseExample;
  npc: string;
  hasPlayed: boolean;
  onClose: () => void;
  onUse: () => void;
  onBuild: () => void;
}) {
  return (
    <section className="teaching-card" aria-live="polite" aria-label="Italian quick refresher">
      <div className="teaching-header">
        <div>
          <span>Quick refresher</span>
          <h3>{lesson.english}</h3>
        </div>
        <button type="button" aria-label="Close refresher" onClick={onClose}>×</button>
      </div>

      <p className="teaching-reassurance">
        {teachingMoment.source === "english"
          ? `${npc} is still waiting. Nothing in the scene changed.`
          : `${npc} is still waiting. Resume whenever you are ready.`}
      </p>

      {teachingMoment.original && (
        <div className="teaching-original">
          <span>You reached for</span>
          <p>{teachingMoment.original}</p>
        </div>
      )}

      <div className="teaching-pattern">
        <span>The pattern</span>
        <strong lang="it">{lesson.italian}</strong>
        <p>{lesson.note}</p>
      </div>

      <div className="teaching-example">
        <span>For this moment</span>
        <strong lang="it">{example.italian}</strong>
        <p>{example.english}</p>
      </div>

      <div className="teaching-actions">
        <button type="button" className="lesson-use" onClick={onUse} disabled={!hasPlayed}>
          Use this reply <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="lesson-practice" onClick={onBuild}>
          I’ll build it myself
        </button>
      </div>
    </section>
  );
}

export function ResponseComposer({
  responseRef,
  input,
  hasPlayed,
  teachingOpen,
  suggestions,
  onInput,
  onSubmit,
  onTeach,
}: {
  responseRef: RefObject<HTMLTextAreaElement | null>;
  input: string;
  hasPlayed: boolean;
  teachingOpen: boolean;
  suggestions: string[];
  onInput: (value: string) => void;
  onSubmit: (event?: FormEvent) => void;
  onTeach: () => void;
}) {
  return (
    <form className="response-box" onSubmit={onSubmit}>
      <div className="response-heading">
        <label htmlFor="player-response">Your response</label>
        <button type="button" onClick={onTeach} disabled={!hasPlayed || teachingOpen}>
          <span aria-hidden="true">＋</span> Teach me a phrase
        </button>
      </div>
      <div className="response-input-row">
        <textarea
          ref={responseRef}
          id="player-response"
          value={input}
          onChange={(event) => onInput(event.target.value)}
          placeholder={hasPlayed ? "Type what you would say or do…" : "Play the Italian line first…"}
          disabled={!hasPlayed || teachingOpen}
          rows={2}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <button type="submit" className="send-button" disabled={!hasPlayed || !input.trim() || teachingOpen}>
          Respond <span aria-hidden="true">↗</span>
        </button>
      </div>
      <details className="suggestion-row">
        <summary>Need an idea?</summary>
        <div>
          {suggestions.map((suggestion) => (
            <button type="button" key={suggestion} onClick={() => onInput(suggestion)} disabled={!hasPlayed}>
              {suggestion}
            </button>
          ))}
        </div>
      </details>
    </form>
  );
}

export function nextSceneFor(game: Pick<GameState, "episodeId">): Scene | null {
  return nextImplementedEpisode(game.episodeId)?.scene ?? null;
}

export function OutcomeCard({
  game,
  nextScene,
  showNatural,
  onToggleNatural,
  onNext,
  onReview,
  onRestart,
  handoff,
  handoffApplied,
  onCarryToDeck,
  onOpenInTripMode,
  onOpenTripMode,
}: {
  game: GameState;
  nextScene?: Scene | null;
  showNatural: boolean;
  onToggleNatural: () => void;
  onNext: () => void;
  onReview: () => void;
  onRestart: () => void;
  handoff?: PocketDeckPracticeEvidence | null;
  handoffApplied?: boolean;
  onCarryToDeck?: () => void;
  onOpenInTripMode?: () => void;
  onOpenTripMode?: () => void;
}) {
  const availableNextScene = nextScene === undefined ? nextSceneFor(game) : nextScene;
  return (
    <div className={`outcome-card ${game.outcome?.tone ?? "success"}`}>
      <div className="outcome-icon">{game.outcome?.tone === "success" ? "✓" : game.outcome?.tone === "partial" ? "~" : "↗"}</div>
      <p>What happened</p>
      <h3>{game.outcome?.title}</h3>
      <p className="outcome-detail">{game.outcome?.detail}</p>
      <div className="consequence-line"><span>World consequence</span><strong>{game.outcome?.consequence}</strong></div>

      {game.feedback?.automatic && (
        <div className="feedback-card">
          <p>Useful correction</p>
          <div><span>What we understood</span><strong>{game.feedback.understood}</strong></div>
          <div><span>A natural way to say it</span><strong lang="it">{game.feedback.natural}</strong></div>
          <button type="button" onClick={onToggleNatural}>
            {showNatural ? "Hide variation" : "Show one useful variation"}
          </button>
          {showNatural && <em lang="it">{game.feedback.variation}</em>}
        </div>
      )}

      {!game.feedback?.automatic && game.feedback && (
        <div className="optional-feedback">
          <button type="button" onClick={onToggleNatural}>
            {showNatural ? "Hide language note" : "See a natural way to say it"}
          </button>
          {showNatural && (
            <div>
              <span>We understood: {game.feedback.understood}</span>
              <strong lang="it">{game.feedback.natural}</strong>
              <em lang="it">{game.feedback.variation}</em>
            </div>
          )}
        </div>
      )}

      {game.seasonCompletion && game.status !== "complete" && (
        <div className="historical-completion-note" role="status">
          <strong>Earlier season completion remains recorded.</strong>
          <span>
            This replay ended as “{game.outcome?.title}.” It did not erase completion attempt {game.seasonCompletion.attempt}.
          </span>
        </div>
      )}

      <div className="outcome-actions">
        {game.status === "complete" ? (
          <div className="season-completion-summary">
            <p className="season-completion-kicker">Your rehearsal season is complete</p>
            <h4>31 practical sessions, carried into one departure-ready record.</h4>
            <ul>
              <li>Keys: {game.seasonCompletion?.keyResolution.apartment} apartment · {game.seasonCompletion?.keyResolution.hotel} hotel</li>
              <li>Departure: {game.seasonCompletion?.departurePlan}</li>
              <li>{game.seasonCompletion?.openIssues.length ? `${game.seasonCompletion.openIssues.length} acknowledged open issue` : "No open issues recorded"}</li>
            </ul>
            <button type="button" className="primary-action" onClick={onOpenTripMode}>
              Open Trip Mode <span>→</span>
            </button>
            <button type="button" className="secondary-action" onClick={onReview}>Review the season</button>
          </div>
        ) : availableNextScene ? (
          <button type="button" className="primary-action" onClick={onNext}>
            Continue to {availableNextScene.day} <span>→</span>
          </button>
        ) : (
          <>
            <p className="season-planned-note">
              {game.episodeId === "day-30"
                ? "This checkout attempt did not complete the season. Replay Day 30 when the keys and departure plan are resolved."
                : "The next rehearsal is scheduled closer to departure. Completed sessions remain available for replay."}
            </p>
            <button type="button" className="primary-action" onClick={onReview}>
              Return to season overview <span>→</span>
            </button>
          </>
        )}
        <button type="button" className="secondary-action" onClick={onRestart}>Replay this day</button>
        {handoff && onCarryToDeck && onOpenInTripMode && (
          handoffApplied ? (
            <button type="button" className="secondary-action" onClick={onOpenInTripMode}>
              Open strengthened card in Trip Mode
            </button>
          ) : (
            <button type="button" className="secondary-action" onClick={onCarryToDeck}>
              Carry this into my Pocket Deck
            </button>
          )
        )}
      </div>
    </div>
  );
}

export function WorldPanel({
  game,
  scene,
  possessions,
  support,
  totalSupport,
  totalPhraseRefreshers,
  activePhraseId,
  onOpenPhrase,
}: {
  game: GameState;
  scene: Scene;
  possessions: string[];
  support: { replay: number; careful: number; transcript: number };
  totalSupport: number;
  totalPhraseRefreshers: number;
  activePhraseId: PhraseId | null;
  onOpenPhrase: (phraseId: PhraseId) => void;
}) {
  return (
    <aside className="world-panel">
      <div className="world-header">
        <div><p>Right now</p><h3>{scene.location.split(" · ")[0]}</h3></div>
        <span>{sceneTime(game.episodeId)} · {money(game.money)}</span>
      </div>

      <details className="world-section phrase-toolkit">
        <summary>
          <span>Need a phrase?</span>
          <small>{totalPhraseRefreshers ? `${totalPhraseRefreshers} refreshed` : `${PHRASE_LESSONS.length} quick patterns`}</small>
        </summary>
        <div className="phrase-grid">
          {PHRASE_LESSONS.map((lesson) => {
            const count = game.phrasePractice?.[lesson.id] ?? 0;
            return (
              <button
                type="button"
                key={lesson.id}
                onClick={() => onOpenPhrase(lesson.id)}
                className={activePhraseId === lesson.id ? "active" : ""}
                disabled={game.status !== "active"}
              >
                <span>{lesson.english}</span>
                <strong lang="it">{lesson.italian.replace("…", "")}</strong>
                {count > 0 && <small aria-label={`Refreshed ${count} times`}>{count}×</small>}
              </button>
            );
          })}
        </div>
      </details>

      <details className="world-section context-details">
        <summary>Trip context and support</summary>
        <div className="context-detail-grid">
          <div>
            <span>With you</span>
            <p>{possessions.length ? possessions.join(" · ") : "Phone and wallet"}</p>
          </div>
          <div>
            <span>Listening help</span>
            <p>{totalSupport ? `${totalSupport} used today` : "None yet"}</p>
          </div>
        </div>
        <div className="support-meter">
          <div><i style={{ width: `${Math.min(100, support.replay * 22)}%` }} /><span>Replay</span><strong>{support.replay}</strong></div>
          <div><i style={{ width: `${Math.min(100, support.careful * 22)}%` }} /><span>Slower</span><strong>{support.careful}</strong></div>
          <div><i style={{ width: `${Math.min(100, support.transcript * 22)}%` }} /><span>Transcript</span><strong>{support.transcript}</strong></div>
        </div>
      </details>

      {(game.cafeOutcome || game.ferryMemory) && (
        <div className="world-section memory-section">
          <p className="section-label">Remembered later</p>
          {game.cafeOutcome && <div><span>Giulia</span><p>{game.cafeOutcome}</p></div>}
          {game.ferryMemory && <div><span>Trip</span><p>{game.ferryMemory}</p></div>}
        </div>
      )}

      <p className="quiet-contract">Short answers, mixed language, and leaving are all valid.</p>
    </aside>
  );
}

export function AdminModal({
  game,
  profile,
  activeCheckpointId,
  nextCheckpointId,
  onClose,
  onSelectCheckpoint,
  onSelectTruthPreview,
  onRestart,
  onUseLiveDate,
  onReset,
}: {
  game: GameState;
  profile: TripProfile;
  activeCheckpointId: AdminFastTrackCheckpointId | null;
  nextCheckpointId: AdminFastTrackCheckpointId | null;
  onClose: () => void;
  onSelectCheckpoint: (id: AdminFastTrackCheckpointId) => void;
  onSelectTruthPreview: (id: AdminTruthPreviewId) => void;
  onRestart: () => void;
  onUseLiveDate: () => void;
  onReset: () => void;
}) {
  const nextCheckpoint = ADMIN_FAST_TRACK_CHECKPOINTS.find(
    (checkpoint) => checkpoint.id === nextCheckpointId,
  );
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="admin-modal" role="dialog" aria-modal="true" aria-label="Prototype admin" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div><p>Prototype admin</p><h2>Fast-track and inspect</h2></div>
          <button type="button" onClick={onClose} aria-label="Close admin">×</button>
        </div>

        <div className="admin-summary">
          <div><span>Money</span><strong>{money(game.money)}</strong></div>
          <div><span>Completed</span><strong>{game.completed.length} / {IMPLEMENTED_EPISODES.length} playable</strong></div>
          <div><span>Current state</span><strong>{game.status}</strong></div>
        </div>

        <div className="admin-section">
          <p>Fast-track the 30-day lifecycle</p>
          <div className="admin-fast-track-intro">
            <strong>No waiting required.</strong>
            <span>
              These checkpoints preview the calendar without changing your saved {profile.departureDate} departure.
            </span>
            <span>{IMPLEMENTED_EPISODES.length} playable · full Day 0–30 season</span>
          </div>
          <div className="admin-days admin-checkpoints">
            {ADMIN_FAST_TRACK_CHECKPOINTS.map((checkpoint, index) => {
              const day = checkpoint.id === "trip" ? 31 : Number(checkpoint.id.slice(4));
              const phase = checkpoint.id === "trip" ? "During the trip" : day <= 7 ? "Arrival foundation" : day <= 13 ? "Independent routines" : day <= 20 ? "Recovery and continuity" : day <= 26 ? "Familiarity" : "Departure and independence";
              const previous = index === 0 ? null : ADMIN_FAST_TRACK_CHECKPOINTS[index - 1];
              const previousDay = previous?.id === "trip" ? 31 : previous ? Number(previous.id.slice(4)) : -1;
              const previousPhase = !previous ? null : previous.id === "trip" ? "During the trip" : previousDay <= 7 ? "Arrival foundation" : previousDay <= 13 ? "Independent routines" : previousDay <= 20 ? "Recovery and continuity" : previousDay <= 26 ? "Familiarity" : "Departure and independence";
              return (
                <Fragment key={checkpoint.id}>
                  {phase !== previousPhase && <h3 className="admin-phase-heading">{phase}</h3>}
                  <button
                    type="button"
                    className={activeCheckpointId === checkpoint.id ? "active" : ""}
                    aria-pressed={activeCheckpointId === checkpoint.id}
                    onClick={() => onSelectCheckpoint(checkpoint.id)}
                  >
                    <span>{index + 1} · {checkpoint.eyebrow}</span>
                    <strong>{checkpoint.title}</strong>
                    <small>{checkpoint.detail}</small>
                  </button>
                </Fragment>
              );
            })}
          </div>
          <div className="admin-fast-track-actions">
            {nextCheckpoint ? (
              <button type="button" className="admin-next-checkpoint" onClick={() => onSelectCheckpoint(nextCheckpoint.id)}>
                Next checkpoint: {nextCheckpoint.title} <span aria-hidden="true">→</span>
              </button>
            ) : (
              <span className="admin-fast-track-complete">You are at the final checkpoint.</span>
            )}
            {activeCheckpointId && (
              <button type="button" className="admin-live-date" onClick={onUseLiveDate}>
                Return to live date
              </button>
            )}
          </div>
        </div>

        <div className="admin-section">
          <p>Truth-state previews</p>
          <div className="admin-fast-track-intro">
            <strong>Audit the conditional episodes directly.</strong>
            <span>These Admin-only seeds change rehearsal state so each Day 19 and Day 21 consequence can be checked without replaying prior days.</span>
          </div>
          <div className="admin-days admin-checkpoints">
            {ADMIN_TRUTH_PREVIEWS.map((preview) => (
              <button
                key={preview.id}
                type="button"
                onClick={() => onSelectTruthPreview(preview.id)}
              >
                <strong>{preview.label}</strong>
                <small>{preview.detail}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-section audit-section">
          <p>Authoritative snapshot</p>
          <dl>
            <div><dt>Hotel key</dt><dd>{game.hotelKey ? "Issued" : "Not issued"}</dd></div>
            <div><dt>Apartment key</dt><dd>{game.apartmentKey ? "Issued" : "Not issued"}</dd></div>
            <div><dt>Inventory</dt><dd>{game.inventory.length ? game.inventory.join(" · ") : "Empty"}</dd></div>
            <div><dt>Bus route</dt><dd>{game.routeFact ?? "Not known"}</dd></div>
            <div><dt>Pharmacy item</dt><dd>{game.pharmacyItem ?? "None"}</dd></div>
            <div><dt>Beach rental</dt><dd>{game.rental ?? "None"}</dd></div>
            <div><dt>Café state</dt><dd>{game.cafeOutcome ?? "No resolved event"}</dd></div>
            <div><dt>Ferry memory</dt><dd>{game.ferryMemory ?? "Not shared"}</dd></div>
            <div><dt>Location / time</dt><dd>{game.currentLocation} · {game.currentTime}</dd></div>
            <div><dt>Laundry</dt><dd>{game.laundryStatus}</dd></div>
            <div><dt>Transport</dt><dd>{game.transportMode} · {game.transportStatus}</dd></div>
            <div><dt>Hot water</dt><dd>{game.hotWaterStatus}</dd></div>
            <div><dt>Repair commitment</dt><dd>{game.repairCommitment ? `${game.repairCommitment.window} · ${game.repairCommitment.status}` : "None"}</dd></div>
            <div><dt>Parcel</dt><dd>{game.parcelStatus}</dd></div>
            <div><dt>Second parcel</dt><dd>{game.secondParcelStatus}</dd></div>
            <div><dt>Beach plan / remedy</dt><dd>{game.beachPlanStatus} · {game.beachRemedy}</dd></div>
            <div><dt>Invitation / attendance</dt><dd>{game.invitationResponse} · {game.eventAttendance}</dd></div>
            <div><dt>Table preference</dt><dd>{game.tablePreference}</dd></div>
            <div><dt>Repair credit</dt><dd>{game.repairCreditEligibility} · {game.repairCreditStatus}</dd></div>
            <div><dt>Day-trip plan</dt><dd>{game.transportPlan ? `${game.transportPlan.firstDeparture} · ${game.transportPlan.changeAt} · ${game.transportPlan.connectionTime} · stand ${game.transportPlan.stand}` : "None"}</dd></div>
            <div><dt>Key custody</dt><dd>hotel {game.keyCustody.hotel} · apartment {game.keyCustody.apartment}</dd></div>
            <div><dt>Departure</dt><dd>{game.departurePlan ?? game.departureStatus}</dd></div>
            <div><dt>Season completion</dt><dd>{game.seasonCompletion ? `${game.seasonCompletion.outcomeId} · attempt ${game.seasonCompletion.attempt}` : "Not complete"}</dd></div>
            <div><dt>Last outcome</dt><dd>{game.outcome?.id ?? "None"}</dd></div>
          </dl>
        </div>

        <div className="admin-actions">
          <button type="button" onClick={onRestart}>Restart current day</button>
          <button type="button" className="danger" onClick={onReset}>Reset entire prototype</button>
        </div>
      </section>
    </div>
  );
}
