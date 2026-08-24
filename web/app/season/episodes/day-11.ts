import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, completedBefore } from "./shared";

const metadata = seasonEpisode("day-11");
const repairWindow = "Tuesday 09:00–11:00";

export const day11Episode: EpisodeDefinition = {
  ...metadata, sceneId: "repair",
  scene: { id: "repair", episodeId: "day-11", day: "Day 11", dateLabel: "20 days out", title: metadata.title, location: metadata.location, time: "18:20", npc: "Raffaele", role: "Apartment caretaker", objective: "Report only the hot-water problem and leave with an exact repair window.", firstTurn: "d11_01_report", kicker: "The consequential detail is Tuesday morning, not an inferred cause.", suggestions: ["Non c'è acqua calda.", "Da stamattina.", "Martedì dalle nove alle undici va bene."] },
  turns: {
    d11_01_report: authoredTurn("d11_01_report", "Raffaele", "Buonasera. Che problema c'è nell'appartamento?", "Report the hot-water problem or postpone."),
    d11_02_when: authoredTurn("d11_02_when", "Raffaele", "Da quando non c'è acqua calda?", "Say when it began without guessing the cause."),
    d11_03_window: authoredTurn("d11_03_window", "Raffaele", "Posso mandare il tecnico martedì, dalle nove alle undici. Va bene?", "Confirm the window or ask to defer."),
    d11_04_close: authoredTurn("d11_04_close", "Raffaele", "D'accordo: martedì dalle nove alle undici.", "The appointment is recorded.", true),
    d11_05_open: authoredTurn("d11_05_open", "Raffaele", "Va bene. Il problema è registrato, ma non fissiamo ancora l'appuntamento.", "The problem remains open without an appointment.", true),
  },
  outcomes: {
    "D11-O1": { id: "D11-O1", title: "Repair window confirmed", detail: "Raffaele recorded the hot-water report and exact appointment.", consequence: "No charge · Tuesday 09:00–11:00 commitment", tone: "success" },
    "D11-O2": { id: "D11-O2", title: "Problem recorded", detail: "The hot-water problem is known, but no repair time is reserved.", consequence: "No charge · commitment deferred", tone: "partial" },
    "D11-O3": { id: "D11-O3", title: "Report postponed", detail: "You ended before making a report.", consequence: "No state change", tone: "open" },
  },
  terminalOutcomeTurns: { "D11-O1": ["d11_04_close"], "D11-O2": ["d11_05_open"], "D11-O3": ["d11_05_open"] },
  defaultPhrase: "problem",
  phraseExamples: {
    problem: { italian: "Non c'è acqua calda.", english: "There is no hot water." },
    past_commitment: { italian: "Aveva detto martedì mattina.", english: "You said Tuesday morning." },
  },
  evaluateResponse({ state, normalized, createId, runtime }) {
    const exit = any(normalized, EXIT) || any(normalized, ["postpone", "non ora"]);
    if (state.turnId === "d11_01_report") {
      if (exit) return runtime.queueTerminal(state, "d11_05_open", "D11-O3", {}, createId);
      if (any(normalized, ["acqua calda", "hot water", "non c e", "problema"])) return runtime.moveToTurn(state, "d11_02_when", { hotWaterStatus: "reported", knownFacts: addFact(state.knownFacts, "Casa Limone hot water reported unavailable") }, undefined, createId);
      return runtime.moveToTurn(state, "d11_01_report", {}, "Raffaele needs only the practical problem.", createId);
    }
    if (state.turnId === "d11_02_when") {
      if (exit) return runtime.queueTerminal(state, "d11_05_open", "D11-O2", { hotWaterStatus: "reported", repairCommitment: { window: repairWindow, status: "deferred" } }, createId);
      if (any(normalized, ["stamattina", "this morning", "oggi", "today"])) return runtime.moveToTurn(state, "d11_03_window", {}, undefined, createId);
      return runtime.moveToTurn(state, "d11_02_when", {}, "The report needs only when the problem began.", createId);
    }
    if (state.turnId === "d11_03_window") {
      if (exit) return runtime.queueTerminal(state, "d11_05_open", "D11-O2", { repairCommitment: { window: repairWindow, status: "deferred" } }, createId);
      if (any(normalized, ["martedi", "tuesday", "nove", "nine", "va bene", "okay", "si"])) return runtime.queueTerminal(state, "d11_04_close", "D11-O1", { hotWaterStatus: "reported", repairCommitment: { window: repairWindow, status: "active" }, commitments: addFact(state.commitments, `Hot-water repair: ${repairWindow}`), relationships: { ...state.relationships, Raffaele: "efficient" }, currentLocation: metadata.location, currentTime: "18:25" }, createId);
      return runtime.moveToTurn(state, "d11_03_window", {}, "Confirm Tuesday 09:00–11:00 or defer it.", createId);
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    if (before.turnId === "d11_01_report" && after.turnId === "d11_02_when") moves.push("problem");
    if (after.turnId === "d11_04_close") moves.push("confirm", "request");
    if (after.turnId === "d11_05_open") moves.push("boundary");
    return observation(moves, after.turnId === "d11_04_close" ? { problemReported: true, commitmentConfirmed: true } : undefined);
  },
  adminSeed: () => ({ money: 2410, laundryStatus: "clean", transportMode: "ferry", transportStatus: "booked", transportTicketPrice: 1000, hotelKey: true, apartmentKey: true, rental: "custom", pharmacyItem: "Mosquito-bite cream", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "Mosquito-bite cream"], relationships: { Giulia: "neutral", Rosa: "efficient" }, knownFacts: ["Rosa corrected the side dish before serving the €12 meal"], completed: completedBefore(11), currentLocation: metadata.location, currentTime: "18:20" }),
  buildResult: buildObservedEpisodeResult,
};
