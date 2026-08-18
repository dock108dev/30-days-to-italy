import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, addItem, completedBefore } from "./shared";

const metadata = seasonEpisode("day-19");

export const day19Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "ferry-cancellation",
  scene: { id: "ferry-cancellation", episodeId: "day-19", day: "Day 19", dateLabel: "12 days out", title: metadata.title, location: metadata.location, time: "09:05", npc: "Luca", role: "Marina clerk", objective: "Resolve the cancellation using only tickets and refunds you actually own.", firstTurn: "d19_01_ticket", kicker: "A €10 refund exists only when the saved world contains the €10 ferry ticket.", suggestions: ["Vorrei un rimborso.", "Prendo l'autobus sostitutivo.", "Quanto costa l'autobus?"] },
  turns: {
    d19_01_ticket: authoredTurn("d19_01_ticket", "Luca", "Il traghetto delle nove e trenta è cancellato. Con il suo biglietto può avere dieci euro di rimborso, riprenotare o prendere l'autobus.", "Choose refund, rebooking, replacement bus, or cancel the outing."),
    d19_01_no_ticket: authoredTurn("d19_01_no_ticket", "Luca", "Il traghetto delle nove e trenta è cancellato. Non risulta un suo biglietto, ma può comprare l'autobus o prenotare un traghetto più tardi.", "No refund is available; choose only a valid current option."),
    d19_02_bus: authoredTurn("d19_02_bus", "Luca", "Rimborso di dieci euro e autobus sostitutivo da due euro e quaranta. Conferma?", "Confirm the net +€7.60 change."),
    d19_03_close: authoredTurn("d19_03_close", "Luca", "Confermato. Il traghetto è rimborsato e il biglietto dell'autobus è valido.", "The replacement plan is complete.", true),
    d19_04_refund: authoredTurn("d19_04_refund", "Luca", "Rimborso di dieci euro effettuato. Nessun nuovo biglietto.", "The outing is cancelled after the refund.", true),
    d19_05_rebook: authoredTurn("d19_05_rebook", "Luca", "Riprenotato sul traghetto delle quindici e trenta, senza costo aggiuntivo.", "The ferry is rebooked.", true),
    d19_06_no_ticket_bus: authoredTurn("d19_06_no_ticket_bus", "Luca", "Un biglietto dell'autobus costa due euro e quaranta.", "A bus ticket is purchased without any refund.", true),
    d19_07_exit: authoredTurn("d19_07_exit", "Luca", "Va bene. Nessun rimborso o nuovo biglietto.", "The outing remains cancelled.", true),
    d19_08_funds: authoredTurn("d19_08_funds", "Luca", "Non basta per il biglietto scelto. Non addebito niente.", "No purchase and no negative balance.", true),
    d19_09_new_ferry: authoredTurn("d19_09_new_ferry", "Luca", "Un nuovo biglietto per il traghetto delle quindici e trenta. Sono dieci euro.", "A new ferry ticket—not a rebooking—is purchased.", true),
  },
  outcomes: {
    "D19-O1": { id: "D19-O1", title: "Refund and replacement bus", detail: "The owned ferry ticket was refunded and replaced with a bus ticket.", consequence: "+€7.60 net · replacement bus", tone: "success" },
    "D19-O2": { id: "D19-O2", title: "Ferry refunded", detail: "The owned ticket was refunded and the outing was cancelled.", consequence: "+€10.00 · no new ticket", tone: "success" },
    "D19-O3": { id: "D19-O3", title: "Ferry rebooked", detail: "The owned ticket moved to the 15:30 ferry.", consequence: "No charge · ferry 15:30", tone: "success" },
    "D19-O4": { id: "D19-O4", title: "Bus purchased", detail: "No ferry ticket existed, so only the bus fare changed the balance.", consequence: "−€2.40 · no unearned refund", tone: "success" },
    "D19-O5": { id: "D19-O5", title: "Outing cancelled", detail: "You left without a refund you did not own or a new ticket.", consequence: "No charge", tone: "open" },
    "D19-O6": { id: "D19-O6", title: "Fare not purchased", detail: "The selected fare exceeded the available balance.", consequence: "No charge · no ticket · no negative balance", tone: "partial" },
    "D19-O7": { id: "D19-O7", title: "New ferry ticket purchased", detail: "No qualifying ferry ticket existed, so you bought a new ticket for the 15:30 ferry.", consequence: "−€10.00 · new ferry ticket for 15:30", tone: "success" },
  },
  terminalOutcomeTurns: { "D19-O1": ["d19_03_close"], "D19-O2": ["d19_04_refund"], "D19-O3": ["d19_05_rebook"], "D19-O4": ["d19_06_no_ticket_bus"], "D19-O5": ["d19_07_exit"], "D19-O6": ["d19_08_funds"], "D19-O7": ["d19_09_new_ferry"] },
  initialTurn: (state) => state.transportMode === "ferry" && state.transportStatus === "booked" && state.transportTicketPrice === 1000 ? "d19_01_ticket" : "d19_01_no_ticket",
  defaultPhrase: "alternative",
  phraseExamples: {
    would_like: { italian: "Vorrei un rimborso.", english: "I would like a refund." },
    alternative: { italian: "C'è un autobus sostitutivo?", english: "Is there a replacement bus?" },
  },
  evaluateResponse({ state, normalized, createId, runtime }) {
    const ownsFerry = state.transportMode === "ferry" && state.transportStatus === "booked" && state.transportTicketPrice === 1000;
    if (state.turnId === "d19_01_ticket") {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d19_07_exit", "D19-O5", { transportStatus: "cancelled", ferryMemory: "Ferry cancelled; no recovery selected" }, createId);
      const refund = any(normalized, ["rimborso", "refund"]);
      const bus = any(normalized, ["autobus", "bus", "sostitutivo", "replacement"]);
      if (refund && bus) return runtime.moveToTurn(state, "d19_02_bus", {}, undefined, createId);
      if (refund) return runtime.queueTerminal(state, "d19_04_refund", "D19-O2", { money: state.money + 1000, transportMode: "none", transportStatus: "refunded", transportTicketPrice: 0, ferryMemory: "Ferry cancelled; ticket refunded; outing cancelled", knownFacts: addFact(state.knownFacts, "09:30 ferry cancelled and €10 ticket refunded") }, createId);
      if (any(normalized, ["riprenot", "rebook", "quindici", "15 30"])) return runtime.queueTerminal(state, "d19_05_rebook", "D19-O3", { transportMode: "ferry", transportStatus: "rebooked", transportTicketPrice: 1000, ferryMemory: "Ferry cancelled; rebooked for 15:30" }, createId);
      return runtime.moveToTurn(state, "d19_01_ticket", {}, "Choose refund, rebooking, replacement bus, or exit.", createId);
    }
    if (state.turnId === "d19_02_bus" && ownsFerry) {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d19_07_exit", "D19-O5", { transportStatus: "cancelled", ferryMemory: "Ferry cancelled; no recovery selected" }, createId);
      if (any(normalized, ["confermo", "confirm", "va bene", "si", "autobus", "bus"])) return runtime.queueTerminal(state, "d19_03_close", "D19-O1", { money: state.money + 760, transportMode: "bus", transportStatus: "replacement-bus", transportTicketPrice: 240, busTicket: true, ferryMemory: "Ferry cancelled; €10 refunded; replacement bus taken", inventory: addItem(state.inventory.filter((item) => !item.toLowerCase().includes("ferry")), "Replacement bus ticket"), knownFacts: addFact(state.knownFacts, "09:30 ferry cancelled; €10 refunded; €2.40 replacement bus purchased"), currentLocation: metadata.location, currentTime: "09:10" }, createId);
    }
    if (state.turnId === "d19_01_no_ticket") {
      if (any(normalized, ["rimborso", "refund"])) return runtime.moveToTurn(state, "d19_01_no_ticket", {}, "There is no owned ferry ticket to refund.", createId);
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d19_07_exit", "D19-O5", { transportStatus: state.transportStatus === "none" ? "none" : "cancelled", ferryMemory: "Ferry cancelled; no ferry ticket owned; outing cancelled" }, createId);
      if (any(normalized, ["autobus", "bus"])) {
        if (state.money < 240) return runtime.queueTerminal(state, "d19_08_funds", "D19-O6", {}, createId);
        return runtime.queueTerminal(state, "d19_06_no_ticket_bus", "D19-O4", { money: state.money - 240, transportMode: "bus", transportStatus: "replacement-bus", transportTicketPrice: 240, busTicket: true, ferryMemory: "Ferry cancelled; no ferry ticket owned; bus purchased", inventory: addItem(state.inventory, "Bus ticket"), currentLocation: metadata.location, currentTime: "09:10" }, createId);
      }
      if (any(normalized, ["riprenot", "rebook", "traghetto", "ferry"])) {
        if (state.money < 1000) return runtime.queueTerminal(state, "d19_08_funds", "D19-O6", {}, createId);
        return runtime.queueTerminal(state, "d19_09_new_ferry", "D19-O7", { money: state.money - 1000, transportMode: "ferry", transportStatus: "booked", transportTicketPrice: 1000, ferryMemory: "Ferry cancellation encountered; new 15:30 ferry ticket purchased", inventory: addItem(state.inventory, "Ferry ticket · 15:30"), knownFacts: addFact(state.knownFacts, "New 15:30 ferry ticket purchased for €10 after the cancellation") }, createId);
      }
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    if (before.turnId.startsWith("d19_01") && after.turnId === "d19_02_bus") moves.push("recovery", "request");
    if (["d19_03_close", "d19_04_refund", "d19_05_rebook", "d19_06_no_ticket_bus", "d19_09_new_ferry"].includes(after.turnId)) moves.push("preference", "confirm", "recovery");
    if (after.turnId === "d19_07_exit") moves.push("decline", "boundary");
    return observation(moves, after.turnId === "d19_03_close" ? { refundConfirmed: true, alternativeSelected: true, priceConfirmed: true } : undefined);
  },
  adminSeed: () => ({ money: 360, laundryStatus: "clean", transportMode: "ferry", transportStatus: "booked", transportTicketPrice: 1000, hotWaterStatus: "reported", repairCommitment: { window: "Today at 18:00", status: "active" }, parcelStatus: "collected", hotelKey: true, apartmentKey: true, rental: "chair", pharmacyItem: "Soothing bite gel", routeFact: "Piazza Alta, opposite Farmacia Luce, five minutes away", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "Soothing bite gel", "Groceries · corrected €4 receipt", "Collected parcel"], cafeOutcome: "Both errors corrected", relationships: { Giulia: "efficient", Rosa: "efficient", Raffaele: "strained", Enzo: "efficient" }, knownFacts: ["Farmacia Luce: original bite cream unavailable; €6 gel selected"], commitments: ["Hot-water repair: Today at 18:00"], completed: completedBefore(19), currentLocation: metadata.location, currentTime: "09:05" }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
