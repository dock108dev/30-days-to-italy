export const EPISODE_IDS = [
  "day-00", "day-01", "day-02", "day-03", "day-04", "day-05", "day-06", "day-07",
  "day-08", "day-09", "day-10", "day-11", "day-12", "day-13", "day-14", "day-15",
  "day-16", "day-17", "day-18", "day-19", "day-20", "day-21", "day-22", "day-23",
  "day-24", "day-25", "day-26", "day-27", "day-28", "day-29", "day-30",
] as const;

export type EpisodeId = (typeof EPISODE_IDS)[number];
export type SupportProminence = "prominent" | "available" | "recovery";
export type EpisodeAuthoringStatus = "reviewed";

export type SeasonEpisode = {
  id: EpisodeId;
  day: number;
  title: string;
  practicalObjective: string;
  primaryMove: string;
  sceneId: string;
  unlockDaysBeforeDeparture: number | null;
  supportProminence: SupportProminence;
  pocketCardId: string | null;
  location: string;
  characterIds: readonly string[];
  recurringLanguageTargets: readonly string[];
  listeningChallenge: string;
  prerequisites: readonly EpisodeId[];
  contentVersion: string;
  authoringStatus: EpisodeAuthoringStatus;
};

const EPISODE_TITLES = [
  "Use the self-service laundry",
  "Choose bus or ferry for Amalfi",
  "Receive and correct a simple order",
  "Report that the apartment has no hot water",
  "Find a beach alternative",
  "Resolve a wrong and overcharged café order",
  "Handle a changed bus stop",
  "Correct the grocery total",
  "Collect a parcel without the expected document",
  "Remind Raffaele about the hot-water promise",
  "Find a pharmacy substitute",
  "Respond to a ferry cancellation",
  "Reject or accept an inadequate apartment fix",
  "Get a drink and choose whether to talk",
  "Choose a familiar vendor recommendation",
  "Retrieve a parcel and set a boundary",
  "Change a beach plan because of weather",
  "Respond to a small local-event invitation",
  "Arrange a quiet table",
  "Close the apartment repair loop",
  "Complete a disrupted day trip",
  "Pay and choose how much to share",
  "Prepare to leave the apartment",
] as const;

