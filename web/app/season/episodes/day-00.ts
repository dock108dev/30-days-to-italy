import { EXIT, YES, NO, any, anyWholePhrase } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";

const metadata = seasonEpisode("day-00");

const day00Teaching = {
  e01_01_name: {
    success: { understood: "You identified the check-in booking as Fuscoletti.", natural: "Ho una prenotazione a nome Fuscoletti.", tryNext: "Listen for camera and piano when Elena gives the key." },
    partial: { understood: "We recognized that you are checking in, but the booking surname is still missing.", natural: "Ho una prenotazione a nome ___.", tryNext: "Add the surname on the reservation." },
    failed: { understood: "Nothing actionable was recognized yet; the booking surname is still missing.", natural: "Ho una prenotazione a nome ___.", tryNext: "Say the surname on the booking." },
    fallback: { understood: "Nothing actionable was recognized yet; the booking surname is still missing.", natural: "Ho una prenotazione a nome ___.", tryNext: "Use the help ladder for a smaller hint." },
    exit: { understood: "You chose to end the interaction before identifying the booking.", natural: "Devo andare, torno più tardi." },
  },
  e01_02_clarify_name: {
    success: { understood: "You repeated the booking surname as Fuscoletti.", natural: "Il cognome è Fuscoletti.", tryNext: "Listen for camera and piano when Elena gives the key." },
    failed: { understood: "Nothing actionable was recognized yet; Elena still needs the surname.", natural: "Il cognome è ___.", tryNext: "Repeat only the surname." },
    fallback: { understood: "Nothing actionable was recognized yet; Elena still needs the surname.", natural: "Il cognome è ___.", tryNext: "Use the help ladder for a smaller hint." },
    exit: { understood: "You chose to end the interaction before repeating the surname.", natural: "Devo andare, torno più tardi." },
  },
  e01_03_key: {
    both: { understood: "You confirmed room 12 and the first floor.", natural: "Ho capito: camera dodici, al primo piano." },
    room: { understood: "You confirmed room 12.", natural: "Ho capito: camera dodici.", tryNext: "Listen for piano when someone gives a floor." },
    floor: { understood: "You confirmed the first floor.", natural: "Ho capito: al primo piano.", tryNext: "Listen for camera when someone gives a room number." },
    clear: { understood: "You said the directions were clear; you did not repeat a room or floor fact.", natural: "Ho capito, grazie." },
    breakfast: { understood: "You asked about breakfast after receiving the key.", natural: "A che ora finisce la colazione?", tryNext: "Listen for the time in Elena’s reply." },
    failed: { understood: "Nothing actionable was recognized yet; no room or floor fact was confirmed.", natural: "Ho capito: camera ___, al ___ piano.", tryNext: "Repeat one fact you heard, or leave on your terms." },
    fallback: { understood: "Nothing actionable was recognized yet; no room or floor fact was confirmed.", natural: "Ho capito: camera ___, al ___ piano.", tryNext: "Use the help ladder for one Italian cue." },
    exit: { understood: "You ended the interaction after receiving the key; room and floor confirmation was left open.", natural: "Grazie, buonanotte." },
  },
  e01_04_breakfast: {
    time: { understood: "You confirmed that breakfast ends at 10.", natural: "Ho capito: la colazione finisce alle dieci." },
    clear: { understood: "You said the breakfast information was clear; you did not repeat the time.", natural: "Ho capito, grazie." },
    failed: { understood: "Nothing actionable was recognized yet; the breakfast time was not confirmed.", natural: "La colazione finisce alle ___.", tryNext: "Listen for alle dieci." },
    fallback: { understood: "Nothing actionable was recognized yet; the breakfast time was not confirmed.", natural: "La colazione finisce alle ___.", tryNext: "Use the help ladder for one Italian cue." },
    exit: { understood: "You ended the interaction with the key; the breakfast time remains unconfirmed.", natural: "Grazie, buonanotte." },
  },
  e01_05_optional: {
    yes: { understood: "You said this is your first time in Salerno.", natural: "Sì, è la mia prima volta a Salerno." },
    no: { understood: "You said this is not your first time in Salerno.", natural: "No, sono già stato a Salerno." },
    failed: { understood: "Nothing actionable was recognized yet; the first-time question is still open.", natural: "Sì, è la mia ___ volta.", tryNext: "Answer sì or no, or end the conversation." },
    fallback: { understood: "Nothing actionable was recognized yet; the first-time question is still open.", natural: "Sì, è la mia ___ volta.", tryNext: "Use the help ladder for one Italian cue." },
    exit: { understood: "You chose to end the optional conversation.", natural: "Grazie, buonanotte." },
  },
} as const;

