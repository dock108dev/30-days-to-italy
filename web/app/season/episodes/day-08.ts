import { EXIT, any, createFeedback } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, completedBefore } from "./shared";

const metadata = seasonEpisode("day-08");

export const day08Episode: EpisodeDefinition = {
  ...metadata, sceneId: "laundry",
  scene: { id: "laundry", episodeId: "day-08", day: "Day 8", dateLabel: "23 days out", title: metadata.title, location: metadata.location, time: "09:20", npc: "Carlo", role: "Laundry attendant", objective: "Learn the machine sequence, solve one small problem, or postpone cleanly.", firstTurn: "d08_01_help", kicker: "Machine 4 and coin slot 2 are deliberately easy to confuse.", suggestions: ["Come funziona?", "Macchina quattro, gettoniera due.", "Devo premere il pulsante verde?"] },
  turns: {
    d08_01_help: authoredTurn("d08_01_help", "Carlo", "Buongiorno. Le serve aiuto con la lavatrice?", "Ask how it works or postpone."),
    d08_02_numbers: authoredTurn("d08_02_numbers", "Carlo", "Usi la macchina quattro, ma metta cinque euro nella gettoniera numero due. Il lavaggio dura trentacinque minuti.", "Confirm machine 4, coin slot 2, €5, and 35 minutes."),
    d08_03_start: authoredTurn("d08_03_start", "Carlo", "Se non parte, prema il pulsante verde.", "State the problem or press the green button."),
    d08_04_close: authoredTurn("d08_04_close", "Carlo", "Perfetto. La macchina è partita. Torni fra trentacinque minuti.", "The wash has started.", true),
    d08_05_exit: authoredTurn("d08_05_exit", "Carlo", "Va bene. Può tornare più tardi.", "No wash and no charge.", true),
    d08_06_funds: authoredTurn("d08_06_funds", "Carlo", "Nessun problema. Senza cinque euro non avviamo la macchina.", "The wash is postponed without overdrawing.", true),
  },
  outcomes: {
    "D08-O1": { id: "D08-O1", title: "Laundry underway", detail: "You separated the machine and coin-slot numbers and started the wash.", consequence: "−€5.00 · clean clothes after 35 minutes", tone: "success" },
    "D08-O2": { id: "D08-O2", title: "Laundry postponed", detail: "You chose to return when the sequence or timing suits you.", consequence: "No charge · clothes remain unwashed", tone: "open" },
    "D08-O3": { id: "D08-O3", title: "Not enough cash", detail: "The machine was not started because €5.00 was unavailable.", consequence: "No charge · no negative balance", tone: "partial" },
  },
  terminalOutcomeTurns: { "D08-O1": ["d08_04_close"], "D08-O2": ["d08_05_exit"], "D08-O3": ["d08_06_funds"] },
  defaultPhrase: "how",
  phraseExamples: {
    how: { italian: "Come funziona questa lavatrice?", english: "How does this washing machine work?" },
    problem: { italian: "La macchina non parte.", english: "The machine isn’t starting." },
    confirm: { italian: "Macchina quattro, gettoniera due. Giusto?", english: "Machine four, coin slot two. Right?" },
  },
  evaluateResponse({ state, normalized, raw, createId, runtime }) {
    const exit = any(normalized, EXIT) || any(normalized, ["postpone", "another day", "domani"]);
    if (exit) return runtime.queueTerminal(state, "d08_05_exit", "D08-O2", { laundryStatus: "postponed" }, createId);
    if (state.turnId === "d08_01_help") {
      if (any(normalized, ["come funziona", "how", "aiuto", "help", "lavatrice"])) return runtime.moveToTurn(state, "d08_02_numbers", {}, undefined, createId);
      return runtime.moveToTurn(state, "d08_01_help", {}, "Carlo only needs to know whether you want the machine instructions.", createId);
    }
    if (state.turnId === "d08_02_numbers") {
      if (any(normalized, ["macchina quattro", "machine four", "numero quattro"]) && any(normalized, ["due", "two", "gettoniera"])) return runtime.moveToTurn(state, "d08_03_start", {}, undefined, createId);
      return runtime.moveToTurn(state, "d08_02_numbers", {}, "The machine is 4; the coin slot is 2. Nothing has been charged.", createId);
    }
    if (state.turnId === "d08_03_start" && any(normalized, ["verde", "green", "prem", "press", "non parte", "doesn t start"])) {
      if (state.money < 500) return runtime.queueTerminal(state, "d08_06_funds", "D08-O3", { laundryStatus: "postponed" }, createId);
      return runtime.queueTerminal(state, "d08_04_close", "D08-O1", { money: state.money - 500, laundryStatus: "clean", currentLocation: metadata.location, currentTime: "09:55", knownFacts: addFact(state.knownFacts, "Laundry: machine 4, coin slot 2, green start button, 35 minutes"), feedback: createFeedback("laundry", raw) }, createId);
    }
    return state;
  },
  observeResponse({ before, after, normalized }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    if (before.turnId === "d08_01_help" && after.turnId === "d08_02_numbers") moves.push("request");
    if (before.turnId === "d08_02_numbers" && after.turnId === "d08_03_start") moves.push("confirm", "quantity");
    if (before.turnId === "d08_03_start" && any(normalized, ["non parte", "doesn t start"])) moves.push("problem", "recovery");
    if (after.turnId === "d08_04_close") moves.push("confirm", "pay");
    if (after.turnId === "d08_05_exit") moves.push("decline", "boundary");
    return observation(moves, after.turnId === "d08_04_close" ? { quantityClarified: true, priceConfirmed: true } : undefined);
  },
  adminSeed: () => ({ money: 5110, hotelKey: true, apartmentKey: true, rental: "custom", busTicket: true, routeFact: "Amalfi stop: across the square, opposite Bar Gabbiano", pharmacyItem: "Mosquito-bite cream", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "One-way Amalfi bus ticket", "Mosquito-bite cream"], relationships: { Giulia: "neutral" }, knownFacts: ["Giulia served the first espresso", "Amalfi stop: across the square, opposite Bar Gabbiano"], completed: completedBefore(8), currentLocation: metadata.location, currentTime: "09:20" }),
  buildResult: buildObservedEpisodeResult,
};