const EARLY_EPISODE_METADATA: Partial<Record<EpisodeId, Omit<SeasonEpisode, "id" | "day" | "unlockDaysBeforeDeparture">>> = {
  "day-00": {
    title: "A room for the night",
    practicalObjective: "Get your hotel key and enough information to reach the room.",
    primaryMove: "Identify yourself and end the exchange on your terms",
    sceneId: "hotel",
    supportProminence: "prominent",
    pocketCardId: "hotel-reservation",
    location: "Hotel Sirena · Salerno",
    characterIds: ["elena"],
    recurringLanguageTargets: ["identify self", "ask for repetition", "end politely"],
    listeningChallenge: "Hear the room number and breakfast end time after a tired-arrival greeting.",
    prerequisites: [], contentVersion: "1.0.0", authoringStatus: "reviewed",
  },
  "day-01": {
    title: "The key to Casa Limone",
    practicalObjective: "Meet Raffaele, get the apartment key, and confirm the door instructions.",
    primaryMove: "Identify yourself and request access",
    sceneId: "apartment",
    supportProminence: "prominent",
    pocketCardId: "apartment-key",
    location: "Casa Limone · Marina di Lume",
    characterIds: ["raffaele"],
    recurringLanguageTargets: ["identify self", "request access", "confirm location"],
    listeningChallenge: "Hear the green-door and first-floor instructions from a brisk speaker.",
    prerequisites: ["day-00"], contentVersion: "1.0.0", authoringStatus: "reviewed",
  },
  "day-02": {
    title: "A first meal",
    practicalObjective: "Buy a small first meal, decline a bag, and pay by card.",
    primaryMove: "Request, limit quantity, and pay",
    sceneId: "alimentari",
    supportProminence: "prominent",
    pocketCardId: "pay-by-card",
    location: "Alimentari Verde · Marina di Lume",
    characterIds: ["enzo"],
    recurringLanguageTargets: ["request items", "limit quantity", "pay by card"],
    listeningChallenge: "Hear the €8.40 total and distinguish the optional bag question.",
    prerequisites: [], contentVersion: "1.0.0", authoringStatus: "reviewed",
  },
  "day-03": {
    title: "Coffee, here or to go",
    practicalObjective: "Order one espresso, choose to stay, and complete the transaction.",
    primaryMove: "Order and choose between two options",
    sceneId: "morning-bar",
    supportProminence: "prominent",
    pocketCardId: "pay-by-card",
    location: "Bar Gabbiano · Marina di Lume",
    characterIds: ["giulia"],
    recurringLanguageTargets: ["order a drink", "choose here or takeaway", "pay"],
    listeningChallenge: "Catch the reduced qui-o-da-portare choice and the €2 price.",
    prerequisites: [], contentVersion: "1.0.0", authoringStatus: "reviewed",
  },
  "day-04": {
    title: "One place in the shade",
    practicalObjective: "Rent one beach chair and one umbrella without buying the two-chair package.",
    primaryMove: "Request, clarify quantity, and confirm price",
    sceneId: "beach",
    supportProminence: "prominent",
    pocketCardId: "beach-one-chair-umbrella",
    location: "Lido Piccola Luna · Marina di Lume",
    characterIds: ["nadia"],
    recurringLanguageTargets: ["request equipment", "clarify quantity", "confirm price"],
    listeningChallenge: "Distinguish one from two chairs, the bundle price, and closing time.",
    prerequisites: [], contentVersion: "1.0.0", authoringStatus: "reviewed",
  },
  "day-05": {
    title: "Half a kilo, no more",
    practicalObjective: "Buy half a kilo of tomatoes and stop the quantity there.",
    primaryMove: "Specify quantity and say enough",
    sceneId: "produce",
    supportProminence: "prominent",
    pocketCardId: "how-much",
    location: "Mercato del Porto · Marina di Lume",
    characterIds: ["paola"],
    recurringLanguageTargets: ["specify weight", "say enough", "confirm price"],
    listeningChallenge: "Separate mezzo chilo from the offer to add more produce.",
    prerequisites: [], contentVersion: "1.0.0", authoringStatus: "reviewed",
  },
  "day-06": {
    title: "The right bus and stop",
    practicalObjective: "Buy one ticket to Amalfi and identify the correct stop.",
    primaryMove: "State a destination and ask where",
    sceneId: "bus",
    supportProminence: "available",
    pocketCardId: "bus-ticket",
    location: "Tabacchi Marina · Marina di Lume",
    characterIds: ["luca"],
    recurringLanguageTargets: ["state destination", "specify one-way", "ask where"],
    listeningChallenge: "Hear ticket type, €2.40 price, and stop location in two compact turns.",
    prerequisites: [], contentVersion: "1.0.0", authoringStatus: "reviewed",
  },
  "day-07": {
    title: "Something for mosquito bites",
    practicalObjective: "Ask for a simple pharmacy item and choose cream rather than tablets.",
    primaryMove: "State a need and answer a bounded choice",
    sceneId: "pharmacy",
    supportProminence: "available",
    pocketCardId: "pharmacy-bites",
    location: "Farmacia Luce · Marina di Lume",
    characterIds: ["sara"],
    recurringLanguageTargets: ["state a need", "choose a form", "decline extras"],
    listeningChallenge: "Distinguish cream from tablets without supplying unnecessary medical detail.",
    prerequisites: [], contentVersion: "1.0.0", authoringStatus: "reviewed",
  },
  "day-13": {
    title: "Two mistakes, one bill",
    practicalObjective: "Correct the wrong drink and the extra receipt line.",
    primaryMove: "Explain a mismatch and request a correction",
    sceneId: "cafe",
    supportProminence: "available",
    pocketCardId: "wrong-order",
    location: "Bar Gabbiano · Marina di Lume",
    characterIds: ["giulia"],
    recurringLanguageTargets: ["describe a mismatch", "request correction", "confirm remedy"],
    listeningChallenge: "Separate the wrong drink from the extra receipt line and hear the proposed remedy.",
    prerequisites: ["day-03"], contentVersion: "1.0.0", authoringStatus: "reviewed",
  },
  "day-21": {
    title: "The usual—or not",
    practicalObjective: "Order and pay while choosing how much conversation you want.",
    primaryMove: "Accept familiarity or set a warm boundary",
    sceneId: "bartender",
    supportProminence: "recovery",
    pocketCardId: "later-thanks",
    location: "Bar Gabbiano · Marina di Lume",
    characterIds: ["giulia"],
    recurringLanguageTargets: ["confirm preference", "set a boundary", "give a brief account"],
    listeningChallenge: "Recognize an optional personal callback inside a familiar transaction.",
    prerequisites: ["day-13"], contentVersion: "1.0.0", authoringStatus: "reviewed",
  },
};

