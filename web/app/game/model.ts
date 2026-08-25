import type { EpisodeId } from "../season/manifest";
import { SCENES, implementedEpisode, sceneForEpisode } from "../season/registry";
import type { ObservedMove, VerifiedEpisodeFacts } from "../season/types";

export const PLAYER_RESPONSE_MAX_LENGTH = 500;

export type Tone = "success" | "partial" | "open";
export type Rental = "custom" | "standard" | "chair" | null;
export type RelationshipDisposition = "neutral" | "efficient" | "warm" | "strained";
export type LaundryStatus = "not-started" | "clean" | "postponed";
export type TransportMode = "none" | "bus" | "ferry";
export type TransportStatus = "none" | "booked" | "cancelled" | "refunded" | "replacement-bus" | "rebooked" | "completed";
export type HotWaterStatus = "unknown" | "reported" | "temporary" | "fixed";
export type CommitmentStatus = "active" | "fulfilled" | "breached" | "deferred";
export type ParcelStatus = "none" | "pending" | "collected" | "redelivery";
export type SecondParcelStatus = "none" | "neighbor-held" | "collected" | "declined";
export type BeachPlanStatus = "none" | "left-for-wind" | "sheltered-chair";
export type BeachRemedy = "none" | "credit" | "refund";
export type InvitationResponse = "none" | "accepted" | "maybe" | "declined";
export type EventAttendance = "unknown" | "attended" | "did-not-attend";
export type TablePreference = "none" | "quiet" | "view";
export type RepairCreditEligibility = "unknown" | "eligible" | "ineligible";
export type RepairCreditStatus = "none" | "issued" | "declined";
export type StayResponse = "unknown" | "not-sure" | "yes" | "no";
export type KeyCustody = "not-held" | "held" | "returned" | "missing";
export type DepartureStatus = "not-planned" | "planned" | "departed" | "blocked";
export type TransportPlan = {
  id: string;
  firstDeparture: string;
  changeAt: string;
  connectionTime: string;
  stand: string;
  fare: number;
  status: "quoted" | "paid" | "cancelled";
} | null;
export type SeasonCompletion = {
  attempt: number;
  outcomeId: string;
  keyResolution: { hotel: KeyCustody; apartment: KeyCustody };
  obligations: string[];
  openIssues: string[];
  departurePlan: string;
  completedEpisodeIds: EpisodeId[];
  reflectionInputs: {
    vendorPreference: string | null;
    tablePreference: TablePreference;
    stayResponse: StayResponse;
  };
};
export type RepairCommitment = { window: string; status: CommitmentStatus } | null;
export type SceneId =
  | "hotel"
  | "apartment"
  | "alimentari"
  | "morning-bar"
  | "beach"
  | "produce"
  | "bus"
  | "pharmacy"
  | "cafe"
  | "bartender"
  | "laundry"
  | "marina"
  | "trattoria"
  | "repair"
  | "beach-alternative"
  | "changed-stop"
  | "grocery-correction"
  | "parcel"
  | "repair-reminder"
  | "pharmacy-substitute"
  | "ferry-cancellation"
  | "repair-fix"
  | "vendor-recommendation"
  | "neighbor-parcel"
  | "weather-beach"
  | "invitation"
  | "quiet-table"
  | "repair-close"
  | "day-trip"
  | "farewell-coffee"
  | "checkout";
export type PhraseId =
  | "need"
  | "would_like"
  | "am"
  | "have"
  | "need_to"
  | "can"
  | "where"
  | "cost"
  | "understand"
  | "confirm"
  | "decline"
  | "pay"
  | "how"
  | "problem"
  | "alternative"
  | "duration"
  | "past_commitment"
  | "recommendation"
  | "credit"
  | "uncertainty"
  | "quiet_table"
  | "settled"
  | "change"
  | "departure";
