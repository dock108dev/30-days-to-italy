import { EXIT, NO, PAY, YES, any, anyWholePhrase, createFeedback, type Rental } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";

const metadata = seasonEpisode("day-04");

export const day04Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "beach",
  scene: { id: "beach", episodeId: "day-04", day: "Day 4", dateLabel: "Settling in", title: metadata.title, location: metadata.location, time: "10:00", npc: "Nadia", role: "Lido attendant", objective: "Rent one beach chair and one umbrella for today without accidentally buying a two-chair package.", firstTurn: "e02_01_need", kicker: "The standard offer is designed for two people. You are here alone.", suggestions: ["Un lettino e un ombrellone.", "Solo un lettino.", "No, grazie."] },
  turns: {
    e02_01_need: authoredTurn("e02_01_need", "Nadia", "Buongiorno. Cosa le serve?", "Ask for what you need. English nouns are okay."),
    e02_02_standard_offer: authoredTurn("e02_02_standard_offer", "Nadia", "Il pacchetto standard include due lettini e un ombrellone.", "Nothing has been charged. Choose or correct the quantity."),
    e02_03_quantity: authoredTurn("e02_03_quantity", "Nadia", "Vuole un lettino o due lettini?", "The quantity must be clear before a price is confirmed."),
    e02_04_custom: authoredTurn("e02_04_custom", "Nadia", "Un lettino e un ombrellone costano ventidue euro. Va bene?", "Confirm or refuse the €22 option."),
    e02_05_standard: authoredTurn("e02_05_standard", "Nadia", "Due lettini e un ombrellone costano trenta euro. Va bene?", "Confirm or refuse the €30 package."),
    e02_06_chair: authoredTurn("e02_06_chair", "Nadia", "Solo un lettino costa dodici euro. Va bene?", "Confirm or refuse the chair-only option."),
    e02_07_close: authoredTurn("e02_07_close", "Nadia", "Chiudiamo alle diciotto. Può lasciare tutto al suo posto.", "Listen for the return time. Your rental is confirmed.", true),
    e02_08_exit: authoredTurn("e02_08_exit", "Nadia", "Va bene. Nessun problema.", "No rental and no charge.", true),
  },
  outcomes: {
    "E2-O1": { id: "E2-O1", title: "Exactly what you wanted", detail: "One chair and one umbrella are yours for the day.", consequence: "−€22.00 · return by 18:00", tone: "success" },
    "E2-O2": { id: "E2-O2", title: "The standard package", detail: "You accepted two chairs and one umbrella. It works, but costs more than your original objective.", consequence: "−€30.00 · return by 18:00", tone: "partial" },
    "E2-O3": { id: "E2-O3", title: "Chair only", detail: "You chose a cheaper compromise without the umbrella.", consequence: "−€12.00 · return by 18:00", tone: "partial" },
    "E2-O4": { id: "E2-O4", title: "No rental", detail: "You declined the available options and kept your money.", consequence: "No charge · no obligation", tone: "open" },
  },
  terminalOutcomeTurns: { "E2-O1": ["e02_07_close"], "E2-O2": ["e02_07_close"], "E2-O3": ["e02_07_close"], "E2-O4": ["e02_08_exit"] },
  evaluateResponse({ state, normalized, raw, createId, runtime }) {
    const exit = any(normalized, EXIT) || (anyWholePhrase(normalized, NO) && !any(normalized, ["non due", "not two"]));
    const one = any(normalized, ["uno", "una", "un ", "one", "solo", "single", "non due", "not two"]);
    const two = any(normalized, ["due", "two", "standard", "trenta", "30"]);
    const umbrella = any(normalized, ["ombrell", "umbrella", "sombrilla", "shade"]);
    const chair = any(normalized, ["lettino", "chair", "sedia", "bed"]);
    const explicitlyWithoutUmbrella = any(normalized, ["senza ombrellone", "without umbrella", "no umbrella"]);
    const chairOnly = chair && any(normalized, ["senza", "only", "solo"]) && (!umbrella || explicitlyWithoutUmbrella);
    const accept = anyWholePhrase(normalized, YES) || any(normalized, PAY);
    if (state.turnId === "e02_01_need") {
      if (exit) return runtime.queueTerminal(state, "e02_08_exit", "E2-O4", {}, createId);
      if (chair || umbrella) return runtime.moveToTurn(state, "e02_02_standard_offer", { feedback: createFeedback("beach", raw) }, undefined, createId);
      return runtime.moveToTurn(state, "e02_03_quantity", {}, "Nadia understood that you want beach equipment, but the quantity is unclear.", createId);
    }
    if (state.turnId === "e02_02_standard_offer" || state.turnId === "e02_03_quantity") {
      if (exit) return runtime.queueTerminal(state, "e02_08_exit", "E2-O4", {}, createId);
      if (chairOnly) return runtime.moveToTurn(state, "e02_06_chair", {}, undefined, createId);
      if (two && !any(normalized, ["non due", "not two"])) return runtime.moveToTurn(state, "e02_05_standard", {}, undefined, createId);
      if (one || (chair && umbrella)) return runtime.moveToTurn(state, "e02_04_custom", {}, undefined, createId);
      return runtime.moveToTurn(state, "e02_03_quantity", { attempts: state.attempts + 1 }, "No charge yet. Nadia needs one chair or two.", createId);
    }
    const quoteMap: Record<string, { outcome: string; rental: Rental; charge: number }> = {
      e02_04_custom: { outcome: "E2-O1", rental: "custom", charge: 2200 },
      e02_05_standard: { outcome: "E2-O2", rental: "standard", charge: 3000 },
      e02_06_chair: { outcome: "E2-O3", rental: "chair", charge: 1200 },
    };
    const quoted = quoteMap[state.turnId];
    if (!quoted) return state;
    if (accept && !any(normalized, ["non va", "no ", "not"])) return runtime.queueTerminal(state, "e02_07_close", quoted.outcome, { money: state.money - quoted.charge, rental: quoted.rental }, createId);
    if (exit) return runtime.queueTerminal(state, "e02_08_exit", "E2-O4", {}, createId);
    return runtime.moveToTurn(state, "e02_03_quantity", {}, "The quoted option was not confirmed. Nothing was charged.", createId);
  },
  observeResponse({ before, after, normalized }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (after.turnId === "e02_08_exit") return observation(["decline"]);
    if (before.turnId === "e02_01_need" && ["e02_02_standard_offer", "e02_03_quantity"].includes(after.turnId)) {
      const requested = any(normalized, ["lettino", "chair", "sedia", "bed", "ombrell", "umbrella", "sombrilla", "shade"]);
      return observation(requested ? ["request"] : []);
    }
    if (["e02_02_standard_offer", "e02_03_quantity"].includes(before.turnId) && ["e02_04_custom", "e02_05_standard", "e02_06_chair"].includes(after.turnId)) return observation(["quantity"], { quantityClarified: true });
    if (["e02_04_custom", "e02_05_standard", "e02_06_chair"].includes(before.turnId) && after.turnId === "e02_07_close") {
      const moves: ObservedMove[] = ["confirm", "price"];
      if (any(normalized, PAY)) moves.push("pay");
      return observation(moves, { priceConfirmed: true });
    }
    return noObservation();
  },
  adminSeed: () => ({ money: 8960, hotelKey: true, apartmentKey: true, inventory: ["Bread", "Cheese", "Water"], relationships: { Giulia: "neutral" }, knownFacts: ["Giulia served the first espresso"], completed: ["day-00", "day-01", "day-02", "day-03"] }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
