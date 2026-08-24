import { EXIT, any } from "../../game/model";
import { seasonEpisode } from "../manifest";
import { authoredTurn, buildObservedEpisodeResult, isAcceptedTransition, noObservation, observation, type EpisodeDefinition } from "../types";
import { addFact, finalArcAdminSeed } from "./shared";

const metadata = seasonEpisode("day-30");
const keyResolved = (value: "not-held" | "held" | "returned" | "missing") => value === "returned" || value === "not-held";
const issueAcknowledgement = (issue: string) => `Open issue acknowledged: ${issue}`;
const supportedIssue = (issue: string) =>
  issue === "Parcel follow-up remains open" || issue === "Traveler-reported checkout issue";

function issueIsExplicitlyAcknowledged(issue: string, normalized: string): boolean {
  if (issue === "Parcel follow-up remains open") return any(normalized, ["pacco", "parcel"]);
  if (issue === "Traveler-reported checkout issue") return any(normalized, ["problema", "issue"]);
  return false;
}

export const day30Episode: EpisodeDefinition = {
  ...metadata, sceneId: "checkout",
  scene: { id: "checkout", episodeId: "day-30", day: "Day 30", dateLabel: "Departure ready", title: metadata.title, location: metadata.location, time: "18:00", npc: "Raffaele", role: "Host", objective: "Return every held key, confirm the checkout obligations, acknowledge any open issue, and state the departure plan.", firstTurn: "d30_01_keys", kicker: "The season completes only after the saved obligations are actually resolved.", suggestions: ["Ecco le chiavi dell'appartamento e dell'hotel.", "È tutto a posto?", "Parto domani mattina."] },
  turns: {
    d30_01_keys: authoredTurn("d30_01_keys", "Raffaele", "Prima del check-out devo ritirare la chiave dell'appartamento e qualsiasi chiave dell'hotel che ha ancora.", "Return every held key, report a missing key, or leave."),
    d30_02_summary: authoredTurn("d30_02_summary", "Raffaele", "Le chiavi risultano consegnate. La riparazione è chiusa e non c'è altro da pagare. È tutto a posto?", "Confirm, or explicitly acknowledge a remaining issue."),
    d30_03_departure: authoredTurn("d30_03_departure", "Raffaele", "Bene. Quando parte?", "State the departure plan."),
    d30_04_complete: authoredTurn("d30_04_complete", "Raffaele", "Perfetto. Check-out completato. Buon viaggio.", "All required obligations resolved.", true),
    d30_05_complete_issue: authoredTurn("d30_05_complete_issue", "Raffaele", "L'uscita è completata. Il problema rimane annotato nel riepilogo.", "Keys resolved and open issue acknowledged.", true),
    d30_06_missing: authoredTurn("d30_06_missing", "Raffaele", "Manca una chiave. Non posso chiudere il check-out.", "Missing key remains unresolved.", true),
    d30_07_exit: authoredTurn("d30_07_exit", "Raffaele", "Va bene, ma il check-out non è ancora completo.", "Early exit; season remains unresolved.", true),
    d30_08_open: authoredTurn("d30_08_open", "Raffaele", "Segno il problema, ma prima di partire dobbiamo risolvere le chiavi.", "Issue acknowledged, keys unresolved.", true),
  },
  outcomes: {
    "D30-O1": { id: "D30-O1", title: "Ready to leave", detail: "Every held key was returned, the checkout obligations were confirmed, and your departure plan was stated.", consequence: "No charge · 31 sessions complete", tone: "success" },
    "D30-O2": { id: "D30-O2", title: "Ready to leave, issue recorded", detail: "The keys and checkout were resolved; one explicit open issue remains visible in the final record.", consequence: "No charge · completed with acknowledged issue", tone: "partial" },
    "D30-O3": { id: "D30-O3", title: "A key is unresolved", detail: "A required held key was reported missing, so checkout and season completion remain open.", consequence: "No charge · not complete", tone: "open" },
    "D30-O4": { id: "D30-O4", title: "Checkout paused", detail: "You left before the required keys, obligations, and departure plan were all resolved.", consequence: "No charge · not complete", tone: "open" },
    "D30-O5": { id: "D30-O5", title: "Checkout remains open", detail: "A key, checkout obligation, or supported issue acknowledgement is still unresolved.", consequence: "No charge · not complete", tone: "open" },
  },
  terminalOutcomeTurns: { "D30-O1": ["d30_04_complete"], "D30-O2": ["d30_05_complete_issue"], "D30-O3": ["d30_06_missing"], "D30-O4": ["d30_07_exit"], "D30-O5": ["d30_08_open"] },
  defaultPhrase: "settled",
  phraseExamples: { settled: { italian: "È tutto a posto?", english: "Is everything settled?" }, departure: { italian: "Parto domani.", english: "I’m leaving tomorrow." } },
  evaluateResponse({ state, normalized, createId, runtime }) {
    if (state.turnId === "d30_01_keys") {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d30_07_exit", "D30-O4", {}, createId);
      if (any(normalized, ["manca", "missing", "persa", "perso", "lost"])) {
        const issue = "Missing checkout key";
        return runtime.queueTerminal(state, "d30_06_missing", "D30-O3", { keyCustody: { hotel: state.hotelKey ? "missing" : state.keyCustody.hotel, apartment: state.apartmentKey ? "missing" : state.keyCustody.apartment }, openIssues: addFact(state.openIssues, issue), departureStatus: "blocked" }, createId);
      }
      if (any(normalized, ["chiavi", "keys", "chiave", "ecco", "consegno", "return"])) {
        const custody = {
          hotel: state.hotelKey || state.keyCustody.hotel === "held" ? "returned" as const : state.keyCustody.hotel,
          apartment: state.apartmentKey || state.keyCustody.apartment === "held" ? "returned" as const : state.keyCustody.apartment,
        };
        if (!keyResolved(custody.hotel) || !keyResolved(custody.apartment)) return runtime.queueTerminal(state, "d30_08_open", "D30-O5", { keyCustody: custody, departureStatus: "blocked" }, createId);
        const issueReminder = state.openIssues.length
          ? `Saved checkout issue requiring explicit acknowledgement: ${state.openIssues.join("; ")}`
          : undefined;
        return runtime.moveToTurn(state, "d30_02_summary", { hotelKey: false, apartmentKey: false, keyCustody: custody, checkoutObligations: addFact(state.checkoutObligations, "All held keys returned") }, issueReminder, createId);
      }
    }
    if (state.turnId === "d30_02_summary") {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d30_07_exit", "D30-O4", {}, createId);
      if (any(normalized, ["problema", "issue", "ancora", "open"])) {
        const reportedIssue = normalized.includes("pacco") || normalized.includes("parcel")
          ? "Parcel follow-up remains open"
          : "Traveler-reported checkout issue";
        const issues = state.openIssues.length ? state.openIssues : [reportedIssue];
        if (issues.length > 8 || issues.some((issue) => !supportedIssue(issue))) {
          return runtime.queueTerminal(state, "d30_08_open", "D30-O5", { departureStatus: "blocked" }, createId);
        }
        const unacknowledged = issues.filter((issue) => !issueIsExplicitlyAcknowledged(issue, normalized));
        if (unacknowledged.length) {
          return runtime.moveToTurn(
            state,
            state.turnId,
            {},
            `Name the saved issue explicitly before checkout can continue: ${unacknowledged.join("; ")}`,
            createId,
          );
        }
        const obligations = issues.reduce(
          (result, issue) => addFact(result, issueAcknowledgement(issue)),
          addFact(state.checkoutObligations, "Repair and balance reviewed"),
        );
        return runtime.moveToTurn(state, "d30_03_departure", { openIssues: issues, checkoutObligations: obligations }, undefined, createId);
      }
      if (any(normalized, ["tutto a posto", "all settled", "si", "yes", "va bene"])) {
        if (state.openIssues.length) {
          return runtime.moveToTurn(
            state,
            state.turnId,
            {},
            `“Everything is settled” cannot acknowledge the saved issue. Name it explicitly: ${state.openIssues.join("; ")}`,
            createId,
          );
        }
        return runtime.moveToTurn(state, "d30_03_departure", { checkoutObligations: addFact(state.checkoutObligations, "Repair and balance reviewed") }, undefined, createId);
      }
    }
    if (state.turnId === "d30_03_departure") {
      if (any(normalized, EXIT)) return runtime.queueTerminal(state, "d30_07_exit", "D30-O4", {}, createId);
      if (any(normalized, ["parto", "leaving", "domani", "tomorrow", "otto", "morning", "mattina"])) {
        const keysOkay = keyResolved(state.keyCustody.hotel) && keyResolved(state.keyCustody.apartment);
        if (!keysOkay) return runtime.queueTerminal(state, "d30_08_open", "D30-O5", { departureStatus: "blocked" }, createId);
        const issuesSupported = state.openIssues.length <= 8 && state.openIssues.every(supportedIssue);
        const issuesAcknowledged = state.openIssues.every((issue) => state.checkoutObligations.includes(issueAcknowledgement(issue)));
        if (!issuesSupported || !issuesAcknowledged || !state.checkoutObligations.includes("Repair and balance reviewed")) {
          return runtime.queueTerminal(state, "d30_08_open", "D30-O5", { departureStatus: "blocked" }, createId);
        }
        const departurePlan = normalized.includes("otto") ? "Depart tomorrow at 08:00" : "Depart tomorrow morning";
        const updates = { departurePlan, departureStatus: "planned" as const, checkoutObligations: addFact(state.checkoutObligations, "Departure plan confirmed"), currentLocation: "Casa Limone · checked out", currentTime: "18:10" };
        const hasIssue = state.openIssues.length > 0;
        return runtime.queueTerminal(state, hasIssue ? "d30_05_complete_issue" : "d30_04_complete", hasIssue ? "D30-O2" : "D30-O1", updates, createId);
      }
    }
    return state;
  },
  observeResponse({ before, after }) {
    if (!isAcceptedTransition(before, after)) return noObservation();
    if (after.turnId === "d30_02_summary") return observation(["confirm", "recovery"]);
    if (after.turnId === "d30_03_departure") return observation(["confirm", "problem"]);
    if (["d30_04_complete", "d30_05_complete_issue"].includes(after.turnId)) return observation(["confirm", "location"], { commitmentConfirmed: true });
    if (["d30_06_missing", "d30_08_open"].includes(after.turnId)) return observation(["problem", "boundary"]);
    return noObservation();
  },
  adminSeed: () => finalArcAdminSeed(30), buildResult: buildObservedEpisodeResult,
  completionOutcomeIds: ["D30-O1", "D30-O2"],
};
