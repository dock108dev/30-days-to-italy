"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  adminFastTrackCheckpoint,
  adminPreviewDate,
  inferAdminFastTrackCheckpoint,
  nextAdminFastTrackCheckpoint,
  type AdminFastTrackCheckpointId,
} from "../admin/fast-track";
import {
  seedAdminTruthPreview,
  type AdminTruthPreviewId,
} from "../admin/truth-previews";
import {
  PHRASE_BY_ID,
  TURNS,
  fallbackPhraseForContext,
  initialState,
  phraseExampleFor,
  sceneForEpisode,
  type GameState,
  type PhraseId,
  type SupportRecord,
  type TeachingMoment,
} from "../game/model";
import {
  applyResponse,
  finishPendingOutcome,
  nextEpisodeState,
  possessionsFor,
  recordPhrasePractice as recordPhrasePracticeState,
  recordEpisodeRefresher,
  recordSupport as recordSupportState,
  restartEpisodeState,
  seedEpisodeState,
} from "../game/engine";
import { loadGame, saveGame } from "../game/persistence";
import {
  applyInsertedGuidedRefresher,
  beginGuidedBeachSession,
  beginRebuiltGuidedRefresher,
  completeGuidedBeachSession,
  observeGuidedBeachResponse,
  reconcileGuidedBeachSession,
  recordGuidedRefresherOpened,
  recordGuidedSupport,
} from "../guided/engine";
import { GuidedSessionProgress, GuidedSessionReview } from "../guided/GuidedSessionViews";
import {
  createDefaultGuidedBeachSession,
  isBeachOutcomeId,
  type GuidedBeachSession,
} from "../guided/model";
import { loadGuidedSession, saveGuidedSession } from "../guided/persistence";
import { createGuidedBeachHandoff } from "../guided/pocket-deck-handoff";
import { ModeNavigation, PrepareFocus } from "../lifecycle/LifecycleViews";
import {
  createDefaultLifecycleState,
  withLifecycleMode,
  type AppMode,
  type LifecycleState,
} from "../lifecycle/model";
import {
  loadLifecycleState,
  saveLifecycleState,
} from "../lifecycle/persistence";
import { useOfflineReadiness } from "../offline/useOfflineReadiness";
import { clearAllLocalState } from "../persistence/reset";
import { PocketDeck } from "../pocket-deck/PocketDeckViews";
import { CORE_POCKET_DECK_CARD_IDS } from "../pocket-deck/catalog";
import {
  applyPocketDeckPracticeEvidence,
  createDefaultPocketDeckState,
  hasPocketDeckEvidence,
  type PocketDeckState,
} from "../pocket-deck/model";
import {
  loadPocketDeckState,
  savePocketDeckState,
} from "../pocket-deck/persistence";
import { createDefaultTripProfile, type TripProfile } from "../trip/model";
import { createSeasonEpisodeHandoff } from "../season/pocket-deck-handoff";
import { EPISODE_BY_ID, IMPLEMENTED_EPISODES } from "../season/manifest";
import { recommendedEpisode, scheduleSeason } from "../season/schedule";
import {
  loadTripProfile,
  saveTripProfile,
} from "../trip/persistence";
import { TripSetup } from "../trip/TripProfileViews";
import {
  AdminModal,
  DayRail,
  EncounterStage,
  OutcomeCard,
  PrototypeHeader,
  ResponseComposer,
  SceneIntroduction,
  TeachingCard,
  WorldPanel,
} from "./PrototypeViews";

