export type ClientFailureSeverity = "warning" | "error";

export type ClientFailure = {
  code:
    | "PERSISTENCE_DATA_INVALID"
    | "PERSISTENCE_READ_FAILED"
    | "PERSISTENCE_WRITE_FAILED"
    | "PERSISTENCE_CLEAR_FAILED"
    | "OFFLINE_PREPARATION_FAILED"
    | "OFFLINE_UPDATE_FAILED"
    | "AUDIO_PLAYBACK_FAILED"
    | "UNEXPECTED_UI_FAILURE";
  domain: "game" | "trip" | "lifecycle" | "guided" | "pocket-deck" | "demo" | "offline" | "audio" | "runtime";
  operation: string;
  severity: ClientFailureSeverity;
  userMessage: string;
  occurrence: number;
  occurredAt: string;
  causeType: string;
};

type FailureInput = Omit<ClientFailure, "occurrence" | "occurredAt" | "causeType">;
type FailureListener = (failure: ClientFailure) => void;

const occurrenceCounts = new Map<string, number>();
const listeners = new Set<FailureListener>();

function safeCauseType(cause: unknown): string {
  if (cause instanceof Error && cause.name) return cause.name.slice(0, 80);
  return typeof cause;
}

export function reportClientFailure(input: FailureInput, cause?: unknown): ClientFailure {
  const key = `${input.code}:${input.domain}:${input.operation}`;
  const occurrence = (occurrenceCounts.get(key) ?? 0) + 1;
  occurrenceCounts.set(key, occurrence);
  const failure: ClientFailure = {
    ...input,
    occurrence,
    occurredAt: new Date().toISOString(),
    causeType: safeCauseType(cause),
  };

  if (typeof window !== "undefined") {
    const details = {
      code: failure.code,
      domain: failure.domain,
      operation: failure.operation,
      severity: failure.severity,
      occurrence: failure.occurrence,
      occurredAt: failure.occurredAt,
      causeType: failure.causeType,
    };
    if (input.severity === "error") {
      console.error("[30-days-to-italy] operational failure", details);
    } else {
      console.warn("[30-days-to-italy] operational failure", details);
    }
  }
  for (const listener of listeners) listener(failure);
  return failure;
}

export function subscribeToClientFailures(listener: FailureListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetClientFailureCountsForTests(): void {
  occurrenceCounts.clear();
}
