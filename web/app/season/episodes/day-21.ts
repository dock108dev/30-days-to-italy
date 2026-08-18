import { EXIT, NO, PAY, YES, any, anyWholePhrase, createFeedback } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition, type ObservedMove } from "../types";
import { addFact, completedBefore } from "./shared";

const metadata = seasonEpisode("day-21");

export const day21Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "bartender",
  scene: { id: "bartender", episodeId: "day-21", day: "Day 21", dateLabel: "Familiarity", title: metadata.title, location: metadata.location, time: "11:00", npc: "Giulia", role: "A familiar bartender", objective: "Order and pay for a drink. Giulia recognizes you; anything beyond the transaction is optional.", firstTurn: "e04_01_usual", kicker: "Giulia may remember a real detail from earlier in your trip.", suggestions: ["Il solito, grazie.", "Con la carta.", "Te lo racconto un’altra volta."] },
  turns: {
    e04_01_usual: authoredTurn("e04_01_usual", "Giulia", "Buongiorno. Il solito? Un espresso?", "Accept, correct the usual, or leave."),
    e04_02_water: authoredTurn("e04_02_water", "Giulia", "Certo. Un'acqua costa un euro e cinquanta. Va bene?", "Confirm or refuse the water."),
    e04_03_callback: authoredTurn("e04_03_callback", "Giulia", "Alla fine, com'è andata con il traghetto?", "Optional: answer, defer, or simply pay and leave."),
    e04_03_rebooked: authoredTurn("e04_03_rebooked", "Giulia", "Alla fine, è riuscito a riprenotare il traghetto?", "Optional: answer, defer, or simply pay and leave."),
    e04_03_refunded: authoredTurn("e04_03_refunded", "Giulia", "Alla fine, ha ricevuto il rimborso del traghetto?", "Optional: answer, defer, or simply pay and leave."),
    e04_03_cancelled: authoredTurn("e04_03_cancelled", "Giulia", "Alla fine, cosa ha fatto dopo la cancellazione?", "Optional: answer, defer, or simply pay and leave."),
    e04_03_neutral: authoredTurn("e04_03_neutral", "Giulia", "Come sta andando il viaggio?", "Optional: answer, defer, or simply pay and leave."),
    e04_04_boundary_pay: authoredTurn("e04_04_boundary_pay", "Giulia", "Certo, nessun problema. Sono due euro. Carta o contanti?", "Your boundary was accepted. Choose payment to finish."),
    e04_04_direct_pay: authoredTurn("e04_04_direct_pay", "Giulia", "Certo, nessun problema. Sono due euro.", "Payment accepted; the interaction is ending.", true),
    e04_05_account_pay: authoredTurn("e04_05_account_pay", "Giulia", "Meno male che ha trovato l'autobus. Sono due euro. Carta o contanti?", "Giulia understood. Choose payment to finish."),
    e04_05_rebooked_pay: authoredTurn("e04_05_rebooked_pay", "Giulia", "Bene, è riuscito a riprenotare per le quindici e trenta. Sono due euro. Carta o contanti?", "The rebooking account was understood. Choose payment to finish."),
    e04_05_refunded_pay: authoredTurn("e04_05_refunded_pay", "Giulia", "Bene, ha ricevuto il rimborso. Sono due euro. Carta o contanti?", "The refund account was understood. Choose payment to finish."),
    e04_05_cancelled_pay: authoredTurn("e04_05_cancelled_pay", "Giulia", "Capisco, ha rinunciato alla gita. Sono due euro. Carta o contanti?", "The cancelled outing was understood. Choose payment to finish."),
    e04_06_followup: authoredTurn("e04_06_followup", "Giulia", "Bene, grazie. Lavoro fino alle due. Stamattina c'è molta gente.", "One answer, then you can pay and leave."),
    e04_07_exit: authoredTurn("e04_07_exit", "Giulia", "Va bene. A presto.", "No purchase. The interaction is ending.", true),
    e04_08_neutral_pay: authoredTurn("e04_08_neutral_pay", "Giulia", "Mi fa piacere. Sono due euro. Carta o contanti?", "Your brief trip update was understood. Choose payment to finish."),
  },
  outcomes: {
    "E4-O1": { id: "E4-O1", title: "A quick espresso", detail: "You paid and left without answering the optional question.", consequence: "−€2.00 · no new personal memory", tone: "success" },
    "E4-O2": { id: "E4-O2", title: "Conversation deferred", detail: "Giulia accepted your boundary immediately. Service and price were unchanged.", consequence: "−€2.00 · story saved for another time", tone: "success" },
    "E4-O3": { id: "E4-O3", title: "A brief account", detail: "You told Giulia the ferry was cancelled and you found the replacement bus.", consequence: "−€2.00 · one validated memory added", tone: "success" },
    "E4-O5": { id: "E4-O5", title: "The rebooked ferry", detail: "You told Giulia that the cancelled ferry was rebooked for 15:30.", consequence: "−€2.00 · accurate rebooking account shared", tone: "success" },
    "E4-O6": { id: "E4-O6", title: "The refunded ticket", detail: "You told Giulia that the cancelled ferry ticket was refunded.", consequence: "−€2.00 · accurate refund account shared", tone: "success" },
    "E4-O7": { id: "E4-O7", title: "The cancelled outing", detail: "You told Giulia that the outing ended after the ferry cancellation.", consequence: "−€2.00 · accurate cancellation account shared", tone: "success" },
    "E4-O8": { id: "E4-O8", title: "A brief trip update", detail: "You gave Giulia a short, neutral update about how the trip is going.", consequence: "−€2.00 · no transport story added", tone: "success" },
    "E4-O9": { id: "E4-O9", title: "The question returned", detail: "You asked how Giulia was and kept the exchange focused on her answer.", consequence: "−€2.00 · no transport story added", tone: "success" },
    "E4-O4-water": { id: "E4-O4", title: "The usual corrected", detail: "You chose water instead. Familiarity did not become an obligation.", consequence: "−€1.50 · preference corrected", tone: "success" },
    "E4-O4-none": { id: "E4-O4", title: "No drink today", detail: "You left without buying anything. Giulia accepted it without pressure.", consequence: "No charge · clean exit", tone: "open" },
  },
  terminalOutcomeTurns: { "E4-O1": ["e04_04_direct_pay"], "E4-O2": ["e04_04_direct_pay"], "E4-O3": ["e04_04_direct_pay"], "E4-O5": ["e04_04_direct_pay"], "E4-O6": ["e04_04_direct_pay"], "E4-O7": ["e04_04_direct_pay"], "E4-O8": ["e04_04_direct_pay"], "E4-O9": ["e04_04_direct_pay"], "E4-O4-none": ["e04_07_exit"] },
  evaluateResponse({ state, normalized, raw, createId, runtime }) {
    const exit = any(normalized, EXIT) || (anyWholePhrase(normalized, NO) && !any(normalized, ["non espresso", "not espresso"]));
    const pay = any(normalized, PAY);
    const water = any(normalized, ["acqua", "water"]);
    const espresso = any(normalized, ["espresso", "caffe", "coffee", "solito"]) || anyWholePhrase(normalized, YES);
    const boundary = any(normalized, ["piu tardi", "later", "un altra volta", "devo andare", "non ora", "not now"]);
    const replacementBusAccount = any(normalized, ["traghetto", "ferry", "cancell", "cancel"]) && any(normalized, ["autobus", "bus", "preso", "took"]);
    const rebookedAccount = any(normalized, ["riprenot", "rebook", "quindici", "15 30"]) && any(normalized, ["traghetto", "ferry"]);
    const refundedAccount = any(normalized, ["rimborso", "rimbors", "refund"]);
    const cancelledAccount = any(normalized, ["cancell", "cancel", "annullat"]);
    const mentionsTransport = any(normalized, ["traghetto", "ferry", "cancell", "cancel", "rimborso", "refund", "riprenot", "rebook", "autobus", "bus"]);
    const asksGiulia = any(normalized, ["e tu", "and you", "come stai", "come va", "lavori", "your day"]);
    if (state.turnId === "e04_01_usual") {
      if (exit) return runtime.queueTerminal(state, "e04_07_exit", "E4-O4-none", {}, createId);
      if (water) return runtime.moveToTurn(state, "e04_02_water", {}, undefined, createId);
      if (espresso) {
        const callbackTurn = state.transportStatus === "replacement-bus"
          ? "e04_03_callback"
          : state.transportStatus === "rebooked"
            ? "e04_03_rebooked"
            : state.transportStatus === "refunded"
              ? "e04_03_refunded"
              : state.transportStatus === "cancelled"
                ? "e04_03_cancelled"
              : "e04_03_neutral";
        return runtime.moveToTurn(state, callbackTurn, {}, undefined, createId);
      }
      return runtime.moveToTurn(state, "e04_01_usual", { attempts: state.attempts + 1 }, "Giulia is offering an espresso, not assuming you must take it.", createId);
    }
    if (state.turnId === "e04_02_water") {
      if (anyWholePhrase(normalized, YES) || pay) return runtime.resolveOutcome(state, "E4-O4-water", { money: state.money - 150 }, createFeedback("bartender", raw), createId);
      return runtime.queueTerminal(state, "e04_07_exit", "E4-O4-none", {}, createId);
    }
    if (["e04_03_callback", "e04_03_rebooked", "e04_03_refunded", "e04_03_cancelled", "e04_03_neutral"].includes(state.turnId)) {
      if (pay) return runtime.queueTerminal(state, "e04_04_direct_pay", "E4-O1", { money: state.money - 200 }, createId);
      if (boundary) return runtime.moveToTurn(state, "e04_04_boundary_pay", {}, undefined, createId);
      if (exit) return runtime.queueTerminal(state, "e04_07_exit", "E4-O4-none", {}, createId);
      if (asksGiulia) return runtime.moveToTurn(state, "e04_06_followup", { feedback: createFeedback("bartender", raw) }, undefined, createId);
      if (state.turnId === "e04_03_callback" && replacementBusAccount) return runtime.moveToTurn(state, "e04_05_account_pay", { knownFacts: addFact(state.knownFacts, "Giulia heard: ferry cancelled; replacement bus taken"), feedback: createFeedback("bartender", raw) }, undefined, createId);
      if (state.turnId === "e04_03_rebooked" && rebookedAccount) return runtime.moveToTurn(state, "e04_05_rebooked_pay", { knownFacts: addFact(state.knownFacts, "Giulia heard: cancelled ferry rebooked for 15:30"), feedback: createFeedback("bartender", raw) }, undefined, createId);
      if (state.turnId === "e04_03_refunded" && refundedAccount) return runtime.moveToTurn(state, "e04_05_refunded_pay", { knownFacts: addFact(state.knownFacts, "Giulia heard: cancelled ferry ticket refunded"), feedback: createFeedback("bartender", raw) }, undefined, createId);
      if (state.turnId === "e04_03_cancelled" && cancelledAccount) return runtime.moveToTurn(state, "e04_05_cancelled_pay", { knownFacts: addFact(state.knownFacts, "Giulia heard: outing ended after ferry cancellation"), feedback: createFeedback("bartender", raw) }, undefined, createId);
      if (mentionsTransport) return runtime.moveToTurn(state, state.turnId, { attempts: state.attempts + 1 }, "That answer does not match the saved trip, so Giulia leaves the optional question open.", createId);
      return runtime.moveToTurn(state, "e04_08_neutral_pay", { feedback: createFeedback("bartender", raw) }, undefined, createId);
    }
    if (["e04_04_boundary_pay", "e04_05_account_pay", "e04_05_rebooked_pay", "e04_05_refunded_pay", "e04_05_cancelled_pay", "e04_06_followup", "e04_08_neutral_pay"].includes(state.turnId)) {
      const outcomeId = state.turnId === "e04_04_boundary_pay" ? "E4-O2"
        : state.turnId === "e04_05_account_pay" ? "E4-O3"
          : state.turnId === "e04_05_rebooked_pay" ? "E4-O5"
            : state.turnId === "e04_05_refunded_pay" ? "E4-O6"
              : state.turnId === "e04_05_cancelled_pay" ? "E4-O7"
                : state.turnId === "e04_08_neutral_pay" ? "E4-O8"
                  : "E4-O9";
      if (exit) return runtime.queueTerminal(state, "e04_07_exit", "E4-O4-none", {}, createId);
      if (pay || anyWholePhrase(normalized, YES)) return runtime.queueTerminal(state, "e04_04_direct_pay", outcomeId, { money: state.money - 200, ferryMemory: state.ferryMemory }, createId);
      return runtime.moveToTurn(state, state.turnId, {}, undefined, createId);
    }
    return state;
  },
  observeResponse({ before, after, normalized }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    const moves: ObservedMove[] = [];
    const callbackTurns = ["e04_03_callback", "e04_03_rebooked", "e04_03_refunded", "e04_03_cancelled", "e04_03_neutral"];
    const factualAccountTurns = ["e04_05_account_pay", "e04_05_rebooked_pay", "e04_05_refunded_pay", "e04_05_cancelled_pay"];
    if (before.turnId === "e04_01_usual" && (after.turnId === "e04_02_water" || callbackTurns.includes(after.turnId))) moves.push("request", "preference");
    if (callbackTurns.includes(before.turnId) && after.turnId === "e04_04_boundary_pay") moves.push("boundary");
    if (callbackTurns.includes(before.turnId) && factualAccountTurns.includes(after.turnId)) moves.push("recovery");
    if (callbackTurns.includes(before.turnId) && after.turnId === "e04_06_followup") moves.push("request");
    if (callbackTurns.includes(before.turnId) && after.turnId === "e04_08_neutral_pay") moves.push("confirm");
    if (after.turnId === "e04_04_direct_pay" || after.status === "resolved") {
      if (any(normalized, PAY)) moves.push("pay", "price");
      moves.push("confirm");
    }
    if (after.turnId === "e04_07_exit") moves.push("decline", "boundary");
    return observation(moves, before.turnId === "e04_02_water" && after.status === "resolved" ? { preferenceSelected: "water", priceConfirmed: true } : after.turnId === "e04_04_direct_pay" ? { priceConfirmed: true } : undefined);
  },
  adminSeed: () => ({ money: 1120, hotelKey: true, apartmentKey: true, rental: "custom", cafeOutcome: "Both errors corrected", laundryStatus: "clean", transportMode: "bus", transportStatus: "replacement-bus", transportTicketPrice: 240, hotWaterStatus: "temporary", repairCommitment: { window: "Friday, 10:00", status: "active" }, parcelStatus: "collected", inventory: ["Clean clothes", "Replacement bus ticket", "Parcel"], relationships: { Giulia: "efficient" }, knownFacts: ["Giulia served the first espresso", "Giulia corrected both café errors", "Cancelled ferry refunded", "Replacement bus taken", "Hot water temporary fix completed"], completed: completedBefore(21) }),
  buildResult: buildObservedEpisodeResult,
  terminalBehavior: "resolve",
};
