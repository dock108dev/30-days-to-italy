import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";
import { addFact, addItem, finalArcAdminSeed } from "./shared";

const metadata = seasonEpisode("day-28");
const planId = "day-28-vietri-stand-3";
const fareEvent = "day28-vietri-fare-paid";

export const day28Episode: EpisodeDefinition = {
  ...metadata, sceneId: "day-trip",
  scene: { id: "day-trip", episodeId: "day-28", day: "Day 28", dateLabel: "A two-leg route", title: metadata.title, location: metadata.location, time: "08:10", npc: "Luca", role: "Transport agent", objective: "Confirm the 08:40 bus, change at Vietri, and take the 09:35 connection from stand 3—not stand 2.", firstTurn: "d28_01_route", kicker: "This is a new €2.40 fare; no Day 19 ticket can silently pay for it.", suggestions: ["Dove devo cambiare?", "A Vietri, poi alle nove e trentacinque dal binario tre.", "Pago due euro e quaranta."] },
  turns: {
    d28_01_route: authoredTurn("d28_01_route", "Luca", "Prenda l'autobus delle otto e quaranta. Deve cambiare a Vietri verso le nove e un quarto.", "Ask where or when the connection leaves."),
    d28_02_connection: authoredTurn("d28_02_connection", "Luca", "A Vietri, il secondo autobus parte alle nove e trentacinque dallo stallo tre, non dal due.", "Confirm stand 3 and the 09:35 connection."),
    d28_03_fare: authoredTurn("d28_03_fare", "Luca", "Esatto. Serve un nuovo biglietto da due euro e quaranta.", "Pay the distinct new fare or decline."),
    d28_04_bought: authoredTurn("d28_04_bought", "Luca", "Perfetto. Nuovo biglietto: otto e quaranta, cambio a Vietri, stallo tre.", "Route and fare confirmed.", true),
    d28_05_exit: authoredTurn("d28_05_exit", "Luca", "Va bene. Non emetto nessun biglietto.", "No new ticket and no charge.", true),
    d28_06_funds: authoredTurn("d28_06_funds", "Luca", "Non basta per il nuovo biglietto. Non addebito niente.", "No negative balance.", true),
  },
  outcomes: {
    "D28-O1": { id: "D28-O1", title: "The two-leg trip is ready", detail: "You confirmed 08:40, the Vietri change, and the 09:35 connection from stand 3, then bought a new ticket.", consequence: "−€2.40 · distinct day-trip fare", tone: "success" },
    "D28-O2": { id: "D28-O2", title: "No new trip ticket", detail: "You left before buying the distinct fare.", consequence: "No charge · earlier tickets unchanged", tone: "open" },
    "D28-O3": { id: "D28-O3", title: "Fare not purchased", detail: "The new ticket was refused because the balance was insufficient.", consequence: "No charge · no negative balance", tone: "partial" },
  },
  terminalOutcomeTurns: { "D28-O1": ["d28_04_bought"], "D28-O2": ["d28_05_exit"], "D28-O3": ["d28_06_funds"] },
  defaultPhrase: "change",
  phraseExamples: { change: { italian: "Dove devo cambiare?", english: "Where do I change?" } },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (state.turnId === "d28_01_route") {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d28_05_exit", "D28-O2", {}, createId);
      if (any(normalized, ["cambiare", "change", "vietri", "connection", "coincidenza"])) return runtime.moveToTurn(state, "d28_02_connection", { transportPlan: { id: planId, firstDeparture: "08:40", changeAt: "Vietri", connectionTime: "09:35", stand: "3", fare: 240, status: "quoted" } }, undefined, createId);
    }
    if (state.turnId === "d28_02_connection") {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d28_05_exit", "D28-O2", { transportPlan: null }, createId);
      if (any(normalized, ["stallo due", "stand two", "stand 2", "binario due"])) return runtime.moveToTurn(state, state.turnId, {}, "The stated connection is stand 3, not stand 2.", createId);
      if (any(normalized, ["stallo tre", "stand three", "stand 3", "binario tre", "09 35", "nove e trentacinque"])) return runtime.moveToTurn(state, "d28_03_fare", {}, undefined, createId);
    }
    if (state.turnId === "d28_03_fare") {
      if (any(normalized, EXIT) || any(normalized, ["non pago", "no ticket"])) return runtime.queueTerminal(state, "d28_05_exit", "D28-O2", { transportPlan: null }, createId);
      if (any(normalized, ["pago", "carta", "contanti", "due euro", "2 40", "biglietto"])) {
        const alreadyPaid = state.transportPlan?.id === planId && state.transportPlan.status === "paid" && state.worldEvents.includes(fareEvent);
        if (!alreadyPaid && state.money < 240) return runtime.queueTerminal(state, "d28_06_funds", "D28-O3", {}, createId);
        return runtime.queueTerminal(state, "d28_04_bought", "D28-O1", {
          money: alreadyPaid ? state.money : state.money - 240,
          transportPlan: { id: planId, firstDeparture: "08:40", changeAt: "Vietri", connectionTime: "09:35", stand: "3", fare: 240, status: "paid" },
          transportMode: "bus", transportStatus: "booked", transportTicketPrice: 240, busTicket: true,
          routeFact: "08:40 bus; change at Vietri around 09:15; 09:35 connection from stand 3",
          inventory: addItem(state.inventory.filter((item) => !item.startsWith("Day-trip bus ticket")), "Day-trip bus ticket · 08:40 via Vietri"),
          worldEvents: addFact(state.worldEvents, fareEvent),
          knownFacts: addFact(state.knownFacts, "Day-trip bus: 08:40, change at Vietri, 09:35 from stand 3"),
        }, createId);
      }
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (after.turnId === "d28_02_connection") return observation(["request", "location"]);
    if (after.turnId === "d28_03_fare") return observation(["confirm", "location"], { routeConfirmed: true, destinationEstablished: true });
    if (after.turnId === "d28_04_bought") return observation(["price", "pay", "confirm"], { priceConfirmed: true, routeConfirmed: true });
    if (after.turnId === "d28_05_exit") return observation(["decline", "boundary"]);
    return noObservation();
  },
  adminSeed: () => finalArcAdminSeed(28), buildResult: buildObservedEpisodeResult,
};
