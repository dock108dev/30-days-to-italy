import assert from "node:assert/strict";
import test from "node:test";

import {
  seedEpisodeState,
  submitEpisodeResponse,
  type HistoryIdFactory,
} from "../app/game/engine";
import { hydrateGameState } from "../app/game/persistence";
import { initialState, type GameState } from "../app/game/model";
import { createSeasonEpisodeHandoff } from "../app/season/pocket-deck-handoff";
import { IMPLEMENTED_EPISODE_DEFINITIONS } from "../app/season/registry";
import type { EpisodeId } from "../app/season/manifest";

type ContractPath = {
  name: string;
  responses: readonly string[];
  outcomeId: string;
  seed?: Partial<GameState>;
};

const EXIT_OUTCOME_BY_EPISODE: Record<EpisodeId, string> = {
  "day-00": "E1-O4", "day-01": "D01-O2", "day-02": "D02-O2", "day-03": "D03-O2",
  "day-04": "E2-O4", "day-05": "D05-O2", "day-06": "D06-O2", "day-07": "D07-O2",
  "day-08": "D08-O2", "day-09": "D09-O3", "day-10": "D10-O3", "day-11": "D11-O3",
  "day-12": "D12-O3", "day-13": "E3-O5", "day-14": "D14-O3", "day-15": "D15-O3",
  "day-16": "D16-O3", "day-17": "D17-O3", "day-18": "D18-O3", "day-19": "D19-O5",
  "day-20": "D20-O3", "day-21": "E4-O4", "day-22": "D22-O2", "day-23": "D23-O3",
  "day-24": "D24-O1", "day-25": "D25-O4", "day-26": "D26-O3", "day-27": "D27-O4",
  "day-28": "D28-O2", "day-29": "D29-O3", "day-30": "D30-O4",
};

