import { EXIT, PAY, YES, any, anyWholePhrase } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";

const metadata = seasonEpisode("day-06");
const routeFact = "Amalfi stop: across the square, opposite Bar Gabbiano";

export const day06Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "bus",
  scene: { id: "bus", episodeId: "day-06", day: "Day 6", dateLabel: "25 days out", title: metadata.title, location: metadata.location, time: "08:10", npc: "Luca", role: "Ticket clerk", objective: "Buy one ticket to Amalfi for €2.40 and identify the stop across the square.", firstTurn: "d06_01_destination", kicker: "The ticket type and stop arrive in two short pieces.", suggestions: ["Un biglietto per Amalfi, per favore.", "Solo andata.", "Dov’è la fermata?"] },
  turns: {
    d06_01_destination: authoredTurn("d06_01_destination", "Luca", "Buongiorno. Per dove?", "Give the destination and number of tickets."),
    d06_02_stop: authoredTurn("d06_02_stop", "Luca", "Un biglietto di sola andata. Due euro e quaranta. La fermata è dall'altra parte della piazza.", "Listen for price and where the stop is."),
    d06_03_close: authoredTurn("d06_03_close", "Luca", "Esatto, di fronte al bar. Ecco il biglietto.", "The route fact and ticket are secured.", true),
  },
  outcomes: {
    "D06-O1": { id: "D06-O1", title: "Ready for the Amalfi bus", detail: "You bought one one-way ticket and learned where the stop is.", consequence: "−€2.40 · stop across the square", tone: "success" },
    "D06-O2": { id: "D06-O2", title: "Route noted, ticket deferred", detail: "You kept the stop information but did not buy a ticket.", consequence: "No charge · stop across the square", tone: "partial" },
  },
  terminalOutcomeTurns: { "D06-O1": ["d06_03_close"] },
  evaluateResponse({ state, normalized, createId, runtime }) {
    const exit = any(normalized, EXIT);
    if (state.turnId === "d06_01_destination") {
      if (exit) return runtime.resolveOutcome(state, "D06-O2", {}, null, createId);
      if (any(normalized, ["amalfi"]) && any(normalized, ["biglietto", "ticket", "uno", "one"])) return runtime.moveToTurn(state, "d06_02_stop", {}, undefined, createId);
      return runtime.moveToTurn(state, "d06_01_destination", {}, "Luca needs the destination and number of tickets.", createId);
    }
    if (state.turnId === "d06_02_stop") {
      if (exit || any(normalized, ["non compro", "not buy", "piu tardi"])) return runtime.resolveOutcome(state, "D06-O2", { routeFact, knownFacts: [...new Set([...state.knownFacts, routeFact])] }, null, createId);
      if (any(normalized, ["fermata", "stop", "piazza", "square", "dove", "di fronte"]) || any(normalized, PAY) || anyWholePhrase(normalized, YES)) return runtime.queueTerminal(state, "d06_03_close", "D06-O1", {
        money: state.money - 240, busTicket: true, routeFact,
        inventory: [...new Set([...state.inventory, "One-way Amalfi bus ticket"])], knownFacts: [...new Set([...state.knownFacts, routeFact])],
      }, createId);
    }
    return state;
  },
  observeResponse({ before, after, normalized }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (before.turnId === "d06_01_destination" && after.turnId === "d06_02_stop") return observation(["request", "location"], { destinationEstablished: true });
    if (before.turnId === "d06_02_stop" && after.turnId === "d06_03_close") {
      const moves = ["confirm"] as ("confirm" | "location" | "pay")[];
      if (any(normalized, ["fermata", "stop", "piazza", "square", "dove", "di fronte"])) moves.push("location");
      if (any(normalized, PAY)) moves.push("pay");
      return observation(moves, { destinationEstablished: true });
    }
    return noObservation();
  },
  adminSeed: () => ({ money: 6310, hotelKey: true, apartmentKey: true, rental: "custom", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes"], relationships: { Giulia: "neutral" }, knownFacts: ["Giulia served the first espresso"], completed: ["day-00", "day-01", "day-02", "day-03", "day-04", "day-05"] }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
