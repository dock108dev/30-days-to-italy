"use client";

import { FormEvent, useCallback, useMemo, useState, useRef, useEffect } from "react";

import { PreparationView } from "./PreparationView";
import { preparationCursor, updatePreparation, openPreparationReview } from "./preparation";

import {
  adminFastTrackCheckpoint,
  adminPreviewDate,
  type AdminFastTrackCheckpointId,
} from "../admin/fast-track";
import {
  advanceWithCanonicalResult,
  canOpenDemoTripMode,
  canonicalPreEpisodeState,
} from "../admin/canonical-demo";
import {
  checkpointAuditStatus,
  updateDemoConductor,
} from "../admin/demo-conductor";
import {
  clearDemoPreviewReturn,
  loadDemoPreviewReturn,
  saveDemoPreviewReturn,
} from "../admin/demo-preview";
import {
  seedAdminTruthPreview,
  type AdminTruthPreviewId,
} from "../admin/truth-previews";
import {
  PHRASE_BY_ID,
  fallbackPhraseForContext,
  phraseExampleFor,
  type GameState,
  type PhraseId,
  type ProgressiveHelpLevel,
  type SupportRecord,
  type TeachingMoment,
} from "../game/model";
import {
  advanceProgressiveHelp,
  nextEpisodeState,
  possessionsFor,
  recordPhrasePractice as recordPhrasePracticeState,
  recordEpisodeRefresher,
  recordSupport as recordSupportState,
  restartEpisodeState,
  seedEpisodeState,
  submitEpisodeResponse,
} from "../game/engine";
import {
  beginGuidedBeachSession,
  beginRebuiltGuidedRefresher,
  completeGuidedBeachSession,
  observeGuidedBeachResponse,
  recordGuidedRefresherOpened,
  recordGuidedSupport,
} from "../guided/engine";
import { GuidedSessionProgress, GuidedSessionReview } from "../guided/GuidedSessionViews";
import { isBeachOutcomeId } from "../guided/model";
import { createGuidedBeachHandoff } from "../guided/pocket-deck-handoff";
import { ModeNavigation } from "../lifecycle/LifecycleViews";
import {
  createDefaultLifecycleState,
  withLifecycleMode,
  type AppMode,
} from "../lifecycle/model";
import { saveLifecycleState } from "../lifecycle/persistence";
import { useOfflineReadiness } from "../offline/useOfflineReadiness";
import { reportClientFailure } from "../observability/client-failures";
import { OperationalFailureBanner } from "../observability/OperationalFailureBanner";
import { clearAllLocalState } from "../persistence/reset";
import {
  exitDemoSession,
  ownerSession,
  resetDemoSession,
  startDemoSession,
  type EnumerableSessionStorage,
} from "../persistence/session";
import { PocketDeck } from "../pocket-deck/PocketDeckViews";
import { CORE_POCKET_DECK_CARD_IDS } from "../pocket-deck/catalog";
import {
  applyPocketDeckPracticeEvidence,
  hasPocketDeckEvidence,
} from "../pocket-deck/model";
import { createDefaultTripProfile, type TripProfile } from "../trip/model";
import { createSeasonEpisodeHandoff } from "../season/pocket-deck-handoff";
import { EPISODE_BY_ID, EPISODE_IDS, type EpisodeId } from "../season/manifest";
import { implementedEpisode, TURNS, sceneForEpisode } from "../season/registry";
import { scheduleSeason } from "../season/schedule";
import { saveTripProfile } from "../trip/persistence";
import { TripSetup } from "../trip/TripProfileViews";
import {
  AdminModal,
  CompactSessionProgress,
  DemoModeBanner,
  EncounterStage,
  OutcomeCard,
  PrototypeHeader,
  ResponseComposer,
  SceneIntroduction,
  SeasonOverview,
  TeachingCard,
  TeachingFeedbackResult,
  WorldPanel,
} from "./PrototypeViews";
import { useApplicationSession } from "./useApplicationSession";
import {
  interactionTurnKey,
  usePrototypePresentation,
} from "./usePrototypePresentation";

