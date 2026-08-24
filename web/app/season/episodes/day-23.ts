import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";
import { addFact, addItem, finalArcAdminSeed } from "./shared";

const metadata = seasonEpisode("day-23");
const custodyEvent = "day23-second-parcel-collected";

export const day23Episode: EpisodeDefinition = {
  ...metadata, sceneId: "neighbor-parcel",
  scene: { id: "neighbor-parcel", episodeId: "day-23", day: "Day 23", dateLabel: "A neighbor’s favor", title: metadata.title, location: metadata.location, time: "17:10", npc: "Marta", role: "Neighbor", objective: "Take custody of the second parcel, then accept or decline coffee separately.", firstTurn: "d23_01_parcel", kicker: "The parcel handoff and the social invitation are two different decisions.", suggestions: ["Prendo il pacco, grazie.", "No, grazie. Devo andare.", "Magari più tardi."] },
  turns: {
    d23_01_parcel: authoredTurn("d23_01_parcel", "Marta", "Il corriere ha lasciato questo secondo pacco da me. È per lei?", "Confirm the parcel or decline custody."),
    d23_02_coffee: authoredTurn("d23_02_coffee", "Marta", "Perfetto. Vuole prendere un caffè da me?", "Accept, defer, or decline the separate invitation."),
    d23_03_done: authoredTurn("d23_03_done", "Marta", "Certo. Il pacco è con lei. A presto.", "Parcel collected; coffee declined or deferred.", true),
    d23_04_accept: authoredTurn("d23_04_accept", "Marta", "Va bene. Il pacco è con lei; il caffè è solo un invito.", "Invitation accepted without claiming attendance.", true),
    d23_05_exit: authoredTurn("d23_05_exit", "Marta", "Va bene. Tengo ancora io il pacco.", "No custody change.", true),
  },
  outcomes: {
    "D23-O1": { id: "D23-O1", title: "Parcel collected, boundary kept", detail: "You took the second parcel and declined or deferred coffee.", consequence: "No charge · second parcel now with you", tone: "success" },
    "D23-O2": { id: "D23-O2", title: "Parcel collected, coffee accepted", detail: "You accepted the invitation, but the game does not claim that coffee happened.", consequence: "No charge · attendance still unknown", tone: "success" },
    "D23-O3": { id: "D23-O3", title: "Parcel still with Marta", detail: "You left before taking custody of the second parcel.", consequence: "No charge · neighbor-held", tone: "open" },
  },
  terminalOutcomeTurns: { "D23-O1": ["d23_03_done"], "D23-O2": ["d23_04_accept"], "D23-O3": ["d23_05_exit"] },
  defaultPhrase: "decline",
  initialTurn: (state) => state.worldEvents.includes(custodyEvent) || state.secondParcelStatus === "collected" ? "d23_02_coffee" : "d23_01_parcel",
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (state.turnId === "d23_01_parcel") {
      if (any(normalized, EXIT) || any(normalized, ["non mio", "non e mio", "not mine", "non prendo"])) return runtime.queueTerminal(state, "d23_05_exit", "D23-O3", { secondParcelStatus: "neighbor-held" }, createId);
      if (any(normalized, ["pacco", "parcel", "prendo", "e per me", "si"])) return runtime.moveToTurn(state, "d23_02_coffee", {
        secondParcelStatus: "collected",
        inventory: addItem(state.inventory, "Second parcel"),
        worldEvents: addFact(state.worldEvents, custodyEvent),
        knownFacts: addFact(state.knownFacts, "Second parcel collected from Marta"),
      }, undefined, createId);
    }
    if (state.turnId === "d23_02_coffee") {
      if (any(normalized, ["si", "certo", "va bene", "accept"]) && !any(normalized, EXIT)) return runtime.queueTerminal(state, "d23_04_accept", "D23-O2", {}, createId);
      if (any(normalized, EXIT) || any(normalized, ["no", "non ora", "later", "piu tardi"])) return runtime.queueTerminal(state, "d23_03_done", "D23-O1", {}, createId);
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (before.turnId === "d23_01_parcel" && after.turnId === "d23_02_coffee") return observation(["identify", "confirm"]);
    if (after.turnId === "d23_03_done") return observation(["decline", "boundary"]);
    if (after.turnId === "d23_04_accept") return observation(["confirm"]);
    return noObservation();
  },
  adminSeed: () => finalArcAdminSeed(23), buildResult: buildObservedEpisodeResult,
};
