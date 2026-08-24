import { EXIT, PAY, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, addItem, completedBefore } from "./shared";

const metadata = seasonEpisode("day-15");

export const day15Episode: EpisodeDefinition = {
  ...metadata, sceneId: "grocery-correction",
  scene: { id: "grocery-correction", episodeId: "day-15", day: "Day 15", dateLabel: "16 days out", title: metadata.title, location: metadata.location, time: "17:35", npc: "Enzo", role: "Grocer", objective: "Notice an extra bag, correct €7.20 to €4.00, and pay only the accepted total.", firstTurn: "d15_01_total", kicker: "The extra receipt line is a bag you did not request.", suggestions: ["Scusi, non ho chiesto la borsa.", "Il totale corretto è quattro euro?", "Pago quattro euro con la carta."] },
  turns: {
    d15_01_total: authoredTurn("d15_01_total", "Enzo", "Sono sette euro e venti, compresa la seconda borsa.", "Challenge the extra bag, accept it knowingly, or leave."),
    d15_02_corrected: authoredTurn("d15_02_corrected", "Enzo", "Ha ragione. Senza la borsa extra sono quattro euro.", "Confirm and pay the corrected total."),
    d15_03_close: authoredTurn("d15_03_close", "Enzo", "Quattro euro. Ecco lo scontrino corretto.", "The corrected purchase is complete.", true),
    d15_04_accept: authoredTurn("d15_04_accept", "Enzo", "Va bene. Sette euro e venti con le due borse.", "You accepted the extra charge knowingly.", true),
    d15_05_exit: authoredTurn("d15_05_exit", "Enzo", "Nessun problema. Annulliamo tutto.", "The purchase is cancelled.", true),
    d15_06_funds: authoredTurn("d15_06_funds", "Enzo", "Non basta. Non addebito niente.", "No purchase and no negative balance.", true),
  },
  outcomes: {
    "D15-O1": { id: "D15-O1", title: "Total corrected", detail: "Enzo removed the extra bag before payment.", consequence: "−€4.00 · corrected receipt", tone: "success" },
    "D15-O2": { id: "D15-O2", title: "Extra charge accepted", detail: "You knowingly kept both bags.", consequence: "−€7.20", tone: "partial" },
    "D15-O3": { id: "D15-O3", title: "Purchase cancelled", detail: "You left before paying.", consequence: "No charge", tone: "open" },
    "D15-O4": { id: "D15-O4", title: "Purchase stopped", detail: "No charge was made because the selected total exceeded the balance.", consequence: "No charge · no negative balance", tone: "partial" },
  },
  terminalOutcomeTurns: { "D15-O1": ["d15_03_close"], "D15-O2": ["d15_04_accept"], "D15-O3": ["d15_05_exit"], "D15-O4": ["d15_06_funds"] },
  defaultPhrase: "problem",
  phraseExamples: {
    problem: { italian: "Scusi, non ho chiesto la seconda borsa.", english: "Excuse me, I didn’t ask for the second bag." },
    confirm: { italian: "Il totale corretto è quattro euro?", english: "Is the corrected total four euros?" },
  },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (any(normalized, EXIT) || any(normalized, ["annulla", "cancel"])) return runtime.queueTerminal(state, "d15_05_exit", "D15-O3", {}, createId);
    if (state.turnId === "d15_01_total") {
      if (any(normalized, ["non ho chiesto", "didn t ask", "borsa extra", "extra bag", "sbagli", "wrong"])) return runtime.moveToTurn(state, "d15_02_corrected", {}, undefined, createId);
      if (any(normalized, ["va bene", "okay", "accetto"])) {
        if (state.money < 720) return runtime.queueTerminal(state, "d15_06_funds", "D15-O4", {}, createId);
        return runtime.queueTerminal(state, "d15_04_accept", "D15-O2", { money: state.money - 720, inventory: addItem(state.inventory, "Two grocery bags") }, createId);
      }
      return runtime.moveToTurn(state, "d15_01_total", {}, "The €7.20 total still includes a second bag.", createId);
    }
    if (state.turnId === "d15_02_corrected" && (any(normalized, PAY) || any(normalized, ["quattro", "four", "corretto", "correct"]))) {
      if (state.money < 400) return runtime.queueTerminal(state, "d15_06_funds", "D15-O4", {}, createId);
      return runtime.queueTerminal(state, "d15_03_close", "D15-O1", { money: state.money - 400, inventory: addItem(state.inventory, "Groceries · corrected €4 receipt"), relationships: { ...state.relationships, Enzo: "efficient" }, knownFacts: addFact(state.knownFacts, "Enzo corrected the grocery total from €7.20 to €4.00"), currentLocation: metadata.location, currentTime: "17:40" }, createId);
    }
    return state;
  },
  observeResponse({ before, after, normalized }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    if (before.turnId === "d15_01_total" && after.turnId === "d15_02_corrected") moves.push("problem", "recovery");
    if (after.turnId === "d15_03_close") moves.push("price", "confirm", "pay");
    if (after.turnId === "d15_04_accept") moves.push("preference", "pay");
    if (after.turnId === "d15_05_exit") moves.push("decline", "boundary");
    return observation(moves, after.turnId === "d15_03_close" ? { correctionAccepted: true, priceConfirmed: any(normalized, ["quattro", "four", "corretto", "correct"]) } : undefined);
  },
  adminSeed: () => ({ money: 1360, laundryStatus: "clean", transportMode: "ferry", transportStatus: "booked", transportTicketPrice: 1000, hotWaterStatus: "reported", repairCommitment: { window: "Tuesday 09:00–11:00", status: "active" }, hotelKey: true, apartmentKey: true, rental: "chair", pharmacyItem: "Mosquito-bite cream", routeFact: "Piazza Alta, opposite Farmacia Luce, five minutes away", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "Mosquito-bite cream"], cafeOutcome: "Both errors corrected", relationships: { Giulia: "efficient", Rosa: "efficient", Raffaele: "efficient" }, knownFacts: ["Temporary bus stop: Piazza Alta, opposite Farmacia Luce, five minutes away"], commitments: ["Hot-water repair: Tuesday 09:00–11:00"], completed: completedBefore(15), currentLocation: metadata.location, currentTime: "17:35" }),
  buildResult: buildObservedEpisodeResult,
};