export type HistoryItem = {
  id: string;
  kind: "player" | "system";
  text: string;
};
export type Feedback = {
  understood: string;
  natural: string;
  variation: string;
  automatic: boolean;
} | null;
export type TeachingFeedback = {
  understood: string;
  natural: string;
  tryNext?: string;
} | null;
export type Outcome = {
  id: string;
  title: string;
  detail: string;
  consequence: string;
  tone: Tone;
};
export type SupportRecord = { replay: number; careful: number; transcript: number };
export type ProgressiveHelpLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type ProgressiveHelpContent = {
  listenFor: readonly [string] | readonly [string, string];
  meaning: string;
  frame: string;
  model: string;
};
export type ProgressiveHelpRecord = {
  highestLevel: 0 | ProgressiveHelpLevel;
  revealedLevels: ProgressiveHelpLevel[];
  normalReplayCount: number;
  carefulReplayCount: number;
};
export type EpisodeResult = {
  episodeId: EpisodeId;
  attempt: number;
  outcomeId: string;
  observedMoves: ObservedMove[];
  verifiedFacts: VerifiedEpisodeFacts;
  response: string;
  support: SupportRecord;
  refresher: EpisodeRefresherEvidence;
  progressiveHelp: Record<string, ProgressiveHelpRecord>;
  teachingFeedback: TeachingFeedback;
};
export type EpisodeRefresherEvidence = {
  opened: number;
  applied: number;
  method: "inserted" | "rebuilt" | null;
};
export type GameState = {
  schemaVersion: 6;
  episodeId: EpisodeId;
  turnId: string;
  status: "active" | "resolved" | "complete";
  money: number;
  hotelKey: boolean;
  breakfastKnown: boolean;
  apartmentKey: boolean;
  inventory: string[];
  busTicket: boolean;
  routeFact: string | null;
  pharmacyItem: string | null;
  knownFacts: string[];
  commitments: string[];
  relationships: Record<string, RelationshipDisposition>;
  rental: Rental;
  cafeOutcome: string | null;
  ferryMemory: string | null;
  currentLocation: string;
  currentTime: string;
  laundryStatus: LaundryStatus;
  transportMode: TransportMode;
  transportStatus: TransportStatus;
  transportTicketPrice: number;
  hotWaterStatus: HotWaterStatus;
  repairCommitment: RepairCommitment;
  parcelStatus: ParcelStatus;
  vendorPreference: string | null;
  secondParcelStatus: SecondParcelStatus;
  beachPlanStatus: BeachPlanStatus;
  beachWeather: "unknown" | "windy-early-close";
  beachDayPassPaid: boolean;
  beachDayPassPrice: number;
  beachRemedy: BeachRemedy;
  invitationResponse: InvitationResponse;
  eventAttendance: EventAttendance;
  tablePreference: TablePreference;
  repairCreditEligibility: RepairCreditEligibility;
  repairCreditStatus: RepairCreditStatus;
  transportPlan: TransportPlan;
  stayResponse: StayResponse;
  keyCustody: { hotel: KeyCustody; apartment: KeyCustody };
  checkoutObligations: string[];
  openIssues: string[];
  departurePlan: string | null;
  departureStatus: DepartureStatus;
  worldEvents: string[];
  seasonCompletion: SeasonCompletion | null;
  pendingOutcome: string | null;
  completed: EpisodeId[];
  outcome: Outcome | null;
  feedback: Feedback;
  teachingFeedback: TeachingFeedback;
  guidance: string | null;
  history: HistoryItem[];
  support: Record<string, SupportRecord>;
  phrasePractice: Record<PhraseId, number>;
  episodeResults: Partial<Record<EpisodeId, EpisodeResult[]>>;
  episodeRefreshers: Partial<Record<EpisodeId, EpisodeRefresherEvidence>>;
  progressiveHelp: Record<string, ProgressiveHelpRecord>;
  observedMoves: ObservedMove[];
  verifiedFacts: VerifiedEpisodeFacts;
  attempts: number;
  lastResponse: string;
};

export type Turn = {
  id: string;
  npc: string;
  text: string;
  normal: string;
  careful: string;
  cue: string;
  progressiveHelp?: ProgressiveHelpContent;
  teachingFeedback?: Readonly<Record<string, Exclude<TeachingFeedback, null>>>;
  terminal?: boolean;
};

export type Scene = {
  id: SceneId;
  episodeId: EpisodeId;
  day: string;
  dateLabel: string;
  title: string;
  location: string;
  time: string;
  npc: string;
  role: string;
  objective: string;
  firstTurn: string;
  kicker: string;
  suggestions: readonly string[];
};

