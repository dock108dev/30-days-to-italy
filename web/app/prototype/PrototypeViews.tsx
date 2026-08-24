import { Fragment, useState, type FormEvent, type RefObject } from "react";
import {
  ADMIN_FAST_TRACK_CHECKPOINTS,
  type AdminFastTrackCheckpointId,
} from "../admin/fast-track";
import {
  ADMIN_TRUTH_PREVIEWS,
  type AdminTruthPreviewId,
} from "../admin/truth-previews";
import {
  checkpointAuditStatus,
  type DemoConductor,
} from "../admin/demo-conductor";
import type { ApplicationSessionMode } from "../persistence/session";
import type { AppMode } from "../lifecycle/model";
import type { TripProfile } from "../trip/model";
import { scheduleSeason } from "../season/schedule";
import { EPISODE_BY_ID, SEASON_01, type EpisodeId } from "../season/manifest";
import { nextImplementedEpisode, sceneForEpisode } from "../season/registry";
import { episodeResultFor, type ObservedMove } from "../season/types";
import type { PocketDeckPracticeEvidence } from "../pocket-deck/model";
import { CORE_POCKET_DECK_CARD_BY_ID } from "../pocket-deck/catalog";

import {
  PHRASE_LESSONS,
  PLAYER_RESPONSE_MAX_LENGTH,
  fallbackPhraseForContext,
  money,
  phraseExampleFor,
  sceneTime,
  type GameState,
  type PhraseExample,
  type PhraseId,
  type PhraseLesson,
  type Scene,
  type TeachingMoment,
  type Turn,
} from "../game/model";

export type InteractionPhase =
  | "awaiting_line"
  | "ready_to_respond"
  | "submitting"
  | "resolved";

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

export function CompactSessionProgress({
  game,
  profile,
  today,
  adminBypass = false,
  onBrowse,
}: {
  game: GameState;
  profile: TripProfile;
  today?: string;
  adminBypass?: boolean;
  onBrowse: () => void;
}) {
  const schedule = scheduleSeason(profile, game.completed, today, adminBypass);
  const current = sceneForEpisode(game.episodeId)!;

  return (
    <section className="compact-session-progress" aria-label="Current rehearsal progress">
      <div className="compact-progress-current">
        <span>{current.day}</span>
        <strong>{current.title}</strong>
      </div>
      <div className="compact-progress-count">
        <strong>{game.completed.length} of {schedule.length}</strong>
        <span>sessions complete</span>
      </div>
      <button type="button" onClick={onBrowse}>Browse all {schedule.length} sessions</button>
    </section>
  );
}

export function SeasonOverview({
  game,
  profile,
  today,
  adminBypass = false,
  closeRef,
  onClose,
  onEditTrip,
  onSelect,
}: {
  game: GameState;
  profile: TripProfile;
  today?: string;
  adminBypass?: boolean;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onEditTrip: () => void;
  onSelect: (episodeId: EpisodeId) => void;
}) {
  const schedule = scheduleSeason(profile, game.completed, today, adminBypass);
  return (
    <div className="season-overview-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="season-overview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="season-overview-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled), summary, [href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
          )].filter((element) => element.getClientRects().length > 0);
          const first = focusable[0];
          const last = focusable.at(-1);
          if (!first || !last) return;
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="season-overview-header">
          <div>
            <p>Your rehearsal season</p>
            <h2 id="season-overview-title">All 31 practical sessions</h2>
            <span>{game.completed.length} complete · progress is stored on this device</span>
          </div>
          <div className="season-overview-header-actions">
            <button type="button" className="season-edit-trip" onClick={onEditTrip}>Edit trip details</button>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close season overview">×</button>
          </div>
        </div>
        <div className="season-overview-grid">
          {schedule.map((episode) => {
            const isCurrent = episode.id === game.episodeId;
            const isAvailable = episode.playable || episode.completed;
            return (
              <button
                type="button"
                key={episode.id}
                className={`${isCurrent ? "current" : ""} ${episode.completed ? "done" : ""}`}
                disabled={!isAvailable}
                onClick={() => isAvailable && onSelect(episode.id)}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span>{episode.completed ? "✓" : `Day ${episode.day}`}</span>
                <strong>{episode.title}</strong>
                <small>{episode.completed ? "Completed" : episode.playable ? "Available" : "Scheduled"}</small>
              </button>
            );
          })}
        </div>
        <p className="season-overview-note">Choose an available session, or close this overview to keep the current moment unchanged.</p>
      </section>
    </div>
  );
}