type EpisodeContext = Pick<SeasonEpisode, "location" | "characterIds" | "recurringLanguageTargets" | "listeningChallenge" | "prerequisites">;

const EPISODE_CONTEXT: Partial<Record<EpisodeId, EpisodeContext>> = {
  "day-08": { location: "Lavanderia Blu · Marina di Lume", characterIds: ["carlo"], recurringLanguageTargets: ["ask how", "confirm a sequence", "state a problem"], listeningChallenge: "Follow a multi-step machine instruction where the machine and coin-slot numbers differ.", prerequisites: [] },
  "day-09": { location: "Marina desk · Marina di Lume", characterIds: ["luca"], recurringLanguageTargets: ["compare options", "state preference", "ask duration"], listeningChallenge: "Separate two departure times, two prices, and a weather caveat.", prerequisites: ["day-06"] },
  "day-10": { location: "Trattoria del Porto · Marina di Lume", characterIds: ["rosa"], recurringLanguageTargets: ["order", "identify mismatch", "accept or reject correction"], listeningChallenge: "Catch a rapid order read-back and notice the wrong side dish.", prerequisites: [] },
  "day-11": { location: "Casa Limone · Marina di Lume", characterIds: ["raffaele"], recurringLanguageTargets: ["report a problem", "say when it began", "obtain commitment"], listeningChallenge: "Distinguish oggi from domani mattina in a repair window.", prerequisites: ["day-01"] },
  "day-12": { location: "Lido Piccola Luna · Marina di Lume", characterIds: ["nadia"], recurringLanguageTargets: ["ask for alternative", "compare shade", "decline upsell"], listeningChallenge: "Hear that umbrellas are unavailable but a shaded alternative remains.", prerequisites: ["day-04"] },
  "day-14": { location: "Street bus stop · Marina di Lume", characterIds: ["bus-attendant"], recurringLanguageTargets: ["understand a change", "ask which stop", "confirm direction"], listeningChallenge: "Separate the old stop from the temporary stop under time pressure.", prerequisites: ["day-06"] },
  "day-15": { location: "Alimentari Verde · Marina di Lume", characterIds: ["enzo"], recurringLanguageTargets: ["challenge politely", "identify extra item", "confirm revised total"], listeningChallenge: "Catch a rapid total and the name of an extra receipt item.", prerequisites: ["day-02"] },
  "day-16": { location: "Casa Limone entrance · Marina di Lume", characterIds: ["courier"], recurringLanguageTargets: ["explain available ID", "identify self", "ask alternative"], listeningChallenge: "Distinguish acceptable documents, surname, and apartment number.", prerequisites: ["day-01"] },
  "day-17": { location: "Casa Limone · Marina di Lume", characterIds: ["raffaele"], recurringLanguageTargets: ["refer to a promise", "describe continued problem", "request time"], listeningChallenge: "Notice a mismatch between the promised and newly stated repair time.", prerequisites: ["day-11"] },
  "day-18": { location: "Farmacia Luce · Marina di Lume", characterIds: ["sara"], recurringLanguageTargets: ["ask for substitute", "compare form", "clarify use"], listeningChallenge: "Hear that two proposed products are alternatives but not identical.", prerequisites: ["day-07"] },
  "day-19": { location: "Marina desk · Marina di Lume", characterIds: ["luca"], recurringLanguageTargets: ["understand cancellation", "compare recovery options", "express uncertainty"], listeningChallenge: "Compare refund, rebooking, and bus alternatives with different times and costs.", prerequisites: ["day-09"] },
  "day-20": { location: "Casa Limone · Marina di Lume", characterIds: ["raffaele", "technician"], recurringLanguageTargets: ["describe result", "contrast temporary and permanent", "negotiate alternative"], listeningChallenge: "Understand a conditional temporary fix while a replacement part is pending.", prerequisites: ["day-17"] },
  "day-22": { location: "Alimentari Verde · Marina di Lume", characterIds: ["enzo"], recurringLanguageTargets: ["ask follow-up", "state preference", "accept or refuse"], listeningChallenge: "Distinguish two familiar-vendor recommendations described naturally.", prerequisites: ["day-02"] },
  "day-23": { location: "Casa Limone · Marina di Lume", characterIds: ["marta"], recurringLanguageTargets: ["thank", "explain timing", "set a boundary"], listeningChallenge: "Separate the parcel handoff from an optional coffee invitation.", prerequisites: ["day-16"] },
  "day-24": { location: "Lido Piccola Luna · Marina di Lume", characterIds: ["nadia"], recurringLanguageTargets: ["interpret advice", "compare remedies", "change plan"], listeningChallenge: "Hear wind advice and an early-closing time in familiar speech.", prerequisites: ["day-12"] },
  "day-25": { location: "Bar Gabbiano or Casa Limone · Marina di Lume", characterIds: ["giulia", "marta"], recurringLanguageTargets: ["ask what and when", "express uncertainty", "accept or defer"], listeningChallenge: "Resolve an informal invitation using relative time such as domani verso.", prerequisites: [] },
  "day-26": { location: "Trattoria del Porto · Marina di Lume", characterIds: ["rosa"], recurringLanguageTargets: ["request quiet table", "give optional reason", "end small talk"], listeningChallenge: "Distinguish a louder view table from the requested quiet table.", prerequisites: ["day-10"] },
  "day-27": { location: "Casa Limone · Marina di Lume", characterIds: ["raffaele"], recurringLanguageTargets: ["summarize events", "confirm completion", "correct an omission"], listeningChallenge: "Notice an omitted promise in Raffaele's repair recap.", prerequisites: ["day-20"] },
  "day-28": { location: "Marina and Salerno connection", characterIds: ["luca", "transport-agent"], recurringLanguageTargets: ["clarify", "compare", "confirm multi-step plan"], listeningChallenge: "Track platform, transfer, and time when one detail differs from the expected plan.", prerequisites: ["day-19"] },
  "day-29": { location: "Bar Gabbiano · Marina di Lume", characterIds: ["giulia"], recurringLanguageTargets: ["give short account", "state uncertainty", "set warm boundary"], listeningChallenge: "Recognize a familiar-paced question about staying longer as optional.", prerequisites: ["day-21"] },
  "day-30": { location: "Casa Limone · Marina di Lume", characterIds: ["raffaele"], recurringLanguageTargets: ["confirm obligations", "return key", "state departure plan"], listeningChallenge: "Check a spoken deposit-and-keys summary and one callback against authoritative history.", prerequisites: ["day-01"] },
};