export type PhraseLesson = {
  id: PhraseId;
  english: string;
  italian: string;
  note: string;
};

export type PhraseExample = {
  italian: string;
  english: string;
};

export type TeachingMoment = {
  phraseId: PhraseId;
  original: string | null;
  source: "english" | "toolkit" | "help";
};

export const STORAGE_KEY = "un-mese-prototype-v1";

export const PHRASE_LESSONS: PhraseLesson[] = [
  {
    id: "need",
    english: "I need [a thing]",
    italian: "Mi serve… / Mi servono…",
    note: "Use serve for one thing and servono for more than one. The thing you need comes next.",
  },
  {
    id: "would_like",
    english: "I would like",
    italian: "Vorrei…",
    note: "Vorrei is the dependable, polite default for ordering or asking for something.",
  },
  {
    id: "am",
    english: "I am",
    italian: "Sono…",
    note: "Use sono with an identity or condition: sono stanco, sono solo, sono pronto.",
  },
  {
    id: "have",
    english: "I have",
    italian: "Ho…",
    note: "Use ho before a thing. Italian also uses it in everyday states such as ho fame and ho sete.",
  },
  {
    id: "need_to",
    english: "I need to / I have to",
    italian: "Devo…",
    note: "Put an action after devo: devo andare, devo pagare, devo prendere l’autobus.",
  },
  {
    id: "can",
    english: "Can I? / Could you?",
    italian: "Posso…? / Può…?",
    note: "Posso asks what you can do. Può politely asks the other person to do something.",
  },
  {
    id: "where",
    english: "Where is?",
    italian: "Dov’è…?",
    note: "Put the place or singular thing directly after dov’è.",
  },
  {
    id: "cost",
    english: "How much is it?",
    italian: "Quanto costa…?",
    note: "Use quanto costa for one item and quanto costano for more than one.",
  },
  {
    id: "understand",
    english: "I don’t understand",
    italian: "Non capisco…",
    note: "Non capisco is enough by itself. Add può ripetere to ask the other person to repeat.",
  },
  {
    id: "confirm",
    english: "Yes / that’s okay",
    italian: "Sì / Va bene",
    note: "Sì confirms yes. Va bene accepts an option or says that it works for you.",
  },
  {
    id: "decline",
    english: "No, thank you",
    italian: "No, grazie…",
    note: "No, grazie is a complete polite refusal. Add non mi serve when you do not need the item.",
  },
  {
    id: "pay",
    english: "I’ll pay / by card",
    italian: "Pago… / Con la carta",
    note: "Pago introduces what or how you will pay. Con la carta is often enough on its own.",
  },
  {
    id: "how",
    english: "How does this work?",
    italian: "Come funziona?",
    note: "Come funziona asks how a machine, process, or service works.",
  },
  {
    id: "problem",
    english: "There is a problem",
    italian: "C’è un problema…",
    note: "Name only the practical problem you need to solve: non c’è acqua calda, non parte, non funziona.",
  },
  {
    id: "alternative",
    english: "Is there an alternative?",
    italian: "C’è un’alternativa?",
    note: "Use this when the original item, route, or plan is unavailable.",
  },
  {
    id: "duration",
    english: "How long does it take?",
    italian: "Quanto tempo ci vuole?",
    note: "This asks for a duration, not a departure time or price.",
  },
  {
    id: "past_commitment",
    english: "You said…",
    italian: "Aveva detto…",
    note: "Use aveva detto to refer politely to an earlier promise or stated time.",
  },
  {
    id: "recommendation",
    english: "What do you recommend?",
    italian: "Cosa mi consiglia?",
    note: "Use this polite question when you want one practical recommendation.",
  },
  {
    id: "credit",
    english: "Can I get a credit?",
    italian: "Posso avere un buono?",
    note: "A buono is a credit or voucher. Ask only after establishing what happened.",
  },
  {
    id: "uncertainty",
    english: "I’m not sure yet",
    italian: "Non lo so ancora.",
    note: "This gives a truthful answer without promising a future decision.",
  },
  {
    id: "quiet_table",
    english: "I would prefer a quiet table",
    italian: "Preferirei un tavolo tranquillo.",
    note: "Preferirei makes a calm preference without requiring an explanation.",
  },
  {
    id: "settled",
    english: "Is everything settled?",
    italian: "È tutto a posto?",
    note: "Use this to confirm that practical obligations are complete.",
  },
  {
    id: "change",
    english: "Where do I change?",
    italian: "Dove devo cambiare?",
    note: "Use this for the transfer point in a multi-step route.",
  },
  {
    id: "departure",
    english: "I’m leaving tomorrow",
    italian: "Parto domani.",
    note: "Use parto with a stated departure time or day.",
  },
];

