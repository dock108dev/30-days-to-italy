import { EXIT, PAY, YES, any, anyWholePhrase, createFeedback } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { completedBefore } from "./shared";

const metadata = seasonEpisode("day-13");

function cafeIssues(normalized: string) {
  const bill = any(normalized, ["spremuta", "juice", "arancia", "conto", "bill", "extra", "sette", "7", "troppo", "charge"]);
  return {
    drink: any(normalized, ["cappuccino", "latte", "bevanda", "drink", "non questo", "wrong"])
      || (!bill && any(normalized, ["ordinato", "ordered"])),
    bill,
  };
}

export const day13Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "cafe",
  scene: { id: "cafe", episodeId: "day-13", day: "Day 13", dateLabel: "Friction", title: metadata.title, location: metadata.location, time: "09:30", npc: "Giulia", role: "Bartender", objective: "You ordered a cappuccino. A latte macchiato arrived, and the bill includes an orange juice you never ordered. Resolve what matters to you.", firstTurn: "e03_01_present", kicker: "The drink and the extra charge are separate problems.", suggestions: ["Avevo ordinato un cappuccino.", "Non ho ordinato la spremuta.", "Ci sono due problemi."] },
  turns: {
    e03_01_present: authoredTurn("e03_01_present", "Giulia", "Ecco il latte macchiato. Sono sette euro e cinquanta.", "Compare what arrived with what you ordered and the receipt."),
    e03_02_clarify: authoredTurn("e03_02_clarify", "Giulia", "Mi scusi, non ho capito. Il problema è la bevanda, il conto, o entrambi?", "Name the drink, the bill, or both."),
    e03_03_drink_only: authoredTurn("e03_03_drink_only", "Giulia", "Mi dispiace. Le rifaccio il cappuccino subito. Il conto resta sette euro e cinquanta.", "The drink is being fixed. Listen to what happens to the bill."),
    e03_04_bill_only: authoredTurn("e03_04_bill_only", "Giulia", "Ha ragione. Tolgo la spremuta. Se tiene il latte macchiato, il totale è tre euro.", "The bill is fixed. Decide whether to keep the wrong drink."),
    e03_05_both: authoredTurn("e03_05_both", "Giulia", "Mi dispiace. Rifaccio il cappuccino e tolgo la spremuta dal conto.", "Both problems are being corrected. Confirm or escalate."),
    e03_06_keep_latte: authoredTurn("e03_06_keep_latte", "Giulia", "Va bene. Tiene il latte macchiato e paga tre euro.", "The corrected transaction is ending.", true),
    e03_07_manager: authoredTurn("e03_07_manager", "Giulia", "Capisco. Posso chiamare il responsabile. Per ora il conto resta aperto.", "The dispute remains open for later recovery.", true),
    e03_08_final: authoredTurn("e03_08_final", "Giulia", "Ecco il cappuccino. Il totale corretto è due euro e cinquanta.", "The correct drink and total are ready. Pay to finish."),
  },
  outcomes: {
    "E3-O1": { id: "E3-O1", title: "Both mistakes fixed", detail: "You received the cappuccino you ordered and removed the orange juice from the bill.", consequence: "−€2.50 · correct drink · corrected receipt", tone: "success" },
    "E3-O2": { id: "E3-O2", title: "Bill fixed, drink kept", detail: "The extra charge was removed and you chose to keep the latte macchiato.", consequence: "−€3.00 · no open bill", tone: "partial" },
    "E3-O3": { id: "E3-O3", title: "Drink fixed, charge accepted", detail: "You got the cappuccino but knowingly paid the unchanged bill.", consequence: "−€7.50 · costly partial resolution", tone: "partial" },
    "E3-O4": { id: "E3-O4", title: "Original result accepted", detail: "You kept the wrong drink and paid the extra line rather than continue the dispute.", consequence: "−€7.50 · both errors remain in the history", tone: "partial" },
    "E3-O5": { id: "E3-O5", title: "Dispute left open", detail: "You chose not to accept the available remedy. A manager can address it later.", consequence: "€0 charged · €7.50 disputed bill remains open", tone: "open" },
  },
  terminalOutcomeTurns: { "E3-O2": ["e03_06_keep_latte"], "E3-O5": ["e03_07_manager"] },
  evaluateResponse({ state, normalized, raw, createId, runtime }) {
    const { drink, bill } = cafeIssues(normalized);
    const pay = any(normalized, PAY);
    const accept = anyWholePhrase(normalized, YES) || pay;
    const reject = any(normalized, ["manager", "responsabile", "reject", "non va bene", "no accetto", "dispute"]);
    const exit = any(normalized, EXIT);
    if (state.turnId === "e03_01_present" || state.turnId === "e03_02_clarify") {
      if (pay && !drink && !bill) return runtime.resolveOutcome(state, "E3-O4", { money: state.money - 750, cafeOutcome: "Wrong drink and extra line accepted" }, null, createId);
      if (exit && !drink && !bill) return runtime.queueTerminal(state, "e03_07_manager", "E3-O5", {}, createId);
      if (drink && bill) return runtime.moveToTurn(state, "e03_05_both", { feedback: createFeedback("cafe", raw, true) }, undefined, createId);
      if (drink) return runtime.moveToTurn(state, "e03_03_drink_only", { feedback: createFeedback("cafe", raw, true) }, undefined, createId);
      if (bill) return runtime.moveToTurn(state, "e03_04_bill_only", {}, undefined, createId);
      return runtime.moveToTurn(state, "e03_02_clarify", { attempts: state.attempts + 1 }, undefined, createId);
    }
    if (state.turnId === "e03_03_drink_only") {
      if (bill) return runtime.moveToTurn(state, "e03_05_both", { feedback: createFeedback("cafe", raw, true) }, undefined, createId);
      if (reject || exit) return runtime.queueTerminal(state, "e03_07_manager", "E3-O5", {}, createId);
      if (accept) return runtime.resolveOutcome(state, "E3-O3", { money: state.money - 750, cafeOutcome: "Drink fixed; extra line paid" }, undefined, createId);
      return runtime.moveToTurn(state, "e03_02_clarify", {}, undefined, createId);
    }
    if (state.turnId === "e03_04_bill_only") {
      const keepsLatte = any(normalized, ["tengo", "keep", "latte va bene"]);
      if (keepsLatte) return runtime.queueTerminal(state, "e03_06_keep_latte", "E3-O2", { money: state.money - 300, cafeOutcome: "Bill corrected; latte kept" }, createId);
      if (drink || any(normalized, ["cappuccino", "non tengo", "dont keep"])) return runtime.moveToTurn(state, "e03_05_both", { feedback: createFeedback("cafe", raw, true) }, undefined, createId);
      if (reject || exit) return runtime.queueTerminal(state, "e03_07_manager", "E3-O5", {}, createId);
      if (accept) return runtime.queueTerminal(state, "e03_06_keep_latte", "E3-O2", { money: state.money - 300, cafeOutcome: "Bill corrected; latte kept" }, createId);
      return runtime.moveToTurn(state, "e03_02_clarify", {}, undefined, createId);
    }
    if (state.turnId === "e03_05_both") {
      if (reject || exit) return runtime.queueTerminal(state, "e03_07_manager", "E3-O5", {}, createId);
      if (accept || any(normalized, ["grazie", "thanks", "corretto", "fix"])) return runtime.moveToTurn(state, "e03_08_final", {}, undefined, createId);
      return runtime.moveToTurn(state, "e03_02_clarify", {}, undefined, createId);
    }
    if (state.turnId === "e03_08_final") {
      if (pay || accept) return runtime.resolveOutcome(state, "E3-O1", { money: state.money - 250, cafeOutcome: "Both errors corrected" }, undefined, createId);
      if (reject || exit) return runtime.queueTerminal(state, "e03_07_manager", "E3-O5", {}, createId);
    }
    return state;
  },
  observeResponse({ before, after, normalized }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const { drink, bill } = cafeIssues(normalized);
    const moves: ObservedMove[] = [];
    if (drink || bill) moves.push("problem");
    if (["e03_03_drink_only", "e03_04_bill_only", "e03_05_both"].includes(after.turnId)) moves.push("recovery");
    if (["e03_06_keep_latte", "e03_08_final"].includes(after.turnId)) moves.push("confirm");
    if (after.status === "resolved" && any(normalized, PAY)) moves.push("pay", "price");
    if (after.turnId === "e03_07_manager") moves.push("decline");
    return observation(moves, after.status === "resolved" && any(normalized, PAY) ? { priceConfirmed: true } : undefined);
  },
  adminSeed: () => ({ money: 1610, hotelKey: true, apartmentKey: true, rental: "custom", busTicket: true, routeFact: "Amalfi stop: across the square, opposite Bar Gabbiano", pharmacyItem: "Mosquito-bite cream", laundryStatus: "clean", transportMode: "ferry", transportStatus: "booked", transportTicketPrice: 1000, hotWaterStatus: "reported", repairCommitment: { window: "Tuesday, 09:00–11:00", status: "active" }, inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "One-way Amalfi bus ticket", "Mosquito-bite cream", "Clean clothes", "Ferry ticket"], relationships: { Giulia: "neutral" }, knownFacts: ["Giulia served the first espresso", "Amalfi stop: across the square, opposite Bar Gabbiano", "Hot water repair promised Tuesday, 09:00–11:00"], completed: completedBefore(13) }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