export default function Home() {
  const {
    activeStorage,
    activateApplicationSession,
    conductor,
    game,
    guardOwnerSession,
    guidedSession,
    hydrated,
    lifecycle,
    pocketDeck,
    sessionIdentity,
    setConductor,
    setGame,
    setGuidedSession,
    setLifecycle,
    setPocketDeck,
    setTripProfile,
    tripProfile,
  } = useApplicationSession();
  const [tripDeckCardId, setTripDeckCardId] = useState<string | null>(null);
  const {
    adminOpen,
    audioRef,
    clientFailure,
    currentTurnKey,
    input,
    interaction,
    interactionPhase,
    isPlaying,
    pendingRebuiltEpisodeRef,
    progressiveHelpNextRef,
    progressiveHelpOpen,
    progressiveHelpTriggerRef,
    responseRef,
    preparationReturnFocus,
    seasonOverviewCloseRef,
    seasonOverviewOpen,
    seasonOverviewTriggerRef,
    setAdminOpen,
    setClientFailure,
    setInput,
    setInteraction,
    setIsPlaying,
    setSeasonOverviewOpen,
    setProgressiveHelpOpen,
    setShowNatural,
    setTeachingMoment,
    setTranscriptVisible,
    setTripEditorOpen,
    showNatural,
    submissionInFlightRef,
    teachingCloseRef,
    teachingMoment,
    teachingTriggerRef,
    transcriptVisible,
    tripEditorOpen,
  } = usePrototypePresentation(game);
  const offlineReadiness = useOfflineReadiness();
  const prepCursor = preparationCursor(game);
  const liveGeneration = useRef(0);
  const latestLive = useRef({ game, prepCursor, currentTurnKey });
  useEffect(() => {
    latestLive.current = { game, prepCursor, currentTurnKey };
  }, [game, prepCursor, currentTurnKey]);
  useEffect(() => {
    liveGeneration.current += 1;
    audioRef.current?.pause();
  }, [prepCursor, currentTurnKey, sessionIdentity.generation, audioRef]);
  const transcriptRevealed = useRef(false);
  useEffect(() => { transcriptRevealed.current = transcriptVisible; }, [transcriptVisible, currentTurnKey]);
  function reviewPreparation() {
    if (!activeStorage()) return;
    liveGeneration.current += 1;
    audioRef.current?.pause();
    setIsPlaying(false);
    setGame((current) => activeStorage() && current.turnId === game.turnId && current.status === game.status ? openPreparationReview(current) : current);
  }
  function returnFromPreparation() {
    if (!prepCursor || !activeStorage()) return;
    preparationReturnFocus.current = true;
    setGame((current) => activeStorage() ? updatePreparation(current, prepCursor, { return: true }) : current);
  }
  const onPreparationAction = useCallback((action: Parameters<typeof updatePreparation>[2]) => {
    if (!prepCursor || !activeStorage()) return;
    setGame((current) => activeStorage() ? updatePreparation(current, prepCursor, action) : current);
  }, [prepCursor, activeStorage, setGame]);

  const scene = sceneForEpisode(game.episodeId)!;
  const turn = TURNS[game.turnId];
  const support = game.support[scene.id];

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

  async function playAudio(speed: "normal" | "careful" = "normal"): Promise<boolean> {
    const token = ++liveGeneration.current;
    const isCurrent = () => token === liveGeneration.current && Boolean(activeStorage()) && latestLive.current.currentTurnKey === currentTurnKey && !latestLive.current.prepCursor;
    const audio = audioRef.current;
    if (game.status !== "active" || prepCursor) return false;
    const wasReady = interactionPhase === "ready_to_respond";
    if (!audio) {
      setTranscriptVisible(true);
      setInteraction({
        turnKey: currentTurnKey,
        phase: "ready_to_respond",
        audioFailed: true,
      });
      return false;
    }
    audio.src = speed === "careful" ? turn.careful : turn.normal;
    audio.currentTime = 0;
    const optionalSupport = speed === "careful" || wasReady;
    if (optionalSupport) recordSupport(speed === "careful" ? "careful" : "replay");
    try {
      setIsPlaying(true);
      await audio.play();
      if (!isCurrent()) return false;
      setInteraction({
        turnKey: currentTurnKey,
        phase: "ready_to_respond",
        audioFailed: false,
      });
      return true;
    } catch (error) {
      if (!isCurrent()) return false;
      reportClientFailure({
        code: "AUDIO_PLAYBACK_FAILED",
        domain: "audio",
        operation: "play-rehearsal-line",
        severity: "warning",
        userMessage: "Audio could not play. The transcript is available, and you can continue without audio.",
      }, error);
      setIsPlaying(false);
      setTranscriptVisible(true);
      setInteraction({
        turnKey: currentTurnKey,
        phase: "ready_to_respond",
        audioFailed: true,
      });
      return true;
    }
  }

  function revealTranscript() {
    if (prepCursor || !activeStorage()) return;
    if (!transcriptRevealed.current) recordSupport("transcript");
    transcriptRevealed.current = true;
    setTranscriptVisible(true);
  }

  function readLiveLine() {
    if (prepCursor || game.status !== "active" || !activeStorage()) return;
    revealTranscript();
    setInteraction({ turnKey: currentTurnKey, phase: "ready_to_respond", audioFailed: false });
  }

  function submitResponse(event?: FormEvent) {
    event?.preventDefault();
    const raw = input.trim();
    if (
      prepCursor || preparationCursor(latestLive.current.game) || latestLive.current.currentTurnKey !== currentTurnKey || !activeStorage() ||
      !raw ||
      interactionPhase !== "ready_to_respond" ||
      game.status !== "active" ||
      submissionInFlightRef.current
    ) return;

    submissionInFlightRef.current = true;
    setInteraction((current) => ({ ...current, phase: "submitting" }));

    const responseState = pendingRebuiltEpisodeRef.current === game.episodeId && game.episodeId !== "day-04"
      ? recordEpisodeRefresher(game, "rebuilt")
      : game;
    const result = submitEpisodeResponse(responseState, raw);
    if (result.kind === "teaching") {
      if (turn.progressiveHelp) {
        setGame(result.state);
        setInput("");
        if (!progressiveHelpOpen) toggleProgressiveHelp();
        setInteraction((current) => ({ ...current, phase: "ready_to_respond" }));
        queueMicrotask(() => {
          submissionInFlightRef.current = false;
        });
        return;
      }
      teachingTriggerRef.current = responseRef.current;
      setTeachingMoment({ phraseId: result.phraseId, original: raw, source: "english" });
      if (game.episodeId !== "day-04") setGame((current) => recordEpisodeRefresher(current, "opened"));
      if (game.episodeId === "day-04") {
        setGuidedSession((current) =>
          recordGuidedRefresherOpened(current, result.phraseId),
        );
      }
      setInteraction((current) => ({ ...current, phase: "ready_to_respond" }));
      queueMicrotask(() => {
        submissionInFlightRef.current = false;
      });
      return;
    }

    setInput("");
    setGuidedSession((current) => {
      const observed = observeGuidedBeachResponse(current, game, raw, result.state);
      return observed.status === "in_progress" &&
        result.state.episodeId === "day-04" &&
        result.state.status === "resolved" &&
        isBeachOutcomeId(result.state.outcome?.id)
        ? completeGuidedBeachSession(observed, result.state.outcome.id)
        : observed;
    });
    pendingRebuiltEpisodeRef.current = null;
    setGame(result.state);
    queueMicrotask(() => {
      submissionInFlightRef.current = false;
      if (
        result.state.status === "active" &&
        interactionTurnKey(result.state) === currentTurnKey
      ) {
        setInteraction((current) => ({ ...current, phase: "ready_to_respond" }));
      }
    });
  }

  function seedEpisode(episodeId: GameState["episodeId"]) {
    if (sessionIdentity.mode === "demo") {
      selectAdminCheckpoint(episodeId);
      return;
    }
    setGame((current) => seedEpisodeState(current, episodeId));
    setAdminOpen(false);
    setSeasonOverviewOpen(false);
    setTeachingMoment(null);
  }

  function restartScene() {
    if (sessionIdentity.mode === "demo" && conductor?.activeCheckpointId !== "trip") {
      playDemoCheckpoint();
      return;
    }
    setGame((current) => restartEpisodeState(current));
    setAdminOpen(false);
    setTeachingMoment(null);
  }

  function stopTransientUi() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setInput("");
    setTripDeckCardId(null);
    setTripEditorOpen(false);
    setSeasonOverviewOpen(false);
    setTeachingMoment(null);
  }

  function resetOwnerJourney() {
    if (sessionIdentity.mode !== "owner") return;
    const storage = window.localStorage as EnumerableSessionStorage;
    stopTransientUi();
    if (!clearAllLocalState(storage)) return;
    setAdminOpen(false);
    activateApplicationSession(ownerSession(storage));
  }

  function startDemoWalkthrough() {
    const storage = window.localStorage as EnumerableSessionStorage;
    stopTransientUi();
    setAdminOpen(false);
    try {
      activateApplicationSession(startDemoSession(storage));
    } catch (error) {
      reportClientFailure({
        code: "PERSISTENCE_WRITE_FAILED",
        domain: "demo",
        operation: "start-session",
        severity: "error",
        userMessage: "The isolated demo could not start safely. Owner progress was not changed.",
      }, error);
      return;
    }
    queueMicrotask(() => {
      document.getElementById("rehearsal-surface")?.focus({ preventScroll: true });
    });
  }

  function resetActiveDemo() {
    if (sessionIdentity.mode !== "demo") return;
    const storage = window.localStorage as EnumerableSessionStorage;
    const reset = resetDemoSession(storage, sessionIdentity.id);
    if (!reset) return;
    stopTransientUi();
    setAdminOpen(false);
    activateApplicationSession(reset);
  }

  function exitActiveDemo() {
    if (sessionIdentity.mode !== "demo") return;
    const storage = window.localStorage as EnumerableSessionStorage;
    stopTransientUi();
    setAdminOpen(false);
    guardOwnerSession(storage);
    exitDemoSession(storage, sessionIdentity.id);
    activateApplicationSession(ownerSession(storage));
    queueMicrotask(() => {
      document.querySelector<HTMLElement>(".topbar .quiet-button")?.focus({ preventScroll: true });
    });
  }

  function saveTripDetails(profile: TripProfile): boolean {
    const storage = activeStorage();
    if (!storage || !saveTripProfile(storage, profile)) return false;
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
    setSeasonOverviewOpen(false);
    setTripEditorOpen(true);
  }

  function changeMode(mode: AppMode) {
    if (sessionIdentity.mode === "demo") {
      if (mode === "trip") openDemoTripMode();
      else if (conductor?.activeCheckpointId === "trip") selectAdminCheckpoint("day-30");
      return;
    }
    const next = withLifecycleMode(lifecycle, mode);
    if (next === lifecycle) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setTeachingMoment(null);
    setSeasonOverviewOpen(false);
    setAdminOpen(false);
    setTripDeckCardId(null);
    const storage = activeStorage();
    if (!storage || !saveLifecycleState(storage, next)) return;
    setLifecycle(next);
  }

  function selectAdminCheckpoint(id: AdminFastTrackCheckpointId) {
    if (sessionIdentity.mode !== "demo" || !conductor) return;
    const checkpoint = adminFastTrackCheckpoint(id);
    if (id === "trip") {
      openDemoTripMode();
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setInput("");
    setTeachingMoment(null);
    setTripDeckCardId(null);
    setAdminOpen(false);

    const nextLifecycle = withLifecycleMode(lifecycle, "prepare");
    const storage = activeStorage();
    if (storage) {
      saveLifecycleState(storage, nextLifecycle);
      clearDemoPreviewReturn(storage);
    }
    setLifecycle(nextLifecycle);
    const episodeId = checkpoint.episodeId as EpisodeId;
    setGame((current) => canonicalPreEpisodeState(current, episodeId));
    setConductor((current) => current ? updateDemoConductor(current, {
      activeCheckpointId: episodeId,
      mode: "prepare",
      checkpointStatus: checkpointAuditStatus(current, episodeId),
      previewId: null,
      visitedCheckpointIds: current.visitedCheckpointIds.includes(episodeId)
        ? current.visitedCheckpointIds
        : [...current.visitedCheckpointIds, episodeId],
    }) : current);

    queueMicrotask(() => {
      document.getElementById(
        checkpoint.mode === "trip" ? "trip-mode-title" : "rehearsal-surface",
      )?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function playDemoCheckpoint() {
    if (!conductor || conductor.activeCheckpointId === "trip") return;
    const episodeId = conductor.activeCheckpointId;
    stopTransientUi();
    setGame((current) => canonicalPreEpisodeState(current, episodeId));
    if (episodeId === "day-04") {
      setGuidedSession((current) => beginGuidedBeachSession(current));
    }
    setConductor((current) => current ? updateDemoConductor(current, {
      checkpointStatus: "active",
      previewId: null,
    }) : current);
    setAdminOpen(false);
  }

  function advanceDemoCheckpoint() {
    if (!conductor || conductor.activeCheckpointId === "trip") return;
    const episodeId = conductor.activeCheckpointId;
    const result = advanceWithCanonicalResult(game, episodeId);
    setGame(result.state);
    setConductor((current) => current ? updateDemoConductor(current, {
      checkpointStatus: "simulated",
      previewId: null,
      advancedCanonically: current.advancedCanonically.includes(episodeId)
        ? current.advancedCanonically
        : [...current.advancedCanonically, episodeId],
    }) : current);
    setAdminOpen(false);
  }

  function previousDemoCheckpoint() {
    if (!conductor) return;
    const currentIndex = conductor.activeCheckpointId === "trip"
      ? EPISODE_IDS.length
      : EPISODE_IDS.indexOf(conductor.activeCheckpointId);
    const previous = EPISODE_IDS[Math.max(0, currentIndex - 1)];
    if (previous) selectAdminCheckpoint(previous);
  }

  function nextDemoCheckpoint() {
    if (!conductor || conductor.activeCheckpointId === "trip") return;
    if (conductor.checkpointStatus !== "resolved" && conductor.checkpointStatus !== "simulated") return;
    const index = EPISODE_IDS.indexOf(conductor.activeCheckpointId);
    const next = EPISODE_IDS[index + 1];
    if (next) selectAdminCheckpoint(next);
  }

  function openDemoTripMode() {
    if (!conductor || !canOpenDemoTripMode(game)) return;
    const storage = activeStorage();
    const nextLifecycle = withLifecycleMode(lifecycle, "trip");
    if (storage) saveLifecycleState(storage, nextLifecycle);
    stopTransientUi();
    setLifecycle(nextLifecycle);
    setConductor((current) => current ? updateDemoConductor(current, {
      activeCheckpointId: "trip",
      mode: "trip",
      checkpointStatus: "resolved",
      previewId: null,
      visitedCheckpointIds: current.visitedCheckpointIds.includes("trip")
        ? current.visitedCheckpointIds
        : [...current.visitedCheckpointIds, "trip"],
    }) : current);
    setAdminOpen(false);
  }

  function selectAdminTruthPreview(id: AdminTruthPreviewId) {
    if (sessionIdentity.mode !== "demo" || !conductor) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setInput("");
    setTeachingMoment(null);
    setTripDeckCardId(null);
    setAdminOpen(false);

    const storage = activeStorage();
    if (!storage || !saveDemoPreviewReturn(storage, game, lifecycle)) return;
    const nextLifecycle = withLifecycleMode(lifecycle, "prepare");
    saveLifecycleState(storage, nextLifecycle);
    setLifecycle(nextLifecycle);
    setGame((current) => seedAdminTruthPreview(current, id));
    setConductor((current) => current ? updateDemoConductor(current, { previewId: id }) : current);

    queueMicrotask(() => {
      document.getElementById("rehearsal-surface")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function returnFromTruthPreview() {
    if (!conductor?.previewId) return;
    const storage = activeStorage();
    const saved = storage ? loadDemoPreviewReturn(storage) : null;
    if (saved) {
      setGame(saved.game);
      setLifecycle(saved.lifecycle);
    } else if (conductor.activeCheckpointId !== "trip") {
      setGame((current) => canonicalPreEpisodeState(current, conductor.activeCheckpointId as EpisodeId));
      setLifecycle(createDefaultLifecycleState());
    }
    if (storage) clearDemoPreviewReturn(storage);
    setConductor((current) => current ? updateDemoConductor(current, { previewId: null }) : current);
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

  function selectSeasonEpisode(episodeId: GameState["episodeId"]) {
    if (episodeId === game.episodeId) {
      closeSeasonOverview();
      return;
    }
    if (sessionIdentity.mode === "demo") {
      setSeasonOverviewOpen(false);
      selectAdminCheckpoint(episodeId);
      return;
    }
    if (episodeId === "day-04") {
      setSeasonOverviewOpen(false);
      startBeachFocus();
      return;
    }
    seedEpisode(episodeId);
  }

  function practiceBeachAgain() {
    if (sessionIdentity.mode === "demo") {
      playDemoCheckpoint();
      return;
    }
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
    if (sessionIdentity.mode === "demo") {
      setTripDeckCardId(guidedHandoff.cardId);
      openDemoTripMode();
      return;
    }
    const nextLifecycle = withLifecycleMode(lifecycle, "trip");
    const storage = activeStorage();
    if (storage) saveLifecycleState(storage, nextLifecycle);
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
    if (sessionIdentity.mode === "demo") {
      setTripDeckCardId(episodeHandoff.cardId);
      openDemoTripMode();
      return;
    }
    const nextLifecycle = withLifecycleMode(lifecycle, "trip");
    const storage = activeStorage();
    if (storage) saveLifecycleState(storage, nextLifecycle);
    setLifecycle(nextLifecycle);
    setTripDeckCardId(episodeHandoff.cardId);
  }

  function openTeachingMoment(
    phraseId: PhraseId,
    source: TeachingMoment["source"] = "toolkit",
    original: string | null = null,
  ) {
    teachingTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : responseRef.current;
    setTeachingMoment({ phraseId, source, original });
    if (scene.id === "beach") {
      setGuidedSession((current) => recordGuidedRefresherOpened(current, phraseId));
    } else {
      setGame((current) => recordEpisodeRefresher(current, "opened"));
    }
  }

  function closeTeachingMoment() {
    setTeachingMoment(null);
    queueMicrotask(() => teachingTriggerRef.current?.focus());
  }

  function toggleProgressiveHelp() {
    if (!progressiveHelpOpen) {
      progressiveHelpTriggerRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : responseRef.current;
      setProgressiveHelpOpen(true);
      if (!game.progressiveHelp[game.turnId]) {
        setGame((current) => recordEpisodeRefresher(current, "opened"));
      }
      return;
    }
    setProgressiveHelpOpen(false);
    queueMicrotask(() => progressiveHelpTriggerRef.current?.focus());
  }

  async function useProgressiveHelp(level: ProgressiveHelpLevel) {
    if (level === 1 || level === 2) {
      const attempted = await playAudio(level === 1 ? "normal" : "careful");
      if (!attempted) return;
    }
    if (!activeStorage() || latestLive.current.currentTurnKey !== currentTurnKey || latestLive.current.prepCursor) return;
    setGame((current) => activeStorage() && interactionTurnKey(current) === currentTurnKey && !preparationCursor(current) ? advanceProgressiveHelp(current, level) : current);
    queueMicrotask(() => progressiveHelpNextRef.current?.focus({ preventScroll: true }));
  }

  function openSeasonOverview() {
    seasonOverviewTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setSeasonOverviewOpen(true);
  }

  function closeSeasonOverview() {
    setSeasonOverviewOpen(false);
    queueMicrotask(() => seasonOverviewTriggerRef.current?.focus());
  }

  function recordPhrasePractice(phraseId: PhraseId) {
    setGame((current) => recordPhrasePracticeState(current, phraseId));
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
  const relevantPhraseIds = [...new Set<PhraseId>([
    defaultHelpPhrase,
    "understand",
    "decline",
  ])];
  const activeLesson = teachingMoment ? PHRASE_BY_ID[teachingMoment.phraseId] : null;
  const activeExample = teachingMoment
    ? phraseExampleFor(teachingMoment.phraseId, scene.id, game.episodeId)
    : null;
  const progressiveHelp = turn.progressiveHelp;
  const progressiveHelpRecord = game.progressiveHelp[game.turnId];

  if (!hydrated) {
    return (
      <main className="loading-screen">
        <div className="loading-mark">30</div>
        <p>Loading your trip…</p>
      </main>
    );
  }

  if (!tripProfile) {
    return (
      <>
        {clientFailure && (
          <OperationalFailureBanner failure={clientFailure} onDismiss={() => setClientFailure(null)} />
        )}
        <TripSetup
          initialProfile={createDefaultTripProfile()}
          onSave={saveTripDetails}
        />
      </>
    );
  }

  const isPrepareMode = lifecycle.mode === "prepare";
  const activeDemoCheckpoint = conductor
    ? adminFastTrackCheckpoint(conductor.activeCheckpointId)
    : null;
  const adminPreviewToday = activeDemoCheckpoint
    ? adminPreviewDate(
        tripProfile.departureDate,
        activeDemoCheckpoint.daysUntilDeparture,
      ) ?? undefined
    : undefined;
  const showGuidedReview =
    guidedSession.status === "complete" && game.episodeId === "day-04";
  const showGuidedProgress =
    guidedSession.status === "in_progress" && game.episodeId === "day-04";
  const currentDay = EPISODE_BY_ID.get(game.episodeId)?.day ?? 0;
  const nextAvailableEpisode = scheduleSeason(
    tripProfile,
    game.completed,
    adminPreviewToday,
    sessionIdentity.mode === "demo",
  ).find((episode) => episode.playable && !episode.completed && episode.day > currentDay);
  const nextAvailableScene = nextAvailableEpisode
    ? sceneForEpisode(nextAvailableEpisode.id)
    : null;

  return (
    <main className={`app-shell ${isPrepareMode ? "prepare-app-shell" : "trip-app-shell"}`}>
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
        }}
      />

      <div className="app-navigation">
        <PrototypeHeader
          mode={lifecycle.mode}
          onOpenAdmin={() => setAdminOpen(true)}
        />
        <ModeNavigation mode={lifecycle.mode} onChange={changeMode} />
      </div>
      {clientFailure && (
        <OperationalFailureBanner failure={clientFailure} onDismiss={() => setClientFailure(null)} />
      )}

      {conductor && activeDemoCheckpoint && (
        <DemoModeBanner
          conductor={conductor}
          checkpoint={activeDemoCheckpoint}
          onOpenConductor={() => setAdminOpen(true)}
          onExit={exitActiveDemo}
          onReturnFromPreview={returnFromTruthPreview}
        />
      )}

      {isPrepareMode ? (
        <>
          {showGuidedReview && (
            <GuidedSessionReview
              session={guidedSession}
              game={game}
              scene={scene}
              nextScene={nextAvailableScene}
              handoff={guidedHandoff}
              handoffApplied={guidedHandoffApplied}
              onCarryToDeck={carryGuidedHandoffToDeck}
              onOpenInTripMode={openGuidedHandoffInTripMode}
              tripModeAvailable={sessionIdentity.mode === "owner" || canOpenDemoTripMode(game)}
              onNext={() => sessionIdentity.mode === "demo"
                ? nextDemoCheckpoint()
                : setGame((current) => nextEpisodeState(current))}
              onReview={openSeasonOverview}
              onPracticeAgain={practiceBeachAgain}
            />
          )}

          {!showGuidedReview && (
            <section id="rehearsal-surface" className="rehearsal-surface" aria-label="Rehearsal Mode">
              {showGuidedProgress ? (
                <GuidedSessionProgress status={guidedSession.status} />
              ) : (
                <CompactSessionProgress
                  game={game}
                  profile={tripProfile}
                  today={adminPreviewToday}
                  adminBypass={sessionIdentity.mode === "demo"}
                  onBrowse={openSeasonOverview}
                />
              )}

              <div className={`content-grid ${game.status !== "active" ? "resolved" : prepCursor ? "preparing" : ""}`}>
                <section className="story-panel">
                  {!prepCursor && game.status === "active" && <SceneIntroduction scene={scene} status={game.status} />}

                {prepCursor ? (
                  !seasonOverviewOpen && <PreparationView
                    key={`${sessionIdentity.generation}:${prepCursor}`}
                    game={game}
                    onAction={onPreparationAction}
                    onOverview={openSeasonOverview}
                    onReturn={returnFromPreparation}
                  />
                ) : game.status === "active" ? (
                  <>
                    <EncounterStage
                      turn={turn}
                      scene={scene}
                      game={game}
                      isPlaying={isPlaying}
                      interactionPhase={interactionPhase}
                      audioFailed={interaction.audioFailed && interaction.turnKey === currentTurnKey}
                      transcriptVisible={transcriptVisible}
                      onPlay={playAudio}
                      onRevealTranscript={revealTranscript}
                      onReadLine={implementedEpisode(game.episodeId)?.preparation ? readLiveLine : undefined}
                      progressiveHelp={Boolean(progressiveHelp)}
                    />

                    {game.teachingFeedback && (
                      <TeachingFeedbackResult feedback={game.teachingFeedback} />
                    )}

                    {(interactionPhase === "ready_to_respond" || interactionPhase === "submitting") && (
                      <ResponseComposer
                        responseRef={responseRef}
                        input={input}
                        interactionPhase={interactionPhase}
                        teachingOpen={Boolean(teachingMoment)}
                        onInput={setInput}
                        onSubmit={submitResponse}
                        onTeach={progressiveHelp ? toggleProgressiveHelp : () => openTeachingMoment(defaultHelpPhrase, "help")}
                        progressiveHelp={Boolean(progressiveHelp)}
                      />
                    )}

                    {implementedEpisode(game.episodeId)?.preparation && <button className="preparation-live-action" id="review-preparation" type="button" onClick={reviewPreparation}>Review preparation</button>}

                    {teachingMoment && activeLesson && activeExample && (
                      <TeachingCard
                        teachingMoment={teachingMoment}
                        lesson={activeLesson}
                        example={activeExample}
                        npc={scene.npc}
                        closeRef={teachingCloseRef}
                        onClose={closeTeachingMoment}
                        onBuild={practiceLessonFromScratch}
                      />
                    )}
                  </>
                ) : (
                  <OutcomeCard
                    game={game}
                    nextScene={nextAvailableScene}
                    showNatural={showNatural}
                    onToggleNatural={() => setShowNatural((value) => !value)}
                    onNext={() => sessionIdentity.mode === "demo"
                      ? nextDemoCheckpoint()
                      : setGame((current) => nextEpisodeState(current))}
                    onReview={openSeasonOverview}
                    onRestart={restartScene}
                    handoff={episodeHandoff}
                    handoffApplied={episodeHandoffApplied}
                    onCarryToDeck={carryEpisodeHandoffToDeck}
                    onOpenInTripMode={sessionIdentity.mode === "owner" || canOpenDemoTripMode(game)
                      ? openEpisodeHandoffInTripMode
                      : undefined}
                    onOpenTripMode={() => changeMode("trip")}
                    onPreparationReview={reviewPreparation}
                  />
                )}
                </section>

                {game.status === "active" && !prepCursor && (
                  <WorldPanel
                    key={currentTurnKey}
                    game={game}
                    scene={scene}
                    possessions={possessions}
                    support={displayedSupport}
                    totalSupport={totalSupport}
                    totalPhraseRefreshers={totalPhraseRefreshers}
                    activePhraseId={teachingMoment?.phraseId ?? null}
                    relevantPhraseIds={relevantPhraseIds}
                    onOpenPhrase={(phraseId) => openTeachingMoment(phraseId)}
                    progressiveHelp={progressiveHelp}
                    progressiveHelpRecord={progressiveHelpRecord}
                    progressiveHelpOpen={progressiveHelpOpen}
                    progressiveHelpNextRef={progressiveHelpNextRef}
                    onToggleProgressiveHelp={toggleProgressiveHelp}
                    onAdvanceProgressiveHelp={useProgressiveHelp}
                  />
                )}
              </div>
            </section>
          )}

          <footer>
            <span>Progress stays in this browser.</span>
          </footer>
        </>
      ) : (
        <>
          <PocketDeck
            profile={tripProfile}
            state={pocketDeck}
            demoMode={sessionIdentity.mode === "demo"}
            offlineReadiness={offlineReadiness}
            onStateChange={setPocketDeck}
            onEditTrip={openTripEditor}
            openCardId={tripDeckCardId}
            onOpenCardHandled={() => setTripDeckCardId(null)}
          />
          <footer className="trip-footer">
            <span>Saved in this browser. Search and downloaded audio work offline.</span>
          </footer>
        </>
      )}

      {seasonOverviewOpen && isPrepareMode && (
        <SeasonOverview
          game={game}
          profile={tripProfile}
          today={adminPreviewToday}
          adminBypass={sessionIdentity.mode === "demo"}
          closeRef={seasonOverviewCloseRef}
          onClose={closeSeasonOverview}
          onEditTrip={openTripEditor}
          onSelect={selectSeasonEpisode}
        />
      )}

      {adminOpen && (
        <AdminModal
          game={game}
          profile={tripProfile}
          sessionMode={sessionIdentity.mode}
          conductor={conductor}
          canOpenTripMode={canOpenDemoTripMode(game)}
          onClose={() => setAdminOpen(false)}
          onStartDemo={startDemoWalkthrough}
          onSelectCheckpoint={selectAdminCheckpoint}
          onSelectTruthPreview={selectAdminTruthPreview}
          onPreviousCheckpoint={previousDemoCheckpoint}
          onPlayCheckpoint={playDemoCheckpoint}
          onAdvanceCanonical={advanceDemoCheckpoint}
          onNextCheckpoint={nextDemoCheckpoint}
          onOpenTripMode={openDemoTripMode}
          onExitDemo={exitActiveDemo}
          onResetDemo={resetActiveDemo}
          onResetOwner={resetOwnerJourney}
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
