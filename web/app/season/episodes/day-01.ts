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

const day01Teaching = {
  d01_01_arrival: {
    success: { understood: "You identified yourself as Michael and asked for the key.", natural: "Sì, sono Michael. Sono qui per la chiave.", tryNext: "Listen for porta and piano in the directions." },
    successSurname: { understood: "You identified the handoff with the surname Fuscoletti and asked for the key.", natural: "Sono Fuscoletti. Sono qui per la chiave.", tryNext: "Listen for porta and piano in the directions." },
    identifyOnly: { understood: "You identified yourself as Michael; the key request is still missing.", natural: "Sì, sono Michael. Sono qui per ___.", tryNext: "Add why you are here." },
    requestOnly: { understood: "You asked for the key; your name is still missing.", natural: "Sono ___. Sono qui per la chiave.", tryNext: "Add the name Raffaele asked for." },
    failed: { understood: "Nothing actionable was recognized yet; both your name and the key request are still missing.", natural: "Sì, sono ___. Sono qui per ___.", tryNext: "Start with one move: your name or why you are here." },
    fallback: { understood: "Nothing actionable was recognized yet; both your name and the key request are still missing.", natural: "Sì, sono ___. Sono qui per ___.", tryNext: "Use the help ladder for one Italian cue." },
    exit: { understood: "You chose to end the interaction before identification or key handoff.", natural: "Devo andare, torno più tardi." },
  },
  d01_02_door: {
    both: { understood: "You confirmed the green door and the first floor.", natural: "Ho capito: la porta verde, poi il primo piano." },
    doorOnly: { understood: "You confirmed the green door; the first floor is still missing.", natural: "Ho capito: la porta ___, poi il ___ piano.", tryNext: "Repeat the floor without filling in the whole response." },
    floorOnly: { understood: "You confirmed the first floor; the green door is still missing.", natural: "Ho capito: la porta ___, poi il ___ piano.", tryNext: "Repeat the door color without filling in the whole response." },
    clear: { understood: "You said the directions were clear; you did not repeat the door or floor facts.", natural: "Ho capito, grazie." },
    failed: { understood: "Nothing actionable was recognized yet; neither the door nor floor was confirmed.", natural: "Ho capito: la porta ___, poi il ___ piano.", tryNext: "Repeat one Italian fact you heard." },
    fallback: { understood: "Nothing actionable was recognized yet; neither the door nor floor was confirmed.", natural: "Ho capito: la porta ___, poi il ___ piano.", tryNext: "Use the help ladder for one Italian cue." },
    exit: { understood: "You ended the handoff with the key held; the entrance directions remain unconfirmed.", natural: "Grazie, devo andare." },
  },
} as const;

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
    d01_01_arrival: authoredTurn("d01_01_arrival", "Raffaele", "Buonasera. Lei è Michael? È qui per la chiave?", "Confirm briefly so you can get the entrance directions.", false, {
      listenFor: ["Lei è Michael", "per la chiave"],
      meaning: "Raffaele asks whether you are Michael and whether you are here for the key.",
      frame: "Sì, sono ___. Sono qui per ___.",
      model: "Sì, sono Michael. Sono qui per la chiave.",
    }, day01Teaching.d01_01_arrival),
    d01_02_door: authoredTurn("d01_02_door", "Raffaele", "Ecco la chiave. La porta verde, poi il primo piano. È chiaro?", "Confirm the green door and first floor.", false, {
      listenFor: ["porta verde", "primo piano"],
      meaning: "Raffaele gives you the key and says to use the green door, then go to the first floor.",
      frame: "Ho capito: la porta ___, poi il ___ piano.",
      model: "Ho capito: la porta verde, poi il primo piano.",
    }, day01Teaching.d01_02_door),
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
      if (exit) return runtime.resolveOutcome(state, "D01-O2", { teachingFeedback: day01Teaching.d01_01_arrival.exit }, null, createId);
      const identified = any(normalized, ["michael", "fuscoletti"]);
      const italianIdentity = identified && any(normalized, ["sono", "mi chiamo"]);
      const requestedKey = any(normalized, ["per la chiave", "vorrei la chiave", "mi serve la chiave", "ritirare la chiave"]);
      if (identified && requestedKey) {
        return runtime.moveToTurn(state, "d01_02_door", { apartmentKey: true, keyCustody: { ...state.keyCustody, apartment: "held" }, teachingFeedback: any(normalized, ["michael"]) ? day01Teaching.d01_01_arrival.success : day01Teaching.d01_01_arrival.successSurname }, "Raffaele matched your name and handed over the key.", createId);
      }
      const teachingFeedback = italianIdentity ? day01Teaching.d01_01_arrival.identifyOnly
        : requestedKey ? day01Teaching.d01_01_arrival.requestOnly
          : day01Teaching.d01_01_arrival.failed;
      return runtime.moveToTurn(state, "d01_01_arrival", { teachingFeedback }, "Confirm your name and that you are here for the key in Italian.", createId);
    }
    if (state.turnId === "d01_02_door") {
      if (exit) {
        return runtime.resolveOutcome(state, "D01-O3", {
          apartmentKey: true,
          keyCustody: { ...state.keyCustody, apartment: "held" },
          teachingFeedback: day01Teaching.d01_02_door.exit,
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
          teachingFeedback: doorConfirmed && floorConfirmed ? day01Teaching.d01_02_door.both : day01Teaching.d01_02_door.clear,
        }, createId);
      }
      const teachingFeedback = doorConfirmed ? day01Teaching.d01_02_door.doorOnly
        : floorConfirmed ? day01Teaching.d01_02_door.floorOnly
          : day01Teaching.d01_02_door.failed;
      return runtime.moveToTurn(state, "d01_02_door", { teachingFeedback }, "Confirm both the green door and the first floor in Italian, or ask Raffaele to repeat.", createId);
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
