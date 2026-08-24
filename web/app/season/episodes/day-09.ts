import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, completedBefore } from "./shared";

const metadata = seasonEpisode("day-09");

export const day09Episode: EpisodeDefinition = {
  ...metadata, sceneId: "marina",
  scene: { id: "marina", episodeId: "day-09", day: "Day 9", dateLabel: "22 days out", title: metadata.title, location: metadata.location, time: "08:45", npc: "Luca", role: "Marina clerk", objective: "Compare bus and ferry by time and price, then choose only one.", firstTurn: "d09_01_compare", kicker: "Two times, two prices, and one weather caveat arrive together.", suggestions: ["Quanto tempo ci vuole?", "Quanto costa il traghetto?", "Prendo il traghetto delle nove e trenta."] },
  turns: {
    d09_01_compare: authoredTurn("d09_01_compare", "Luca", "Per Amalfi c'è l'autobus alle nove e dieci o il traghetto alle nove e trenta.", "Ask about duration, price, or one option."),
    d09_02_options: authoredTurn("d09_02_options", "Luca", "L'autobus costa due euro e quaranta e dura cinquantacinque minuti. Il traghetto costa dieci euro e dura trentacinque minuti, ma oggi il mare è mosso.", "Choose bus, ferry, or defer."),
    d09_03_ferry: authoredTurn("d09_03_ferry", "Luca", "Un biglietto per il traghetto delle nove e trenta. Sono dieci euro.", "The ferry is booked.", true),
    d09_04_bus: authoredTurn("d09_04_bus", "Luca", "Un biglietto per l'autobus delle nove e dieci. Sono due euro e quaranta.", "The bus is booked.", true),
    d09_05_exit: authoredTurn("d09_05_exit", "Luca", "Va bene. Può decidere più tardi.", "Nothing was booked.", true),
    d09_06_funds: authoredTurn("d09_06_funds", "Luca", "Non basta per questa opzione. Non emetto nessun biglietto.", "No ticket and no negative balance.", true),
  },
  outcomes: {
    "D09-O1": { id: "D09-O1", title: "Ferry selected", detail: "You chose the faster ferry after comparing both options.", consequence: "−€10.00 · ferry 09:30 · 35 minutes", tone: "success" },
    "D09-O2": { id: "D09-O2", title: "Bus selected", detail: "You chose the lower-cost bus.", consequence: "−€2.40 · bus 09:10 · 55 minutes", tone: "success" },
    "D09-O3": { id: "D09-O3", title: "Decision deferred", detail: "You left without buying either ticket.", consequence: "No charge · no reservation", tone: "open" },
    "D09-O4": { id: "D09-O4", title: "Option unavailable to buy", detail: "No ticket was issued because the selected fare exceeded the available balance.", consequence: "No charge · no negative balance", tone: "partial" },
  },
  terminalOutcomeTurns: { "D09-O1": ["d09_03_ferry"], "D09-O2": ["d09_04_bus"], "D09-O3": ["d09_05_exit"], "D09-O4": ["d09_06_funds"] },
  defaultPhrase: "duration",
  phraseExamples: {
    duration: { italian: "Quanto tempo ci vuole per Amalfi?", english: "How long does it take to Amalfi?" },
    cost: { italian: "Quanto costa il traghetto?", english: "How much is the ferry?" },
    alternative: { italian: "C'è un'alternativa al traghetto?", english: "Is there an alternative to the ferry?" },
  },
  evaluateResponse({ state, normalized, createId, runtime }) {
    const exit = any(normalized, EXIT) || any(normalized, ["decide later", "non decido", "piu tardi"]);
    if (exit) return runtime.queueTerminal(state, "d09_05_exit", "D09-O3", { transportMode: "none", transportStatus: "none", transportTicketPrice: 0 }, createId);
    if (state.turnId === "d09_01_compare") {
      if (any(normalized, ["quanto tempo", "quanto dura", "durata", "how long", "costa", "cost", "autobus", "bus", "traghetto", "ferry"])) return runtime.moveToTurn(state, "d09_02_options", {}, undefined, createId);
      return runtime.moveToTurn(state, "d09_01_compare", {}, "Ask about one option or how long it takes.", createId);
    }
    if (state.turnId === "d09_02_options") {
      const asksPrice = any(normalized, ["quanto", "costa", "prezzo", "how much"])
        && !any(normalized, ["prendo", "biglietto", "ticket", "book"]);
      if (asksPrice) {
        return runtime.moveToTurn(
          state,
          state.turnId,
          {},
          "The ferry is €10 and the bus is €2.40. Nothing has been booked.",
          createId,
        );
      }
      const ferry = any(normalized, ["traghetto", "ferry", "nove e trenta", "9 30"]);
      const bus = any(normalized, ["autobus", "bus", "nove e dieci", "9 10"]);
      if (ferry && !bus) {
        if (state.money < 1000) return runtime.queueTerminal(state, "d09_06_funds", "D09-O4", {}, createId);
        return runtime.queueTerminal(state, "d09_03_ferry", "D09-O1", { money: state.money - 1000, transportMode: "ferry", transportStatus: "booked", transportTicketPrice: 1000, busTicket: false, currentLocation: metadata.location, currentTime: "09:30", knownFacts: addFact(state.knownFacts, "Ferry to Amalfi: 09:30, €10.00, 35 minutes, rough sea caveat") }, createId);
      }
      if (bus && !ferry) {
        if (state.money < 240) return runtime.queueTerminal(state, "d09_06_funds", "D09-O4", {}, createId);
        return runtime.queueTerminal(state, "d09_04_bus", "D09-O2", { money: state.money - 240, transportMode: "bus", transportStatus: "booked", transportTicketPrice: 240, busTicket: true, currentLocation: metadata.location, currentTime: "09:10", knownFacts: addFact(state.knownFacts, "Bus to Amalfi: 09:10, €2.40, 55 minutes") }, createId);
      }
      return runtime.moveToTurn(state, "d09_02_options", {}, "Choose one option. Nothing has been charged.", createId);
    }
    return state;
  },
  observeResponse({ before, after, normalized }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    if (before.turnId === "d09_01_compare" && after.turnId === "d09_02_options") moves.push("request", "price");
    if (["d09_03_ferry", "d09_04_bus"].includes(after.turnId)) moves.push("preference", "confirm", "pay");
    if (after.turnId === "d09_05_exit") moves.push("decline", "boundary");
    return observation(moves, ["d09_03_ferry", "d09_04_bus"].includes(after.turnId) ? { destinationEstablished: true, preferenceSelected: any(normalized, ["traghetto", "ferry"]) ? "ferry" : "bus", priceConfirmed: true } : undefined);
  },
  adminSeed: () => ({ money: 4610, laundryStatus: "clean", hotelKey: true, apartmentKey: true, rental: "custom", pharmacyItem: "Mosquito-bite cream", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "Mosquito-bite cream"], relationships: { Giulia: "neutral" }, knownFacts: ["Laundry: machine 4, coin slot 2, green start button, 35 minutes"], completed: completedBefore(9), currentLocation: metadata.location, currentTime: "08:45" }),
  buildResult: buildObservedEpisodeResult,
};
