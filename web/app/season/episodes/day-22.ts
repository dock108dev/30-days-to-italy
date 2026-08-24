import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";
import { addFact, addItem, finalArcAdminSeed } from "./shared";

const metadata = seasonEpisode("day-22");

export const day22Episode: EpisodeDefinition = {
  ...metadata,
  sceneId: "vendor-recommendation",
  scene: {
    id: "vendor-recommendation", episodeId: "day-22", day: "Day 22", dateLabel: "A familiar recommendation",
    title: metadata.title, location: metadata.location, time: "12:20", npc: "Enzo", role: "Alimentari owner",
    objective: "Ask Enzo for one recommendation and decide whether to buy the €4 panino caprese.",
    firstTurn: "d22_01_greeting", kicker: "Familiarity can make a transaction shorter, not less explicit.",
    suggestions: ["Cosa mi consiglia?", "Prendo il panino caprese.", "No, grazie."],
  },
  turns: {
    d22_01_greeting: authoredTurn("d22_01_greeting", "Enzo", "Oggi ho due panini freschi. Vuole un consiglio?", "Ask for a recommendation, choose directly, or leave."),
    d22_02_recommendation: authoredTurn("d22_02_recommendation", "Enzo", "Le consiglio il panino caprese: pomodoro e mozzarella, quattro euro.", "Accept the caprese or decline."),
    d22_03_bought: authoredTurn("d22_03_bought", "Enzo", "Perfetto. Un panino caprese, quattro euro.", "The purchase is complete.", true),
    d22_04_exit: authoredTurn("d22_04_exit", "Enzo", "Va bene, nessun problema.", "Nothing purchased.", true),
    d22_05_funds: authoredTurn("d22_05_funds", "Enzo", "Non basta per il panino. Non addebito niente.", "No negative balance.", true),
  },
  outcomes: {
    "D22-O1": { id: "D22-O1", title: "Enzo’s recommendation", detail: "You asked, heard the exact recommendation and price, and bought the panino caprese.", consequence: "−€4.00 · panino caprese", tone: "success" },
    "D22-O2": { id: "D22-O2", title: "Recommendation declined", detail: "You heard Enzo’s recommendation and left it there.", consequence: "No charge · preference unchanged", tone: "open" },
    "D22-O3": { id: "D22-O3", title: "No purchase possible", detail: "The €4 fare was not charged because the available balance was insufficient.", consequence: "No charge · no negative balance", tone: "partial" },
  },
  terminalOutcomeTurns: { "D22-O1": ["d22_03_bought"], "D22-O2": ["d22_04_exit"], "D22-O3": ["d22_05_funds"] },
  defaultPhrase: "recommendation",
  phraseExamples: { recommendation: { italian: "Cosa mi consiglia?", english: "What do you recommend?" } },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (state.turnId === "d22_01_greeting") {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d22_04_exit", "D22-O2", {}, createId);
      if (any(normalized, ["consiglia", "recommend", "consiglio"])) return runtime.moveToTurn(state, "d22_02_recommendation", {}, undefined, createId);
      if (any(normalized, ["caprese", "panino"])) return runtime.moveToTurn(state, "d22_02_recommendation", {}, "Enzo still states the exact filling and €4 price before the sale.", createId);
      return runtime.moveToTurn(state, state.turnId, {}, "Ask what Enzo recommends, choose directly, or leave.", createId);
    }
    if (state.turnId === "d22_02_recommendation") {
      if (any(normalized, EXIT) || any(normalized, ["non prendo", "decline"])) return runtime.queueTerminal(state, "d22_04_exit", "D22-O2", {}, createId);
      if (any(normalized, ["caprese", "prendo", "take it", "va bene"])) {
        if (state.money < 400) return runtime.queueTerminal(state, "d22_05_funds", "D22-O3", {}, createId);
        return runtime.queueTerminal(state, "d22_03_bought", "D22-O1", {
          money: state.money - 400,
          vendorPreference: "Panino caprese recommended by Enzo",
          inventory: addItem(state.inventory, "Panino caprese"),
          knownFacts: addFact(state.knownFacts, "Enzo recommended the €4 panino caprese"),
          relationships: { ...state.relationships, Enzo: "efficient" },
        }, createId);
      }
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (after.turnId === "d22_02_recommendation") return observation(["request"]);
    if (after.turnId === "d22_03_bought") return observation(["preference", "price", "confirm", "pay"], { preferenceSelected: "panino caprese", priceConfirmed: true });
    if (after.turnId === "d22_04_exit") return observation(["decline", "boundary"]);
    return noObservation();
  },
  adminSeed: () => finalArcAdminSeed(22),
  buildResult: buildObservedEpisodeResult,
};
