import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import {
  authoredTurn,
  buildObservedEpisodeResult,
  isAcceptedTransition,
  noObservation,
  observation,
  type EpisodeDefinition,
} from "../types";

const metadata = seasonEpisode("day-01");

export const day01Episode: EpisodeDefinition = {
  ...metadata,
  sceneId: "apartment",
  scene: {
    id: "apartment", episodeId: "day-01", day: "Day 1", dateLabel: "30 days out",
    title: metadata.title, location: metadata.location, time: "16:10", npc: "Raffaele",
    role: "Apartment manager", objective: "Find the correct entrance and floor.",
    firstTurn: "d01_01_arrival", kicker: "Raffaele is busy and expects a compact key handoff.",
    suggestions: ["Sì, sono Michael. Sono qui per la chiave.", "La porta verde, primo piano.", "Grazie, a dopo."],
  },
  turns: {
    d01_01_arrival: authoredTurn("d01_01_arrival", "Raffaele", "Buonasera. Lei è Michael? È qui per la chiave?", "Confirm briefly so you can get the entrance directions."),
    d01_02_door: authoredTurn("d01_02_door", "Raffaele", "Ecco la chiave. La porta verde, poi il primo piano. È chiaro?", "Confirm the green door and first floor."),
    d01_03_close: authoredTurn("d01_03_close", "Raffaele", "Perfetto. Se serve qualcosa, mi scriva. A dopo.", "The key handoff is complete.", true),
  },
  outcomes: {
    "D01-O1": { id: "D01-O1", title: "Casa Limone is open", detail: "You identified yourself, received the apartment key, and confirmed the green door and first floor.", consequence: "Apartment key · green door · first floor", tone: "success" },
    "D01-O2": { id: "D01-O2", title: "Handoff deferred", detail: "You left before confirming access. Raffaele still has the key.", consequence: "No key · return later", tone: "open" },
    "D01-O3": { id: "D01-O3", title: "Key received; directions unconfirmed", detail: "You received the apartment key and ended before confirming the green door and first floor.", consequence: "Apartment key held · entrance directions still unconfirmed", tone: "open" },
  },
  terminalOutcomeTurns: { "D01-O1": ["d01_03_close"] },
  evaluateResponse({ state, normalized, createId, runtime }) {
    const exit = any(normalized, EXIT);
    if (state.turnId === "d01_01_arrival") {
      if (exit) return runtime.resolveOutcome(state, "D01-O2", {}, null, createId);
      const identified = any(normalized, ["michael", "fuscoletti"]);
      const requestedKey = any(normalized, ["per la chiave", "vorrei la chiave", "mi serve la chiave", "ritirare la chiave"]);
      if (identified && requestedKey) {
        return runtime.moveToTurn(state, "d01_02_door", { apartmentKey: true, keyCustody: { ...state.keyCustody, apartment: "held" } }, "Raffaele matched your name and handed over the key.", createId);
      }
      return runtime.moveToTurn(state, "d01_01_arrival", {}, "Confirm your name and that you are here for the key in Italian.", createId);
    }
    if (state.turnId === "d01_02_door") {
      if (exit) {
        return runtime.resolveOutcome(state, "D01-O3", {
          apartmentKey: true,
          keyCustody: { ...state.keyCustody, apartment: "held" },
        }, null, createId);
      }
      const doorConfirmed = any(normalized, ["porta verde"]);
      const floorConfirmed = any(normalized, ["primo piano"]);
      const understandingConfirmed = any(normalized, ["ho capito", "tutto chiaro", "e chiaro"]);
      if ((doorConfirmed && floorConfirmed) || understandingConfirmed) {
        return runtime.queueTerminal(state, "d01_03_close", "D01-O1", {
          apartmentKey: true,
          keyCustody: { ...state.keyCustody, apartment: "held" },
          knownFacts: [...new Set([...state.knownFacts, "Casa Limone: green door, first floor", "Raffaele completed the apartment-key handoff"])],
          relationships: { ...state.relationships, Raffaele: "efficient" },
        }, createId);
      }
      return runtime.moveToTurn(state, "d01_02_door", {}, "Confirm both the green door and the first floor in Italian, or ask Raffaele to repeat.", createId);
    }
    return state;
  },
  observeResponse({ before, after, normalized }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (before.turnId === "d01_01_arrival" && after.turnId === "d01_02_door") {
      const moves = [] as ("identify" | "request")[];
      if (any(normalized, ["michael", "fuscoletti"])) moves.push("identify");
      if (any(normalized, ["chiave", "key", "sono qui", "casa limone"])) moves.push("request");
      return observation(moves);
    }
    if (before.turnId === "d01_02_door" && after.turnId === "d01_03_close") {
      const confirmed = any(normalized, ["verde", "green", "primo", "first", "chiaro", "capito"]);
      return observation(confirmed ? ["location", "confirm"] : any(normalized, EXIT) ? ["boundary"] : []);
    }
    if (before.turnId === "d01_02_door" && after.outcome?.id === "D01-O3") return observation(["boundary"]);
    return noObservation();
  },
  adminSeed: () => ({ hotelKey: true, completed: ["day-00"] }),
  buildResult: buildObservedEpisodeResult,
};