type EpisodeRuntimeMetadata = Pick<SeasonEpisode, "sceneId" | "primaryMove" | "supportProminence" | "pocketCardId">;

const MIDDLE_EPISODE_METADATA: Partial<Record<EpisodeId, EpisodeRuntimeMetadata>> = {
  "day-08": { sceneId: "laundry", primaryMove: "Ask how, confirm a sequence, and solve a machine problem", supportProminence: "available", pocketCardId: "how-does-it-work" },
  "day-09": { sceneId: "marina", primaryMove: "Compare price and duration before choosing transport", supportProminence: "available", pocketCardId: "how-long-does-it-take" },
  "day-10": { sceneId: "trattoria", primaryMove: "Identify an order mismatch and request a correction", supportProminence: "available", pocketCardId: "wrong-order" },
  "day-11": { sceneId: "repair", primaryMove: "Report a practical problem and confirm a repair window", supportProminence: "available", pocketCardId: "no-hot-water" },
  "day-12": { sceneId: "beach-alternative", primaryMove: "Understand unavailability and choose an alternative", supportProminence: "available", pocketCardId: "is-there-an-alternative" },
  "day-14": { sceneId: "changed-stop", primaryMove: "Understand a route change and confirm the temporary stop", supportProminence: "recovery", pocketCardId: "temporary-stop" },
  "day-15": { sceneId: "grocery-correction", primaryMove: "Challenge an extra item and confirm the corrected total", supportProminence: "recovery", pocketCardId: "extra-bill-item" },
  "day-16": { sceneId: "parcel", primaryMove: "Explain missing identification and use an allowed alternative", supportProminence: "recovery", pocketCardId: "missing-document" },
  "day-17": { sceneId: "repair-reminder", primaryMove: "Refer to a prior promise and correct its time", supportProminence: "recovery", pocketCardId: "you-said-this-morning" },
  "day-18": { sceneId: "pharmacy-substitute", primaryMove: "Ask for and compare a bounded substitute", supportProminence: "recovery", pocketCardId: "is-there-an-alternative" },
  "day-19": { sceneId: "ferry-cancellation", primaryMove: "Understand a cancellation and choose a valid recovery", supportProminence: "recovery", pocketCardId: "refund-please" },
  "day-20": { sceneId: "repair-fix", primaryMove: "Contrast a temporary fix with a permanent commitment", supportProminence: "recovery", pocketCardId: "you-said-this-morning" },
};