export function SceneIntroduction({ scene, status }: { scene: Scene; status: GameState["status"] }) {
  return (
    <>
      <div className="scene-heading">
        <div>
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
  interactionPhase,
  audioFailed,
  transcriptVisible,
  onPlay,
  onRevealTranscript,
}: {
  turn: Turn;
  scene: Scene;
  game: GameState;
  isPlaying: boolean;
  interactionPhase: InteractionPhase;
  audioFailed: boolean;
  transcriptVisible: boolean;
  onPlay: (speed: "normal" | "careful") => void;
  onRevealTranscript: () => void;
}) {
  const lineStarted = interactionPhase !== "awaiting_line";
  const latestConsequence = [...game.history].reverse().find((item) => item.kind === "system");
  const earlierConsequences = game.history
    .filter((item) => item.kind === "system" && item.id !== latestConsequence?.id)
    .slice(-3);
  return (
    <>
      <div
        className={`audio-stage ${isPlaying ? "playing" : ""}`}
        data-interaction-phase={interactionPhase}
      >
        <div className="speaker-row">
          <div className="avatar">{turn.npc.slice(0, 1)}</div>
          <div><strong>{turn.npc}</strong><span>{scene.role}</span></div>
          <div className="live-line"><i /> Italian audio</div>
        </div>

        <button
          type="button"
          className={`play-button ${lineStarted ? "replay-button" : ""}`}
          onClick={() => onPlay("normal")}
          aria-label={lineStarted ? `Replay ${turn.npc}` : `Play ${turn.npc}`}
          disabled={interactionPhase === "submitting"}
          data-primary-action={!lineStarted ? "true" : undefined}
        >
          <span className="play-icon" aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
          <span className="wave" aria-hidden="true">
            {[2, 5, 8, 4, 10, 6, 3, 8, 5, 9, 4, 7, 3, 6, 2].map((height, index) => (
              <i key={index} style={{ height: `${height * 3}px` }} />
            ))}
          </span>
          <span>{lineStarted ? "Replay line" : "Play the line"}</span>
        </button>

        <div className={`support-row ${lineStarted ? "available" : ""}`}>
          {lineStarted && (
            <>
              <button type="button" onClick={() => onPlay("careful")}>
                <span aria-hidden="true">◌</span> Slower
              </button>
              <button type="button" onClick={onRevealTranscript}>
                <span aria-hidden="true">Aa</span> Transcript
              </button>
            </>
          )}
          {lineStarted && <p>{turn.cue}</p>}
        </div>

        {transcriptVisible && (
          <div className="transcript" role="status">
            <span>Italian transcript</span>
            <p>{turn.text}</p>
          </div>
        )}

        {audioFailed && (
          <div className="audio-fallback" role="alert">
            <strong>Audio could not play.</strong>
            <span>The transcript is available, and you can still respond.</span>
          </div>
        )}
      </div>

      {game.guidance && (
        <div className="response-guidance" role="status" aria-label="Response guidance">
          <span>Try this</span>
          <p>{game.guidance}</p>
        </div>
      )}

      {latestConsequence && (
        <div className="history-strip" aria-label="Recent encounter consequence">
          <div key={latestConsequence.id} className={latestConsequence.kind}>
            <span>Just changed</span>
            <p>{latestConsequence.text}</p>
          </div>
          {earlierConsequences.length > 0 && (
            <details>
              <summary>Earlier encounter history ({earlierConsequences.length})</summary>
              {earlierConsequences.map((item) => (
                <div key={item.id} className={item.kind}>
                  <span>Earlier</span>
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
  closeRef,
  onClose,
  onBuild,
}: {
  teachingMoment: TeachingMoment;
  lesson: PhraseLesson;
  example: PhraseExample;
  npc: string;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onBuild: () => void;
}) {
  return (
    <section className="teaching-card" aria-live="polite" aria-label="Italian quick refresher">
      <div className="teaching-header">
        <div>
          <span>Quick refresher</span>
          <h3>{lesson.english}</h3>
        </div>
        <button ref={closeRef} type="button" aria-label="Close refresher" onClick={onClose}>×</button>
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
        <button type="button" className="lesson-practice" onClick={onBuild}>
          Close and write my response <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

export function ResponseComposer({
  responseRef,
  input,
  interactionPhase,
  teachingOpen,
  onInput,
  onSubmit,
  onTeach,
}: {
  responseRef: RefObject<HTMLTextAreaElement | null>;
  input: string;
  interactionPhase: Extract<InteractionPhase, "ready_to_respond" | "submitting">;
  teachingOpen: boolean;
  onInput: (value: string) => void;
  onSubmit: (event?: FormEvent) => void;
  onTeach: () => void;
}) {
  const submitting = interactionPhase === "submitting";
  return (
    <form className="response-box" onSubmit={onSubmit} aria-busy={submitting}>
      <div className="response-heading">
        <label htmlFor="player-response">Your response</label>
        <button
          type="button"
          onClick={onTeach}
          disabled={submitting}
          aria-expanded={teachingOpen}
        >
          <span aria-hidden="true">＋</span> Teach me a phrase
        </button>
      </div>
      <div className="response-input-row">
        <textarea
          ref={responseRef}
          id="player-response"
          value={input}
          onChange={(event) => onInput(event.target.value)}
          maxLength={PLAYER_RESPONSE_MAX_LENGTH}
          placeholder="Type what you would say or do…"
          disabled={submitting}
          rows={2}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <button
          type="submit"
          className={`send-button ${submitting ? "submitting" : ""}`}
          disabled={submitting || !input.trim()}
          data-primary-action={!submitting ? "true" : undefined}
        >
          {submitting ? "Submitting…" : "Respond"} <span aria-hidden="true">↗</span>
        </button>
      </div>
    </form>
  );
}

function nextSceneFor(game: Pick<GameState, "episodeId">): Scene | null {
  return nextImplementedEpisode(game.episodeId)?.scene ?? null;
}

const OBSERVED_MOVE_LABELS: Record<ObservedMove, string> = {
  identify: "identifying yourself",
  request: "requesting what you needed",
  quantity: "clarifying the quantity",
  preference: "stating your preference",
  location: "confirming the location details",
  price: "confirming the price",
  recovery: "recovering from a misunderstanding",
  confirm: "confirming the practical plan",
  decline: "declining the offer",
  pay: "choosing how to pay",
  boundary: "ending the exchange on your terms",
  problem: "reporting the practical problem",
};

function naturalList(items: readonly string[]): string {
  if (items.length === 0) return "no additional communicative move";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

export function recordedIntentSummary(game: GameState): string {
  if (game.feedback?.understood) return game.feedback.understood;
  const result = episodeResultFor(game.episodeResults, game.episodeId);
  const moves = [...new Set(result?.observedMoves ?? [])].map((move) => OBSERVED_MOVE_LABELS[move]);
  if (moves.length === 0) {
    return "No additional communicative move was recorded beyond the authoritative result below.";
  }
  return `The accepted response was recorded as ${naturalList(moves)}.`;
}

export type PocketDeckReviewState = "available" | "strengthened" | "none";

export function pocketDeckReviewState(
  handoff: PocketDeckPracticeEvidence | null | undefined,
  handoffApplied: boolean,
): PocketDeckReviewState {
  if (!handoff) return "none";
  return handoffApplied ? "strengthened" : "available";
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
  const scene = sceneForEpisode(game.episodeId)!;
  const episode = EPISODE_BY_ID.get(game.episodeId);
  const result = episodeResultFor(game.episodeResults, game.episodeId);
  const pocketCard = episode?.pocketCardId
    ? CORE_POCKET_DECK_CARD_BY_ID.get(episode.pocketCardId)
    : null;
  const fallbackPhrase = phraseExampleFor(
    fallbackPhraseForContext(scene.id, game.turnId, game.episodeId),
    scene.id,
    game.episodeId,
  );
  const usefulPhrase = game.feedback?.natural ?? pocketCard?.primaryItalian ?? fallbackPhrase.italian;
  const variation = game.feedback?.variation
    ?? (pocketCard?.shortItalian !== usefulPhrase ? pocketCard?.shortItalian : undefined);
  const deckState = pocketDeckReviewState(handoff, Boolean(handoffApplied));
  const deckCardName = handoff
    ? CORE_POCKET_DECK_CARD_BY_ID.get(handoff.cardId)?.englishIntent ?? "this situation"
    : null;
  return (
    <div className={`outcome-card ${game.outcome?.tone ?? "success"}`} aria-labelledby="completion-review-title">
      <div className="outcome-review-heading">
        <div>
          <p>Day complete</p>
          <h3 id="completion-review-title">{game.outcome?.title}</h3>
          <span>The practical result is recorded.</span>
        </div>
        <div className="outcome-icon" aria-hidden="true">{game.outcome?.tone === "success" ? "✓" : game.outcome?.tone === "partial" ? "~" : "↗"}</div>
      </div>

      <section className="review-section objective-result" data-review-section="objective-result">
        <span className="review-number">1</span>
        <div>
          <p>Practical result</p>
          <strong>{game.outcome?.consequence}</strong>
          <span>{game.outcome?.detail}</span>
        </div>
      </section>

      <section className="review-section useful-phrasing" data-review-section="useful-phrasing">
        <span className="review-number">2</span>
        <div>
          <p>One useful phrasing</p>
          <strong lang="it">{usefulPhrase}</strong>
        </div>
      </section>

      <section className="review-section pocket-deck-effect" data-review-section="pocket-deck-effect" data-pocket-deck-state={deckState}>
        <span className="review-number">3</span>
        <div>
          <p>Pocket Deck effect</p>
          {deckState === "available" && (
            <>
              <strong>Evidence is available, but it has not been carried.</strong>
              <span>The existing “{deckCardName}” card can be strengthened{handoff?.preferenceSelected ? ` with your ${handoff.preferenceSelected} choice` : ""}.</span>
            </>
          )}
          {deckState === "strengthened" && (
            <>
              <strong>An existing Pocket Deck card was strengthened.</strong>
              <span>This attempt{handoff?.preferenceSelected ? ` and its ${handoff.preferenceSelected} choice` : ""} is persisted on “{deckCardName}.”</span>
            </>
          )}
          {deckState === "none" && (
            <>
              <strong>This attempt earned no Pocket Deck evidence.</strong>
              <span>No card was added or strengthened.</span>
            </>
          )}
        </div>
      </section>

      <details className="review-details">
        <summary>Response and evidence</summary>
        <section className="review-section understood-intent" data-review-section="understood-intent">
          <div>
            <p>Understood intent</p>
            {result?.response && <span className="recorded-response">You wrote “{result.response}”</span>}
            <strong>{recordedIntentSummary(game)}</strong>
          </div>
        </section>
        <section className="review-section world-consequence" data-review-section="world-consequence">
          <div>
            <p>Authoritative evidence</p>
            <strong>{scene.objective}</strong>
            <span>{game.outcome?.consequence}</span>
          </div>
        </section>
        {variation && (
          <details
            className="review-variation"
            open={showNatural}
            onToggle={(event) => {
              if (event.currentTarget.open !== showNatural) onToggleNatural();
            }}
          >
            <summary>{showNatural ? "Hide phrase variation" : "Show phrase variation"}</summary>
            <span lang="it">{variation}</span>
          </details>
        )}
      </details>

      {game.seasonCompletion && game.status !== "complete" && (
        <div className="historical-completion-note" role="status">
          <strong>Earlier season completion remains recorded.</strong>
          <span>
            This replay ended as “{game.outcome?.title}.” It did not erase completion attempt {game.seasonCompletion.attempt}.
          </span>
        </div>
      )}

      <section className="review-section next-action" data-review-section="next-action">
        <span className="review-number">4</span>
        <div>
          <p>Next action</p>
          {game.status === "complete" ? (
            <div className="season-completion-summary">
              <strong>Your 31-session rehearsal season is complete.</strong>
              <span>Keys: {game.seasonCompletion?.keyResolution.apartment} apartment · {game.seasonCompletion?.keyResolution.hotel} hotel · Departure: {game.seasonCompletion?.departurePlan}</span>
              <button type="button" className="primary-action" data-primary-action="true" onClick={onOpenTripMode}>
                Open Trip Mode <span>→</span>
              </button>
            </div>
          ) : availableNextScene ? (
            <>
              <strong>{availableNextScene.title} is next.</strong>
              <button type="button" className="primary-action" data-primary-action="true" onClick={onNext}>
                Continue to {availableNextScene.day} <span>→</span>
              </button>
            </>
          ) : (
            <>
              <strong>{game.episodeId === "day-30"
                ? "Replay Day 30 when the keys and departure plan are resolved."
                : "The next rehearsal is scheduled closer to departure."}</strong>
              <button type="button" className="primary-action" data-primary-action="true" onClick={onReview}>
                Return to season overview <span>→</span>
              </button>
            </>
          )}

          <div className="review-secondary-actions">
            <button type="button" className="secondary-action" onClick={onRestart}>Replay this day</button>
            <button type="button" className="secondary-action" onClick={onReview}>Review the season</button>
            {handoff && onCarryToDeck && (
              handoffApplied ? (
                onOpenInTripMode ? (
                  <button type="button" className="secondary-action" onClick={onOpenInTripMode}>
                    Open strengthened card in Trip Mode
                  </button>
                ) : (
                  <span className="demo-trip-locked">Carried in Demo mode · Trip Mode unlocks after Day 30</span>
                )
              ) : (
                <button type="button" className="secondary-action" onClick={onCarryToDeck}>
                  Carry this into my Pocket Deck
                </button>
              )
            )}
          </div>
        </div>
      </section>
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
  relevantPhraseIds,
  onOpenPhrase,
}: {
  game: GameState;
  scene: Scene;
  possessions: string[];
  support: { replay: number; careful: number; transcript: number };
  totalSupport: number;
  totalPhraseRefreshers: number;
  activePhraseId: PhraseId | null;
  relevantPhraseIds: readonly PhraseId[];
  onOpenPhrase: (phraseId: PhraseId) => void;
}) {
  const relevantLessons = relevantPhraseIds.map((phraseId) => PHRASE_LESSONS.find((lesson) => lesson.id === phraseId)!).filter(Boolean);
  const remainingLessons = PHRASE_LESSONS.filter((lesson) => !relevantPhraseIds.includes(lesson.id));

  function phraseButton(lesson: PhraseLesson) {
    const count = game.phrasePractice?.[lesson.id] ?? 0;
    return (
      <button
        type="button"
        key={lesson.id}
        onClick={() => onOpenPhrase(lesson.id)}
        className={activePhraseId === lesson.id ? "active" : ""}
      >
        <span>{lesson.english}</span>
        <strong lang="it">{lesson.italian.replace("…", "")}</strong>
        {count > 0 && <small aria-label={`Refreshed ${count} times`}>{count}×</small>}
      </button>
    );
  }

  return (
    <aside className="world-panel" aria-label="Optional rehearsal help">
      <div className="world-header">
        <div><p>Optional help</p><h3>For this turn</h3></div>
        <span>{sceneTime(game.episodeId)} · {money(game.money)}</span>
      </div>

      <details className="world-section phrase-toolkit">
        <summary>
          <span>Phrase help</span>
          <small>{relevantLessons.length} relevant patterns</small>
        </summary>
        <p className="phrase-context-note">These are the closest patterns for the current episode and turn.</p>
        <div className="phrase-grid phrase-grid-relevant">{relevantLessons.map(phraseButton)}</div>
        <details className="phrase-library-disclosure">
          <summary>Browse the other {remainingLessons.length} patterns</summary>
          <div className="phrase-grid phrase-grid-full">{remainingLessons.map(phraseButton)}</div>
        </details>
      </details>

      <details className="world-section context-details">
        <summary>Trip detail and listening history</summary>
        <div className="context-detail-grid">
          <div>
            <span>Right now</span>
            <p>{scene.location.split(" · ")[0]} · {possessions.length ? possessions.join(" · ") : "Phone and wallet"}</p>
          </div>
          <div>
            <span>Listening help</span>
            <p>{totalSupport ? `${totalSupport} used today` : "None yet"}</p>
          </div>
          <div>
            <span>Phrase refreshers</span>
            <p>{totalPhraseRefreshers ? `${totalPhraseRefreshers} practiced` : "None yet"}</p>
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

export function DemoModeBanner({
  conductor,
  checkpoint,
  onOpenConductor,
  onExit,
  onReturnFromPreview,
}: {
  conductor: DemoConductor;
  checkpoint: (typeof ADMIN_FAST_TRACK_CHECKPOINTS)[number];
  onOpenConductor: () => void;
  onExit: () => void;
  onReturnFromPreview: () => void;
}) {
  const sequence = ADMIN_FAST_TRACK_CHECKPOINTS.findIndex((item) => item.id === checkpoint.id) + 1;
  const statusLabel = conductor.previewId
    ? "Conditional truth preview"
    : checkpoint.id === "trip"
      ? "Season complete · Trip Mode open"
    : conductor.checkpointStatus === "simulated"
      ? "Canonically simulated"
      : conductor.checkpointStatus === "resolved"
        ? "Played normally"
        : conductor.checkpointStatus === "active"
          ? "Playing normally"
          : "Unplayed";
  return (
    <section className="demo-mode-banner" aria-label="Demo mode" data-demo-checkpoint={checkpoint.id}>
      <div>
        <span>Demo mode · checkpoint {sequence} of {ADMIN_FAST_TRACK_CHECKPOINTS.length}</span>
        <strong>{checkpoint.id === "trip" ? "Trip Mode" : checkpoint.detail.split(" · ")[0]} · {checkpoint.title}</strong>
        <p>{statusLabel}. Synthetic, isolated state—never owner history.</p>
      </div>
      <div className="demo-banner-actions">
        {conductor.previewId && (
          <button type="button" onClick={onReturnFromPreview}>Return to checkpoint</button>
        )}
        <button type="button" onClick={onOpenConductor}>Open conductor</button>
        <button type="button" className="demo-exit" onClick={onExit}>Exit demo</button>
      </div>
    </section>
  );
}

function journeyPhase(checkpointId: AdminFastTrackCheckpointId): string {
  if (checkpointId === "trip") return "During the trip";
  const day = Number(checkpointId.slice(4));
  if (day <= 7) return "Arrival foundation";
  if (day <= 13) return "Independent routines";
  if (day <= 20) return "Recovery and continuity";
  if (day <= 26) return "Familiarity";
  return "Departure and independence";
}

export function AdminModal({
  game,
  profile,
  sessionMode,
  conductor,
  canOpenTripMode,
  onClose,
  onStartDemo,
  onSelectCheckpoint,
  onSelectTruthPreview,
  onPreviousCheckpoint,
  onPlayCheckpoint,
  onAdvanceCanonical,
  onNextCheckpoint,
  onOpenTripMode,
  onExitDemo,
  onResetDemo,
  onResetOwner,
}: {
  game: GameState;
  profile: TripProfile;
  sessionMode: ApplicationSessionMode;
  conductor: DemoConductor | null;
  canOpenTripMode: boolean;
  onClose: () => void;
  onStartDemo: () => void;
  onSelectCheckpoint: (id: AdminFastTrackCheckpointId) => void;
  onSelectTruthPreview: (id: AdminTruthPreviewId) => void;
  onPreviousCheckpoint: () => void;
  onPlayCheckpoint: () => void;
  onAdvanceCanonical: () => void;
  onNextCheckpoint: () => void;
  onOpenTripMode: () => void;
  onExitDemo: () => void;
  onResetDemo: () => void;
  onResetOwner: () => void;
}) {
  const [confirmingDemoReset, setConfirmingDemoReset] = useState(false);
  const [confirmingOwnerReset, setConfirmingOwnerReset] = useState(false);
  const activeCheckpoint = conductor
    ? ADMIN_FAST_TRACK_CHECKPOINTS.find((checkpoint) => checkpoint.id === conductor.activeCheckpointId) ?? null
    : null;
  const activeIndex = activeCheckpoint
    ? ADMIN_FAST_TRACK_CHECKPOINTS.findIndex((checkpoint) => checkpoint.id === activeCheckpoint.id)
    : -1;
  const canPrevious = Boolean(conductor && activeIndex > 0);
  const canPlay = Boolean(conductor && conductor.activeCheckpointId !== "trip" && conductor.checkpointStatus !== "active");
  const canAdvance = Boolean(conductor && conductor.activeCheckpointId !== "trip" && (conductor.checkpointStatus === "unplayed" || conductor.checkpointStatus === "active"));
  const canNext = Boolean(
    conductor &&
    conductor.activeCheckpointId !== "trip" &&
    activeIndex < SEASON_01.length - 1 &&
    (conductor.checkpointStatus === "resolved" || conductor.checkpointStatus === "simulated"),
  );
  const showTripAction = Boolean(
    conductor && conductor.activeCheckpointId === "day-30" && canOpenTripMode,
  );

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="admin-modal conductor-modal" role="dialog" aria-modal="true" aria-label="Demo conductor" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div><p>Prototype admin</p><h2>{sessionMode === "demo" ? "Demo conductor" : "Safe demo walkthrough"}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close admin">×</button>
        </div>

        {sessionMode === "owner" ? (
          <>
            <section className="admin-section demo-start-section">
              <p>Isolated walkthrough</p>
              <div className="admin-fast-track-intro">
                <strong>Inspect all 31 days without touching this journey.</strong>
                <span>A fresh synthetic profile, game, guided session, and Pocket Deck live in a separate local namespace.</span>
                <span>Your saved departure remains {profile.departureDate}.</span>
              </div>
              <button type="button" className="admin-start-demo" onClick={onStartDemo}>Start demo walkthrough</button>
            </section>

            <section className="admin-section owner-reset-section">
              <p>Owner data</p>
              {!confirmingOwnerReset ? (
                <button type="button" className="danger-secondary" onClick={() => setConfirmingOwnerReset(true)}>Reset owner journey</button>
              ) : (
                <div className="reset-confirmation" role="alertdialog" aria-label="Confirm owner journey reset">
                  <strong>Reset owner journey?</strong>
                  <p>This removes journey progress, trip profile, lifecycle mode, guided-session evidence, Pocket Deck practice evidence, pins, and Recents.</p>
                  <div>
                    <button type="button" onClick={() => setConfirmingOwnerReset(false)}>Cancel</button>
                    <button type="button" className="danger" onClick={onResetOwner}>Remove owner journey data</button>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : conductor && activeCheckpoint ? (
          <>
            <div className="admin-summary conductor-summary">
              <div><span>Checkpoint</span><strong>{activeIndex + 1} / {ADMIN_FAST_TRACK_CHECKPOINTS.length}</strong></div>
              <div><span>Completed prefix</span><strong>{game.completed.length} / {SEASON_01.length}</strong></div>
              <div><span>Current state</span><strong>{conductor.checkpointStatus}</strong></div>
            </div>

            <section className="admin-section conductor-current">
              <p>Current checkpoint</p>
              <div className="conductor-current-card">
                <span>{journeyPhase(activeCheckpoint.id)} · {activeCheckpoint.eyebrow}</span>
                <strong>{activeCheckpoint.id === "trip" ? "Trip Mode" : activeCheckpoint.detail.split(" · ")[0]} · {activeCheckpoint.title}</strong>
                <small>{conductor.previewId ? `Audit preview: ${conductor.previewId}` : `${conductor.checkpointStatus} · ${conductor.advancedCanonically.includes(activeCheckpoint.id as EpisodeId) ? "simulated" : conductor.playedNormally.includes(activeCheckpoint.id as EpisodeId) ? "played" : "no completion claim"}`}</small>
              </div>
              <div className="conductor-controls">
                {canPrevious && <button type="button" onClick={onPreviousCheckpoint}>Previous checkpoint</button>}
                {canPlay && <button type="button" className="primary-control" onClick={onPlayCheckpoint}>Play this checkpoint</button>}
                {canAdvance && <button type="button" onClick={onAdvanceCanonical}>Advance with canonical result <small>Simulated demo action</small></button>}
                {canNext && <button type="button" className="primary-control" onClick={onNextCheckpoint}>Next checkpoint</button>}
                {showTripAction && <button type="button" className="primary-control" onClick={onOpenTripMode}>Open Trip Mode</button>}
                <button type="button" onClick={() => document.getElementById("all-demo-checkpoints")?.scrollIntoView({ block: "start" })}>All checkpoints</button>
                <button type="button" onClick={onExitDemo}>Exit demo</button>
              </div>
              {!canOpenTripMode && activeCheckpoint.id === "day-30" && (
                <p className="trip-locked-note">Trip Mode stays locked until Day 30 produces a valid season completion.</p>
              )}
            </section>

            <section className="admin-section" id="all-demo-checkpoints">
              <p>All checkpoints</p>
              <div className="admin-days admin-checkpoints conductor-checkpoints">
                {ADMIN_FAST_TRACK_CHECKPOINTS.map((checkpoint, index) => {
                  const phase = journeyPhase(checkpoint.id);
                  const previousPhase = index ? journeyPhase(ADMIN_FAST_TRACK_CHECKPOINTS[index - 1].id) : null;
                  const status = checkpoint.id === "trip"
                    ? conductor.visitedCheckpointIds.includes("trip") ? "resolved" : "unplayed"
                    : checkpointAuditStatus(conductor, checkpoint.id);
                  const valid = checkpoint.id !== "trip" || canOpenTripMode;
                  const played = checkpoint.id !== "trip" && conductor.playedNormally.includes(checkpoint.id);
                  const simulated = checkpoint.id !== "trip" && conductor.advancedCanonically.includes(checkpoint.id);
                  return (
                    <Fragment key={checkpoint.id}>
                      {phase !== previousPhase && <h3 className="admin-phase-heading">{phase}</h3>}
                      <button
                        type="button"
                        className={conductor.activeCheckpointId === checkpoint.id ? "active" : ""}
                        aria-pressed={conductor.activeCheckpointId === checkpoint.id}
                        disabled={!valid}
                        onClick={() => onSelectCheckpoint(checkpoint.id)}
                      >
                        <span>{index + 1} · {checkpoint.eyebrow}</span>
                        <strong>{checkpoint.title}</strong>
                        <small>{checkpoint.detail}</small>
                        <em>{status} · {played && simulated ? "played + canonical result" : played ? "played" : simulated ? "canonical result" : "no completion claim"} · {valid ? "entry valid" : "locked"}</em>
                      </button>
                    </Fragment>
                  );
                })}
              </div>
            </section>

            <section className="admin-section">
              <p>Conditional truth previews</p>
              <div className="admin-fast-track-intro">
                <strong>Audit only—outside the walkthrough.</strong>
                <span>Each preview remains in this demo namespace and returns to the selected checkpoint without advancing it.</span>
              </div>
              <div className="admin-days admin-checkpoints">
                {ADMIN_TRUTH_PREVIEWS.map((preview) => (
                  <button key={preview.id} type="button" onClick={() => onSelectTruthPreview(preview.id)}>
                    <strong>{preview.label}</strong>
                    <small>{preview.detail}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="admin-section audit-section">
              <p>Authoritative demo snapshot</p>
              <dl>
                <div><dt>Money</dt><dd>{money(game.money)}</dd></div>
                <div><dt>Hotel / apartment key</dt><dd>{game.keyCustody.hotel} · {game.keyCustody.apartment}</dd></div>
                <div><dt>Inventory</dt><dd>{game.inventory.length ? game.inventory.join(" · ") : "Empty"}</dd></div>
                <div><dt>Transport</dt><dd>{game.transportMode} · {game.transportStatus}</dd></div>
                <div><dt>Open issues</dt><dd>{game.openIssues.length ? game.openIssues.join(" · ") : "None"}</dd></div>
                <div><dt>Departure</dt><dd>{game.departurePlan ?? game.departureStatus}</dd></div>
                <div><dt>Season completion</dt><dd>{game.seasonCompletion ? `${game.seasonCompletion.outcomeId} · attempt ${game.seasonCompletion.attempt}` : "Not complete"}</dd></div>
                <div><dt>Pocket Deck boundary</dt><dd>Canonical advances carry no practice evidence</dd></div>
              </dl>
            </section>

            <section className="admin-section demo-reset-section">
              <p>Demo data only</p>
              {!confirmingDemoReset ? (
                <button type="button" className="danger-secondary" onClick={() => setConfirmingDemoReset(true)}>Reset demo</button>
              ) : (
                <div className="reset-confirmation" role="alertdialog" aria-label="Confirm demo reset">
                  <strong>Reset this demo?</strong>
                  <p>This clears only the synthetic demo game, profile, lifecycle, guided session, Pocket Deck, and conductor record. Owner data stays untouched.</p>
                  <div>
                    <button type="button" onClick={() => setConfirmingDemoReset(false)}>Cancel</button>
                    <button type="button" className="danger" onClick={onResetDemo}>Reset demo only</button>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </div>
  );
}
