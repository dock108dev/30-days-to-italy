import { useCallback, useEffect, useRef, useState } from "react";

import {
  finishPendingOutcome,
} from "../game/engine";
import { initialState, type GameState } from "../game/model";
import { loadGame, saveGame } from "../game/persistence";
import { reconcileGuidedBeachSession } from "../guided/engine";
import { createDefaultGuidedBeachSession, type GuidedBeachSession } from "../guided/model";
import { loadGuidedSession, saveGuidedSession } from "../guided/persistence";
import { createDefaultLifecycleState, type LifecycleState } from "../lifecycle/model";
import { loadLifecycleState } from "../lifecycle/persistence";
import {
  saveDemoConductor,
  updateDemoConductor,
  type DemoConductor,
} from "../admin/demo-conductor";
import {
  isCurrentApplicationSession,
  loadActiveDemoSession,
  ownerSession,
  type ApplicationSession,
  type ApplicationSessionMode,
  type EnumerableSessionStorage,
  type SessionStorage,
} from "../persistence/session";
import { createDefaultPocketDeckState, type PocketDeckState } from "../pocket-deck/model";
import { loadPocketDeckState, savePocketDeckState } from "../pocket-deck/persistence";
import type { TripProfile } from "../trip/model";
import { loadTripProfile } from "../trip/persistence";

export type SessionIdentity = {
  mode: ApplicationSessionMode;
  id: string;
  generation: number;
};

type ActiveSessionRuntime = SessionIdentity & {
  storage: SessionStorage;
};

function consumeHydrationSaveBlock(
  blocks: { generation: number; domains: Set<string> },
  generation: number,
  domain: string,
): boolean {
  if (blocks.generation !== generation || !blocks.domains.has(domain)) return false;
  blocks.domains.delete(domain);
  return true;
}

export function useApplicationSession() {
  const [game, setGame] = useState<GameState>(() => initialState());
  const [tripProfile, setTripProfile] = useState<TripProfile | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleState>(() => createDefaultLifecycleState());
  const [guidedSession, setGuidedSession] = useState<GuidedBeachSession>(() => createDefaultGuidedBeachSession());
  const [pocketDeck, setPocketDeck] = useState<PocketDeckState>(() => createDefaultPocketDeckState());
  const [hydrated, setHydrated] = useState(false);
  const [sessionIdentity, setSessionIdentity] = useState<SessionIdentity>({
    mode: "owner",
    id: "owner",
    generation: 0,
  });
  const [conductor, setConductor] = useState<DemoConductor | null>(null);
  const activeSessionRef = useRef<ActiveSessionRuntime | null>(null);
  const saveBlocksRef = useRef<{ generation: number; domains: Set<string> }>({
    generation: 0,
    domains: new Set(),
  });

  const activateApplicationSession = useCallback((session: ApplicationSession) => {
    const generation = (activeSessionRef.current?.generation ?? 0) + 1;
    const runtime: ActiveSessionRuntime = {
      mode: session.mode,
      id: session.id,
      generation,
      storage: session.storage,
    };
    activeSessionRef.current = runtime;
    saveBlocksRef.current = {
      generation,
      domains: new Set(["game", "guided", "deck", "conductor"]),
    };
    setHydrated(false);

    const loadedGame = finishPendingOutcome(loadGame(runtime.storage));
    const loadedProfile = loadTripProfile(runtime.storage);
    const loadedLifecycle = loadLifecycleState(runtime.storage);
    const loadedGuidedSession = reconcileGuidedBeachSession(
      loadGuidedSession(runtime.storage),
      loadedGame,
    );

    setSessionIdentity({ mode: runtime.mode, id: runtime.id, generation });
    setConductor(session.mode === "demo" ? session.conductor : null);
    setGame(loadedGame);
    setTripProfile(loadedProfile);
    setLifecycle(loadedLifecycle);
    setGuidedSession(loadedGuidedSession);
    setPocketDeck(loadPocketDeckState(runtime.storage));
    setHydrated(true);
  }, []);

  const activeStorage = useCallback((): SessionStorage | null => {
    const runtime = activeSessionRef.current;
    return isCurrentApplicationSession(runtime, sessionIdentity) ? runtime!.storage : null;
  }, [sessionIdentity]);

  const guardOwnerSession = useCallback((storage: SessionStorage) => {
    activeSessionRef.current = {
      mode: "owner",
      id: "owner",
      generation: (activeSessionRef.current?.generation ?? 0) + 1,
      storage,
    };
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const storage = window.localStorage as EnumerableSessionStorage;
      activateApplicationSession(loadActiveDemoSession(storage) ?? ownerSession(storage));
    });
    return () => {
      active = false;
    };
  }, [activateApplicationSession]);

  useEffect(() => {
    if (!hydrated) return;
    const runtime = activeSessionRef.current;
    if (!isCurrentApplicationSession(runtime, sessionIdentity)) return;
    if (consumeHydrationSaveBlock(saveBlocksRef.current, sessionIdentity.generation, "game")) return;
    saveGame(runtime!.storage, game);
  }, [game, hydrated, sessionIdentity]);

  useEffect(() => {
    if (!hydrated) return;
    const runtime = activeSessionRef.current;
    if (!isCurrentApplicationSession(runtime, sessionIdentity)) return;
    if (consumeHydrationSaveBlock(saveBlocksRef.current, sessionIdentity.generation, "guided")) return;
    saveGuidedSession(runtime!.storage, guidedSession);
  }, [guidedSession, hydrated, sessionIdentity]);

  useEffect(() => {
    if (!hydrated) return;
    const runtime = activeSessionRef.current;
    if (!isCurrentApplicationSession(runtime, sessionIdentity)) return;
    if (consumeHydrationSaveBlock(saveBlocksRef.current, sessionIdentity.generation, "deck")) return;
    savePocketDeckState(runtime!.storage, pocketDeck);
  }, [pocketDeck, hydrated, sessionIdentity]);

  useEffect(() => {
    if (!hydrated || !conductor || sessionIdentity.mode !== "demo") return;
    const runtime = activeSessionRef.current;
    if (!isCurrentApplicationSession(runtime, sessionIdentity) || runtime!.id !== conductor.sessionId) return;
    if (consumeHydrationSaveBlock(saveBlocksRef.current, sessionIdentity.generation, "conductor")) return;
    saveDemoConductor(runtime!.storage, conductor);
  }, [conductor, hydrated, sessionIdentity]);

  useEffect(() => {
    if (
      !hydrated ||
      sessionIdentity.mode !== "demo" ||
      !conductor ||
      conductor.previewId ||
      conductor.activeCheckpointId === "trip" ||
      conductor.activeCheckpointId !== game.episodeId ||
      conductor.checkpointStatus !== "active" ||
      game.status === "active"
    ) return;
    queueMicrotask(() => {
      setConductor((current) => current && current.sessionId === conductor.sessionId
        ? updateDemoConductor(current, {
            checkpointStatus: "resolved",
            playedNormally: current.playedNormally.includes(game.episodeId)
              ? current.playedNormally
              : [...current.playedNormally, game.episodeId],
          })
        : current);
    });
  }, [conductor, game.episodeId, game.status, hydrated, sessionIdentity.mode]);

  return {
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
  };
}
