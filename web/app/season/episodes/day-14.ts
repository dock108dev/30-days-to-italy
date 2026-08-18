import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, completedBefore } from "./shared";

const metadata = seasonEpisode("day-14");
const temporaryStop = "Piazza Alta, opposite Farmacia Luce, five minutes away";

export const day14Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "changed-stop",
  scene: { id: "changed-stop", episodeId: "day-14", day: "Day 14", dateLabel: "17 days out", title: metadata.title, location: metadata.location, time: "08:55", npc: "Attendant", role: "Bus attendant", objective: "Ignore the closed old stop and confirm the temporary stop before continuing.", firstTurn: "d14_01_change", kicker: "Both stop names are spoken; only Piazza Alta is active today.", suggestions: ["Qual è la fermata provvisoria?", "Piazza Alta, di fronte alla farmacia?", "Aspetto il prossimo autobus."] },
  turns: {
    d14_01_change: authoredTurn("d14_01_change", "Attendant", "La fermata Porto è chiusa. Oggi l'autobus parte dalla fermata provvisoria di Piazza Alta.", "Ask where Piazza Alta is or confirm the change."),
    d14_02_direction: authoredTurn("d14_02_direction", "Attendant", "Piazza Alta è di fronte alla Farmacia Luce, a cinque minuti da qui.", "Confirm the temporary stop, wait, or abandon the trip."),
    d14_03_close: authoredTurn("d14_03_close", "Attendant", "Esatto. Piazza Alta, davanti alla farmacia.", "The temporary route is confirmed.", true),
    d14_04_wait: authoredTurn("d14_04_wait", "Attendant", "Va bene. Il prossimo autobus passa più tardi.", "You wait without using the ticket.", true),
    d14_05_exit: authoredTurn("d14_05_exit", "Attendant", "D'accordo. Oggi non prende l'autobus.", "The trip is abandoned without a new fare.", true),
  },
  outcomes: {
    "D14-O1": { id: "D14-O1", title: "Temporary stop found", detail: "You separated the closed Porto stop from the active Piazza Alta stop.", consequence: "No new fare · route continues from Piazza Alta", tone: "success" },
    "D14-O2": { id: "D14-O2", title: "Later bus chosen", detail: "You kept the ticket and chose to wait.", consequence: "No new fare · time delayed", tone: "partial" },
    "D14-O3": { id: "D14-O3", title: "Trip abandoned", detail: "You left without following the changed route.", consequence: "No new fare", tone: "open" },
  },
  terminalOutcomeTurns: { "D14-O1": ["d14_03_close"], "D14-O2": ["d14_04_wait"], "D14-O3": ["d14_05_exit"] },
  defaultPhrase: "where",
  phraseExamples: {
    where: { italian: "Dov'è la fermata provvisoria?", english: "Where is the temporary stop?" },
    confirm: { italian: "Piazza Alta, di fronte alla farmacia. Giusto?", english: "Piazza Alta, opposite the pharmacy. Right?" },
  },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (state.turnId === "d14_01_change") {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d14_05_exit", "D14-O3", {}, createId);
      if (any(normalized, ["dov e", "where", "piazza alta", "provvisoria", "temporary"])) return runtime.moveToTurn(state, "d14_02_direction", {}, undefined, createId);
      return runtime.moveToTurn(state, "d14_01_change", {}, "Porto is closed; ask about Piazza Alta.", createId);
    }
    if (state.turnId === "d14_02_direction") {
      if (any(normalized, ["aspetto", "wait", "prossimo", "next"])) return runtime.queueTerminal(state, "d14_04_wait", "D14-O2", { currentTime: "09:25" }, createId);
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d14_05_exit", "D14-O3", {}, createId);
      if (any(normalized, ["piazza alta", "farmacia", "pharmacy", "cinque", "five", "giusto", "right"])) return runtime.queueTerminal(state, "d14_03_close", "D14-O1", { routeFact: temporaryStop, currentLocation: "Piazza Alta · Marina di Lume", currentTime: "09:00", knownFacts: addFact(state.knownFacts, `Temporary bus stop: ${temporaryStop}`) }, createId);
      return runtime.moveToTurn(state, "d14_02_direction", {}, "Confirm Piazza Alta opposite Farmacia Luce, or choose another action.", createId);
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    if (before.turnId === "d14_01_change" && after.turnId === "d14_02_direction") moves.push("location", "request");
    if (after.turnId === "d14_03_close") moves.push("location", "confirm", "recovery");
    if (["d14_04_wait", "d14_05_exit"].includes(after.turnId)) moves.push("boundary");
    return observation(moves, after.turnId === "d14_03_close" ? { routeConfirmed: true } : undefined);
  },
  adminSeed: () => ({ money: 1360, laundryStatus: "clean", transportMode: "ferry", transportStatus: "booked", transportTicketPrice: 1000, hotWaterStatus: "reported", repairCommitment: { window: "Tuesday 09:00–11:00", status: "active" }, hotelKey: true, apartmentKey: true, rental: "chair", pharmacyItem: "Mosquito-bite cream", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "Mosquito-bite cream"], cafeOutcome: "Both errors corrected", relationships: { Giulia: "efficient", Rosa: "efficient", Raffaele: "efficient" }, knownFacts: ["Lido alternative: shaded chair under pergola, no umbrella, €8", "Giulia corrected both café errors"], commitments: ["Hot-water repair: Tuesday 09:00–11:00"], completed: completedBefore(14), currentLocation: metadata.location, currentTime: "08:55" }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
