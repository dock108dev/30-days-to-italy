import { EXIT, any, createFeedback } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";

const metadata = seasonEpisode("day-00");

export const day00Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "hotel",
  scene: { id: "hotel", episodeId: "day-00", day: "Day 0", dateLabel: "Arrival", title: metadata.title, location: metadata.location, time: "21:40", npc: "Elena", role: "Night clerk", objective: "Check in and find your room.", firstTurn: "e01_01_name", kicker: "You have just arrived, tired and carrying your bag.", suggestions: ["Fuscoletti. Ho una prenotazione.", "Può ripetere?", "Grazie. Buonanotte."] },
  turns: {
    e01_01_name: authoredTurn("e01_01_name", "Elena", "Buonasera. Ha una prenotazione? A che nome?", "Give the booking name."),
    e01_02_clarify_name: authoredTurn("e01_02_clarify_name", "Elena", "Mi scusi, può ripetere il cognome?", "Repeat the surname."),
    e01_03_key: authoredTurn("e01_03_key", "Elena", "Perfetto. Camera dodici, al primo piano. Ecco la chiave.", "Reply grazie to end, or ask about breakfast."),
    e01_04_breakfast: authoredTurn("e01_04_breakfast", "Elena", "La colazione finisce alle dieci. Ha bisogno di altro?", "Reply grazie to end, or ask one more question."),
    e01_05_optional: authoredTurn("e01_05_optional", "Elena", "È la prima volta a Salerno?", "Answer briefly, or say buonanotte to end."),
    e01_06_boundary: authoredTurn("e01_06_boundary", "Elena", "Certo. Buonanotte e buon riposo.", "The interaction is ending.", true),
  },
  outcomes: {
    "E1-O1": { id: "E1-O1", title: "Key in hand", detail: "You checked in, understood the room information, and left on your terms.", consequence: "Room 12 · first floor · breakfast ends at 10:00", tone: "success" },
    "E1-O2": { id: "E1-O2", title: "Booking clarified", detail: "Elena found the reservation after one necessary clarification. No extra conversation was required.", consequence: "Hotel key issued · five minutes passed", tone: "success" },
    "E1-O3": { id: "E1-O3", title: "Straight to the room", detail: "You got the key and ended the encounter before any optional conversation.", consequence: "Room 12 · first floor · no social obligation", tone: "success" },
    "E1-O4": { id: "E1-O4", title: "Check-in paused", detail: "You left before the booking was confirmed. The reservation is still valid when you return.", consequence: "No key issued · no money lost", tone: "open" },
  },
  terminalOutcomeTurns: { "E1-O1": ["e01_06_boundary"], "E1-O2": ["e01_06_boundary"], "E1-O3": ["e01_06_boundary"] },
  evaluateResponse({ state, normalized, raw, createId, runtime }) {
    const exit = any(normalized, EXIT);
    const identity = any(normalized, ["fuscoletti", "prenot", "booking", "reservation", "conferma"]);
    if (state.turnId === "e01_01_name" || state.turnId === "e01_02_clarify_name") {
      if (exit && !identity) return runtime.resolveOutcome(state, "E1-O4", {}, null, createId);
      if (identity) return runtime.moveToTurn(state, "e01_03_key", { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" }, attempts: 0, feedback: createFeedback("hotel", raw) }, "Booking matched. Listen for the room and floor, then end the exchange or ask about breakfast.", createId);
      return runtime.moveToTurn(state, "e01_02_clarify_name", { attempts: state.attempts + 1 }, state.attempts >= 1 ? "The surname is still unclear. You can type “Show booking confirmation.”" : "Only the booking surname needs clarification.", createId);
    }
    if (state.turnId === "e01_03_key") {
      if (exit || any(normalized, ["grazie", "thanks", "camera", "room", "dodici", "primo piano"])) return runtime.queueTerminal(state, "e01_06_boundary", state.attempts > 0 ? "E1-O2" : "E1-O3", { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" } }, createId);
      return runtime.moveToTurn(state, "e01_04_breakfast", { breakfastKnown: false }, undefined, createId);
    }
    if (state.turnId === "e01_04_breakfast") {
      if (exit || any(normalized, ["grazie", "thanks", "dieci", "ten", "capito", "okay", "ok"])) return runtime.queueTerminal(state, "e01_06_boundary", "E1-O1", { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" }, breakfastKnown: true }, createId);
      return runtime.moveToTurn(state, "e01_05_optional", { breakfastKnown: true }, undefined, createId);
    }
    if (state.turnId === "e01_05_optional") return runtime.queueTerminal(state, "e01_06_boundary", "E1-O1", { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" }, breakfastKnown: true }, createId);
    return state;
  },
  observeResponse({ before, after, normalized }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (["e01_01_name", "e01_02_clarify_name"].includes(before.turnId) && after.turnId === "e01_03_key") return observation(["identify"]);
    if (before.turnId === "e01_03_key" && after.turnId === "e01_06_boundary") return observation(any(normalized, EXIT) ? ["boundary"] : ["location", "confirm"]);
    if (["e01_04_breakfast", "e01_05_optional"].includes(before.turnId) && after.turnId === "e01_06_boundary") return observation(["boundary"]);
    return noObservation();
  },
  adminSeed: () => ({}), buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
