import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";
import { addFact, finalArcAdminSeed } from "./shared";

const metadata = seasonEpisode("day-24");

export const day24Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "weather-beach",
  scene: { id: "weather-beach", episodeId: "day-24", day: "Day 24", dateLabel: "A windy change", title: metadata.title, location: metadata.location, time: "14:00", npc: "Nadia", role: "Lido attendant", objective: "Respond to the fictional wind and 15:00 closure without claiming an unearned refund or credit.", firstTurn: "d24_01_wind", kicker: "Today’s wind and early closure are fictional trip conditions inside the rehearsal.", suggestions: ["Allora vado via.", "Posso avere un buono?", "Prendo il posto riparato da cinque euro."] },
  turns: {
    d24_01_wind: authoredTurn("d24_01_wind", "Nadia", "Oggi c'è molto vento e il lido chiude alle quindici. Le consiglio di andare via.", "Leave, ask about a remedy, or choose the €5 sheltered chair."),
    d24_02_no_entitlement: authoredTurn("d24_02_no_entitlement", "Nadia", "Non risulta un ingresso pagato per oggi, quindi non posso dare un rimborso o un buono.", "No remedy can be invented.", true),
    d24_03_leave: authoredTurn("d24_03_leave", "Nadia", "Va bene. Oggi non addebito niente.", "Plan changed with no charge.", true),
    d24_04_shelter: authoredTurn("d24_04_shelter", "Nadia", "C'è un posto riparato da cinque euro, fino alle quindici.", "Sheltered chair selected.", true),
    d24_05_credit: authoredTurn("d24_05_credit", "Nadia", "Il pagamento di oggi risulta. Le lascio un buono dello stesso importo.", "A non-cash credit is recorded.", true),
    d24_06_refund: authoredTurn("d24_06_refund", "Nadia", "Il pagamento di oggi risulta. Rimborso l'importo pagato.", "The recorded amount is refunded.", true),
    d24_07_funds: authoredTurn("d24_07_funds", "Nadia", "Non basta per il posto riparato. Non addebito niente.", "No negative balance.", true),
  },
  outcomes: {
    "D24-O1": { id: "D24-O1", title: "The beach plan changed", detail: "You followed the wind advice and left before the fictional early closure.", consequence: "No charge or refund · left for wind", tone: "success" },
    "D24-O2": { id: "D24-O2", title: "No paid entitlement", detail: "No same-day paid pass existed, so Nadia did not invent a refund or credit.", consequence: "No charge · no remedy", tone: "partial" },
    "D24-O3": { id: "D24-O3", title: "Sheltered until closing", detail: "You knowingly chose the €5 sheltered chair until 15:00.", consequence: "−€5.00 · sheltered chair", tone: "success" },
    "D24-O4": { id: "D24-O4", title: "Beach credit issued", detail: "A verified same-day payment supported a non-cash credit.", consequence: "No cash change · credit recorded", tone: "success" },
    "D24-O5": { id: "D24-O5", title: "Beach payment refunded", detail: "Only the verified same-day payment was returned.", consequence: "Recorded payment refunded", tone: "success" },
    "D24-O6": { id: "D24-O6", title: "Shelter not purchased", detail: "The €5 option was refused because it would create a negative balance.", consequence: "No charge", tone: "partial" },
    "D24-O7": { id: "D24-O7", title: "Remedy already resolved", detail: "The first valid beach remedy remains the only one recorded. No second credit or refund was created.", consequence: "No money change · original remedy preserved", tone: "partial" },
  },
  terminalOutcomeTurns: {
    "D24-O1": ["d24_03_leave"], "D24-O2": ["d24_02_no_entitlement"], "D24-O3": ["d24_04_shelter"],
    "D24-O4": ["d24_05_credit"], "D24-O5": ["d24_06_refund"], "D24-O6": ["d24_07_funds"],
  },
  defaultPhrase: "alternative",
  phraseExamples: { credit: { italian: "Posso avere un buono?", english: "Can I get a credit?" }, alternative: { italian: "C'è un posto riparato?", english: "Is there a sheltered place?" } },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (state.turnId !== "d24_01_wind") return state;
    if (state.beachRemedy !== "none" || state.worldEvents.some((event) => event === "day24-beach-credit-issued" || event === "day24-beach-refund-issued")) {
      return runtime.resolveOutcome(state, "D24-O7", { beachDayPassPaid: false }, undefined, createId);
    }
    const paid = state.beachDayPassPaid && state.beachDayPassPrice > 0;
    if (any(normalized, ["rimborso", "refund"])) {
      if (!paid) return runtime.queueTerminal(state, "d24_02_no_entitlement", "D24-O2", { beachWeather: "windy-early-close", beachPlanStatus: "left-for-wind", beachRemedy: "none" }, createId);
      return runtime.queueTerminal(state, "d24_06_refund", "D24-O5", { money: state.money + state.beachDayPassPrice, beachWeather: "windy-early-close", beachPlanStatus: "left-for-wind", beachRemedy: "refund", beachDayPassPaid: false, worldEvents: addFact(state.worldEvents, "day24-beach-refund-issued") }, createId);
    }
    if (any(normalized, ["buono", "credit", "voucher"])) {
      if (!paid) return runtime.queueTerminal(state, "d24_02_no_entitlement", "D24-O2", { beachWeather: "windy-early-close", beachPlanStatus: "left-for-wind", beachRemedy: "none" }, createId);
      return runtime.queueTerminal(state, "d24_05_credit", "D24-O4", { beachWeather: "windy-early-close", beachPlanStatus: "left-for-wind", beachRemedy: "credit", beachDayPassPaid: false, knownFacts: addFact(state.knownFacts, `Lido credit: €${(state.beachDayPassPrice / 100).toFixed(2)}`), worldEvents: addFact(state.worldEvents, "day24-beach-credit-issued") }, createId);
    }
    if (any(normalized, ["riparato", "shelter", "posto", "cinque"])) {
      if (state.money < 500) return runtime.queueTerminal(state, "d24_07_funds", "D24-O6", { beachWeather: "windy-early-close" }, createId);
      return runtime.queueTerminal(state, "d24_04_shelter", "D24-O3", { money: state.money - 500, beachWeather: "windy-early-close", beachPlanStatus: "sheltered-chair", rental: "chair" }, createId);
    }
    if (any(normalized, EXIT) || any(normalized, ["vado via", "leave", "esco"])) return runtime.queueTerminal(state, "d24_03_leave", "D24-O1", { beachWeather: "windy-early-close", beachPlanStatus: "left-for-wind" }, createId);
    return runtime.moveToTurn(state, state.turnId, {}, "Choose whether to leave, ask about a remedy, or pay €5 for shelter.", createId);
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (after.turnId === "d24_03_leave") return observation(["decline", "recovery"]);
    if (after.turnId === "d24_04_shelter") return observation(["preference", "price", "confirm", "pay"], { alternativeSelected: true, priceConfirmed: true });
    if (["d24_05_credit", "d24_06_refund", "d24_02_no_entitlement"].includes(after.turnId)) return observation(["request", "recovery"]);
    return noObservation();
  },
  adminSeed: () => finalArcAdminSeed(24), buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
