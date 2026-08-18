import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";

const metadata = seasonEpisode("day-07");

export const day07Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "pharmacy",
  scene: { id: "pharmacy", episodeId: "day-07", day: "Day 7", dateLabel: "24 days out", title: metadata.title, location: metadata.location, time: "17:45", npc: "Sara", role: "Pharmacist", objective: "Ask for something for mosquito bites, choose cream, and pay €9.60.", firstTurn: "d07_01_need", kicker: "Only the product form matters; no private medical history is needed.", suggestions: ["Mi serve qualcosa per le punture.", "La crema, grazie.", "Va bene."] },
  turns: {
    d07_01_need: authoredTurn("d07_01_need", "Sara", "Buonasera. Di cosa ha bisogno?", "State the simple need; no diagnosis is required."),
    d07_02_choice: authoredTurn("d07_02_choice", "Sara", "Per le punture di zanzara: preferisce la crema o le compresse?", "Choose cream or tablets."),
    d07_03_close: authoredTurn("d07_03_close", "Sara", "La crema costa nove euro e sessanta. La metta solo sulla pelle.", "The cream and one bounded instruction are confirmed.", true),
  },
  outcomes: {
    "D07-O1": { id: "D07-O1", title: "A simple pharmacy solution", detail: "You chose the cream and received one bounded use instruction.", consequence: "−€9.60 · bite cream", tone: "success" },
    "D07-O2": { id: "D07-O2", title: "Purchase deferred", detail: "You left without sharing unnecessary medical details or buying a product.", consequence: "No charge", tone: "open" },
  },
  terminalOutcomeTurns: { "D07-O1": ["d07_03_close"] },
  evaluateResponse({ state, normalized, createId, runtime }) {
    const exit = any(normalized, EXIT);
    if (state.turnId === "d07_01_need") {
      if (exit) return runtime.resolveOutcome(state, "D07-O2", {}, null, createId);
      if (any(normalized, ["puntur", "zanzar", "mosquito", "bite", "prurito"])) return runtime.moveToTurn(state, "d07_02_choice", {}, undefined, createId);
      return runtime.moveToTurn(state, "d07_01_need", {}, "Sara only needs the simple problem: mosquito bites.", createId);
    }
    if (state.turnId === "d07_02_choice") {
      if (any(normalized, ["crema", "cream"])) return runtime.queueTerminal(state, "d07_03_close", "D07-O1", { money: state.money - 960, pharmacyItem: "Mosquito-bite cream", inventory: [...new Set([...state.inventory, "Mosquito-bite cream"])] }, createId);
      if (exit || any(normalized, ["no", "niente", "compresse", "tablets"])) return runtime.resolveOutcome(state, "D07-O2", {}, null, createId);
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (before.turnId === "d07_01_need" && after.turnId === "d07_02_choice") return observation(["request", "problem"]);
    if (before.turnId === "d07_02_choice" && after.turnId === "d07_03_close") return observation(["preference", "confirm"], { preferenceSelected: "cream" });
    return noObservation();
  },
  adminSeed: () => ({ money: 6070, hotelKey: true, apartmentKey: true, rental: "custom", busTicket: true, routeFact: "Amalfi stop: across the square, opposite Bar Gabbiano", pharmacyItem: null, inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "One-way Amalfi bus ticket"], relationships: { Giulia: "neutral" }, knownFacts: ["Giulia served the first espresso", "Amalfi stop: across the square, opposite Bar Gabbiano"], completed: ["day-00", "day-01", "day-02", "day-03", "day-04", "day-05", "day-06"] }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
