import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, addItem, completedBefore } from "./shared";

const metadata = seasonEpisode("day-18");

export const day18Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "pharmacy-substitute",
  scene: { id: "pharmacy-substitute", episodeId: "day-18", day: "Day 18", dateLabel: "13 days out", title: metadata.title, location: metadata.location, time: "16:15", npc: "Sara", role: "Pharmacist", objective: "Understand that the original cream is unavailable and choose only a stated substitute.", firstTurn: "d18_01_unavailable", kicker: "The gel and spray are alternatives, not medically identical products.", suggestions: ["C'è un'alternativa?", "Qual è la differenza?", "Prendo il gel da sei euro."] },
  turns: {
    d18_01_unavailable: authoredTurn("d18_01_unavailable", "Sara", "La crema per le punture oggi non è disponibile.", "Ask for an alternative or leave."),
    d18_02_options: authoredTurn("d18_02_options", "Sara", "Ho un gel lenitivo da sei euro oppure uno spray da otto. Sono prodotti diversi.", "Choose gel, spray, wait, or decline."),
    d18_03_gel: authoredTurn("d18_03_gel", "Sara", "Va bene: il gel da sei euro.", "The gel is selected.", true),
    d18_04_spray: authoredTurn("d18_04_spray", "Sara", "Va bene: lo spray da otto euro.", "The spray is selected.", true),
    d18_05_exit: authoredTurn("d18_05_exit", "Sara", "Nessun problema. Non prende niente oggi.", "No product and no charge.", true),
    d18_06_funds: authoredTurn("d18_06_funds", "Sara", "Non basta per questo prodotto. Non addebito niente.", "No product and no negative balance.", true),
  },
  outcomes: {
    "D18-O1": { id: "D18-O1", title: "Gel selected", detail: "You chose the €6 gel as a stated alternative.", consequence: "−€6.00 · gel added to inventory", tone: "success" },
    "D18-O2": { id: "D18-O2", title: "Spray selected", detail: "You chose the €8 spray knowingly.", consequence: "−€8.00 · spray added to inventory", tone: "success" },
    "D18-O3": { id: "D18-O3", title: "No substitute purchased", detail: "You declined or chose to wait for the original cream.", consequence: "No charge", tone: "open" },
    "D18-O4": { id: "D18-O4", title: "Purchase stopped", detail: "No product was sold because the selected option exceeded the balance.", consequence: "No charge · no negative balance", tone: "partial" },
  },
  terminalOutcomeTurns: { "D18-O1": ["d18_03_gel"], "D18-O2": ["d18_04_spray"], "D18-O3": ["d18_05_exit"], "D18-O4": ["d18_06_funds"] },
  defaultPhrase: "alternative",
  phraseExamples: {
    alternative: { italian: "C'è un'alternativa alla crema?", english: "Is there an alternative to the cream?" },
    would_like: { italian: "Vorrei il gel da sei euro.", english: "I would like the six-euro gel." },
  },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (any(normalized, EXIT) || any(normalized, ["aspetto", "wait", "niente"])) return runtime.queueTerminal(state, "d18_05_exit", "D18-O3", {}, createId);
    if (state.turnId === "d18_01_unavailable") {
      if (any(normalized, ["alternativa", "alternative", "altra", "altro", "opzione", "else", "differenza", "difference"])) return runtime.moveToTurn(state, "d18_02_options", {}, undefined, createId);
      return runtime.moveToTurn(state, "d18_01_unavailable", {}, "The original cream is unavailable. Ask for an alternative or leave.", createId);
    }
    if (state.turnId === "d18_02_options") {
      if (any(normalized, ["gel", "sei", "six"])) {
        if (state.money < 600) return runtime.queueTerminal(state, "d18_06_funds", "D18-O4", {}, createId);
        return runtime.queueTerminal(state, "d18_03_gel", "D18-O1", { money: state.money - 600, pharmacyItem: "Soothing bite gel", inventory: addItem(state.inventory.filter((item) => item !== "Mosquito-bite cream"), "Soothing bite gel"), knownFacts: addFact(state.knownFacts, "Farmacia Luce: original bite cream unavailable; €6 gel selected"), currentLocation: metadata.location, currentTime: "16:20" }, createId);
      }
      if (any(normalized, ["spray", "otto", "eight"])) {
        if (state.money < 800) return runtime.queueTerminal(state, "d18_06_funds", "D18-O4", {}, createId);
        return runtime.queueTerminal(state, "d18_04_spray", "D18-O2", { money: state.money - 800, pharmacyItem: "Soothing bite spray", inventory: addItem(state.inventory.filter((item) => item !== "Mosquito-bite cream"), "Soothing bite spray"), currentLocation: metadata.location, currentTime: "16:20" }, createId);
      }
      return runtime.moveToTurn(state, "d18_02_options", {}, "Choose the €6 gel, €8 spray, or nothing. No medical equivalence is implied.", createId);
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    if (before.turnId === "d18_01_unavailable" && after.turnId === "d18_02_options") moves.push("request", "recovery");
    if (["d18_03_gel", "d18_04_spray"].includes(after.turnId)) moves.push("preference", "price", "confirm", "pay");
    if (after.turnId === "d18_05_exit") moves.push("decline", "boundary");
    return observation(moves, ["d18_03_gel", "d18_04_spray"].includes(after.turnId) ? { alternativeSelected: true, priceConfirmed: true } : undefined);
  },
  adminSeed: () => ({ money: 960, laundryStatus: "clean", transportMode: "ferry", transportStatus: "booked", transportTicketPrice: 1000, hotWaterStatus: "reported", repairCommitment: { window: "Today at 18:00", status: "active" }, parcelStatus: "collected", hotelKey: true, apartmentKey: true, rental: "chair", pharmacyItem: "Mosquito-bite cream", routeFact: "Piazza Alta, opposite Farmacia Luce, five minutes away", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "Mosquito-bite cream", "Groceries · corrected €4 receipt", "Collected parcel"], cafeOutcome: "Both errors corrected", relationships: { Giulia: "efficient", Rosa: "efficient", Raffaele: "strained", Enzo: "efficient" }, knownFacts: ["Raffaele corrected the missed repair commitment"], commitments: ["Hot-water repair: Today at 18:00"], completed: completedBefore(18), currentLocation: metadata.location, currentTime: "16:15" }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
