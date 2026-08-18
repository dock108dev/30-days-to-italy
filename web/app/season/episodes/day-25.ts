import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";
import { addFact, finalArcAdminSeed } from "./shared";

const metadata = seasonEpisode("day-25");

export const day25Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "invitation",
  scene: { id: "invitation", episodeId: "day-25", day: "Day 25", dateLabel: "Tomorrow at 19:30", title: metadata.title, location: metadata.location, time: "18:15", npc: "Giulia", role: "Bartender", objective: "Understand the invitation for tomorrow at 19:30 and answer without implying future attendance.", firstTurn: "d25_01_invite", kicker: "An answer to an invitation is not evidence that the event happened.", suggestions: ["Domani alle diciannove e trenta?", "Forse. Non lo so ancora.", "No, grazie."] },
  turns: {
    d25_01_invite: authoredTurn("d25_01_invite", "Giulia", "Domani verso le diciannove e trenta facciamo un piccolo aperitivo qui. Vuoi venire?", "Accept, say maybe, decline, or ask when."),
    d25_02_time: authoredTurn("d25_02_time", "Giulia", "Sì, domani alle diciannove e trenta, qui al bar.", "Now answer the invitation."),
    d25_03_maybe: authoredTurn("d25_03_maybe", "Giulia", "Va bene. Se vieni, ci vediamo qui.", "Maybe recorded; attendance remains unknown.", true),
    d25_04_yes: authoredTurn("d25_04_yes", "Giulia", "Perfetto. Allora forse ci vediamo domani.", "Acceptance recorded; attendance remains unknown.", true),
    d25_05_no: authoredTurn("d25_05_no", "Giulia", "Nessun problema. A presto.", "Invitation declined.", true),
    d25_06_exit: authoredTurn("d25_06_exit", "Giulia", "Va bene. Ne riparliamo.", "No response inferred.", true),
  },
  outcomes: {
    "D25-O1": { id: "D25-O1", title: "Maybe, truthfully", detail: "You said you were not sure yet about tomorrow at 19:30.", consequence: "No charge · response maybe · attendance unknown", tone: "success" },
    "D25-O2": { id: "D25-O2", title: "Invitation accepted", detail: "You accepted the invitation; the game does not claim that you later attended.", consequence: "No charge · attendance unknown", tone: "success" },
    "D25-O3": { id: "D25-O3", title: "Invitation declined", detail: "Giulia accepted the answer without pressure.", consequence: "No charge · declined", tone: "success" },
    "D25-O4": { id: "D25-O4", title: "Question left open", detail: "You left before answering, so no response or attendance was invented.", consequence: "No charge · no response recorded", tone: "open" },
  },
  terminalOutcomeTurns: { "D25-O1": ["d25_03_maybe"], "D25-O2": ["d25_04_yes"], "D25-O3": ["d25_05_no"], "D25-O4": ["d25_06_exit"] },
  defaultPhrase: "uncertainty",
  phraseExamples: { uncertainty: { italian: "Non lo so ancora.", english: "I’m not sure yet." } },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (["d25_01_invite", "d25_02_time"].includes(state.turnId)) {
      if (state.turnId === "d25_01_invite" && any(normalized, ["quando", "what time", "che ora", "diciannove", "19 30"])) return runtime.moveToTurn(state, "d25_02_time", {}, undefined, createId);
      if (any(normalized, ["non lo so", "not sure", "forse", "maybe", "vediamo"])) return runtime.queueTerminal(state, "d25_03_maybe", "D25-O1", { invitationResponse: "maybe", eventAttendance: "unknown", knownFacts: addFact(state.knownFacts, "Invitation: tomorrow at 19:30; response maybe") }, createId);
      if (any(normalized, ["si", "yes", "vengo", "accept"]) && !any(normalized, EXIT)) return runtime.queueTerminal(state, "d25_04_yes", "D25-O2", { invitationResponse: "accepted", eventAttendance: "unknown" }, createId);
      if (any(normalized, ["no", "non posso", "decline"])) return runtime.queueTerminal(state, "d25_05_no", "D25-O3", { invitationResponse: "declined", eventAttendance: "unknown" }, createId);
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d25_06_exit", "D25-O4", { invitationResponse: "none", eventAttendance: "unknown" }, createId);
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (after.turnId === "d25_02_time") return observation(["request"]);
    if (after.turnId === "d25_03_maybe") return observation(["boundary", "confirm"]);
    if (after.turnId === "d25_04_yes") return observation(["confirm"]);
    if (after.turnId === "d25_05_no") return observation(["decline", "boundary"]);
    return noObservation();
  },
  adminSeed: () => finalArcAdminSeed(25), buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