const FINAL_EPISODE_METADATA: Partial<Record<EpisodeId, EpisodeRuntimeMetadata>> = {
  "day-22": { sceneId: "vendor-recommendation", primaryMove: "Ask for and accept one familiar-vendor recommendation", supportProminence: "recovery", pocketCardId: "what-do-you-recommend" },
  "day-23": { sceneId: "neighbor-parcel", primaryMove: "Retrieve a second parcel and set a clean social boundary", supportProminence: "recovery", pocketCardId: null },
  "day-24": { sceneId: "weather-beach", primaryMove: "Change a beach plan after factual wind and closure advice", supportProminence: "recovery", pocketCardId: "can-get-credit" },
  "day-25": { sceneId: "invitation", primaryMove: "Respond truthfully to an invitation without implying attendance", supportProminence: "recovery", pocketCardId: "not-sure-yet" },
  "day-26": { sceneId: "quiet-table", primaryMove: "Request the quiet table and decline the louder view", supportProminence: "recovery", pocketCardId: "quiet-table" },
  "day-27": { sceneId: "repair-close", primaryMove: "Close the repair and request only an earned credit", supportProminence: "recovery", pocketCardId: "everything-settled" },
  "day-28": { sceneId: "day-trip", primaryMove: "Confirm a two-leg bus plan and buy its distinct fare", supportProminence: "recovery", pocketCardId: "where-do-i-change" },
  "day-29": { sceneId: "farewell-coffee", primaryMove: "Pay and answer the future question without inventing certainty", supportProminence: "recovery", pocketCardId: "not-sure-yet" },
  "day-30": { sceneId: "checkout", primaryMove: "Return held keys, confirm obligations, and state departure", supportProminence: "recovery", pocketCardId: "leaving-tomorrow" },
};

function episodeTitle(day: number): string {
  const title = EPISODE_TITLES[day - 8];
  if (!title) throw new Error(`Missing current season title for day ${day}.`);
  return title;
}

export const SEASON_01: readonly SeasonEpisode[] = EPISODE_IDS.map((id, day) => {
  const earlyMetadata = EARLY_EPISODE_METADATA[id];
  if (earlyMetadata) {
    return {
      id,
      day,
      unlockDaysBeforeDeparture: day === 0 ? null : 31 - day,
      ...earlyMetadata,
    };
  }
  const middle = MIDDLE_EPISODE_METADATA[id];
  if (middle) {
    return {
      id,
      day,
      title: episodeTitle(day),
      practicalObjective: episodeTitle(day),
      unlockDaysBeforeDeparture: 31 - day,
      ...(EPISODE_CONTEXT[id]!),
      ...middle,
      contentVersion: "1.0.0",
      authoringStatus: "reviewed",
    };
  }
  const final = FINAL_EPISODE_METADATA[id];
  if (final) {
    return {
      id,
      day,
      title: episodeTitle(day),
      practicalObjective: episodeTitle(day),
      unlockDaysBeforeDeparture: 31 - day,
      ...(EPISODE_CONTEXT[id]!),
      ...final,
      contentVersion: "1.0.0",
      authoringStatus: "reviewed",
    };
  }
  throw new Error(`Missing current implemented metadata for ${id}.`);
});

export const EPISODE_BY_ID = new Map(SEASON_01.map((episode) => [episode.id, episode]));

export function isEpisodeId(value: unknown): value is EpisodeId {
  return typeof value === "string" && (EPISODE_IDS as readonly string[]).includes(value);
}

export function seasonEpisode(id: EpisodeId): SeasonEpisode {
  const episode = EPISODE_BY_ID.get(id);
  if (!episode) throw new Error(`Unsupported season episode: ${id}`);
  return episode;
}