const ALTERNATE_PATHS: Partial<Record<EpisodeId, readonly ContractPath[]>> = {
  "day-00": [{ name: "direct boundary", responses: ["Fuscoletti, ho una prenotazione.", "Grazie, buonanotte."], outcomeId: "E1-O3" }],
  "day-03": [
    { name: "drink here", responses: ["Prendo un caffè espresso.", "Resto qui al banco.", "Pago in contanti."], outcomeId: "D03-O1" },
    { name: "takeaway", responses: ["Vorrei un espresso.", "vorrei un espresso da portare", "Pago con la carta."], outcomeId: "D03-O3" },
  ],
  "day-04": [
    { name: "two-chair package", responses: ["Un lettino e un ombrellone.", "Due lettini, va bene.", "Sì, accetto."], outcomeId: "E2-O2" },
    { name: "chair only", responses: ["Vorrei un lettino.", "Solo il lettino, senza ombrellone.", "Va bene."], outcomeId: "E2-O3" },
  ],
  "day-09": [{ name: "lower-cost bus", responses: ["Quanto dura il viaggio?", "Prendo l'autobus delle nove e dieci."], outcomeId: "D09-O2" }],
  "day-10": [{ name: "knowingly accept potatoes", responses: ["Vorrei la pasta al pomodoro.", "Va bene, tengo le patate."], outcomeId: "D10-O2" }],
  "day-11": [{ name: "defer appointment", responses: ["Non c'è acqua calda.", "Da stamattina.", "Ne parliamo più tardi."], outcomeId: "D11-O2" }],
  "day-12": [{ name: "cabana", responses: ["C'è un'altra opzione?", "Prendo la cabina da diciotto euro."], outcomeId: "D12-O2" }],
  "day-13": [
    { name: "bill fixed and latte kept", responses: ["Non ho ordinato la spremuta.", "Tengo il latte, va bene."], outcomeId: "E3-O2" },
    { name: "drink fixed and bill accepted", responses: ["Avevo ordinato un cappuccino.", "Va bene, pago con la carta."], outcomeId: "E3-O3" },
    { name: "original result accepted", responses: ["Pago con la carta."], outcomeId: "E3-O4" },
  ],
  "day-14": [{ name: "wait for later bus", responses: ["Dov'è Piazza Alta?", "Aspetto il prossimo autobus."], outcomeId: "D14-O2" }],
  "day-15": [{ name: "knowingly accept extra bag", responses: ["Va bene, accetto le due borse."], outcomeId: "D15-O2" }],
  "day-16": [{ name: "authorized redelivery", responses: ["Può tornare domani per la consegna."], outcomeId: "D16-O2" }],
  "day-17": [{
    name: "new commitment without invented history",
    responses: ["Quando può venire per il problema?", "Oggi alle diciotto va bene."],
    outcomeId: "D17-O2",
    seed: { repairCommitment: null, commitments: [], turnId: "d17_01_no_commitment" },
  }],
  "day-18": [{ name: "spray substitute", responses: ["C'è un'alternativa?", "Prendo lo spray da otto euro."], outcomeId: "D18-O2" }],
  "day-19": [
    { name: "refund only", responses: ["Vorrei il rimborso."], outcomeId: "D19-O2" },
    { name: "rebook owned ferry", responses: ["Riprenoto per le quindici e trenta."], outcomeId: "D19-O3" },
    { name: "buy bus without ferry ownership", responses: ["Prendo l'autobus."], outcomeId: "D19-O4", seed: { transportMode: "none", transportStatus: "none", transportTicketPrice: 0, turnId: "d19_01_no_ticket" } },
    { name: "buy new ferry without ownership", responses: ["Compro il traghetto delle quindici e trenta."], outcomeId: "D19-O7", seed: { money: 1200, transportMode: "none", transportStatus: "none", transportTicketPrice: 0, turnId: "d19_01_no_ticket" } },
  ],
  "day-20": [
    { name: "request accommodation fallback", responses: ["Chiedo un'altra sistemazione come compensazione."], outcomeId: "D20-O2" },
    { name: "truthful no-history commitment", responses: ["L'acqua calda non funziona: è temporaneo?", "Venerdì alle dieci va bene."], outcomeId: "D20-O4", seed: { hotWaterStatus: "unknown", repairCommitment: null } },
  ],
  "day-21": [{ name: "water only", responses: ["Solo acqua, grazie.", "Sì, pago con la carta."], outcomeId: "E4-O4" }],
  "day-23": [{ name: "accept coffee invitation", responses: ["Prendo il pacco, grazie.", "Sì, volentieri."], outcomeId: "D23-O2" }],
  "day-24": [
    { name: "paid-pass refund", responses: ["Vorrei il rimborso."], outcomeId: "D24-O5", seed: { beachDayPassPaid: true, beachDayPassPrice: 2200, beachRemedy: "none" } },
    { name: "paid-pass credit", responses: ["Preferisco un buono."], outcomeId: "D24-O4", seed: { beachDayPassPaid: true, beachDayPassPrice: 2200, beachRemedy: "none" } },
    { name: "shelter purchase", responses: ["Pago cinque euro per il posto riparato."], outcomeId: "D24-O3", seed: { money: 1000 } },
    { name: "no unearned remedy", responses: ["Vorrei un rimborso."], outcomeId: "D24-O2", seed: { beachDayPassPaid: false, beachDayPassPrice: 0, beachRemedy: "none" } },
  ],
  "day-25": [
    { name: "accept invitation", responses: ["Sì, vengo domani."], outcomeId: "D25-O2" },
    { name: "decline invitation", responses: ["No, non posso."], outcomeId: "D25-O3" },
  ],
  "day-26": [{ name: "view table", responses: ["Scelgo il tavolo fuori con la vista."], outcomeId: "D26-O2" }],
  "day-27": [
    { name: "ineligible credit is not invented", responses: ["Ora funziona.", "Posso avere un buono?"], outcomeId: "D27-O2", seed: { hotWaterStatus: "unknown", repairCommitment: null, knownFacts: [], commitments: [], worldEvents: [], repairCreditEligibility: "unknown", repairCreditStatus: "none" } },
    { name: "close without credit", responses: ["L'acqua calda funziona.", "No, è tutto a posto."], outcomeId: "D27-O3" },
    { name: "repair remains open", responses: ["Non funziona ancora."], outcomeId: "D27-O4" },
  ],
  "day-29": [
    { name: "definite yes", responses: ["Un espresso.", "Sì, resto più a lungo.", "Pago con la carta."], outcomeId: "D29-O2" },
    { name: "definite no", responses: ["Prendo un caffè.", "No, parto domani.", "Pago in contanti."], outcomeId: "D29-O2" },
  ],
  "day-30": [
    { name: "missing key", responses: ["Mi manca la chiave dell'appartamento."], outcomeId: "D30-O3" },
    { name: "supported issue acknowledged", responses: ["Ecco tutte le chiavi.", "Il pacco rimane un problema aperto.", "Parto domani mattina."], outcomeId: "D30-O2", seed: { openIssues: ["Parcel follow-up remains open"] } },
  ],
};

function ids(prefix: string): HistoryIdFactory {
  let index = 0;
  return () => `${prefix}-${++index}`;
}

function meaningful(before: GameState, after: GameState): boolean {
  return before.turnId !== after.turnId ||
    before.status !== after.status ||
    before.pendingOutcome !== after.pendingOutcome ||
    before.outcome?.id !== after.outcome?.id ||
    before.guidance !== after.guidance;
}

