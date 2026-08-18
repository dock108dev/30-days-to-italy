"use client";

import { useEffect, useState } from "react";

import {
  OFFLINE_UNAVAILABLE,
  PREPARING_OFFLINE,
  readinessFromWorkerReport,
  type OfflineReadiness,
  type OfflineWorkerReport,
} from "./model";

const STATUS_TIMEOUT_MS = 8_000;

function requestWorkerReport(
  worker: ServiceWorker,
  type: "GET_OFFLINE_STATUS" | "REPAIR_OFFLINE_CACHE",
): Promise<OfflineWorkerReport> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error("Offline worker did not answer."));
    }, STATUS_TIMEOUT_MS);

    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      const value = event.data;
      if (
        typeof value !== "object" ||
        value === null ||
        (value as { type?: unknown }).type !== "OFFLINE_STATUS"
      ) {
        reject(new Error("Offline worker returned an invalid status."));
        return;
      }
      resolve(value as OfflineWorkerReport);
    };

    worker.postMessage({ type }, [channel.port2]);
  });
}

function workerForRegistration(registration: ServiceWorkerRegistration): ServiceWorker | null {
  return registration.waiting ?? registration.installing ?? registration.active;
}

function waitForInstalledWorker(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorker | null> {
  const existing = workerForRegistration(registration);
  if (existing?.state === "activated") return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (worker: ServiceWorker | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(worker);
    };
    const timeout = window.setTimeout(
      () => finish(workerForRegistration(registration)),
      STATUS_TIMEOUT_MS,
    );
    const watch = (worker: ServiceWorker | null) => {
      if (!worker) return;
      if (worker.state === "activated") {
        finish(worker);
        return;
      }
      if (worker.state === "installed" && registration.waiting) {
        registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
      }
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && registration.waiting) {
          registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
        }
        if (worker.state === "activated") finish(worker);
        if (worker.state === "redundant") finish(null);
      });
    };

    watch(existing);
    registration.addEventListener("updatefound", () => watch(registration.installing));
  });
}

export function useOfflineReadiness(): OfflineReadiness {
  const [readiness, setReadiness] = useState<OfflineReadiness>(PREPARING_OFFLINE);

  useEffect(() => {
    let active = true;
    let latestReport: OfflineWorkerReport | null = null;

    const applyReport = (report: OfflineWorkerReport) => {
      latestReport = report;
      if (active) setReadiness(readinessFromWorkerReport(report, navigator.onLine));
    };

    const applyConnectivity = () => {
      if (!active) return;
      if (latestReport) {
        setReadiness(readinessFromWorkerReport(latestReport, navigator.onLine));
      }
    };

    async function prepareOfflineFiles() {
      if (
        process.env.NODE_ENV !== "production" ||
        !("serviceWorker" in navigator) ||
        !("caches" in window)
      ) {
        if (active) setReadiness(OFFLINE_UNAVAILABLE);
        return;
      }

      try {
        const existing = await navigator.serviceWorker.getRegistration("/");
        const registration = existing ?? (
          navigator.onLine
            ? await navigator.serviceWorker.register("/sw.js", {
                scope: "/",
                updateViaCache: "none",
              })
            : null
        );
        if (!registration) throw new Error("Offline files were not prepared before disconnecting.");
        if (existing && navigator.onLine) {
          await existing.update().catch(() => undefined);
        }
        const worker = await waitForInstalledWorker(registration);
        if (!worker) throw new Error("Offline worker could not activate.");

        let report = await requestWorkerReport(worker, "GET_OFFLINE_STATUS");
        if (!report.ready && navigator.onLine) {
          report = await requestWorkerReport(worker, "REPAIR_OFFLINE_CACHE");
        }
        applyReport(report);
      } catch {
        if (active) setReadiness(OFFLINE_UNAVAILABLE);
      }
    }

    window.addEventListener("online", applyConnectivity);
    window.addEventListener("offline", applyConnectivity);
    void prepareOfflineFiles();

    return () => {
      active = false;
      window.removeEventListener("online", applyConnectivity);
      window.removeEventListener("offline", applyConnectivity);
    };
  }, []);

  return readiness;
}
