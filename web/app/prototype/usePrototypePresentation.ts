import { useEffect, useRef, useState } from "react";

import type { GameState, TeachingMoment } from "../game/model";
import {
  subscribeToClientFailures,
  type ClientFailure,
} from "../observability/client-failures";
import type { InteractionPhase } from "./PrototypeViews";

type InteractionState = {
  turnKey: string;
  phase: Exclude<InteractionPhase, "resolved">;
  audioFailed: boolean;
};

export function interactionTurnKey(
  game: Pick<GameState, "episodeId" | "turnId" | "status">,
): string {
  return `${game.episodeId}:${game.turnId}:${game.status}`;
}

export function usePrototypePresentation(game: GameState) {
  const currentTurnKey = interactionTurnKey(game);
  const [input, setInput] = useState("");
  const [interaction, setInteraction] = useState<InteractionState>(() => ({
    turnKey: currentTurnKey,
    phase: "awaiting_line",
    audioFailed: false,
  }));
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [tripEditorOpen, setTripEditorOpen] = useState(false);
  const [showNatural, setShowNatural] = useState(false);
  const [teachingMoment, setTeachingMoment] = useState<TeachingMoment | null>(null);
  const [progressiveHelpOpen, setProgressiveHelpOpen] = useState(false);
  const [seasonOverviewOpen, setSeasonOverviewOpen] = useState(false);
  const [clientFailure, setClientFailure] = useState<ClientFailure | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const responseRef = useRef<HTMLTextAreaElement>(null);
  const teachingCloseRef = useRef<HTMLButtonElement>(null);
  const teachingTriggerRef = useRef<HTMLElement | null>(null);
  const progressiveHelpTriggerRef = useRef<HTMLElement | null>(null);
  const progressiveHelpNextRef = useRef<HTMLButtonElement>(null);
  const seasonOverviewCloseRef = useRef<HTMLButtonElement>(null);
  const seasonOverviewTriggerRef = useRef<HTMLElement | null>(null);
  const submissionInFlightRef = useRef(false);
  const pendingRebuiltEpisodeRef = useRef<GameState["episodeId"] | null>(null);
  const interactionPhase: InteractionPhase = game.status !== "active"
    ? "resolved"
    : interaction.turnKey === currentTurnKey
      ? interaction.phase
      : "awaiting_line";

  useEffect(() => subscribeToClientFailures(setClientFailure), []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setInteraction({
        turnKey: currentTurnKey,
        phase: "awaiting_line",
        audioFailed: false,
      });
      setTranscriptVisible(false);
      setIsPlaying(false);
      setShowNatural(false);
      setTeachingMoment(null);
      setProgressiveHelpOpen(false);
      pendingRebuiltEpisodeRef.current = null;
    });
    return () => {
      active = false;
    };
  }, [currentTurnKey]);

  useEffect(() => {
    if (interactionPhase !== "ready_to_respond") return;
    let active = true;
    queueMicrotask(() => {
      if (!active || !responseRef.current) return;
      responseRef.current.focus({ preventScroll: true });
      const form = responseRef.current.closest("form");
      requestAnimationFrame(() => {
        if (!form) return;
        const rect = form.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
          window.scrollBy({ top: rect.bottom - window.innerHeight + 12 });
        }
      });
    });
    return () => {
      active = false;
    };
  }, [interactionPhase]);

  useEffect(() => {
    if (teachingMoment) teachingCloseRef.current?.focus();
  }, [teachingMoment]);

  useEffect(() => {
    if (progressiveHelpOpen) progressiveHelpNextRef.current?.focus({ preventScroll: true });
  }, [progressiveHelpOpen]);

  useEffect(() => {
    if (seasonOverviewOpen) seasonOverviewCloseRef.current?.focus();
  }, [seasonOverviewOpen]);

  useEffect(() => {
    if (!teachingMoment && !seasonOverviewOpen && !progressiveHelpOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (seasonOverviewOpen) {
        setSeasonOverviewOpen(false);
        queueMicrotask(() => seasonOverviewTriggerRef.current?.focus());
        return;
      }
      if (progressiveHelpOpen) {
        setProgressiveHelpOpen(false);
        queueMicrotask(() => progressiveHelpTriggerRef.current?.focus());
        return;
      }
      setTeachingMoment(null);
      queueMicrotask(() => teachingTriggerRef.current?.focus());
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [progressiveHelpOpen, seasonOverviewOpen, teachingMoment]);

  return {
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
  };
}