function runPath(episodeId: EpisodeId, path: ContractPath, paraphrase = false): GameState {
  const createId = ids(`${episodeId}-${path.name.replace(/\s+/g, "-")}`);
  let state = seedEpisodeState(initialState(), episodeId);
  if (path.seed) state = { ...state, ...path.seed };
  const startingMoney = state.money;
  for (const authored of path.responses) {
    const response = paraphrase ? `${authored} Per favore.` : authored;
    const before = state;
    const result = submitEpisodeResponse(state, response, createId);
    assert.equal(result.kind, "advanced", `${episodeId} ${path.name}: ${response} must use the normal coordinator`);
    if (result.kind !== "advanced") continue;
    state = result.state;
    assert.equal(meaningful(before, state), true, `${episodeId} ${path.name}: ${response} cannot be a no-op`);
    assert.ok(state.money >= 0, `${episodeId} ${path.name}: money cannot become negative`);
  }
  assert.equal(state.outcome?.id, path.outcomeId, `${episodeId} ${path.name}: truthful outcome`);
  assert.notEqual(state.status, "active", `${episodeId} ${path.name}: path must terminate`);

  const restored = hydrateGameState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.outcome?.id, state.outcome?.id, `${episodeId} ${path.name}: outcome survives reload`);
  assert.equal(restored.money, state.money, `${episodeId} ${path.name}: money survives reload`);
  assert.deepEqual(restored.verifiedFacts, state.verifiedFacts, `${episodeId} ${path.name}: facts survive reload`);

  const repeated = submitEpisodeResponse(restored, path.responses.at(-1) ?? "Grazie.", createId);
  assert.equal(repeated.kind, "advanced");
  assert.deepEqual(repeated.state, restored, `${episodeId} ${path.name}: post-terminal response must be inert`);
  assert.ok(Math.abs(state.money - startingMoney) <= 100_000, `${episodeId} ${path.name}: bounded money delta`);
  return state;
}

for (const definition of IMPLEMENTED_EPISODE_DEFINITIONS) {
  test(`${definition.id} canonical, natural paraphrase, and intentional exit satisfy the response contract`, () => {
    const canonical: ContractPath = {
      name: "canonical",
      responses: definition.canonicalDemo.responses,
      outcomeId: definition.canonicalDemo.expectedOutcomeId,
    };
    runPath(definition.id, canonical);
    runPath(definition.id, canonical, true);

    const exited = runPath(definition.id, {
      name: "intentional exit",
      responses: ["Devo andare."],
      outcomeId: EXIT_OUTCOME_BY_EPISODE[definition.id],
    });
    assert.equal(exited.status === "resolved" || exited.status === "complete", true);
  });
}

test("authored alternate choices reach their truthful branches", () => {
  for (const [episodeId, paths] of Object.entries(ALTERNATE_PATHS) as [EpisodeId, readonly ContractPath[]][]) {
    for (const path of paths) runPath(episodeId, path);
  }
});

test("Day 3 owner phrase supports stay and takeaway with exactly-once payment and preference evidence", () => {
  const createId = ids("day3-owner");
  for (const [choice, expectedOutcome, expectedPreference] of [
    ["Qui, grazie.", "D03-O1", "drink here"],
    ["vorrei un espresso da portare", "D03-O3", "takeaway"],
  ] as const) {
    let state = seedEpisodeState(initialState(), "day-03");
    const startingMoney = state.money;
    state = submitEpisodeResponse(state, "Vorrei un espresso.", createId).state;
    state = submitEpisodeResponse(state, choice, createId).state;
    assert.equal(state.verifiedFacts.preferenceSelected, expectedPreference);

    state = hydrateGameState(JSON.parse(JSON.stringify(state)));
    const paid = submitEpisodeResponse(state, "Pago con la carta.", createId).state;
    assert.equal(paid.outcome?.id, expectedOutcome);
    assert.equal(paid.money, startingMoney - 200);
    assert.deepEqual(paid.observedMoves, ["request", "preference", "pay", "confirm"]);
    assert.equal(paid.verifiedFacts.priceConfirmed, true);

    const duplicate = submitEpisodeResponse(paid, "Pago con la carta.", createId).state;
    assert.deepEqual(duplicate, paid);
    assert.equal(duplicate.money, startingMoney - 200);
    const handoff = createSeasonEpisodeHandoff(duplicate);
    assert.equal(handoff?.preferenceSelected, expectedPreference);
  }
});

test("same-turn retry guidance replaces itself instead of posing as a world consequence", () => {
  const createId = ids("retry");
  let state = seedEpisodeState(initialState(), "day-03");
  state = submitEpisodeResponse(state, "Vorrei un espresso.", createId).state;
  const beforeSystems = state.history.filter((item) => item.kind === "system").length;
  state = submitEpisodeResponse(state, "Forse.", createId).state;
  const firstGuidance = state.guidance;
  state = submitEpisodeResponse(state, "Non so.", createId).state;
  assert.equal(state.guidance, firstGuidance);
  assert.equal(state.history.filter((item) => item.kind === "system").length, beforeSystems);
  assert.equal(state.attempts, 2);
});
