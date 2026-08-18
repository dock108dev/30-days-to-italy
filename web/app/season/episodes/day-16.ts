import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, addItem, completedBefore } from "./shared";

const metadata = seasonEpisode("day-16");

export const day16Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "parcel",
  scene: { id: "parcel", episodeId: "day-16", day: "Day 16", dateLabel: "15 days out", title: metadata.title, location: metadata.location, time: "12:05", npc: "Courier", role: "Parcel courier", objective: "Explain that the document is absent and use only the authorized delivery code.", firstTurn: "d16_01_document", kicker: "The allowed alternative is code 4172—not an improvised identity exception.", suggestions: ["Non ho il documento con me.", "Ho il codice di consegna.", "Quattro uno sette due."] },
  turns: {
    d16_01_document: authoredTurn("d16_01_document", "Courier", "Per il pacco mi serve un documento, per favore.", "Explain what you have or request redelivery."),
    d16_02_code: authoredTurn("d16_02_code", "Courier", "Va bene. Posso accettare il codice di consegna nel messaggio. Qual è?", "Give code 4172, schedule redelivery, or leave."),
    d16_03_close: authoredTurn("d16_03_close", "Courier", "Codice quattro uno sette due confermato. Ecco il pacco.", "The authorized code is accepted.", true),
    d16_04_redelivery: authoredTurn("d16_04_redelivery", "Courier", "Torno domani tra le sedici e le diciotto.", "Redelivery is scheduled.", true),
    d16_05_exit: authoredTurn("d16_05_exit", "Courier", "Va bene. Non consegno il pacco oggi.", "The parcel remains pending.", true),
  },
  outcomes: {
    "D16-O1": { id: "D16-O1", title: "Parcel collected", detail: "The courier accepted the authorized delivery code.", consequence: "No charge · parcel collected", tone: "success" },
    "D16-O2": { id: "D16-O2", title: "Redelivery scheduled", detail: "You chose an exact authorized redelivery window.", consequence: "No charge · tomorrow 16:00–18:00", tone: "partial" },
    "D16-O3": { id: "D16-O3", title: "Parcel left pending", detail: "No proof or code was supplied, so the courier kept the parcel.", consequence: "No charge · no invented exception", tone: "open" },
  },
  terminalOutcomeTurns: { "D16-O1": ["d16_03_close"], "D16-O2": ["d16_04_redelivery"], "D16-O3": ["d16_05_exit"] },
  defaultPhrase: "have",
  phraseExamples: {
    have: { italian: "Ho il codice di consegna.", english: "I have the delivery code." },
    problem: { italian: "Non ho il documento con me.", english: "I don’t have the document with me." },
  },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (state.turnId === "d16_01_document") {
      if (any(normalized, ["redelivery", "torna domani", "come back tomorrow"])) return runtime.queueTerminal(state, "d16_04_redelivery", "D16-O2", { parcelStatus: "redelivery", repairCommitment: state.repairCommitment, commitments: addFact(state.commitments, "Parcel redelivery: tomorrow 16:00–18:00") }, createId);
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d16_05_exit", "D16-O3", { parcelStatus: "pending" }, createId);
      if (any(normalized, ["non ho", "don t have", "codice", "code", "documento"])) return runtime.moveToTurn(state, "d16_02_code", { parcelStatus: "pending" }, undefined, createId);
      return runtime.moveToTurn(state, "d16_01_document", {}, "The courier needs the document, the authorized code, or a redelivery request.", createId);
    }
    if (state.turnId === "d16_02_code") {
      if (any(normalized, ["4172", "quattro uno sette due", "four one seven two"])) return runtime.queueTerminal(state, "d16_03_close", "D16-O1", { parcelStatus: "collected", inventory: addItem(state.inventory, "Collected parcel"), knownFacts: addFact(state.knownFacts, "Parcel collected with authorized delivery code 4172"), currentLocation: metadata.location, currentTime: "12:10" }, createId);
      if (any(normalized, ["redelivery", "domani", "tomorrow"])) return runtime.queueTerminal(state, "d16_04_redelivery", "D16-O2", { parcelStatus: "redelivery", commitments: addFact(state.commitments, "Parcel redelivery: tomorrow 16:00–18:00") }, createId);
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d16_05_exit", "D16-O3", { parcelStatus: "pending" }, createId);
      return runtime.moveToTurn(state, "d16_02_code", {}, "Only the exact delivery code is accepted.", createId);
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    if (before.turnId === "d16_01_document" && after.turnId === "d16_02_code") moves.push("problem", "request");
    if (after.turnId === "d16_03_close") moves.push("identify", "confirm", "recovery");
    if (["d16_04_redelivery", "d16_05_exit"].includes(after.turnId)) moves.push("boundary");
    return observation(moves, after.turnId === "d16_03_close" ? { correctionAccepted: true } : undefined);
  },
  adminSeed: () => ({ money: 960, laundryStatus: "clean", transportMode: "ferry", transportStatus: "booked", transportTicketPrice: 1000, hotWaterStatus: "reported", repairCommitment: { window: "Tuesday 09:00–11:00", status: "active" }, hotelKey: true, apartmentKey: true, rental: "chair", pharmacyItem: "Mosquito-bite cream", routeFact: "Piazza Alta, opposite Farmacia Luce, five minutes away", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "Mosquito-bite cream", "Groceries · corrected €4 receipt"], cafeOutcome: "Both errors corrected", relationships: { Giulia: "efficient", Rosa: "efficient", Raffaele: "efficient", Enzo: "efficient" }, knownFacts: ["Enzo corrected the grocery total from €7.20 to €4.00"], commitments: ["Hot-water repair: Tuesday 09:00–11:00"], completed: completedBefore(16), currentLocation: metadata.location, currentTime: "12:05" }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
