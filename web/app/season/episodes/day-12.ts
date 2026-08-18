import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, completedBefore } from "./shared";

const metadata = seasonEpisode("day-12");

export const day12Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "beach-alternative",
  scene: { id: "beach-alternative", episodeId: "day-12", day: "Day 12", dateLabel: "19 days out", title: metadata.title, location: metadata.location, time: "10:15", npc: "Nadia", role: "Lido attendant", objective: "Understand that umbrellas are unavailable and choose only a real alternative.", firstTurn: "d12_01_unavailable", kicker: "The important word is non: ordinary umbrellas are gone.", suggestions: ["C'è un'alternativa?", "Prendo il posto all'ombra da otto euro.", "No, grazie."] },
  turns: {
    d12_01_unavailable: authoredTurn("d12_01_unavailable", "Nadia", "Oggi non ci sono ombrelloni disponibili.", "Ask for an alternative or leave."),
    d12_02_options: authoredTurn("d12_02_options", "Nadia", "C'è un lettino all'ombra sotto il pergolato per otto euro, oppure una cabina per diciotto.", "Choose the €8 shade, €18 cabana, or decline."),
    d12_03_shade: authoredTurn("d12_03_shade", "Nadia", "Perfetto: un lettino all'ombra, senza ombrellone, per otto euro.", "The shaded chair is reserved.", true),
    d12_04_cabana: authoredTurn("d12_04_cabana", "Nadia", "Va bene: una cabina per diciotto euro.", "The cabana is reserved.", true),
    d12_05_exit: authoredTurn("d12_05_exit", "Nadia", "Va bene. Nessun noleggio oggi.", "No rental and no charge.", true),
    d12_06_funds: authoredTurn("d12_06_funds", "Nadia", "Non basta per questa opzione. Non confermo il noleggio.", "No rental and no negative balance.", true),
  },
  outcomes: {
    "D12-O1": { id: "D12-O1", title: "Shade found", detail: "You chose the real shaded-chair alternative without inventing an umbrella.", consequence: "−€8.00 · shaded chair under the pergola", tone: "success" },
    "D12-O2": { id: "D12-O2", title: "Cabana selected", detail: "You knowingly chose the larger option.", consequence: "−€18.00 · cabana reserved", tone: "success" },
    "D12-O3": { id: "D12-O3", title: "No beach rental", detail: "You declined the available alternatives.", consequence: "No charge", tone: "open" },
    "D12-O4": { id: "D12-O4", title: "Option not purchased", detail: "No rental was created because the selected option exceeded the balance.", consequence: "No charge · no negative balance", tone: "partial" },
  },
  terminalOutcomeTurns: { "D12-O1": ["d12_03_shade"], "D12-O2": ["d12_04_cabana"], "D12-O3": ["d12_05_exit"], "D12-O4": ["d12_06_funds"] },
  defaultPhrase: "alternative",
  phraseExamples: {
    alternative: { italian: "C'è un'alternativa all'ombrellone?", english: "Is there an alternative to the umbrella?" },
    cost: { italian: "Quanto costa il posto all'ombra?", english: "How much is the shaded place?" },
  },
  evaluateResponse({ state, normalized, createId, runtime }) {
    const exit = any(normalized, EXIT) || any(normalized, ["niente", "nothing"]);
    if (exit) return runtime.queueTerminal(state, "d12_05_exit", "D12-O3", { rental: null }, createId);
    if (state.turnId === "d12_01_unavailable") {
      if (any(normalized, ["alternativa", "alternative", "altra", "altro", "opzione", "else", "ombra", "shade"])) return runtime.moveToTurn(state, "d12_02_options", {}, undefined, createId);
      return runtime.moveToTurn(state, "d12_01_unavailable", {}, "There are no umbrellas. Ask for a real alternative or leave.", createId);
    }
    if (state.turnId === "d12_02_options") {
      if (any(normalized, ["cabina", "cabana", "diciotto", "eighteen"])) {
        if (state.money < 1800) return runtime.queueTerminal(state, "d12_06_funds", "D12-O4", { rental: null }, createId);
        return runtime.queueTerminal(state, "d12_04_cabana", "D12-O2", { money: state.money - 1800, rental: "standard", currentLocation: metadata.location, currentTime: "10:20" }, createId);
      }
      if (any(normalized, ["pergolato", "shade", "ombra", "otto", "eight"])) {
        if (state.money < 800) return runtime.queueTerminal(state, "d12_06_funds", "D12-O4", { rental: null }, createId);
        return runtime.queueTerminal(state, "d12_03_shade", "D12-O1", { money: state.money - 800, rental: "chair", currentLocation: metadata.location, currentTime: "10:20", knownFacts: addFact(state.knownFacts, "Lido alternative: shaded chair under pergola, no umbrella, €8") }, createId);
      }
      return runtime.moveToTurn(state, "d12_02_options", {}, "Choose the €8 shade, the €18 cabana, or leave. No umbrella is available.", createId);
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    if (before.turnId === "d12_01_unavailable" && after.turnId === "d12_02_options") moves.push("request", "recovery");
    if (["d12_03_shade", "d12_04_cabana"].includes(after.turnId)) moves.push("preference", "price", "confirm", "pay");
    if (after.turnId === "d12_05_exit") moves.push("decline", "boundary");
    return observation(moves, ["d12_03_shade", "d12_04_cabana"].includes(after.turnId) ? { alternativeSelected: true, priceConfirmed: true } : undefined);
  },
  adminSeed: () => ({ money: 2410, laundryStatus: "clean", transportMode: "ferry", transportStatus: "booked", transportTicketPrice: 1000, hotWaterStatus: "reported", repairCommitment: { window: "Tuesday 09:00–11:00", status: "active" }, hotelKey: true, apartmentKey: true, rental: "custom", pharmacyItem: "Mosquito-bite cream", inventory: ["Bread", "Cheese", "Water", "½ kg tomatoes", "Mosquito-bite cream"], relationships: { Giulia: "neutral", Rosa: "efficient", Raffaele: "efficient" }, knownFacts: ["Casa Limone hot water reported unavailable"], commitments: ["Hot-water repair: Tuesday 09:00–11:00"], completed: completedBefore(12), currentLocation: metadata.location, currentTime: "10:15" }),
  buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
