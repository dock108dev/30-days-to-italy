"use client";

import { useEffect } from "react";

import { reportClientFailure } from "./observability/client-failures";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientFailure({
      code: "UNEXPECTED_UI_FAILURE",
      domain: "runtime",
      operation: "render-route",
      severity: "error",
      userMessage: "The current screen could not be shown. Your saved browser data was not intentionally changed.",
    }, error);
  }, [error]);

  return (
    <main className="fatal-error-screen">
      <div className="loading-mark" aria-hidden="true">!</div>
      <h1>This screen could not be shown</h1>
      <p>Your saved browser data was not intentionally changed. Try the screen once more.</p>
      <button type="button" onClick={reset}>Try again</button>
      <small>Reference UNEXPECTED_UI_FAILURE{error.digest ? ` · ${error.digest}` : ""}</small>
    </main>
  );
}