export const PHRASE_EXAMPLES: Record<PhraseId, Partial<Record<SceneId, PhraseExample>>> = {
  need: {
    hotel: { italian: "Mi serve la chiave della camera.", english: "I need the room key." },
    beach: {
      italian: "Mi servono un lettino e un ombrellone.",
      english: "I need one beach chair and one umbrella.",
    },
    cafe: { italian: "Mi serve il conto corretto.", english: "I need the corrected bill." },
    bartender: { italian: "Mi serve solo un caffè.", english: "I only need a coffee." },
  },
  would_like: {
    hotel: { italian: "Vorrei fare il check-in.", english: "I would like to check in." },
    beach: {
      italian: "Vorrei un lettino e un ombrellone per oggi.",
      english: "I would like one beach chair and one umbrella for today.",
    },
    cafe: {
      italian: "Vorrei il cappuccino che avevo ordinato.",
      english: "I would like the cappuccino I ordered.",
    },
    bartender: { italian: "Vorrei un espresso, grazie.", english: "I would like an espresso, thanks." },
  },
  am: {
    hotel: { italian: "Sono stanco. Buonanotte.", english: "I am tired. Good night." },
    beach: { italian: "Sono solo, quindi un solo lettino.", english: "I am alone, so just one chair." },
    cafe: { italian: "Sono sicuro: non ho ordinato la spremuta.", english: "I am sure: I did not order the juice." },
    bartender: { italian: "Sono di fretta oggi.", english: "I am in a hurry today." },
  },
  have: {
    hotel: {
      italian: "Ho una prenotazione a nome Fuscoletti.",
      english: "I have a reservation under Fuscoletti.",
    },
    beach: { italian: "Ho ventidue euro.", english: "I have twenty-two euros." },
    cafe: { italian: "Ho ordinato un cappuccino.", english: "I ordered a cappuccino." },
    bartender: { italian: "Ho poco tempo.", english: "I have little time." },
  },
  need_to: {
    hotel: { italian: "Devo andare in camera.", english: "I need to go to my room." },
    beach: { italian: "Devo andare via alle sei.", english: "I need to leave at six." },
    cafe: { italian: "Devo pagare il conto corretto.", english: "I need to pay the corrected bill." },
    bartender: { italian: "Devo andare, ma prima pago.", english: "I need to go, but first I’ll pay." },
  },
  can: {
    hotel: { italian: "Può ripetere, per favore?", english: "Could you repeat, please?" },
    beach: { italian: "Posso avere un solo lettino?", english: "Can I have just one beach chair?" },
    cafe: { italian: "Può correggere il conto?", english: "Could you correct the bill?" },
    bartender: { italian: "Posso pagare con la carta?", english: "Can I pay by card?" },
  },
  where: {
    hotel: { italian: "Dov’è la camera dodici?", english: "Where is room twelve?" },
    beach: { italian: "Dov’è il mio lettino?", english: "Where is my beach chair?" },
    cafe: { italian: "Dov’è il mio cappuccino?", english: "Where is my cappuccino?" },
    bartender: { italian: "Dov’è il bagno?", english: "Where is the bathroom?" },
  },
  cost: {
    hotel: { italian: "Quanto costa la camera?", english: "How much is the room?" },
    beach: { italian: "Quanto costa per oggi?", english: "How much is it for today?" },
    cafe: { italian: "Quanto devo pagare?", english: "How much do I need to pay?" },
    bartender: { italian: "Quanto costa l’espresso?", english: "How much is the espresso?" },
  },
  understand: {
    hotel: { italian: "Non capisco. Può ripetere?", english: "I don’t understand. Could you repeat?" },
    beach: { italian: "Non capisco. Uno o due lettini?", english: "I don’t understand. One or two chairs?" },
    cafe: { italian: "Non capisco. Può ripetere?", english: "I don’t understand. Could you repeat?" },
    bartender: { italian: "Non ho capito. Puoi ripetere?", english: "I didn’t understand. Can you repeat?" },
  },
  confirm: {
    hotel: { italian: "Sì, va bene. Grazie.", english: "Yes, that’s fine. Thank you." },
    beach: { italian: "Sì, va bene. Con la carta.", english: "Yes, that’s fine. By card." },
    cafe: { italian: "Sì, va bene. Lo corregga, grazie.", english: "Yes, that’s fine. Correct it, please." },
    bartender: { italian: "Sì, il solito. Grazie.", english: "Yes, the usual. Thanks." },
  },
  decline: {
    hotel: { italian: "No, grazie. Sono stanco.", english: "No, thank you. I’m tired." },
    beach: { italian: "No, grazie. Non mi serve.", english: "No, thank you. I don’t need it." },
    cafe: { italian: "No, non va bene.", english: "No, that’s not okay." },
    bartender: { italian: "No, grazie. Non oggi.", english: "No, thank you. Not today." },
  },
  pay: {
    hotel: { italian: "Pago con la carta.", english: "I’ll pay by card." },
    beach: { italian: "Pago con la carta.", english: "I’ll pay by card." },
    cafe: { italian: "Pago il conto corretto con la carta.", english: "I’ll pay the corrected bill by card." },
    bartender: { italian: "Pago con la carta, grazie.", english: "I’ll pay by card, thanks." },
  },
  how: {
    hotel: { italian: "Come funziona?", english: "How does this work?" },
  },
  problem: {
    hotel: { italian: "C’è un problema.", english: "There is a problem." },
  },
  alternative: {
    hotel: { italian: "C’è un’alternativa?", english: "Is there an alternative?" },
  },
  duration: {
    hotel: { italian: "Quanto tempo ci vuole?", english: "How long does it take?" },
  },
  past_commitment: {
    hotel: { italian: "Aveva detto stamattina.", english: "You said this morning." },
  },
  recommendation: {
    hotel: { italian: "Cosa mi consiglia?", english: "What do you recommend?" },
  },
  credit: {
    hotel: { italian: "Posso avere un buono?", english: "Can I get a credit?" },
  },
  uncertainty: {
    hotel: { italian: "Non lo so ancora.", english: "I’m not sure yet." },
  },
  quiet_table: {
    hotel: { italian: "Preferirei un tavolo tranquillo.", english: "I would prefer a quiet table." },
  },
  settled: {
    hotel: { italian: "È tutto a posto?", english: "Is everything settled?" },
  },
  change: {
    hotel: { italian: "Dove devo cambiare?", english: "Where do I change?" },
  },
  departure: {
    hotel: { italian: "Parto domani.", english: "I’m leaving tomorrow." },
  },
};

