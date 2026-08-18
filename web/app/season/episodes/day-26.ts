import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";
import { finalArcAdminSeed } from "./shared";

const metadata = seasonEpisode("day-26");

export const day26Episode: EpisodeDefinition = {
  ...metadata, status: "implemented", sceneId: "quiet-table",
  scene: { id: "quiet-table", episodeId: "day-26", day: "Day 26", dateLabel: "A table on your terms", title: metadata.title, location: metadata.location, time: "19:00", npc: "Rosa", role: "Trattoria host", objective: "Choose the quiet table instead of the louder view table. No meal is ordered in this rehearsal.", firstTurn: "d26_01_choice", kicker: "A table preference does not create a food order or a charge.", suggestions: ["Preferirei un tavolo tranquillo.", "Non quello con la vista, grazie.", "No, grazie."] },
  turns: {
    d26_01_choice: authoredTurn("d26_01_choice", "Rosa", "Ho un tavolo tranquillo dentro oppure un tavolo con vista, ma fuori c'è più rumore.", "Choose quiet, choose the view, or leave."),
    d26_02_quiet: authoredTurn("d26_02_quiet", "Rosa", "Certo. Il tavolo tranquillo è questo.", "Table selected; no food ordered.", true),
    d26_03_view: authoredTurn("d26_03_view", "Rosa", "Va bene. Il tavolo con vista è più rumoroso.", "View table selected knowingly; no food ordered.", true),
    d26_04_exit: authoredTurn("d26_04_exit", "Rosa", "Nessun problema. A presto.", "No table and no charge.", true),
  },
  outcomes: {
    "D26-O1": { id: "D26-O1", title: "The quiet table", detail: "You stated the preference and Rosa gave you the quieter table.", consequence: "No food ordered · no charge", tone: "success" },
    "D26-O2": { id: "D26-O2", title: "The view table", detail: "You knowingly chose the louder table with the view.", consequence: "No food ordered · no charge", tone: "success" },
    "D26-O3": { id: "D26-O3", title: "No table today", detail: "You left without making a reservation or ordering anything.", consequence: "No charge", tone: "open" },
  },
  terminalOutcomeTurns: { "D26-O1": ["d26_02_quiet"], "D26-O2": ["d26_03_view"], "D26-O3": ["d26_04_exit"] },
  defaultPhrase: "quiet_table",
  phraseExamples: { quiet_table: { italian: "Preferirei un tavolo tranquillo.", english: "I would prefer a quiet table." } },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (state.turnId !== "d26_01_choice") return state;
    if (any(normalized, ["tranquillo", "quiet", "dentro", "inside"])) return runtime.queueTerminal(state, "d26_02_quiet", "D26-O1", { tablePreference: "quiet", relationships: { ...state.relationships, Rosa: "efficient" } }, createId);
    if (any(normalized, ["vista", "view", "fuori", "outside"])) return runtime.queueTerminal(state, "d26_03_view", "D26-O2", { tablePreference: "view" }, createId);
    if (any(normalized, EXIT) || any(normalized, ["nessun tavolo", "no table"])) return runtime.queueTerminal(state, "d26_04_exit", "D26-O3", { tablePreference: "none" }, createId);
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (after.turnId === "d26_02_quiet") return observation(["preference", "confirm"], { preferenceSelected: "quiet table" });
    if (after.turnId === "d26_03_view") return observation(["preference", "confirm"], { preferenceSelected: "view table" });
    if (after.turnId === "d26_04_exit") return observation(["decline", "boundary"]);
    return noObservation();
  },
  adminSeed: () => finalArcAdminSeed(26), buildResult: buildObservedEpisodeResult, terminalBehavior: "resolve",
};
