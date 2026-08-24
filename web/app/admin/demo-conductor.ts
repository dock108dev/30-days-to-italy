import type { AppMode } from "../lifecycle/model";
import { reportClientFailure } from "../observability/client-failures";
import { isEpisodeId, type EpisodeId } from "../season/manifest";
import type { AdminTruthPreviewId } from "./truth-previews";

export const DEMO_CONDUCTOR_STORAGE_KEY = "thirty-days-to-italy-demo-conductor-v1";
export const DEMO_CONDUCTOR_SCHEMA_VERSION = 1 as const;

export type DemoCheckpointId = EpisodeId | "trip";
export type DemoCheckpointStatus = "unplayed" | "active" | "resolved" | "simulated";

export type DemoConductor = {
  schemaVersion: typeof DEMO_CONDUCTOR_SCHEMA_VERSION;
  sessionId: string;
  activeCheckpointId: DemoCheckpointId;
  mode: AppMode;
  checkpointStatus: DemoCheckpointStatus;
  visitedCheckpointIds: DemoCheckpointId[];
  playedNormally: EpisodeId[];
  advancedCanonically: EpisodeId[];
  previewId: AdminTruthPreviewId | null;
  startedAt: string;
  updatedAt: string;
};

export type DemoConductorStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PREVIEW_IDS = new Set<AdminTruthPreviewId>([
  "day-19-no-ticket",
  "day-21-replacement-bus",
  "day-21-rebooked",
  "day-21-refunded",
  "day-21-cancelled",
  "day-21-neutral",
]);
const CHECKPOINT_STATUSES = new Set<DemoCheckpointStatus>([
  "unplayed",
  "active",
  "resolved",
  "simulated",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function episodeIds(value: unknown): EpisodeId[] | null {
  if (!Array.isArray(value)) return null;
  const result: EpisodeId[] = [];
  for (const item of value) {
    if (!isEpisodeId(item) || result.includes(item)) return null;
    result.push(item);
  }
  return result;
}

function checkpointIds(value: unknown): DemoCheckpointId[] | null {
  if (!Array.isArray(value)) return null;
  const result: DemoCheckpointId[] = [];
  for (const item of value) {
    if (item !== "trip" && !isEpisodeId(item)) return null;
    if (result.includes(item)) return null;
    result.push(item);
  }
  return result;
}

export function createDemoConductor(sessionId: string, now = new Date()): DemoConductor {
  const timestamp = now.toISOString();
  return {
    schemaVersion: DEMO_CONDUCTOR_SCHEMA_VERSION,
    sessionId,
    activeCheckpointId: "day-00",
    mode: "prepare",
    checkpointStatus: "unplayed",
    visitedCheckpointIds: ["day-00"],
    playedNormally: [],
    advancedCanonically: [],
    previewId: null,
    startedAt: timestamp,
    updatedAt: timestamp,
  };
}

export function parseDemoConductor(
  raw: string | null,
  expectedSessionId: string,
): DemoConductor | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.schemaVersion !== DEMO_CONDUCTOR_SCHEMA_VERSION ||
      value.sessionId !== expectedSessionId ||
      (value.activeCheckpointId !== "trip" && !isEpisodeId(value.activeCheckpointId)) ||
      (value.mode !== "prepare" && value.mode !== "trip") ||
      !CHECKPOINT_STATUSES.has(value.checkpointStatus as DemoCheckpointStatus) ||
      !validIsoDate(value.startedAt) ||
      !validIsoDate(value.updatedAt)
    ) return null;
    const visitedCheckpointIds = checkpointIds(value.visitedCheckpointIds);
    const playedNormally = episodeIds(value.playedNormally);
    const advancedCanonically = episodeIds(value.advancedCanonically);
    if (!visitedCheckpointIds || !playedNormally || !advancedCanonically) return null;
    if (playedNormally.some((id) => advancedCanonically.includes(id))) return null;
    const previewId = value.previewId === null
      ? null
      : PREVIEW_IDS.has(value.previewId as AdminTruthPreviewId)
        ? value.previewId as AdminTruthPreviewId
        : undefined;
    if (previewId === undefined) return null;
    if (value.activeCheckpointId === "trip" && value.mode !== "trip") return null;
    if (value.activeCheckpointId !== "trip" && value.mode !== "prepare") return null;
    return {
      schemaVersion: DEMO_CONDUCTOR_SCHEMA_VERSION,
      sessionId: expectedSessionId,
      activeCheckpointId: value.activeCheckpointId,
      mode: value.mode,
      checkpointStatus: value.checkpointStatus as DemoCheckpointStatus,
      visitedCheckpointIds,
      playedNormally,
      advancedCanonically,
      previewId,
      startedAt: value.startedAt,
      updatedAt: value.updatedAt,
    };
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_DATA_INVALID", domain: "demo", operation: "parse-conductor", severity: "error", userMessage: "The isolated demo record was invalid and cannot be resumed. Owner progress was not affected." }, error);
    return null;
  }
}

export function loadDemoConductor(
  storage: DemoConductorStorage,
  expectedSessionId: string,
): DemoConductor | null {
  try {
    return parseDemoConductor(
      storage.getItem(DEMO_CONDUCTOR_STORAGE_KEY),
      expectedSessionId,
    );
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_READ_FAILED", domain: "demo", operation: "load-conductor", severity: "error", userMessage: "The isolated demo could not be read. Owner progress was not affected." }, error);
    return null;
  }
}

export function saveDemoConductor(
  storage: DemoConductorStorage,
  conductor: DemoConductor,
): boolean {
  try {
    storage.setItem(DEMO_CONDUCTOR_STORAGE_KEY, JSON.stringify(conductor));
    return true;
  } catch (error) {
    reportClientFailure({ code: "PERSISTENCE_WRITE_FAILED", domain: "demo", operation: "save-conductor", severity: "error", userMessage: "The demo checkpoint was not saved. Stop the demo and keep the owner journey unchanged." }, error);
    return false;
  }
}

export function updateDemoConductor(
  conductor: DemoConductor,
  updates: Partial<Omit<DemoConductor, "schemaVersion" | "sessionId" | "startedAt">>,
  now = new Date(),
): DemoConductor {
  return {
    ...conductor,
    ...updates,
    schemaVersion: DEMO_CONDUCTOR_SCHEMA_VERSION,
    sessionId: conductor.sessionId,
    startedAt: conductor.startedAt,
    updatedAt: now.toISOString(),
  };
}

export function checkpointAuditStatus(
  conductor: DemoConductor,
  checkpointId: EpisodeId,
): DemoCheckpointStatus {
  if (conductor.advancedCanonically.includes(checkpointId)) return "simulated";
  if (conductor.playedNormally.includes(checkpointId)) return "resolved";
  return "unplayed";
}