const SCENE_EXAMPLE_TARGETS: Partial<Record<SceneId, { thing: string; action: string; english: string }>> = {
  apartment: { thing: "la chiave", action: "entrare nell’appartamento", english: "the apartment key" },
  alimentari: { thing: "pane, formaggio e acqua", action: "comprare la cena", english: "bread, cheese, and water" },
  "morning-bar": { thing: "un espresso", action: "bere un espresso qui", english: "an espresso" },
  produce: { thing: "mezzo chilo di pomodori", action: "comprare mezzo chilo", english: "half a kilo of tomatoes" },
  bus: { thing: "un biglietto per Amalfi", action: "prendere l’autobus", english: "one ticket to Amalfi" },
  pharmacy: { thing: "qualcosa per le punture", action: "comprare la crema", english: "something for the bites" },
};

export function phraseExampleFor(phraseId: PhraseId, sceneId: SceneId, episodeId?: EpisodeId): PhraseExample {
  const episodeExample = episodeId ? implementedEpisode(episodeId)?.phraseExamples?.[phraseId] : undefined;
  if (episodeExample) return episodeExample;
  const authored = PHRASE_EXAMPLES[phraseId][sceneId];
  if (authored) return authored;
  const target = SCENE_EXAMPLE_TARGETS[sceneId as keyof typeof SCENE_EXAMPLE_TARGETS];
  if (!target) return PHRASE_EXAMPLES[phraseId].hotel!;
  const examples: Record<PhraseId, PhraseExample> = {
    need: { italian: `Mi serve ${target.thing}.`, english: `I need ${target.english}.` },
    would_like: { italian: `Vorrei ${target.thing}.`, english: `I would like ${target.english}.` },
    am: { italian: "Sono qui per questo.", english: "I am here for this." },
    have: { italian: `Ho ${target.thing}.`, english: `I have ${target.english}.` },
    need_to: { italian: `Devo ${target.action}.`, english: `I need to ${target.action}.` },
    can: { italian: `Posso avere ${target.thing}?`, english: `Can I have ${target.english}?` },
    where: { italian: "Dov’è, per favore?", english: "Where is it, please?" },
    cost: { italian: "Quanto costa?", english: "How much is it?" },
    understand: { italian: "Non capisco. Può ripetere?", english: "I don’t understand. Could you repeat?" },
    confirm: { italian: "Sì, va bene. Grazie.", english: "Yes, that works. Thank you." },
    decline: { italian: "No, grazie. Basta così.", english: "No, thank you. That is enough." },
    pay: { italian: "Pago con la carta.", english: "I’ll pay by card." },
    how: { italian: "Come funziona?", english: "How does this work?" },
    problem: { italian: "C’è un problema.", english: "There is a problem." },
    alternative: { italian: "C’è un’alternativa?", english: "Is there an alternative?" },
    duration: { italian: "Quanto tempo ci vuole?", english: "How long does it take?" },
    past_commitment: { italian: "Aveva detto stamattina.", english: "You said this morning." },
    recommendation: { italian: "Cosa mi consiglia?", english: "What do you recommend?" },
    credit: { italian: "Posso avere un buono?", english: "Can I get a credit?" },
    uncertainty: { italian: "Non lo so ancora.", english: "I’m not sure yet." },
    quiet_table: { italian: "Preferirei un tavolo tranquillo.", english: "I would prefer a quiet table." },
    settled: { italian: "È tutto a posto?", english: "Is everything settled?" },
    change: { italian: "Dove devo cambiare?", english: "Where do I change?" },
    departure: { italian: "Parto domani.", english: "I’m leaving tomorrow." },
  };
  return examples[phraseId];
}

