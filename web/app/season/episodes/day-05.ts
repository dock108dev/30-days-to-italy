import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";

const metadata = seasonEpisode("day-05");

export const day05Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "produce",
  scene: { id: "produce", episodeId: "day-05", day: "Day 5", dateLabel: "26 days out", title: metadata.title, location: metadata.location, time: "09:15", npc: "Paola", role: "Produce vendor", objective: "Buy half a kilo of tomatoes for €4.50 and stop the quantity there.", firstTurn: "d05_01_quantity", kicker: "Paola reaches for a larger bag unless you make the amount clear.", suggestions: ["Mezzo chilo di pomodori.", "Basta così, grazie.", "Quanto costa?"] },
  turns: {
    d05_01_quantity: authoredTurn("d05_01_quantity", "Paola", "Buongiorno. Quanti pomodori vuole?", "Ask for half a kilo."),
    d05_02_confirm: authoredTurn("d05_02_confirm", "Paola", "Mezzo chilo costa quattro euro e cinquanta. Ne aggiungo ancora?", "Stop the quantity before confirming."),
    d05_03_close: authoredTurn("d05_03_close", "Paola", "Basta così. Quattro euro e cinquanta, grazie.", "The amount and price are confirmed.", true),
  },
  outcomes: {
    "D05-O1": { id: "D05-O1", title: "Exactly half a kilo", detail: "You held the quantity to half a kilo and accepted the stated price.", consequence: "−€4.50 · tomatoes", tone: "success" },
    "D05-O2": { id: "D05-O2", title: "Produce declined", detail: "The amount was not clear enough to charge safely, so no sale occurred.", consequence: "No charge", tone: "open" },
  },
  terminalOutcomeTurns: { "D05-O1": ["d05_03_close"] },
  evaluateResponse({ state, normalized, createId, runtime }) {
    const exit = any(normalized, EXIT);
    if (state.turnId === "d05_01_quantity") {
      if (exit) return runtime.resolveOutcome(state, "D05-O2", {}, null, createId);
      if (any(normalized, ["mezzo", "half", "500", "cinquecento"]) && any(normalized, ["pomodor", "tomato"])) return runtime.moveToTurn(state, "d05_02_confirm", {}, undefined, createId);
      return runtime.moveToTurn(state, "d05_01_quantity", {}, "Paola will not guess the amount. Ask for half a kilo.", createId);
    }
    if (state.turnId === "d05_02_confirm") {
      if (any(normalized, ["basta", "enough", "non ancora", "no more", "va bene", "grazie"])) return runtime.queueTerminal(state, "d05_03_close", "D05-O1", { money: state.money - 450, inventory: [...new Set([...state.inventory, "½ kg tomatoes"])] }, createId);
      if (exit) return runtime.resolveOutcome(state, "D05-O2", {}, null, createId);
    }
    return state;
  },
  observeResponse({ before, after, normalized }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (before.turnId === "d05_01_quantity" && after.turnId === "d05_02_confirm") return observation(["request", "quantity"], { quantityClarified: true });
    if (before.turnId === "d05_02_confirm" && after.turnId === "d05_03_close") {
      const explicitPriceConfirmation = any(normalized, ["va bene", "quattro", "4.50", "4,50"]);
      return observation(["quantity", "confirm"], { quantityClarified: true, ...(explicitPriceConfirmation ? { priceConfirmed: true } : {}) });
    }
    return noObservation();
  },
  adminSeed: () => ({ money: 6760, hotelKey: true, apartmentKey: true, rental: "custom", inventory: ["Bread", "Cheese", "Water"], relationships: { Giulia: "neutral" }, knownFacts: ["Giulia served the first espresso"], completed: ["day-00", "day-01", "day-02", "day-03", "day-04"] }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
