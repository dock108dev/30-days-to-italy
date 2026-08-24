import { EXIT, PAY, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";
import { addFact, finalArcAdminSeed } from "./shared";

const metadata = seasonEpisode("day-29");

export const day29Episode: EpisodeDefinition = {
  ...metadata, sceneId: "farewell-coffee",
  scene: { id: "farewell-coffee", episodeId: "day-29", day: "Day 29", dateLabel: "One more coffee", title: metadata.title, location: metadata.location, time: "10:45", npc: "Giulia", role: "Bartender", objective: "Order the €2 espresso and answer whether you are staying longer without inventing certainty.", firstTurn: "d29_01_order", kicker: "A familiar question can receive a short, undecided answer.", suggestions: ["Un espresso, grazie.", "Non lo so ancora.", "Con la carta."] },
  turns: {
    d29_01_order: authoredTurn("d29_01_order", "Giulia", "Un altro espresso? Costa due euro.", "Order the espresso or leave."),
    d29_02_question: authoredTurn("d29_02_question", "Giulia", "Pensi di restare più a lungo qui?", "Answer yes, no, or not sure yet."),
    d29_03_pay: authoredTurn("d29_03_pay", "Giulia", "Capisco. Sono due euro.", "Pay to finish."),
    d29_04_done: authoredTurn("d29_04_done", "Giulia", "Grazie. A domani.", "Coffee paid; answer recorded exactly.", true),
    d29_05_exit: authoredTurn("d29_05_exit", "Giulia", "Va bene. A presto.", "No coffee and no personal answer inferred.", true),
    d29_06_funds: authoredTurn("d29_06_funds", "Giulia", "Non basta per l'espresso. Non addebito niente.", "No negative balance.", true),
  },
  outcomes: {
    "D29-O1": { id: "D29-O1", title: "Not sure yet", detail: "You paid for the espresso and told Giulia only that you do not know yet.", consequence: "−€2.00 · no future decision inferred", tone: "success" },
    "D29-O2": { id: "D29-O2", title: "A definite answer", detail: "You paid and gave the yes-or-no answer you chose. Nothing beyond it was inferred.", consequence: "−€2.00 · exact answer recorded", tone: "success" },
    "D29-O3": { id: "D29-O3", title: "No coffee today", detail: "You left before ordering or answering the optional question.", consequence: "No charge · no future answer", tone: "open" },
    "D29-O4": { id: "D29-O4", title: "Coffee not purchased", detail: "The €2 charge was refused because it would create a negative balance.", consequence: "No charge", tone: "partial" },
    "D29-O5": { id: "D29-O5", title: "Order stopped before payment", detail: "You began the espresso order, then left before answering or paying. No coffee was delivered.", consequence: "No charge · no future answer", tone: "open" },
  },
  terminalOutcomeTurns: { "D29-O1": ["d29_04_done"], "D29-O2": ["d29_04_done"], "D29-O3": ["d29_05_exit"], "D29-O4": ["d29_06_funds"], "D29-O5": ["d29_05_exit"] },
  defaultPhrase: "uncertainty",
  phraseExamples: { uncertainty: { italian: "Non lo so ancora.", english: "I’m not sure yet." } },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (state.turnId === "d29_01_order") {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d29_05_exit", "D29-O3", { stayResponse: "unknown" }, createId);
      if (any(normalized, ["espresso", "caffe", "coffee", "si", "prendo"])) return runtime.moveToTurn(state, "d29_02_question", {}, undefined, createId);
    }
    if (state.turnId === "d29_02_question") {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d29_05_exit", "D29-O5", { stayResponse: "unknown" }, createId);
      if (any(normalized, ["non lo so", "not sure", "dont know", "forse", "maybe"])) return runtime.moveToTurn(state, "d29_03_pay", { stayResponse: "not-sure", knownFacts: addFact(state.knownFacts, "Giulia heard: staying longer is undecided") }, undefined, createId);
      if (any(normalized, ["si", "yes", "resto", "stay longer"])) return runtime.moveToTurn(state, "d29_03_pay", { stayResponse: "yes" }, undefined, createId);
      if (any(normalized, ["no", "parto", "leaving", "non resto"])) return runtime.moveToTurn(state, "d29_03_pay", { stayResponse: "no" }, undefined, createId);
    }
    if (state.turnId === "d29_03_pay" && any(normalized, PAY)) {
      if (state.money < 200) return runtime.queueTerminal(state, "d29_06_funds", "D29-O4", {}, createId);
      return runtime.queueTerminal(state, "d29_04_done", state.stayResponse === "not-sure" ? "D29-O1" : "D29-O2", { money: state.money - 200, relationships: { ...state.relationships, Giulia: "warm" } }, createId);
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (after.turnId === "d29_02_question") return observation(["request", "price"]);
    if (after.turnId === "d29_03_pay") return observation(["boundary", "confirm"]);
    if (after.turnId === "d29_04_done") return observation(["pay", "price", "confirm"], { priceConfirmed: true });
    if (after.turnId === "d29_05_exit") return observation(["decline", "boundary"]);
    return noObservation();
  },
  adminSeed: () => finalArcAdminSeed(29), buildResult: buildObservedEpisodeResult,
};
