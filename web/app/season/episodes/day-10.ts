import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, completedBefore } from "./shared";

const metadata = seasonEpisode("day-10");

export const day10Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "trattoria",
  scene: { id: "trattoria", episodeId: "day-10", day: "Day 10", dateLabel: "21 days out", title: metadata.title, location: metadata.location, time: "13:10", npc: "Rosa", role: "Server", objective: "Order a €12 meal and repair the wrong side dish without accepting it by accident.", firstTurn: "d10_01_order", kicker: "The read-back is quick; the side dish is the detail that matters.", suggestions: ["Vorrei la pasta con l'insalata.", "Non le patate. L'insalata, per favore.", "Sì, adesso va bene."] },
  turns: {
    d10_01_order: authoredTurn("d10_01_order", "Rosa", "Buongiorno. Cosa prende?", "Order the pasta with salad or leave."),
    d10_02_mismatch: authoredTurn("d10_02_mismatch", "Rosa", "Una pasta al pomodoro con le patate. Sono dodici euro.", "Correct the side dish, knowingly accept it, or cancel."),
    d10_03_close: authoredTurn("d10_03_close", "Rosa", "Certo: insalata, non patate. Sono dodici euro.", "The corrected meal is ready.", true),
    d10_04_accept: authoredTurn("d10_04_accept", "Rosa", "Va bene, lascio le patate. Sono dodici euro.", "You accepted the changed side knowingly.", true),
    d10_05_exit: authoredTurn("d10_05_exit", "Rosa", "Nessun problema. Cancello l'ordine.", "The order is cancelled without charge.", true),
    d10_06_funds: authoredTurn("d10_06_funds", "Rosa", "Non basta per l'ordine. Lo cancello senza addebito.", "No meal and no negative balance.", true),
  },
  outcomes: {
    "D10-O1": { id: "D10-O1", title: "Order corrected", detail: "Rosa replaced the wrong side before serving the meal.", consequence: "−€12.00 · pasta and salad received", tone: "success" },
    "D10-O2": { id: "D10-O2", title: "Change accepted", detail: "You knowingly kept the potatoes.", consequence: "−€12.00 · changed meal received", tone: "partial" },
    "D10-O3": { id: "D10-O3", title: "Order cancelled", detail: "You left before the meal was charged.", consequence: "No charge", tone: "open" },
    "D10-O4": { id: "D10-O4", title: "Purchase stopped", detail: "The order was cancelled because the balance was insufficient.", consequence: "No charge · no negative balance", tone: "partial" },
  },
  terminalOutcomeTurns: { "D10-O1": ["d10_03_close"], "D10-O2": ["d10_04_accept"], "D10-O3": ["d10_05_exit"], "D10-O4": ["d10_06_funds"] },
  defaultPhrase: "would_like",
  phraseExamples: {
    would_like: { italian: "Vorrei la pasta con l'insalata.", english: "I would like the pasta with salad." },
    problem: { italian: "Non è quello che ho ordinato.", english: "That isn’t what I ordered." },
  },
  evaluateResponse({ state, normalized, createId, runtime }) {
    const exit = any(normalized, EXIT) || any(normalized, ["cancel", "cancella"]);
    if (exit) return runtime.queueTerminal(state, "d10_05_exit", "D10-O3", {}, createId);
    if (state.turnId === "d10_01_order" && any(normalized, ["pasta", "pomodoro", "insalata", "salad"])) return runtime.moveToTurn(state, "d10_02_mismatch", {}, undefined, createId);
    if (state.turnId === "d10_02_mismatch") {
      if (state.money < 1200) return runtime.queueTerminal(state, "d10_06_funds", "D10-O4", {}, createId);
      if (any(normalized, ["non patate", "not potatoes", "insalata", "salad", "sbagli", "wrong"])) return runtime.queueTerminal(state, "d10_03_close", "D10-O1", { money: state.money - 1200, currentLocation: metadata.location, currentTime: "13:45", relationships: { ...state.relationships, Rosa: "efficient" }, knownFacts: addFact(state.knownFacts, "Rosa corrected the side dish before serving the €12 meal") }, createId);
      if (any(normalized, ["va bene", "okay", "accetto", "keep"])) return runtime.queueTerminal(state, "d10_04_accept", "D10-O2", { money: state.money - 1200, currentLocation: metadata.location, currentTime: "13:45" }, createId);
      return runtime.moveToTurn(state, "d10_02_mismatch", {}, "The side is still unresolved. Nothing has been charged.", createId);
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    if (before.turnId === "d10_01_order" && after.turnId === "d10_02_mismatch") moves.push("request");
    if (after.turnId === "d10_03_close") moves.push("problem", "recovery", "confirm", "pay");
    if (after.turnId === "d10_04_accept") moves.push("preference", "confirm", "pay");
    if (after.turnId === "d10_05_exit") moves.push("decline", "boundary");
    return observation(moves, after.turnId === "d10_03_close" ? { correctionAccepted: true, priceConfirmed: true } : undefined);
  },
  adminSeed: () => ({ money: 3610, laundryStatus: "clean", transportMode: "ferry", transportStatus: "booked", transportTicketPrice: 1000, hotelKey: true, apartmentKey: true, rental: "custom", pharmacyItem: "Mosquito-bite cream", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "Mosquito-bite cream"], relationships: { Giulia: "neutral" }, knownFacts: ["Ferry to Amalfi: 09:30, €10.00, 35 minutes, rough sea caveat"], completed: completedBefore(10), currentLocation: metadata.location, currentTime: "13:10" }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
