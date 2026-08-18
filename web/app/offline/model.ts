export type OfflineReadinessState =
  | "preparing"
  | "ready"
  | "offline"
  | "unavailable";

export type OfflineReadiness = {
  state: OfflineReadinessState;
  label: string;
  detail: string;
  cacheVersion: string | null;
};

export type OfflineWorkerReport = {
  type: "OFFLINE_STATUS";
  ready: boolean;
  cacheVersion: string;
  requiredCount: number;
  cachedCount: number;
  networkAvailable?: boolean;
  reason?: string;
};

export const PREPARING_OFFLINE: OfflineReadiness = {
  state: "preparing",
  label: "Preparing offline access…",
  detail: "Keeping the Pocket Deck and its local audio ready for this device.",
  cacheVersion: null,
};

export const OFFLINE_UNAVAILABLE: OfflineReadiness = {
  state: "unavailable",
  label: "Offline files unavailable",
  detail: "The connected app still works, but its offline files are not ready on this device.",
  cacheVersion: null,
};

export function readinessFromWorkerReport(
  report: OfflineWorkerReport,
  online: boolean,
): OfflineReadiness {
  if (!report.ready) {
    return {
      ...OFFLINE_UNAVAILABLE,
      detail: report.reason
        ? `Offline files are incomplete: ${report.reason}`
        : "The connected app still works, but one or more offline files need to be prepared again.",
      cacheVersion: report.cacheVersion,
    };
  }

  const networkAvailable = report.networkAvailable ?? online;
  return {
    state: networkAvailable ? "ready" : "offline",
    label: networkAvailable ? "Ready offline" : "Offline",
    detail: networkAvailable
      ? "This Pocket Deck and its audio are ready if the connection disappears."
      : "Using the Pocket Deck and audio stored on this device.",
    cacheVersion: report.cacheVersion,
  };
}
