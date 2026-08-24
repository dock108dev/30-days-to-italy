import { EXIT, PAY, YES, any, anyWholePhrase } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";

const metadata = seasonEpisode("day-02");

export const day02Episode: EpisodeDefinition = {
  ...metadata, sceneId: "alimentari",
  scene: { id: "alimentari", episodeId: "day-02", day: "Day 2", dateLabel: "29 days out", title: metadata.title, location: metadata.location, time: "18:20", npc: "Enzo", role: "Shopkeeper", objective: "Buy bread, cheese, and water for €8.40, decline a bag, and pay by card.", firstTurn: "d02_01_request", kicker: "You only need enough for one quiet meal.", suggestions: ["Vorrei pane, formaggio e acqua.", "Solo questo, grazie.", "Pago con la carta."] },
  turns: {
    d02_01_request: authoredTurn("d02_01_request", "Enzo", "Buonasera. Cosa prende?", "Ask for the three things you need."),
    d02_02_total: authoredTurn("d02_02_total", "Enzo", "Pane, formaggio e acqua. Sono otto euro e quaranta. Vuole un sacchetto?", "Listen for the total and the bag question."),
    d02_03_pay: authoredTurn("d02_03_pay", "Enzo", "Va bene, senza sacchetto. Carta o contanti?", "Choose how to pay."),
    d02_04_close: authoredTurn("d02_04_close", "Enzo", "Pagamento riuscito. Grazie e buona serata.", "The groceries are yours.", true),
  },
  outcomes: {
    "D02-O1": { id: "D02-O1", title: "Dinner without extras", detail: "You bought bread, cheese, and water, declined the bag, and paid by card.", consequence: "−€8.40 · bread, cheese, water", tone: "success" },
    "D02-O2": { id: "D02-O2", title: "No grocery purchase", detail: "You left without buying anything.", consequence: "No charge", tone: "open" },
  },
  terminalOutcomeTurns: { "D02-O1": ["d02_04_close"] },
  evaluateResponse({ state, normalized, createId, runtime }) {
    const exit = any(normalized, EXIT);
    if (state.turnId === "d02_01_request") {
      if (exit) return runtime.resolveOutcome(state, "D02-O2", {}, null, createId);
      const requested = any(normalized, ["pane", "bread"]) && any(normalized, ["formaggio", "cheese"]) && any(normalized, ["acqua", "water"]);
      return requested ? runtime.moveToTurn(state, "d02_02_total", {}, undefined, createId) : runtime.moveToTurn(state, "d02_01_request", {}, "Enzo still needs the items: bread, cheese, and water.", createId);
    }
    if (state.turnId === "d02_02_total") {
      if (exit) return runtime.resolveOutcome(state, "D02-O2", {}, null, createId);
      if (any(normalized, ["senza", "no sacchetto", "no bag", "solo questo", "basta", "no grazie"])) return runtime.moveToTurn(state, "d02_03_pay", {}, undefined, createId);
      return runtime.moveToTurn(state, "d02_02_total", {}, "The bag choice is still open. Nothing has been charged.", createId);
    }
    if (state.turnId === "d02_03_pay") {
      if (any(normalized, PAY) || anyWholePhrase(normalized, YES)) return runtime.queueTerminal(state, "d02_04_close", "D02-O1", {
        money: state.money - 840,
        inventory: [...new Set([...state.inventory, "Bread", "Cheese", "Water"])],
        relationships: { ...state.relationships, Enzo: "efficient" },
        knownFacts: [...new Set([...state.knownFacts, "Enzo completed a card purchase without a bag"])],
      }, createId);
      if (exit) return runtime.resolveOutcome(state, "D02-O2", {}, null, createId);
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (before.turnId === "d02_01_request" && after.turnId === "d02_02_total") return observation(["request"]);
    if (before.turnId === "d02_02_total" && after.turnId === "d02_03_pay") return observation(["decline"]);
    if (before.turnId === "d02_03_pay" && after.turnId === "d02_04_close") return observation(["pay"]);
    return noObservation();
  },
  adminSeed: () => ({ hotelKey: true, apartmentKey: true, knownFacts: ["Casa Limone: green door, first floor"], completed: ["day-00", "day-01"] }),
  buildResult: buildObservedEpisodeResult,
};