export const PHRASE_BY_ID = Object.fromEntries(
  PHRASE_LESSONS.map((lesson) => [lesson.id, lesson]),
) as Record<PhraseId, PhraseLesson>;

export function initialPhrasePractice(): Record<PhraseId, number> {
  return Object.fromEntries(PHRASE_LESSONS.map((lesson) => [lesson.id, 0])) as Record<
    PhraseId,
    number
  >;
}

export function fallbackPhraseForContext(sceneId: SceneId, turnId = "", episodeId?: EpisodeId): PhraseId {
  if (episodeId) {
    const authored = implementedEpisode(episodeId)?.defaultPhrase;
    if (authored) return authored;
  }
  if (any(turnId, ["e02_04", "e02_05", "e02_06", "e03_03", "e03_04", "e03_05", "e04_02"])) {
    return "confirm";
  }
  if (any(turnId, ["e03_08", "e04_04", "e04_05", "e04_06"])) return "pay";
  if (turnId === "e01_03_key") return "where";
  if (sceneId === "hotel") return "have";
  if (sceneId === "beach") return "need";
  if (sceneId === "cafe") return "have";
  return "would_like";
}

export function detectTeachingPhrase(response: string, sceneId: SceneId, turnId: string, episodeId?: EpisodeId): PhraseId | null {
  const value = normalize(response);

  if (any(value, ["i don t understand", "i dont understand", "don t know", "dont know", "what did you say", "no entiendo"])) {
    return "understand";
  }
  if (value === "no" || anyWholePhrase(value, ["no thanks", "no thank you", "not today"])) return "decline";
  if (anyWholePhrase(value, ["yes", "okay", "ok", "sure", "that s fine", "thats fine"])) return "confirm";
  if (any(value, ["i ll pay", "ill pay", "pay by", "with card", "by card", "cash"])) return "pay";
  if (any(value, ["i need to", "i have to", "need to", "tengo que"])) return "need_to";
  if (any(value, ["i would like", "i d like", "id like", "i want", "quiero"])) return "would_like";
  if (any(value, ["i need", "need a", "need one", "necesito"])) return "need";
  if (/\b(i am|i m|im|soy|estoy)\b/.test(value)) return "am";
  if (/\b(i have|i ve|ive)\b/.test(value)) return "have";
  if (any(value, ["can i", "could i", "can you", "could you", "puedo"])) return "can";
  if (any(value, ["where is", "where s", "wheres", "donde"])) return "where";
  if (any(value, ["how much", "what does it cost", "cuanto cuesta"])) return "cost";
  if (any(value, ["how does this work", "how does it work", "como funciona"])) return "how";
  if (any(value, ["there is a problem", "there s a problem", "no hot water", "doesn t work", "does not work", "hay un problema"])) return "problem";
  if (any(value, ["is there an alternative", "another option", "anything else", "hay una alternativa"])) return "alternative";
  if (any(value, ["how long", "how much time", "cuanto tiempo"])) return "duration";
  if (any(value, ["you said", "you promised", "usted dijo", "habia dicho"])) return "past_commitment";
  if (any(value, ["what do you recommend", "what would you recommend", "recommendation"])) return "recommendation";
  if (any(value, ["can i get a credit", "can i have a credit", "credit or voucher"])) return "credit";
  if (any(value, ["i m not sure yet", "im not sure yet", "i don t know yet", "i dont know yet"])) return "uncertainty";
  if (any(value, ["quiet table", "somewhere quiet"])) return "quiet_table";
  if (any(value, ["is everything settled", "everything settled", "all settled"])) return "settled";
  if (any(value, ["where do i change", "where is the transfer", "change buses"])) return "change";
  if (any(value, ["i m leaving tomorrow", "im leaving tomorrow", "i leave tomorrow"])) return "departure";

  const hasItalianFrame = any(value, [
    "mi serve",
    "mi servono",
    "vorrei",
    "sono ",
    "ho ",
    "devo ",
    "posso ",
    "puo ",
    "dov e",
    "quanto ",
    "come funziona",
    "c e un problema",
    "alternativa",
    "aveva detto",
    "cosa mi consiglia",
    "posso avere un buono",
    "non lo so ancora",
    "tavolo tranquillo",
    "tutto a posto",
    "devo cambiare",
    "parto domani",
    " per ",
    " e un",
    " e una",
    "non ",
    "grazie",
  ]);
  const hasEnglishFallback = any(value, [
    " i ",
    " the ",
    " and ",
    " to ",
    " please",
    " just ",
    " only ",
    " what ",
    " why ",
    " don t ",
    " dont ",
    " know",
    "chair",
    "umbrella",
    "booking",
    "reservation",
    "room",
    "breakfast",
    "wrong",
    "ordered",
    "bill",
    "juice",
    "water",
    "coffee",
    "today",
    "this ",
    "that ",
  ]);

  return hasEnglishFallback && !hasItalianFrame ? fallbackPhraseForContext(sceneId, turnId, episodeId) : null;
}

