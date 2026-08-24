import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, completedBefore } from "./shared";

const metadata = seasonEpisode("day-17");
const revisedWindow = "Today at 18:00";

export const day17Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "repair-reminder",
  scene: { id: "repair-reminder", episodeId: "day-17", day: "Day 17", dateLabel: "14 days out", title: metadata.title, location: metadata.location, time: "10:30", npc: "Raffaele", role: "Apartment caretaker", objective: "Correct the remembered repair time or establish a truthful new commitment.", firstTurn: "d17_01_mismatch", kicker: "The saved commitment—not politeness or warmth—decides what Raffaele may claim.", suggestions: ["Aveva detto martedì mattina.", "Il problema continua.", "Oggi alle diciotto va bene."] },
  turns: {
    d17_01_mismatch: authoredTurn("d17_01_mismatch", "Raffaele", "Avevamo detto mercoledì pomeriggio, giusto?", "Correct the saved Tuesday-morning commitment."),
    d17_01_no_commitment: authoredTurn("d17_01_no_commitment", "Raffaele", "Non vedo un appuntamento confermato. Vuole fissarne uno adesso?", "Establish a new commitment without pretending one existed."),
    d17_02_offer: authoredTurn("d17_02_offer", "Raffaele", "Ha ragione. Posso venire oggi alle diciotto. Va bene?", "Confirm 18:00 or leave the issue open."),
    d17_03_close: authoredTurn("d17_03_close", "Raffaele", "Confermato: oggi alle diciotto.", "The revised commitment is recorded.", true),
    d17_04_open: authoredTurn("d17_04_open", "Raffaele", "Va bene. Il problema resta aperto senza un nuovo orario.", "No new appointment is recorded.", true),
  },
  outcomes: {
    "D17-O1": { id: "D17-O1", title: "Promise corrected", detail: "You used the recorded commitment and confirmed a new exact time.", consequence: "No charge · repair today at 18:00", tone: "success" },
    "D17-O2": { id: "D17-O2", title: "New commitment established", detail: "No prior appointment existed, so you created one truthfully.", consequence: "No charge · repair today at 18:00", tone: "success" },
    "D17-O3": { id: "D17-O3", title: "Repair remains open", detail: "You ended without accepting a revised time.", consequence: "No charge · commitment unresolved", tone: "open" },
  },
  terminalOutcomeTurns: { "D17-O1": ["d17_03_close"], "D17-O2": ["d17_03_close"], "D17-O3": ["d17_04_open"] },
  initialTurn: (state) => state.repairCommitment?.status === "active" ? "d17_01_mismatch" : "d17_01_no_commitment",
  defaultPhrase: "past_commitment",
  phraseExamples: {
    past_commitment: { italian: "Aveva detto martedì mattina.", english: "You said Tuesday morning." },
    problem: { italian: "Il problema continua.", english: "The problem is continuing." },
  },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (["d17_01_mismatch", "d17_01_no_commitment"].includes(state.turnId)) {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d17_04_open", "D17-O3", { repairCommitment: state.repairCommitment ? { ...state.repairCommitment, status: "breached" } : null }, createId);
      const referenced = any(normalized, ["aveva detto", "you said", "martedi", "tuesday", "mattina", "morning"]);
      const asksNew = any(normalized, ["fiss", "appointment", "quando", "when", "problema", "problem", "acqua calda"]);
      if ((state.turnId === "d17_01_mismatch" && referenced) || (state.turnId === "d17_01_no_commitment" && asksNew)) return runtime.moveToTurn(state, "d17_02_offer", {}, undefined, createId);
      return runtime.moveToTurn(state, state.turnId, {}, "Use the recorded promise if it exists; otherwise request a new time.", createId);
    }
    if (state.turnId === "d17_02_offer") {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d17_04_open", "D17-O3", { repairCommitment: state.repairCommitment ? { ...state.repairCommitment, status: "breached" } : null }, createId);
      if (any(normalized, ["problema continua", "problem continues", "acqua calda"])) return runtime.moveToTurn(state, state.turnId, {}, "The problem remains open. Confirm today at 18:00 or leave without a new time.", createId);
      if (any(normalized, ["diciotto", "18", "six", "va bene", "okay", "si"])) {
        const hadCommitment = state.repairCommitment !== null;
        return runtime.queueTerminal(state, "d17_03_close", hadCommitment ? "D17-O1" : "D17-O2", { hotWaterStatus: "reported", repairCommitment: { window: revisedWindow, status: "active" }, commitments: addFact(state.commitments.filter((item) => !item.startsWith("Hot-water repair:")), `Hot-water repair: ${revisedWindow}`), relationships: { ...state.relationships, Raffaele: hadCommitment ? "strained" : "efficient" }, knownFacts: addFact(state.knownFacts, hadCommitment ? "Raffaele corrected the missed repair commitment" : "A new hot-water repair commitment was established"), currentLocation: metadata.location, currentTime: "10:35" }, createId);
      }
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    if (before.turnId === "d17_01_mismatch" && after.turnId === "d17_02_offer") moves.push("problem", "recovery");
    if (before.turnId === "d17_01_no_commitment" && after.turnId === "d17_02_offer") moves.push("request", "problem");
    if (after.turnId === "d17_03_close") moves.push("confirm");
    if (after.turnId === "d17_04_open") moves.push("boundary");
    return observation(moves, after.turnId === "d17_03_close" ? { commitmentConfirmed: true, problemReported: true } : undefined);
  },
  adminSeed: () => ({ money: 960, laundryStatus: "clean", transportMode: "ferry", transportStatus: "booked", transportTicketPrice: 1000, hotWaterStatus: "reported", repairCommitment: { window: "Tuesday 09:00–11:00", status: "active" }, parcelStatus: "collected", hotelKey: true, apartmentKey: true, rental: "chair", pharmacyItem: "Mosquito-bite cream", routeFact: "Piazza Alta, opposite Farmacia Luce, five minutes away", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "Mosquito-bite cream", "Groceries · corrected €4 receipt", "Collected parcel"], cafeOutcome: "Both errors corrected", relationships: { Giulia: "efficient", Rosa: "efficient", Raffaele: "efficient", Enzo: "efficient" }, knownFacts: ["Parcel collected with authorized delivery code 4172"], commitments: ["Hot-water repair: Tuesday 09:00–11:00"], completed: completedBefore(17), currentLocation: metadata.location, currentTime: "10:30" }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
