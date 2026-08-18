import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, completedBefore } from "./shared";

const metadata = seasonEpisode("day-20");
const permanentWindow = "Friday at 10:00";

export const day20Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "repair-fix",
  scene: { id: "repair-fix", episodeId: "day-20", day: "Day 20", dateLabel: "11 days out", title: metadata.title, location: metadata.location, time: "18:10", npc: "Technician", role: "Repair technician with Raffaele", objective: "Understand that the fix is temporary and confirm or reject the next commitment.", firstTurn: "d20_01_temporary", kicker: "Working now does not mean permanently fixed.", suggestions: ["È una soluzione temporanea?", "Quando arriva il pezzo?", "Venerdì alle dieci va bene."] },
  turns: {
    d20_01_temporary: authoredTurn("d20_01_temporary", "Technician", "Adesso l'acqua è calda, ma è una soluzione temporanea. Il pezzo nuovo arriva venerdì.", "Ask when the permanent repair happens, accept, or reject the temporary fix."),
    d20_01_no_history: authoredTurn("d20_01_no_history", "Raffaele", "Non risulta una riparazione aperta. Vuole segnalare adesso il problema dell'acqua calda?", "Report the problem without inventing prior repair history."),
    d20_02_window: authoredTurn("d20_02_window", "Raffaele", "Il tecnico torna venerdì alle dieci per la riparazione permanente. Va bene?", "Confirm Friday 10:00 or leave it open."),
    d20_03_close: authoredTurn("d20_03_close", "Raffaele", "Confermato: venerdì alle dieci. Per ora l'acqua calda funziona.", "The temporary fix and permanent appointment are recorded.", true),
    d20_04_compensation: authoredTurn("d20_04_compensation", "Raffaele", "Registro la richiesta di una sistemazione alternativa. Non prometto ancora un rimborso.", "A fallback request is recorded without invented compensation.", true),
    d20_05_open: authoredTurn("d20_05_open", "Raffaele", "Va bene. La soluzione resta temporanea e l'appuntamento non è confermato.", "The repair remains open.", true),
  },
  outcomes: {
    "D20-O1": { id: "D20-O1", title: "Temporary fix understood", detail: "You confirmed the permanent repair while keeping the current fix accurately temporary.", consequence: "No charge · Friday 10:00 commitment", tone: "success" },
    "D20-O2": { id: "D20-O2", title: "Fallback requested", detail: "Raffaele recorded an accommodation request without promising compensation.", consequence: "No charge · request pending", tone: "partial" },
    "D20-O3": { id: "D20-O3", title: "Repair remains open", detail: "You rejected or deferred the inadequate fix without confirming a new appointment.", consequence: "No charge · temporary state remains", tone: "open" },
    "D20-O4": { id: "D20-O4", title: "Problem newly recorded", detail: "No earlier repair state existed, so the problem was recorded without a false callback.", consequence: "No charge · Friday 10:00 commitment", tone: "success" },
  },
  terminalOutcomeTurns: { "D20-O1": ["d20_03_close"], "D20-O2": ["d20_04_compensation"], "D20-O3": ["d20_05_open"], "D20-O4": ["d20_03_close"] },
  initialTurn: (state) => state.hotWaterStatus === "reported" || state.repairCommitment ? "d20_01_temporary" : "d20_01_no_history",
  defaultPhrase: "problem",
  phraseExamples: {
    problem: { italian: "È solo una soluzione temporanea?", english: "Is it only a temporary solution?" },
    past_commitment: { italian: "Aveva detto che sarebbe stato riparato.", english: "You said it would be repaired." },
  },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (["d20_01_temporary", "d20_01_no_history"].includes(state.turnId)) {
      if (any(normalized, ["compens", "accommodation", "altra sistemazione", "other lodging"])) return runtime.queueTerminal(state, "d20_04_compensation", "D20-O2", { hotWaterStatus: state.hotWaterStatus === "unknown" ? "reported" : "temporary", repairCommitment: state.repairCommitment ? { ...state.repairCommitment, status: "breached" } : null, commitments: addFact(state.commitments, "Accommodation fallback requested; no refund promised") }, createId);
      if (any(normalized, EXIT) || any(normalized, ["rifiuto", "reject", "non accetto"])) return runtime.queueTerminal(state, "d20_05_open", "D20-O3", { hotWaterStatus: state.hotWaterStatus === "unknown" ? "reported" : "temporary", repairCommitment: state.repairCommitment ? { ...state.repairCommitment, status: "breached" } : null }, createId);
      if (any(normalized, ["temporanea", "temporary", "pezzo", "part", "quando", "when", "acqua calda", "hot water", "problema"])) return runtime.moveToTurn(state, "d20_02_window", {}, undefined, createId);
      return runtime.moveToTurn(state, state.turnId, {}, "Ask whether the fix is temporary or report the missing hot water.", createId);
    }
    if (state.turnId === "d20_02_window") {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d20_05_open", "D20-O3", { hotWaterStatus: "temporary", repairCommitment: { window: permanentWindow, status: "deferred" } }, createId);
      if (any(normalized, ["venerdi", "friday", "dieci", "ten", "va bene", "okay", "si"])) {
        const hadHistory = state.hotWaterStatus !== "unknown" || state.repairCommitment !== null;
        return runtime.queueTerminal(state, "d20_03_close", hadHistory ? "D20-O1" : "D20-O4", { hotWaterStatus: "temporary", repairCommitment: { window: permanentWindow, status: "active" }, commitments: addFact(state.commitments.filter((item) => !item.startsWith("Hot-water repair:")), `Hot-water repair: ${permanentWindow}`), relationships: { ...state.relationships, Raffaele: hadHistory ? "efficient" : "neutral" }, knownFacts: addFact(state.knownFacts, "Hot water works temporarily; permanent part due Friday at 10:00"), currentLocation: metadata.location, currentTime: "18:20" }, createId);
      }
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    if (before.turnId.startsWith("d20_01") && after.turnId === "d20_02_window") moves.push("problem", "request");
    if (after.turnId === "d20_03_close") moves.push("confirm", "recovery");
    if (after.turnId === "d20_04_compensation") moves.push("request", "recovery");
    if (after.turnId === "d20_05_open") moves.push("decline", "boundary");
    return observation(moves, after.turnId === "d20_03_close" ? { problemReported: true, commitmentConfirmed: true } : undefined);
  },
  adminSeed: () => ({ money: 1120, laundryStatus: "clean", transportMode: "bus", transportStatus: "replacement-bus", transportTicketPrice: 240, busTicket: true, ferryMemory: "Ferry cancelled; €10 refunded; replacement bus taken", hotWaterStatus: "reported", repairCommitment: { window: "Today at 18:00", status: "active" }, parcelStatus: "collected", hotelKey: true, apartmentKey: true, rental: "chair", pharmacyItem: "Soothing bite gel", routeFact: "Piazza Alta, opposite Farmacia Luce, five minutes away", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "Soothing bite gel", "Groceries · corrected €4 receipt", "Collected parcel", "Replacement bus ticket"], cafeOutcome: "Both errors corrected", relationships: { Giulia: "efficient", Rosa: "efficient", Raffaele: "strained", Enzo: "efficient" }, knownFacts: ["09:30 ferry cancelled; €10 refunded; €2.40 replacement bus purchased"], commitments: ["Hot-water repair: Today at 18:00"], completed: completedBefore(20), currentLocation: metadata.location, currentTime: "18:10" }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