export function initialSupport(): Record<string, SupportRecord> {
  return Object.fromEntries(
    SCENES.map((scene) => [scene.id, { replay: 0, careful: 0, transcript: 0 }]),
  );
}

export function initialState(): GameState {
  return {
    schemaVersion: 6,
    episodeId: SCENES[0].episodeId,
    turnId: SCENES[0].firstTurn,
    status: "active",
    money: 10000,
    hotelKey: false,
    breakfastKnown: false,
    apartmentKey: false,
    inventory: [],
    busTicket: false,
    routeFact: null,
    pharmacyItem: null,
    knownFacts: [],
    commitments: [],
    relationships: {},
    rental: null,
    cafeOutcome: null,
    ferryMemory: null,
    currentLocation: "Hotel Sirena · Salerno",
    currentTime: "21:10",
    laundryStatus: "not-started",
    transportMode: "none",
    transportStatus: "none",
    transportTicketPrice: 0,
    hotWaterStatus: "unknown",
    repairCommitment: null,
    parcelStatus: "none",
    vendorPreference: null,
    secondParcelStatus: "none",
    beachPlanStatus: "none",
    beachWeather: "unknown",
    beachDayPassPaid: false,
    beachDayPassPrice: 0,
    beachRemedy: "none",
    invitationResponse: "none",
    eventAttendance: "unknown",
    tablePreference: "none",
    repairCreditEligibility: "unknown",
    repairCreditStatus: "none",
    transportPlan: null,
    stayResponse: "unknown",
    keyCustody: { hotel: "not-held", apartment: "not-held" },
    checkoutObligations: [],
    openIssues: [],
    departurePlan: null,
    departureStatus: "not-planned",
    worldEvents: [],
    seasonCompletion: null,
    pendingOutcome: null,
    completed: [],
    outcome: null,
    feedback: null,
    teachingFeedback: null,
    guidance: null,
    history: [],
    support: initialSupport(),
    phrasePractice: initialPhrasePractice(),
    episodeResults: {},
    episodeRefreshers: {},
    progressiveHelp: {},
    observedMoves: [],
    verifiedFacts: {},
    attempts: 0,
    lastResponse: "",
  };
}

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(value / 100);