export default function Home() {
  const [game, setGame] = useState<GameState>(() => initialState());
  const [tripProfile, setTripProfile] = useState<TripProfile | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleState>(() =>
    createDefaultLifecycleState(),
  );
  const [guidedSession, setGuidedSession] = useState<GuidedBeachSession>(() =>
    createDefaultGuidedBeachSession(),
  );
  const [pocketDeck, setPocketDeck] = useState<PocketDeckState>(() =>
    createDefaultPocketDeckState(),
  );
  const [tripDeckCardId, setTripDeckCardId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [hasPlayed, setHasPlayed] = useState(false);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminCheckpointId, setAdminCheckpointId] =
    useState<AdminFastTrackCheckpointId | null>(null);
  const [tripEditorOpen, setTripEditorOpen] = useState(false);
  const [showNatural, setShowNatural] = useState(false);
  const [teachingMoment, setTeachingMoment] = useState<TeachingMoment | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const responseRef = useRef<HTMLTextAreaElement>(null);
  const pendingRebuiltEpisodeRef = useRef<GameState["episodeId"] | null>(null);
  const offlineReadiness = useOfflineReadiness();

  const scene = sceneForEpisode(game.episodeId)!;
  const turn = TURNS[game.turnId];
  const support = game.support[scene.id];

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let loadedGame = initialState();
      let loadedGuidedSession = createDefaultGuidedBeachSession();
      try {
        loadedGame = loadGame(window.localStorage);
      } catch {
        // Broken rehearsal state should not block trip setup.
      }
      try {
        setTripProfile(loadTripProfile(window.localStorage));
      } catch {
        // Broken trip state should not block the rehearsal prototype.
      }
      try {
        setLifecycle(loadLifecycleState(window.localStorage));
      } catch {
        // Broken lifecycle state always falls back to Prepare mode.
      }
      try {
        loadedGuidedSession = loadGuidedSession(window.localStorage);
      } catch {
        // Broken guidance evidence should not block the underlying rehearsal.
      }
      try {
        setPocketDeck(loadPocketDeckState(window.localStorage));
      } catch {
        // Broken deck preferences should not block either product mode.
      }
      loadedGuidedSession = reconcileGuidedBeachSession(loadedGuidedSession, loadedGame);
      setGame(loadedGame);
      setGuidedSession(loadedGuidedSession);
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveGame(window.localStorage, game);
  }, [game, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveGuidedSession(window.localStorage, guidedSession);
  }, [guidedSession, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    savePocketDeckState(window.localStorage, pocketDeck);
  }, [pocketDeck, hydrated]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setHasPlayed(false);
      setTranscriptVisible(false);
      setIsPlaying(false);
      setShowNatural(false);
      setTeachingMoment(null);
      pendingRebuiltEpisodeRef.current = null;
    });
    return () => {
      active = false;
    };
  }, [game.turnId, game.episodeId]);

  const possessions = useMemo(() => possessionsFor(game), [game]);
  const guidedHandoff = useMemo(
    () => createGuidedBeachHandoff(guidedSession),
    [guidedSession],
  );
  const guidedHandoffApplied = guidedHandoff
    ? hasPocketDeckEvidence(pocketDeck, guidedHandoff.id)
    : false;
  const episodeHandoff = useMemo(() => createSeasonEpisodeHandoff(game), [game]);
  const episodeHandoffApplied = episodeHandoff
    ? hasPocketDeckEvidence(pocketDeck, episodeHandoff.id)
    : false;

  function recordSupport(kind: keyof SupportRecord) {
    setGame((current) => recordSupportState(current, scene.id, kind));
    if (scene.id === "beach" && guidedSession.status === "in_progress") {
      const guidedKind =
        kind === "careful"
          ? "carefulReplayCount"
          : kind === "transcript"
            ? "transcriptRevealCount"
            : "normalReplayCount";
      setGuidedSession((current) => recordGuidedSupport(current, guidedKind));
    }
  }

  async function playAudio(speed: "normal" | "careful" = "normal") {
    const audio = audioRef.current;
    if (!audio) return;
    const wasPlayed = hasPlayed;
    audio.src = speed === "careful" ? turn.careful : turn.normal;
    audio.currentTime = 0;
    try {
      setIsPlaying(true);
      await audio.play();
      if (speed === "careful") recordSupport("careful");
      else if (wasPlayed) recordSupport("replay");
      setHasPlayed(true);
    } catch {
      setIsPlaying(false);
      setHasPlayed(true);
      setTranscriptVisible(true);
    }
  }

  function revealTranscript() {
    if (!transcriptVisible) recordSupport("transcript");
    setTranscriptVisible(true);
  }

  function submitResponse(event?: FormEvent) {
    event?.preventDefault();
    const raw = input.trim();
    if (!raw || !hasPlayed || game.status !== "active") return;

    const result = applyResponse(game, raw);
    if (result.kind === "teaching") {
      setTeachingMoment({ phraseId: result.phraseId, original: raw, source: "english" });
      if (game.episodeId !== "day-04") setGame((current) => recordEpisodeRefresher(current, "opened"));
      if (game.episodeId === "day-04") {
        setGuidedSession((current) =>
          recordGuidedRefresherOpened(current, result.phraseId),
        );
      }
      return;
    }

    setInput("");
    setGuidedSession((current) =>
      observeGuidedBeachResponse(current, game, raw, result.state),
    );
    const nextGame = pendingRebuiltEpisodeRef.current === game.episodeId && game.episodeId !== "day-04"
      ? recordEpisodeRefresher(result.state, "rebuilt")
      : result.state;
    pendingRebuiltEpisodeRef.current = null;
    setGame(nextGame);
  }

  function seedEpisode(episodeId: GameState["episodeId"]) {
    setGame((current) => seedEpisodeState(current, episodeId));
    setAdminCheckpointId(null);
    setAdminOpen(false);
    setTeachingMoment(null);
  }

  function restartScene() {
    setGame((current) => restartEpisodeState(current));
    setAdminOpen(false);
    setTeachingMoment(null);
  }

  function resetAll() {
    clearAllLocalState(window.localStorage);
    setGame(initialState());
    setTripProfile(null);
    setLifecycle(createDefaultLifecycleState());
    setGuidedSession(createDefaultGuidedBeachSession());
    setPocketDeck(createDefaultPocketDeckState());
    setTripDeckCardId(null);
    setAdminCheckpointId(null);
    setAdminOpen(false);
    setTripEditorOpen(false);
    setTeachingMoment(null);
  }

  function saveTripDetails(profile: TripProfile): boolean {
    if (!saveTripProfile(window.localStorage, profile)) return false;
    setTripProfile(profile);
    setTripEditorOpen(false);
    return true;
  }

  function openTripEditor() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setTripEditorOpen(true);
  }

  function changeMode(mode: AppMode) {
    const next = withLifecycleMode(lifecycle, mode);
    if (next === lifecycle) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setTeachingMoment(null);
    setAdminOpen(false);
    setAdminCheckpointId(null);
    setTripDeckCardId(null);
    saveLifecycleState(window.localStorage, next);
    setLifecycle(next);
  }

  function selectAdminCheckpoint(id: AdminFastTrackCheckpointId) {
    const checkpoint = adminFastTrackCheckpoint(id);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setInput("");
    setTeachingMoment(null);
    setTripDeckCardId(null);
    setAdminCheckpointId(id);
    setAdminOpen(false);

    const nextLifecycle = withLifecycleMode(lifecycle, checkpoint.mode);
    saveLifecycleState(window.localStorage, nextLifecycle);
    setLifecycle(nextLifecycle);

    if (checkpoint.episodeId !== null) {
      const episodeId = checkpoint.episodeId;
      setGame((current) => seedEpisodeState(current, episodeId));
      if (checkpoint.id === "day-04") {
        setGuidedSession((current) => beginGuidedBeachSession(current));
      }
    }

    queueMicrotask(() => {
      document.getElementById(
        checkpoint.mode === "trip" ? "trip-mode-title" : "rehearsal-surface",
      )?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function selectAdminTruthPreview(id: AdminTruthPreviewId) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setInput("");
    setTeachingMoment(null);
    setTripDeckCardId(null);
    setAdminOpen(false);

    const episodeId = id.startsWith("day-19") ? "day-19" : "day-21";
    setAdminCheckpointId(episodeId);
    const nextLifecycle = withLifecycleMode(lifecycle, "prepare");
    saveLifecycleState(window.localStorage, nextLifecycle);
    setLifecycle(nextLifecycle);
    setGame((current) => seedAdminTruthPreview(current, id));

    queueMicrotask(() => {
      document.getElementById("rehearsal-surface")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function startBeachFocus() {
    if (guidedSession.status === "not_started") {
      setGuidedSession((current) => beginGuidedBeachSession(current));
      setGame((current) => seedEpisodeState(current, "day-04"));
      setTeachingMoment(null);
    } else if (guidedSession.status === "in_progress" && game.episodeId !== "day-04") {
      setGame((current) => seedEpisodeState(current, "day-04"));
      setTeachingMoment(null);
    }
    queueMicrotask(() => {
      document.getElementById(
        guidedSession.status === "complete" ? "guided-session-review" : "rehearsal-surface",
      )?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function practiceBeachAgain() {
    setGuidedSession((current) => beginGuidedBeachSession(current));
    setGame((current) => seedEpisodeState(current, "day-04"));
    setInput("");
    setTeachingMoment(null);
    queueMicrotask(() => {
      document.getElementById("rehearsal-surface")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function carryGuidedHandoffToDeck() {
    if (!guidedHandoff) return;
    setPocketDeck((current) =>
      applyPocketDeckPracticeEvidence(
        current,
        guidedHandoff,
        CORE_POCKET_DECK_CARD_IDS,
      ),
    );
  }

  function openGuidedHandoffInTripMode() {
    if (!guidedHandoff) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setTeachingMoment(null);
    setAdminOpen(false);
    setPocketDeck((current) =>
      applyPocketDeckPracticeEvidence(
        current,
        guidedHandoff,
        CORE_POCKET_DECK_CARD_IDS,
      ),
    );
    const nextLifecycle = withLifecycleMode(lifecycle, "trip");
    saveLifecycleState(window.localStorage, nextLifecycle);
    setLifecycle(nextLifecycle);
    setTripDeckCardId(guidedHandoff.cardId);
  }

  function carryEpisodeHandoffToDeck() {
    if (!episodeHandoff) return;
    setPocketDeck((current) => applyPocketDeckPracticeEvidence(current, episodeHandoff, CORE_POCKET_DECK_CARD_IDS));
  }

  function openEpisodeHandoffInTripMode() {
    if (!episodeHandoff) return;
    carryEpisodeHandoffToDeck();
    const nextLifecycle = withLifecycleMode(lifecycle, "trip");
    saveLifecycleState(window.localStorage, nextLifecycle);
    setLifecycle(nextLifecycle);
    setTripDeckCardId(episodeHandoff.cardId);
  }

  function openTeachingMoment(
    phraseId: PhraseId,
    source: TeachingMoment["source"] = "toolkit",
    original: string | null = null,
  ) {
    setTeachingMoment({ phraseId, source, original });
    if (scene.id === "beach") {
      setGuidedSession((current) => recordGuidedRefresherOpened(current, phraseId));
    } else {
      setGame((current) => recordEpisodeRefresher(current, "opened"));
    }
  }

  function recordPhrasePractice(phraseId: PhraseId) {
    setGame((current) => recordPhrasePracticeState(current, phraseId));
  }

  function useLessonExample() {
    if (!teachingMoment) return;
    const example = phraseExampleFor(teachingMoment.phraseId, scene.id, game.episodeId);
    recordPhrasePractice(teachingMoment.phraseId);
    if (scene.id === "beach") {
      setGuidedSession((current) =>
        applyInsertedGuidedRefresher(current, teachingMoment.phraseId),
      );
    } else {
      setGame((current) => recordEpisodeRefresher(current, "inserted"));
    }
    setInput(example.italian);
    setTeachingMoment(null);
    queueMicrotask(() => responseRef.current?.focus());
  }

  function practiceLessonFromScratch() {
    if (!teachingMoment) return;
    recordPhrasePractice(teachingMoment.phraseId);
    if (scene.id === "beach") {
      setGuidedSession((current) =>
        beginRebuiltGuidedRefresher(current, teachingMoment.phraseId),
      );
    } else {
      pendingRebuiltEpisodeRef.current = game.episodeId;
    }
    setInput("");
    setTeachingMoment(null);
    queueMicrotask(() => responseRef.current?.focus());
  }

  const suggestions = useMemo(() => [...scene.suggestions], [scene]);

  const displayedSupport =
    guidedSession.status === "in_progress" && scene.id === "beach"
      ? {
          replay: guidedSession.normalReplayCount,
          careful: guidedSession.carefulReplayCount,
          transcript: guidedSession.transcriptRevealCount,
        }
      : support;
  const totalSupport =
    displayedSupport.replay + displayedSupport.careful + displayedSupport.transcript;
  const totalPhraseRefreshers = Object.values(game.phrasePractice ?? {}).reduce(
    (total, count) => total + count,
    0,
  );
  const defaultHelpPhrase = fallbackPhraseForContext(scene.id, game.turnId, game.episodeId);
  const activeLesson = teachingMoment ? PHRASE_BY_ID[teachingMoment.phraseId] : null;
  const activeExample = teachingMoment
    ? phraseExampleFor(teachingMoment.phraseId, scene.id, game.episodeId)
    : null;

  if (!hydrated) {
    return (
      <main className="loading-screen">
        <div className="loading-mark">UM</div>
        <p>Preparing the coast…</p>
      </main>
    );
  }

  if (!tripProfile) {
    return (
      <TripSetup
        initialProfile={createDefaultTripProfile()}
        onSave={saveTripDetails}
      />
    );
  }

  const isPrepareMode = lifecycle.mode === "prepare";
  const inferredAdminCheckpoint = inferAdminFastTrackCheckpoint(
    lifecycle.mode,
    game.episodeId,
  );
  const activeAdminCheckpoint = adminCheckpointId
    ? adminFastTrackCheckpoint(adminCheckpointId)
    : null;
  const nextAdminCheckpoint = nextAdminFastTrackCheckpoint(
    adminCheckpointId ?? inferredAdminCheckpoint.id,
  );
  const adminPreviewToday = activeAdminCheckpoint
    ? adminPreviewDate(
        tripProfile.departureDate,
        activeAdminCheckpoint.daysUntilDeparture,
      ) ?? undefined
    : undefined;
  const showGuidedReview =
    guidedSession.status === "complete" && game.episodeId === "day-04";
  const showGuidedProgress =
    guidedSession.status === "in_progress" && game.episodeId === "day-04";
  const recommended = recommendedEpisode(tripProfile, game.completed, adminPreviewToday);
  const currentDay = EPISODE_BY_ID.get(game.episodeId)?.day ?? 0;
  const nextAvailableEpisode = scheduleSeason(
    tripProfile,
    game.completed,
    adminPreviewToday,
    Boolean(activeAdminCheckpoint),
  ).find((episode) => episode.playable && !episode.completed && episode.day > currentDay);
  const nextAvailableScene = nextAvailableEpisode
    ? sceneForEpisode(nextAvailableEpisode.id)
    : null;
  const focusedEpisode =
    (activeAdminCheckpoint && activeAdminCheckpoint.id !== "trip"
      ? EPISODE_BY_ID.get(activeAdminCheckpoint.id)
      : null)
    ?? recommended
    ?? EPISODE_BY_ID.get(game.episodeId)!;

  function startFocusedEpisode() {
    if (focusedEpisode.id === "day-04") {
      startBeachFocus();
      return;
    }
    seedEpisode(focusedEpisode.id);
    queueMicrotask(() => document.getElementById("rehearsal-surface")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <main className={`app-shell ${isPrepareMode ? "prepare-app-shell" : "trip-app-shell"}`}>
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          const resolved = finishPendingOutcome(game);
          setGame(resolved);
          if (
            guidedSession.status === "in_progress" &&
            resolved.episodeId === "day-04" &&
            resolved.status === "resolved" &&
            isBeachOutcomeId(resolved.outcome?.id)
          ) {
            const beachOutcome = resolved.outcome?.id;
            if (isBeachOutcomeId(beachOutcome)) {
              setGuidedSession((current) => completeGuidedBeachSession(current, beachOutcome));
            }
          }
        }}
      />

      <PrototypeHeader
        mode={lifecycle.mode}
        onOpenAdmin={() => setAdminOpen(true)}
      />
      <ModeNavigation mode={lifecycle.mode} onChange={changeMode} />

      {activeAdminCheckpoint && (
        <section className="admin-preview-banner" aria-label="Admin fast-track checkpoint">
          <div>
            <span>Admin fast-track · {activeAdminCheckpoint.eyebrow}</span>
            <strong>{activeAdminCheckpoint.title}</strong>
            <p>Calendar preview only. Your saved departure date has not changed.</p>
          </div>
          <div>
            {nextAdminCheckpoint && (
              <button type="button" onClick={() => selectAdminCheckpoint(nextAdminCheckpoint.id)}>
                Next: {nextAdminCheckpoint.title} <span aria-hidden="true">→</span>
              </button>
            )}
            <button type="button" onClick={() => setAdminOpen(true)}>All checkpoints</button>
            <button type="button" onClick={() => setAdminCheckpointId(null)}>Use live date</button>
          </div>
        </section>
      )}

      {isPrepareMode ? (
        <>
          <PrepareFocus
            profile={tripProfile}
            episode={focusedEpisode}
            isCurrent={game.episodeId === focusedEpisode.id}
            sessionStatus={guidedSession.status}
            onStart={startFocusedEpisode}
            onEditTrip={openTripEditor}
            today={adminPreviewToday}
          />

          {guidedSession.status === "complete" && (
            <GuidedSessionReview
              session={guidedSession}
              handoff={guidedHandoff}
              handoffApplied={guidedHandoffApplied}
              onCarryToDeck={carryGuidedHandoffToDeck}
              onOpenInTripMode={openGuidedHandoffInTripMode}
              onPracticeAgain={practiceBeachAgain}
            />
          )}

          {!showGuidedReview && (
            <section id="rehearsal-surface" className="rehearsal-surface" aria-label="Rehearsal Mode">
              {showGuidedProgress ? (
                <GuidedSessionProgress status={guidedSession.status} />
              ) : (
                <DayRail
                  game={game}
                  profile={tripProfile}
                  today={adminPreviewToday}
                  adminBypass={Boolean(activeAdminCheckpoint)}
                  onSelect={seedEpisode}
                />
              )}

              <div className="content-grid">
                <section className="story-panel">
                  <SceneIntroduction scene={scene} status={game.status} />

                {game.status === "active" ? (
                  <>
                    <EncounterStage
                      turn={turn}
                      scene={scene}
                      game={game}
                      isPlaying={isPlaying}
                      hasPlayed={hasPlayed}
                      transcriptVisible={transcriptVisible}
                      onPlay={playAudio}
                      onRevealTranscript={revealTranscript}
                    />

                    {teachingMoment && activeLesson && activeExample && (
                      <TeachingCard
                        teachingMoment={teachingMoment}
                        lesson={activeLesson}
                        example={activeExample}
                        npc={scene.npc}
                        hasPlayed={hasPlayed}
                        onClose={() => setTeachingMoment(null)}
                        onUse={useLessonExample}
                        onBuild={practiceLessonFromScratch}
                      />
                    )}

                    <ResponseComposer
                      responseRef={responseRef}
                      input={input}
                      hasPlayed={hasPlayed}
                      teachingOpen={Boolean(teachingMoment)}
                      suggestions={suggestions}
                      onInput={setInput}
                      onSubmit={submitResponse}
                      onTeach={() => openTeachingMoment(defaultHelpPhrase, "help")}
                    />
                  </>
                ) : (
                  <OutcomeCard
                    game={game}
                    nextScene={nextAvailableScene}
                    showNatural={showNatural}
                    onToggleNatural={() => setShowNatural((value) => !value)}
                    onNext={() => setGame((current) => nextEpisodeState(current))}
                    onReview={() => setAdminOpen(true)}
                    onRestart={restartScene}
                    handoff={episodeHandoff}
                    handoffApplied={episodeHandoffApplied}
                    onCarryToDeck={carryEpisodeHandoffToDeck}
                    onOpenInTripMode={openEpisodeHandoffInTripMode}
                    onOpenTripMode={() => changeMode("trip")}
                  />
                )}
                </section>

                <WorldPanel
                  game={game}
                  scene={scene}
                  possessions={possessions}
                  support={displayedSupport}
                  totalSupport={totalSupport}
                  totalPhraseRefreshers={totalPhraseRefreshers}
                  activePhraseId={teachingMoment?.phraseId ?? null}
                  onOpenPhrase={(phraseId) => openTeachingMoment(phraseId)}
                />
              </div>
            </section>
          )}

          <footer>
            <span>Prepare Mode · complete 31-session season · {IMPLEMENTED_EPISODES.length} playable</span>
            <p>Listening first. Refreshers whenever you need them. Practical outcomes.</p>
          </footer>
        </>
      ) : (
        <>
          <PocketDeck
            profile={tripProfile}
            state={pocketDeck}
            offlineReadiness={offlineReadiness}
            onStateChange={setPocketDeck}
            onEditTrip={openTripEditor}
            openCardId={tripDeckCardId}
            onOpenCardHandled={() => setTripDeckCardId(null)}
          />
          <footer className="trip-footer">
            <span>Trip Mode · stored locally</span>
            <p>Quick help without lessons, scores, or simulated consequences.</p>
          </footer>
        </>
      )}

      {adminOpen && (
        <AdminModal
          game={game}
          profile={tripProfile}
          activeCheckpointId={adminCheckpointId}
          nextCheckpointId={nextAdminCheckpoint?.id ?? null}
          onClose={() => setAdminOpen(false)}
          onSelectCheckpoint={selectAdminCheckpoint}
          onSelectTruthPreview={selectAdminTruthPreview}
          onRestart={restartScene}
          onUseLiveDate={() => setAdminCheckpointId(null)}
          onReset={resetAll}
        />
      )}

      {tripEditorOpen && (
        <TripSetup
          initialProfile={tripProfile}
          editing
          onSave={saveTripDetails}
          onCancel={() => setTripEditorOpen(false)}
        />
      )}
    </main>
  );
}
