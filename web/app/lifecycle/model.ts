export const LIFECYCLE_SCHEMA_VERSION = 1 as const;

export type AppMode = "prepare" | "trip";

export type LifecycleState = {
  schemaVersion: typeof LIFECYCLE_SCHEMA_VERSION;
  mode: AppMode;
};

export function createDefaultLifecycleState(): LifecycleState {
  return {
    schemaVersion: LIFECYCLE_SCHEMA_VERSION,
    mode: "prepare",
  };
}

export function normalizeLifecycleState(value: unknown): LifecycleState {
  const defaults = createDefaultLifecycleState();
  if (typeof value !== "object" || value === null || Array.isArray(value)) return defaults;

  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== LIFECYCLE_SCHEMA_VERSION) return defaults;
  if (candidate.mode !== "prepare" && candidate.mode !== "trip") return defaults;

  return {
    schemaVersion: LIFECYCLE_SCHEMA_VERSION,
    mode: candidate.mode,
  };
}

export function withLifecycleMode(
  state: LifecycleState,
  mode: AppMode,
): LifecycleState {
  if (state.mode === mode) return state;
  return {
    schemaVersion: LIFECYCLE_SCHEMA_VERSION,
    mode,
  };
}
