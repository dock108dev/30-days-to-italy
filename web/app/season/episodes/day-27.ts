import { EXIT, any, type GameState } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";
import { addFact, finalArcAdminSeed } from "./shared";

const metadata = seasonEpisode("day-27");
const creditEvent = "day27-repair-credit-issued";

function eligible(state: GameState): boolean {
  return state.repairCreditEligibility === "eligible" || (
    state.hotWaterStatus === "temporary" &&
    (state.repairCommitment?.status === "active" || state.knownFacts.some((fact) => /missed|corrected the missed/i.test(fact)))
  );
}

export const day27Episode: EpisodeDefinition = {
  ...metadata, sceneId: "repair-close",
  scene: { id: "repair-close", episodeId: "day-27", day: "Day 27", dateLabel: "The repair closes", title: metadata.title, location: metadata.location, time: "10:30", npc: "Raffaele", role: "Host", objective: "Confirm the permanent hot-water repair and request the €5 credit only if the saved history supports it.", firstTurn: "d27_01_fixed", kicker: "A credit is earned by recorded repair history, never by choosing a persuasive line.", suggestions: ["Ora l'acqua calda funziona.", "Posso avere un buono?", "È tutto a posto."] },
  turns: {
    d27_01_fixed: authoredTurn("d27_01_fixed", "Raffaele", "Il pezzo nuovo è montato. Ora l'acqua calda funziona in modo permanente.", "Confirm the repair, mention a problem, or leave."),
    d27_02_close: authoredTurn("d27_02_close", "Raffaele", "Bene. Per il disagio precedente, vuole chiedere il buono di cinque euro?", "Ask for the credit or close without it."),
    d27_03_credit: authoredTurn("d27_03_credit", "Raffaele", "Ha ragione: l'appuntamento era saltato. Aggiungo un buono di cinque euro.", "Eligible credit issued once.", true),
    d27_04_no_credit: authoredTurn("d27_04_no_credit", "Raffaele", "La riparazione è chiusa. Non risulta un credito dovuto.", "Repair closed without unearned credit.", true),
    d27_05_closed: authoredTurn("d27_05_closed", "Raffaele", "Perfetto. La riparazione è chiusa.", "Repair closed; credit declined.", true),
    d27_06_open: authoredTurn("d27_06_open", "Raffaele", "Capisco. Non chiudo la segnalazione.", "Repair remains open.", true),
  },
  outcomes: {
    "D27-O1": { id: "D27-O1", title: "Repair closed with earned credit", detail: "The permanent repair was confirmed and the saved missed-appointment history supported one €5 credit.", consequence: "+€5.00 · repair fulfilled · credit issued", tone: "success" },
    "D27-O2": { id: "D27-O2", title: "Repair closed without credit", detail: "The repair closed, but no qualifying history supported a credit.", consequence: "No money change · no unearned credit", tone: "success" },
    "D27-O3": { id: "D27-O3", title: "Repair closed, credit declined", detail: "You confirmed the permanent repair and chose not to request the available credit.", consequence: "No money change · repair fulfilled", tone: "success" },
    "D27-O4": { id: "D27-O4", title: "Repair still open", detail: "You reported that the result could not yet be confirmed.", consequence: "No money change · commitment remains open", tone: "open" },
  },
  terminalOutcomeTurns: { "D27-O1": ["d27_03_credit"], "D27-O2": ["d27_04_no_credit"], "D27-O3": ["d27_05_closed"], "D27-O4": ["d27_06_open"] },
  defaultPhrase: "settled",
  phraseExamples: { credit: { italian: "Posso avere un buono?", english: "Can I get a credit?" }, settled: { italian: "È tutto a posto?", english: "Is everything settled?" } },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (state.turnId === "d27_01_fixed") {
      if (any(normalized, EXIT) || any(normalized, ["non funziona", "still broken", "not fixed"])) return runtime.queueTerminal(state, "d27_06_open", "D27-O4", {}, createId);
      if (any(normalized, ["funziona", "fixed", "riparato", "a posto", "si"])) return runtime.moveToTurn(state, "d27_02_close", { hotWaterStatus: "fixed", repairCommitment: { window: state.repairCommitment?.window ?? "Friday at 10:00", status: "fulfilled" }, commitments: state.commitments.filter((item) => !item.startsWith("Hot-water repair:")), repairCreditEligibility: eligible(state) ? "eligible" : "ineligible" }, undefined, createId);
    }
    if (state.turnId === "d27_02_close") {
      if (any(normalized, ["buono", "credit", "cinque"])) {
        const canIssue = eligible(state) && state.repairCreditStatus !== "issued" && !state.worldEvents.includes(creditEvent);
        if (!canIssue) return runtime.queueTerminal(state, "d27_04_no_credit", "D27-O2", { repairCreditStatus: state.repairCreditStatus === "issued" ? "issued" : "none" }, createId);
        return runtime.queueTerminal(state, "d27_03_credit", "D27-O1", { money: state.money + 500, repairCreditStatus: "issued", worldEvents: addFact(state.worldEvents, creditEvent), knownFacts: addFact(state.knownFacts, "Hot water permanently fixed; earned €5 repair credit issued") }, createId);
      }
      if (any(normalized, EXIT) || any(normalized, ["no", "senza", "decline", "a posto"])) return runtime.queueTerminal(state, "d27_05_closed", "D27-O3", { repairCreditStatus: "declined" }, createId);
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (after.turnId === "d27_02_close") return observation(["confirm", "problem"], { problemReported: true, commitmentConfirmed: true });
    if (after.turnId === "d27_03_credit") return observation(["request", "recovery", "confirm"]);
    if (after.turnId === "d27_05_closed") return observation(["decline", "confirm"]);
    return noObservation();
  },
  adminSeed: () => finalArcAdminSeed(27), buildResult: buildObservedEpisodeResult,
};