export const day00Episode: EpisodeDefinition = {
  ...metadata, sceneId: "hotel",
  scene: { id: "hotel", episodeId: "day-00", day: "Day 0", dateLabel: "Arrival", title: metadata.title, location: metadata.location, time: "21:40", npc: "Elena", role: "Night clerk", objective: "Check in and find your room.", firstTurn: "e01_01_name", kicker: "You have just arrived, tired and carrying your bag.", suggestions: ["Fuscoletti. Ho una prenotazione.", "Può ripetere?", "Grazie. Buonanotte."] },
  turns: {
    e01_01_name: authoredTurn("e01_01_name", "Elena", "Buonasera. Ha una prenotazione? A che nome?", "Give the booking name.", false, {
      listenFor: ["prenotazione", "a che nome"],
      meaning: "Elena asks whether you have a reservation and the name on it.",
      frame: "Ho una prenotazione a nome ___.",
      model: "Ho una prenotazione a nome Fuscoletti.",
    }, day00Teaching.e01_01_name),
    e01_02_clarify_name: authoredTurn("e01_02_clarify_name", "Elena", "Mi scusi, può ripetere il cognome?", "Repeat the surname.", false, {
      listenFor: ["ripetere", "cognome"],
      meaning: "Elena did not catch your surname and asks you to repeat it.",
      frame: "Il cognome è ___.",
      model: "Il cognome è Fuscoletti.",
    }, day00Teaching.e01_02_clarify_name),
    e01_03_key: authoredTurn("e01_03_key", "Elena", "Perfetto. Camera dodici, al primo piano. Ecco la chiave.", "Confirm the room or floor, say buonanotte, or ask about breakfast.", false, {
      listenFor: ["camera dodici", "primo piano"],
      meaning: "Elena gives you the key and says room 12 is on the first floor.",
      frame: "Ho capito: camera ___, al ___ piano.",
      model: "Ho capito: camera dodici, al primo piano. Grazie.",
    }, day00Teaching.e01_03_key),
    e01_04_breakfast: authoredTurn("e01_04_breakfast", "Elena", "La colazione finisce alle dieci. Ha bisogno di altro?", "Confirm what you understood, or say buonanotte to end.", false, {
      listenFor: ["colazione", "alle dieci"],
      meaning: "Elena says breakfast ends at 10 and asks whether you need anything else.",
      frame: "Ho capito: la colazione finisce alle ___.",
      model: "Ho capito: la colazione finisce alle dieci. Grazie.",
    }, day00Teaching.e01_04_breakfast),
    e01_05_optional: authoredTurn("e01_05_optional", "Elena", "È la prima volta a Salerno?", "Answer briefly, or say buonanotte to end.", false, {
      listenFor: ["prima volta", "Salerno"],
      meaning: "Elena asks whether this is your first time in Salerno.",
      frame: "Sì, è la mia ___ volta.",
      model: "Sì, è la mia prima volta a Salerno.",
    }, day00Teaching.e01_05_optional),
    e01_06_boundary: authoredTurn("e01_06_boundary", "Elena", "Certo. Buonanotte e buon riposo.", "The interaction is ending.", true),
  },
  outcomes: {
    "E1-O1": { id: "E1-O1", title: "Key in hand", detail: "You checked in, understood the room information, and left on your terms.", consequence: "Room 12 · first floor · breakfast ends at 10:00", tone: "success" },
    "E1-O2": { id: "E1-O2", title: "Booking clarified", detail: "Elena found the reservation after one necessary clarification. No extra conversation was required.", consequence: "Hotel key issued · five minutes passed", tone: "success" },
    "E1-O3": { id: "E1-O3", title: "Straight to the room", detail: "You got the key and ended the encounter before any optional conversation.", consequence: "Room 12 · first floor · no social obligation", tone: "success" },
    "E1-O4": { id: "E1-O4", title: "Check-in paused", detail: "You left before the booking was confirmed. The reservation is still valid when you return.", consequence: "No key issued · no money lost", tone: "open" },
  },
  terminalOutcomeTurns: { "E1-O1": ["e01_06_boundary"], "E1-O2": ["e01_06_boundary"], "E1-O3": ["e01_06_boundary"] },
  evaluateResponse({ state, normalized, createId, runtime }) {
    const exit = any(normalized, EXIT);
    const identity = any(normalized, ["fuscoletti"]);
    if (state.turnId === "e01_01_name" || state.turnId === "e01_02_clarify_name") {
      const turnFeedback = state.turnId === "e01_01_name" ? day00Teaching.e01_01_name : day00Teaching.e01_02_clarify_name;
      if (exit && !identity) return runtime.resolveOutcome(state, "E1-O4", { teachingFeedback: turnFeedback.exit }, null, createId);
      if (identity) return runtime.moveToTurn(state, "e01_03_key", { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" }, attempts: 0, teachingFeedback: turnFeedback.success }, "Booking matched. Listen for the room and floor, then end the exchange or ask about breakfast.", createId);
      const reservationIntent = any(normalized, ["prenotazione", "prenotato", "check in"]);
      return runtime.moveToTurn(state, "e01_02_clarify_name", { attempts: state.attempts + 1, teachingFeedback: state.turnId === "e01_01_name" && reservationIntent ? day00Teaching.e01_01_name.partial : turnFeedback.failed }, state.attempts >= 1 ? "The surname is still unclear. You can type “Show booking confirmation.”" : "Only the booking surname needs clarification.", createId);
    }
    if (state.turnId === "e01_03_key") {
      if (exit) return runtime.queueTerminal(state, "e01_06_boundary", "E1-O3", { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" }, teachingFeedback: day00Teaching.e01_03_key.exit }, createId);
      const roomConfirmed = any(normalized, ["camera dodici", "camera 12"]);
      const floorConfirmed = any(normalized, ["primo piano"]);
      const understandingConfirmed = any(normalized, ["ho capito", "tutto chiaro", "e chiaro"]);
      if (roomConfirmed || floorConfirmed || understandingConfirmed) {
        const teachingFeedback = roomConfirmed && floorConfirmed ? day00Teaching.e01_03_key.both
          : roomConfirmed ? day00Teaching.e01_03_key.room
            : floorConfirmed ? day00Teaching.e01_03_key.floor
              : day00Teaching.e01_03_key.clear;
        return runtime.queueTerminal(state, "e01_06_boundary", "E1-O3", { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" }, teachingFeedback }, createId);
      }
      if (any(normalized, ["colazione"])) {
        return runtime.moveToTurn(state, "e01_04_breakfast", { breakfastKnown: false, teachingFeedback: day00Teaching.e01_03_key.breakfast }, undefined, createId);
      }
      return runtime.moveToTurn(state, "e01_03_key", { teachingFeedback: day00Teaching.e01_03_key.failed }, "Confirm room 12 or the first floor in Italian, or say buonanotte to leave with the key.", createId);
    }
    if (state.turnId === "e01_04_breakfast") {
      if (exit) return runtime.queueTerminal(state, "e01_06_boundary", "E1-O3", { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" }, breakfastKnown: false, teachingFeedback: day00Teaching.e01_04_breakfast.exit }, createId);
      const timeConfirmed = any(normalized, ["dieci"]);
      const clear = any(normalized, ["ho capito", "tutto chiaro", "e chiaro"]);
      if (timeConfirmed || clear) return runtime.queueTerminal(state, "e01_06_boundary", "E1-O1", { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" }, breakfastKnown: true, teachingFeedback: timeConfirmed ? day00Teaching.e01_04_breakfast.time : day00Teaching.e01_04_breakfast.clear }, createId);
      return runtime.moveToTurn(state, "e01_04_breakfast", { teachingFeedback: day00Teaching.e01_04_breakfast.failed }, "Confirm the 10:00 breakfast time in Italian, or say buonanotte to leave with the key.", createId);
    }
    if (state.turnId === "e01_05_optional") {
      if (exit) return runtime.queueTerminal(state, "e01_06_boundary", "E1-O1", { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" }, breakfastKnown: true, teachingFeedback: day00Teaching.e01_05_optional.exit }, createId);
      if (anyWholePhrase(normalized, YES)) return runtime.queueTerminal(state, "e01_06_boundary", "E1-O1", { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" }, breakfastKnown: true, teachingFeedback: day00Teaching.e01_05_optional.yes }, createId);
      if (anyWholePhrase(normalized, NO)) return runtime.queueTerminal(state, "e01_06_boundary", "E1-O1", { hotelKey: true, keyCustody: { ...state.keyCustody, hotel: "held" }, breakfastKnown: true, teachingFeedback: day00Teaching.e01_05_optional.no }, createId);
      return runtime.moveToTurn(state, "e01_05_optional", { teachingFeedback: day00Teaching.e01_05_optional.failed }, "Answer sì or no in Italian, or say buonanotte to end.", createId);
    }
    return state;
  },
  observeResponse({ before, after, normalized }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (["e01_01_name", "e01_02_clarify_name"].includes(before.turnId) && after.turnId === "e01_03_key") return observation(["identify"]);
    if (before.turnId === "e01_03_key" && after.turnId === "e01_06_boundary") return observation(any(normalized, EXIT) ? ["boundary"] : ["location", "confirm"]);
    if (["e01_04_breakfast", "e01_05_optional"].includes(before.turnId) && after.turnId === "e01_06_boundary") return observation(["boundary"]);
    return noObservation();
  },
  adminSeed: () => ({}), buildResult: buildObservedEpisodeResult,
};
