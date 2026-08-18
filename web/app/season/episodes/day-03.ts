import { EXIT, PAY, YES, any, anyWholePhrase } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";

const metadata = seasonEpisode("day-03");

export const day03Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "morning-bar",
  scene: { id: "morning-bar", episodeId: "day-03", day: "Day 3", dateLabel: "28 days out", title: metadata.title, location: metadata.location, time: "08:35", npc: "Giulia", role: "Bartender", objective: "Order one espresso, choose to drink it here, and pay €2.00.", firstTurn: "d03_01_order", kicker: "This is your first visit; Giulia does not know your usual yet.", suggestions: ["Vorrei un espresso.", "Qui, grazie.", "Con la carta."] },
  turns: {
    d03_01_order: authoredTurn("d03_01_order", "Giulia", "Buongiorno. Cosa prende?", "Order one drink."),
    d03_02_here: authoredTurn("d03_02_here", "Giulia", "Un espresso. Qui o da portare?", "Choose here or to go."),
    d03_03_pay: authoredTurn("d03_03_pay", "Giulia", "Perfetto. Sono due euro. Carta o contanti?", "Confirm payment."),
    d03_04_close: authoredTurn("d03_04_close", "Giulia", "Ecco il suo espresso. Buona giornata.", "Your first Bar Gabbiano visit is complete.", true),
  },
  outcomes: {
    "D03-O1": { id: "D03-O1", title: "Your first espresso", detail: "You ordered one espresso, chose to stay, and completed the payment.", consequence: "−€2.00 · Giulia met", tone: "success" },
    "D03-O2": { id: "D03-O2", title: "Coffee skipped", detail: "You left before ordering. Nothing was charged.", consequence: "No charge", tone: "open" },
  },
  terminalOutcomeTurns: { "D03-O1": ["d03_04_close"] },
  evaluateResponse({ state, normalized, createId, runtime }) {
    const exit = any(normalized, EXIT);
    if (state.turnId === "d03_01_order") {
      if (exit) return runtime.resolveOutcome(state, "D03-O2", {}, null, createId);
      if (any(normalized, ["espresso", "caffe", "coffee"])) return runtime.moveToTurn(state, "d03_02_here", {}, undefined, createId);
      return runtime.moveToTurn(state, "d03_01_order", {}, "Giulia is waiting for the drink order.", createId);
    }
    if (state.turnId === "d03_02_here") {
      if (any(normalized, ["qui", "here", "al banco"])) return runtime.moveToTurn(state, "d03_03_pay", {}, undefined, createId);
      if (exit) return runtime.resolveOutcome(state, "D03-O2", {}, null, createId);
      return runtime.moveToTurn(state, "d03_02_here", {}, "Choose qui or da portare.", createId);
    }
    if (state.turnId === "d03_03_pay" && (any(normalized, PAY) || anyWholePhrase(normalized, YES))) return runtime.queueTerminal(state, "d03_04_close", "D03-O1", {
      money: state.money - 200,
      relationships: { ...state.relationships, Giulia: "neutral" },
      knownFacts: [...new Set([...state.knownFacts, "Giulia served the first espresso"])],
    }, createId);
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (before.turnId === "d03_01_order" && after.turnId === "d03_02_here") return observation(["request"]);
    if (before.turnId === "d03_02_here" && after.turnId === "d03_03_pay") return observation(["preference"], { preferenceSelected: "drink here" });
    if (before.turnId === "d03_03_pay" && after.turnId === "d03_04_close") return observation(["pay", "confirm"], { priceConfirmed: true });
    return noObservation();
  },
  adminSeed: () => ({ money: 9160, hotelKey: true, apartmentKey: true, inventory: ["Bread", "Cheese", "Water"], completed: ["day-00", "day-01", "day-02"] }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