export function normalize(value: string) {
  return value
    .toLocaleLowerCase("it")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9€.,\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const any = (value: string, terms: string[]) => terms.some((term) => value.includes(term));

export function anyWholePhrase(value: string, terms: string[]) {
  return terms.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\s)${escaped}(?=$|[\\s,.])`).test(value);
  });
}

export const YES = ["si", "yes", "va bene", "okay", "ok", "certo", "prendo", "accetto"];
export const NO = ["no", "niente", "leave", "esco", "vado", "basta", "no thanks", "no grazie"];
export const PAY = ["carta", "card", "contanti", "cash", "pago", "pagare", "pay"];
export const EXIT = [
  "leave",
  "esco",
  "vado",
  "devo andare",
  "stanco",
  "buonanotte",
  "piu tardi",
  "later",
  "un altra volta",
  "no grazie",
  "no thanks",
  "basta",
];

export function hasMixedNouns(value: string) {
  return any(value, ["chair", "umbrella", "sombrilla", "silla", "beach"]);
}

export function createFeedback(sceneId: string, response: string, meaningChanged = false): Feedback {
  const n = normalize(response);
  if (sceneId === "beach" && hasMixedNouns(n)) {
    return {
      understood: "One beach chair and one umbrella for today.",
      natural: "Vorrei un lettino e un ombrellone per oggi.",
      variation: "Solo un lettino, grazie.",
      automatic: meaningChanged,
    };
  }
  if (sceneId === "cafe" && any(n, ["io ordinato", "ho ordinare", "ordinato cappuccino", "quiero cappuccino"])) {
    return {
      understood: "You ordered a cappuccino, not the drink that arrived.",
      natural: "Avevo ordinato un cappuccino.",
      variation: "Questo non è quello che avevo ordinato.",
      automatic: true,
    };
  }
  if (sceneId === "bartender" && any(n, ["cancelled", "canceled", "bus", "autobus", "traghetto cancellato"])) {
    return {
      understood: "The ferry was cancelled, so you took the bus.",
      natural: "Il traghetto è stato cancellato, quindi ho preso l’autobus.",
      variation: "Alla fine sono venuto in autobus.",
      automatic: false,
    };
  }
  if (sceneId === "hotel" && any(n, ["booking", "reservation", "room"])) {
    return {
      understood: "You are checking in under the name Fuscoletti.",
      natural: "Ho una prenotazione a nome Fuscoletti.",
      variation: "Fuscoletti. Ho prenotato per due notti.",
      automatic: false,
    };
  }
  return null;
}

export const sceneTime = (episodeId: EpisodeId) => sceneForEpisode(episodeId)?.time ?? "";
