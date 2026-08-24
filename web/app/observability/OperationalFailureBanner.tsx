import type { ClientFailure } from "./client-failures";

export function OperationalFailureBanner({
  failure,
  onDismiss,
}: {
  failure: ClientFailure;
  onDismiss: () => void;
}) {
  return (
    <aside className="operational-failure-banner" role="alert" aria-live="assertive">
      <div>
        <strong>Something needs attention</strong>
        <p>{failure.userMessage}</p>
        <span>
          Reference {failure.code} · {failure.domain}/{failure.operation}
          {failure.occurrence > 1 ? ` · repeated ${failure.occurrence} times` : ""}
        </span>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss operational warning">Dismiss</button>
    </aside>
  );
}
